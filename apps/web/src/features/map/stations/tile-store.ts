import Supercluster from 'supercluster';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const Z = 11;
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export type StaticTile = { v: 1; n: number; ids: string[]; lat: number[]; lng: number[]; tot: number[] };
export type LiveTile = { v: 1; t: number; st: number[]; free: number[]; wait: number[] };
export type StationPoint = { id: string; lat: number; lng: number; total: number; status: number; free: number; waitMin: number };

const mem = new Map<string, StaticTile>();
const memLive = new Map<string, LiveTile>();
const inflight = new Map<string, Promise<unknown>>();

export const tilesFor = (b: { w: number; s: number; e: number; n: number }) => {
  const n = 2 ** Z;
  const tx = (lng: number) => Math.floor(((lng + 180) / 360) * n);
  const ty = (lat: number) => {
    const r = (lat * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  };
  const out: { x: number; y: number; key: string }[] = [];
  for (let x = tx(b.w); x <= tx(b.e); x++) {
    for (let y = ty(b.n); y <= ty(b.s); y++) {
      out.push({ x, y, key: `${Z}/${x}/${y}` });
    }
  }
  return out.slice(0, 12); // hard cap protects the API on very low zoom
};

async function swr<T>(key: string, url: string, memMap: Map<string, T>, persist: boolean): Promise<T> {
  const cached = memMap.get(key) ?? (persist && typeof window !== 'undefined' ? await idbGet<T>(`tile:${key}`) : undefined);
  if (cached) memMap.set(key, cached);
  const refresh = (async () => {
    const p = inflight.get(url) ?? fetch(url, { headers: { Accept: 'application/json' } }).then((r) => r.json() as Promise<T>);
    inflight.set(url, p);
    try {
      const fresh = (await p) as T;
      memMap.set(key, fresh);
      if (persist && typeof window !== 'undefined') void idbSet(`tile:${key}`, fresh);
      return fresh;
    } finally { inflight.delete(url); }
  })();
  return cached ?? refresh; // instant if cached, otherwise wait for network; refresh continues in background
}

export const loadStatic = (key: string) => swr<StaticTile>(key, `${API}/api/stations/tiles/${key}`, mem, true);
export const loadLive = (key: string) => swr<LiveTile>(key, `${API}/api/stations/tiles/${key}/live`, memLive, false);

export function buildIndex(points: StationPoint[]) {
  const idx = new Supercluster<StationPoint, { total: number }>({
    radius: 60, maxZoom: 16,
    map: (p) => ({ total: p.total }),
    reduce: (a, b) => { a.total += b.total; },
  });
  idx.load(points.map((p) => ({ type: 'Feature' as const, properties: p, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })));
  return idx;
}

export async function loadViewport(b: { w: number; s: number; e: number; n: number }): Promise<StationPoint[]> {
  const tiles = tilesFor(b);
  const parts = await Promise.all(tiles.map(async (t) => {
    const [s, l] = await Promise.all([loadStatic(t.key), loadLive(t.key).catch(() => null)]);
    return s.ids.map<StationPoint>((id, i) => ({
      id, lat: s.lat[i] / 1e5, lng: s.lng[i] / 1e5, total: s.tot[i],
      status: l?.st[i] ?? 3, free: l?.free[i] ?? 0, waitMin: l?.wait[i] ?? 0,
    }));
  }));
  return parts.flat();
}

/**
 * Patches status/free/waitMin from socket live:delta in place.
 * Returns array of changed station IDs for targeted re-renders.
 */
export function applyLiveDelta(points: StationPoint[], delta: Record<string, string>): string[] {
  const changed: string[] = [];
  const pointMap = new Map(points.map((p) => [p.id, p]));

  for (const [stationId, packed] of Object.entries(delta)) {
    const p = pointMap.get(stationId);
    if (!p) continue;
    const [s, f, tot, w] = packed.split('|').map(Number);
    let modified = false;
    if (s !== undefined && !Number.isNaN(s) && p.status !== s) { p.status = s; modified = true; }
    if (f !== undefined && !Number.isNaN(f) && p.free !== f) { p.free = f; modified = true; }
    if (tot !== undefined && !Number.isNaN(tot) && p.total !== tot) { p.total = tot; modified = true; }
    if (w !== undefined && !Number.isNaN(w) && p.waitMin !== w) { p.waitMin = w; modified = true; }
    if (modified) changed.push(stationId);
  }

  return changed;
}
