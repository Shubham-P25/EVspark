import { tileToBbox, haversineKm, pinState, type PinColor } from "@evspark/shared";
import { getRedis } from "../lib/redis";
import logger from "../lib/logger";

export interface LiveOverlay {
  placeId: string;
  free: number;
  usable: number;
  total: number;
  color: PinColor;
  lastUpdateTimeMs: number;
  connectorAggregation?: Array<{
    type?: string;
    count?: number;
    availableCount?: number;
    outOfServiceCount?: number;
  }>;
}

let consecutiveFailures = 0;
let circuitBreakerOpenUntil = 0;

export async function getGoogleLiveStats(): Promise<{
  callsToday: number;
  dailyCap: number;
  circuitBreakerOpen: boolean;
}> {
  const dailyCap = Number(process.env.GOOGLE_LIVE_DAILY_CAP || 300);
  let callsToday = 0;
  try {
    const client = getRedis();
    if (client.status === "ready") {
      const today = new Date().toISOString().slice(0, 10);
      const val = await client.get(`google:live:calls:${today}`);
      callsToday = val ? Number(val) : 0;
    }
  } catch {
    // ignore
  }

  return {
    callsToday,
    dailyCap,
    circuitBreakerOpen: Date.now() < circuitBreakerOpenUntil,
  };
}

/**
 * Fetch live availability from Google Places API (New) for a single map tile (z >= 13).
 */
export async function getLiveForTile(
  z: number,
  x: number,
  y: number
): Promise<Map<string, LiveOverlay>> {
  const resultMap = new Map<string, LiveOverlay>();

  // 1. Only call for z >= 13
  if (z < 13) {
    return resultMap;
  }

  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
  if (!apiKey) {
    return resultMap;
  }

  // 2. Check circuit breaker
  if (Date.now() < circuitBreakerOpenUntil) {
    logger.debug("[GoogleLive] Circuit breaker open, skipping Places request");
    return resultMap;
  }

  // 3. Check Redis cache
  const cacheKey = `google:live:${z}:${x}:${y}`;
  try {
    const client = getRedis();
    if (client.status === "ready") {
      const cached = await client.get(cacheKey);
      if (cached) {
        const list: LiveOverlay[] = JSON.parse(cached);
        for (const item of list) {
          resultMap.set(item.placeId, item);
        }
        return resultMap;
      }
    }
  } catch {
    // Cache miss or Redis down; continue
  }

  // 4. Check global daily cap
  const today = new Date().toISOString().slice(0, 10);
  const capKey = `google:live:calls:${today}`;
  const dailyCap = Number(process.env.GOOGLE_LIVE_DAILY_CAP || 300);

  try {
    const client = getRedis();
    if (client.status === "ready") {
      const currentCalls = await client.get(capKey);
      if (currentCalls && Number(currentCalls) >= dailyCap) {
        logger.warn({ currentCalls, dailyCap }, "[GoogleLive] Daily Places API call cap reached");
        return resultMap;
      }
    }
  } catch {
    // Continue if redis check fails
  }

  // 5. Compute tile circle
  const [west, south, east, north] = tileToBbox(z, x, y);
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const halfDiagM = (haversineKm(south, west, north, east) * 1000) / 2;
  const radius = Math.min(Math.round(halfDiagM), 5000);

  // 6. Request Places API (New) SearchNearby
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.evChargeOptions",
      },
      body: JSON.stringify({
        includedTypes: ["electric_vehicle_charging_station"],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: centerLat, longitude: centerLng },
            radius,
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      consecutiveFailures++;
      if (consecutiveFailures >= 5) {
        circuitBreakerOpenUntil = Date.now() + 60_000;
        logger.error("[GoogleLive] 5 consecutive failures, opening circuit breaker for 60s");
      }
      return resultMap;
    }

    // Success - reset breaker
    consecutiveFailures = 0;

    // Track daily call count
    try {
      const client = getRedis();
      if (client.status === "ready") {
        const count = await client.incr(capKey);
        if (count === 1) {
          await client.expire(capKey, 36 * 3600);
        }
      }
    } catch {
      // ignore
    }

    const data: any = await response.json();
    const places = data?.places;
    const overlayList: LiveOverlay[] = [];

    if (Array.isArray(places)) {
      for (const place of places) {
        const aggregations = place?.evChargeOptions?.connectorAggregation;
        if (!Array.isArray(aggregations) || aggregations.length === 0) continue;

        let hasAnyAvailableCount = false;
        let totalCount = 0;
        let totalAvailable = 0;
        let totalOutOfService = 0;
        let oldestUpdateMs = Date.now();

        for (const agg of aggregations) {
          totalCount += Number(agg.count || 0);
          if (agg.availableCount !== undefined && agg.availableCount !== null) {
            hasAnyAvailableCount = true;
            totalAvailable += Number(agg.availableCount);
          }
          totalOutOfService += Number(agg.outOfServiceCount || 0);

          if (agg.availabilityLastUpdateTime) {
            const ms = new Date(agg.availabilityLastUpdateTime).getTime();
            if (!isNaN(ms) && ms < oldestUpdateMs) {
              oldestUpdateMs = ms;
            }
          }
        }

        // If availableCount is undefined for every aggregation, do not invent numbers
        if (!hasAnyAvailableCount) continue;

        const usable = Math.max(0, totalCount - totalOutOfService);
        const free = Math.min(totalAvailable, usable);
        const color = pinState(free, usable);

        const overlay: LiveOverlay = {
          placeId: place.id,
          free,
          usable,
          total: totalCount,
          color,
          lastUpdateTimeMs: oldestUpdateMs,
          connectorAggregation: aggregations,
        };

        resultMap.set(place.id, overlay);
        overlayList.push(overlay);
      }
    }

    // Cache results in Redis: 90s for non-empty, 60s for empty
    try {
      const client = getRedis();
      if (client.status === "ready") {
        const ttl = overlayList.length > 0 ? 90 : 60;
        await client.set(cacheKey, JSON.stringify(overlayList), "EX", ttl);
      }
    } catch {
      // ignore
    }

    return resultMap;
  } catch (err) {
    clearTimeout(timeout);
    consecutiveFailures++;
    if (consecutiveFailures >= 5) {
      circuitBreakerOpenUntil = Date.now() + 60_000;
      logger.error("[GoogleLive] 5 consecutive failures, opening circuit breaker for 60s");
    }
    logger.warn({ err }, "[GoogleLive] Request error in getLiveForTile");
    return resultMap;
  }
}

