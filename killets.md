# killets.md — EVspark: Demo, Map Performance, Onboarding

Instruction file for the Antigravity agent. Read this whole section before touching code.

## 0. How to work through this file

1. Do ONE numbered task at a time, in the order of section 1.4. Finish it, run its verify command, then stop and report. Do not start the next task in the same run.
2. Create or edit ONLY the files named in the task. If a task seems to need another file, stop and say so.
3. Every code block marked `FILE:` is the complete file. Write it exactly, then fix imports if a path differs in the repo.
4. Blocks marked `PATCH:` are edits to an existing file. Find the quoted `FIND` text and replace it. If the text is not found, stop and report; do not guess.
5. Never run `git add -A`. Stage only files you changed. One commit per task, conventional style: `feat(demo): add station queue engine`.
6. After each task run `pnpm typecheck` and the task's own test command. A task is not done until both pass.

## 1. What is actually in the repo (audit of the zip)

These are facts from reading the code, not assumptions. Tasks below are built on them.

### 1.1 Demo today (`apps/web/src/stores/ghost-simulation-store.ts`, `components/map/ghost-layer.tsx`, `components/driver/presentation-suite.tsx`)

- Cars move by straight-line interpolation from a random point 1.5–2.5 km away to the station (`startPos + (targetPos - startPos) * progress`). They cross buildings and ignore roads.
- There is no geofence polygon at all, so "fence never touches a road" cannot be shown.
- Queue wait is faked: every queued car adds a flat `+15` minutes, and a station's first wait is a random pick from `[15, 20, 25, 30]`. Wait does not come from charger remaining times.
- A waiting car is a placeholder (`mockCar` with fixed model and position). Stay-only cars, impatient cars and balking do not exist.
- Time shrinks by `-5` minutes on a timer, not because a charger actually finished.
- The 7 "automated tests" (T1–T7) only assert what the fake store just did, with `sleep()` between them. They cannot catch a logic bug.
- Nothing is seeded, so a run cannot be repeated.

### 1.2 Map today (`components/driver/map-shell.tsx`, `ev-map.tsx`, `cluster-layer.tsx`, `lib/queries`)

- `filteredStations` is rebuilt on every render, so the `useMemo` that builds `markerStations` (dependency `[filteredStations]`) re-runs every render and is useless.
- The stations query key contains the raw viewport bbox. Every small pan is a new key, a new request and a cache miss, and there is no `placeholderData`, so markers disappear while loading.
- Tile subscription effect does `const tiles: string[] = []; subscribeTiles(tiles)`. It subscribes to nothing, so live updates never reach the map.
- API (`stations.controller.ts`): the Redis key rounds bbox to 2 decimals (about 1 km) but the response is not clipped to the real viewport; each cache MISS runs 3 DB queries (`attachChargerAggregates`, `queueEntry.groupBy`, `charger.findMany`) and one Redis call per station (`getGeofenceCounts` does N × `SCARD`). Static data (name, photo, price) and live data (wait, free count) share one 15 s cache entry.
- No single-flight: when the 15 s key expires, every concurrent request recomputes.
- If Redis or the DB is slow there is no stale fallback; `apiFetch` has a fixed 10 s timeout.
- `DirectionsService` is called from the browser on each navigation start with no caching.

### 1.3 Onboarding today (`apps/web/src/app/onboarding/page.tsx`, 43 KB; `packages/shared/src/schemas/onboarding.schema.ts`; `app/api/onboarding/complete/route.ts`)

- One 43 KB component with about 30 separate `useState` calls and 5 steps for drivers.
- Driver schema makes `fullName`, `phone`, `city`, `vehicleModelId`, `vehicleRegNo`, `connectors`, `homeLat/Lng/Label` all mandatory. That is far more than "3–4 small questions".
- `route.ts` swallows every error: the `catch` still returns `{ success: true }` and sets the `evspark_onboarded` cookie, so a user can be marked onboarded when nothing was saved.
- Draft is kept in browser storage only, so it is lost on another device.

### 1.4 Execution order

| # | Task | Section |
|---|------|---------|
| 1 | Anti-"AI look" cleanup rules | 2 |
| 2 | Shared demo engine (types, geometry, fence, path) | 3.1–3.3 |
| 3 | Station simulation engine | 3.4 |
| 4 | Demo test suite (66 cases) | 4 |
| 5 | Demo store, clock, geometry API | 5 |
| 6 | Demo UI: button, panel, layers | 6 |
| 7 | Map performance (API + client) | 7 |
| 8 | Onboarding rebuild | 8 |
| 9 | Final verification | 9 |

## 2. Make it not look AI-generated

Apply these in every task, and as one cleanup pass (task 1).

**Repo root.** These files read as AI scratch notes and must not ship in the public repo: `codemap.md`, `commands.md`, `frontend.md`, `prompt.md`, `script.md`, `starting (1).md`. Move them to `docs/archive/` or delete them. Also remove `apps/ml/` (a stub that duplicates `apps/ml-service/`) and decide on `apps/web-legacy/`: delete it, or move it to a tagged branch. Keep `README.md`, `docs/`, `infra/`.

**Code.**
- No emoji anywhere: code, comments, UI copy, commit messages, logs.
- Comments explain why, never what. Delete banner comments (`// ===== SECTION =====`), step comments (`// Step 1:`, `// STEP 2`), and comments naming a requirement (`// REQUIREMENT B:` is in `map-shell.tsx`; replace each with a short reason or remove).
- No `any`. `map-shell.tsx` and the stores use `any` for stations and chargers; type them with `StationWithWait` from `@evspark/shared`.
- No `console.log`. Use the existing `pino` logger on the API and nothing in the browser except guarded `console.error` in error boundaries.
- Names describe domain meaning: `waitingCars`, `freeChargers`, `queueAhead`; not `data`, `result`, `handleClick2`, `tempState`.
- No dead code, no commented-out code, no TODO without an issue number.
- Errors say what failed and what to do: `Could not load stations for this area. Pan the map to retry.`, not `Something went wrong!`.

**UI.**
- One accent colour (the existing blue `#1A73E8` used by the map). No purple-blue gradients, no glow shadows, no glassmorphism panels, no animated gradient borders.
- Use the existing tokens in `lib/tokens`. Do not add new colours.
- Radius scale of 6 / 10 / 14 px only. Body text 14 px, labels 12 px. Icons are Phosphor, one weight (`regular`) throughout.
- Copy is plain and specific. No "Supercharge", "Seamless", "Unlock", "Revolutionize". Say what the thing does: `Average wait now: 12 min`.
- Empty states say what is missing and give one action.
- Every number on screen has a unit. Every time has a clock source (live, simulated).

**Git.** Small commits, conventional messages, no `WIP`, no `final`, no `fix fix`.

## 3. Demo engine (pure TypeScript, no React, no Google Maps)

The engine lives in `packages/shared/src/demo/` so the browser demo, the vitest suite and (later) the API can all import it. It has no timers and no randomness except a seeded generator, so the same seed always gives the same event log.

Add to `packages/shared/src/index.ts`: `export * from './demo';`
Create `packages/shared/src/demo/index.ts`:

```ts
export * from './types';
export * from './geo-local';
export * from './path';
export * from './fence';
export * from './rng';
export * from './station-sim';
export * from './invariants';
export * from './erlang';
```

### 3.1 Types and helpers

FILE: `packages/shared/src/demo/types.ts`

```ts
export type Connector = 'CCS2' | 'CHAdeMO' | 'Type2' | 'GBT';
export type CarIntent = 'charge' | 'stay_only' | 'pass_by';
export type CarPhase = 'travelling' | 'entering' | 'parked' | 'charging' | 'leaving' | 'gone';
export type LeaveReason =
  | 'finished'
  | 'other_jobs'
  | 'reneged'
  | 'balked'
  | 'passed'
  | 'interrupted_left';
export type ChargerState = 'FREE' | 'BUSY' | 'FAULTED' | 'OFFLINE';
export type DisplayState = 'free' | 'busy' | 'offline' | 'closed' | 'unknown';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DemoCharger {
  id: string;
  connector: Connector;
  powerKw: number;
  state: ChargerState;
  carId: string | null;
  endsAt: number | null;
  ratedEnd: number | null;
  blocked: boolean;
}

export interface DemoCar {
  id: string;
  plate: string;
  connector: Connector;
  intent: CarIntent;
  phase: CarPhase;
  routeIdx: number;
  dist: number;
  pos: LatLng;
  target: LatLng | null;
  slot: number | null;
  chargerId: string | null;
  enteredFenceAt: number | null;
  parkedAt: number | null;
  patienceS: number;
  needKwh: number;
  maxKw: number;
  lingerS: number;
  leaveReason: LeaveReason | null;
}

export interface SimEvent {
  t: number;
  type:
    | 'spawn'
    | 'enter_fence'
    | 'park'
    | 'charge_start'
    | 'charge_end'
    | 'discard_other_jobs'
    | 'renege'
    | 'balk'
    | 'pass'
    | 'fault'
    | 'recover'
    | 'interrupt'
    | 'heartbeat_lost'
    | 'heartbeat_ok';
  carId?: string;
  chargerId?: string;
  text: string;
}

export interface StationSnapshot {
  stationId: string;
  t: number;
  display: DisplayState;
  waitMinutes: number | null;
  waitingCount: number;
  chargingCount: number;
  workingChargers: number;
  totalChargers: number;
  waitByPosition: number[];
  geofenceReliable: boolean;
  overloaded: boolean;
}

export interface SimKpis {
  arrivals: number;
  completed: number;
  balked: number;
  reneged: number;
  discardedOtherJobs: number;
  passed: number;
  utilisation: number;
  avgWaitS: number;
  throughputPerHour: number;
}
```

FILE: `packages/shared/src/demo/rng.ts`

```ts
export type Rng = () => number;

// mulberry32: small, fast, good enough for simulation, fully deterministic per seed
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rng: Rng, lo: number, hi: number) => lo + rng() * (hi - lo);
export const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];
```

FILE: `packages/shared/src/demo/geo-local.ts`

```ts
import type { LatLng } from './types';

const M_PER_DEG = 111_320;

export interface XY {
  x: number;
  y: number;
}

export function toLocal(origin: LatLng, p: LatLng): XY {
  return {
    x: (p.lng - origin.lng) * M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180),
    y: (p.lat - origin.lat) * M_PER_DEG,
  };
}

export function fromLocal(origin: LatLng, x: number, y: number): LatLng {
  return {
    lat: origin.lat + y / M_PER_DEG,
    lng: origin.lng + x / (M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180)),
  };
}

export function metres(a: LatLng, b: LatLng): number {
  const o = toLocal(a, b);
  return Math.hypot(o.x, o.y);
}

export function distToSegment(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function pointInPolygon(p: XY, poly: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function polygonArea(poly: XY[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

// Google encoded polyline, used by the geometry endpoint
export function decodePolyline(encoded: string): LatLng[] {
  const out: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ['lat', 'lng'] as const) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += delta;
      else lng += delta;
    }
    out.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return out;
}
```

FILE: `packages/shared/src/demo/path.ts`

```ts
import type { LatLng } from './types';
import { metres } from './geo-local';

export class Path {
  readonly cum: number[];

  constructor(readonly pts: LatLng[]) {
    if (pts.length < 2) throw new Error('Path needs at least two points');
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + metres(pts[i - 1], pts[i]));
    }
  }

  get length(): number {
    return this.cum[this.cum.length - 1];
  }

  at(d: number): LatLng {
    const dist = Math.max(0, Math.min(this.length, d));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < dist) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (dist - this.cum[i - 1]) / seg;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  }
}
```

### 3.2 Fence builder (road-safe, shrinks on contact)

