import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import {
  pinsQuerySchema,
  tileToBbox,
  pinState,
  pinToTuple,
  type Pin,
  type PinTuple,
  type LiveSource,
} from "@evspark/shared";
import { findPinsInBbox } from "../repositories/pins.repo";
import { cacheGet, cacheSet } from "../lib/redis";
import { getLiveForTile, getLiveForPlaceId, getGoogleLiveStats } from "../services/googleLive.service";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

export interface PinWithPlaceId extends Pin {
  googlePlaceId?: string | null;
}

/**
 * Overlay Google Places live availability onto pins when valid and fresh (< 10 min).
 */
export async function applyLiveOverlay(
  pins: PinWithPlaceId[],
  z?: number,
  x?: number,
  y?: number
): Promise<Pin[]> {
  if (z === undefined || x === undefined || y === undefined || z < 13) {
    return pins;
  }

  const liveMap = await getLiveForTile(z, x, y);
  if (liveMap.size === 0) {
    return pins;
  }

  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const now = Date.now();

  return pins.map((pin) => {
    if (!pin.googlePlaceId) return pin;

    const overlay = liveMap.get(pin.googlePlaceId);
    if (!overlay) return pin;

    if (now - overlay.lastUpdateTimeMs > TEN_MINUTES_MS) {
      return pin;
    }

    const free = overlay.free;
    const usable = overlay.usable;
    const color = pinState(free, usable);

    return {
      ...pin,
      free,
      usable,
      color,
      source: "google",
      updatedAt: overlay.lastUpdateTimeMs,
    };
  });
}

export async function getPins(req: Request, res: Response, next: NextFunction): Promise<void> {
  const startTime = Date.now();
  try {
    const parseResult = pinsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ error: "Invalid tile query parameters", details: parseResult.error.format() });
      return;
    }

    const { z, x, y, connector } = parseResult.data;
    const cacheKey = `pins:${z}:${x}:${y}:${connector ?? "all"}`;

    // 1. Check Redis cache
    let tuples: PinTuple[] | null = await cacheGet<PinTuple[]>(cacheKey);

    if (!tuples) {
      // 2. Query PostGIS using bounding box for the tile
      const [west, south, east, north] = tileToBbox(z, x, y);
      const rows = await findPinsInBbox(west, south, east, north, connector);

      const now = Date.now();
      const rawPins: PinWithPlaceId[] = rows.map((row) => {
        const free = Number(row.free || 0);
        const usable = Number(row.usable || 0);
        const total = Number(row.total || 0);
        const maxKw = Number(row.max_kw || 0);
        const source: LiveSource = row.has_ocpp ? "twin" : "none";

        return {
          id: row.id,
          lat: Number(row.lat),
          lng: Number(row.lng),
          free,
          usable,
          total,
          maxKw,
          color: pinState(free, usable),
          source,
          updatedAt: now,
          googlePlaceId: row.google_place_id,
        };
      });

      // 3. Apply live overlay hook
      const finalPins = await applyLiveOverlay(rawPins, z, x, y);

      // 4. Compact into wire format PinTuples
      tuples = finalPins.map(pinToTuple);

      // 5. Cache in Redis for 300 seconds (5 minutes) - live deltas stream via WebSocket
      await cacheSet(cacheKey, tuples, 300);
    }

    const jsonStr = JSON.stringify(tuples);
    const etag = `"${crypto.createHash("md5").update(jsonStr).digest("hex")}"`;

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.setHeader("ETag", etag);

    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`) {
      res.status(304).end();
      return;
    }

    const durationMs = Date.now() - startTime;
    if (durationMs > 100) {
      logger.warn({ z, x, y, durationMs, count: tuples.length }, "Slow pins query");
    }

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(jsonStr);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stations/:id/live
 * Return per-connector live aggregation from Google Places (New) or twin simulator.
 */
export async function getStationLive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!stationId) {
      res.status(400).json({ error: "Missing station id" });
      return;
    }

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        chargers: true,
      },
    });

    if (!station) {
      res.status(404).json({ error: "Station not found" });
      return;
    }

    // 1. Try Google Places live data if googlePlaceId exists
    if (station.googlePlaceId) {
      const overlay = await getLiveForPlaceId(station.googlePlaceId);
      if (overlay) {
        res.json({
          source: "google",
          overlay,
        });
        return;
      }
    }

    // 2. Twin simulated live chargers
    const hasTwin = station.chargers.some((c) => c.ocppId !== null);
    if (hasTwin) {
      const free = station.chargers.filter((c) => c.status === "FREE").length;
      const usable = station.chargers.filter((c) => c.status === "FREE" || c.status === "BUSY").length;
      res.json({
        source: "twin",
        free,
        usable,
        total: station.chargers.length,
        chargers: station.chargers,
      });
      return;
    }

    // 3. Static/no live data
    res.json({
      source: "none",
      chargers: station.chargers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stations/live-stats (development only)
 */
export async function getLiveStats(_req: Request, res: Response): Promise<void> {
  const stats = await getGoogleLiveStats();
  res.json(stats);
}
