import {
  getStationSnapshot,
  addWalkIn,
  advanceSession,
  undoSession,
  updateChargerSettings,
} from "../services/operatorLive.service.js";
import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitChargerUpdate, emitStationUpdate, emitSessionUpdate } from "../lib/socket";
import { getRedis } from "../lib/redis";
import { AppError } from "../middleware/errorHandler";
import {
  getScopedStationIds,
  computeRevenueAnalytics,
  computeHeatmap,
  computeBreakdown,
} from "../services/analytics.service";

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

  const target = req.body.status as "FREE" | "MAINTENANCE" | "OFFLINE";

  if (charger.status === target) {
    return res.json(charger);
  }
  if (charger.status === "BUSY") {
    throw new AppError(409, "CHARGER_IN_USE", "This charger is mid-session. Wait for the vehicle to finish.");
  }
  if (charger.status === "FAULTED" && target === "FREE") {
    throw new AppError(409, "CHARGER_FAULTED", "A faulted charger must clear on the hardware before it can go live.");
  }

  const updated = await prisma.charger.update({
    where: { id: chargerId },
    data: { status: target },
    include: { station: true },
  });

  await prisma.chargerEvent.create({
    data: {
      chargerId: updated.id,
      status: updated.status,
      payload: JSON.stringify({ manual: true, by: user.id, timestamp: new Date().toISOString() }),
    },
  });

  await invalidateOperatorLive(updated.stationId);
  emitChargerUpdate(updated);
  res.json(updated);
}

export async function invalidateOperatorLive(stationId: string) {
  try {
    await getRedis().del(`cache:operator:live:${stationId}`);
  } catch {
    // cache is best-effort
  }
}

export async function getRevenueAnalytics(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const stationIds = await getScopedStationIds(user);
  res.json(await computeRevenueAnalytics(stationIds, 7));
}

export async function getHeatmapAnalytics(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const stationIds = await getScopedStationIds(user);
  res.json(await computeHeatmap(stationIds, 28));
}

export async function getBreakdownAnalytics(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const stationIds = await getScopedStationIds(user);
  res.json(await computeBreakdown(stationIds, 30));
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

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic fake plate for twin (simulated) sessions that have no real driver. */
function syntheticReg(seed: string): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const a = letters[hashStr(`${seed}a`) % letters.length];
  const b = letters[hashStr(`${seed}b`) % letters.length];
  return `MH12${a}${b}${1000 + (hashStr(seed) % 9000)}`;
}

/** Never leak an email or a full plate to the operator UI. */
function maskRef(ref: string | null | undefined): string {
  if (!ref) return "EV••••";
  if (ref.includes("@")) return `Driver ••${1000 + (hashStr(ref) % 9000)}`;
  if (ref.length < 6) return ref;
  return `${ref.slice(0, 4)}••${ref.slice(-4)}`;
}

type LiveAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  chargerId?: string;
};

