import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitChargerUpdate, emitStationUpdate } from "../lib/socket";

export async function getOperatorStations(req: Request, res: Response) {
  try {
    const operatorUserId = req.query.operatorUserId as string | undefined;
    const stations = await prisma.station.findMany({
      where: operatorUserId ? { operatorUserId } : undefined,
      include: {
        chargers: true,
        queueEntries: { where: { status: "waiting" } },
        reviews: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    res.json(stations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updatePricing(req: Request, res: Response) {
  try {
    const { pricePerKwh } = req.body;
    if (pricePerKwh === undefined) {
      return res.status(400).json({ error: "pricePerKwh required" });
    }

    const updated = await prisma.station.update({
      where: { id: String(req.params.id) },
      data: { pricePerKwh: Number(pricePerKwh) },
    });

    emitStationUpdate(updated.id, updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateChargerStatus(req: Request, res: Response) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "status required" });
    }

    const updated = await prisma.charger.update({
      where: { id: String(req.params.id) },
      data: { status: status as any },
      include: { station: true },
    });

    await prisma.chargerEvent.create({
      data: {
        chargerId: updated.id,
        status: updated.status,
        payload: JSON.stringify({ manual: true, timestamp: new Date().toISOString() }),
      },
    });

    emitChargerUpdate(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getRevenueAnalytics(req: Request, res: Response) {
  try {
    // Generate/retrieve 7-day revenue trend
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const revenueByDay = days.map((day, idx) => ({
      day,
      sessions: 32 + (idx * 5) % 18,
      revenue: Math.round((32 + (idx * 5) % 18) * 145),
      kwh: Math.round((32 + (idx * 5) % 18) * 28),
    }));

    const totalRevenue = revenueByDay.reduce((acc, cur) => acc + cur.revenue, 0);
    const totalSessions = revenueByDay.reduce((acc, cur) => acc + cur.sessions, 0);

    res.json({
      summary: {
        totalRevenue,
        totalSessions,
        avgSessionRevenue: Math.round(totalRevenue / totalSessions),
        monthlyRevenue: 38400,
        monthlySessions: 264,
        avgUptime: 98.4,
      },
      revenueByDay,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getHeatmapAnalytics(req: Request, res: Response) {
  try {
    // Peak hour occupancy matrix: hours 0-23
    const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
      let occupancy = 15;
      if (hour >= 8 && hour <= 11) occupancy = 75 + Math.floor(Math.random() * 20); // morning peak
      else if (hour >= 17 && hour <= 21) occupancy = 85 + Math.floor(Math.random() * 15); // evening peak
      else if (hour >= 12 && hour <= 16) occupancy = 50 + Math.floor(Math.random() * 15);
      return {
        hour: `${hour.toString().padStart(2, "0")}:00`,
        occupancyPct: occupancy,
        avgWaitMin: occupancy > 70 ? Math.round((occupancy - 60) * 0.4) : 0,
      };
    });

    res.json(hourlyHeatmap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getLiveSessions(req: Request, res: Response) {
  try {
    const sessions = await prisma.session.findMany({
      take: 20,
      orderBy: { startTs: "desc" },
      include: {
        station: { select: { name: true, city: true } },
        charger: { select: { label: true, connectorType: true, powerKw: true } },
        driver: { select: { name: true, email: true } },
      },
    });

    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function replyToReview(req: Request, res: Response) {
  try {
    const { reply } = req.body;
    const review = await prisma.review.update({
      where: { id: String(req.params.id) },
      data: { reply },
    });
    res.json(review);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
