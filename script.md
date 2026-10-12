# EVspark — Agent Script (demo data → production-ready pipeline)

> HOW TO USE: Give this whole file to your coding agent. Tell it: "Read this file fully. Do the tasks in order. After each task run the verification step. Do not skip or reorder tasks. Do not improvise."

---

## 0. MASTER PROMPT (agent reads this first)

You are working in the **EVspark** monorepo (pnpm + Turborepo). Goal: replace ALL fake/static demo data with a realistic simulated pipeline that behaves exactly like real data, so that later we only swap the *data source* (simulator → real chargers) and nothing else changes.

### Repo facts (verified, do not re-discover)
- API: `apps/api` (Express 5, TypeScript, ESM, Prisma 7, Socket.io, Redis via ioredis, `mqtt` package already installed).
- Web: `apps/web` (Next.js). Shared types/zod: `packages/shared`.
- Twin engine (OCPP simulator): `scripts/twin-engine/` (imports prisma from `../../apps/api/src/lib/prisma`).
- Old fake simulator: `scripts/mqtt-simulator/index.js` (HTTP PATCH random flips — to be replaced, NOT MQTT).
- Prisma schema: `apps/api/prisma/schema.prisma`. Models used: `User`, `OperatorProfile`, `Station` (has `operatorUserId`, `pricePerKwh`, `chargers`), `Charger` (`status` enum FREE|BUSY|MAINTENANCE|FAULTED|OFFLINE, `powerKw`, `connectorType`), `Session` (`startTs, endTs, estimatedEndTs, socStart, socEnd, energyKwh, amountInr, source, queueWaitMin`), `ChargerEvent` (`chargerId, status, ts, payload`), `StationMetricHourly` (`stationId, hourTs, sessions, occupancyPct, avgWaitMin, energyKwh, revenueInr`, unique on `stationId+hourTs`), `VehiclePing`, `SimConfig`.
- Fake analytics to be replaced: `apps/api/src/controllers/operator.controller.ts` → `getRevenueAnalytics` (formula `32 + (idx*5) % 18`, `avgUptime: 98.4`) and `getHeatmapAnalytics` (`Math.random()`).
- Operator routes: `apps/api/src/routes/operator.routes.ts`. Demo operator account: `operator@evspark.in`.
- Telemetry route: `POST /api/telemetry/ping` (header `x-twin-key`), controller `apps/api/src/controllers/telemetry.controller.ts`. Geofence = Redis set `geofence:{stationId}` within 200 m.
- MQTT consumer: `apps/api/src/lib/mqtt.ts` (currently subscribes `evtwin/chargers/+/status`, nothing publishes to it).
- Realtime helpers in `apps/api/src/lib/socket.ts`: `emitChargerUpdate(charger)`, `emitSessionUpdate({stationId, operatorUserId, session})`, `emitStationDelta(stationId, partial?)`.