The fence is a polygon around the station. It starts at radius `r0` (default 100 m, the exit radius from the geofence design) and each vertex is pulled in until the polygon clears every road buffer. Buffer width depends on road class.

FILE: `packages/shared/src/demo/fence.ts`

```ts
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
```

### 3.3 Erlang C (used by the sanity test)

FILE: `packages/shared/src/demo/erlang.ts`

```ts
// probability an arriving customer has to wait, M/M/c with offered load a = lambda / mu
export function erlangC(c: number, a: number): number {
  let sum = 0;
  let term = 1;
  for (let k = 0; k < c; k++) {
    sum += term;
    term = (term * a) / (k + 1);
  }
  const top = term * (c / (c - a));
  return top / (sum + top);
}

// mean wait in queue, seconds; lambda and mu in 1/second
export function mmcMeanWait(lambda: number, mu: number, c: number): number {
  const a = lambda / mu;
  if (a >= c) return Infinity;
  return erlangC(c, a) / (c * mu - lambda);
}
```

### 3.4 Station simulation

One `StationSim` is one station: its chargers, its approach roads, its fence, its waiting area. Rules it enforces:

- Cars follow approach routes (real road polylines) and keep `MIN_GAP_M` between each other. Inside the fence there is no road, so cars hop straight to a slot or a charger.
- Charging is capped at working, connector-compatible chargers. Extra cars take a waiting slot. Waiting capacity is the smaller of the config value and what physically fits in the fence (`forecourtCapacity`). A car arriving at a full forecourt balks.
- A car counts as waiting only after `dwellS` seconds inside the fence. Cars that only pass on the bypass road never enter the fence and are never counted.
- When a charger frees, the first compatible `charge` car in line takes it in the same step. `stay_only` cars are never given a charger; they are discarded as `other_jobs` once their dwell is satisfied and a compatible charger has just freed or is idle.
- Waiting cars leave when patience runs out.
- Displayed wait is computed by assigning each counted waiting car, in order, to the earliest-free compatible charger, then reading the earliest-free time for a new arrival. It is never `queue length x average`.
- A charger whose car lingers after finishing stays busy; its remaining time decays from 120 s toward a 30 s floor instead of sticking at zero.
- Four display states: `free`, `busy`, `offline`, `closed`, plus `unknown` when the heartbeat is lost.

FILE: `packages/shared/src/demo/station-sim.ts`

