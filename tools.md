# tools.md — EVspark Map Upgrade (Fast Stations + Geofence Demo)

> **Audience:** Antigravity coding agent (Gemini Flash). **Read this whole header before touching any file.**

## 0. HOW YOU MUST WORK (non-negotiable)

1. Work in **phases**. Each phase has **tasks**. Do **ONE task at a time**: edit only the files named in that task, run its **CHECK**, report `TASK X.Y DONE` plus the check output, then continue. Never batch tasks. Never "improve" files not named.
2. **Never guess** names of tables, columns, hooks, env vars or folders. Phase 0 discovers them. Where this file says `VERIFY`, open the real file and adapt the snippet to the real names. Keep the snippet's logic identical.
3. TypeScript **strict**. No `any` (use `unknown` + narrowing). No `console.log` left behind (use the existing logger, Pino, on the API). No new UI library: use existing shadcn components, Tailwind, Phosphor icons. **Light theme only** (no dark classes, no black map).
4. If a CHECK fails, fix it in the same task. If you cannot fix it in 2 attempts, stop and write the blocker into `docs/map-blockers.md`, then continue with the next independent task.
5. If a snippet is longer than you can finish, write the **types and function signatures first**, then fill bodies one function at a time. A half-finished but compiling file is better than a complete broken one.
6. Commit message per task: `feat(map): <task id> <summary>`.

### Definition of "S+ grade" for this work (you are judged on all of these)

| Area | Bar |
|---|---|
| Speed | Warm station-tile API p95 **< 30 ms** (server time), cold **< 120 ms**. First markers painted from local cache **< 100 ms** after map ready. Pan/zoom never recreates markers that are already on screen. Payload per tile **< 40 KB gzip**. |
| Correctness | Demo engine is deterministic (seeded), headless, and unit-tested. Invariants: no two cars closer than 3.0 m, charging queue never exceeds online chargers, geofence never touches a road. |
| UX | Light, Google-Maps-like. Demo runs at 60 fps with 100 cars. Controls keyboard-operable, `aria-live` event log, `prefers-reduced-motion` respected. |
| Safety | Zod on every new route, rate limit on new routes, no secrets in client, external APIs cached and throttled. |
| Honesty | Everything in demo mode is labelled **"Simulated demo"** on screen. |

---

## 1. WHAT WE ARE BUILDING (full brief, everything we discussed)

### 1A. Fast station rendering on the map
Stations loaded for the map must appear **in milliseconds**. Strategy (all mandatory):
1. **PostGIS spatial index** on Neon: query only stations inside the visible tile, never "all stations".
2. **Redis (Upstash) cache**: static station geometry per map tile cached for hours, versioned key (cache bust by bumping a version number).
3. **Split static vs live data**: positions/ids (rarely change, cached long) vs availability/wait (changes every few seconds, cached 3 s + pushed by socket).
4. **Compact columnar JSON** with integer coordinates (lat/lng × 1e5) so a tile is a few KB.
5. **HTTP caching**: `ETag`, `Cache-Control` with `s-maxage` + `stale-while-revalidate` so Cloudflare (planned) serves tiles from the edge.
6. **Client cache**: in-memory Map → IndexedDB → network (stale-while-revalidate). First paint comes from IndexedDB.
7. **Client clustering** with `supercluster`; render only visible clusters/points; **diff markers by id** (add/remove only what changed).
8. **Socket.io rooms per tile** with batched deltas once per second (no global `io.emit`).

### 1B. "Demo" button on the map → renders our geofence logic (simulation)
Pressing **Demo** switches the map into a clearly labelled simulation mode. Exact rules (these are the user's requirements; the numbers are for traceability in section 9):

1. A station's **geofence never touches a road**. The fence is a circle around the station; if the nearest road is too close the fence **shrinks** (and if the station is on the road frontage, the fence centre is nudged away from the road) so it stays clear of the road by a safety margin.
2. Each station has **two queues**: **Charging queue** and **Waiting queue**.
3. Cars **always follow real roads** (routes from a routing service) and arrive at the station gate.
4. **Some cars never charge**; they are only visiting (shopping etc.). So there are **two car kinds**: `CHARGER` (comes to charge) and `STAYER` (only stays).
5. **Cars never overlap** each other (roads, gate, inside the fence, parking, bays).
6. Demo **renders the stations**, and stations are **initially empty**.
7. When a car enters the fence: if a charger is free, the car is put in the **Charging queue**. The Charging queue holds **at most as many cars as the station has (online) chargers** (3 chargers ⇒ 3 cars).
8. If all chargers are taken, a car that enters the fence goes to the **Waiting queue**.
9. The system **cannot read driver intent** (it only sees "a car is inside the fence"). When a charger becomes free and the head of the Waiting queue is **offered** the charger, but the car **does not plug in within a grace time**, it is classified **"Other jobs"** and **discarded from the queue**; the next car in line is offered the charger.
10. The system exposes **waiting time and number of waiting cars** per station.
11. A car **tired of waiting leaves** the fence and is **removed from the Waiting queue** (reneging).
12. **Cover all scenarios** (list in section 7): fault, rush hour, queue full, stayers-only, etc.

### 1C. Assumptions I made (keep them; mention them in the UI "How it works" popover)
- **Fence geometry:** circle. Radius = `clamp(distanceToNearestRoad − roadHalfWidth(5 m) − margin(2 m), 8 m, 45 m)`. If the station is closer than 15 m to a road, the fence centre is shifted away from the road until clearance holds (checked against ALL nearby roads, up to 5 iterations). The **gate** = the nearest point on the nearest road. Cars drive a short straight driveway from the gate to the fence edge.
- **Intent detection (rule 9):** "plugged in" is the observable event (like an OCPP `StartTransaction`). No plug-in within `offerGraceS + travel time` ⇒ `OTHER_JOBS`.
- **Time compression:** 1 simulated second = 20 demo seconds (shown as minutes in UI). Configurable constant.
- **Routing:** OSRM public demo server for the demo only (throttled, cached forever in Redis). Provide env var `OSRM_BASE_URL` so we can later self-host.
- **Traffic side:** left-hand traffic (India).

---

## 2. PHASE 0 — DISCOVERY (no code changes except one doc)

### TASK 0.1 — Map the repo
Create `docs/map-discovery.md` by inspecting the repo. Answer **each** item with the exact file path / name:
1. Which map library does the **driver map page** use? (`@react-google-maps/api` or `react-leaflet` or both). Path of the page and the map component.
2. How are stations currently fetched and rendered on that map (hook name, endpoint, marker component)?
3. Prisma model names/fields for Station, Charger (count of chargers per station, status enum, approved flag), and where lat/lng live. Is PostGIS enabled? (look in migrations / `schema.prisma`).
4. Redis client module path (Upstash) and whether it exists. If not: say "missing".
5. Socket.io server file and how clients join rooms.
6. Package manager (lockfile name) and the test runner (Vitest present?).
7. Existing env var names (`.env.example`).
8. Where the driver page toolbar/buttons live (where a **Demo** button can sit, top-right of the map, no top navbar).

**CHECK:** the file exists and has all 8 answers, none "unknown". Stop and report. Do not write other code.

---

## 3. PHASE 1 — FAST STATIONS (backend)

### TASK 1.1 — PostGIS column + spatial index
Create a new Prisma migration folder (use `prisma migrate dev --create-only --name station_geom`) and put this SQL in it. `VERIFY` table and column names against `schema.prisma` (examples assume `"Station"` with `latitude`, `longitude`).

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

UPDATE "Station"
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geom IS NULL;

CREATE INDEX IF NOT EXISTS station_geom_gix ON "Station" USING GIST (geom);

-- keep geom in sync automatically
CREATE OR REPLACE FUNCTION station_set_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS station_geom_trg ON "Station";
CREATE TRIGGER station_geom_trg BEFORE INSERT OR UPDATE OF latitude, longitude ON "Station"
FOR EACH ROW EXECUTE FUNCTION station_set_geom();
```
In `schema.prisma` add `geom Unsupported("geography(Point,4326)")?` to the Station model **only if** Prisma does not already complain about it; otherwise leave the column out of the schema (we only use raw SQL for it).

**CHECK:** `prisma migrate dev` applies; `SELECT count(*) FROM "Station" WHERE geom IS NOT NULL;` equals the station count.

### TASK 1.2 — Tile + live endpoints
Create `apps/api/src/modules/map/tiles.routes.ts`. Use the existing Redis and Prisma modules (`VERIFY` import paths from `docs/map-discovery.md`). Note: Upstash's REST client **auto-parses JSON**, so the code below handles both string and object.

```ts
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';

export const TILE_Z = 11; // ~19 km tiles at India latitudes; fixed on purpose (cache-friendly)
export const mapRouter = Router();

const Params = z.object({
  z: z.coerce.number().int().min(11).max(11),
  x: z.coerce.number().int().min(0).max(2 ** 11 - 1),
  y: z.coerce.number().int().min(0).max(2 ** 11 - 1),
});

type StaticTile = { v: 1; n: number; ids: string[]; lat: number[]; lng: number[]; tot: number[] };

const tileBBox = (z: number, x: number, y: number) => {
  const n = 2 ** z;
  const lon = (xx: number) => (xx / n) * 360 - 180;
  const lat = (yy: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * yy) / n))) * 180) / Math.PI;
  return { w: lon(x), e: lon(x + 1), n: lat(y), s: lat(y + 1) };
};