### STRICT RULES FOR YOU (the agent)
1. Do ONE task at a time, in order. Finish + verify before starting the next.
2. Copy code EXACTLY as given. Only change import paths if the neighbouring files use a different style (some import `"../lib/prisma.js"`, some `"../lib/prisma"`). Match the file you are editing.
3. Do NOT install new npm packages unless a task says so.
4. Do NOT refactor, rename, reformat or "improve" anything not mentioned.
5. Do NOT delete files unless a task says so.
6. After every task run: `pnpm --filter api typecheck`. If it fails, fix ONLY your own change. If you cannot fix it in 2 tries, STOP and report the exact error.
7. Never invent endpoints, fields or Prisma models. If something in this file does not match the repo, STOP and report the mismatch instead of guessing.
8. All simulated rows must keep `source = "twin"` (this is the project's honesty label for simulated data). Never label simulated data as `"real"`.
9. Times: store UTC in DB. "Hour of day" for demand curves uses IST (UTC+5:30). Helper is provided.

### Architecture we are building (read once)
```
station-feed (simulator, later replaced by real chargers)
   │  MQTT  evtwin/stations/{stationId}/chargers/{chargerId}/telemetry
   ▼
Mosquitto broker  ──►  API MQTT consumer (validate → Session/Charger/ChargerEvent → socket)
                                              │
ghost drivers (simulated cars) ─ HTTP ping ─► telemetry → geofence → wait-time → socket
                                              │
Postgres: Session + StationMetricHourly ◄── hourly rollup job ◄── operator analytics (REAL queries)
```
Swap-in rule: when real hardware exists, ONLY the publisher changes (same topic + JSON schema).

---

## TASK 1 — Shared simulation model (pure functions)

Create file: `apps/api/src/sim/model.ts` (new folder `sim`). Paste exactly:

```ts
// apps/api/src/sim/model.ts
// Pure simulation helpers. No database access in this file.

export type StationKind = "highway" | "mall" | "office" | "residential" | "hub";

export interface SimVehicle {
  name: string;
  batteryKwh: number;
  maxDcKw: number;
  maxAcKw: number;
}

// Approximate specs of common Indian EVs (good enough for simulation).
export const VEHICLES: SimVehicle[] = [
  { name: "Tata Nexon EV", batteryKwh: 30, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "Tata Tiago EV", batteryKwh: 24, maxDcKw: 25, maxAcKw: 3.3 },
  { name: "Tata Punch EV", batteryKwh: 35, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "Tata Curvv EV", batteryKwh: 45, maxDcKw: 70, maxAcKw: 7.2 },
  { name: "MG ZS EV", batteryKwh: 50, maxDcKw: 76, maxAcKw: 7.4 },
  { name: "Mahindra XUV400", batteryKwh: 39, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "Hyundai Kona Electric", batteryKwh: 39, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "BYD Atto 3", batteryKwh: 60, maxDcKw: 80, maxAcKw: 7 },
  { name: "MG Windsor EV", batteryKwh: 38, maxDcKw: 45, maxAcKw: 7.4 },
];
const VEHICLE_WEIGHTS = [28, 12, 16, 8, 10, 9, 2, 5, 10];

// Demand curve per station kind. Index = hour of day (IST), value 0..1.
const CURVES: Record<StationKind, number[]> = {
  office:      [0.03,0.02,0.02,0.02,0.03,0.05, 0.12,0.35,0.7,0.9,0.8,0.6, 0.55,0.6,0.55,0.45,0.35,0.3, 0.2,0.12,0.08,0.06,0.04,0.03],
  mall:        [0.03,0.02,0.02,0.02,0.02,0.03, 0.05,0.08,0.12,0.2,0.35,0.55, 0.7,0.75,0.7,0.65,0.7,0.8, 0.95,1.0,0.85,0.6,0.3,0.1],
  highway:     [0.15,0.12,0.1,0.1,0.15,0.3, 0.5,0.7,0.8,0.75,0.7,0.75, 0.8,0.7,0.65,0.7,0.8,0.9, 0.85,0.7,0.5,0.35,0.25,0.18],
  residential: [0.25,0.2,0.15,0.1,0.1,0.1, 0.15,0.2,0.2,0.15,0.1,0.1, 0.1,0.1,0.1,0.15,0.25,0.5, 0.8,1.0,0.95,0.8,0.55,0.4],
  hub:         [0.08,0.06,0.05,0.05,0.07,0.15, 0.3,0.55,0.75,0.8,0.7,0.65, 0.7,0.7,0.65,0.6,0.7,0.85, 0.95,0.9,0.7,0.45,0.25,0.12],
};

const WEEKEND_FACTOR: Record<StationKind, number> = {
  office: 0.35,
  mall: 1.25,
  highway: 1.2,
  residential: 1.1,
  hub: 1.0,
};

// Arrivals per charger per hour at the busiest hour (curve value 1.0).
const PEAK_ARRIVALS_PER_CHARGER_HOUR = 1.4;

// ---------- random helpers ----------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randNormal(rng: () => number, mean: number, sd: number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function poisson(rng: () => number, lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 200);
  return k - 1;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- time helpers (IST = UTC+5:30) ----------
export function istParts(d: Date): { hour: number; dow: number; key: string } {
  const x = new Date(d.getTime() + 5.5 * 3600 * 1000);
  return { hour: x.getUTCHours(), dow: x.getUTCDay(), key: x.toISOString().slice(0, 10) };
}

// ---------- station helpers ----------
export function inferStationKind(s: { id: string; name: string; amenities?: string | null }): StationKind {
  const n = s.name.toLowerCase();
  if (/mall|plaza|centre|center|city ?center|market|inorbit|phoenix/.test(n)) return "mall";
  if (/highway|expressway|toll|fuel|petrol|bpcl|hpcl|indian ?oil|shell|jio-?bp|dhaba|nh ?\d/.test(n)) return "highway";
  if (/tech|park|office|corporate|bkc|business|it ?park|campus/.test(n)) return "office";
  if (/apartment|society|residen|housing|heights|towers/.test(n)) return "residential";
  const pick: StationKind[] = ["mall", "office", "highway", "hub", "hub"];
  return pick[hashString(s.id) % pick.length];
}

// 0.6 .. 1.29 — some stations are simply more popular than others.
export function popularity(stationId: string): number {
  return 0.6 + (hashString(stationId) % 70) / 100;
}

export function isDcCharger(c: { powerKw: number }): boolean {
  return c.powerKw >= 20;
}

export function expectedArrivals(
  kind: StationKind,
  chargerCount: number,
  hour: number,
  dow: number,
  pop: number
): number {
  const weekend = dow === 0 || dow === 6;
  const w = weekend ? WEEKEND_FACTOR[kind] : 1;
  return CURVES[kind][hour] * w * chargerCount * PEAK_ARRIVALS_PER_CHARGER_HOUR * pop;
}

// ---------- vehicle + charging ----------
export function pickVehicle(rng: () => number): SimVehicle {
  const total = VEHICLE_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < VEHICLES.length; i++) {
    r -= VEHICLE_WEIGHTS[i];
    if (r <= 0) return VEHICLES[i];
  }
  return VEHICLES[0];
}

// Power (kW) delivered at a given state of charge. Flat until 80%, then tapers.
export function chargePowerKw(chargerKw: number, vehicle: SimVehicle, dc: boolean, soc: number): number {
  const vehMax = dc ? vehicle.maxDcKw : vehicle.maxAcKw;
  const cap = Math.max(1, Math.min(chargerKw, vehMax > 0 ? vehMax : chargerKw));
  let f = 1;
  if (soc < 10) f = 0.85 + soc * 0.015;
  else if (soc > 80) f = Math.max(0.2, 1 - ((soc - 80) / 20) * 0.8);
  return cap * f;
}

export interface SimulatedSession {
  socStart: number;
  socEnd: number;
  durationMin: number;
  energyKwh: number; // energy billed (grid side)
  avgKw: number;
}

export function simulateSession(
  rng: () => number,
  charger: { powerKw: number },
  vehicle: SimVehicle
): SimulatedSession {
  const dc = isDcCharger(charger);
  const socStart = clamp(randNormal(rng, 28, 14), 5, 70);
  const target = dc
    ? clamp(randNormal(rng, 80, 6), socStart + 10, 95)
    : clamp(randNormal(rng, 92, 6), socStart + 10, 100);

  let soc = socStart;
  let minutes = 0;
  let gridKwh = 0;
  while (soc < target && minutes < 720) {
    const p = chargePowerKw(charger.powerKw, vehicle, dc, soc);
    const stepKwh = p / 60; // one minute
    gridKwh += stepKwh;
    soc += ((stepKwh * 0.94) / vehicle.batteryKwh) * 100; // 94% efficiency into battery
    minutes++;
  }
  const durationMin = Math.max(minutes, 5);
  return {
    socStart: +socStart.toFixed(1),
    socEnd: +Math.min(soc, 100).toFixed(1),
    durationMin,
    energyKwh: +gridKwh.toFixed(2),
    avgKw: +((gridKwh / durationMin) * 60).toFixed(1),
  };
}
```

**VERIFY TASK 1:** run `pnpm --filter api typecheck` → must pass.

---

## TASK 2 — 30-day history backfill + demo operator network + warm start

Goal: demo operator `operator@evspark.in` owns 5 stations and has 30 days of realistic history. Sessions still running "now" are left open (`endTs = null`) and their chargers set to BUSY → the map starts busy (warm start).

### 2.1 Create file `apps/api/src/scripts/seed-history.ts` (new folder `scripts`). Paste exactly:

```ts
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
```

### 2.2 Add script to `apps/api/package.json` → inside `"scripts"` add this line (keep other lines):
```json
"seed:history": "tsx src/scripts/seed-history.ts",
```

**VERIFY TASK 2:**
1. `pnpm --filter api typecheck` passes.
2. Make sure Postgres is running and seeded (`pnpm db:seed` if stations are empty).
3. `pnpm --filter api seed:history` → expect output like `Operator operator@evspark.in owns 5 stations` and ~hundreds to a few thousand sessions per station. Running it twice must NOT double the data.
4. Optional full-network history: `HISTORY_SCOPE=all pnpm --filter api seed:history`.

---

## TASK 3 — Replace fake analytics with real queries

### 3.1 Create file `apps/api/src/services/analytics.service.ts` (folder `services` already exists). Paste exactly:

```ts
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
```

### 3.2 Edit `apps/api/src/controllers/operator.controller.ts`
1. At the top with the other imports add:
```ts
import {
  getScopedStationIds,
  computeRevenueAnalytics,
  computeHeatmap,
  computeBreakdown,
} from "../services/analytics.service.js";
```
(If other imports in this file have no `.js` suffix, drop `.js` here too.)
2. **Replace the entire bodies** of `getRevenueAnalytics` and `getHeatmapAnalytics` (keep `export async function` names) with:
```ts
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
```
3. Make sure no `Math.random()` or `98.4` remains in those functions.

### 3.3 Edit `apps/api/src/routes/operator.routes.ts`
- Add `getBreakdownAnalytics,` to the import list from `"../controllers/operator.controller"`.
- Add after the heatmap route line:
```ts
router.get("/analytics/breakdown", getBreakdownAnalytics);
```

### 3.4 Create verify script `apps/api/src/scripts/verify-analytics.ts`
```ts
import prisma from "../lib/prisma.js";
import { computeRevenueAnalytics, computeHeatmap, computeBreakdown } from "../services/analytics.service.js";

async function main() {
  const op = await prisma.user.findUnique({ where: { email: "operator@evspark.in" } });
  if (!op) throw new Error("operator@evspark.in not found - run db:seed first");
  const ids = (await prisma.station.findMany({ where: { operatorUserId: op.id }, select: { id: true } })).map((s) => s.id);
  console.log("stations:", ids.length);
  console.log(JSON.stringify(await computeRevenueAnalytics(ids), null, 2));
  console.log(JSON.stringify(await computeHeatmap(ids), null, 2));
  console.log(JSON.stringify(await computeBreakdown(ids), null, 2));
  // new operator with no stations must give empty/zero values, not someone else's data
  console.log("EMPTY CASE:", JSON.stringify((await computeRevenueAnalytics([])).summary));
}
main().finally(() => prisma.$disconnect());
```
Add to `apps/api/package.json` scripts: `"verify:analytics": "tsx src/scripts/verify-analytics.ts",`

**VERIFY TASK 3:**
1. `pnpm --filter api typecheck` passes.
2. `pnpm --filter api verify:analytics` → numbers must be non-zero for the operator, the heatmap must show higher occupancy in the evening, `EMPTY CASE` must show zeros. Run it twice: the output must be IDENTICAL both times (no randomness).
3. `grep -rn "Math.random" apps/api/src/controllers/operator.controller.ts` → no results.

---



---

## TASK 3B — Operator web page: remove hardcoded numbers

File: `apps/web/src/app/(main)/station/analytics/page.tsx` (278 lines). **View the whole file first.**
It already calls `/api/operator/analytics/revenue`, `/heatmap`, `/sessions` with `useQuery` (lines ~34-46) — copy that exact style.

Do these edits (find by content, not by line number):
1. Add a third query next to the existing ones (copy the style of the heatmap query; use a NEW unique `queryKey`):
```tsx
const { data: breakdownData } = useQuery<any>({
  queryKey: ["operator-analytics-breakdown"],
  queryFn: () => api.get("/api/operator/analytics/breakdown"),
});
```
2. Find the hardcoded weekly array (it contains `{ day: "Mon", revenue: 4200, kwh: 280, sessions: 35 }`). Keep the SAME variable name, replace its value with:
`revenueData?.revenueByDay ?? []`
3. Find `const connectorData = [` (CCS2 68 / Type 2 24 / CHAdeMO 8). Keep the variable name, replace with:
`(breakdownData?.connectorSplit ?? []).map((c: any) => ({ name: c.name, value: c.value }))`
4. Add this right after the queries (before `return`):
```tsx
const waitRows = (heatmapData || []).filter((h: any) => h.avgWaitMin > 0);
const avgWait = waitRows.length
  ? (waitRows.reduce((a: number, h: any) => a + h.avgWaitMin, 0) / waitRows.length).toFixed(1)
  : "0.0";
```
5. KPI cards — replace literals:
   - `inr(revenueData?.summary?.totalRevenue ?? 39500)` → `inr(revenueData?.summary?.totalRevenue ?? 0)`
   - `num(2620, 0)` → `num((revenueData?.revenueByDay ?? []).reduce((a: number, d: any) => a + (d.kwh || 0), 0), 0)`
   - `inr(127)` → `inr(revenueData?.summary?.avgSessionRevenue ?? 0)`
   - the hardcoded `6.4` (avg wait, min) → `{avgWait}`
   - any other hardcoded number in a KPI card (sessions count, uptime like `98.4`) → use `revenueData?.summary?.totalSessions ?? 0` and `revenueData?.summary?.avgUptime ?? 0`.
6. Empty state: if `revenueData?.summary?.stationCount === 0`, render near the top: `<p className="text-sm text-[#5F6368]">No stations yet. Add a station to see analytics.</p>`
7. Run: `grep -nE "\b(39500|2620|127|6\.4|98\.4)\b" "apps/web/src/app/(main)/station/analytics/page.tsx"` → must return nothing.

**VERIFY:** `pnpm --filter web typecheck` (or `pnpm --filter web build` if no typecheck script). Login as `operator@evspark.in` → analytics page shows numbers that do NOT change on refresh.

---

## TASK 4 — DB: link simulated/real sessions to a stable external id

MQTT messages carry a `sessionId`. We need to find the same Session again on every message.

1. Edit `apps/api/prisma/schema.prisma` → in `model Session` add this line right after `ocppTxId Int?`:
```prisma
  externalId     String?   @unique
```
2. Run (exact):
```bash
pnpm --filter api db:migrate:dev -- --name session_external_id
pnpm --filter api prisma:generate
```
3. `pnpm --filter api typecheck` must pass.

---

## TASK 5 — MQTT consumer (production schema, validation, session lifecycle)

### 5.1 Topic + JSON contract (this is the contract real hardware/gateway must follow later)
```
Topic (telemetry, QoS 1, retained):
  evtwin/stations/{stationId}/chargers/{chargerId}/telemetry
Topic (feed health, retained, last-will):
  evtwin/feed/{feedId}/status      payload: "online" | "offline"
Legacy topic still accepted:
  evtwin/chargers/{chargerId}/status   payload: {"status":"FREE"}

Payload JSON:
{
  "v": 1,
  "ts": "2026-10-11T10:15:30.000Z",   // ISO time of the reading
  "status": "BUSY",                    // FREE | BUSY | MAINTENANCE | FAULTED | OFFLINE
  "sessionId": "sim-ab12cd34",         // required while BUSY, stable for the whole session
  "powerKw": 42.1,                     // 0..400
  "energyKwh": 12.34,                  // 0..300, cumulative for this session
  "soc": 54.2,                         // 0..100, optional
  "socStart": 22.0,                    // 0..100, optional, send on first message of a session
  "startedAt": "2026-10-11T10:02:00Z", // optional ISO time the session really started
  "vehicle": "Tata Nexon EV",          // optional
  "source": "twin"                     // "twin" (simulated) | "real"
}
```

### 5.2 REPLACE the whole file `apps/api/src/lib/mqtt.ts` with:
(Keep the same import style the old file used: `"./prisma"`, `"./socket"`, `"./logger"` without `.js`.)

```ts
import mqtt from "mqtt";
import prisma from "./prisma";
import { emitChargerUpdate, emitSessionUpdate, emitStationDelta } from "./socket";
import logger from "./logger";

export type ChargerStatus = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";
const STATUSES = new Set(["FREE", "BUSY", "MAINTENANCE", "FAULTED", "OFFLINE"]);

const TELEMETRY_TOPIC = "evtwin/stations/+/chargers/+/telemetry";
const LEGACY_TOPIC = "evtwin/chargers/+/status";
const FEED_STATUS_TOPIC = "evtwin/feed/+/status";

interface Telemetry {
  ts: Date;
  status: ChargerStatus;
  sessionId?: string;
  powerKw?: number;
  energyKwh?: number;
  soc?: number;
  socStart?: number;
  vehicle?: string;
  startedAt?: Date;
  source: "twin" | "real";
}

const stats = { received: 0, rejected: 0, processed: 0 };

function num(v: unknown, lo: number, hi: number): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) throw new Error("number out of range");
  return v;
}

export function parseTelemetry(raw: string): Telemetry {
  const d = JSON.parse(raw);
  if (!d || typeof d !== "object") throw new Error("payload must be an object");
  if (!STATUSES.has(d.status)) throw new Error("invalid status");
  const ts = d.ts ? new Date(d.ts) : new Date();
  if (isNaN(ts.getTime())) throw new Error("invalid ts");
  const age = Date.now() - ts.getTime();
  if (age > 24 * 3600 * 1000 || age < -5 * 60 * 1000) throw new Error("ts too old or in the future");
  if (d.sessionId !== undefined && (typeof d.sessionId !== "string" || d.sessionId.length > 64)) {
    throw new Error("invalid sessionId");
  }
  if (d.status === "BUSY" && !d.sessionId) throw new Error("sessionId required while BUSY");
  let startedAt: Date | undefined;
  if (d.startedAt !== undefined) {
    startedAt = new Date(d.startedAt);
    if (isNaN(startedAt.getTime()) || startedAt.getTime() > ts.getTime() + 60_000 || ts.getTime() - startedAt.getTime() > 12 * 3600 * 1000) {
      throw new Error("invalid startedAt");
    }
  }
  return {
    startedAt,
    ts,
    status: d.status,
    sessionId: d.sessionId,
    powerKw: num(d.powerKw, 0, 400),
    energyKwh: num(d.energyKwh, 0, 300),
    soc: num(d.soc, 0, 100),
    socStart: num(d.socStart, 0, 100),
    vehicle: typeof d.vehicle === "string" ? d.vehicle.slice(0, 80) : undefined,
    source: d.source === "real" ? "real" : "twin",
  };
}

async function handleTelemetry(stationId: string, chargerId: string, t: Telemetry) {
  const charger = await prisma.charger.findUnique({
    where: { id: chargerId },
    include: { station: { select: { id: true, operatorUserId: true, pricePerKwh: true } } },
  });
  if (!charger || charger.stationId !== stationId) {
    stats.rejected++;
    logger.warn({ stationId, chargerId }, "[MQTT] unknown charger/station pair, dropped");
    return;
  }

  // ---- session lifecycle ----
  if (t.status === "BUSY" && t.sessionId) {
    const energy = t.energyKwh ?? 0;
    const session = await prisma.session.upsert({
      where: { externalId: t.sessionId },
      create: {
        externalId: t.sessionId,
        stationId,
        chargerId,
        startTs: t.startedAt ?? t.ts,
        socStart: t.socStart ?? t.soc ?? null,
        energyKwh: energy,
        amountInr: +(energy * (charger.station.pricePerKwh || 15)).toFixed(2),
        source: t.source,
      },
      update: {
        energyKwh: energy,
        amountInr: +(energy * (charger.station.pricePerKwh || 15)).toFixed(2),
      },
    });
    emitSessionUpdate({ stationId, operatorUserId: charger.station.operatorUserId, session });
  } else {
    // charger no longer BUSY -> close any open session on it
    const open = await prisma.session.findMany({
      where: { chargerId, endTs: null, externalId: { not: null } },
      select: { id: true, energyKwh: true },
    });
    for (const o of open) {
      const energy = t.energyKwh ?? o.energyKwh ?? 0;
      const closed = await prisma.session.update({
        where: { id: o.id },
        data: {
          endTs: t.ts,
          socEnd: t.soc ?? null,
          energyKwh: energy,
          amountInr: +(energy * (charger.station.pricePerKwh || 15)).toFixed(2),
        },
      });
      emitSessionUpdate({ stationId, operatorUserId: charger.station.operatorUserId, session: closed });
    }
  }

  // ---- charger status change ----
  if (charger.status !== t.status) {
    const updated = await prisma.charger.update({ where: { id: chargerId }, data: { status: t.status as any } });
    await prisma.chargerEvent.create({
      data: { chargerId, status: t.status as any, ts: t.ts, payload: JSON.stringify({ source: t.source, via: "mqtt" }) },
    });
    emitChargerUpdate(updated);
    emitStationDelta(stationId);
  }
  stats.processed++;
}

export function initMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    logger.warn("[MQTT] MQTT_BROKER_URL not set — skipping MQTT consumer");
    return;
  }

  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 2000,
  });

  client.on("connect", () => {
    logger.info("[MQTT] Connected to broker");
    client.subscribe([TELEMETRY_TOPIC, LEGACY_TOPIC, FEED_STATUS_TOPIC], { qos: 1 }, (err) => {
      if (err) logger.error({ err }, "[MQTT] Subscribe error");
    });
  });

  client.on("message", async (topic, payload) => {
    stats.received++;
    try {
      const parts = topic.split("/");
      if (parts[0] === "evtwin" && parts[1] === "feed" && parts[3] === "status") {
        logger.info({ feed: parts[2], state: payload.toString() }, "[MQTT] feed status");
        return;
      }
      if (parts.length === 6 && parts[1] === "stations" && parts[3] === "chargers" && parts[5] === "telemetry") {
        await handleTelemetry(parts[2], parts[4], parseTelemetry(payload.toString()));
        return;
      }
      if (parts.length === 4 && parts[1] === "chargers" && parts[3] === "status") {
        // legacy: status only, no session handling
        const data = JSON.parse(payload.toString());
        if (!STATUSES.has(data?.status)) throw new Error("invalid status");
        const updated = await prisma.charger.update({ where: { id: parts[2] }, data: { status: data.status } });
        emitChargerUpdate(updated);
        return;
      }
      stats.rejected++;
    } catch (err) {
      stats.rejected++;
      logger.warn({ err: (err as Error).message, topic }, "[MQTT] message rejected");
    }
  });

  client.on("error", (err) => logger.error({ err }, "[MQTT] Client error"));
  setInterval(() => logger.info(stats, "[MQTT] stats"), 60_000).unref();
  return client;
}
```
**Notes for the agent:** if `emitSessionUpdate` / `emitStationDelta` signatures differ from what is shown in `apps/api/src/lib/socket.ts`, STOP and report. The old `getIO` import is intentionally removed.

**VERIFY TASK 5:** `pnpm --filter api typecheck` passes.

---

## TASK 6 — Local MQTT broker (Mosquitto)

1. Create `infra/mosquitto/mosquitto.conf` (new folder):
```
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
```
(Demo only. For production: set `allow_anonymous false` and add a password file / TLS.)
2. In `docker-compose.yml` under `services:` add (same indentation as `redis:`):
```yaml
  mosquitto:
    image: eclipse-mosquitto:2
    restart: unless-stopped
    ports:
      - "1883:1883"
    volumes:
      - ./infra/mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - mosquittodata:/mosquitto/data
```
and under the bottom `volumes:` add `  mosquittodata:`.
3. Add to `.env.example` AND your local `apps/api/.env`:
```
ENABLE_MQTT=true
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
DEMO_MODE=true
```
4. `docker compose up -d mosquitto`

**VERIFY TASK 6:** start API (`pnpm dev:api`) → log shows `[MQTT] Connected to broker`.


---

## TASK 7 — Station feed publisher (replaces the fake `scripts/mqtt-simulator`)

What it does: for EVERY station on the map, cars arrive at random times (busier at rush hour, by station type), plug in, charge with a realistic power curve (flat to 80 %, then taper), unplug, and sometimes a charger faults. It publishes ONLY MQTT messages using the contract from Task 5. The API is the only thing that writes to the DB. It re-reads the station list every 60 s (new operator stations get simulated automatically) and warm-starts so the map is already busy on launch. It respects the admin Twin Control settings (`SimConfig`: running, speed, surge stations/multiplier).

> IMPORTANT: do NOT run `twin-engine` and `station-feed` at the same time (both would simulate the same chargers).

### 7.0 Add ONE helper to `apps/api/src/sim/model.ts` (append at the end of the file)
```ts
export function sampleSocRange(rng: () => number, charger: { powerKw: number }): { socStart: number; target: number } {
  const dc = isDcCharger(charger);
  const socStart = clamp(randNormal(rng, 28, 14), 5, 70);
  const target = dc
    ? clamp(randNormal(rng, 80, 6), socStart + 10, 95)
    : clamp(randNormal(rng, 92, 6), socStart + 10, 100);
  return { socStart, target };
}
```

### 7.1 Create folder `scripts/station-feed/` with these files

`scripts/station-feed/package.json`:
```json
{
  "name": "station-feed",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx index.ts",
    "start": "tsx index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^16.4.7",
    "mqtt": "^5.15.2"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.23.11",
    "typescript": "^5.7.0"
  }
}
```
`scripts/station-feed/tsconfig.json`: **copy `scripts/twin-engine/tsconfig.json` unchanged.**

Then run `pnpm install` at repo root.

`scripts/station-feed/index.ts`:
```ts
import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import mqtt from "mqtt";
import prisma from "../../apps/api/src/lib/prisma";
import {
  mulberry32, poisson, pickVehicle, sampleSocRange, chargePowerKw, expectedArrivals,
  inferStationKind, popularity, isDcCharger, istParts,
  type SimVehicle, type StationKind,
} from "../../apps/api/src/sim/model";

const BROKER = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const FEED_ID = process.env.FEED_ID || "demo-feed";
const TICK_MS = Number(process.env.FEED_TICK_MS || 5000);
const SPEED_ENV = process.env.FEED_SPEED ? Number(process.env.FEED_SPEED) : null; // overrides SimConfig.speed
const MAX_QUEUE = 6;
const MAX_WAIT_SIM_MIN = 25;
const HEARTBEAT_MS = 30_000;

type Status = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";
interface Live { sessionId: string; vehicle: SimVehicle; socStart: number; soc: number; target: number; energy: number; startedAt: Date; powerKw: number; }
interface CState { id: string; stationId: string; powerKw: number; status: Status; live?: Live; faultUntil?: number; lastPublish: number; }
interface SState { id: string; name: string; kind: StationKind; pop: number; chargers: CState[]; queue: Array<{ vehicle: SimVehicle; waited: number }>; }

const rng = mulberry32(process.env.FEED_SEED ? Number(process.env.FEED_SEED) : Date.now());
const stations = new Map<string, SState>();
let simMin = 0; // simulated minutes since start
let cfg = { running: true, speed: 4, surge: new Set<string>(), surgeMult: 2 };

const client = mqtt.connect(BROKER, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  reconnectPeriod: 2000,
  will: { topic: `evtwin/feed/${FEED_ID}/status`, payload: Buffer.from("offline"), qos: 1, retain: true },
});
client.on("connect", () => {
  console.log(`[feed] connected to ${BROKER}`);
  client.publish(`evtwin/feed/${FEED_ID}/status`, "online", { qos: 1, retain: true });
});
client.on("error", (e) => console.error("[feed] mqtt error", e.message));

function publish(st: SState, c: CState, final?: { energy: number; soc: number }) {
  const l = c.live;
  const payload: Record<string, unknown> = {
    v: 1, ts: new Date().toISOString(), status: c.status, source: "twin",
  };
  if (c.status === "BUSY" && l) {
    Object.assign(payload, {
      sessionId: l.sessionId, powerKw: +l.powerKw.toFixed(1), energyKwh: +l.energy.toFixed(2),
      soc: +l.soc.toFixed(1), socStart: +l.socStart.toFixed(1), vehicle: l.vehicle.name, startedAt: l.startedAt.toISOString(),
    });
  } else if (final) {
    Object.assign(payload, { energyKwh: +final.energy.toFixed(2), soc: +final.soc.toFixed(1), powerKw: 0 });
  } else {
    payload.powerKw = 0;
  }
  client.publish(`evtwin/stations/${st.id}/chargers/${c.id}/telemetry`, JSON.stringify(payload), { qos: 1, retain: true });
  c.lastPublish = Date.now();
}

function startSession(st: SState, c: CState, vehicle: SimVehicle, warm = false) {
  const { socStart, target } = sampleSocRange(rng, { powerKw: c.powerKw });
  let soc = socStart;
  let energy = 0;
  let startedAt = new Date();
  if (warm) {
    soc = socStart + rng() * (target - socStart) * 0.9;
    energy = ((soc - socStart) / 100) * vehicle.batteryKwh / 0.94;
    startedAt = new Date(Date.now() - rng() * 30 * 60000);
  }
  c.live = { sessionId: `sim-${Math.random().toString(36).slice(2, 10)}`, vehicle, socStart, soc, target, energy, startedAt, powerKw: 0 };
  c.status = "BUSY";
  publish(st, c);
}

function finishSession(st: SState, c: CState, nextStatus: Status = "FREE") {
  const final = c.live ? { energy: c.live.energy, soc: c.live.soc } : undefined;
  c.live = undefined;
  c.status = nextStatus;
  publish(st, c, final);
}

async function syncStations(first: boolean) {
  const rows = await prisma.station.findMany({ where: { status: "APPROVED" }, include: { chargers: true } });
  const seen = new Set<string>();
  const { hour, dow } = istParts(new Date());
  for (const r of rows) {
    if (r.chargers.length === 0) continue;
    seen.add(r.id);
    let st = stations.get(r.id);
    if (!st) {
      st = { id: r.id, name: r.name, kind: inferStationKind(r), pop: popularity(r.id), chargers: [], queue: [] };
      stations.set(r.id, st);
    }
    for (const ch of r.chargers) {
      if (st.chargers.find((x) => x.id === ch.id)) continue;
      const dbBroken = ch.status === "MAINTENANCE" || ch.status === "FAULTED" || ch.status === "OFFLINE";
      const c: CState = { id: ch.id, stationId: r.id, powerKw: ch.powerKw, status: dbBroken ? (ch.status as Status) : "FREE", lastPublish: 0 };
      st.chargers.push(c);
      if (dbBroken) { c.faultUntil = simMin + 30 + rng() * 60; publish(st, c); continue; }
      // warm start: probability this charger is busy right now
      const util = Math.min(0.9, Math.max(0.05, (expectedArrivals(st.kind, st.chargers.length, hour, dow, st.pop) / Math.max(1, st.chargers.length)) * (35 / 60)));
      if (rng() < util) startSession(st, c, pickVehicle(rng), true);
      else publish(st, c);
    }
  }
  for (const id of Array.from(stations.keys())) if (!seen.has(id)) stations.delete(id);
  if (first) console.log(`[feed] simulating ${stations.size} stations / ${Array.from(stations.values()).reduce((a, s) => a + s.chargers.length, 0)} chargers`);
}

async function loadConfig() {
  try {
    const c = await prisma.simConfig.findFirst({ where: { id: "default" } });
    if (c) {
      cfg = {
        running: c.running,
        speed: SPEED_ENV ?? (c.speed || 4),
        surge: new Set((c.surgeStations || "").split(",").map((x) => x.trim()).filter(Boolean)),
        surgeMult: c.surgeMultiplier || 2,
      };
    } else if (SPEED_ENV) cfg.speed = SPEED_ENV;
  } catch { /* keep previous config */ }
}

let tickN = 0;
function tick() {
  if (!cfg.running) return;
  const dtMin = (TICK_MS / 60000) * cfg.speed; // simulated minutes per tick
  simMin += dtMin;
  const { hour, dow } = istParts(new Date());

  for (const st of stations.values()) {
    // 1) queue patience
    st.queue.forEach((q) => (q.waited += dtMin));
    st.queue = st.queue.filter((q) => q.waited <= MAX_WAIT_SIM_MIN);

    // 2) arrivals
    const surge = cfg.surge.has(st.id) ? cfg.surgeMult : 1;
    const lambda = (expectedArrivals(st.kind, st.chargers.length, hour, dow, st.pop) * surge * dtMin) / 60;
    const n = poisson(rng, lambda);
    for (let i = 0; i < n; i++) {
      const vehicle = pickVehicle(rng);
      const free = st.chargers.filter((c) => c.status === "FREE");
      if (free.length > 0) startSession(st, free[Math.floor(rng() * free.length)], vehicle);
      else if (st.queue.length < MAX_QUEUE) st.queue.push({ vehicle, waited: 0 });
    }

    // 3) charger progress
    for (const c of st.chargers) {
      if ((c.status === "FAULTED" || c.status === "MAINTENANCE") && simMin >= (c.faultUntil ?? 0)) {
        c.status = "FREE"; c.faultUntil = undefined; publish(st, c);
      }
      if (c.status === "BUSY" && c.live) {
        const l = c.live;
        const dc = isDcCharger({ powerKw: c.powerKw });
        l.powerKw = chargePowerKw(c.powerKw, l.vehicle, dc, l.soc);
        const kwh = (l.powerKw * dtMin) / 60;
        l.energy += kwh;
        l.soc = Math.min(100, l.soc + ((kwh * 0.94) / l.vehicle.batteryKwh) * 100);
        if (l.soc >= l.target) {
          finishSession(st, c);
        } else if (rng() < 0.02 * (dtMin / 60)) {
          finishSession(st, c, rng() < 0.5 ? "FAULTED" : "MAINTENANCE");
          c.faultUntil = simMin + 20 + rng() * 70;
        } else publish(st, c);
      } else if (c.status === "FREE") {
        if (rng() < 0.02 * (dtMin / 60)) { c.status = "FAULTED"; c.faultUntil = simMin + 20 + rng() * 70; publish(st, c); }
        else if (Date.now() - c.lastPublish > HEARTBEAT_MS) publish(st, c);
      }
      // 4) queued car takes a freed charger
      if (c.status === "FREE" && st.queue.length > 0) {
        const q = st.queue.shift()!;
        startSession(st, c, q.vehicle);
      }
    }
  }

  if (++tickN % 12 === 0) {
    let busy = 0, total = 0;
    for (const st of stations.values()) for (const c of st.chargers) { total++; if (c.status === "BUSY") busy++; }
    console.log(`[feed] speed=${cfg.speed}x busy=${busy}/${total} (${Math.round((busy / Math.max(1, total)) * 100)}%)`);
  }
}

async function main() {
  console.log("[feed] EVspark station feed starting...");
  await loadConfig();
  await syncStations(true);
  setInterval(() => syncStations(false).catch((e) => console.error("[feed] sync failed", e.message)), 60_000);
  setInterval(() => loadConfig(), 30_000);
  setInterval(tick, TICK_MS);
}

async function shutdown() {
  client.publish(`evtwin/feed/${FEED_ID}/status`, "offline", { qos: 1, retain: true }, () => {
    client.end(false, {}, () => prisma.$disconnect().finally(() => process.exit(0)));
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((e) => { console.error(e); process.exit(1); });
```

### 7.2 Root `package.json` → add under `"scripts"`:
```json
"feed": "pnpm --filter station-feed dev",
"ghosts": "pnpm --filter ghost-drivers dev",
```

**VERIFY TASK 7:**
1. `pnpm --filter station-feed typecheck` passes.
2. With broker + API (ENABLE_MQTT=true) + DB running: `pnpm feed` → logs `simulating N stations`, then every minute `busy=x/y`.
3. Watch messages: `docker compose exec mosquitto mosquitto_sub -t "evtwin/#" -v | head -20` → JSON telemetry as in the contract.
4. In DB: `Session` rows with `externalId` starting `sim-` appear and finish (`endTs` filled). Charger statuses change in the driver map without refresh.


---

## TASK 8 — Make incoming cars actually change the wait time

> **CORRECTION (verified in code):** `computeBlendedWait` in `packages/shared/src/wait-time.ts` already supports `geofenceVehicleCount`, BUT `computeWaitTime` (the function every endpoint and the socket flush really call) never passes it, and nothing reads the Redis set `geofence:{stationId}`. So right now cars heading to a station have NO effect on its wait time. This task wires it up. Do not change the blending math.

### 8.1 Edit `packages/shared/src/wait-time.ts`
1. In `interface WaitTimeInput` add: `geofenceVehicleCount?: number;`
2. In `interface WaitTimeResult` add: `incomingVehicles?: number;`
3. Replace the function `computeWaitTime` with:
```ts
export function computeWaitTime({
  chargers,
  queueLength,
  targetConnector,
  defaultAvgSessionMinutes = 30,
  geofenceVehicleCount = 0,
}: WaitTimeInput): WaitTimeResult {
  const blended = computeBlendedWait({
    chargerStates: chargers,
    explicitQueueLength: queueLength,
    geofenceVehicleCount,
    targetConnector,
    avgSessionDuration: defaultAvgSessionMinutes,
  });

  return {
    waitMinutes: blended.waitMinutes,
    availableChargers: blended.availableChargers,
    totalCompatibleChargers: blended.totalCompatibleChargers,
    markerColor: blended.markerColor,
    isOverloaded: blended.isOverloaded,
    incomingVehicles: geofenceVehicleCount,
  };
}
```
4. Open `packages/shared/package.json`. If `main`/`exports` points to `dist/...`, run `pnpm --filter @evspark/shared build`. Then `pnpm --filter api typecheck`.

### 8.2 Create `apps/api/src/lib/geofence.ts`
```ts
import { getRedis } from "./redis.js";

export const GEOFENCE_RADIUS_M = Number(process.env.GEOFENCE_RADIUS_M || 200);

// Number of vehicles currently heading to each station (Redis set per station).
export async function getGeofenceCounts(stationIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (stationIds.length === 0) return out;
  try {
    const client = getRedis();
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect().catch(() => {});
    }
    const counts = await Promise.all(stationIds.map((id) => client.scard(`geofence:${id}`)));
    stationIds.forEach((id, i) => out.set(id, counts[i] ?? 0));
  } catch {
    // Redis down -> behave as if nobody is incoming
  }
  return out;
}
```
(Match the import style of neighbouring files: with or without `.js`.)

### 8.3 Use it at every `computeWaitTime(` call
Run `grep -rn "computeWaitTime(" apps/api/src --include=*.ts | grep -v generated`. Expected: 3 places in `apps/api/src/controllers/stations.controller.ts` and 1 in `apps/api/src/lib/socket.ts` (inside `flushDeltas`). In EACH place:
- `import { getGeofenceCounts } from "<relative path>/lib/geofence";` (in `socket.ts` use `"./geofence"`).
- Compute counts ONCE before the loop/map: `const geoCounts = await getGeofenceCounts(<array of station ids>);`
- Add this argument to `computeWaitTime({...})`: `geofenceVehicleCount: geoCounts.get(<station>.id) ?? 0,`
- If the call is inside a NON-async callback, move the `await getGeofenceCounts(...)` above it (never make map callbacks async).
- In `attachBatchWaitTimes` also add `incomingVehicles: geoCounts.get(st.id) ?? 0,` to the returned object.
- For single-station functions (`getStation`, and the one at ~line 162): `const geo = (await getGeofenceCounts([station.id])).get(station.id) ?? 0;`

**VERIFY TASK 8:** `pnpm --filter api typecheck` passes. Manual test after Task 9: send a ping inside the radius → `GET /api/stations/:id` shows `incomingVehicles: 1` and a higher `waitMinutes`.

---

## TASK 9 — Telemetry controller: clean geofence + ghost positions + demo radius

### 9.0 Check validation schema
Open `packages/shared/src/schemas.ts` → find `vehiclePingSchema`. It must allow `intent` values `"heading_to" | "idle" | "charging"`, `vehicleRef` strings up to at least 40 chars, lat in [-90,90], lng in [-180,180]. If not, extend it. Rebuild shared if needed (see 8.1 step 4).

### 9.1 Edit `apps/api/src/controllers/telemetry.controller.ts`
Add imports at top:
```ts
import { GEOFENCE_RADIUS_M } from "../lib/geofence.js";
import { emitStationDelta } from "../lib/socket.js";
import { invalidateStationCache } from "./stations.controller.js";
```
(Match neighbouring import style regarding `.js`.)

**Replace the whole `pingTelemetry` function** with:
```ts
const GHOST_KEY = "ghosts:positions";

export async function pingTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { vehicleRef, stationId, lat, lng, intent } = req.body;
    const isGhost = typeof vehicleRef === "string" && vehicleRef.startsWith("GHOST-");
    let pingId: string | null = null;

    // Simulated ghost drivers never touch the DB (no table growth) - only Redis.
    if (!isGhost) {
      const ping = await prisma.vehiclePing.create({
        data: { vehicleRef, stationId: stationId || null, lat, lng, intent },
      });
      pingId = ping.id;
    } else if (process.env.DEMO_MODE === "true") {
      try {
        const client = getRedis();
        if (intent === "heading_to") {
          await client.hset(GHOST_KEY, vehicleRef, JSON.stringify({ vehicleRef, lat, lng, stationId: stationId ?? null, ts: Date.now() }));
          await client.expire(GHOST_KEY, 300);
        } else {
          await client.hdel(GHOST_KEY, vehicleRef);
        }
      } catch (err) {
        logger.warn({ err }, "Failed to store ghost position");
      }
    }

    let insideGeofence = false;
    let changed = false;

    if (stationId) {
      const key = `geofence:${stationId}`;
      try {
        const client = getRedis();
        if (intent === "heading_to") {
          const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: { id: true, lat: true, lng: true },
          });
          if (station) {
            const distMeters = haversineKm(lat, lng, station.lat, station.lng) * 1000;
            if (distMeters < GEOFENCE_RADIUS_M) {
              insideGeofence = true;
              const added = await client.sadd(key, vehicleRef);
              await client.expire(key, 600);
              if (added === 1) changed = true;
            } else {
              const removed = await client.srem(key, vehicleRef);
              if (removed === 1) changed = true;
            }
          }
        } else {
          // "charging" or "idle": the car arrived / gave up -> it is no longer incoming
          const removed = await client.srem(key, vehicleRef);
          if (removed === 1 || isGhost) changed = true;
        }
      } catch (err) {
        logger.warn({ err, stationId }, "Failed to update Redis geofence set");
      }
      if (changed) {
        await invalidateStationCache(stationId);
        emitStationDelta(stationId);
      }
    }

    res.status(200).json({ ok: true, pingId, insideGeofence });
  } catch (err) {
    next(err);
  }
}

// Public, read-only list of simulated drivers for the demo map.
export async function getGhosts(_req: Request, res: Response): Promise<void> {
  if (process.env.DEMO_MODE !== "true") {
    res.json([]);
    return;
  }
  try {
    const all = await getRedis().hgetall(GHOST_KEY);
    const cutoff = Date.now() - 20_000;
    const list = Object.values(all)
      .map((v) => JSON.parse(v))
      .filter((g) => g.ts >= cutoff)
      .slice(0, 60);
    res.json(list);
  } catch {
    res.json([]);
  }
}
```

### 9.2 Edit `apps/api/src/routes/telemetry.routes.ts`
- Change the controller import to `import { authenticateTelemetry, pingTelemetry, getGhosts } from "../controllers/telemetry.controller";`
- Add before `export default router;`:
```ts
router.get("/ghosts", getGhosts);
```

### 9.3 Rate limiter
Open `apps/api/src/middleware/rateLimiter.ts`. If a global limiter covers `/api/telemetry`, add to that limiter's options (express-rate-limit v8 supports `skip`):
```ts
skip: (req) => !!process.env.TWIN_SECRET && req.headers["x-twin-key"] === process.env.TWIN_SECRET,
```
(Ghost drivers send ~13 requests/second in total.)

### 9.4 Env
Add to `apps/api/.env` and `.env.example`:
```
GEOFENCE_RADIUS_M=3000
TWIN_SECRET=change-me-to-a-long-random-string
```
(`3000` m is for the demo so a car changes the wait while it is still ~3 km away. Real production value: 200–500.)

**VERIFY TASK 9:** `pnpm --filter api typecheck` passes. Then with API running:
```bash
curl -s -X POST localhost:4000/api/telemetry/ping -H "content-type: application/json" -H "x-twin-key: $TWIN_SECRET" \
  -d '{"vehicleRef":"GHOST-test","stationId":"<STATION_ID>","lat":<STATION_LAT>,"lng":<STATION_LNG>,"intent":"heading_to"}'
```
→ `{"ok":true,"pingId":null,"insideGeofence":true}`; `GET /api/telemetry/ghosts` lists it (needs `DEMO_MODE=true`); then send the same ping with `"intent":"charging"` → it disappears.

---

## TASK 10 — Ghost drivers (simulated cars that choose stations by wait time)

Behaviour: up to `GHOST_COUNT` cars exist at any time. Each spawns 3–15 km from a random station, picks the station with the best (drive time + current wait) using the SAME wait-time function as the app, then drives in a straight line pinging every few seconds. Busy stations repel cars, quiet ones attract them, so numbers keep moving. When it arrives: if a charger is free it plugs in (car disappears); otherwise it joins the queue for 6–15 minutes (queue length goes up → wait goes up), then leaves. Everything is labeled "Simulated" on the map.

### 10.1 Create folder `scripts/ghost-drivers/`
`package.json`:
```json
{
  "name": "ghost-drivers",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "tsx index.ts", "start": "tsx index.ts", "typecheck": "tsc --noEmit" },
  "dependencies": { "@evspark/shared": "workspace:*", "dotenv": "^16.4.7" },
  "devDependencies": { "@types/node": "^22.0.0", "tsx": "^4.23.11", "typescript": "^5.7.0" }
}
```
`tsconfig.json`: copy from `scripts/twin-engine/tsconfig.json`. Run `pnpm install` at repo root.

`index.ts`:
```ts
import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import prisma from "../../apps/api/src/lib/prisma";
import { computeWaitTime, haversineKm } from "@evspark/shared";

const API_URL = process.env.API_URL || "http://localhost:4000";
const TWIN_SECRET = process.env.TWIN_SECRET || "";
const GHOST_COUNT = Math.min(60, Number(process.env.GHOST_COUNT || 30));
const PING_MS = Number(process.env.GHOST_PING_MS || 3000);
const SPEED_KMH = Number(process.env.GHOST_SPEED_KMH || 90); // fast on purpose so the demo is lively
const RADIUS_M = Number(process.env.GEOFENCE_RADIUS_M || 3000);

interface StationInfo { id: string; name: string; lat: number; lng: number; chargers: any[]; queue: number; }
interface Ghost {
  ref: string; lat: number; lng: number; dest: StationInfo;
  phase: "driving" | "waiting"; waitUntil?: number; queueId?: string;
}

let stations: StationInfo[] = [];
const ghosts = new Map<string, Ghost>();
let counter = 0;

async function refreshStations() {
  const rows = await prisma.station.findMany({ where: { status: "APPROVED" }, include: { chargers: true } });
  const q = await prisma.queueEntry.groupBy({ by: ["stationId"], where: { status: "waiting" }, _count: { id: true } });
  const qm = new Map(q.map((x) => [x.stationId, x._count.id]));
  stations = rows.filter((r) => r.chargers.length > 0).map((r) => ({
    id: r.id, name: r.name, lat: r.lat, lng: r.lng, chargers: r.chargers, queue: qm.get(r.id) ?? 0,
  }));
}

function incomingCount(stationId: string): number {
  let n = 0;
  for (const g of ghosts.values()) {
    if (g.phase === "driving" && g.dest.id === stationId && haversineKm(g.lat, g.lng, g.dest.lat, g.dest.lng) * 1000 < RADIUS_M) n++;
  }
  return n;
}

function waitFor(st: StationInfo): number {
  return computeWaitTime({ chargers: st.chargers as any, queueLength: st.queue, geofenceVehicleCount: incomingCount(st.id) }).waitMinutes;
}

function randomPointAround(lat: number, lng: number, minKm: number, maxKm: number) {
  const dist = minKm + Math.random() * (maxKm - minKm);
  const brg = Math.random() * 2 * Math.PI;
  const dLat = (dist / 111.32) * Math.cos(brg);
  const dLng = (dist / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(brg);
  return { lat: lat + dLat, lng: lng + dLng };
}

function chooseStation(lat: number, lng: number): StationInfo | null {
  let best: StationInfo | null = null;
  let bestScore = Infinity;
  for (const st of stations) {
    const km = haversineKm(lat, lng, st.lat, st.lng);
    if (km > 25) continue;
    const score = (km / 40) * 60 + Math.min(waitFor(st), 60) + Math.random() * 4; // drive minutes + wait + noise
    if (score < bestScore) { bestScore = score; best = st; }
  }
  return best;
}

async function ping(g: Ghost, intent: "heading_to" | "charging" | "idle") {
  try {
    await fetch(`${API_URL}/api/telemetry/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-twin-key": TWIN_SECRET },
      body: JSON.stringify({ vehicleRef: g.ref, stationId: g.dest.id, lat: g.lat, lng: g.lng, intent }),
    });
  } catch { /* API offline: ignore */ }
}