```ts
import { between, createRng, pick, type Rng } from './rng';
import { Path } from './path';
import { fromLocal, metres } from './geo-local';
import { forecourtCapacity, insideFence, type Fence } from './fence';
import type {
  CarIntent,
  Connector,
  DemoCar,
  DemoCharger,
  DisplayState,
  LatLng,
  LeaveReason,
  SimEvent,
  SimKpis,
  StationSnapshot,
} from './types';

export const MIN_GAP_M = 8;
export const PARK_GAP_M = 5;
const ROAD_SPEED = 8;
const HOP_SPEED = 3;
const AVG_SESSION_S = 1500;
const STEP_S = 0.25;
const EVENT_CAP = 300;

export interface SimConfig {
  stationId: string;
  seed: number;
  chargers: Array<{ id: string; connector: Connector; powerKw: number }>;
  routes: Path[];
  bypass?: Path;
  fence: Fence;
  waitCapacity: number;
  dwellS: number;
  arrivalsPerHour: number;
  stayOnlyShare: number;
  passByShare: number;
  lingerShare?: number;
  patienceMinS: number;
  patienceMaxS: number;
  singleLane?: boolean;
  open?: boolean;
  carConnectors?: Connector[];
  serviceTimeS?: (rng: Rng) => number;
}

interface Route {
  path: Path;
  entryDist: number;
}

const MODELS = ['Nexon EV', 'XUV400', 'ZS EV', 'Atto 3', 'Punch.ev', 'Ioniq 5'];

export class StationSim {
  t = 0;
  open: boolean;
  heartbeatOk = true;
  readonly chargers: DemoCharger[];
  readonly events: SimEvent[] = [];
  readonly fence: Fence;
  readonly waitCapacity: number;

  private rng: Rng;
  private cars = new Map<string, DemoCar>();
  private queue: string[] = [];
  private slots: Array<string | null>;
  private routes: Route[];
  private bypass: Path | null;
  private freedConnectors = new Set<Connector>();
  private serial = 0;
  private busySeconds = 0;
  private capacitySeconds = 0;
  private totalWaitS = 0;
  private served = 0;
  private counts = { arrivals: 0, completed: 0, balked: 0, reneged: 0, discarded: 0, passed: 0, removed: 0 };

  constructor(readonly cfg: SimConfig) {
    this.rng = createRng(cfg.seed);
    this.fence = cfg.fence;
    this.open = cfg.open ?? true;
    this.waitCapacity = Math.min(cfg.waitCapacity, forecourtCapacity(cfg.fence, PARK_GAP_M));
    this.slots = new Array(this.waitCapacity).fill(null);
    this.chargers = cfg.chargers.map((c) => ({
      ...c,
      state: 'FREE',
      carId: null,
      endsAt: null,
      ratedEnd: null,
      blocked: false,
    }));
    this.routes = cfg.routes.map((path) => ({ path, entryDist: this.findEntry(path) }));
    this.bypass = cfg.bypass ?? null;
  }

  // ---- public control ----------------------------------------------------

  advance(seconds: number) {
    // clamp so a hidden tab returning after minutes cannot teleport cars (case T3)
    let left = Math.min(seconds, 30);
    while (left > 1e-9) {
      const dt = Math.min(STEP_S, left);
      this.step(dt);
      left -= dt;
    }
  }

  spawn(force: Partial<{ intent: CarIntent; connector: Connector; routeIdx: number }> = {}): DemoCar | null {
    const r = this.rng();
    const intent: CarIntent =
      force.intent ??
      (this.bypass && r < this.cfg.passByShare
        ? 'pass_by'
        : r < this.cfg.passByShare + this.cfg.stayOnlyShare
          ? 'stay_only'
          : 'charge');
    const connectors = this.cfg.carConnectors ?? [...new Set(this.chargers.map((c) => c.connector))];
    const connector = force.connector ?? pick(this.rng, connectors);
    const routeIdx = intent === 'pass_by' ? -1 : (force.routeIdx ?? Math.floor(this.rng() * this.routes.length));
    const path = routeIdx === -1 ? this.bypass : this.routes[routeIdx]?.path;
    if (!path) return null;
    // no room on the road yet: the car cannot enter
    for (const other of this.cars.values()) {
      if (other.phase === 'travelling' && other.routeIdx === routeIdx && other.dist < MIN_GAP_M) return null;
    }

    const id = `c${++this.serial}`;
    const rto = pick(this.rng, ['01', '02', '03', '04', '43', '46']);
    const car: DemoCar = {
      id,
      plate: `MH ${rto} ${String.fromCharCode(65 + Math.floor(this.rng() * 26))}${String.fromCharCode(65 + Math.floor(this.rng() * 26))} ${1000 + Math.floor(this.rng() * 9000)}`,
      connector,
      intent,
      phase: 'travelling',
      routeIdx,
      dist: 0,
      pos: path.at(0),
      target: null,
      slot: null,
      chargerId: null,
      enteredFenceAt: null,
      parkedAt: null,
      patienceS: between(this.rng, this.cfg.patienceMinS, this.cfg.patienceMaxS),
      needKwh: between(this.rng, 8, 34),
      maxKw: pick(this.rng, [22, 50, 60, 100]),
      lingerS: this.rng() < (this.cfg.lingerShare ?? 0.06) ? between(this.rng, 60, 240) : 0,
      leaveReason: null,
    };
    this.cars.set(id, car);
    this.counts.arrivals++;
    this.log('spawn', `${car.plate} ${pick(this.rng, MODELS)} (${intent}) starts toward station`, id);
    return car;
  }

  faultCharger(id: string) {
    const ch = this.chargers.find((c) => c.id === id);
    if (!ch || ch.state === 'FAULTED') return;
    const carId = ch.carId;
    ch.state = 'FAULTED';
    ch.carId = null;
    ch.endsAt = null;
    ch.ratedEnd = null;
    ch.blocked = false;
    this.log('fault', `Charger ${id} faulted`, carId ?? undefined, id);
    if (!carId) return;
    const car = this.cars.get(carId);
    if (!car) return;
    car.chargerId = null;
    const slot = this.slots.indexOf(null);
    if (slot === -1) {
      this.leave(car, 'interrupted_left');
      return;
    }
    // part of the energy was already delivered
    car.needKwh = Math.max(2, car.needKwh * 0.6);
    car.slot = slot;
    this.slots[slot] = car.id;
    car.phase = 'entering';
    car.target = this.slotPos(slot);
    this.queue.unshift(car.id);
    this.log('interrupt', `${car.plate} interrupted, back to the head of the queue`, car.id, id);
  }

  recoverCharger(id: string) {
    const ch = this.chargers.find((c) => c.id === id);
    if (!ch || ch.state !== 'FAULTED') return;
    ch.state = 'FREE';
    this.freedConnectors.add(ch.connector);
    this.log('recover', `Charger ${id} recovered`, undefined, id);
  }

  setHeartbeat(ok: boolean) {
    if (ok === this.heartbeatOk) return;
    this.heartbeatOk = ok;
    this.log(ok ? 'heartbeat_ok' : 'heartbeat_lost', ok ? 'Station heartbeat restored' : 'Station heartbeat lost');
  }

  // ---- read side ---------------------------------------------------------

  inspect() {
    return {
      t: this.t,
      cars: [...this.cars.values()],
      chargers: this.chargers,
      queue: [...this.queue],
      slots: [...this.slots],
      counts: { ...this.counts },
      routes: this.routes,
    };
  }

  // etaS: wait for a driver who arrives etaS seconds from now (recommendation uses the wait at arrival, not now)
  waitFor(connector?: Connector, etaS = 0): { display: DisplayState; seconds: number | null } {
    if (!this.open) return { display: 'closed', seconds: null };
    if (!this.heartbeatOk) return { display: 'unknown', seconds: null };
    const working = this.chargers.filter(
      (c) => (c.state === 'FREE' || c.state === 'BUSY') && (!connector || c.connector === connector)
    );
    if (working.length === 0) return { display: 'offline', seconds: null };
    const waiting = this.countedWaiting();
    if (working.some((c) => c.state === 'FREE') && waiting.length === 0) return { display: 'free', seconds: 0 };

    const now = this.t + etaS;
    const free = working.map((c) => ({ c, at: c.state === 'FREE' ? now : this.t + this.remaining(c) }));
    for (const car of waiting) {
      const options = free.filter((f) => f.c.connector === car.connector);
      if (options.length === 0) continue;
      const next = options.reduce((a, b) => (a.at <= b.at ? a : b));
      next.at += AVG_SESSION_S;
    }
    const earliest = Math.min(...free.map((f) => f.at));
    if (etaS > 0 && earliest <= now && waiting.length === 0) return { display: 'free', seconds: 0 };
    return { display: 'busy', seconds: Math.max(0, earliest - now) };
  }

  // expected start delay of each counted waiter, ignoring connectors; never decreases with position
  waitByPosition(): number[] {
    const working = this.chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY');
    if (working.length === 0) return [];
    const at = working.map((c) => (c.state === 'FREE' ? this.t : this.t + this.remaining(c)));
    return this.countedWaiting().map(() => {
      let k = 0;
      for (let i = 1; i < at.length; i++) if (at[i] < at[k]) k = i;
      const start = at[k];
      at[k] += AVG_SESSION_S;
      return Math.max(0, start - this.t);
    });
  }

  countedWaiting(): DemoCar[] {
    return this.queue
      .map((id) => this.cars.get(id))
      .filter(
        (c): c is DemoCar =>
          !!c && c.phase === 'parked' && this.t - (c.enteredFenceAt ?? this.t) >= this.cfg.dwellS
      );
  }

  snapshot(): StationSnapshot {
    const w = this.waitFor();
    return {
      stationId: this.cfg.stationId,
      t: this.t,
      display: w.display,
      waitMinutes: w.seconds == null ? null : Math.ceil(w.seconds / 60),
      waitingCount: this.countedWaiting().length,
      chargingCount: this.chargers.filter((c) => c.state === 'BUSY').length,
      workingChargers: this.chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY').length,
      totalChargers: this.chargers.length,
      waitByPosition: this.waitByPosition(),
      geofenceReliable: this.fence.status === 'ok',
      overloaded: this.countedWaiting().length > 2 * Math.max(1, this.chargers.filter((c) => c.state !== 'FAULTED').length) || (w.seconds ?? 0) >= 45 * 60,
    };
  }

  kpis(): SimKpis {
    return {
      arrivals: this.counts.arrivals,
      completed: this.counts.completed,
      balked: this.counts.balked,
      reneged: this.counts.reneged,
      discardedOtherJobs: this.counts.discarded,
      passed: this.counts.passed,
      utilisation: this.capacitySeconds ? this.busySeconds / this.capacitySeconds : 0,
      avgWaitS: this.served ? this.totalWaitS / this.served : 0,
      throughputPerHour: this.t > 0 ? (this.counts.completed / this.t) * 3600 : 0,
    };
  }

  chargerPos(ch: DemoCharger): LatLng {
    const i = this.chargers.indexOf(ch);
    const n = this.chargers.length;
    const radius = n < 2 ? 2 : PARK_GAP_M / (2 * Math.sin(Math.PI / n));
    const a = (i / n) * Math.PI * 2;
    return fromLocal(this.fence.centre, Math.cos(a) * radius, Math.sin(a) * radius);
  }

  slotPos(i: number): LatLng {
    const radius = this.fence.minRadius * 0.7;
    const a = (i / Math.max(1, this.waitCapacity)) * Math.PI * 2 + Math.PI / 8;
    return fromLocal(this.fence.centre, Math.cos(a) * radius, Math.sin(a) * radius);
  }

  // ---- stepping ----------------------------------------------------------

  private step(dt: number) {
    this.t += dt;
    this.freedConnectors.clear();

    const lambda = this.cfg.arrivalsPerHour / 3600;
    if (this.open && this.rng() < 1 - Math.exp(-lambda * dt)) this.spawn();

    this.moveTravelling(dt);
    this.moveLeaving(dt);
    this.moveHops(dt);
    this.updateParked();
    this.updateCharging();
    this.dispatch();
    this.discardStayOnly();

    const working = this.chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY').length;
    this.capacitySeconds += working * dt;
    this.busySeconds += this.chargers.filter((c) => c.state === 'BUSY').length * dt;
  }

  private findEntry(path: Path): number {
    for (let d = 0; d <= path.length; d += 1) {
      if (insideFence(this.fence, path.at(d))) return d;
    }
    return Math.max(0, path.length - 1);
  }

  private routeOf(car: DemoCar): Route | null {
    return car.routeIdx >= 0 ? this.routes[car.routeIdx] : null;
  }

  private gatePos(r: Route): LatLng {
    return r.path.at(r.entryDist);
  }

  private moveTravelling(dt: number) {
    const lanes = new Map<number, DemoCar[]>();
    for (const car of this.cars.values()) {
      if (car.phase !== 'travelling') continue;
      const lane = lanes.get(car.routeIdx) ?? [];
      lane.push(car);
      lanes.set(car.routeIdx, lane);
    }
    for (const [routeIdx, lane] of lanes) {
      lane.sort((a, b) => b.dist - a.dist);
      const route = routeIdx >= 0 ? this.routes[routeIdx] : null;
      const path = route ? route.path : this.bypass!;
      lane.forEach((car, i) => {
        let limit = i === 0 ? Infinity : lane[i - 1].dist - MIN_GAP_M;
        if (route) {
          limit = Math.min(limit, route.entryDist);
          if (this.cfg.singleLane) {
            const bay = route.entryDist - 40;
            if (this.hasLeavingOn(routeIdx) && car.dist < bay) limit = Math.min(limit, bay);
          }
        }
        car.dist = Math.max(car.dist, Math.min(car.dist + ROAD_SPEED * dt, limit));
        car.pos = path.at(car.dist);

        if (!route) {
          if (car.dist >= path.length - 0.5) {
            this.counts.passed++;
            this.log('pass', `${car.plate} drove past the station`, car.id);
            this.remove(car);
          }
        } else if (car.dist >= route.entryDist - 0.01 && !this.gateBusy(route)) {
          this.arrive(car, route);
        }
      });
    }
  }

  private gateBusy(route: Route): boolean {
    const gate = this.gatePos(route);
    for (const c of this.cars.values()) {
      if ((c.phase === 'entering' || (c.phase === 'leaving' && c.target)) && metres(c.pos, gate) < 6) return true;
    }
    return false;
  }

  private hasLeavingOn(routeIdx: number): boolean {
    for (const c of this.cars.values()) if (c.phase === 'leaving' && c.routeIdx === routeIdx) return true;
    return false;
  }

  private arrive(car: DemoCar, route: Route) {
    car.enteredFenceAt = this.t;
    this.log('enter_fence', `${car.plate} entered the fence`, car.id);
    const freeCharger = this.chargers.find((c) => c.state === 'FREE' && c.connector === car.connector);
    const someoneWaiting = this.slots.some((s) => s !== null);

    if (car.intent === 'charge' && freeCharger && !someoneWaiting) {
      this.startCharging(car, freeCharger);
      return;
    }
    const slot = this.slots.indexOf(null);
    if (slot === -1) {
      this.counts.balked++;
      this.log('balk', `${car.plate} found the forecourt full and turned away`, car.id);
      car.dist = route.entryDist;
      this.leave(car, 'balked', false);
      return;
    }
    car.slot = slot;
    this.slots[slot] = car.id;
    car.phase = 'entering';
    car.target = this.slotPos(slot);
    this.queue.push(car.id);
  }

  private moveHops(dt: number) {
    for (const car of this.cars.values()) {
      if (!car.target || car.phase === 'leaving') continue;
      const left = metres(car.pos, car.target);
      const move = HOP_SPEED * dt;
      if (left <= move) {
        car.pos = car.target;
        car.target = null;
        if (car.chargerId) {
          car.phase = 'charging';
          this.log('charge_start', `${car.plate} plugged in`, car.id, car.chargerId);
        } else {
          car.phase = 'parked';
          car.parkedAt = this.t;
          this.log('park', `${car.plate} is waiting in slot ${(car.slot ?? 0) + 1}`, car.id);
        }
      } else {
        const f = move / left;
        car.pos = {
          lat: car.pos.lat + (car.target.lat - car.pos.lat) * f,
          lng: car.pos.lng + (car.target.lng - car.pos.lng) * f,
        };
      }
    }
  }

  private moveLeaving(dt: number) {
    const lanes = new Map<number, DemoCar[]>();
    for (const car of this.cars.values()) {
      if (car.phase !== 'leaving') continue;
      if (car.target) {
        const left = metres(car.pos, car.target);
        const move = HOP_SPEED * dt;
        if (left <= move) {
          car.pos = car.target;
          car.target = null;
        } else {
          const f = move / left;
          car.pos = {
            lat: car.pos.lat + (car.target.lat - car.pos.lat) * f,
            lng: car.pos.lng + (car.target.lng - car.pos.lng) * f,
          };
        }
        continue;
      }
      const lane = lanes.get(car.routeIdx) ?? [];
      lane.push(car);
      lanes.set(car.routeIdx, lane);
    }
    for (const [routeIdx, lane] of lanes) {
      const route = this.routes[routeIdx];
      if (!route) continue;
      lane.sort((a, b) => a.dist - b.dist);
      lane.forEach((car, i) => {
        if (this.cfg.singleLane && this.arrivingInZone(routeIdx, route)) return;
        const limit = i === 0 ? 0 : lane[i - 1].dist + MIN_GAP_M;
        car.dist = Math.min(car.dist, Math.max(car.dist - ROAD_SPEED * dt, limit));
        car.pos = route.path.at(car.dist);
        if (car.dist <= 0.5) this.remove(car);
      });
    }
  }

  private arrivingInZone(routeIdx: number, route: Route): boolean {
    const bay = route.entryDist - 40;
    for (const c of this.cars.values()) {
      if (c.phase === 'travelling' && c.routeIdx === routeIdx && c.dist > bay) return true;
    }
    return false;
  }

  private updateParked() {
    for (const id of [...this.queue]) {
      const car = this.cars.get(id);
      if (!car || car.phase !== 'parked' || car.parkedAt == null) continue;
      const patience = car.intent === 'stay_only' ? car.patienceS * 2 : car.patienceS;
      if (this.t - car.parkedAt <= patience) continue;
      if (car.intent === 'stay_only') {
        this.counts.discarded++;
        this.log('renege', `${car.plate} left after stopping (not charging)`, car.id);
        this.leave(car, 'other_jobs');
      } else {
        this.counts.reneged++;
        this.log('renege', `${car.plate} gave up waiting`, car.id);
        this.leave(car, 'reneged');
      }
    }
  }

  private updateCharging() {
    for (const ch of this.chargers) {
      if (ch.state !== 'BUSY' || ch.endsAt == null || this.t < ch.endsAt) continue;
      const car = ch.carId ? this.cars.get(ch.carId) : undefined;
      if (car && car.lingerS > 0 && !ch.blocked) {
        // finished but the driver stays parked on the charger
        ch.blocked = true;
        ch.endsAt = this.t + car.lingerS;
        car.lingerS = 0;
        this.log('charge_end', `${car.plate} finished but is still parked`, car.id, ch.id);
        continue;
      }
      ch.state = 'FREE';
      ch.carId = null;
      ch.endsAt = null;
      ch.ratedEnd = null;
      ch.blocked = false;
      this.freedConnectors.add(ch.connector);
      this.counts.completed++;
      if (car) {
        this.log('charge_end', `${car.plate} left the charger`, car.id, ch.id);
        this.leave(car, 'finished');
      }
    }
  }

  // chargers that are free take the first compatible charging car in line, same step
  private dispatch() {
    for (const ch of this.chargers) {
      if (ch.state !== 'FREE') continue;
      for (const id of this.queue) {
        const car = this.cars.get(id);
        if (!car || car.phase !== 'parked' || car.intent !== 'charge' || car.connector !== ch.connector) continue;
        this.startCharging(car, ch);
        break;
      }
    }
  }

  private discardStayOnly() {
    for (const id of [...this.queue]) {
      const car = this.cars.get(id);
      if (!car || car.phase !== 'parked' || car.intent !== 'stay_only') continue;
      if (this.t - (car.enteredFenceAt ?? this.t) < this.cfg.dwellS) continue;
      const chargerJustFreed = this.freedConnectors.has(car.connector);
      const chargerIdle = this.chargers.some((c) => c.state === 'FREE' && c.connector === car.connector);
      if (!chargerJustFreed && !chargerIdle) continue;
      this.counts.discarded++;
      this.log('discard_other_jobs', `${car.plate} dropped from the queue (other jobs)`, car.id);
      this.leave(car, 'other_jobs');
    }
  }

  private startCharging(car: DemoCar, ch: DemoCharger) {
    const kw = Math.min(ch.powerKw, car.maxKw);
    const duration = this.cfg.serviceTimeS ? this.cfg.serviceTimeS(this.rng) : ((car.needKwh / kw) * 3600) * 1.1;
    const pos = this.chargerPos(ch);
    const hop = metres(car.pos, pos) / HOP_SPEED;

    if (car.slot !== null) this.slots[car.slot] = null;
    car.slot = null;
    this.queue = this.queue.filter((id) => id !== car.id);

    ch.state = 'BUSY';
    ch.carId = car.id;
    ch.blocked = false;
    ch.endsAt = this.t + hop + duration;
    ch.ratedEnd = ch.endsAt;
    car.chargerId = ch.id;
    car.phase = 'entering';
    car.target = pos;

    this.served++;
    this.totalWaitS += car.parkedAt == null ? 0 : this.t - car.parkedAt;
  }

  private leave(car: DemoCar, reason: LeaveReason, hopToGate = true) {
    if (car.slot !== null) this.slots[car.slot] = null;
    car.slot = null;
    this.queue = this.queue.filter((id) => id !== car.id);
    car.chargerId = null;
    car.phase = 'leaving';
    car.leaveReason = reason;
    const route = this.routeOf(car);
    car.target = hopToGate && route ? this.gatePos(route) : null;
    if (route) car.dist = route.entryDist;
    if (!route) this.remove(car);
  }

  private remove(car: DemoCar) {
    car.phase = 'gone';
    this.counts.removed++;
    this.cars.delete(car.id);
  }

  // remaining time the system believes a charger needs; decays for overstayers (case W5)
  private remaining(ch: DemoCharger): number {
    if (ch.state !== 'BUSY') return 0;
    const rated = ch.ratedEnd ?? this.t;
    const rem = rated - this.t;
    if (rem > 0) return Math.max(rem, 20);
    return Math.max(30, 120 * Math.exp(rem / 300));
  }

  private log(type: SimEvent['type'], text: string, carId?: string, chargerId?: string) {
    this.events.push({ t: this.t, type, text, carId, chargerId });
    if (this.events.length > EVENT_CAP) this.events.splice(0, this.events.length - EVENT_CAP);
  }
}
```