export const tileOf = (lat: number, lng: number, z = TILE_Z) => {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x, y };
};

async function buildStaticTile(z: number, x: number, y: number): Promise<StaticTile> {
  const b = tileBBox(z, x, y);
  // VERIFY names: Station.status/approved flag, Charger table + FK
  const rows = await prisma.$queryRaw<{ id: string; lat: number; lng: number; tot: number }[]>`
    SELECT s.id,
           ST_Y(s.geom::geometry) AS lat,
           ST_X(s.geom::geometry) AS lng,
           (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId" = s.id)::int AS tot
    FROM "Station" s
    WHERE s.geom && ST_MakeEnvelope(${b.w}, ${b.s}, ${b.e}, ${b.n}, 4326)::geography
      AND s.status = 'APPROVED'
    ORDER BY s.id`;
  return {
    v: 1,
    n: rows.length,
    ids: rows.map((r) => r.id),
    lat: rows.map((r) => Math.round(r.lat * 1e5)),
    lng: rows.map((r) => Math.round(r.lng * 1e5)),
    tot: rows.map((r) => r.tot),
  };
}

const asString = (v: unknown): string | null =>
  v == null ? null : typeof v === 'string' ? v : JSON.stringify(v);

export async function getStaticTileJson(z: number, x: number, y: number): Promise<{ json: string; ver: string }> {
  const ver = String((await redis.get('st:ver')) ?? '0');
  const key = `st:tile:${ver}:${z}:${x}:${y}`;
  let json = asString(await redis.get(key));
  if (!json) {
    json = JSON.stringify(await buildStaticTile(z, x, y));
    await redis.set(key, json, { ex: 6 * 3600 });
  }
  return { json, ver };
}

/** Call this whenever a station is created / approved / moved / deleted. */
export const bumpStationVersion = () => redis.incr('st:ver');

mapRouter.get('/stations/tiles/:z/:x/:y', async (req: Request, res: Response) => {
  const p = Params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'bad_tile' });
  const { z, x, y } = p.data;
  const { json, ver } = await getStaticTileJson(z, x, y);
  const etag = `W/"${ver}-${createHash('sha1').update(json).digest('base64url').slice(0, 12)}"`;
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res
    .set({
      ETag: etag,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=21600, stale-while-revalidate=86400',
    })
    .send(json);
});

// ---- live layer: aligned by index with the static tile's ids ----
const micro = new Map<string, { at: number; body: string }>(); // 2 s in-process shield for Redis
mapRouter.get('/stations/tiles/:z/:x/:y/live', async (req: Request, res: Response) => {
  const p = Params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'bad_tile' });
  const { z, x, y } = p.data;
  const mk = `${z}/${x}/${y}`;
  const hit = micro.get(mk);
  const now = Date.now();
  let body = hit && now - hit.at < 2000 ? hit.body : null;
  if (!body) {
    const { json } = await getStaticTileJson(z, x, y);
    const ids = (JSON.parse(json) as StaticTile).ids;
    const raw = ids.length ? ((await redis.hmget('live:stations', ...ids)) as Record<string, unknown> | null) : null;
    const st: number[] = [], free: number[] = [], wait: number[] = [];
    for (const id of ids) {
      const packed = raw && raw[id] != null ? String(raw[id]) : '3|0|0|0'; // 3 = unknown
      const [s, f, , w] = packed.split('|').map(Number);
      st.push(s ?? 3); free.push(f ?? 0); wait.push(w ?? 0);
    }
    body = JSON.stringify({ v: 1, t: now, st, free, wait });
    micro.set(mk, { at: now, body });
    if (micro.size > 500) micro.delete(micro.keys().next().value as string);
  }
  res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' }).send(body);
});

/** Called by whatever updates charger state (OCPP handler / twin engine). packed = "status|free|total|waitMin"; status 0=free 1=busy 2=offline 3=unknown */
export const publishLive = (stationId: string, status: number, free: number, total: number, waitMin: number) =>
  redis.hset('live:stations', { [stationId]: `${status}|${free}|${total}|${waitMin}` });
```
Mount it: `app.use('/api', rateLimit, mapRouter)` (use the existing rate limiter; `VERIFY`).

**CHECK:** `curl -s -o /dev/null -w "%{time_total} %{size_download}\n" localhost:<port>/api/stations/tiles/11/<x>/<y>` twice. The 2nd call must be **< 0.03 s**. Second call with `-H 'If-None-Match: <etag>'` returns **304**. Compute `<x>/<y>` for Thane with `tileOf(19.2183, 72.9781)`.

### TASK 1.3 — Wire live publishing + socket tile rooms
1. Find every place that changes charger/station availability (OCPP handlers, twin engine, operator PATCH). After the DB write, call `publishLive(...)` and `queueLive(...)` (below). `VERIFY` by grep for `io.emit("charger:update"` and **replace every global `io.emit` for charger updates**.
2. Create `apps/api/src/modules/map/live-batch.ts`:

```ts
import type { Server } from 'socket.io';
import { tileOf, TILE_Z } from './tiles.routes';

const roomOf = (lat: number, lng: number) => { const { x, y } = tileOf(lat, lng); return `tile:${TILE_Z}:${x}:${y}`; };
const pending = new Map<string, Map<string, string>>(); // room -> stationId -> packed

export const queueLive = (lat: number, lng: number, stationId: string, packed: string) => {
  const r = roomOf(lat, lng);
  (pending.get(r) ?? pending.set(r, new Map()).get(r)!).set(stationId, packed);
};

export function startLiveBatcher(io: Server) {
  io.on('connection', (sock) => {
    sock.on('map:join', (rooms: unknown) => {
      if (!Array.isArray(rooms)) return;
      for (const r of rooms.slice(0, 12)) if (typeof r === 'string' && /^tile:11:\d+:\d+$/.test(r)) void sock.join(r);
    });
    sock.on('map:leave', (rooms: unknown) => {
      if (!Array.isArray(rooms)) return;
      for (const r of rooms.slice(0, 12)) if (typeof r === 'string') void sock.leave(r);
    });
  });
  setInterval(() => {
    for (const [room, m] of pending) io.to(room).emit('live:delta', Object.fromEntries(m));
    pending.clear();
  }, 1000).unref();
}
```
Call `startLiveBatcher(io)` once at server start.

**CHECK:** with two browser tabs, only the tab whose map shows the changed station's tile receives `live:delta`; grep shows no `io.emit('charger:update'` left.

### TASK 1.4 — Bump cache version on station changes
Wherever stations are created / approved / edited / deleted (controllers + seed + import scripts), call `await bumpStationVersion()` after the DB write.

**CHECK:** edit a station's coordinates → next tile request returns a new ETag.

---

## 4. PHASE 2 — FAST STATIONS (frontend)

### TASK 2.1 — Dependencies
Install with the repo's package manager (see discovery doc): `supercluster`, `@types/supercluster`, `idb-keyval`.

### TASK 2.2 — Tile store
Create `apps/web/src/features/map/stations/tile-store.ts`:

```ts
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
  for (let x = tx(b.w); x <= tx(b.e); x++) for (let y = ty(b.n); y <= ty(b.s); y++) out.push({ x, y, key: `${Z}/${x}/${y}` });
  return out.slice(0, 12); // hard cap protects the API on very low zoom
};

async function swr<T>(key: string, url: string, memMap: Map<string, T>, persist: boolean): Promise<T> {
  const cached = memMap.get(key) ?? (persist ? await idbGet<T>(`tile:${key}`) : undefined);
  if (cached) memMap.set(key, cached);
  const refresh = (async () => {
    const p = inflight.get(url) ?? fetch(url, { headers: { Accept: 'application/json' } }).then((r) => r.json() as Promise<T>);
    inflight.set(url, p);
    try {
      const fresh = (await p) as T;
      memMap.set(key, fresh);
      if (persist) void idbSet(`tile:${key}`, fresh);
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
```
Also add `applyLiveDelta(points, delta)` that patches `status/free/waitMin` from the socket's `live:delta` (`"status|free|total|waitMin"` strings) **in place**, then triggers a re-render of only changed markers.

### TASK 2.3 — Use the store in the map page (marker diffing)
In the driver map component found in discovery:
1. On `idle`/`moveend` (debounce 80 ms) compute viewport bounds → `loadViewport` → `buildIndex(points).getClusters([w,s,e,n], zoom)`.
2. **Marker diff:** keep a `Map<string, MarkerHandle>` keyed by `cluster-<id>` or `station-<id>`. Compute the new key set; remove handles whose key vanished; create handles only for new keys; **update in place** (never recreate) when status changed. Pooling markers is allowed.
3. Join socket rooms for visible tiles (`map:join`), leave rooms no longer visible (`map:leave`), apply `live:delta`.
4. Keep the existing station card/click behaviour untouched.
5. Remove any "fetch all stations" call from this page.

**CHECK (measure and paste numbers into `docs/map-perf.md`):** (a) Chrome Performance: first marker paint after reload with warm IndexedDB < 100 ms; (b) panning 20 times causes **0** marker recreations for stations that stay on screen (log counter in dev only, remove afterwards); (c) Network tab: tile responses are 304/`(disk cache)` on repeat.

---

## 5. PHASE 3 — GEOFENCE SERVICE (backend, used by the demo)

### TASK 3.1 — Install + env
Add to `apps/api`: `@turf/turf`, `p-limit`. Add to `.env.example`: `OSRM_BASE_URL=https://router.project-osrm.org` and `OVERPASS_URL=https://overpass-api.de/api/interpreter`.

### TASK 3.2 — Geofence computation
Create `apps/api/src/modules/demo/geofence.ts`:

```ts
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

type Road = turf.helpers.Feature<turf.helpers.LineString>;

async function fetchRoads(lat: number, lng: number, around = 300): Promise<Road[]> {
  const q = `[out:json][timeout:15];way(around:${around},${lat},${lng})["highway"]
    ["highway"!~"footway|path|steps|cycleway|pedestrian|track|corridor|construction|proposed"]
    ["service"!~"parking_aisle|driveway|drive-through"];out geom;`;
  const res = await fetch(process.env.OVERPASS_URL!, { method: 'POST', body: `data=${encodeURIComponent(q)}` });
  if (!res.ok) throw new Error(`overpass_${res.status}`);
  const j = (await res.json()) as { elements: { geometry?: { lat: number; lon: number }[] }[] };
  return j.elements
    .filter((w) => (w.geometry?.length ?? 0) >= 2)
    .map((w) => turf.lineString(w.geometry!.map((g) => [g.lon, g.lat] as LngLat)));
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
```

### TASK 3.3 — Route pool (cars follow real roads)
Create `apps/api/src/modules/demo/routes.ts`:

```ts
import pLimit from 'p-limit';
import * as turf from '@turf/turf';
import { redis } from '../../lib/redis';
import type { Geofence } from './geofence';

const limit = pLimit(2);              // be polite to the public OSRM server
const OSRM = () => process.env.OSRM_BASE_URL!;
export type LatLng = [number, number]; // [lat, lng]

async function snap(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  const r = await fetch(`${OSRM()}/nearest/v1/driving/${lng},${lat}?number=1`);
  if (!r.ok) return null;
  const j = (await r.json()) as { waypoints?: { location: [number, number] }[] };
  const w = j.waypoints?.[0]?.location;
  return w ? { lat: w[1], lng: w[0] } : null;
}

async function route(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<LatLng[] | null> {
  const r = await fetch(`${OSRM()}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
  if (!r.ok) return null;
  const j = (await r.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] };
  const c = j.routes?.[0]?.geometry.coordinates;
  return c && c.length >= 2 ? c.map(([lng, lat]) => [lat, lng] as LatLng) : null;
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
  if (out.length >= 3) await redis.set(key, JSON.stringify(out));
  return out;
}
```

### TASK 3.4 — Bootstrap endpoint
Create `apps/api/src/modules/demo/demo.routes.ts` and mount at `/api/demo` with the rate limiter (max 10 req/min/IP):

```ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { computeGeofence } from './geofence';
import { getRoutePool } from './routes';

export const demoRouter = Router();
const Q = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180), limit: z.coerce.number().int().min(1).max(5).default(3) });

