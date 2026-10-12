// apps/api/src/scripts/seed-history.ts
// Usage: pnpm --filter api seed:history
// Env (optional): HISTORY_DAYS=30  HISTORY_SCOPE=operator|all  DEMO_STATION_COUNT=5
import prisma from "../lib/prisma.js";
import {
  mulberry32,
  poisson,
  pickVehicle,
  simulateSession,
  expectedArrivals,
  inferStationKind,
  popularity,
  hashString,
  istParts,
} from "../sim/model.js";

const DAYS = Number(process.env.HISTORY_DAYS || 30);
const SCOPE = (process.env.HISTORY_SCOPE || "operator") as "operator" | "all";
const DEMO_STATION_COUNT = Number(process.env.DEMO_STATION_COUNT || 5);
const OPERATOR_EMAIL = "operator@evspark.in";
const MAX_QUEUE_WAIT_MIN = 25; // longer than this -> driver leaves (abandons)
const UNPLUG_GAP_MS = 2 * 60 * 1000;
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

type StationWithChargers = Awaited<ReturnType<typeof loadStations>>[number];

async function loadStations(where: any) {
  return prisma.station.findMany({ where, include: { chargers: true } });
}

async function ensureOperatorNetwork() {
  const operator = await prisma.user.upsert({
    where: { email: OPERATOR_EMAIL },
    update: { role: "OPERATOR" },
    create: { email: OPERATOR_EMAIL, name: "Aakash Mehta", role: "OPERATOR" },
  });

  await prisma.operatorProfile.upsert({
    where: { userId: operator.id },
    update: {},
    create: { userId: operator.id, businessName: "EVspark Demo Network", contactName: operator.name ?? "Aakash Mehta" },
  });

  let owned = await loadStations({ operatorUserId: operator.id });
  if (owned.length < DEMO_STATION_COUNT) {
    const city = owned[0]?.city ?? "Mumbai";
    const free = await loadStations({ operatorUserId: null, status: "APPROVED", city });
    const candidates = free
      .filter((s) => s.chargers.length >= 3)
      .slice(0, DEMO_STATION_COUNT - owned.length);
    if (candidates.length > 0) {
      await prisma.station.updateMany({
        where: { id: { in: candidates.map((c) => c.id) } },
        data: { operatorUserId: operator.id },
      });
    }
    owned = await loadStations({ operatorUserId: operator.id });
  }
  return { operator, owned };
}

interface SessionRow {
  stationId: string;
  chargerId: string;
  startTs: Date;
  endTs: Date | null;
  estimatedEndTs: Date;
  socStart: number;
  socEnd: number | null;
  energyKwh: number;
  amountInr: number;
  source: string;
  queueWaitMin: number;
}

interface HourAgg {
  sessions: number;
  energy: number;
  revenue: number;
  waitSum: number;
  waitN: number;
  busyMin: number;
}

