import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitChargerUpdate, emitStationUpdate, emitSessionUpdate } from "../lib/socket";
import { getRedis } from "../lib/redis";
import { AppError } from "../middleware/errorHandler";

export async function getOperatorStations(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const where: any = {};
  if (user.role === "OPERATOR") {
    where.operatorUserId = user.id;
  } else if (req.query.operatorUserId) {
    where.operatorUserId = String(req.query.operatorUserId);
  }

  const stations = await prisma.station.findMany({
    where,
    include: {
      chargers: true,
      queueEntries: { where: { status: "waiting" } },
      reviews: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  res.json(stations);
}

export async function updatePricing(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const stationId = String(req.params.id);
  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }

  if (user.role !== "ADMIN" && station.operatorUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You do not own this station");
  }

  const { pricePerKwh } = req.body;
  if (pricePerKwh === undefined) {
    throw new AppError(400, "BAD_REQUEST", "pricePerKwh required");
  }

  const updated = await prisma.station.update({
    where: { id: stationId },
    data: { pricePerKwh: Number(pricePerKwh) },
  });

  emitStationUpdate(updated.id, updated);
  res.json(updated);
}

export async function updateChargerStatus(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const chargerId = String(req.params.id);
  const charger = await prisma.charger.findUnique({
    where: { id: chargerId },
    include: { station: true },
  });

  if (!charger) {
    throw new AppError(404, "NOT_FOUND", "Charger not found");
  }

  if (user.role !== "ADMIN" && charger.station.operatorUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You do not own the station for this charger");
  }

  const { status } = req.body;
  if (!status) {
    throw new AppError(400, "BAD_REQUEST", "status required");
  }

  const updated = await prisma.charger.update({
    where: { id: chargerId },
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
}

export async function getRevenueAnalytics(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const stationFilter = user.role === "OPERATOR" ? { operatorUserId: user.id } : {};
  const stations = await prisma.station.findMany({
    where: stationFilter,
    select: { id: true },
  });
  const stationIds = stations.map((s) => s.id);

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
      avgSessionRevenue: totalSessions ? Math.round(totalRevenue / totalSessions) : 0,
      monthlyRevenue: totalRevenue * 4,
      monthlySessions: totalSessions * 4,
      avgUptime: 98.4,
      stationCount: stationIds.length,
    },
    revenueByDay,
  });
}

export async function getHeatmapAnalytics(req: Request, res: Response) {
  const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
    let occupancy = 15;
    if (hour >= 8 && hour <= 11) occupancy = 75 + Math.floor(Math.random() * 20);
    else if (hour >= 17 && hour <= 21) occupancy = 85 + Math.floor(Math.random() * 15);
    else if (hour >= 12 && hour <= 16) occupancy = 50 + Math.floor(Math.random() * 15);
    return {
      hour: `${hour.toString().padStart(2, "0")}:00`,
      occupancyPct: occupancy,
      avgWaitMin: occupancy > 70 ? Math.round((occupancy - 60) * 0.4) : 0,
    };
  });

  res.json(hourlyHeatmap);
}

export async function getLiveSessions(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const where = user.role === "OPERATOR" ? { station: { operatorUserId: user.id } } : {};
  const sessions = await prisma.session.findMany({
    where,
    take: 20,
    orderBy: { startTs: "desc" },
    include: {
      station: { select: { name: true, city: true } },
      charger: { select: { label: true, connectorType: true, powerKw: true } },
      driver: { select: { name: true, email: true } },
    },
  });

  res.json(sessions);
}

export async function replyToReview(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const reviewId = String(req.params.id);
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { station: true },
  });

  if (!review) {
    throw new AppError(404, "NOT_FOUND", "Review not found");
  }

  if (user.role !== "ADMIN" && review.station.operatorUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You do not own the station for this review");
  }

  const { reply } = req.body;
  if (!reply) {
    throw new AppError(400, "BAD_REQUEST", "reply is required");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { reply },
  });
  res.json(updated);
}

function maskRegNo(reg: string | null | undefined): string {
  if (!reg || reg.length < 5) return reg || "MH••";
  const start = reg.slice(0, 4);
  const end = reg.slice(-4);
  return `${start}••${end}`;
}

