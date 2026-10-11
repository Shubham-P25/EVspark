import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { computeWaitTime, haversineKm, estimateDriveMinutes } from "@evspark/shared";
import { AppError } from "../middleware/errorHandler";
import { findStationsInBbox, findNearbyStations } from "../repositories/stations.repo";
import { findStationsAlongRoute } from "../repositories/along-route.repo";
import { cacheGet, cacheSet, getRedis } from "../lib/redis";
import logger from "../lib/logger";

export type StationStatus = "PENDING" | "APPROVED" | "REJECTED";

export async function invalidateStationCache(stationId: string): Promise<void> {
  try {
    const client = getRedis();
    if (client.status === "ready") {
      await client.del(`station:${stationId}`, `waittime:${stationId}`);
    }
  } catch (err) {
    logger.warn({ err, stationId }, "Failed to invalidate station cache");
  }
}

async function attachBatchWaitTimes(
  stations: any[],
  targetConnector?: string
): Promise<any[]> {
  if (stations.length === 0) return [];
  const stationIds = stations.map((s) => s.id);

  // Grouped query 1: queue entries waiting
  const queueCounts = await prisma.queueEntry.groupBy({
    by: ["stationId"],
    where: { stationId: { in: stationIds }, status: "waiting" },
    _count: { id: true },
  });
  const queueMap = new Map<string, number>();
  for (const q of queueCounts) {
    queueMap.set(q.stationId, q._count.id);
  }

  // Grouped query 2: chargers for these stations
  const chargers = await prisma.charger.findMany({
    where: { stationId: { in: stationIds } },
    select: {
      id: true,
      stationId: true,
      status: true,
      connectorType: true,
      powerKw: true,
    },
  });
  const chargersMap = new Map<string, any[]>();
  for (const c of chargers) {
    if (!chargersMap.has(c.stationId)) chargersMap.set(c.stationId, []);
    chargersMap.get(c.stationId)!.push(c);
  }

  return stations.map((st) => {
    const stChargers = chargersMap.get(st.id) || [];
    const queueLen = queueMap.get(st.id) || 0;
    const waitInfo = computeWaitTime({
      chargers: stChargers as any,
      queueLength: queueLen,
      targetConnector: targetConnector && targetConnector !== "All" ? targetConnector : undefined,
    });

    const distM = (st as any).distanceM;
    return {
      ...st,
      ...(distM !== undefined ? { distanceKm: Number((distM / 1000).toFixed(2)) } : {}),
      waitMinutes: waitInfo.waitMinutes,
      predictedWaitMinutes: waitInfo.waitMinutes,
      markerColor: waitInfo.markerColor,
      isOverloaded: waitInfo.isOverloaded,
      availableChargers: waitInfo.availableChargers,
      totalChargers: stChargers.length,
      availableSlots: waitInfo.availableChargers,
      totalSlots: stChargers.length,
      powerKw: Math.max(...stChargers.map((c: any) => c.powerKw), 0),
      chargers: stChargers,
    };
  });
}

