import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitBookingUpdate } from "../lib/socket";
import { AppError } from "../middleware/errorHandler";

export async function listBookings(req: Request, res: Response) {
  const user = req.user;
  const { userId, stationId } = req.query;
  const where: any = {};

  if (user?.role === "DRIVER") {
    where.driverUserId = user.id;
  } else if (userId) {
    where.driverUserId = String(userId);
  }

  if (stationId) {
    where.stationId = String(stationId);
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      station: true,
      charger: true,
      driver: { select: { id: true, name: true, email: true } },
    },
    orderBy: { startTs: "desc" },
  });
  res.json(bookings);
}

export async function createBooking(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { stationId, chargerId, startTs, endTs } = req.body;

  if (!stationId) {
    throw new AppError(400, "BAD_REQUEST", "stationId is required");
  }

  const booking = await prisma.booking.create({
    data: {
      driverUserId: user.id,
      stationId,
      chargerId: chargerId || null,
      startTs: startTs ? new Date(startTs) : new Date(),
      endTs: endTs ? new Date(endTs) : new Date(Date.now() + 45 * 60 * 1000),
      status: "CONFIRMED",
    },
    include: { station: true, charger: true },
  });

  emitBookingUpdate(booking);
  res.status(201).json(booking);
}

export async function cancelBooking(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const bookingId = String(req.params.id);
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Booking not found");
  }

  if (user.role !== "ADMIN" && existing.driverUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You can only cancel your own bookings");
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });
  emitBookingUpdate(updated);
  res.json(updated);
}
