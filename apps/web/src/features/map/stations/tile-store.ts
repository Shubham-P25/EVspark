import Supercluster from 'supercluster';
import { get as idbGet, set as idbSet } from 'idb-keyval';

const Z = 11;
const getApiUrl = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:4000';
};

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
  const minX = Math.min(tx(b.w), tx(b.e));
  const maxX = Math.max(tx(b.w), tx(b.e));
  const minY = Math.min(ty(b.n), ty(b.s));
  const maxY = Math.max(ty(b.n), ty(b.s));

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      out.push({ x, y, key: `${Z}/${x}/${y}` });
    }
  }
  return out.slice(0, 12); // cap tile requests to protect network
};

async function safeFetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Suppress network error / cold start rejection
    return null;
  }
}

async function swr<T>(key: string, url: string, memMap: Map<string, T>, persist: boolean): Promise<T | null> {
  const cached = memMap.get(key) ?? (persist && typeof window !== 'undefined' ? await idbGet<T>(`tile:${key}`) : undefined);
  if (cached) memMap.set(key, cached);

  const refresh = (async () => {
    const p = inflight.get(url) ?? safeFetchJson<T>(url);
    inflight.set(url, p);
    try {
      const fresh = ((await p) as T | null);
      if (fresh) {
        memMap.set(key, fresh);
        if (persist && typeof window !== 'undefined') void idbSet(`tile:${key}`, fresh);
        return fresh;
      }
      return cached ?? null;
    } finally {
      inflight.delete(url);
    }
  })();

  return cached ?? refresh;
}

export const loadStatic = (key: string) => swr<StaticTile>(key, `${getApiUrl()}/api/stations/tiles/${key}`, mem, true);
export const loadLive = (key: string) => swr<LiveTile>(key, `${getApiUrl()}/api/stations/tiles/${key}/live`, memLive, false);

export function buildIndex(points: StationPoint[]) {
  const idx = new Supercluster<StationPoint, { total: number }>({
    radius: 60,
    maxZoom: 16,
    map: (p) => ({ total: p.total }),
    reduce: (a, b) => { a.total += b.total; },
  });
  idx.load(points.map((p) => ({ type: 'Feature' as const, properties: p, geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] } })));
  return idx;
}

export async function loadViewport(b: { w: number; s: number; e: number; n: number }): Promise<StationPoint[]> {
  const tiles = tilesFor(b);
  const parts = await Promise.all(tiles.map(async (t) => {
    const [s, l] = await Promise.all([
      loadStatic(t.key),
      loadLive(t.key).catch(() => null),
    ]);

    if (!s || !s.ids || s.ids.length === 0) return [];

    return s.ids.map<StationPoint>((id, i) => {
      const total = s.tot[i] || 3;
      // If live tile is initializing, default to healthy available count so chargers NEVER start 100% solid red
      const defaultFree = total > 0 ? Math.max(1, Math.min(total, total - 1)) : 0;
      const free = l?.free && l.free[i] !== undefined ? l.free[i] : defaultFree;
      const status = l?.st && l.st[i] !== undefined ? l.st[i] : (free > 0 ? 1 : 0);
      const waitMin = l?.wait && l.wait[i] !== undefined ? l.wait[i] : 0;

      return {
        id,
        lat: s.lat[i] / 1e5,
        lng: s.lng[i] / 1e5,
        total,
        status,
        free,
        waitMin,
      };
    });
  }));
  return parts.flat();
}

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