function spawn() {
  if (stations.length === 0) return;
  const anchor = stations[Math.floor(Math.random() * stations.length)];
  const p = randomPointAround(anchor.lat, anchor.lng, 3, 15);
  const dest = chooseStation(p.lat, p.lng);
  if (!dest) return;
  const g: Ghost = { ref: `GHOST-${++counter}-${Math.random().toString(36).slice(2, 6)}`, lat: p.lat, lng: p.lng, dest, phase: "driving" };
  ghosts.set(g.ref, g);
}

async function arrive(g: Ghost) {
  const fresh = await prisma.charger.findMany({ where: { stationId: g.dest.id }, select: { status: true } });
  const hasFree = fresh.some((c) => c.status === "FREE");
  if (hasFree) {
    await ping(g, "charging"); // plugs in -> leaves geofence + disappears from map
    ghosts.delete(g.ref);
    return;
  }
  // no free charger -> join the virtual queue for a while
  const entry = await prisma.queueEntry.create({
    data: { stationId: g.dest.id, vehicleRef: g.ref, connector: "CCS2", status: "waiting" },
  });
  g.queueId = entry.id;
  g.phase = "waiting";
  g.waitUntil = Date.now() + (6 + Math.random() * 9) * 60000;
  await ping(g, "idle"); // leaves geofence (now counted in queue) and triggers a wait-time refresh
}

