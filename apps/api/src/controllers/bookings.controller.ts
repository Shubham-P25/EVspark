import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitBookingUpdate } from "../lib/socket";

export async function listBookings(req: Request, res: Response) {
  try {
    const { userId, stationId } = req.query;
    const where: any = {};
    if (userId) where.driverUserId = String(userId);
    if (stationId) where.stationId = String(stationId);

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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function createBooking(req: Request, res: Response) {
  try {
    const { driverUserId, stationId, chargerId, startTs, endTs } = req.body;

    if (!stationId) {
      return res.status(400).json({ error: "stationId is required" });
    }

    // Default to demo driver if not supplied
    let user = driverUserId;
    if (!user) {
      const demoDriver = await prisma.user.findFirst({ where: { role: "DRIVER" } });
      user = demoDriver?.id;
    }

    const booking = await prisma.booking.create({
      data: {
        driverUserId: user,
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
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function cancelBooking(req: Request, res: Response) {
  try {
    const updated = await prisma.booking.update({
      where: { id: String(req.params.id) },
      data: { status: "CANCELLED" },
    });
    emitBookingUpdate(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
