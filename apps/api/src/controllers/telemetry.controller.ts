import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { getRedis } from "../lib/redis.js";
import { haversineKm } from "@evspark/shared";
import { AppError } from "../middleware/errorHandler.js";
import { verifyAndAttachUser } from "../middleware/auth.js";
import logger from "../lib/logger.js";
import { GEOFENCE_RADIUS_M } from "../lib/geofence.js";
import { emitStationDelta } from "../lib/socket.js";
import { invalidateStationCache } from "./stations.controller.js";

export async function authenticateTelemetry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const twinKey = req.headers["x-twin-key"];
  const expectedSecret = process.env.TWIN_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-twin-secret");

  if (expectedSecret && twinKey && typeof twinKey === "string" && twinKey === expectedSecret) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const user = await verifyAndAttachUser(token);
      (req as any).user = user;
      return next();
    } catch {
      return next(new AppError(401, "UNAUTHORIZED", "Invalid bearer token"));
    }
  }

  return next(
    new AppError(
      401,
      "UNAUTHORIZED",
      "Authentication required: provide valid x-twin-key header or driver bearer token"
    )
  );
}

const GHOST_KEY = "ghosts:positions";

export async function pingTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { vehicleRef, stationId, lat, lng, intent } = req.body;
    const isGhost = typeof vehicleRef === "string" && vehicleRef.startsWith("GHOST-");
    let pingId: string | null = null;

    // Simulated ghost drivers never touch the DB (no table growth) - only Redis.
    if (!isGhost) {
      const ping = await prisma.vehiclePing.create({
        data: { vehicleRef, stationId: stationId || null, lat, lng, intent },
      });
      pingId = ping.id;
    } else if (process.env.DEMO_MODE === "true") {
      try {
        const client = getRedis();
        if (intent === "heading_to") {
          await client.hset(GHOST_KEY, vehicleRef, JSON.stringify({ vehicleRef, lat, lng, stationId: stationId ?? null, ts: Date.now() }));
          await client.expire(GHOST_KEY, 300);
        } else {
          await client.hdel(GHOST_KEY, vehicleRef);
        }
      } catch (err) {
        logger.warn({ err }, "Failed to store ghost position");
      }
    }

    let insideGeofence = false;
    let changed = false;

    if (stationId) {
      const key = `geofence:${stationId}`;
      try {
        const client = getRedis();
        if (intent === "heading_to") {
          const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: { id: true, lat: true, lng: true },
          });
          if (station) {
            const distMeters = haversineKm(lat, lng, station.lat, station.lng) * 1000;
            if (distMeters < GEOFENCE_RADIUS_M) {
              insideGeofence = true;
              const added = await client.sadd(key, vehicleRef);
              await client.expire(key, 600);
              if (added === 1) changed = true;
            } else {
              const removed = await client.srem(key, vehicleRef);
              if (removed === 1) changed = true;
            }
          }
        } else {
          // "charging" or "idle": the car arrived / gave up -> it is no longer incoming
          const removed = await client.srem(key, vehicleRef);
          if (removed === 1 || isGhost) changed = true;
        }
      } catch (err) {
        logger.warn({ err, stationId }, "Failed to update Redis geofence set");
      }
      if (changed) {
        await invalidateStationCache(stationId);
        emitStationDelta(stationId);
      }
    }

    res.status(200).json({ ok: true, pingId, insideGeofence });
  } catch (err) {
    next(err);
  }
}

// Public, read-only list of simulated drivers for the demo map.
export async function getGhosts(_req: Request, res: Response): Promise<void> {
  if (process.env.DEMO_MODE !== "true") {
    res.json([]);
    return;
  }
  try {
    const all = await getRedis().hgetall(GHOST_KEY);
    const cutoff = Date.now() - 20_000;
    const list = Object.values(all)
      .map((v) => JSON.parse(v))
      .filter((g) => g.ts >= cutoff)
      .slice(0, 60);
    res.json(list);
  } catch {
    res.json([]);
  }
}
