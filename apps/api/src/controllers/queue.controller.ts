import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitQueuePromoted, emitStationUpdate } from "../lib/socket";
import { AppError } from "../middleware/errorHandler";

export async function joinQueue(req: Request, res: Response) {
  const { stationId, vehicleModelId, connector = "CCS2", etaMinutes = 15 } = req.body;
  if (!stationId) {
    throw new AppError(400, "BAD_REQUEST", "stationId is required");
  }

  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });
  if (!station) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }

  const user = req.user;
  const vehicleRef = user ? user.email : `EV-${Math.floor(1000 + Math.random() * 9000)}`;

  const now = new Date();
  const etaTs = new Date(now.getTime() + Number(etaMinutes) * 60 * 1000);

  const entry = await prisma.queueEntry.create({
    data: {
      stationId,
      vehicleRef,
      vehicleModelId: vehicleModelId || null,
      connector,
      joinedTs: now,
      etaTs,
      status: "waiting",
    },
  });

  // Count current waiting entries for this station
  const queueLength = await prisma.queueEntry.count({
    where: { stationId, status: "waiting" },
  });

  emitStationUpdate(stationId, {
    stationId,
    queueCount: queueLength,
  });

  res.status(201).json({
    message: "Successfully joined virtual queue",
    entry,
    queuePosition: queueLength,
    estimatedWaitMin: Math.max(5, queueLength * 12),
  });
}

export async function getStationQueue(req: Request, res: Response) {
  const stationId = String(req.params.stationId);
  const entries = await prisma.queueEntry.findMany({
    where: { stationId, status: "waiting" },
    orderBy: { joinedTs: "asc" },
  });

  res.json({
    stationId,
    count: entries.length,
    entries,
  });
}