demoRouter.get('/bootstrap', async (req, res) => {
  const q = Q.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: 'bad_query' });
  const { lat, lng, limit } = q.data;
  // nearest approved stations that have at least 1 charger (VERIFY names)
  const rows = await prisma.$queryRaw<{ id: string; name: string; lat: number; lng: number; chargers: number }[]>`
    SELECT s.id, s.name, ST_Y(s.geom::geometry) lat, ST_X(s.geom::geometry) lng,
           (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId"=s.id)::int chargers
    FROM "Station" s
    WHERE s.status='APPROVED' AND s.geom IS NOT NULL
      AND ST_DWithin(s.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, 15000)
    ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography
    LIMIT 12`;
  const out = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    if (r.chargers < 1) continue;
    const fence = await computeGeofence(r.id, r.lat, r.lng).catch(() => null);
    if (!fence) continue;
    const routes = await getRoutePool(r.id, fence).catch(() => []);
    if (routes.length < 3) continue;
    out.push({ id: r.id, name: r.name, lat: r.lat, lng: r.lng, chargers: Math.min(r.chargers, 8), fence, routes });
  }
  res.set('Cache-Control', 'public, max-age=300').json({ stations: out });
});
```

**CHECK:** `curl "localhost:<port>/api/demo/bootstrap?lat=19.2183&lng=72.9781&limit=3"` returns ≥1 station; for every returned station: `fence.radiusM <= fence.clearanceM - 7` OR (`radiusM == 8` and `clearanceM >= 15`); second call < 50 ms.

---

## 6. PHASE 4 — DEMO ENGINE (pure TypeScript, no React, no map library)

Folder: `apps/web/src/features/map-demo/engine/`. The engine must run headless (Vitest, no DOM). Work file by file in this order. **After each file: `tsc --noEmit` must pass.**

### TASK 4.1 — `types.ts`

```ts
export type Vec = { x: number; y: number };            // metres; x = east, y = north
export type CarKind = 'CHARGER' | 'STAYER';
export type Phase = 'APPROACH' | 'INSIDE_MOVE' | 'PARKED' | 'CHARGING' | 'LEAVING';
export type QueueName = 'NONE' | 'CHARGING' | 'WAITING';
export type Tag = 'NONE' | 'SERVED' | 'OTHER_JOBS' | 'RENEGED' | 'BALKED' | 'LEFT_AFTER_STAY' | 'TIMEOUT';

export interface Path { pts: Vec[]; cum: number[]; len: number }
export interface Slot { id: string; kind: 'BAY' | 'PARK'; u: number; v: number; pos: Vec; occupant: number | null; chargerIdx?: number }
export interface Charger { idx: number; online: boolean; pendingOffline: boolean; holder: number | null; chargingSince: number | null }

export interface Car {
  id: number; kind: CarKind; stationId: string;
  phase: Phase; q: QueueName; tag: Tag; inside: boolean;
  path: Path; s: number; speed: number; pos: Vec; heading: number;
  next: Path | null; nextPhase: Phase | null;
  slot: Slot | null; route: Vec[];
  chargeS: number; patienceS: number; stayS: number; graceS: number;
  tSpawn: number; tEnter: number | null; tWaitStart: number | null; tOffer: number | null; tParked: number | null; heldS: number;
}

export interface StationInput {
  id: string; name: string; lat: number; lng: number; chargers: number;
  fence: { center: { lat: number; lng: number }; radiusM: number; gate: { lat: number; lng: number }; clearanceM: number; centerShifted: boolean };
  routes: [number, number][][]; // [lat,lng][]
}

export interface EngineConfig {
  seed: number; speed: number;                      // speed multiplier 1,2,5,10
  arrivalMeanS: number; chargerShare: number;       // share of cars that really charge
  chargeS: [number, number]; stayS: [number, number]; patienceS: [number, number];
  offerGraceS: number;
  roadV: number; insideV: number; accel: number; brake: number;
  safeGap: number; hardSep: number; lookahead: number; laneOffsetRoad: number;
  maxCarsPerStation: number; holdTimeoutS: number;
  demoMinPerSimS: number;                           // UI conversion: demo minutes per simulated second
}

export type EventType =
  | 'SPAWN' | 'FENCE_ENTER' | 'CHARGING_Q_JOIN' | 'WAITING_Q_JOIN' | 'OFFERED' | 'PLUG_IN'
  | 'OTHER_JOBS' | 'RENEGED' | 'BALKED' | 'CHARGE_DONE' | 'LEFT_AFTER_STAY' | 'FAULT' | 'RESTORED' | 'TIMEOUT';
export interface EngineEvent { t: number; type: EventType; stationId: string; carId?: number; msg: string }

export interface StationStats {
  spawned: number; entered: number; plugged: number; served: number; otherJobs: number;
  reneged: number; balked: number; leftAfterStay: number; waitSum: number; waitN: number; maxWaiting: number;
}
```

### TASK 4.2 — `geometry.ts`

```ts
import type { Path, Vec } from './types';

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Vec): Vec => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function makePath(pts: Vec[]): Path {
  const p = pts.length >= 2 ? pts : [pts[0], { x: pts[0].x + 0.01, y: pts[0].y }];
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + dist(p[i - 1], p[i]));
  return { pts: p, cum, len: cum[cum.length - 1] };
}

export function sample(path: Path, s: number, prevHeading = 0): { pos: Vec; heading: number } {
  const c = clamp(s, 0, path.len);
  let lo = 0, hi = path.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path.cum[m] <= c) lo = m; else hi = m; }
  const a = path.pts[lo], b = path.pts[Math.min(lo + 1, path.pts.length - 1)];
  const seg = path.cum[Math.min(lo + 1, path.cum.length - 1)] - path.cum[lo];
  const t = seg > 1e-9 ? (c - path.cum[lo]) / seg : 0;
  const heading = seg > 1e-9 ? Math.atan2(b.y - a.y, b.x - a.x) : prevHeading;
  return { pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, heading };
}