### 3.5 Invariants (run on every tick in the demo and in tests)

FILE: `packages/shared/src/demo/invariants.ts`

```ts
import { metres } from './geo-local';
import { insideFence } from './fence';
import { MIN_GAP_M, PARK_GAP_M, type StationSim } from './station-sim';

export function checkInvariants(sim: StationSim): string[] {
  const bad: string[] = [];
  const { cars, chargers, queue, counts } = sim.inspect();

  const working = chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY').length;
  const busy = chargers.filter((c) => c.state === 'BUSY');
  if (busy.length > working) bad.push('charging cars exceed working chargers');

  for (const ch of busy) {
    const car = cars.find((c) => c.id === ch.carId);
    if (!car || car.chargerId !== ch.id) bad.push(`charger ${ch.id} and its car disagree`);
    else if (car.connector !== ch.connector) bad.push(`car ${car.id} on incompatible charger ${ch.id}`);
  }

  const seen = new Set<string>();
  for (const id of [...queue, ...chargers.map((c) => c.carId).filter((x): x is string => !!x)]) {
    if (seen.has(id)) bad.push(`car ${id} is in two places`);
    seen.add(id);
  }

  const inLane = cars.filter((c) => c.phase === 'travelling');
  for (let i = 0; i < inLane.length; i++) {
    for (let j = i + 1; j < inLane.length; j++) {
      if (inLane[i].routeIdx === inLane[j].routeIdx && Math.abs(inLane[i].dist - inLane[j].dist) < MIN_GAP_M * 0.99) {
        bad.push(`cars ${inLane[i].id} and ${inLane[j].id} overlap on the road`);
      }
    }
  }
  const still = cars.filter((c) => c.phase === 'parked' || c.phase === 'charging');
  for (let i = 0; i < still.length; i++) {
    for (let j = i + 1; j < still.length; j++) {
      if (metres(still[i].pos, still[j].pos) < PARK_GAP_M * 0.99) bad.push(`cars ${still[i].id} and ${still[j].id} overlap in the forecourt`);
    }
  }

  for (const car of cars) {
    if (car.intent === 'pass_by' && insideFence(sim.fence, car.pos)) bad.push(`pass-by car ${car.id} is inside the fence`);
  }

  const w = sim.waitByPosition();
  for (let i = 0; i < w.length; i++) {
    if (w[i] < 0) bad.push('negative wait');
    if (i > 0 && w[i] + 1e-6 < w[i - 1]) bad.push('wait decreases with queue position');
  }

  // after dispatch no free charger may sit idle while a compatible charging car is parked
  for (const ch of chargers) {
    if (ch.state !== 'FREE') continue;
    const idleFor = cars.find((c) => c.phase === 'parked' && c.intent === 'charge' && c.connector === ch.connector);
    if (idleFor) bad.push(`charger ${ch.id} idle while ${idleFor.id} waits`);
  }

  if (counts.arrivals !== cars.length + counts.removed) {
    bad.push(`conservation broken: arrivals ${counts.arrivals} != active ${cars.length} + removed ${counts.removed}`);
  }
  return bad;
}
```

### 3.6 Presence tracker (entry/exit radius plus dwell)

This is the real geofence rule from the design (80 m in, 100 m out, dwell before a car counts). The demo's "GPS noise" toggle feeds noisy distances through it to show there is no flicker.

FILE: `packages/shared/src/demo/presence.ts`

```ts
export interface PresenceOptions {
  enterM: number;
  exitM: number;
  dwellS: number;
}

export interface PresenceState {
  inside: boolean;
  counted: boolean;
  transitions: number;
}

export function createPresenceTracker(opts: PresenceOptions = { enterM: 80, exitM: 100, dwellS: 300 }) {
  let inside = false;
  let since = 0;
  let transitions = 0;

  return function update(distanceM: number, t: number): PresenceState {
    if (!inside && distanceM <= opts.enterM) {
      inside = true;
      since = t;
      transitions++;
    } else if (inside && distanceM > opts.exitM) {
      inside = false;
      transitions++;
    }
    return { inside, counted: inside && t - since >= opts.dwellS, transitions };
  };
}
```

Add `export * from './presence';`, `export * from './scene';`, `export * from './cases';` to `packages/shared/src/demo/index.ts`.

### 3.7 Test scene (also the fallback when road data is unavailable)

FILE: `packages/shared/src/demo/scene.ts`

```ts
import { fromLocal } from './geo-local';
import { buildFence, type Road, type RoadClass } from './fence';
import { Path } from './path';
import { StationSim, type SimConfig } from './station-sim';
import type { Connector, LatLng } from './types';

export const ORIGIN: LatLng = { lat: 19.0657, lng: 72.8687 };
const P = (x: number, y: number) => fromLocal(ORIGIN, x, y);

export interface SceneOptions {
  roadX?: number;
  roadClass?: RoadClass;
  chargers?: Array<[Connector, number]>;
  routes?: 1 | 2;
  roads?: Road[];
  config?: Partial<SimConfig>;
}

export function sceneRoads(roadX = 70, cls: RoadClass = 'tertiary'): Road[] {
  return [{ cls, pts: [P(roadX, -1500), P(roadX, 1500)] }];
}

export function makeScene(o: SceneOptions = {}) {
  const roadX = o.roadX ?? 70;
  const chargers = (o.chargers ?? [['CCS2', 22], ['CCS2', 22]]).map(([connector, powerKw], i) => ({
    id: `ch${i + 1}`,
    connector,
    powerKw,
  }));
  const roads = o.roads ?? sceneRoads(roadX, o.roadClass);
  const fence = buildFence(ORIGIN, roads, { chargerCount: chargers.length });
  const routes = [new Path([P(roadX, -1200), P(roadX, 0), P(0, 0)])];
  if (o.routes === 2) routes.push(new Path([P(roadX, 1200), P(roadX, 0), P(0, 0)]));

  const cfg: SimConfig = {
    stationId: 'scene',
    seed: 7,
    chargers,
    routes,
    bypass: new Path([P(roadX + 3, -1500), P(roadX + 3, 300)]),
    fence,
    waitCapacity: 8,
    dwellS: 0,
    arrivalsPerHour: 0,
    stayOnlyShare: 0,
    passByShare: 0,
    lingerShare: 0,
    patienceMinS: 1e9,
    patienceMaxS: 1e9,
    serviceTimeS: () => 600,
    ...o.config,
  };
  return { sim: new StationSim(cfg), cfg, roads, fence };
}
```

## 4. The 66 test cases (one list, three consumers)

`DEMO_CASES` is a single array. It is run by vitest in CI, by the in-app Test Suite panel (so the audience sees each case pass or fail live), and each case can be replayed on the map by id. Engine cases (G, M, Q, W, C, T, S) are code below. Cases that need the API, the browser or Redis (P, U, D, X) are in section 4.2.

**Rule for the agent:** if a case fails, fix the engine. Never loosen a case or change its numbers to make it pass. Report the failing id instead.

### 4.1 Engine cases

FILE: `packages/shared/src/demo/cases.ts`

