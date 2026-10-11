import type { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { getRedis } from "../lib/redis.js";
import { haversineKm } from "@evspark/shared";
import { AppError } from "../middleware/errorHandler.js";
import { verifyAndAttachUser } from "../middleware/auth.js";
import logger from "../lib/logger.js";

export async function authenticateTelemetry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const twinKey = req.headers["x-twin-key"];
  const expectedSecret = process.env.TWIN_SECRET || "dev-twin-secret";

  if (twinKey && typeof twinKey === "string" && twinKey === expectedSecret) {
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

export async function pingTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { vehicleRef, stationId, lat, lng, intent } = req.body;

    const ping = await prisma.vehiclePing.create({
      data: {
        vehicleRef,
        stationId: stationId || null,
        lat,
        lng,
        intent,
      },
    });

    let insideGeofence = false;

    if (stationId && intent === "heading_to") {
      const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { id: true, lat: true, lng: true },
      });

      if (station) {
        const distKm = haversineKm(lat, lng, station.lat, station.lng);
        const distMeters = distKm * 1000;

        if (distMeters < 200) {
          insideGeofence = true;
          try {
            const client = getRedis();
            if (client.status === "ready" || client.status === "connecting") {
              const key = `geofence:${stationId}`;
              await client.sadd(key, vehicleRef);
              await client.expire(key, 1800); // 30-min TTL
            }
          } catch (err) {
            logger.warn({ err, stationId }, "Failed to update Redis geofence set");
          }
        }
      }
    }

    res.status(200).json({
      ok: true,
      pingId: ping.id,
      insideGeofence,
    });
  } catch (err) {
    next(err);
  }
}