/** Offset a polyline to the LEFT of its travel direction by d metres (left-hand traffic lane). */
export function offsetLeft(pts: Vec[], d: number): Vec[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / L) * d, y: p.y + (dx / L) * d };
  });
}

export function truncate(pts: Vec[], maxLen: number): Vec[] {
  const out: Vec[] = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= maxLen) { const t = (maxLen - acc) / d; out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }); return out; }
    acc += d; out.push(pts[i]);
  }
  return out;
}

export function makeProjector(origin: { lat: number; lng: number }) {
  const R = 6378137, k = Math.cos((origin.lat * Math.PI) / 180);
  return {
    toWorld: (lat: number, lng: number): Vec => ({ x: ((lng - origin.lng) * Math.PI / 180) * R * k, y: ((lat - origin.lat) * Math.PI / 180) * R }),
    toLatLng: (v: Vec) => ({ lat: origin.lat + (v.y / R) * 180 / Math.PI, lng: origin.lng + (v.x / (R * k)) * 180 / Math.PI }),
  };
}
```

### TASK 4.3 — `layout.ts` (slots inside the fence, collision-free by construction)
Local frame: origin = fence centre; `u` axis points **from the gate into the station**; `v` = left of `u`. Inbound lane `v=+LANE`, outbound lane `v=-LANE` (left-hand traffic). Slots sit at `v=±SIDE`, 4.6 m apart along `u` (no two slots closer than 4.6 m). Cars reach a slot by driving the lane to the slot's `u`, then one lateral step. Bays = the slots nearest the centre; the rest = parking.

```ts
import { norm, sub } from './geometry';
import type { Slot, Vec } from './types';

export const LANE = 2.0, SIDE = 6.5, SPACING = 4.6;

export function buildLayout(center: Vec, gate: Vec, R: number, wantChargers: number) {
  const eu = norm(sub(center, gate));
  const ev = { x: -eu.y, y: eu.x };
  const w = (u: number, v: number): Vec => ({ x: center.x + eu.x * u + ev.x * v, y: center.y + eu.y * u + ev.y * v });
  const usable = R - 2.5;
  const cands: { u: number; v: number }[] = [];
  for (let u = -usable + 1.5; u <= usable; u += SPACING)
    for (const v of [-SIDE, SIDE]) if (Math.hypot(u, v) <= usable) cands.push({ u, v });
  cands.sort((a, b) => Math.hypot(a.u, a.v) - Math.hypot(b.u, b.v));
  const fit = Math.max(1, Math.min(wantChargers, cands.length - 2)); // always keep >= 2 parking slots
  const mk = (c: { u: number; v: number }, kind: Slot['kind'], i: number): Slot =>
    ({ id: `${kind}${i}`, kind, u: c.u, v: c.v, pos: w(c.u, c.v), occupant: null, chargerIdx: kind === 'BAY' ? i : undefined });
  const bays = cands.slice(0, fit).map((c, i) => mk(c, 'BAY', i));
  const park = cands.slice(fit).map((c, i) => mk(c, 'PARK', i)).sort((a, b) => a.u - b.u).slice(0, 14);
  return { w, eu, ev, bays, park, fit };
}
```

### TASK 4.4 — `estimate.ts` (waiting time)

```ts
/** Time until the n-th (1-based) charger release, assuming each new session lasts avgS. */
export function waitForNth(freeInS: number[], n: number, avgS: number): number {
  if (!freeInS.length) return Infinity;
  const a = [...freeInS].sort((x, y) => x - y);
  for (let i = 1; i < n; i++) { const t = a.shift()! + avgS; a.push(t); a.sort((x, y) => x - y); }
  return a[0];
}

/** Share of queued cars that really plug in (system learns it; prior 0.65 with weight 5). */
export const intentRatio = (plugged: number, otherJobs: number, prior = 0.65, w = 5) =>
  (plugged + prior * w) / (plugged + otherJobs + w);

export interface WaitEstimate { waitingCount: number; nextCarWaitS: number | null; perPositionS: (number | null)[] }

export function estimateWaits(freeInS: number[], waitingCount: number, avgS: number, p: number): WaitEstimate {
  if (!freeInS.length) return { waitingCount, nextCarWaitS: null, perPositionS: Array(waitingCount).fill(null) };
  const per = Array.from({ length: waitingCount }, (_, i) => waitForNth(freeInS, Math.max(1, Math.ceil((i + 1) * p)), avgS));
  return { waitingCount, nextCarWaitS: waitForNth(freeInS, Math.max(1, Math.ceil((waitingCount + 1) * p)), avgS), perPositionS: per };
}
```

### TASK 4.5 — `engine.ts`
This is the core. Write it in **this order**, compiling after each step: (a) config + constructor + RNG + station build, (b) spawn, (c) movement + collision, (d) fence-enter decision, (e) per-station tick (offer expiry, completion, renege/leave, promote), (f) faults + estimator + snapshot.

```ts
import { clamp, dist, dot, makePath, makeProjector, offsetLeft, sample, sub, truncate } from './geometry';
import { buildLayout, LANE } from './layout';
import { estimateWaits, intentRatio } from './estimate';
import type { Car, CarKind, Charger, EngineConfig, EngineEvent, Path, Phase, Slot, StationInput, StationStats, Tag, Vec } from './types';

export const DEFAULT_CONFIG: EngineConfig = {
  seed: 7, speed: 1, arrivalMeanS: 16, chargerShare: 0.65,
  chargeS: [50, 110], stayS: [45, 110], patienceS: [35, 80], offerGraceS: 12,
  roadV: 12, insideV: 5, accel: 3.5, brake: 9,
  safeGap: 5, hardSep: 3.2, lookahead: 14, laneOffsetRoad: 1.8,
  maxCarsPerStation: 40, holdTimeoutS: 40, demoMinPerSimS: 1 / 3,
};

interface StationSim {
  id: string; name: string; center: Vec; R: number; gate: Vec; input: StationInput;
  w: (u: number, v: number) => Vec;
  chargers: Charger[]; bays: Slot[]; park: Slot[];
  chargingQ: number[]; waitingQ: number[];
  routes: Vec[][]; nextArrivalAt: number; stats: StationStats; avgChargeS: number;
}

const zeroStats = (): StationStats => ({ spawned: 0, entered: 0, plugged: 0, served: 0, otherJobs: 0, reneged: 0, balked: 0, leftAfterStay: 0, waitSum: 0, waitN: 0, maxWaiting: 0 });

export class DemoEngine {
  t = 0;
  cfg: EngineConfig;
  readonly cars = new Map<number, Car>();
  readonly stations: StationSim[] = [];
  readonly log: EngineEvent[] = [];
  guardHolds = 0;
  private nextId = 1;
  private seed: number;
  private listeners = new Set<(e: EngineEvent) => void>();
  readonly proj;

  constructor(inputs: StationInput[], cfg: Partial<EngineConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.seed = this.cfg.seed;
    this.proj = makeProjector({ lat: inputs[0].fence.center.lat, lng: inputs[0].fence.center.lng });
    for (const inp of inputs) {
      const center = this.proj.toWorld(inp.fence.center.lat, inp.fence.center.lng);
      const gate = this.proj.toWorld(inp.fence.gate.lat, inp.fence.gate.lng);
      const L = buildLayout(center, gate, inp.fence.radiusM, inp.chargers);
      const routes = inp.routes.map((r) => {
        const pts = r.map(([la, ln]) => this.proj.toWorld(la, ln));
        if (dist(pts[pts.length - 1], gate) > 0.5) pts.push(gate);
        return pts;
      });
      this.stations.push({
        id: inp.id, name: inp.name, center, R: inp.fence.radiusM, gate, input: inp, w: L.w,
        chargers: Array.from({ length: L.fit }, (_, idx) => ({ idx, online: true, pendingOffline: false, holder: null, chargingSince: null })),
        bays: L.bays, park: L.park, chargingQ: [], waitingQ: [], routes,
        nextArrivalAt: 2 + this.rng() * this.cfg.arrivalMeanS, // stations start EMPTY; first car arrives later
        stats: zeroStats(), avgChargeS: (this.cfg.chargeS[0] + this.cfg.chargeS[1]) / 2,
      });
    }
  }