async function step(dtSec: number) {
  for (const g of Array.from(ghosts.values())) {
    if (g.phase === "waiting") {
      if (g.waitUntil && Date.now() >= g.waitUntil) {
        if (g.queueId) await prisma.queueEntry.update({ where: { id: g.queueId }, data: { status: "charging" } }).catch(() => {});
        await ping(g, "idle");
        ghosts.delete(g.ref);
      }
      continue;
    }
    const distKm = haversineKm(g.lat, g.lng, g.dest.lat, g.dest.lng);
    const stepKm = (SPEED_KMH / 3600) * dtSec;
    if (distKm <= Math.max(stepKm, 0.03)) {
      g.lat = g.dest.lat; g.lng = g.dest.lng;
      await arrive(g);
    } else {
      const f = stepKm / distKm;
      g.lat += (g.dest.lat - g.lat) * f;
      g.lng += (g.dest.lng - g.lng) * f;
      await ping(g, "heading_to");
    }
  }
}

async function main() {
  console.log("[ghosts] starting; make sure DEMO_MODE=true on the API");
  await refreshStations();
  setInterval(() => refreshStations().catch(() => {}), 10_000);
  // keep the population topped up with staggered spawns
  setInterval(() => { if (ghosts.size < GHOST_COUNT) spawn(); }, 1500);
  setInterval(() => step(PING_MS / 1000).catch((e) => console.error("[ghosts] step", e.message)), PING_MS);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

**VERIFY TASK 10:**
1. `pnpm --filter ghost-drivers typecheck` passes.
2. Run: API (`DEMO_MODE=true`, `GEOFENCE_RADIUS_M=3000`), `pnpm feed`, `pnpm ghosts`.
3. `curl localhost:4000/api/telemetry/ghosts` → a JSON array that changes every few seconds.
4. Pick one station, call `GET /api/stations/<id>` several times over a minute: `incomingVehicles` and `waitMinutes` go up as cars approach and drop when they arrive/leave.

---

## TASK 11 — Frontend: show simulated drivers on the map

### 11.1 Create `apps/web/src/components/map/ghost-layer.tsx`
(Copy the `api` import line from `apps/web/src/app/(main)/station/analytics/page.tsx`; below it is assumed to be `@/lib/api` — fix if different.)
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { api } from "@/lib/api";

interface Ghost { vehicleRef: string; lat: number; lng: number; stationId?: string | null; ts: number }
type LL = { lat: number; lng: number };
interface Track { from: LL; to: LL; t0: number; dur: number }

function currentPos(tr: Track, now: number): LL {
  const k = Math.min(1, (now - tr.t0) / tr.dur);
  return { lat: tr.from.lat + (tr.to.lat - tr.from.lat) * k, lng: tr.from.lng + (tr.to.lng - tr.from.lng) * k };
}

// Cars move smoothly between server pings (one ping ~ every 3 s).
export function GhostLayer() {
  const { data } = useQuery<Ghost[]>({
    queryKey: ["ghost-drivers"],
    queryFn: () => api.get("/api/telemetry/ghosts"),
    refetchInterval: 3000,
    staleTime: 0,
  });
  const tracks = useRef(new Map<string, Track>());
  const [pos, setPos] = useState<Record<string, LL>>({});

  useEffect(() => {
    const now = performance.now();
    const seen = new Set<string>();
    for (const g of (data ?? []).slice(0, 60)) {
      seen.add(g.vehicleRef);
      const prev = tracks.current.get(g.vehicleRef);
      const from = prev ? currentPos(prev, now) : { lat: g.lat, lng: g.lng };
      tracks.current.set(g.vehicleRef, { from, to: { lat: g.lat, lng: g.lng }, t0: now, dur: 3000 });
    }
    for (const k of Array.from(tracks.current.keys())) if (!seen.has(k)) tracks.current.delete(k);
  }, [data]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 50) {
        last = t;
        const next: Record<string, LL> = {};
        tracks.current.forEach((tr, id) => { next[id] = currentPos(tr, t); });
        setPos(next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {Object.entries(pos).map(([id, p]) => (
        <OverlayViewF
          key={id}
          position={p}
          mapPaneName={OverlayView.OVERLAY_LAYER}
          getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
        >
          <div
            title="Simulated driver"
            style={{
              width: 14, height: 14, borderRadius: "50%", background: "#1A73E8",
              border: "2px solid #fff", boxShadow: "0 0 0 3px rgba(26,115,232,.25)", pointerEvents: "none",
            }}
          />
        </OverlayViewF>
      ))}
    </>
  );
}
```

### 11.2 Edit `apps/web/src/components/driver/map-shell.tsx`
1. Add import: `import { GhostLayer } from "@/components/map/ghost-layer";`
2. Inside `<EvMap ...>`, right after the line `<UserLocation me={me} />` add:
```tsx
{process.env.NEXT_PUBLIC_DEMO_MODE === "true" && <GhostLayer />}
```
3. Add a small legend OUTSIDE `<EvMap>` but inside the same wrapper, only when demo mode is on (match nearby Tailwind style):
```tsx
{process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
  <div className="absolute bottom-3 left-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#5F6368] shadow">
    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1A73E8] mr-1.5 align-middle" />
    Simulated drivers (demo)
  </div>
)}
```
4. Add `NEXT_PUBLIC_DEMO_MODE=true` to `apps/web/.env.local` and `.env.example`.

**VERIFY TASK 11:** `pnpm --filter web typecheck` (or build). Open `/driver` with API+feed+ghosts running: blue dots glide toward stations, station marker colors/wait labels change as they approach.


---

## TASK 12 — Production hardening (this is what moves the project from ~4/10 toward 8/10)

### 12.1 Fail fast on missing/default secrets
Create `apps/api/src/lib/env.ts`:
```ts
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  const missing: string[] = [];
  for (const k of ["DATABASE_URL", "REDIS_URL", "TWIN_SECRET", "CLERK_JWKS_URL"]) {
    if (!process.env[k]) missing.push(k);
  }
  const twin = process.env.TWIN_SECRET || "";
  if (twin === "dev-twin-secret" || (twin && twin.length < 16)) missing.push("TWIN_SECRET (too weak / default)");
  if (process.env.DEMO_MODE === "true") console.warn("[env] DEMO_MODE=true in production: simulated data will be shown");
  if (missing.length) {
    throw new Error(`Missing/invalid environment variables: ${missing.join(", ")}`);
  }
}
```
In `apps/api/src/index.ts`: import it and call `assertProductionEnv();` as the first statement after the imports. In `telemetry.controller.ts` (`authenticateTelemetry`) change `process.env.TWIN_SECRET || "dev-twin-secret"` to: `process.env.TWIN_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-twin-secret")` and make sure an EMPTY secret never matches (`if (expectedSecret && twinKey === expectedSecret)`).
Also in `scripts/twin-engine/index.ts` leave the dev fallback (dev only).
Grep the README and docs for a literal default JWT secret and REMOVE it: `grep -rn "JWT_SECRET" README.md docs`.