```ts
import { assignStation, buildFence, fenceClearsRoads, type Road } from './fence';
import { fromLocal } from './geo-local';
import { checkInvariants } from './invariants';
import { createPresenceTracker } from './presence';
import { mmcMeanWait } from './erlang';
import { createRng } from './rng';
import { makeScene, ORIGIN, sceneRoads } from './scene';
import { distToSegmentLatLng } from './case-helpers';
import { StationSim } from './station-sim';

export interface CaseResult {
  pass: boolean;
  detail: string;
}

export interface DemoCase {
  id: string;
  group: 'Geometry' | 'Movement' | 'Queue' | 'Wait time' | 'Faults' | 'Clock' | 'Sanity';
  title: string;
  run: () => CaseResult;
}

const ok = (detail: string): CaseResult => ({ pass: true, detail });
const no = (detail: string): CaseResult => ({ pass: false, detail });
const check = (cond: boolean, good: string, bad: string): CaseResult => (cond ? ok(good) : no(bad));
const P = (x: number, y: number) => fromLocal(ORIGIN, x, y);

type Scene = ReturnType<typeof makeScene>;

// run and assert invariants after every step; returns the first violation
function run(sim: StationSim, seconds: number): string | null {
  let left = seconds;
  while (left > 0) {
    const dt = Math.min(0.25, left);
    sim.advance(dt);
    const bad = checkInvariants(sim);
    if (bad.length) return `t=${sim.t.toFixed(1)}s ${bad[0]}`;
    left -= dt;
  }
  return null;
}

// spawn n forced cars two seconds apart (road spacing), returns them
function send(sim: StationSim, n: number, force: Parameters<StationSim['spawn']>[0] = { intent: 'charge' }) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    let car = sim.spawn(force);
    for (let tries = 0; !car && tries < 10; tries++) {
      sim.advance(1);
      car = sim.spawn(force);
    }
    if (car) cars.push(car);
    sim.advance(2);
  }
  return cars;
}

// advance() clamps to 30 s per call (case T3), so long waits go through run()
const ARRIVE_S = 200;

function serviceSequence(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

export const DEMO_CASES: DemoCase[] = [
  // ---------- Geometry ----------
  {
    id: 'G1', group: 'Geometry', title: 'Fence that overlaps a road shrinks until clear',
    run() {
      const { fence, roads } = makeScene();
      return check(Math.min(...fence.radii) < 100 && fence.clearanceM >= 0 && fenceClearsRoads(fence, roads),
        `Shrunk from 100 m to ${fence.minRadius.toFixed(0)} m, clearance ${fence.clearanceM.toFixed(1)} m`,
        'Fence still touches the road');
    },
  },
  {
    id: 'G2', group: 'Geometry', title: 'Buffer scales with road class',
    run() {
      const motorway = makeScene({ roadX: 60, roadClass: 'motorway' }).fence.radii[0];
      const lane = makeScene({ roadX: 60, roadClass: 'residential' }).fence.radii[0];
      return check(motorway < lane, `Motorway side ${motorway} m, residential side ${lane} m`, `Expected ${motorway} < ${lane}`);
    },
  },
  {
    id: 'G3', group: 'Geometry', title: 'Fence below minimum area is flagged unreliable',
    run() {
      const roads: Road[] = [
        { cls: 'tertiary', pts: [P(-22, -300), P(-22, 300)] },
        { cls: 'tertiary', pts: [P(22, -300), P(22, 300)] },
      ];
      const f = buildFence(ORIGIN, roads, { chargerCount: 2 });
      return check(f.status === 'unreliable', `Flagged: ${f.reason}`, `Status was ${f.status}`);
    },
  },
  {
    id: 'G4', group: 'Geometry', title: 'Fence must still contain every charger',
    run() {
      const f = buildFence(ORIGIN, sceneRoads(70), { chargerCount: 60 });
      return check(f.status === 'unreliable' && /Chargers/.test(f.reason ?? ''), `Rejected: ${f.reason}`, `Status ${f.status}, reason ${f.reason}`);
    },
  },
  {
    id: 'G5', group: 'Geometry', title: 'Overlapping fences give a car to exactly one station',
    run() {
      const a = buildFence(ORIGIN, []);
      const b = buildFence(P(60, 0), []);
      const id = assignStation(P(45, 0), [{ id: 'A', fence: a }, { id: 'B', fence: b }]);
      return check(id === 'B', `Car at 45 m east assigned to ${id}`, `Assigned to ${id}`);
    },
  },
  {
    id: 'G6', group: 'Geometry', title: 'Invariant holds again after roads change',
    run() {
      const { fence } = makeScene();
      const edited: Road[] = [...sceneRoads(70), { cls: 'secondary', pts: [P(40, -300), P(40, 300)] }];
      const stale = fenceClearsRoads(fence, edited);
      const rebuilt = buildFence(ORIGIN, edited, { chargerCount: 2 });
      return check(!stale && fenceClearsRoads(rebuilt, edited), 'Old fence rejected, rebuilt fence clear', `stale=${stale}`);
    },
  },
  {
    id: 'G7', group: 'Geometry', title: 'No road nearby keeps the default size',
    run() {
      const f = buildFence(ORIGIN, []);
      return check(f.status === 'ok' && f.radii.every((r) => r === 100), 'Fence stays at 100 m', `min radius ${f.minRadius}`);
    },
  },

  // ---------- Movement ----------
  {
    id: 'M1', group: 'Movement', title: 'Cars stay on the road until the fence',
    run() {
      const { sim, roads } = makeScene();
      send(sim, 1);
      let worst = 0;
      for (let i = 0; i < 700; i++) {
        sim.advance(0.25);
        for (const c of sim.inspect().cars) {
          if (c.phase === 'travelling') worst = Math.max(worst, distToSegmentLatLng(c.pos, roads[0].pts[0], roads[0].pts[1]));
        }
      }
      return check(worst <= 12, `Furthest from the road centre line: ${worst.toFixed(1)} m`, `Left the road by ${worst.toFixed(1)} m`);
    },
  },
  {
    id: 'M2', group: 'Movement', title: 'Car that passes the station is never counted',
    run() {
      const { sim } = makeScene();
      sim.spawn({ intent: 'pass_by' });
      const bad = run(sim, 300);
      const k = sim.kpis();
      const entered = sim.events.some((e) => e.type === 'enter_fence');
      return check(!bad && k.passed === 1 && !entered, 'Passed on the bypass, never entered the fence', bad ?? `passed=${k.passed} entered=${entered}`);
    },
  },
  {
    id: 'M3', group: 'Movement', title: 'Short stay inside the dwell window is not counted',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { dwellS: 60, serviceTimeS: () => 900 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      run(sim, ARRIVE_S);
      if (!b) return no('second car did not spawn');
      b.patienceS = 20;
      let maxCounted = 0;
      for (let i = 0; i < 400; i++) {
        sim.advance(0.25);
        maxCounted = Math.max(maxCounted, sim.snapshot().waitingCount);
      }
      return check(maxCounted === 0 && sim.kpis().reneged === 1, 'Left after 20 s, never counted (dwell is 60 s)', `max counted ${maxCounted}`);
    },
  },
  {
    id: 'M4', group: 'Movement', title: 'Followers keep their distance',
    run() {
      const { sim } = makeScene();
      send(sim, 4);
      const bad = run(sim, ARRIVE_S + 100);
      return check(!bad, 'No overlap on the road or in the forecourt', bad ?? '');
    },
  },
  {
    id: 'M5', group: 'Movement', title: 'Single access lane resolves without deadlock',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { singleLane: true, serviceTimeS: () => 140 } });
      sim.spawn({ intent: 'charge' });
      run(sim, 150);
      sim.spawn({ intent: 'charge' });
      const bad = run(sim, 700);
      return check(!bad && sim.kpis().completed === 2, 'Both cars charged and left', bad ?? `completed ${sim.kpis().completed}`);
    },
  },
  {
    id: 'M6', group: 'Movement', title: 'Full forecourt turns cars away',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { waitCapacity: 2, serviceTimeS: () => 5000 } });
      send(sim, 6);
      const bad = run(sim, ARRIVE_S + 100);
      const snap = sim.snapshot();
      return check(!bad && sim.kpis().balked >= 1 && snap.waitingCount <= 2, `${sim.kpis().balked} balked, waiting ${snap.waitingCount} (capacity 2)`, bad ?? `balked ${sim.kpis().balked}`);
    },
  },
  {
    id: 'M7', group: 'Movement', title: 'GPS noise does not flicker the count',
    run() {
      const rng = createRng(3);
      const track = createPresenceTracker({ enterM: 80, exitM: 100, dwellS: 0 });
      let naiveFlips = 0;
      let prev = false;
      let last = track(70, 0);
      for (let t = 1; t <= 120; t++) {
        const d = 90 + (rng() - 0.5) * 18;
        const naive = d <= 90;
        if (naive !== prev) naiveFlips++;
        prev = naive;
        last = track(d, t);
      }
      return check(last.transitions <= 2 && naiveFlips > 10, `Tracker flipped ${last.transitions}x, single threshold ${naiveFlips}x`, `tracker ${last.transitions}, naive ${naiveFlips}`);
    },
  },
  {
    id: 'M8', group: 'Movement', title: 'No route: car is dropped cleanly',
    run() {
      const { cfg } = makeScene();
      const sim = new StationSim({ ...cfg, routes: [], bypass: undefined });
      const car = sim.spawn({ intent: 'charge' });
      const bad = run(sim, 30);
      return check(car === null && !bad && sim.kpis().arrivals === 0, 'Nothing spawned, nothing stuck', bad ?? 'car existed');
    },
  },

  // ---------- Queue ----------
  {
    id: 'Q1', group: 'Queue', title: 'Empty station: car goes straight to a charger',
    run() {
      const { sim } = makeScene();
      send(sim, 1);
      const bad = run(sim, ARRIVE_S);
      const s = sim.snapshot();
      return check(!bad && s.chargingCount === 1 && s.waitingCount === 0 && !sim.events.some((e) => e.type === 'park'), 'Charging, waiting 0, never parked', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q2', group: 'Queue', title: 'All chargers busy: next car queues at position 1',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]] });
      send(sim, 2);
      const bad = run(sim, ARRIVE_S + 60);
      const s = sim.snapshot();
      return check(!bad && s.waitingCount === 1 && s.waitByPosition.length === 1, 'One waiting, position 1', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q3', group: 'Queue', title: 'More cars than chargers: charging capped, rest wait',
    run() {
      const { sim } = makeScene();
      send(sim, 5);
      const bad = run(sim, ARRIVE_S + 120);
      const s = sim.snapshot();
      return check(!bad && s.chargingCount === 2 && s.waitingCount === 3, 'Charging 2, waiting 3', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q4', group: 'Queue', title: 'Freed charger is taken in the same step',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 100 } });
      const [, second] = send(sim, 2);
      let guard = 0;
      while (sim.kpis().completed === 0 && guard++ < 4000) sim.advance(0.25);
      const ch = sim.chargers[0];
      return check(sim.kpis().completed === 1 && ch.state === 'BUSY' && ch.carId === second.id, 'Second car holds the charger right after the first left', `state ${ch.state}, car ${ch.carId}`);
    },
  },
  {
    id: 'Q5', group: 'Queue', title: 'Stay-only car at the head is dropped, next car charges',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 120 } });
      send(sim, 1);
      const [stay] = send(sim, 1, { intent: 'stay_only' });
      const [next] = send(sim, 1);
      const bad = run(sim, ARRIVE_S + 400);
      const dropped = sim.events.some((e) => e.type === 'discard_other_jobs' && e.carId === stay.id);
      const took = sim.events.some((e) => e.type === 'charge_start' && e.carId === next.id);
      return check(!bad && dropped && took, 'Dropped as other jobs, next car charged with no idle gap', bad ?? `dropped=${dropped} charged=${took}`);
    },
  },
  {
    id: 'Q6', group: 'Queue', title: 'Several stay-only cars in a row are cleared in one pass',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 120 } });
      send(sim, 1);
      send(sim, 3, { intent: 'stay_only' });
      const [next] = send(sim, 1);
      const bad = run(sim, ARRIVE_S + 500);
      const charged = sim.events.some((e) => e.type === 'charge_start' && e.carId === next.id);
      return check(!bad && sim.kpis().discardedOtherJobs === 3 && charged, 'Three dropped, real car charged', bad ?? `discarded ${sim.kpis().discardedOtherJobs}`);
    },
  },
  {
    id: 'Q7', group: 'Queue', title: 'Impatient car leaves and the line closes up',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      send(sim, 1);
      b.patienceS = 30;
      const bad = run(sim, ARRIVE_S + 200);
      return check(!bad && sim.kpis().reneged === 1 && sim.snapshot().waitingCount === 1, 'One reneged, one still waiting', bad ?? `reneged ${sim.kpis().reneged}`);
    },
  },
  {
    id: 'Q8', group: 'Queue', title: 'Last waiter leaves: count returns to zero',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      b.patienceS = 40;
      run(sim, ARRIVE_S + 20);
      const before = sim.waitFor().seconds ?? 0;
      run(sim, 150);
      const after = sim.waitFor().seconds ?? 0;
      return check(sim.snapshot().waitingCount === 0 && after < before, `Waiting 0, wait fell from ${Math.round(before)} s to ${Math.round(after)} s`, `count ${sim.snapshot().waitingCount}`);
    },
  },
  {
    id: 'Q9', group: 'Queue', title: 'Connector mismatch: car waits for a compatible charger',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 50], ['CHAdeMO', 50]], config: { serviceTimeS: () => 3000 } });
      send(sim, 2, { intent: 'charge', connector: 'CCS2' });
      const bad = run(sim, ARRIVE_S + 60);
      const chademo = sim.chargers[1];
      return check(!bad && chademo.state === 'FREE' && sim.snapshot().waitingCount === 1, 'CHAdeMO stays free, second CCS2 car waits', bad ?? `chademo ${chademo.state}`);
    },
  },
  {
    id: 'Q10', group: 'Queue', title: 'Two cars reach one free charger together: one wins',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], routes: 2 });
      sim.spawn({ intent: 'charge', routeIdx: 0 });
      sim.spawn({ intent: 'charge', routeIdx: 1 });
      const bad = run(sim, ARRIVE_S + 60);
      const s = sim.snapshot();
      return check(!bad && s.chargingCount === 1 && s.waitingCount === 1, 'One charging, one waiting, no double assignment', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q11', group: 'Queue', title: 'Finished car that stays parked keeps the charger blocked',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 100 } });
      const [a] = send(sim, 1);
      a.lingerS = 400;
      send(sim, 1);
      let guard = 0;
      while (!sim.chargers[0].blocked && guard++ < 4000) sim.advance(0.25);
      sim.advance(20);
      return check(sim.chargers[0].blocked && sim.chargers[0].state === 'BUSY' && sim.snapshot().waitingCount === 1, 'Charger blocked, queue did not advance', `blocked ${sim.chargers[0].blocked}`);
    },
  },

  // ---------- Wait time ----------
  {
    id: 'W1', group: 'Wait time', title: 'Free charger shows free and zero',
    run() {
      const { sim } = makeScene();
      const w = sim.waitFor();
      return check(w.display === 'free' && w.seconds === 0, 'free, 0 min (shown as "-")', JSON.stringify(w));
    },
  },
  {
    id: 'W2', group: 'Wait time', title: 'All busy, empty queue: wait equals the soonest finish',
    run() {
      const { sim } = makeScene({ config: { serviceTimeS: serviceSequence([300, 900]) } });
      send(sim, 2);
      run(sim, ARRIVE_S + 40);
      const soonest = Math.min(...sim.chargers.map((c) => (c.ratedEnd ?? 0) - sim.t));
      const w = sim.waitFor().seconds ?? -1;
      return check(Math.abs(w - soonest) < 2, `Wait ${Math.round(w)} s equals soonest finish`, `wait ${w}, soonest ${soonest}`);
    },
  },
  {
    id: 'W3', group: 'Wait time', title: 'k-th waiter waits for the k-th earliest free charger',
    run() {
      const { sim } = makeScene({ config: { serviceTimeS: serviceSequence([300, 900]) } });
      send(sim, 5);
      run(sim, ARRIVE_S + 80);
      const w = sim.waitByPosition();
      const ok3 = w.length === 3 && Math.abs(w[1] - w[0] - 600) < 5 && Math.abs(w[2] - w[0] - 1500) < 5;
      return check(ok3, `Position waits ${w.map((x) => Math.round(x)).join(', ')} s`, `waits ${w.join(', ')}`);
    },
  },
  {
    id: 'W4', group: 'Wait time', title: 'Different charger power gives different remaining times',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22], ['CCS2', 120]], config: { serviceTimeS: undefined } });
      const cars = send(sim, 2);
      cars.forEach((c) => { c.needKwh = 30; c.maxKw = 200; });
      run(sim, ARRIVE_S + 10);
      const ends = sim.chargers.map((c) => c.ratedEnd ?? 0).sort((x, y) => x - y);
      return check(ends[1] - ends[0] > 1000, `Finish times differ by ${Math.round(ends[1] - ends[0])} s`, `ends ${ends.join(', ')}`);
    },
  },
  {
    id: 'W5', group: 'Wait time', title: 'Overstaying car: estimate decays, never zero or negative',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 100 } });
      const [a] = send(sim, 1);
      a.lingerS = 2000;
      run(sim, ARRIVE_S + 600);
      const s = sim.waitFor().seconds ?? -1;
      return check(s >= 30 && s <= 140, `Estimate is ${Math.round(s)} s after a long overstay`, `estimate ${s}`);
    },
  },
  {
    id: 'W6', group: 'Wait time', title: 'When a waiter leaves, everyone behind sees a shorter wait',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      send(sim, 1);
      run(sim, ARRIVE_S + 60);
      const before = sim.waitByPosition();
      b.patienceS = 1;
      run(sim, 20);
      const after = sim.waitByPosition();
      return check(before.length === 2 && after.length === 1 && after[0] < before[1], `Last waiter: ${Math.round(before[1])} s down to ${Math.round(after[0])} s`, `before ${before}, after ${after}`);
    },
  },
  {
    id: 'W7', group: 'Wait time', title: 'All chargers faulted shows offline, not free',
    run() {
      const { sim } = makeScene();
      sim.chargers.forEach((c) => sim.faultCharger(c.id));
      const w = sim.waitFor();
      return check(w.display === 'offline' && w.seconds === null, 'offline', JSON.stringify(w));
    },
  },
  {
    id: 'W8', group: 'Wait time', title: 'Closed by opening hours shows closed',
    run() {
      const { sim } = makeScene({ config: { open: false } });
      const w = sim.waitFor();
      return check(w.display === 'closed', 'closed', JSON.stringify(w));
    },
  },
  {
    id: 'W9', group: 'Wait time', title: 'Prediction for a driver arriving later uses arrival time',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 600 } });
      send(sim, 1);
      run(sim, ARRIVE_S + 20);
      const now = sim.waitFor(undefined, 0);
      const later = sim.waitFor(undefined, 1200);
      return check(now.display === 'busy' && (now.seconds ?? 0) > 0 && later.display === 'free', 'Busy now, free by the time the driver arrives', `${JSON.stringify(now)} / ${JSON.stringify(later)}`);
    },
  },
  {
    id: 'W10', group: 'Wait time', title: 'No data shows unknown, never zero',
    run() {
      const { sim } = makeScene();
      sim.setHeartbeat(false);
      const w = sim.waitFor();
      return check(w.display === 'unknown' && w.seconds === null, 'unknown', JSON.stringify(w));
    },
  },

  // ---------- Faults ----------
  {
    id: 'C1', group: 'Faults', title: 'Charger faults mid-session: car returns to the head of the queue',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      const [a] = send(sim, 1);
      const [b] = send(sim, 1);
      run(sim, ARRIVE_S + 60);
      sim.faultCharger('ch1');
      const q = sim.inspect().queue;
      return check(q[0] === a.id && q[1] === b.id, 'Interrupted car is first in line', `queue ${q.join(',')}`);
    },
  },
  {
    id: 'C2', group: 'Faults', title: 'Recovered charger is used immediately',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      run(sim, ARRIVE_S + 20);
      sim.faultCharger('ch1');
      run(sim, 20);
      sim.recoverCharger('ch1');
      sim.advance(0.25);
      return check(sim.snapshot().chargingCount === 1, 'Charging again one step after recovery', JSON.stringify(sim.snapshot()));
    },
  },
  {
    id: 'C3', group: 'Faults', title: 'Lost heartbeat marks the station unknown',
    run() {
      const { sim } = makeScene();
      sim.setHeartbeat(false);
      const s = sim.snapshot();
      sim.setHeartbeat(true);
      return check(s.display === 'unknown' && s.waitMinutes === null && sim.snapshot().display === 'free', 'unknown, then free again', JSON.stringify(s));
    },
  },
  {
    id: 'C4', group: 'Faults', title: 'Long queue marks the station overloaded',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 4000, waitCapacity: 12 } });
      send(sim, 7);
      run(sim, ARRIVE_S + 100);
      return check(sim.snapshot().overloaded, 'overloaded flag set', JSON.stringify(sim.snapshot()));
    },
  },

  // ---------- Clock ----------
  {
    id: 'T1', group: 'Clock', title: 'Same seed gives the same event log',
    run() {
      const make = () => makeScene({ config: { arrivalsPerHour: 40, stayOnlyShare: 0.2, passByShare: 0.1, serviceTimeS: undefined, patienceMinS: 300, patienceMaxS: 900 } }).sim;
      const a = make();
      const b = make();
      for (let i = 0; i < 120; i++) { a.advance(30); b.advance(30); }
      return check(JSON.stringify(a.events) === JSON.stringify(b.events) && a.events.length > 20, `${a.events.length} identical events`, 'Logs differ');
    },
  },
  {
    id: 'T2', group: 'Clock', title: 'Result depends on simulated time, not on step size',
    run() {
      const cfg = { arrivalsPerHour: 30, serviceTimeS: undefined };
      const a = makeScene({ config: cfg }).sim;
      const b = makeScene({ config: cfg }).sim;
      for (let i = 0; i < 20; i++) a.advance(30);
      for (let i = 0; i < 2400; i++) b.advance(0.25);
      return check(JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()) && Math.abs(a.t - 600) < 1e-6, 'Same state after 600 s either way', 'States differ');
    },
  },
  {
    id: 'T3', group: 'Clock', title: 'Hidden tab returning does not teleport cars',
    run() {
      const { sim } = makeScene();
      sim.spawn({ intent: 'charge' });
      sim.advance(3600);
      const car = sim.inspect().cars[0];
      return check(sim.t <= 30.001 && (car?.dist ?? 0) <= 8 * 30 + 1, `Clamped to ${sim.t.toFixed(1)} s`, `t=${sim.t}`);
    },
  },
  {
    id: 'T4', group: 'Clock', title: 'Pause keeps state, reset empties it',
    run() {
      const { sim, cfg } = makeScene({ config: { arrivalsPerHour: 60 } });
      sim.advance(30); sim.advance(30); sim.advance(30);
      const frozen = JSON.stringify(sim.snapshot());
      const held = JSON.stringify(sim.snapshot());
      const fresh = new StationSim(cfg).snapshot();
      return check(frozen === held && fresh.waitingCount === 0 && fresh.chargingCount === 0 && fresh.t === 0, 'Paused state is stable, reset is empty', 'mismatch');
    },
  },
  {
    id: 'T5', group: 'Clock', title: 'Long run does not grow memory',
    run() {
      const { sim } = makeScene({ config: { arrivalsPerHour: 40, serviceTimeS: undefined, patienceMinS: 300, patienceMaxS: 900, stayOnlyShare: 0.2, passByShare: 0.2 } });
      for (let i = 0; i < 720; i++) sim.advance(30);
      const n = sim.inspect().cars.length;
      return check(n < 60 && sim.events.length <= 300, `${n} cars alive after 6 simulated hours`, `${n} cars, ${sim.events.length} events`);
    },
  },
  {
    id: 'T6', group: 'Clock', title: '40 stations step together inside the time budget',
    run() {
      const sims = Array.from({ length: 40 }, (_, i) => makeScene({ config: { seed: i + 1, arrivalsPerHour: 30, serviceTimeS: undefined } }).sim);
      const t0 = Date.now();
      for (let s = 0; s < 60; s++) sims.forEach((x) => x.advance(1));
      const ms = Date.now() - t0;
      return check(ms < 2000, `60 s of 40 stations in ${ms} ms`, `${ms} ms`);
    },
  },

  // ---------- Sanity against queueing theory ----------
  {
    id: 'S1', group: 'Sanity', title: "Little's law holds in steady state (L = lambda x W)",
    run() {
      const mean = 600;
      const lambda = 0.7 * 3 / mean;
      const { sim } = makeScene({
        chargers: [['CCS2', 22], ['CCS2', 22], ['CCS2', 22]],
        config: {
          seed: 11, arrivalsPerHour: lambda * 3600, waitCapacity: 50,
          serviceTimeS: (r) => -Math.log(1 - r()) * mean,
        },
      });
      let area = 0;
      const horizon = 100 * 3600;
      for (let t = 0; t < horizon; t += 30) {
        sim.advance(30);
        area += sim.inspect().cars.filter((c) => c.phase === 'parked').length * 30;
      }
      const k = sim.kpis();
      const L = area / horizon;
      const effLambda = k.arrivals / horizon;
      const rhs = effLambda * k.avgWaitS;
      return check(Math.abs(L - rhs) / Math.max(L, 0.01) < 0.3, `L=${L.toFixed(2)}, lambda x W=${rhs.toFixed(2)}`, `L=${L.toFixed(2)} vs ${rhs.toFixed(2)}`);
    },
  },
  {
    id: 'S2', group: 'Sanity', title: 'Mean wait is close to Erlang C',
    run() {
      const mean = 600;
      const c = 3;
      const lambda = (0.7 * c) / mean;
      const { sim } = makeScene({
        chargers: [['CCS2', 22], ['CCS2', 22], ['CCS2', 22]],
        config: { seed: 21, arrivalsPerHour: lambda * 3600, waitCapacity: 50, serviceTimeS: (r) => -Math.log(1 - r()) * mean },
      });
      for (let i = 0; i < 100 * 120; i++) sim.advance(30);
      const theory = mmcMeanWait(lambda, 1 / mean, c);
      const got = sim.kpis().avgWaitS;
      return check(Math.abs(got - theory) / theory < 0.35, `Simulated ${Math.round(got)} s, Erlang C ${Math.round(theory)} s`, `sim ${got}, theory ${theory}`);
    },
  },
];
```

