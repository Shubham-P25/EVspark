import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitQueuePromoted, emitStationUpdate } from "../lib/socket";
import { AppError } from "../middleware/errorHandler";
import { invalidateOperatorLive } from "./operator.controller";

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

async function loadOwnedEntry(req: Request) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const entry = await prisma.queueEntry.findUnique({
    where: { id: String(req.params.id) },
    include: { station: { select: { id: true, operatorUserId: true } } },
  });
  if (!entry) {
    throw new AppError(404, "NOT_FOUND", "Queue entry not found");
  }
  if (user.role !== "ADMIN" && entry.station.operatorUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You do not own this station");
  }
  return entry;
}

async function afterQueueChange(stationId: string) {
  await invalidateOperatorLive(stationId);
  const queueCount = await prisma.queueEntry.count({ where: { stationId, status: "waiting" } });
  emitStationUpdate(stationId, { stationId, queueCount });
}

/** Operator calls the next vehicle to a free, compatible charger. */
export async function callQueueEntry(req: Request, res: Response) {
  const entry = await loadOwnedEntry(req);
  if (entry.status !== "waiting") {
    throw new AppError(409, "INVALID_STATE", "Only waiting vehicles can be called.");
  }

  const requestedChargerId = (req.body as { chargerId?: string }).chargerId;
  const freeChargers = await prisma.charger.findMany({
    where: { stationId: entry.stationId, status: "FREE" },
    orderBy: { label: "asc" },
  });
  const wanted = entry.connector.toLowerCase();
  const compatible = freeChargers.filter((c) => c.connectorType.toLowerCase() === wanted);
  const charger = requestedChargerId
    ? compatible.find((c) => c.id === requestedChargerId)
    : compatible[0];

  if (!charger) {
    throw new AppError(
      409,
      "NO_FREE_CHARGER",
      `No free ${entry.connector} charger right now. Wait for a bay to free up.`
    );
  }

  const updated = await prisma.queueEntry.update({
    where: { id: entry.id },
    data: { status: "called", calledAt: new Date(), calledChargerId: charger.id },
  });

  emitQueuePromoted({
    stationId: entry.stationId,
    queueEntryId: entry.id,
    vehicleRef: entry.vehicleRef,
    chargerId: charger.id,
  });
  await afterQueueChange(entry.stationId);
  res.json({ entry: updated, charger: { id: charger.id, label: charger.label } });
}

/** Soft-remove (so the UI can offer Undo). */
export async function removeQueueEntry(req: Request, res: Response) {
  const entry = await loadOwnedEntry(req);
  if (entry.status !== "waiting" && entry.status !== "called") {
    throw new AppError(409, "INVALID_STATE", "This entry is no longer in the queue.");
  }
  const updated = await prisma.queueEntry.update({
    where: { id: entry.id },
    data: { status: "removed", calledAt: null, calledChargerId: null },
  });
  await afterQueueChange(entry.stationId);
  res.json({ entry: updated });
}

/** Undo for remove/call: put the vehicle back at its original place in line (joinedTs is unchanged). */
export async function restoreQueueEntry(req: Request, res: Response) {
  const entry = await loadOwnedEntry(req);
  if (entry.status !== "removed" && entry.status !== "called") {
    throw new AppError(409, "INVALID_STATE", "Nothing to restore for this entry.");
  }
  const updated = await prisma.queueEntry.update({
    where: { id: entry.id },
    data: { status: "waiting", calledAt: null, calledChargerId: null },
  });
  await afterQueueChange(entry.stationId);
  res.json({ entry: updated });
}