  // ---------- utilities ----------
  private rng(): number { let t = (this.seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  private between([a, b]: [number, number]) { return a + this.rng() * (b - a); }
  on(cb: (e: EngineEvent) => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit(type: EngineEvent['type'], st: StationSim, msg: string, carId?: number) {
    const e: EngineEvent = { t: this.t, type, stationId: st.id, carId, msg };
    this.log.push(e); if (this.log.length > 300) this.log.shift();
    this.listeners.forEach((l) => l(e));
  }
  private st(id: string) { return this.stations.find((s) => s.id === id)!; }

  // ---------- public control ----------
  setConfig(p: Partial<EngineConfig>) { this.cfg = { ...this.cfg, ...p }; }
  reset() { this.t = 0; this.cars.clear(); this.log.length = 0; this.nextId = 1; this.seed = this.cfg.seed;
    for (const s of this.stations) { s.chargingQ.length = 0; s.waitingQ.length = 0; s.stats = zeroStats(); s.nextArrivalAt = 2 + this.rng() * this.cfg.arrivalMeanS;
      s.chargers.forEach((c) => Object.assign(c, { online: true, pendingOffline: false, holder: null, chargingSince: null }));
      [...s.bays, ...s.park].forEach((x) => (x.occupant = null)); } }

  step(dtReal: number) {
    let left = Math.min(dtReal, 0.25) * this.cfg.speed;
    while (left > 1e-9) { const h = Math.min(0.1, left); this.tick(h); left -= h; }
  }

  forceSpawn(stationId: string, kind: CarKind) { return this.spawn(this.st(stationId), kind); }

  toggleFault(stationId: string, idx: number) {
    const st = this.st(stationId); const ch = st.chargers[idx]; if (!ch) return;
    if (!ch.online) { ch.online = true; ch.pendingOffline = false; this.emit('RESTORED', st, `Charger ${idx + 1} restored`); return; }
    const holder = ch.holder !== null ? this.cars.get(ch.holder) : undefined;
    if (!holder) { ch.online = false; this.emit('FAULT', st, `Charger ${idx + 1} fault`); return; }
    if (holder.phase !== 'CHARGING') { ch.pendingOffline = true; return; } // applies once the car resolves
    // interrupt an active session: car goes to the FRONT of the waiting queue, keeps its bay physically
    ch.online = false; ch.holder = null; ch.chargingSince = null;
    st.chargingQ = st.chargingQ.filter((i) => i !== holder.id);
    holder.q = 'WAITING'; holder.phase = 'PARKED'; holder.tWaitStart = this.t; holder.patienceS += 30; holder.tParked = this.t;
    st.waitingQ.unshift(holder.id);
    this.emit('FAULT', st, `Charger ${idx + 1} fault: car #${holder.id} back to waiting (front)`, holder.id);
  }

  // ---------- main tick ----------
  private tick(h: number) {
    this.t += h;
    for (const st of this.stations) {
      if (this.t >= st.nextArrivalAt) {
        const kind: CarKind = this.rng() < this.cfg.chargerShare ? 'CHARGER' : 'STAYER';
        if (this.spawn(st, kind)) st.nextArrivalAt = this.t + -Math.log(1 - this.rng()) * this.cfg.arrivalMeanS;
        else st.nextArrivalAt = this.t + 0.5; // spawn point busy: retry shortly (prevents overlap)
      }
    }
    this.stationLogic();
    this.moveCars(h);
  }

  // ---------- spawn ----------
  private spawn(st: StationSim, kind: CarKind): Car | null {
    let n = 0; for (const c of this.cars.values()) if (c.stationId === st.id) n++;
    if (n >= this.cfg.maxCarsPerStation) return null;
    const route = st.routes[Math.floor(this.rng() * st.routes.length)];
    const entryIn = st.w(-st.R + 2, +LANE);
    const path = makePath([...offsetLeft(route, this.cfg.laneOffsetRoad), entryIn]);
    const start = path.pts[0];
    for (const o of this.cars.values()) if (dist(o.pos, start) < this.cfg.safeGap * 1.5) return null;
    const car: Car = {
      id: this.nextId++, kind, stationId: st.id, phase: 'APPROACH', q: 'NONE', tag: 'NONE', inside: false,
      path, s: 0, speed: this.cfg.roadV * 0.6, pos: start, heading: sample(path, 0).heading, next: null, nextPhase: null,
      slot: null, route,
      chargeS: this.between(this.cfg.chargeS), patienceS: kind === 'CHARGER' ? this.between(this.cfg.patienceS) : Infinity,
      stayS: this.between(this.cfg.stayS), graceS: 0,
      tSpawn: this.t, tEnter: null, tWaitStart: null, tOffer: null, tParked: null, heldS: 0,
    };
    this.cars.set(car.id, car); st.stats.spawned++;
    this.emit('SPAWN', st, `Car #${car.id} (${kind === 'CHARGER' ? 'wants to charge' : 'just visiting'}) heading to ${st.name}`, car.id);
    return car;
  }

  // ---------- movement + collision avoidance ----------
  private moveCars(h: number) {
    const cell = 15, key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const grid = new Map<string, Car[]>();
    for (const c of this.cars.values()) { const k = key(c.pos.x, c.pos.y); const a = grid.get(k); if (a) a.push(c); else grid.set(k, [c]); }
    const near = (p: Vec) => { const out: Car[] = []; const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = grid.get(`${cx + i},${cy + j}`); if (a) out.push(...a); } return out; };

    for (const c of [...this.cars.values()]) {
      if (c.phase === 'PARKED' || c.phase === 'CHARGING') continue;
      const st = this.st(c.stationId);
      const hv = { x: Math.cos(c.heading), y: Math.sin(c.heading) };
      let gap = Infinity;
      for (const o of near(c.pos)) {
        if (o === c) continue;
        const rel = sub(o.pos, c.pos), ahead = dot(rel, hv);
        if (ahead <= 0 || ahead > this.cfg.lookahead) continue;
        if (Math.abs(rel.x * hv.y - rel.y * hv.x) > 2.2) continue; // only same-lane corridor blocks
        if (ahead < gap) gap = ahead;
      }
      const vmax = c.inside ? this.cfg.insideV : this.cfg.roadV;
      const vt = Math.min(vmax, Math.max(0, (gap - this.cfg.safeGap) * 0.9));
      c.speed += clamp(vt - c.speed, -this.cfg.brake * h, this.cfg.accel * h);
      const np = sample(c.path, c.s + c.speed * h, c.heading);
      let blocked = false;
      for (const o of near(np.pos)) {
        if (o === c) continue;
        const dNew = dist(o.pos, np.pos);
        if (dNew < this.cfg.hardSep && dNew < dist(o.pos, c.pos)) { blocked = true; break; }
      }
      if (blocked) { c.speed = 0; c.heldS += h; this.guardHolds++; }
      else { c.s += c.speed * h; c.pos = np.pos; c.heading = np.heading; c.heldS = c.speed < 0.1 ? c.heldS + h : 0; }
      if (c.heldS > this.cfg.holdTimeoutS) { this.emit('TIMEOUT', st, `Car #${c.id} gridlocked, removed`, c.id); this.removeCar(c, st, 'TIMEOUT'); continue; }
      if (!c.inside && c.phase === 'APPROACH' && dist(c.pos, st.center) <= st.R) this.onEnterFence(c, st);
      if (c.s >= c.path.len - 1e-6) this.onPathEnd(c, st);
    }
  }

  private onPathEnd(c: Car, st: StationSim) {
    if (c.next) { c.path = c.next; c.s = 0; c.phase = c.nextPhase!; c.next = null; c.nextPhase = null; return; }
    if (c.phase === 'LEAVING') return this.removeCar(c, st, c.tag);
    if (c.phase === 'INSIDE_MOVE') {
      if (c.slot?.kind === 'BAY' && c.q === 'CHARGING') this.startCharging(c, st);
      else { c.phase = 'PARKED'; c.tParked = this.t; c.speed = 0; }
    }
  }

  // ---------- paths inside the fence ----------
  private pathIn(st: StationSim, slot: Slot): Path { return makePath([st.w(-st.R + 2, LANE), st.w(slot.u, LANE), slot.pos]); }
  private pathMove(st: StationSim, c: Car, to: Slot): Path {
    const fromU = c.slot ? c.slot.u : -st.R + 2;
    const lane = to.u >= fromU ? LANE : -LANE; // travel direction decides the lane
    return makePath([c.pos, st.w(fromU, lane), st.w(to.u, lane), to.pos]);
  }
  private pathOut(st: StationSim, c: Car): Path {
    const pts: Vec[] = [c.pos];
    if (c.slot) pts.push(st.w(c.slot.u, -LANE));
    if (c.inside) pts.push(st.w(-st.R + 2, -LANE));
    const back = truncate(offsetLeft([...c.route].reverse(), this.cfg.laneOffsetRoad), 220);
    return makePath([...pts, ...back]);
  }

  // ---------- fence entry decision (the heart of the geofence logic) ----------
  private freePark(st: StationSim) { return st.park.find((s) => s.occupant === null) ?? null; }
  private freeCharger(st: StationSim) { return st.chargers.find((ch) => ch.online && !ch.pendingOffline && ch.holder === null) ?? null; }

  private onEnterFence(c: Car, st: StationSim) {
    c.inside = true; c.tEnter = this.t; st.stats.entered++;
    this.emit('FENCE_ENTER', st, `Car #${c.id} entered the geofence`, c.id);
    const ch = this.freeCharger(st);
    const park = this.freePark(st);
    if (ch && c.kind === 'CHARGER') {
      const bay = st.bays[ch.idx]; bay.occupant = c.id; c.slot = bay;
      this.joinCharging(c, st, ch, bay);
      c.next = this.pathIn(st, bay); c.nextPhase = 'INSIDE_MOVE';
    } else if (ch && c.kind === 'STAYER' && park) {
      park.occupant = c.id; c.slot = park;
      this.joinCharging(c, st, ch, st.bays[ch.idx]); // system only sees "car in fence": tentative reservation
      c.next = this.pathIn(st, park); c.nextPhase = 'INSIDE_MOVE';
    } else if (park) {
      park.occupant = c.id; c.slot = park;
      c.q = 'WAITING'; c.tWaitStart = this.t; st.waitingQ.push(c.id);
      st.stats.maxWaiting = Math.max(st.stats.maxWaiting, st.waitingQ.length);
      this.emit('WAITING_Q_JOIN', st, `Car #${c.id} joined the WAITING queue (position ${st.waitingQ.length})`, c.id);
      c.next = this.pathIn(st, park); c.nextPhase = 'INSIDE_MOVE';
    } else {
      c.tag = 'BALKED'; st.stats.balked++;
      this.emit('BALKED', st, `Car #${c.id} found no space and left`, c.id);
      this.beginLeave(c, st, 'BALKED');
    }
  }

  private joinCharging(c: Car, st: StationSim, ch: Charger, bay: Slot) {
    ch.holder = c.id; st.chargingQ.push(c.id); c.q = 'CHARGING'; c.tOffer = this.t;
    c.graceS = this.cfg.offerGraceS + (dist(c.pos, bay.pos) * 1.4) / this.cfg.insideV;
    this.emit('CHARGING_Q_JOIN', st, `Car #${c.id} joined the CHARGING queue (charger ${ch.idx + 1})`, c.id);
  }

  // ---------- per-station logic ----------
  private stationLogic() {
    for (const st of this.stations) {
      // 1) offer expired => "other jobs"
      for (const id of [...st.chargingQ]) {
        const c = this.cars.get(id)!;
        if (c.phase !== 'CHARGING' && c.tOffer !== null && this.t - c.tOffer > c.graceS) this.discardOtherJobs(c, st);
      }
      // 2) charge completion
      for (const ch of st.chargers) {
        if (ch.holder === null || ch.chargingSince === null) continue;
        const c = this.cars.get(ch.holder)!;
        if (this.t - ch.chargingSince >= c.chargeS) {
          st.avgChargeS = st.avgChargeS * 0.8 + c.chargeS * 0.2;
          st.stats.served++; c.tag = 'SERVED'; c.q = 'NONE';
          st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
          this.releaseCharger(ch, st);
          this.emit('CHARGE_DONE', st, `Car #${c.id} finished charging`, c.id);
          this.beginLeave(c, st, 'SERVED');
        }
      }
      // 3) renege (waiting chargers) + stay timers
      for (const c of [...this.cars.values()]) {
        if (c.stationId !== st.id) continue;
        if (c.q === 'WAITING' && c.kind === 'CHARGER' && c.tWaitStart !== null && this.t - c.tWaitStart > c.patienceS) {
          st.stats.reneged++; this.emit('RENEGED', st, `Car #${c.id} got tired of waiting and left`, c.id);
          this.beginLeave(c, st, 'RENEGED');
        } else if (c.kind === 'STAYER' && c.phase === 'PARKED' && c.tParked !== null && this.t - c.tParked >= c.stayS) {
          st.stats.leftAfterStay++; this.emit('LEFT_AFTER_STAY', st, `Car #${c.id} (visitor) left`, c.id);
          this.beginLeave(c, st, 'LEFT_AFTER_STAY');
        }
      }
      // 4) promote head of waiting queue into every free charger
      for (const ch of st.chargers) {
        if (!(ch.online && !ch.pendingOffline && ch.holder === null) || !st.waitingQ.length) continue;
        const id = st.waitingQ.shift()!; const c = this.cars.get(id)!;
        const bay = st.bays[ch.idx];
        this.emit('OFFERED', st, `Charger ${ch.idx + 1} offered to car #${c.id}`, c.id);
        this.joinCharging(c, st, ch, bay);
        if (c.kind === 'CHARGER') {
          if (c.slot) c.slot.occupant = null;
          bay.occupant = c.id;
          c.path = this.pathMove(st, c, bay); c.s = 0; c.slot = bay; c.phase = 'INSIDE_MOVE'; c.next = null;
        } // STAYER does not move: grace timer will classify it as OTHER_JOBS
      }
    }
  }

  private releaseCharger(ch: Charger, st: StationSim) {
    ch.holder = null; ch.chargingSince = null;
    if (ch.pendingOffline) { ch.online = false; ch.pendingOffline = false; this.emit('FAULT', st, `Charger ${ch.idx + 1} fault`); }
  }

  private startCharging(c: Car, st: StationSim) {
    const ch = st.chargers[c.slot!.chargerIdx!];
    c.phase = 'CHARGING'; c.speed = 0; ch.chargingSince = this.t;
    st.stats.plugged++;
    if (c.tWaitStart !== null) { st.stats.waitSum += this.t - c.tWaitStart; st.stats.waitN++; }
    this.emit('PLUG_IN', st, `Car #${c.id} plugged in at charger ${ch.idx + 1}`, c.id);
  }

  private discardOtherJobs(c: Car, st: StationSim) {
    const ch = st.chargers.find((x) => x.holder === c.id)!;
    st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
    c.q = 'NONE'; c.tag = 'OTHER_JOBS'; st.stats.otherJobs++;
    this.releaseCharger(ch, st);
    this.emit('OTHER_JOBS', st, `Car #${c.id} did not plug in: classified OTHER JOBS and discarded from the queue`, c.id);
  }

  /** remove from queues, free slot, drive away */
  private beginLeave(c: Car, st: StationSim, tag: Tag) {
    c.tag = tag;
    st.waitingQ = st.waitingQ.filter((i) => i !== c.id);
    if (c.q === 'CHARGING') { const ch = st.chargers.find((x) => x.holder === c.id); st.chargingQ = st.chargingQ.filter((i) => i !== c.id); if (ch) this.releaseCharger(ch, st); }
    c.q = 'NONE';
    const old = c.slot; c.path = this.pathOut(st, c); c.s = 0; c.phase = 'LEAVING'; c.next = null;
    if (old) { old.occupant = null; c.slot = null; }
  }

  private removeCar(c: Car, st: StationSim, tag: Tag) {
    st.waitingQ = st.waitingQ.filter((i) => i !== c.id); st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
    for (const ch of st.chargers) if (ch.holder === c.id) this.releaseCharger(ch, st);
    if (c.slot) c.slot.occupant = null;
    this.cars.delete(c.id);
    void tag;
  }

  // ---------- read model for UI / renderer ----------
  stationView(st: StationSim) {
    const freeIn = st.chargers.filter((c) => c.online).map((c) => {
      if (c.holder === null) return 0;
      const elapsed = c.chargingSince === null ? 0 : this.t - c.chargingSince;
      return Math.max(1, st.avgChargeS - elapsed);
    });
    const p = intentRatio(st.stats.plugged, st.stats.otherJobs);
    const est = estimateWaits(freeIn, st.waitingQ.length, st.avgChargeS, p);
    const toMin = (s: number | null) => (s === null || !isFinite(s) ? null : Math.round(s * this.cfg.demoMinPerSimS));
    return {
      id: st.id, name: st.name, radiusM: st.R, centerShifted: st.input.fence.centerShifted, clearanceM: st.input.fence.clearanceM,
      chargers: st.chargers.map((ch) => ({ idx: ch.idx, online: ch.online, pendingOffline: ch.pendingOffline,
        state: !ch.online ? 'FAULT' : ch.holder === null ? 'FREE' : ch.chargingSince !== null ? 'CHARGING' : 'RESERVED',
        progress: ch.chargingSince !== null && ch.holder !== null ? clamp((this.t - ch.chargingSince) / this.cars.get(ch.holder)!.chargeS, 0, 1) : 0 })),
      chargingQ: st.chargingQ.length, chargingCap: st.chargers.filter((c) => c.online).length,
      waiting: st.waitingQ.length, waitingIds: [...st.waitingQ],
      nextWaitMin: toMin(est.nextCarWaitS), perPositionMin: est.perPositionS.map(toMin),
      avgWaitedMin: st.stats.waitN ? toMin(st.stats.waitSum / st.stats.waitN) : null,
      intentRatio: Math.round(p * 100), stats: { ...st.stats },
    };
  }

  snapshot() {
    return {
      t: this.t,
      cars: [...this.cars.values()].map((c) => ({ id: c.id, x: c.pos.x, y: c.pos.y, h: c.heading, kind: c.kind, phase: c.phase, q: c.q, tag: c.tag, stationId: c.stationId })),
      stations: this.stations.map((s) => this.stationView(s)),
    };
  }

  layoutFor(stationId: string) {
    const s = this.st(stationId);
    return { center: s.center, R: s.R, gate: s.gate, bays: s.bays.map((b) => b.pos), park: s.park.map((p) => p.pos) };
  }
}
```
**Rules for you while writing this file:**
- Keep method names and behaviours exactly (tests depend on them). You may split the file into 2-3 files if it gets too long, but **do not** change logic.
- A car that is `OFFERED` a charger and plugs in on time is **never** discarded; only cars that do not reach `PLUG_IN` within `graceS` are.
- `chargingQ.length` can never exceed the number of online chargers because a car only enters the charging queue by taking a **free online charger** (`holder === null`). Do not add any other code path that pushes into `chargingQ`.

### TASK 4.6 — Unit tests (`engine.test.ts`) — write these, they must pass

Use a synthetic station (no network): road along the Y axis, gate 40 m south of the centre.

```ts
import { describe, it, expect } from 'vitest';
import { DemoEngine } from './engine';
import type { StationInput } from './types';

const input = (chargers = 3, R = 30): StationInput => {
  const o = { lat: 19.2, lng: 72.97 }; const m = 1 / 111320;
  const route: [number, number][] = [];
  for (let d = 400; d >= 40; d -= 20) route.push([o.lat - d * m, o.lng]);   // approaching from the south
  return { id: 's1', name: 'Test Station', lat: o.lat, lng: o.lng, chargers,
    fence: { center: o, radiusM: R, gate: { lat: o.lat - 40 * m, lng: o.lng }, clearanceM: 40, centerShifted: false }, routes: [route] };
};
const run = (e: DemoEngine, sec: number) => { for (let i = 0; i < sec * 10; i++) e.step(0.1); };
const view = (e: DemoEngine) => e.stationView(e.stations[0]);

describe('demo engine', () => {
  it('starts empty', () => { const e = new DemoEngine([input()]); expect(e.cars.size).toBe(0); expect(view(e).chargingQ).toBe(0); expect(view(e).waiting).toBe(0); });

  it('charging queue never exceeds chargers; cars never overlap', () => {
    const e = new DemoEngine([input(3)], { arrivalMeanS: 5, chargerShare: 1 });
    let minD = Infinity;
    for (let i = 0; i < 20 * 60 * 10; i++) {
      e.step(0.1);
      const cs = [...e.cars.values()];
      for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) minD = Math.min(minD, Math.hypot(cs[a].pos.x - cs[b].pos.x, cs[a].pos.y - cs[b].pos.y));
      expect(view(e).chargingQ).toBeLessThanOrEqual(3);
    }
    expect(minD).toBeGreaterThanOrEqual(3.0);
  });

  it('overflow goes to the waiting queue', () => {
    const e = new DemoEngine([input(2)], { arrivalMeanS: 1000 });
    for (let i = 0; i < 4; i++) { e.forceSpawn('s1', 'CHARGER'); run(e, 6); }
    run(e, 40);
    expect(view(e).chargingQ).toBe(2); expect(view(e).waiting).toBeGreaterThanOrEqual(1);
  });

  it('a visitor offered a free charger is discarded as OTHER_JOBS', () => {
    const e = new DemoEngine([input(1)], { arrivalMeanS: 1000 });
    e.forceSpawn('s1', 'CHARGER'); run(e, 8);
    e.forceSpawn('s1', 'STAYER'); run(e, 25);           // stayer waits behind the charger car
    expect(view(e).waiting).toBe(1);
    run(e, 120);                                          // charger frees, stayer is offered, never plugs in
    expect(view(e).stats.otherJobs).toBe(1);
    expect(view(e).waiting).toBe(0); expect(view(e).chargingQ).toBe(0);
  });

  it('impatient car leaves and is removed from the waiting queue', () => {
    const e = new DemoEngine([input(1)], { arrivalMeanS: 1000, patienceS: [10, 10], chargeS: [500, 500] });
    e.forceSpawn('s1', 'CHARGER'); run(e, 8);
    e.forceSpawn('s1', 'CHARGER'); run(e, 20);
    expect(view(e).stats.reneged).toBe(1); expect(view(e).waiting).toBe(0);
  });

  it('balks when there is no parking space', () => {
    const e = new DemoEngine([input(1, 12)], { arrivalMeanS: 1000, chargeS: [900, 900], patienceS: [900, 900] });
    for (let i = 0; i < 12; i++) { e.forceSpawn('s1', 'CHARGER'); run(e, 5); }
    run(e, 30);
    expect(view(e).stats.balked).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic for the same seed', () => {
    const a = new DemoEngine([input()], { seed: 3 }), b = new DemoEngine([input()], { seed: 3 });
    run(a, 300); run(b, 300);
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });
});
```
**CHECK:** `vitest run map-demo` all green. If the overlap test fails, tune **only** `safeGap`, `hardSep`, `lookahead`, braking and the spawn clearance in `engine.ts`; never delete or weaken the test.

---

## 7. PHASE 5 — DEMO UI (map-agnostic canvas renderer + controls)

### TASK 5.1 — Map adapter (thin layer so ONE renderer works with Google Maps or Leaflet)
Create `apps/web/src/features/map-demo/renderer/map-adapter.ts`. Implement **only the adapter for the library the driver page really uses** (see discovery doc).

```ts
export interface MapAdapter {
  toPx(lat: number, lng: number): { x: number; y: number } | null;  // container pixels
  zoom(): number;
  container(): HTMLElement;
  center(): { lat: number; lng: number };
}

// Leaflet (react-leaflet): pass the L.Map instance (useMap())
export const leafletAdapter = (map: import('leaflet').Map): MapAdapter => ({
  toPx: (lat, lng) => { const p = map.latLngToContainerPoint([lat, lng]); return { x: p.x, y: p.y }; },
  zoom: () => map.getZoom(),
  container: () => map.getContainer(),
  center: () => { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; },
});

// Google Maps (@react-google-maps/api): pass the google.maps.Map instance
export function googleAdapter(map: google.maps.Map): MapAdapter & { dispose(): void } {
  class Helper extends google.maps.OverlayView { onAdd() {} draw() {} onRemove() {} }
  const helper = new Helper(); helper.setMap(map);
  return {
    toPx: (lat, lng) => { const p = helper.getProjection()?.fromLatLngToContainerPixel(new google.maps.LatLng(lat, lng)); return p ? { x: p.x, y: p.y } : null; },
    zoom: () => map.getZoom() ?? 15,
    container: () => map.getDiv(),
    center: () => { const c = map.getCenter()!; return { lat: c.lat(), lng: c.lng() }; },
    dispose: () => helper.setMap(null),
  };
}
```

### TASK 5.2 — Canvas renderer
Create `.../renderer/demo-canvas.ts`. One absolutely-positioned `<canvas>` over the map container, `pointer-events:none`, redrawn every animation frame while the demo runs. DPR-aware. Draw (back to front): fence circle (light-blue fill, dashed blue stroke, label of radius), driveway gate dot, park slots (light grey squares), bays (coloured by charger state), cars, tags, station pin + counters.

```ts
import type { DemoEngine } from '../engine/engine';
import type { MapAdapter } from './map-adapter';

export type ColorMode = 'system' | 'truth';   // system = what the platform sees; truth = real intent (teaching mode)

const mPerPx = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

export class DemoCanvas {
  private cv = document.createElement('canvas');
  private ctx = this.cv.getContext('2d')!;
  mode: ColorMode = 'system';
  constructor(private a: MapAdapter, private eng: DemoEngine) {
    Object.assign(this.cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '5' });
    a.container().appendChild(this.cv);
  }
  dispose() { this.cv.remove(); }

