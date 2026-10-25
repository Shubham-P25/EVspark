import pLimit from 'p-limit';
import * as turf from '@turf/turf';
import { redis } from '../../lib/redis';
import type { Geofence } from './geofence';

const limit = pLimit(2); // be polite to the public OSRM server
const OSRM = () => process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
export type LatLng = [number, number]; // [lat, lng]

async function snap(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`${OSRM()}/nearest/v1/driving/${lng},${lat}?number=1`);
    if (!r.ok) return null;
    const j = (await r.json()) as { waypoints?: { location: [number, number] }[] };
    const w = j.waypoints?.[0]?.location;
    return w ? { lat: w[1], lng: w[0] } : null;
  } catch {
    return null;
  }
}

async function route(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<LatLng[] | null> {
  try {
    const r = await fetch(`${OSRM()}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
    if (!r.ok) return null;
    const j = (await r.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] };
    const c = j.routes?.[0]?.geometry.coordinates;
    return c && c.length >= 2 ? c.map(([lng, lat]) => [lat, lng] as LatLng) : null;
  } catch {
    return null;
  }
}

/** 10 approach routes (250-600 m long) ending exactly at the gate. Cached forever. */
export async function getRoutePool(stationId: string, fence: Geofence, count = 10): Promise<LatLng[][]> {
  const key = `demo:routes:v1:${stationId}`;
  const hit = await redis.get(key);
  if (hit) return (typeof hit === 'string' ? JSON.parse(hit) : hit) as LatLng[][];
  const out: LatLng[][] = [];
  const tasks = Array.from({ length: count * 2 }, (_, i) => limit(async () => {
    if (out.length >= count) return;
    const bearing = (i * 360) / (count * 2) + (i % 3) * 7;
    const dist = 250 + ((i * 53) % 350);
    const p = turf.destination(turf.point([fence.gate.lng, fence.gate.lat]), dist, bearing, { units: 'meters' }).geometry.coordinates;
    const s = await snap(p[1], p[0]);
    if (!s) return;
    const pts = await route(s, fence.gate);
    if (pts && out.length < count) out.push([...pts.slice(0, -1), [fence.gate.lat, fence.gate.lng]]); // end exactly at gate
  }));
  await Promise.all(tasks);
  if (out.length < 3) {
    // Generate smooth approach paths ending exactly at the gate
    for (let i = 0; i < 4; i++) {
      const b = (i * 90) + 15;
      const pts: LatLng[] = [];
      for (let d = 300; d >= 0; d -= 30) {
        const p = turf.destination(turf.point([fence.gate.lng, fence.gate.lat]), d, b, { units: 'meters' }).geometry.coordinates;
        pts.push([p[1], p[0]]);
      }
      out.push(pts);
    }
  }
  if (out.length >= 3) await redis.set(key, JSON.stringify(out));
  return out;
}
