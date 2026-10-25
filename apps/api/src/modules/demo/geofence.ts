import * as turf from '@turf/turf';
import { redis } from '../../lib/redis';

export const ROAD_HALF_WIDTH_M = 5;
export const MARGIN_M = 2;
export const MIN_R = 8;
export const MAX_R = 45;
export const MIN_CLEARANCE = 15; // below this, the fence centre is shifted away from the road

export type LngLat = [number, number];
export type Geofence = {
  center: { lat: number; lng: number };
  radiusM: number;
  gate: { lat: number; lng: number };
  clearanceM: number;
  centerShifted: boolean;
};

type Road = ReturnType<typeof turf.lineString>;

async function fetchRoads(lat: number, lng: number, around = 300): Promise<Road[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const overpassUrl = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
    const q = `[out:json][timeout:5];way(around:${around},${lat},${lng})["highway"]
      ["highway"!~"footway|path|steps|cycleway|pedestrian|track|corridor|construction|proposed"]
      ["service"!~"parking_aisle|driveway|drive-through"];out geom;`;
    const res = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(q)}`,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (res.ok) {
      const j = (await res.json()) as { elements: { geometry?: { lat: number; lon: number }[] }[] };
      const roads = j.elements
        .filter((w) => (w.geometry?.length ?? 0) >= 2)
        .map((w) => turf.lineString(w.geometry!.map((g) => [g.lon, g.lat] as LngLat)));
      if (roads.length > 0) return roads;
    }
  } catch {
    // Overpass offline or timed out; fall back to OSRM road snapping below
  }

  // Fallback: Query OSRM nearest to locate real road point and synthesize road line through gate
  try {
    const osrmUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
    const r = await fetch(`${osrmUrl}/nearest/v1/driving/${lng},${lat}?number=1`);
    if (r.ok) {
      const j = (await r.json()) as { waypoints?: { location: [number, number]; distance: number }[] };
      const wp = j.waypoints?.[0];
      if (wp?.location) {
        const snapLng = wp.location[0];
        const snapLat = wp.location[1];
        const bearingToSnap = turf.bearing(turf.point([lng, lat]), turf.point([snapLng, snapLat]));
        const roadBearing1 = (bearingToSnap + 90) % 360;
        const roadBearing2 = (bearingToSnap - 90 + 360) % 360;
        const pt1 = turf.destination(turf.point([snapLng, snapLat]), 200, roadBearing1, { units: 'meters' });
        const pt2 = turf.destination(turf.point([snapLng, snapLat]), 200, roadBearing2, { units: 'meters' });
        return [turf.lineString([pt1.geometry.coordinates as LngLat, [snapLng, snapLat], pt2.geometry.coordinates as LngLat])];
      }
    }
  } catch {
    // Both failed
  }
  return [];
}

function nearest(roads: Road[], lat: number, lng: number) {
  const pt = turf.point([lng, lat]);
  let best: { d: number; snap: LngLat } | null = null;
  for (const r of roads) {
    const s = turf.nearestPointOnLine(r, pt, { units: 'meters' });
    const d = (s.properties.dist ?? Infinity) as number;
    if (!best || d < best.d) best = { d, snap: s.geometry.coordinates as LngLat };
  }
  return best;
}

export async function computeGeofence(stationId: string, lat: number, lng: number): Promise<Geofence | null> {
  const key = `demo:fence:v1:${stationId}`;
  const hit = await redis.get(key);
  if (hit) return (typeof hit === 'string' ? JSON.parse(hit) : hit) as Geofence;

  const roads = await fetchRoads(lat, lng);
  let cLat = lat, cLng = lng, shifted = false;
  let near = nearest(roads, cLat, cLng);
  if (!near) return null; // no road within 300 m => station not eligible for the demo

  for (let i = 0; i < 5 && near.d < MIN_CLEARANCE; i++) {
    // move the fence centre directly away from the nearest road point
    const away = turf.bearing(turf.point(near.snap), turf.point([cLng, cLat]));
    const need = MIN_CLEARANCE - near.d + 1;
    const moved = turf.destination(turf.point([cLng, cLat]), need, near.d < 0.5 ? 0 : away, { units: 'meters' });
    [cLng, cLat] = moved.geometry.coordinates as LngLat;
    shifted = true;
    near = nearest(roads, cLat, cLng)!;
  }
  const radiusM = Math.max(MIN_R, Math.min(MAX_R, near.d - ROAD_HALF_WIDTH_M - MARGIN_M));
  const fence: Geofence = {
    center: { lat: cLat, lng: cLng }, radiusM: Math.round(radiusM * 10) / 10,
    gate: { lat: near.snap[1], lng: near.snap[0] }, clearanceM: Math.round(near.d * 10) / 10, centerShifted: shifted,
  };
  // hard guarantee: fence never reaches the road
  if (fence.radiusM > near.d - 1) return null;
  await redis.set(key, JSON.stringify(fence)); // permanent: roads rarely change
  return fence;
}
