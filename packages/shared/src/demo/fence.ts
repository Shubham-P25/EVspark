import type { LatLng } from './types';
import {
  distToSegment,
  fromLocal,
  pointInPolygon,
  polygonArea,
  toLocal,
  type XY,
} from './geo-local';

export type RoadClass =
  | 'motorway'
  | 'trunk'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'residential'
  | 'service'
  | 'other';

export const ROAD_BUFFER_M: Record<RoadClass, number> = {
  motorway: 14,
  trunk: 12,
  primary: 9,
  secondary: 8,
  tertiary: 7,
  residential: 5,
  service: 3,
  other: 4,
};

export interface Road {
  cls: RoadClass;
  pts: LatLng[];
}

export interface Fence {
  centre: LatLng;
  ring: LatLng[];
  radii: number[];
  minRadius: number;
  areaM2: number;
  clearanceM: number;
  startRadius: number;
  status: 'ok' | 'unreliable';
  reason?: string;
}

export interface FenceOptions {
  startRadius?: number;
  vertices?: number;
  minRadius?: number;
  minAreaM2?: number;
  chargerCount?: number;
  parkingGapM?: number;
}

interface LocalRoad {
  buffer: number;
  pts: XY[];
}

function clearanceAt(p: XY, roads: LocalRoad[]): number {
  let best = Infinity;
  for (const road of roads) {
    for (let i = 1; i < road.pts.length; i++) {
      best = Math.min(best, distToSegment(p, road.pts[i - 1], road.pts[i]) - road.buffer);
    }
  }
  return best;
}

function ringPoints(radii: number[]): XY[] {
  return radii.map((r, i) => {
    const a = (i / radii.length) * Math.PI * 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

// smallest clearance found along the polygon boundary, sampled every metre
function boundaryClearance(radii: number[], roads: LocalRoad[]): number {
  const ring = ringPoints(radii);
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      best = Math.min(best, clearanceAt({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, roads));
    }
  }
  return best;
}

export function buildFence(centre: LatLng, roads: Road[], opts: FenceOptions = {}): Fence {
  const startRadius = opts.startRadius ?? 100;
  const n = opts.vertices ?? 32;
  const minRadius = opts.minRadius ?? 18;
  const minAreaM2 = opts.minAreaM2 ?? 1200;
  const chargerCount = opts.chargerCount ?? 4;
  const gap = opts.parkingGapM ?? 5;

  const local: LocalRoad[] = roads.map((r) => ({
    buffer: ROAD_BUFFER_M[r.cls],
    pts: r.pts.map((p) => toLocal(centre, p)),
  }));

  const radii = new Array<number>(n).fill(startRadius);
  let reason: string | undefined;

  if (clearanceAt({ x: 0, y: 0 }, local) < 0) {
    reason = 'Station centre sits inside a road buffer';
  }

  // 1. per-vertex ray march from the centre outwards
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 0;
    while (r < startRadius && clearanceAt({ x: Math.cos(a) * (r + 1), y: Math.sin(a) * (r + 1) }, local) >= 0) {
      r += 1;
    }
    radii[i] = r;
  }

  // 2. edges can clip a road corner between two vertices: keep pulling in until clear
  for (let guard = 0; guard < 80 && boundaryClearance(radii, local) < 0; guard++) {
    for (let i = 0; i < n; i++) radii[i] = Math.max(0, radii[i] - 1);
  }

  const smallest = Math.min(...radii);
  const ring = ringPoints(radii);
  const area = polygonArea(ring);
  const chargerRingNeeded = chargerCount < 2 ? 2 : gap / (2 * Math.sin(Math.PI / chargerCount));

  if (!reason && smallest < minRadius) reason = `Fence shrank to ${smallest.toFixed(0)} m, below the ${minRadius} m minimum`;
  if (!reason && area < minAreaM2) reason = `Fence area ${area.toFixed(0)} m2 is below ${minAreaM2} m2`;
  if (!reason && chargerRingNeeded > smallest * 0.5) reason = 'Chargers do not fit inside the shrunk fence';

  return {
    centre,
    ring: ring.map((p) => fromLocal(centre, p.x, p.y)),
    radii,
    minRadius: smallest,
    areaM2: area,
    clearanceM: Number.isFinite(boundaryClearance(radii, local)) ? boundaryClearance(radii, local) : 99,
    startRadius,
    status: reason ? 'unreliable' : 'ok',
    reason,
  };
}

export function insideFence(fence: Fence, p: LatLng): boolean {
  return pointInPolygon(
    toLocal(fence.centre, p),
    fence.ring.map((q) => toLocal(fence.centre, q))
  );
}

// re-check after an edit or reseed; this is the invariant for case G6
export function fenceClearsRoads(fence: Fence, roads: Road[]): boolean {
  const local = roads.map((r) => ({ buffer: ROAD_BUFFER_M[r.cls], pts: r.pts.map((p) => toLocal(fence.centre, p)) }));
  return boundaryClearance(fence.radii, local) >= 0;
}

// a car belongs to exactly one station when fences overlap (case G5)
export function assignStation(p: LatLng, fences: Array<{ id: string; fence: Fence }>): string | null {
  const hits = fences.filter((f) => insideFence(f.fence, p));
  if (hits.length === 0) return null;
  const dist = (f: { fence: Fence }) => Math.hypot(toLocal(f.fence.centre, p).x, toLocal(f.fence.centre, p).y);
  return hits.sort((a, b) => dist(a) - dist(b))[0].id;
}

// how many parked cars fit inside the fence at the given spacing
export function forecourtCapacity(fence: Fence, parkingGapM = 5): number {
  const slotRing = fence.minRadius * 0.7;
  return Math.max(0, Math.floor((2 * Math.PI * slotRing) / parkingGapM) - 1);
}
