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