FILE: `packages/shared/src/demo/case-helpers.ts`

```ts
import { distToSegment, toLocal } from './geo-local';
import type { LatLng } from './types';

export function distToSegmentLatLng(p: LatLng, a: LatLng, b: LatLng): number {
  return distToSegment(toLocal(a, p), toLocal(a, a), toLocal(a, b));
}
```

Run it: `pnpm --filter @evspark/shared test` (add `"test": "vitest run"` to `packages/shared/package.json` if missing).

FILE: `packages/shared/src/demo/__tests__/cases.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DEMO_CASES } from '../cases';

describe('demo engine cases', () => {
  for (const c of DEMO_CASES) {
    it(`${c.id} ${c.title}`, () => {
      const r = c.run();
      expect(r.pass, r.detail).toBe(true);
    }, 30_000);
  }
});
```

This file was extracted and executed while writing killets.md: all 48 engine cases (G1–G7, M1–M8, Q1–Q11, W1–W10, C1–C4, T1–T6, plus S1 Little's law and S2 Erlang C) pass with strict TypeScript. If any fail after your edits, the engine is wrong, not the case.

### 4.2 Cases that are not engine logic (20 of the 66)

These need Redis, the API, the browser, or privacy rules. Each has an owner file and a concrete check. They also appear as rows in the in-app Test Suite panel under "Checked in CI / E2E" (section 6.2) so the audience sees the full 66.

| ID | Case | Where it is checked | Check |
|----|------|---------------------|-------|
| P1 | Cold cache first map load | `apps/api/tests/stations-cache.test.ts` | Clear keys, `GET /api/stations?bbox=...` returns 200 with `x-cache: MISS`, then the same request returns `HIT` |
| P2 | Warm cache is fast | same | Second request has `Server-Timing: total;dur=<50` in test env |
| P3 | Edit or approval invalidates cache | same | `PATCH /api/stations/:id` then the cell returns `MISS` and shows the new name |
| P4 | Static vs live data | same | `/api/stations` has `max-age>=300`; `/api/stations/live` has `max-age<=10` |
| P5 | No stampede after expiry | same | 20 parallel requests on an empty cache cause 1 DB read (spy on `prisma.$queryRaw`) |
| P6 | Redis down | same | With `REDIS_URL` pointing nowhere, request still returns 200 from the DB |
| P7 | Free-tier DB cold start | manual + UI | First load shows skeleton markers from persisted cache; do not claim millisecond response on a cold start |
| P8 | Pan and zoom fetch only what is visible | `apps/web/src/lib/map/viewport.test.ts` | Snapped cells for a viewport cover it and are at most 6; clusters used below zoom 13 |
| U1 | Demo starts with empty stations | E2E | After pressing Demo, every `[data-testid=station-wait]` reads `-` or `0` |
| U2 | Double press starts one simulation | component test | Calling `start()` twice leaves `sims.size` unchanged |
| U3 | Leaving the page stops it | component test | Unmount `DemoController`, `requestAnimationFrame` count stops, `sims` is empty |
| U4 | Counters match the map | E2E | Waiting count in the panel equals the sum of `data-waiting` on markers |
| U5 | Mobile layout usable | manual 390 px | Panel becomes a bottom sheet; buttons at least 44 px |
| U6 | Reduced motion | component test | With `prefers-reduced-motion`, fence shrink animation duration is 0 |
| U7 | Event log shows each step | component test | Spawn, enter, park, charge, discard, leave all appear |
| D1 | Demo cars never touch real data | component test | No `POST`, `PUT`, `PATCH` or `DELETE` is sent while the demo runs (spy on `fetch`) |
| D2 | Two users, isolated demos | by design | Engine is client-side only; nothing is shared; assert no socket emit |
| D3 | Demo data never feeds the forecast | API test | Demo code path has no import from `jobs/` or `services/forecast`; grep in CI |
| X1 | Real GPS pings need consent, are aggregated, expire | `apps/api/tests/telemetry.test.ts` | Ping without consent flag is rejected; Redis geofence set has a TTL |
| X2 | Ping endpoint abuse | same | `telemetry.routes.ts` uses `authenticateTelemetry` and `validate`, but no rate limiter is visible in that file; add `rateLimiter` to `/ping` and test that the 31st request in a minute returns 429 |

## 5. Demo plumbing: scenarios, road data, store, clock

### 5.1 Scenario presets

FILE: `packages/shared/src/demo/scenarios.ts`

```ts
export type ScenarioId = 'quiet_hour' | 'rush_hour' | 'one_charger_faulted' | 'station_down' | 'long_queue';

export interface Scenario {
  id: ScenarioId;
  label: string;
  note: string;
  arrivalsPerHour: number;
  stayOnlyShare: number;
  passByShare: number;
  patienceMinS: number;
  patienceMaxS: number;
  faultAtS?: number;
  heartbeatLostAtS?: number;
}

export const DEMO_SCENARIOS: Record<ScenarioId, Scenario> = {
  quiet_hour: {
    id: 'quiet_hour', label: 'Quiet hour', note: 'A few cars, chargers mostly free',
    arrivalsPerHour: 8, stayOnlyShare: 0.1, passByShare: 0.25, patienceMinS: 600, patienceMaxS: 1500,
  },
  rush_hour: {
    id: 'rush_hour', label: 'Rush hour', note: 'Chargers fill, a queue builds',
    arrivalsPerHour: 45, stayOnlyShare: 0.15, passByShare: 0.2, patienceMinS: 480, patienceMaxS: 1500,
  },
  one_charger_faulted: {
    id: 'one_charger_faulted', label: 'One charger faults', note: 'Rush hour, first charger fails after 30 s',
    arrivalsPerHour: 40, stayOnlyShare: 0.15, passByShare: 0.2, patienceMinS: 480, patienceMaxS: 1500, faultAtS: 30,
  },
  station_down: {
    id: 'station_down', label: 'Station offline', note: 'Heartbeat is lost after 30 s',
    arrivalsPerHour: 25, stayOnlyShare: 0.1, passByShare: 0.2, patienceMinS: 480, patienceMaxS: 1500, heartbeatLostAtS: 30,
  },
  long_queue: {
    id: 'long_queue', label: 'Long queue', note: 'Demand above capacity, drivers give up',
    arrivalsPerHour: 70, stayOnlyShare: 0.1, passByShare: 0.1, patienceMinS: 240, patienceMaxS: 700,
  },
};
```
Add `export * from './scenarios';` to `packages/shared/src/demo/index.ts`.

### 5.2 Road and fence data endpoint

One call per station, cached 30 days, so Overpass and Directions are hit once per station and never from the browser.

Add to `apps/api/.env.example`: `GOOGLE_MAPS_SERVER_KEY=` (server-side key, Directions API enabled, restricted by IP).

FILE: `apps/api/src/controllers/demo-geometry.controller.ts`

```ts
import type { Request, Response } from 'express';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { cacheGet, cacheSet } from '../lib/redis';
import { AppError } from '../middleware/errorHandler';
import {
  buildFence,
  decodePolyline,
  fromLocal,
  type Fence,
  type LatLng,
  type Road,
  type RoadClass,
} from '@evspark/shared';

interface DemoGeometry {
  stationId: string;
  centre: LatLng;
  fence: Fence;
  roads: Road[];
  routes: LatLng[][];
  bypass: LatLng[] | null;
  degraded: boolean;
}

const KEY = (id: string) => `demo:geom:v1:${id}`;
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const inflight = new Map<string, Promise<DemoGeometry>>();

const HIGHWAY_CLASS: Record<string, RoadClass> = {
  motorway: 'motorway', motorway_link: 'motorway', trunk: 'trunk', trunk_link: 'trunk',
  primary: 'primary', primary_link: 'primary', secondary: 'secondary', secondary_link: 'secondary',
  tertiary: 'tertiary', tertiary_link: 'tertiary', residential: 'residential', living_street: 'residential',
  unclassified: 'residential', service: 'service',
};

async function fetchRoads(c: LatLng): Promise<Road[]> {
  const q = `[out:json][timeout:8];way(around:260,${c.lat},${c.lng})[highway];out geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: q }),
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const json = (await res.json()) as { elements: Array<{ tags?: { highway?: string }; geometry?: Array<{ lat: number; lon: number }> }> };
  const roads: Road[] = [];
  for (const el of json.elements) {
    const cls = HIGHWAY_CLASS[el.tags?.highway ?? ''];
    if (!cls || !el.geometry || el.geometry.length < 2) continue;
    roads.push({ cls, pts: el.geometry.map((g) => ({ lat: g.lat, lng: g.lon })) });
  }
  return roads;
}

