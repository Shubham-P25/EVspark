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