export async function listStations(req: Request, res: Response) {
  const {
    bbox,
    zoom,
    connector,
    status = "APPROVED",
    city,
    minKw,
    maxPrice,
    lat,
    lng,
    radiusKm = 50,
    limit = 200,
  } = req.query as any;

  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");

  // Fast path: Viewport Bounding Box Query
  if (bbox && typeof bbox === "string") {
    const coords = bbox.split(",").map(Number);
    if (coords.length === 4 && !coords.some(isNaN)) {
      const [minLng, minLat, maxLng, maxLat] = coords;
      const zoomNum = zoom ? Number(zoom) : 12;
      const roundedBbox = `${minLng.toFixed(2)},${minLat.toFixed(2)},${maxLng.toFixed(2)},${maxLat.toFixed(2)}`;
      const cacheKey = `stations:bbox:${zoomNum}:${roundedBbox}:${connector || "all"}`;

      const cached = await cacheGet<any[]>(cacheKey);
      if (cached) {
        res.setHeader("x-cache", "HIT");
        return res.json(cached);
      }

      // At zoom < 11 return at most 150 stations
      const effectiveLimit = zoomNum < 11 ? Math.min(Number(limit) || 150, 150) : Math.min(Number(limit) || 200, 200);

      const rawStations = await findStationsInBbox({
        minLng,
        minLat,
        maxLng,
        maxLat,
        limit: effectiveLimit,
        status: status as string,
        connector: connector as string,
      });

      const enriched = await attachBatchWaitTimes(rawStations, connector as string);
      await cacheSet(cacheKey, enriched, 15);
      res.setHeader("x-cache", "MISS");
      return res.json(enriched);
    }
  }

  // Fallback list query (non-bbox)
  const where: any = { status };
  if (city) where.city = { contains: String(city), mode: "insensitive" };
  if (maxPrice) where.pricePerKwh = { lte: Number(maxPrice) };

  const rawStations = await prisma.station.findMany({
    where,
    take: Math.min(Number(limit) || 200, 200),
    include: {
      chargers: true,
      queueEntries: { where: { status: "waiting" } },
    },
  });

  let stations = rawStations;
  if (connector && connector !== "All") {
    stations = stations.filter((s) =>
      s.chargers.some((c) => c.connectorType.toLowerCase() === String(connector).toLowerCase())
    );
  }
  if (minKw) {
    stations = stations.filter((s) => s.chargers.some((c) => c.powerKw >= Number(minKw)));
  }

  const enriched = stations.map((st) => {
    const waitInfo = computeWaitTime({
      chargers: st.chargers as any,
      queueLength: st.queueEntries.length,
      targetConnector: connector !== "All" ? connector : undefined,
    });

    let distanceKm: number | undefined;
    let etaMin: number | undefined;
    if (lat && lng) {
      distanceKm = +haversineKm(Number(lat), Number(lng), st.lat, st.lng).toFixed(1);
      etaMin = estimateDriveMinutes(distanceKm);
    }

    return {
      ...st,
      distanceKm,
      etaMinutes: etaMin,
      waitMinutes: waitInfo.waitMinutes,
      predictedWaitMinutes: waitInfo.waitMinutes,
      markerColor: waitInfo.markerColor,
      isOverloaded: waitInfo.isOverloaded,
      availableChargers: waitInfo.availableChargers,
      totalChargers: st.chargers.length,
      availableSlots: waitInfo.availableChargers,
      totalSlots: st.chargers.length,
      powerKw: Math.max(...st.chargers.map((c) => c.powerKw), 0),
      connectorType: st.chargers.map((c) => c.connectorType).join(", "),
      amenities: st.amenities ? st.amenities.split(",").map((a) => a.trim()) : [],
    };
  });

  if (lat && lng && radiusKm) {
    const filteredByRadius = enriched.filter((st) => (st.distanceKm ?? 0) <= Number(radiusKm));
    res.setHeader("x-cache", "MISS");
    return res.json(filteredByRadius.length ? filteredByRadius : enriched);
  }

  res.setHeader("x-cache", "MISS");
  res.json(enriched);
}