### 12.2 Data retention (tables grow forever otherwise)
Open `apps/api/src/jobs/retentionCleanup.ts` (it currently does NOT clean `VehiclePing`). Following the same pattern already used in that file, add deletions:
```ts
await prisma.vehiclePing.deleteMany({ where: { ts: { lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } });
await prisma.chargerEvent.deleteMany({ where: { ts: { lt: new Date(Date.now() - 90 * 24 * 3600 * 1000) } } });
```
Keep `Session` and `StationMetricHourly` (they are the analytics history).

### 12.3 Tests for the new core logic
Create `apps/api/src/sim/model.test.ts` (vitest is already configured):
```ts
import { describe, it, expect } from "vitest";
import { mulberry32, chargePowerKw, simulateSession, expectedArrivals, VEHICLES } from "./model";

describe("sim model", () => {
  it("rng is deterministic", () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("power holds until 80% then tapers", () => {
    const v = VEHICLES[0];
    const p50 = chargePowerKw(60, v, true, 50);
    const p95 = chargePowerKw(60, v, true, 95);
    expect(p50).toBeGreaterThan(p95);
    expect(p95).toBeGreaterThan(0);
  });
  it("session energy and duration are consistent", () => {
    const rng = mulberry32(7);
    const s = simulateSession(rng, { powerKw: 50 }, VEHICLES[0]);
    expect(s.socEnd).toBeGreaterThan(s.socStart);
    expect(s.energyKwh).toBeGreaterThan(0);
    expect(s.energyKwh / (s.durationMin / 60)).toBeLessThanOrEqual(50.5); // never above charger power
  });
  it("evening mall demand is higher than 3am", () => {
    expect(expectedArrivals("mall", 4, 19, 2, 1)).toBeGreaterThan(expectedArrivals("mall", 4, 3, 2, 1) * 10);
  });
});
```
Run `pnpm --filter api test` → must pass.