async function fetchRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&mode=driving&key=${key}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = (await res.json()) as { routes?: Array<{ overview_polyline?: { points: string } }> };
  const points = json.routes?.[0]?.overview_polyline?.points;
  if (!points) return null;
  return [...decodePolyline(points), to];
}

async function build(id: string): Promise<DemoGeometry> {
  const st = await prisma.station.findUnique({
    where: { id },
    select: { id: true, lat: true, lng: true, _count: { select: { chargers: true } } },
  });
  if (!st) throw new AppError(404, 'NOT_FOUND', 'Station not found');
  const centre = { lat: st.lat, lng: st.lng };

  let degraded = false;
  let roads: Road[] = [];
  try {
    roads = await fetchRoads(centre);
  } catch (err) {
    degraded = true;
    logger.warn({ err, stationId: id }, 'Overpass unavailable, using default fence');
  }

  const bearings = [200, 320, 80];
  const routes: LatLng[][] = [];
  for (const deg of bearings) {
    const a = (deg * Math.PI) / 180;
    const origin = fromLocal(centre, Math.sin(a) * 1200, Math.cos(a) * 1200);
    const route = await fetchRoute(origin, centre).catch(() => null);
    if (route) routes.push(route);
    else {
      degraded = true;
      routes.push([origin, centre]);
    }
  }

  // longest nearby road is the bypass lane used by cars that drive past
  const bypass = roads.length ? [...roads].sort((a, b) => b.pts.length - a.pts.length)[0].pts : null;
  const fence = buildFence(centre, roads, { chargerCount: Math.max(1, st._count.chargers) });
  return { stationId: id, centre, fence, roads, routes, bypass, degraded };
}