/**
 * Fetch detail for a single place ID (for station card).
 */
export async function getLiveForPlaceId(placeId: string): Promise<LiveOverlay | null> {
  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
  if (!apiKey || !placeId) return null;

  const cacheKey = `google:place:${placeId}`;
  try {
    const client = getRedis();
    if (client.status === "ready") {
      const cached = await client.get(cacheKey);
      if (cached) return JSON.parse(cached) as LiveOverlay;
    }
  } catch {
    // ignore
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,evChargeOptions",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const place: any = await res.json();
    const aggregations = place?.evChargeOptions?.connectorAggregation;
    if (!Array.isArray(aggregations) || aggregations.length === 0) return null;

    let hasAnyAvailableCount = false;
    let totalCount = 0;
    let totalAvailable = 0;
    let totalOutOfService = 0;
    let oldestUpdateMs = Date.now();

    for (const agg of aggregations) {
      totalCount += Number(agg.count || 0);
      if (agg.availableCount !== undefined && agg.availableCount !== null) {
        hasAnyAvailableCount = true;
        totalAvailable += Number(agg.availableCount);
      }
      totalOutOfService += Number(agg.outOfServiceCount || 0);

      if (agg.availabilityLastUpdateTime) {
        const ms = new Date(agg.availabilityLastUpdateTime).getTime();
        if (!isNaN(ms) && ms < oldestUpdateMs) oldestUpdateMs = ms;
      }
    }

    if (!hasAnyAvailableCount) return null;

    const usable = Math.max(0, totalCount - totalOutOfService);
    const free = Math.min(totalAvailable, usable);
    const color = pinState(free, usable);

    const overlay: LiveOverlay = {
      placeId: place.id,
      free,
      usable,
      total: totalCount,
      color,
      lastUpdateTimeMs: oldestUpdateMs,
      connectorAggregation: aggregations,
    };

    try {
      const client = getRedis();
      if (client.status === "ready") {
        await client.set(cacheKey, JSON.stringify(overlay), "EX", 90);
      }
    } catch {
      // ignore
    }

    return overlay;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