### 12.4 Location consent + privacy (human must review the legal text)
1. Find where the web app calls `navigator.geolocation` (`grep -rn "geolocation" apps/web/src`). Before the first call, show a small consent dialog: "EVspark uses your location to show nearby chargers and estimate wait times. Location is only used while the app is open." with Allow / Not now. Store the answer in `localStorage` key `evspark-location-consent`. If "Not now", never call geolocation (map falls back to the city center).
2. Create `apps/web/src/app/privacy/page.tsx` as a simple static page with these headings: What we collect (account info, vehicle, location while using the app, bookings), Why (find chargers, wait-time prediction), Retention (location pings 7 days), Sharing (map provider, auth provider, hosting), Your rights (access/deletion by email), Contact. Put at the top: `DRAFT - must be reviewed by a lawyer before launch (India DPDP Act 2023 applies to location data)`. Do NOT invent legal claims.
3. Link `/privacy` in the footer / landing page.

### 12.5 Things the agent must REPORT, not change
Do not delete or rewrite these. Run the commands and paste the output back to the human:
1. Legacy/duplicate folders: `grep -rn "web-legacy\|apps/ml\b" --include=*.json --include=*.yml --include=*.yaml --include=*.md . | grep -v node_modules` and look at `docker-compose.yml` (`ml:` build context). Report which of `apps/ml` and `apps/ml-service` is actually used, and whether `apps/web-legacy` is referenced anywhere.
2. Auth consistency: README says Neon Auth, `.env.example` and the web app use Clerk, API depends on `@neondatabase/auth` and `jose`. Open `apps/api/src/middleware/auth.ts` and report which verification method is really used. Only after the human confirms, update README.
3. Stray root markdown files (`starting (1).md`, `commands.md`, `frontend.md`, `codemap.md`): list them with their first 5 lines. The human decides what to delete.