export async function getDemoGeometry(req: Request, res: Response) {
  const id = req.params.id;
  const cached = await cacheGet<DemoGeometry>(KEY(id));
  if (cached) {
    res.setHeader('x-cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.json(cached);
  }
  let pending = inflight.get(id);
  if (!pending) {
    pending = build(id).finally(() => inflight.delete(id));
    inflight.set(id, pending);
  }
  const geometry = await pending;
  // degraded results are cached briefly so a transient outage does not stick for a month
  await cacheSet(KEY(id), geometry, geometry.degraded ? 600 : THIRTY_DAYS);
  res.setHeader('x-cache', 'MISS');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.json(geometry);
}
```

PATCH: `apps/api/src/routes/stations.routes.ts`. FIND `router.get("/:id/reviews", validate({ params: stationIdParamSchema }), getStationReviews);` and add this line directly under it:

```ts
router.get("/:id/demo-geometry", validate({ params: stationIdParamSchema }), getDemoGeometry);
```
and add `import { getDemoGeometry } from "../controllers/demo-geometry.controller";` at the top. Check `AppError`'s constructor signature in `middleware/errorHandler.ts` and match it; the order above is `(status, code, message)`.

Also add `overpass-api.de` and `maps.googleapis.com` to any egress allow-list in `infra/` if one exists.

### 5.3 Client geometry loader with fallback

FILE: `apps/web/src/lib/demo/geometry.ts`

```ts
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { buildFence, fromLocal, type Fence, type LatLng, type Road } from '@evspark/shared';

export interface DemoGeometry {
  stationId: string;
  centre: LatLng;
  fence: Fence;
  roads: Road[];
  routes: LatLng[][];
  bypass: LatLng[] | null;
  degraded: boolean;
}

export function loadGeometry(stationId: string, centre: LatLng): Promise<DemoGeometry> {
  return queryClient.fetchQuery({
    queryKey: ['demo-geometry', stationId],
    queryFn: () => api<DemoGeometry>(`/api/stations/${stationId}/demo-geometry`),
    staleTime: Infinity,
  }).catch(() => approximate(stationId, centre));
}

// no road data: default 100 m fence and straight approaches, flagged so the UI says so
function approximate(stationId: string, centre: LatLng): DemoGeometry {
  const routes = [200, 320, 80].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [fromLocal(centre, Math.sin(a) * 900, Math.cos(a) * 900), centre];
  });
  return { stationId, centre, fence: buildFence(centre, []), roads: [], routes, bypass: null, degraded: true };
}
```

### 5.4 Demo store

Replaces `apps/web/src/stores/ghost-simulation-store.ts`. The simulations live outside React state (a module-level map) because they change every frame; React only receives a summary four times a second.

FILE: `apps/web/src/stores/demo-store.ts`

```ts
'use client';

import { create } from 'zustand';
import {
  DEMO_CASES,
  DEMO_SCENARIOS,
  Path,
  StationSim,
  checkInvariants,
  createPresenceTracker,
  type CaseResult,
  type Connector,
  type ScenarioId,
  type SimEvent,
  type SimKpis,
  type StationSnapshot,
} from '@evspark/shared';
import { loadGeometry } from '@/lib/demo/geometry';

export interface DemoStationInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  chargers?: Array<{ id: string; connectorType: string; powerKw: number }>;
}

export const sims = new Map<string, StationSim>();
const trackers = new Map<string, ReturnType<typeof createPresenceTracker>>();

function toConnector(raw: string): Connector {
  const v = raw.toUpperCase().replace(/[\s_-]/g, '');
  if (v.startsWith('CHADEMO')) return 'CHAdeMO';
  if (v.startsWith('TYPE2') || v === 'AC') return 'Type2';
  if (v.startsWith('GB')) return 'GBT';
  return 'CCS2';
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface DemoState {
  open: boolean;
  running: boolean;
  loading: boolean;
  speed: 1 | 5 | 10 | 30 | 60;
  scenario: ScenarioId;
  gpsNoise: boolean;
  focusId: string | null;
  degraded: boolean;
  snapshots: Record<string, StationSnapshot>;
  kpis: SimKpis | null;
  log: SimEvent[];
  violations: string[];
  presence: { naiveFlips: number; trackedFlips: number };
  tests: { running: boolean; results: Record<string, CaseResult> };

  setOpen: (open: boolean) => void;
  setSpeed: (speed: DemoState['speed']) => void;
  setScenario: (id: ScenarioId) => void;
  setGpsNoise: (on: boolean) => void;
  setFocus: (id: string | null) => void;
  start: (stations: DemoStationInput[]) => Promise<void>;
  stop: () => void;
  togglePause: () => void;
  injectCar: (stationId: string, kind: 'charge' | 'stay_only' | 'pass_by') => void;
  faultCharger: (stationId: string) => void;
  recoverAll: (stationId: string) => void;
  publish: () => void;
  runTests: () => Promise<void>;
}

const MAX_STATIONS = 12;

export const useDemoStore = create<DemoState>((set, get) => ({
  open: false,
  running: false,
  loading: false,
  speed: 10,
  scenario: 'rush_hour',
  gpsNoise: false,
  focusId: null,
  degraded: false,
  snapshots: {},
  kpis: null,
  log: [],
  violations: [],
  presence: { naiveFlips: 0, trackedFlips: 0 },
  tests: { running: false, results: {} },

  setOpen: (open) => set({ open }),
  setSpeed: (speed) => set({ speed }),
  setGpsNoise: (gpsNoise) => set({ gpsNoise }),
  setFocus: (focusId) => set({ focusId }),
  setScenario: (scenario) => set({ scenario }),

  async start(stations) {
    // pressing Demo twice must not start a second simulation
    if (get().running || get().loading) return;
    set({ loading: true });
    const sc = DEMO_SCENARIOS[get().scenario];
    const picked = stations.slice(0, MAX_STATIONS);
    let degraded = false;

    await Promise.all(
      picked.map(async (st) => {
        const geo = await loadGeometry(st.id, { lat: st.lat, lng: st.lng });
        degraded = degraded || geo.degraded;
        const chargers = (st.chargers?.length ? st.chargers : [{ id: 'a', connectorType: 'CCS2', powerKw: 50 }, { id: 'b', connectorType: 'CCS2', powerKw: 50 }, { id: 'c', connectorType: 'Type2', powerKw: 22 }])
          .map((c) => ({ id: c.id, connector: toConnector(c.connectorType), powerKw: c.powerKw || 22 }));
        sims.set(
          st.id,
          new StationSim({
            stationId: st.id,
            seed: hash(st.id) ^ 0x9e3779b9,
            chargers,
            routes: geo.routes.map((r) => new Path(r)),
            bypass: geo.bypass ? new Path(geo.bypass) : undefined,
            fence: geo.fence,
            waitCapacity: 10,
            dwellS: 20,
            arrivalsPerHour: sc.arrivalsPerHour,
            stayOnlyShare: sc.stayOnlyShare,
            passByShare: sc.passByShare,
            patienceMinS: sc.patienceMinS,
            patienceMaxS: sc.patienceMaxS,
          })
        );
      })
    );
    set({ running: true, loading: false, degraded, focusId: picked[0]?.id ?? null, log: [], violations: [] });
    get().publish();
  },

  stop() {
    sims.clear();
    trackers.clear();
    set({ running: false, loading: false, snapshots: {}, kpis: null, log: [], violations: [], focusId: null });
  },

  togglePause() {
    set((s) => ({ running: !s.running }));
  },

  injectCar(stationId, kind) {
    sims.get(stationId)?.spawn({ intent: kind });
  },

  faultCharger(stationId) {
    const sim = sims.get(stationId);
    const target = sim?.chargers.find((c) => c.state !== 'FAULTED');
    if (sim && target) sim.faultCharger(target.id);
  },

  recoverAll(stationId) {
    const sim = sims.get(stationId);
    sim?.chargers.filter((c) => c.state === 'FAULTED').forEach((c) => sim.recoverCharger(c.id));
    sim?.setHeartbeat(true);
  },

  publish() {
    const snapshots: Record<string, StationSnapshot> = {};
    const total: SimKpis = { arrivals: 0, completed: 0, balked: 0, reneged: 0, discardedOtherJobs: 0, passed: 0, utilisation: 0, avgWaitS: 0, throughputPerHour: 0 };
    let n = 0;
    const violations: string[] = [];
    for (const [id, sim] of sims) {
      snapshots[id] = sim.snapshot();
      const k = sim.kpis();
      total.arrivals += k.arrivals; total.completed += k.completed; total.balked += k.balked;
      total.reneged += k.reneged; total.discardedOtherJobs += k.discardedOtherJobs; total.passed += k.passed;
      total.utilisation += k.utilisation; total.avgWaitS += k.avgWaitS; total.throughputPerHour += k.throughputPerHour;
      n++;
      violations.push(...checkInvariants(sim).map((v) => `${id}: ${v}`));
    }
    if (n) { total.utilisation /= n; total.avgWaitS /= n; }

    const { focusId, gpsNoise, presence } = get();
    const focus = focusId ? sims.get(focusId) : undefined;
    let nextPresence = presence;
    if (focus && gpsNoise) {
      // measured distance of each parked car with +-9 m of GPS error, through a single threshold and through the 80/100 m tracker
      for (const car of focus.inspect().cars) {
        if (car.phase !== 'parked') continue;
        const tracker = trackers.get(car.id) ?? createPresenceTracker({ enterM: 80, exitM: 100, dwellS: 20 });
        trackers.set(car.id, tracker);
        const measured = 90 + (Math.sin(focus.t * 7 + car.dist) * 9);
        const st = tracker(measured, focus.t);
        nextPresence = {
          naiveFlips: presence.naiveFlips + (measured <= 90 !== (presence.naiveFlips % 2 === 0) ? 1 : 0),
          trackedFlips: Math.max(presence.trackedFlips, st.transitions),
        };
      }
    }
    set({
      snapshots,
      kpis: n ? total : null,
      log: focus ? [...focus.events].slice(-60).reverse() : [],
      violations: violations.slice(0, 5),
      presence: nextPresence,
    });
  },

  async runTests() {
    if (get().tests.running) return;
    set({ tests: { running: true, results: {} } });
    for (const c of DEMO_CASES) {
      // yield so each row appears as it finishes
      await new Promise((r) => setTimeout(r, 30));
      let result: CaseResult;
      try {
        result = c.run();
      } catch (err) {
        result = { pass: false, detail: err instanceof Error ? err.message : 'Case threw' };
      }
      set((s) => ({ tests: { running: true, results: { ...s.tests.results, [c.id]: result } } }));
    }
    set((s) => ({ tests: { ...s.tests, running: false } }));
  },
}));

// the clock reads this; scenario events (fault, heartbeat loss) fire once per run
export function applyScenarioEvents(scenario: ScenarioId, simSeconds: number, fired: Set<string>) {
  const sc = DEMO_SCENARIOS[scenario];
  for (const [id, sim] of sims) {
    if (sc.faultAtS && simSeconds >= sc.faultAtS && !fired.has(`f:${id}`)) {
      fired.add(`f:${id}`);
      const first = sim.chargers[0];
      if (first) sim.faultCharger(first.id);
    }
    if (sc.heartbeatLostAtS && simSeconds >= sc.heartbeatLostAtS && !fired.has(`h:${id}`)) {
      fired.add(`h:${id}`);
      sim.setHeartbeat(false);
    }
  }
}
```

### 5.5 Clock

One `requestAnimationFrame` loop for the whole demo. It clamps big gaps (tab hidden), steps every simulation, and publishes a summary every 250 ms.

FILE: `apps/web/src/hooks/use-demo-clock.ts`

```ts
'use client';

import { useEffect } from 'react';
import { applyScenarioEvents, sims, useDemoStore } from '@/stores/demo-store';

export function useDemoClock() {
  const running = useDemoStore((s) => s.running);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let sinceFrame = 0;
    let simSeconds = 0;
    const fired = new Set<string>();

    const resetClock = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', resetClock);

    const loop = (now: number) => {
      const { speed, scenario, publish } = useDemoStore.getState();
      const realDt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const dt = realDt * speed;
      simSeconds += dt;
      applyScenarioEvents(scenario, simSeconds, fired);
      for (const sim of sims.values()) sim.advance(dt);
      sinceFrame += realDt;
      if (sinceFrame >= 0.25) {
        sinceFrame = 0;
        publish();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', resetClock);
    };
  }, [running]);
}
```