  draw() {
    const el = this.a.container(), dpr = window.devicePixelRatio || 1, W = el.clientWidth, H = el.clientHeight;
    if (this.cv.width !== W * dpr || this.cv.height !== H * dpr) { this.cv.width = W * dpr; this.cv.height = H * dpr; }
    const g = this.ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const c0 = this.a.center(), z = this.a.zoom(), ppm = 1 / mPerPx(c0.lat, z);        // pixels per metre
    const P = (v: { x: number; y: number }) => { const ll = this.eng.proj.toLatLng(v); return this.a.toPx(ll.lat, ll.lng); };
    const snap = this.eng.snapshot();

    for (const sv of snap.stations) {
      const L = this.eng.layoutFor(sv.id), c = P(L.center); if (!c) continue;
      const r = L.R * ppm;
      g.beginPath(); g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(37,99,235,0.10)'; g.fill(); g.setLineDash([6, 5]); g.strokeStyle = '#2563eb'; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
      const gt = P(L.gate); if (gt) { g.beginPath(); g.arc(gt.x, gt.y, Math.max(3, 1.5 * ppm), 0, 7); g.fillStyle = '#64748b'; g.fill(); }
      const sq = Math.max(4, 3.4 * ppm);
      for (const p of L.park) { const q = P(p); if (q) { g.strokeStyle = '#cbd5e1'; g.lineWidth = 1; g.strokeRect(q.x - sq / 2, q.y - sq / 2, sq, sq); } }
      sv.chargers.forEach((ch, i) => { const q = P(L.bays[i]); if (!q) return;
        g.fillStyle = ch.state === 'FREE' ? '#bbf7d0' : ch.state === 'CHARGING' ? '#93c5fd' : ch.state === 'RESERVED' ? '#fde68a' : '#fecaca';
        g.fillRect(q.x - sq / 2, q.y - sq / 2, sq, sq);
        if (ch.progress > 0) { g.fillStyle = '#2563eb'; g.fillRect(q.x - sq / 2, q.y + sq / 2 - sq * ch.progress, sq, sq * ch.progress); } });
      const lbl = `⚡ ${sv.chargingQ}/${sv.chargingCap}  ⏳ ${sv.waiting}  ~${sv.nextWaitMin ?? '–'} min`;
      g.font = '600 12px system-ui'; const tw = g.measureText(lbl).width + 14;
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = '#e2e8f0'; g.beginPath(); g.roundRect(c.x - tw / 2, c.y - r - 30, tw, 22, 8); g.fill(); g.stroke();
      g.fillStyle = '#0f172a'; g.textAlign = 'center'; g.fillText(lbl, c.x, c.y - r - 15);
    }

    const len = Math.max(7, 4.4 * ppm), wid = Math.max(4, 1.9 * ppm);
    for (const car of snap.cars) {
      const p = P({ x: car.x, y: car.y }); if (!p) continue;
      const fill = this.mode === 'truth' ? (car.kind === 'CHARGER' ? '#16a34a' : '#7c3aed')
        : car.q === 'CHARGING' ? '#16a34a' : car.q === 'WAITING' ? '#f59e0b' : '#64748b';
      g.save(); g.translate(p.x, p.y); g.rotate(-car.h);                                    // canvas y is down
      g.fillStyle = fill; g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(-len / 2, -wid / 2, len, wid, Math.min(3, wid / 2)); g.fill(); g.stroke();
      if (car.tag === 'OTHER_JOBS' || car.tag === 'RENEGED' || car.tag === 'BALKED') { g.strokeStyle = car.tag === 'OTHER_JOBS' ? '#7c3aed' : '#dc2626'; g.lineWidth = 2; g.strokeRect(-len / 2 - 2, -wid / 2 - 2, len + 4, wid + 4); }
      g.restore();
    }
  }
}
```

### TASK 5.3 — Hook + Demo button + panel
Create under `apps/web/src/features/map-demo/ui/`:

`useMapDemo.ts` (outline you must complete):
```ts
// state: 'idle' | 'loading' | 'running' | 'error'
// start(adapter): GET `${API}/api/demo/bootstrap?lat&lng&limit=3` using adapter.center();
//   new DemoEngine(stations); new DemoCanvas(adapter, engine);
//   rAF loop: dt = min(now-last, 250ms)/1000; if (!paused) engine.step(dt); canvas.draw();
//   UI snapshot: every 250 ms setState(engine.snapshot().stations) + keep last 50 engine.log entries.
// stop(): cancel rAF, canvas.dispose(), restore normal station markers.
// controls: pause/resume, setSpeed(1|2|5|10), setArrival(meanS), setChargerShare(0..1), reset(), forceSpawn(kind), toggleFault(stationId, idx), rushHour(): arrivalMeanS /= 3 for 60 sim-seconds then restore, colorMode.
// Clean up on unmount. Never keep timers alive after stop().
```
`DemoButton.tsx`: shadcn `Button` with a Phosphor `PlayCircle` icon labelled **Demo**, placed on the driver map toolbar (top-right, below any existing controls). When running, it becomes **Stop demo**. While loading show a spinner.

`DemoPanel.tsx` (light theme, shadcn `Card`, draggable is optional, max-width 360 px, bottom-left on desktop, bottom sheet on mobile):
- Header: **Simulated demo** badge + "How it works" popover (the assumptions in section 1C).
- Controls row: Play/Pause, Speed `1× 2× 5× 10×`, Reset, **Rush hour**, **Add charging car**, **Add visitor**, Switch **"Show true intent"** (ColorMode).
- Sliders: Arrival rate, % of cars that really charge.
- Per station card (one per station): name; clearance + radius line ("Fence 22 m · road clearance 29 m"); charger chips (green free / amber reserved / blue charging with progress / red fault; click a chip to toggle a fault); **Charging queue `2/3`**; **Waiting queue `4`** with **estimated wait for the next car `~12 min`**, average waited, "x% of queued cars actually charge"; counters: served, other-jobs discarded, left (tired), balked.
- Event log (`role="log"`, `aria-live="polite"`, newest first, max 50 lines, colour-coded chips).
- Legend for car colours.
- Respect `prefers-reduced-motion` (no pulsing, reduce update to 2 Hz).

While demo runs: set the normal station markers layer to 35% opacity and non-interactive (do not remove them), show the label **"Simulated demo"** top-centre of the map.

### Scenario presets (Select in the panel; implement as small functions calling the engine API)
1. **Empty → first car** (default).
2. **Free charger:** one charging car arrives and goes straight to the Charging queue.
3. **Fill all chargers** (spawn `chargers` charging cars 4 s apart).
4. **Overflow:** fill chargers, then 3 more cars → Waiting queue grows.
5. **Other jobs:** one charging car + two visitors; when the charger frees the visitor is offered, never plugs in, is discarded, and the next car is offered.
6. **Tired of waiting:** patience 10 s, chargers busy → car leaves and disappears from the waiting list.
7. **Waiting area full (balk):** many cars, small fence → cars leave immediately.
8. **Charger fault:** a charging session is interrupted; the car returns to the **front** of the Waiting queue.
9. **Rush hour:** arrival rate ×3 for 60 simulated seconds.
10. **Visitors only:** 100% stayers: no charger ever used; queue stays empty; cars park and leave.
11. **Shrunken fence:** pick a station with `clearanceM < 20` to show the fence radius shrinking to clear the road (and `centerShifted` badge when relevant).

**CHECK (manual, record a 30-second screen capture path in `docs/map-demo-qa.md`):** press Demo → fences appear, stations empty → first car drives along the road, enters the fence, joins the Charging queue, plugs in → continue through presets 3-11. Confirm visually: cars stay on the road, never overlap, queue counters match the cars shown, waiting minutes change as sessions progress, `Stop demo` restores the normal map with no console errors.

---

## 8. PHASE 6 — HARDENING AND QUALITY GATES

1. **Perf proof:** add `docs/map-perf.md` with the measured numbers from Tasks 1.2 and 2.3 plus a Chrome Performance capture of the demo with 100 cars (target ≥ 55 fps; if lower, skip drawing parked cars with `ppm < 0.4` as single pixels, and cull items outside the viewport).
2. **Lint/types:** `tsc --noEmit`, ESLint, Vitest all green in `apps/web` and `apps/api`.
3. **API tests (Vitest + Supertest):** tile endpoint returns 400 on bad params, 304 on matching ETag, `live` aligns with static ids length; `/api/demo/bootstrap` returns 400 on bad query.
4. **Security:** both new routers behind the rate limiter; no user input reaches SQL except through tagged `$queryRaw` templates; Overpass/OSRM URLs only from env.
5. **Docs:** `docs/map-demo.md` (how the geofence math works, how to add stations, the 15 rules traceability table below, how to self-host OSRM later).
6. **Honest labelling:** the words "Simulated demo" visible any time the engine runs.

---

## 9. TRACEABILITY — every requirement from the brief → where it is satisfied

| # | Requirement | Implemented in | Proven by |
|---|---|---|---|
| 0 | Stations render in ms (DB/Redis, efficient render) | Tasks 1.1–1.4, 2.2, 2.3 | perf numbers in `docs/map-perf.md` |
| 1 | Fence never hits a road; shrinks on contact | Task 3.2 (`computeGeofence`) + bootstrap CHECK | clearance assertion; preset 11 |
| 2 | Two queues: charging + waiting | Task 4.5 `chargingQ`, `waitingQ` | tests 2, 3 |
| 3 | Cars follow roads to the station | Task 3.3 OSRM routes, engine `route`/`offsetLeft` | manual QA |
| 4–5 | Charging cars vs stay-only cars (2 kinds) | `CarKind`, `chargerShare` | test 4, preset 10 |
| 6 | No overlap | spacing, lanes, `safeGap`, `hardSep` guard | test 2 (min distance ≥ 3.0 m) |
| 7 | Stations rendered in the demo | Task 5.2 canvas + panel | manual QA |
| 8 | Stations initially empty | constructor (first arrival delayed), reset | test 1 |
| 9 | Car shows in fence, then to charging queue if charger available | `onEnterFence` → `joinCharging` | tests 2, 3 |
| 10 | Charging queue cap = number of chargers | free-charger-only entry | test 2 asserts ≤ 3 every tick |
| 11 | All chargers full → waiting queue | `onEnterFence` else-branch | test 3 |
| 12 | Waiting car that is not charging is discarded as "other jobs" | `discardOtherJobs` + grace timer | test 4 |
| 13 | Waiting time + number waiting | `estimateWaits`, panel | UI + preset 4 |
| 14 | Tired car leaves, removed from waiting queue | renege in `stationLogic` | test 5 |
| 15 | All scenarios covered | presets 1–11, faults, rush, balk | QA doc |

---

## 10. FINAL REPORT FORMAT (what you send back when done)

1. Table of tasks with status (DONE / BLOCKED + reason).
2. The perf numbers (ms, KB, fps).
3. Output of `vitest run`.
4. List of files created/modified.
5. Anything you had to assume that is not in this file.