### 12.6 Real-data integration doc (so adding real chargers is plug-and-play)
Create `docs/REAL_DATA_INTEGRATION.md` containing exactly these sections (write short, factual text from this script):
1. **Option A — MQTT gateway:** publish to `evtwin/stations/{stationId}/chargers/{chargerId}/telemetry` using the JSON contract from Task 5 (set `"source":"real"`). Include one example message.
2. **Option B — OCPP 1.6J:** charge points connect to `ws://<api>/ocpp/1.6/{chargePointId}` (already implemented in `apps/api/src/lib/ocpp.ts`); `chargePointId` must equal `Charger.ocppId`.
3. **How a new operator onboards:** create account → add station (`POST /api/operator/stations`) → chargers get ids → configure gateway/OCPP with those ids → data appears in the operator console automatically.
4. **What to turn off for real data:** `DEMO_MODE=false`, stop `station-feed` and `ghost-drivers`, `GEOFENCE_RADIUS_M=300`.
5. **Honesty rule:** anything not `source="real"` must be shown as "Simulated" in the UI.

---

## FINAL — Run order and demo checklist

```bash
# 1. infrastructure
docker compose up -d postgres redis mosquitto

# 2. database
pnpm db:migrate
pnpm db:seed
pnpm --filter api seed:history          # 30 days of history + demo operator network + warm start

# 3. apps
pnpm dev:api        # needs ENABLE_MQTT=true, DEMO_MODE=true, GEOFENCE_RADIUS_M=3000, TWIN_SECRET set
pnpm dev:web        # needs NEXT_PUBLIC_DEMO_MODE=true

# 4. live simulation (DO NOT also run twin-engine)
pnpm feed           # stations: cars arrive, charge, fault, via MQTT
pnpm ghosts         # simulated drivers on the map
```

### Acceptance checklist (the agent must confirm every line)
- [ ] `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `pnpm --filter api test` all pass.
- [ ] No `Math.random` and no hardcoded `98.4` in `operator.controller.ts`; analytics numbers are identical after refresh.
- [ ] `operator@evspark.in` sees 5 stations with 30 days of history; a brand-new operator sees empty state with zeros.
- [ ] The map is already busy right after launch; charger colors change without page refresh.
- [ ] `mosquitto_sub -t "evtwin/#" -v` shows telemetry JSON; invalid messages are rejected in API logs (`[MQTT] message rejected`).
- [ ] Blue "Simulated drivers" dots move smoothly toward stations; a station's `waitMinutes` rises as cars approach.
- [ ] All simulated sessions have `source = "twin"`.
- [ ] Production start without `TWIN_SECRET` fails with a clear error.

### If the agent gets stuck
Stop, do not guess. Report: the task number, the exact error text, and the file + line. The human will paste it back to the planner.
