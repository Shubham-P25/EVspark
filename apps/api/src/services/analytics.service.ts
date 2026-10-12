// apps/api/src/services/analytics.service.ts
import prisma from "../lib/prisma.js";
import { istParts } from "../sim/model.js";

const DAY_MS = 24 * 3600 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOWN = new Set(["MAINTENANCE", "FAULTED", "OFFLINE"]);

export async function getScopedStationIds(user: { id: string; role: string }): Promise<string[]> {
  const where = user.role === "OPERATOR" ? { operatorUserId: user.id } : {};
  const stations = await prisma.station.findMany({ where, select: { id: true } });
  return stations.map((s) => s.id);
}

export async function computeUptime(stationIds: string[], days = 7): Promise<number> {
  if (stationIds.length === 0) return 100;
  const chargers = await prisma.charger.findMany({
    where: { stationId: { in: stationIds } },
    select: { id: true, status: true },
  });
  if (chargers.length === 0) return 100;

  const now = Date.now();
  const since = now - days * DAY_MS;
  const events = await prisma.chargerEvent.findMany({
    where: { chargerId: { in: chargers.map((c) => c.id) }, ts: { gte: new Date(since) } },
    orderBy: { ts: "asc" },
    select: { chargerId: true, status: true, ts: true },
  });

  const byCharger = new Map<string, Array<{ status: string; ts: number }>>();
  for (const e of events) {
    const arr = byCharger.get(e.chargerId) ?? [];
    arr.push({ status: e.status as string, ts: e.ts.getTime() });
    byCharger.set(e.chargerId, arr);
  }

  let downMs = 0;
  for (const c of chargers) {
    const evs = byCharger.get(c.id) ?? [];
    if (evs.length === 0) {
      if (DOWN.has(c.status as string)) downMs += now - since;
      continue;
    }
    let last = since;
    let down = false;
    for (const e of evs) {
      if (down) downMs += e.ts - last;
      last = e.ts;
      down = DOWN.has(e.status);
    }
    if (down) downMs += now - last;
  }

  const total = chargers.length * (now - since);
  return +Math.max(0, 100 - (downMs / total) * 100).toFixed(1);
}

export async function computeRevenueAnalytics(stationIds: string[], days = 7) {
  const now = new Date();
  const buckets = new Map<string, { day: string; date: string; sessions: number; revenue: number; kwh: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const p = istParts(new Date(now.getTime() - i * DAY_MS));
    buckets.set(p.key, { day: DAY_NAMES[p.dow], date: p.key, sessions: 0, revenue: 0, kwh: 0 });
  }

  if (stationIds.length > 0) {
    const sessions = await prisma.session.findMany({
      where: { stationId: { in: stationIds }, startTs: { gte: new Date(now.getTime() - (days + 1) * DAY_MS) } },
      select: { startTs: true, energyKwh: true, amountInr: true },
    });
    for (const s of sessions) {
      const b = buckets.get(istParts(s.startTs).key);
      if (!b) continue;
      b.sessions += 1;
      b.revenue += s.amountInr ?? 0;
      b.kwh += s.energyKwh ?? 0;
    }
  }

  const revenueByDay = Array.from(buckets.values()).map((b) => ({
    ...b,
    revenue: Math.round(b.revenue),
    kwh: Math.round(b.kwh),
  }));
  const totalRevenue = revenueByDay.reduce((a, b) => a + b.revenue, 0);
  const totalSessions = revenueByDay.reduce((a, b) => a + b.sessions, 0);

  let monthlyRevenue = 0;
  let monthlySessions = 0;
  if (stationIds.length > 0) {
    const m = await prisma.session.aggregate({
      where: { stationId: { in: stationIds }, startTs: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
      _sum: { amountInr: true },
      _count: true,
    });
    monthlyRevenue = Math.round(m._sum.amountInr ?? 0);
    monthlySessions = m._count;
  }

  return {
    summary: {
      totalRevenue,
      totalSessions,
      avgSessionRevenue: totalSessions ? Math.round(totalRevenue / totalSessions) : 0,
      monthlyRevenue,
      monthlySessions,
      avgUptime: await computeUptime(stationIds, 7),
      stationCount: stationIds.length,
    },
    revenueByDay,
  };
}

// Average occupancy / wait per hour of day (IST) over the last 28 days, from StationMetricHourly.
export async function computeHeatmap(stationIds: string[], days = 28) {
  const acc = Array.from({ length: 24 }, () => ({ occ: 0, wait: 0, n: 0 }));
  if (stationIds.length > 0) {
    const rows = await prisma.stationMetricHourly.findMany({
      where: { stationId: { in: stationIds }, hourTs: { gte: new Date(Date.now() - days * DAY_MS) } },
      select: { hourTs: true, occupancyPct: true, avgWaitMin: true },
    });
    for (const r of rows) {
      const h = istParts(r.hourTs).hour;
      acc[h].occ += r.occupancyPct;
      acc[h].wait += r.avgWaitMin;
      acc[h].n += 1;
    }
  }
  return acc.map((a, hour) => ({
    hour: `${hour.toString().padStart(2, "0")}:00`,
    occupancyPct: a.n ? Math.round(a.occ / a.n) : 0,
    avgWaitMin: a.n ? Math.round(a.wait / a.n) : 0,
  }));
}

// Connector split + per-station performance (replaces hardcoded 68/24/8 arrays in the web page).
export async function computeBreakdown(stationIds: string[], days = 30) {
  if (stationIds.length === 0) return { connectorSplit: [], stationPerformance: [], days };
  const since = new Date(Date.now() - days * DAY_MS);
  const sessions = await prisma.session.findMany({
    where: { stationId: { in: stationIds }, startTs: { gte: since } },
    select: {
      stationId: true,
      energyKwh: true,
      amountInr: true,
      charger: { select: { connectorType: true } },
    },
  });
  const stations = await prisma.station.findMany({
    where: { id: { in: stationIds } },
    select: { id: true, name: true },
  });

  const conn = new Map<string, number>();
  const perf = new Map<string, { sessions: number; revenue: number; kwh: number }>();
  for (const s of sessions) {
    const name = s.charger?.connectorType || "Unknown";
    conn.set(name, (conn.get(name) ?? 0) + 1);
    const p = perf.get(s.stationId) ?? { sessions: 0, revenue: 0, kwh: 0 };
    p.sessions += 1;
    p.revenue += s.amountInr ?? 0;
    p.kwh += s.energyKwh ?? 0;
    perf.set(s.stationId, p);
  }
  const total = sessions.length || 1;
  return {
    days,
    connectorSplit: Array.from(conn.entries())
      .map(([name, count]) => ({ name, sessions: count, value: Math.round((count / total) * 100) }))
      .sort((a, b) => b.sessions - a.sessions),
    stationPerformance: stations
      .map((s) => {
        const p = perf.get(s.id) ?? { sessions: 0, revenue: 0, kwh: 0 };
        return { stationId: s.id, name: s.name, sessions: p.sessions, revenue: Math.round(p.revenue), kwh: Math.round(p.kwh) };
      })
      .sort((a, b) => b.revenue - a.revenue),
  };
}