export async function getOperatorStationLive(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const stationId = String(req.params.id);

  // Ownership is checked BEFORE the cache so a cached payload can never leak to another operator.
  const owner = await prisma.station.findUnique({
    where: { id: stationId },
    select: { operatorUserId: true },
  });
  if (!owner) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }
  if (user.role !== "ADMIN" && owner.operatorUserId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You do not own this station");
  }

  res.setHeader("Cache-Control", "no-store");

  const redis = getRedis();
  const cacheKey = `cache:operator:live:${stationId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch {
    // cache is best-effort
  }

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      chargers: {
        orderBy: { label: "asc" },
        include: {
          sessions: { where: { endTs: null }, orderBy: { startTs: "desc" }, take: 1 },
        },
      },
      queueEntries: {
        where: { status: { in: ["waiting", "called"] } },
        orderBy: { joinedTs: "asc" },
      },
    },
  });

  if (!station) {
    throw new AppError(404, "NOT_FOUND", "Station not found");
  }

  const nowMs = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const completedToday = await prisma.session.findMany({
    where: { stationId, endTs: { not: null, gte: startOfDay } },
    select: { energyKwh: true, amountInr: true, queueWaitMin: true },
  });

  const completedRevenueToday = completedToday.reduce((sum, s) => sum + (s.amountInr || 0), 0);
  const completedKwhToday = completedToday.reduce((sum, s) => sum + (s.energyKwh || 0), 0);
  const waits = completedToday.map((s) => s.queueWaitMin).filter((w): w is number => typeof w === "number");
  const avgWaitMin = waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

  // Real vehicle info for active sessions (falls back to a clearly simulated plate for twin sessions).
  const activeSessions = station.chargers.flatMap((c) => c.sessions);
  const modelIds = [...new Set(activeSessions.map((x) => x.vehicleModelId).filter((x): x is string => !!x))];
  const driverIds = [...new Set(activeSessions.map((x) => x.driverUserId).filter((x): x is string => !!x))];
  const [models, driverProfiles] = await Promise.all([
    modelIds.length > 0 ? prisma.vehicleModel.findMany({ where: { id: { in: modelIds } } }) : Promise.resolve([]),
    driverIds.length > 0
      ? prisma.driverProfile.findMany({
          where: { userId: { in: driverIds } },
          select: { userId: true, vehicleRegNo: true },
        })
      : Promise.resolve([]),
  ]);
  const modelById = new Map(models.map((m) => [m.id, m]));
  const regByDriver = new Map(driverProfiles.map((d) => [d.userId, d.vehicleRegNo]));

  let activeRevenue = 0;
  let activeKwh = 0;
  const chargers = station.chargers.map((c) => {
    const active = c.sessions[0];
    let activeSession = null;
    if (active) {
      const startMs = active.startTs.getTime();
      const endMs = active.estimatedEndTs ? active.estimatedEndTs.getTime() : null;
      const socStart = active.socStart ?? 20;
      const progress = endMs && endMs > startMs ? Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs))) : 0;
      const socNow = endMs ? socStart + (100 - socStart) * progress : active.socEnd ?? socStart;
      const elapsedH = Math.max(0, nowMs - startMs) / 3_600_000;
      const kwh = active.energyKwh && active.energyKwh > 0 ? active.energyKwh : c.powerKw * elapsedH * 0.85;
      const amount = active.amountInr && active.amountInr > 0 ? active.amountInr : kwh * station.pricePerKwh;
      activeRevenue += amount;
      activeKwh += kwh;

      const model = active.vehicleModelId ? modelById.get(active.vehicleModelId) : undefined;
      const realReg = active.driverUserId ? regByDriver.get(active.driverUserId) : null;
      const reg = realReg || syntheticReg(active.id);

      activeSession = {
        vehicleModel: model ? `${model.make} ${model.model}` : "Electric vehicle",
        regMasked: maskRef(reg),
        simulated: !realReg,
        startTs: active.startTs.toISOString(),
        estimatedEndTs: active.estimatedEndTs ? active.estimatedEndTs.toISOString() : null,
        socStart,
        socNow: Math.round(socNow * 10) / 10,
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

  const totalCount = chargers.length || 1;
  const busyCount = chargers.filter((c) => c.status === "BUSY").length;
  const freeCount = chargers.filter((c) => c.status === "FREE").length;
  const downCount = chargers.filter((c) => c.status === "FAULTED" || c.status === "OFFLINE" || c.status === "MAINTENANCE").length;
  const occupancyPct = Math.round((busyCount / totalCount) * 100);
  const onlinePct = Math.round(((totalCount - downCount) / totalCount) * 100);

  const waiting = station.queueEntries.filter((q) => q.status === "waiting");
  const queue = station.queueEntries.map((q) => ({
    id: q.id,
    vehicleRef: maskRef(q.vehicleRef),
    connector: q.connector,
    status: q.status as "waiting" | "called",
    etaTs: q.etaTs?.toISOString() || null,
    joinedTs: q.joinedTs.toISOString(),
    calledAt: q.calledAt?.toISOString() || null,
    position: q.status === "waiting" ? waiting.findIndex((w) => w.id === q.id) + 1 : undefined,
  }));

  // Alerts derived from live state
  const alerts: LiveAlert[] = [];
  for (const c of chargers) {
    if (c.status === "FAULTED") {
      alerts.push({ id: `f-${c.id}`, severity: "critical", title: `${c.label ?? "Charger"} faulted`, detail: "Hardware reported a fault. Drivers cannot use this bay.", chargerId: c.id });
    } else if (c.status === "OFFLINE") {
      alerts.push({ id: `o-${c.id}`, severity: "warning", title: `${c.label ?? "Charger"} offline`, detail: "No heartbeat from the charger.", chargerId: c.id });
    } else if (c.status === "MAINTENANCE") {
      alerts.push({ id: `m-${c.id}`, severity: "info", title: `${c.label ?? "Charger"} in maintenance`, detail: "Hidden from drivers until you bring it online.", chargerId: c.id });
    }
  }
  if (waiting.length >= 3 && freeCount === 0) {
    alerts.push({ id: "overload", severity: "critical", title: "Station overloaded", detail: `${waiting.length} vehicles waiting and every bay is taken. Drivers are being rerouted.` });
  } else if (waiting.length > 0 && freeCount === 0) {
    alerts.push({ id: "busy", severity: "warning", title: "All bays busy", detail: `${waiting.length} vehicle${waiting.length > 1 ? "s" : ""} waiting.` });
  }
  if (station.status !== "APPROVED") {
    alerts.push({ id: "approval", severity: "info", title: "Awaiting admin approval", detail: "Your station is hidden from drivers until it is approved." });
  }

  // Activity feed: sessions + hardware status changes
  const [recentSessions, recentChargerEvents] = await Promise.all([
    prisma.session.findMany({
      where: { stationId },
      orderBy: { startTs: "desc" },
      take: 10,
      select: {
        id: true,
        startTs: true,
        endTs: true,
        energyKwh: true,
        amountInr: true,
        driverUserId: true,
        charger: { select: { label: true } },
      },
    }),
    prisma.chargerEvent.findMany({
      where: { charger: { stationId }, status: { in: ["FAULTED", "MAINTENANCE", "OFFLINE"] } },
      orderBy: { ts: "desc" },
      take: 6,
      include: { charger: { select: { label: true } } },
    }),
  ]);

  const feed: { id: string; ts: string; type: string; text: string }[] = [];
  for (const ev of recentSessions) {
    const bay = ev.charger?.label || "Bay";
    const who = maskRef(syntheticReg(ev.id));
    if (ev.endTs) {
      feed.push({ id: `${ev.id}-end`, ts: ev.endTs.toISOString(), type: "session_completed", text: `${who} finished on ${bay} · ${Math.round(ev.energyKwh || 0)} kWh · ₹${Math.round(ev.amountInr || 0)}` });
    }
    feed.push({ id: `${ev.id}-start`, ts: ev.startTs.toISOString(), type: "session_started", text: `${who} plugged into ${bay}` });
  }
  for (const ev of recentChargerEvents) {
    feed.push({
      id: ev.id,
      ts: ev.ts.toISOString(),
      type: ev.status === "FAULTED" ? "charger_fault" : "charger_status",
      text: `${ev.charger?.label || "Charger"} marked ${ev.status.toLowerCase()}`,
    });
  }
  feed.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));

  const payload = {
    station: {
      id: station.id,
      name: station.name,
      address: station.address,
      city: station.city,
      pincode: station.pincode,
      pricePerKwh: station.pricePerKwh,
      idleFeePerMin: station.idleFeePerMin,
      hours: station.hours,
      ratingAvg: station.ratingAvg,
      status: station.status,
      photoUrl: station.photoUrl,
    },
    chargers,
    queue,
    alerts,
    kpis: {
      revenueToday,
      completedRevenueToday: Math.round(completedRevenueToday),
      energyTodayKwh,
      completedKwhToday: Math.round(completedKwhToday * 10) / 10,
      sessionsToday: sessionsTodayCount,
      avgWaitMin,
      occupancyPct,
      /** Share of chargers currently online (not faulted/offline/maintenance). */
      uptimePct: onlinePct,
      queueCount: waiting.length,
      freeChargers: freeCount,
      totalChargers: chargers.length,
      tariff: station.pricePerKwh,
    },
    recentEvents: feed.slice(0, 12),
  };

  try {
    await redis.set(cacheKey, JSON.stringify(payload), "EX", 2);
  } catch {
    // cache is best-effort
  }

  res.json(payload);
}

export async function getTorqueStationSnapshot(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const snap = await getStationSnapshot(req.user.id, req.user.role);
  res.json(snap);
}

export async function addOperatorSession(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const { vehicleLabel, plate, batteryKwh, vehicleMaxKw, socStart, socTarget } = req.body;
  if (!vehicleLabel || !plate) {
    throw new AppError(400, "BAD_REQUEST", "vehicleLabel and plate are required");
  }
  const session = await addWalkIn(req.user.id, req.user.role, {
    vehicleLabel,
    plate,
    batteryKwh: Number(batteryKwh) || 40,
    vehicleMaxKw: Number(vehicleMaxKw) || 50,
    socStart: Number(socStart) || 20,
    socTarget: Number(socTarget) || 80,
  });
  res.json({ success: true, session });
}

export async function advanceOperatorSession(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const { to } = req.body;
  if (!to || !["CHARGING", "COMPLETED", "CANCELLED"].includes(to)) {
    throw new AppError(400, "BAD_REQUEST", "Target status 'to' must be CHARGING, COMPLETED or CANCELLED");
  }
  const result = await advanceSession(req.user.id, req.user.role, req.params.id as string, to);
  res.json(result);
}

export async function undoOperatorSession(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const result = await undoSession(req.user.id, req.user.role, req.params.id as string);
  res.json(result);
}

export async function patchOperatorCharger(req: Request, res: Response) {
  if (!req.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const { pricePerKwh, maintenance } = req.body;
  const dto = await updateChargerSettings(req.user.id, req.user.role, req.params.id as string, {
    pricePerKwh: Number(pricePerKwh) || 18,
    maintenance: Boolean(maintenance),
  });
  res.json({ success: true, charger: dto });
}