async function backfillStation(st: StationWithChargers, from: Date, now: Date) {
  const nowMs = now.getTime();
  const rng = mulberry32(hashString(st.id) ^ 0x9e3779b9);
  const kind = inferStationKind(st);
  const pop = popularity(st.id);
  const chargers = st.chargers;
  if (chargers.length === 0) return { sessions: 0 };

  // per-charger "free at" time and fault windows
  const freeAt = new Map<string, number>(chargers.map((c) => [c.id, from.getTime()]));
  const faults = new Map<string, Array<[number, number]>>();
  const events: Array<{ chargerId: string; status: any; ts: Date; payload: string }> = [];
  for (const c of chargers) {
    const windows: Array<[number, number]> = [];
    for (let d = 0; d < DAYS; d++) {
      if (rng() < 0.04) {
        const start = from.getTime() + d * DAY_MS + rng() * DAY_MS;
        const end = start + (30 + rng() * 150) * 60000;
        if (end < nowMs - HOUR_MS) {
          windows.push([start, end]);
          events.push({
            chargerId: c.id,
            status: rng() < 0.5 ? "MAINTENANCE" : "FAULTED",
            ts: new Date(start),
            payload: JSON.stringify({ backfill: true }),
          });
          events.push({ chargerId: c.id, status: "FREE", ts: new Date(end), payload: JSON.stringify({ backfill: true }) });
        }
      }
    }
    faults.set(c.id, windows);
  }

  const adjustForFault = (chargerId: string, t: number): number => {
    for (const [s, e] of faults.get(chargerId) ?? []) {
      if (t >= s && t < e) return e;
    }
    return t;
  };

  // hourly aggregates, initialised for every hour so empty hours exist too
  const agg = new Map<number, HourAgg>();
  for (let t = from.getTime(); t < nowMs; t += HOUR_MS) {
    agg.set(t, { sessions: 0, energy: 0, revenue: 0, waitSum: 0, waitN: 0, busyMin: 0 });
  }
  const addBusy = (startMs: number, endMs: number) => {
    let t = Math.floor(startMs / HOUR_MS) * HOUR_MS;
    while (t < endMs && t < nowMs) {
      const a = agg.get(t);
      const overlap = Math.min(endMs, t + HOUR_MS) - Math.max(startMs, t);
      if (a && overlap > 0) a.busyMin += overlap / 60000;
      t += HOUR_MS;
    }
  };

  const rows: SessionRow[] = [];
  const liveChargerIds = new Set<string>();

  for (let hourStart = from.getTime(); hourStart < nowMs; hourStart += HOUR_MS) {
    const { hour, dow } = istParts(new Date(hourStart));
    const n = poisson(rng, expectedArrivals(kind, chargers.length, hour, dow, pop));
    const arrivals: number[] = [];
    for (let i = 0; i < n; i++) arrivals.push(hourStart + rng() * HOUR_MS);
    arrivals.sort((a, b) => a - b);

    for (const arrival of arrivals) {
      if (arrival >= nowMs) continue;
      // choose the charger that can start earliest
      let best: { id: string; start: number; powerKw: number } | null = null;
      for (const c of chargers) {
        const start = adjustForFault(c.id, Math.max(arrival, freeAt.get(c.id) ?? arrival));
        if (!best || start < best.start) best = { id: c.id, start, powerKw: c.powerKw };
      }
      if (!best) continue;
      const waitMin = (best.start - arrival) / 60000;
      if (waitMin > MAX_QUEUE_WAIT_MIN) continue; // abandoned
      if (best.start >= nowMs) continue;

      const vehicle = pickVehicle(rng);
      const sim = simulateSession(rng, { powerKw: best.powerKw }, vehicle);
      const endMs = best.start + sim.durationMin * 60000;
      freeAt.set(best.id, endMs + UNPLUG_GAP_MS);

      const completed = endMs <= nowMs;
      const frac = completed ? 1 : Math.max(0.02, (nowMs - best.start) / (endMs - best.start));
      const energy = +(sim.energyKwh * frac).toFixed(2);
      const amount = +(energy * (st.pricePerKwh || 15)).toFixed(2);

      rows.push({
        stationId: st.id,
        chargerId: best.id,
        startTs: new Date(best.start),
        endTs: completed ? new Date(endMs) : null,
        estimatedEndTs: new Date(endMs),
        socStart: sim.socStart,
        socEnd: completed ? sim.socEnd : null,
        energyKwh: energy,
        amountInr: amount,
        source: "twin",
        queueWaitMin: +waitMin.toFixed(1),
      });
      if (!completed) liveChargerIds.add(best.id);

      const hourKey = Math.floor(best.start / HOUR_MS) * HOUR_MS;
      const a = agg.get(hourKey);
      if (a) {
        a.sessions += 1;
        a.energy += energy;
        a.revenue += amount;
        a.waitSum += waitMin;
        a.waitN += 1;
      }
      addBusy(best.start, Math.min(endMs, nowMs));
    }
  }

  // ----- persist (idempotent: delete previous simulated history in range first) -----
  const chargerIds = chargers.map((c) => c.id);
  await prisma.session.deleteMany({ where: { stationId: st.id, source: "twin", startTs: { gte: from } } });
  await prisma.stationMetricHourly.deleteMany({ where: { stationId: st.id, hourTs: { gte: from } } });
  await prisma.chargerEvent.deleteMany({
    where: { chargerId: { in: chargerIds }, ts: { gte: from }, payload: { contains: "backfill" } },
  });

  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.session.createMany({ data: rows.slice(i, i + 1000) });
  }

  const metricRows = Array.from(agg.entries()).map(([ms, a]) => ({
    stationId: st.id,
    hourTs: new Date(ms),
    sessions: a.sessions,
    occupancyPct: +Math.min(100, (a.busyMin / (chargers.length * 60)) * 100).toFixed(1),
    avgWaitMin: a.waitN > 0 ? +(a.waitSum / a.waitN).toFixed(1) : 0,
    energyKwh: +a.energy.toFixed(2),
    revenueInr: +a.revenue.toFixed(2),
  }));
  for (let i = 0; i < metricRows.length; i += 1000) {
    await prisma.stationMetricHourly.createMany({ data: metricRows.slice(i, i + 1000), skipDuplicates: true });
  }
  if (events.length > 0) await prisma.chargerEvent.createMany({ data: events });

  // warm start: chargers with an open session are BUSY, others FREE (do not touch faulted ones)
  for (const c of chargers) {
    if (c.status !== "FREE" && c.status !== "BUSY") continue;
    const next = liveChargerIds.has(c.id) ? "BUSY" : "FREE";
    if (c.status !== next) await prisma.charger.update({ where: { id: c.id }, data: { status: next } });
  }

  return { sessions: rows.length };
}

async function main() {
  const now = new Date();
  const from = new Date(Math.floor((now.getTime() - DAYS * DAY_MS) / HOUR_MS) * HOUR_MS);
  const { operator, owned } = await ensureOperatorNetwork();
  console.log(`Operator ${operator.email} owns ${owned.length} stations`);

  const targets: StationWithChargers[] =
    SCOPE === "all" ? (await loadStations({})).filter((s) => s.chargers.length > 0) : owned;

  let total = 0;
  for (const st of targets) {
    const r = await backfillStation(st, from, now);
    total += r.sessions;
    console.log(`  ${st.name}: ${r.sessions} sessions`);
  }
  console.log(`Done. ${total} sessions over ${DAYS} days for ${targets.length} stations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