export async function getNearbyStations(req: Request, res: Response) {
  const { lat, lng, radius, radiusM, connector, limit = 30 } = req.query as any;

  if (!lat || !lng) {
    throw new AppError(400, "BAD_REQUEST", "lat and lng are required query parameters");
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const effectiveRadiusM = Number(radiusM || radius || 15000);
  const effectiveLimit = Math.min(Number(limit) || 30, 100);

  const cacheKey = `stations:nearby:${latNum.toFixed(2)}:${lngNum.toFixed(2)}:${effectiveRadiusM}:${connector || "all"}`;
  const cached = await cacheGet<any[]>(cacheKey);
  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");

  if (cached) {
    res.setHeader("x-cache", "HIT");
    return res.json(cached);
  }

  const nearby = await findNearbyStations({
    lat: latNum,
    lng: lngNum,
    radiusM: effectiveRadiusM,
    limit: effectiveLimit,
    connector: connector as string,
  });

  const enriched = await attachBatchWaitTimes(nearby, connector as string);
  await cacheSet(cacheKey, enriched, 15);

  res.setHeader("x-cache", "MISS");
  res.json(enriched);
}

export async function getStationsAlongRoute(req: Request, res: Response) {
  const { polyline, radiusM = 2000, connector, minKw, limit = 25 } = req.body;

  const candidateRows = await findStationsAlongRoute(polyline, Number(radiusM), Math.min(Number(limit) * 2, 80));
  if (candidateRows.length === 0) {
    return res.json([]);
  }

  const stationIds = candidateRows.map((r) => r.id);
  const stations = await prisma.station.findMany({
    where: { id: { in: stationIds } },
    include: {
      chargers: true,
    },
  });

  const enriched = await attachBatchWaitTimes(stations, connector);
  const rowMap = new Map(candidateRows.map((r) => [r.id, r]));

  let results = enriched
    .filter((st) => rowMap.has(st.id))
    .map((st) => {
      const row = rowMap.get(st.id)!;
      const distanceAlongRouteKm = Number(((row.fraction * row.routeLengthM) / 1000).toFixed(2));
      const detourKm = Number((row.detourM / 1000).toFixed(2));
      return {
        ...st,
        distanceAlongRouteKm,
        detourKm,
      };
    });

  if (connector && connector !== "All") {
    results = results.filter((st) =>
      st.chargers?.some((c: any) => c.connectorType?.toLowerCase() === connector.toLowerCase())
    );
  }
  if (minKw) {
    results = results.filter((st) =>
      st.chargers?.some((c: any) => c.powerKw >= Number(minKw))
    );
  }

  results.sort((a, b) => a.distanceAlongRouteKm - b.distanceAlongRouteKm);
  res.json(results.slice(0, Number(limit)));
}

export async function getStationReviews(req: Request, res: Response) {
  const id = String(req.params.id);
  const { cursor, limit = 10 } = req.query as any;

  const take = Math.min(Number(limit) || 10, 50);
  const reviews = await prisma.review.findMany({
    where: { stationId: id },
    take: take + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: String(cursor) } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
  });

  let nextCursor: string | null = null;
  if (reviews.length > take) {
    const nextItem = reviews.pop();
    nextCursor = nextItem?.id || null;
  }

  res.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      authorName: r.user?.name || r.user?.username || "Anonymous",
    })),
    nextCursor,
  });
}

export async function getStationPhotos(req: Request, res: Response) {
  const id = String(req.params.id);
  const cacheKey = `station:photos:${id}`;

  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const station = await prisma.station.findUnique({
    where: { id },
    select: { id: true, name: true, lat: true, lng: true, photoUrl: true, googlePlaceId: true },
  });

  if (!station) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }

  const photos: string[] = [];
  const attributions: string[] = [];

  if (station.photoUrl) {
    photos.push(station.photoUrl);
  }

  const result = { photos, attributions };
  await cacheSet(cacheKey, result, 86400); // 24 hours
  res.json(result);
}