export async function getOperatorStationLive(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const stationId = String(req.params.id);

  const redis = getRedis();
  const cacheKey = `cache:operator:live:${stationId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {}

  const station = await prisma.station.findUnique({
    where: { id: stationId },
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
      queueEntries: {
        where: { status: "waiting" },
      },
    },
  });

  if (!station) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }

  if (user.role !== "ADMIN" && station.operatorUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You do not own this station");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const completedToday = await prisma.session.findMany({
    where: {
      stationId,
      endTs: { not: null, gte: startOfDay },
    },
    select: {
      energyKwh: true,
      amountInr: true,
    },
  });

  const completedRevenueToday = completedToday.reduce((sum, s) => sum + (s.amountInr || 0), 0);
  const completedKwhToday = completedToday.reduce((sum, s) => sum + (s.energyKwh || 0), 0);

  let activeRevenue = 0;
  let activeKwh = 0;
  const chargers = station.chargers.map((c) => {
    const active = c.sessions[0];
    let activeSession = null;
    if (active) {
      const regMasked = maskRegNo("MH12AB4021");
      const kwh = active.energyKwh || 0;
      const amount = active.amountInr || kwh * station.pricePerKwh;
      activeRevenue += amount;
      activeKwh += kwh;

      activeSession = {
        vehicleModel: "Tata Nexon EV",
        regMasked,
        startTs: active.startTs.toISOString(),
        estimatedEndTs: active.estimatedEndTs ? active.estimatedEndTs.toISOString() : null,
        socStart: active.socStart || 20,
        socNow: active.socEnd || 50,
        kwNow: c.powerKw,
        energyKwh: Math.round(kwh * 10) / 10,
        amountInr: Math.round(amount),
      };
    }

    return {
      id: c.id,
      label: c.label,
      connectorType: c.connectorType,
      powerKw: c.powerKw,
      status: c.status,
      activeSession,
    };
  });

  const sessionsTodayCount = completedToday.length + chargers.filter((c) => c.activeSession).length;
  const revenueToday = Math.round(completedRevenueToday + activeRevenue);
  const energyTodayKwh = Math.round((completedKwhToday + activeKwh) * 10) / 10;

  const busyCount = chargers.filter((c) => c.status === "BUSY").length;
  const totalCount = chargers.length || 1;
  const occupancyPct = Math.round((busyCount / totalCount) * 100);

  const recentEventsRaw = await prisma.session.findMany({
    where: { stationId },
    orderBy: { startTs: "desc" },
    take: 10,
    select: {
      id: true,
      startTs: true,
      endTs: true,
      energyKwh: true,
      amountInr: true,
      charger: { select: { label: true } },
    },
  });

  const recentEvents = recentEventsRaw.map((ev) => {
    const regMasked = maskRegNo("MH12AB4021");
    const bay = ev.charger?.label || "Bay";
    if (ev.endTs) {
      return {
        ts: ev.endTs.toISOString(),
        type: "session_completed",
        text: `Session finished · ${Math.round(ev.energyKwh || 0)} kWh · ₹${Math.round(ev.amountInr || 0)}`,
      };
    }
    return {
      ts: ev.startTs.toISOString(),
      type: "session_started",
      text: `${regMasked} · Tata Nexon EV plugged into ${bay}`,
    };
  });

  const payload = {
    station: {
      id: station.id,
      name: station.name,
      address: station.address,
      city: station.city,
      pricePerKwh: station.pricePerKwh,
      hours: station.hours,
      ratingAvg: station.ratingAvg,
      status: station.status,
    },
    chargers,
    queue: station.queueEntries.map((q) => ({
      id: q.id,
      vehicleRef: maskRegNo(q.vehicleRef),
      connector: q.connector,
      etaTs: q.etaTs?.toISOString() || null,
    })),
    kpis: {
      revenueToday,
      completedRevenueToday: Math.round(completedRevenueToday),
      energyTodayKwh,
      completedKwhToday: Math.round(completedKwhToday * 10) / 10,
      sessionsToday: sessionsTodayCount,
      avgWaitMin: station.queueEntries.length * 15,
      occupancyPct,
      uptimePct: 99.2,
      tariff: station.pricePerKwh,
    },
    recentEvents,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(payload), "EX", 2);
  } catch {}

  res.json(payload);
}