export async function getStation(req: Request, res: Response) {
  const id = String(req.params.id);
  const cacheKey = `station:${id}`;
  res.setHeader("Cache-Control", "public, s-maxage=10");

  const cached = await cacheGet<any>(cacheKey);
  if (cached) {
    res.setHeader("x-cache", "HIT");
    return res.json(cached);
  }

  const station = await prisma.station.findUnique({
    where: { id },
    include: {
      chargers: {
        include: {
          sessions: {
            where: { endTs: null },
            orderBy: { startTs: "desc" },
            take: 1,
          },
        },
      },
      reviews: {
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      queueEntries: { where: { status: "waiting" } },
      sessions: { take: 5, orderBy: { startTs: "desc" } },
    },
  });

  if (!station) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }

  const waitInfo = computeWaitTime({
    chargers: station.chargers as any,
    queueLength: station.queueEntries.length,
  });

  const allRatings = await prisma.review.findMany({
    where: { stationId: id },
    select: { rating: true },
  });
  const ratingCount = allRatings.length;
  const ratingAvg = ratingCount > 0
    ? Number((allRatings.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(1))
    : 4.5;

  const ratingBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allRatings) {
    const val = Math.min(Math.max(Math.round(r.rating), 1), 5);
    ratingBreakdown[val] = (ratingBreakdown[val] || 0) + 1;
  }

  const chargersWithSessions = station.chargers.map((c) => {
    const active = c.sessions[0];
    return {
      id: c.id,
      stationId: c.stationId,
      label: c.label,
      connectorType: c.connectorType,
      powerKw: c.powerKw,
      status: c.status,
      ocppId: c.ocppId,
      activeSession: active
        ? {
            startTs: active.startTs,
            estimatedEndTs: active.estimatedEndTs,
            socStart: active.socStart,
            socNow: active.socEnd ?? active.socStart,
          }
        : null,
    };
  });

  const response = {
    ...station,
    chargers: chargersWithSessions,
    queueLength: station.queueEntries.length,
    waitMinutes: waitInfo.waitMinutes,
    predictedWaitMinutes: waitInfo.waitMinutes,
    markerColor: waitInfo.markerColor,
    isOverloaded: waitInfo.isOverloaded,
    availableChargers: waitInfo.availableChargers,
    totalChargers: station.chargers.length,
    amenities: station.amenities ? station.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
    hours: station.hours ?? "24/7",
    phone: station.phone ?? null,
    photoUrl: station.photoUrl ?? null,
    googlePlaceId: station.googlePlaceId ?? null,
    ratingAvg,
    ratingCount,
    ratingBreakdown,
  };

  await cacheSet(cacheKey, response, 10);
  res.setHeader("x-cache", "MISS");
  res.json(response);
}

export async function createStation(req: Request, res: Response) {
  const { chargers, ...data } = req.body;
  const user = req.user;

  const station = await prisma.station.create({
    data: {
      ...data,
      operatorUserId: user?.id || null,
      status: "PENDING",
      chargers: chargers
        ? {
            create: chargers.map((c: any) => ({
              label: c.label,
              connectorType: c.connectorType,
              powerKw: Number(c.powerKw),
              status: "FREE",
              ocppId: `CP-${c.label || Math.random().toString(36).substring(7)}`,
            })),
          }
        : undefined,
    },
    include: { chargers: true },
  });

  res.status(201).json(station);
}

export async function updateStation(req: Request, res: Response) {
  const id = String(req.params.id);
  const user = req.user;

  if (user && user.role !== "ADMIN") {
    const existing = await prisma.station.findUnique({ where: { id } });
    if (!existing || existing.operatorUserId !== user.id) {
      throw new AppError(403, "FORBIDDEN", "You do not own this station");
    }
  }

  const station = await prisma.station.update({
    where: { id },
    data: req.body,
  });

  await invalidateStationCache(id);
  res.json(station);
}

export async function deleteStation(req: Request, res: Response) {
  const id = String(req.params.id);
  const user = req.user;

  if (user && user.role !== "ADMIN") {
    const existing = await prisma.station.findUnique({ where: { id } });
    if (!existing || existing.operatorUserId !== user.id) {
      throw new AppError(403, "FORBIDDEN", "You do not own this station");
    }
  }

  await prisma.station.delete({ where: { id } });
  await invalidateStationCache(id);
  res.status(204).send();
}

export async function getPublicStats(req: Request, res: Response) {
  const redis = getRedis();
  const cacheKey = "cache:public:stats";
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [stationsCount, onlineChargersCount, sessionsTodayCount, completedToday] = await Promise.all([
    prisma.station.count({ where: { status: "APPROVED" } }),
    prisma.charger.count({ where: { status: { in: ["FREE", "BUSY"] } } }),
    prisma.session.count({ where: { startTs: { gte: startOfDay } } }),
    prisma.session.findMany({
      where: { startTs: { gte: startOfDay } },
      select: { energyKwh: true },
    }),
  ]);

  const kWhToday = Math.round(completedToday.reduce((sum, s) => sum + (s.energyKwh || 0), 0) * 10) / 10;

  const payload = {
    stations: stationsCount,
    chargersOnline: onlineChargersCount,
    sessionsToday: sessionsTodayCount,
    kWhToday: kWhToday > 0 ? kWhToday : 1420.5,
    simulated: true,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(payload), "EX", 30);
  } catch {}

  res.json(payload);
}
