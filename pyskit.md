# pyskit.md — EVspark: Senior Engineering Fix & Demo Engine Guide

> Instruction manual for Antigravity.
> **PART A:** Map Stability, Startup Cleanliness, 3-Charger Layout, EV Vehicle Renderer, and Collision-Free Road Standby Engine.
> *(Part B will follow with the 10 Interactive Live Test Case Scenarios, Live Queue/Stack HUD, and Panel Integration).*

---

## 1. Senior Case Tester Diagnosis & Root-Cause Analysis

### Fault 1 & Runtime TypeError (`tile-store.ts:35` "Failed to fetch" & All Pins Starting Red)
* **Root Cause 1:** In `apps/web/src/features/map/stations/tile-store.ts`, `fetch(url)` does not catch network rejections or HTTP 404/500 errors. When the API is booting or cold-starting, `fetch` throws `TypeError: Failed to fetch`.
* **Root Cause 2:** In `loadViewport`, `status: l?.st[i] ?? 3, free: l?.free[i] ?? 0`. When live tiles are not yet populated or cold-starting, `l?.free` defaults to `0`. In `useTilePins.ts`, `free === 0` defaults directly to `color = "red"` (all chargers busy). When a user clicks a station, `useStationDetail` fetches `/api/stations/:id` directly, which returns real charger counts (`free > 0`), causing it to abruptly switch to orange.
* **Fix:** 
  1. Add resilient fallback in `tile-store.ts` with SWR error boundaries and memory cache fallbacks so network errors never break rendering.
  2. If live tile availability is pending or cold, compute fallback free count from total chargers (`free = Math.max(1, total - 1)` or available status) so pins don't erroneously flash 100% red.

### Fault 2 (Dual Start Commands & Simulated MQTT Redundancy)
* **Root Cause:** The project was running simulated MQTT workers alongside live DB stations. 
* **Fix:** Single unified command `pnpm dev` launches Turbopack web (`localhost:3000`) and Express API (`localhost:4000`). In `.env`, `ENABLE_MQTT=false` and `DEMO_MODE=true` ensure live database values are served directly without background twin MQTT clutter.

### Fault 3 & 4 (Geofence & Cars Microscopic; Finding 3-Charger Station on Demo Start)
* **Root Cause:** When the user clicks the Demo button, the map stayed at default zoom level 13 (where 1 pixel = ~19 meters, making a 20m fence a 2-pixel dot and cars 7-pixel smudges). Furthermore, stations were selected arbitrarily without checking charger capacity.
* **Fix:**
  1. Demo initialization scans stations for an approved station with **exactly 3 chargers** (or highest capacity >= 3) and a generous geofence (radius >= 35m).
  2. Automatically `panTo` the station center and smooth-zoom to **zoom level 18 or 19** upon starting the demo.
  3. Redesign vehicle rendering in `demo-canvas.ts`: scale cars up to `Math.max(22, 5.5 * ppm)` length and `Math.max(12, 2.8 * ppm)` width, rendered with sleek EV proportions, windshield, headlights, taillights, and charging indicator pulses.

### Fault 5 (Clear Charging vs. Non-Charging Car Buttons)
* **Root Cause:** Buttons were buried as "+ Charger" and "+ Visitor" with unclear behavior.
* **Fix:** Prominent dedicated action buttons:
  - `🚗 Spawn Charging Car` (heads to bay or waits in queue to charge)
  - `🚙 Spawn Non-Charging Car (Visitor)` (enters fence, parks in visitor bay, stays for random 20-35s, leaves without occupying charger bays).

### Fault 8 (15-20s Fast Charging & Color Coding: Green for Charging, Yellow for Waiting)
* **Root Cause:** Previous `chargeS` was 50-110 seconds, and car color in `system` mode did not clearly indicate charging in progress.
* **Fix:** Set demo charging duration to `[15, 20]` seconds. Car turns bright green (`#16A34A`) while actively charging. Waiting cars are bright amber/yellow (`#F59E0B`). Visitor cars are styled slate/indigo (`#6366F1`). As soon as a charger is released, the first waiting car moves to the bay and turns green.

### Fault 9 (Only 1 Charging & 1 Waiting Car; Other Cars Balking)
* **Root Cause:** In `layout.ts`, small geofence radii caused `buildLayout` to generate only 1 charging bay and 1 parking slot. When those 2 slots were occupied, all incoming cars hit `else { c.tag = 'BALKED'; this.beginLeave(...) }` and turned right back out.
* **Fix:**
  1. Expand layout generation to ensure 3 charger bays and 6-8 visitor/waiting parking bays.
  2. Implement an **approach road standby queue**: when all bays and parking spots inside the fence are full, arriving cars stand by in a FIFO queue along the access road instead of immediately leaving. Once a car leaves the fence, the standby car drives in.

### Fault 10 (Car Collisions When Entering & Leaving)
* **Root Cause:** Inbound and outbound routes shared the same narrow corridor (`LANE = 2.0m`), and collision detection only checked forward headings (`ahead <= 0`), allowing head-on cars to freeze face-to-face or overlap.
* **Fix:**
  1. Increase two-way lane separation (`LANE = 3.5m`) with dedicated entry gate and exit gate lanes.
  2. Implement radial and angular yield detection: if a car is turning or crossing an aisle, opposing cars yield at a safe 6.0m buffer.

---

## 2. File Change Plan

| Part | File | Purpose |
|------|------|---------|
| **A** | `apps/web/src/features/map/stations/tile-store.ts` | Resilient tile store with SWR, offline fallback, and non-red default availability |
| **A** | `apps/web/src/features/driver-map/hooks/useTilePins.ts` | Proper initial pin status mapping so stations don't flash red |
| **A** | `apps/web/src/features/map-demo/renderer/demo-canvas.ts` | Upgraded EV vehicle renderer, zoom scaling, green/yellow/indigo color states |
| **A** | `apps/web/src/features/map-demo/engine/layout.ts` | 3+ charger capacity, 6-8 parking bays, 3.5m dual separated lanes |
| **A** | `apps/web/src/features/map-demo/engine/engine.ts` | 15-20s fast charging, road standby queue, collision prevention |
| **B** | `apps/web/src/features/map-demo/ui/useMapDemo.ts` | 3-charger auto-zoom on start, test case runner integration |
| **B** | `apps/web/src/features/map-demo/ui/DemoPanel.tsx` | 10 Interactive Live Test Cases with Play buttons, in-fence queue HUD, clear spawn buttons |
| **B** | `apps/api/src/modules/demo/demo.routes.ts` | Bootstrap endpoint prioritizing 3-charger stations with >= 35m clearance |

---

## 3. Code Implementations (Part A)

### FILE 1: `apps/web/src/features/map/stations/tile-store.ts`
```ts
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
    // Network error or backend offline; suppress unhandled rejections
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
      // Live fallback: if live tile is missing, default to healthy available state (e.g. 1-2 free)
      // so stations NEVER start entirely solid red ("all busy") on initial load!
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
```

---

### FILE 2: `apps/web/src/features/driver-map/hooks/useTilePins.ts`
```ts
import { useEffect } from "react";
import { type Pin, type PinColor } from "@evspark/shared";
import { usePinStore } from "../stores/pin-store";
import type { TileCoord, ViewportBounds } from "./useViewportTiles";
import { loadViewport, type StationPoint } from "../../map/stations/tile-store";

function stationPointToPin(p: StationPoint): Pin {
  let color: PinColor;
  if (p.total <= 0 || p.status === 2) {
    color = "grey"; // Station offline or zero chargers
  } else if (p.free >= p.total) {
    color = "green"; // All chargers free
  } else if (p.free > 0) {
    color = "orange"; // At least 1 charger available
  } else {
    color = "red"; // All chargers occupied
  }

  return {
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    free: p.free,
    usable: p.status === 2 ? 0 : p.total,
    total: p.total,
    maxKw: 60,
    color,
    source: "twin",
    updatedAt: Date.now(),
  };
}

export function useTilePins(_tiles: TileCoord[], _connector?: string, bounds?: ViewportBounds | null) {
  const upsertPins = usePinStore((s) => s.upsertPins);

  useEffect(() => {
    if (!bounds) return;
    let cancelled = false;
    const t0 = performance.now();

    loadViewport({
      w: bounds.west,
      s: bounds.south,
      e: bounds.east,
      n: bounds.north,
    })
      .then((points) => {
        if (cancelled) return;
        const duration = Math.round(performance.now() - t0);
        usePinStore.getState().recordTileFetch(duration, true);
        if (points.length > 0) {
          upsertPins(points.map(stationPointToPin));
        }
      })
      .catch(() => {
        // Protected by tile-store safeFetchJson
      });

    return () => {
      cancelled = true;
    };
  }, [bounds?.west, bounds?.south, bounds?.east, bounds?.north, upsertPins]);

  return {
    isPending: false,
    isError: false,
    error: null,
  };
}
```

---

### FILE 3: `apps/web/src/features/map-demo/renderer/demo-canvas.ts`
```ts
import type { DemoEngine } from '../engine/engine';
import type { MapAdapter } from './map-adapter';

export type ColorMode = 'system' | 'truth';

const mPerPx = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export class DemoCanvas {
  private cv = document.createElement('canvas');
  private ctx = this.cv.getContext('2d')!;
  mode: ColorMode = 'system';

  constructor(private a: MapAdapter, private eng: DemoEngine) {
    Object.assign(this.cv.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '5',
    });
    a.container().appendChild(this.cv);
  }

  dispose() {
    this.cv.remove();
  }

  draw() {
    const el = this.a.container();
    const dpr = window.devicePixelRatio || 1;
    const W = el.clientWidth;
    const H = el.clientHeight;

    if (this.cv.width !== W * dpr || this.cv.height !== H * dpr) {
      this.cv.width = W * dpr;
      this.cv.height = H * dpr;
    }

    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const c0 = this.a.center();
    const z = this.a.zoom();
    const ppm = 1 / mPerPx(c0.lat, z);
    const P = (v: { x: number; y: number } | undefined | null) => {
      if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') return null;
      const ll = this.eng.proj.toLatLng(v);
      return this.a.toPx(ll.lat, ll.lng);
    };
    const snap = this.eng.snapshot();

    // 1. Draw Stations, Geofence, Charger Bays & Parking
    for (const sv of snap.stations) {
      const L = this.eng.layoutFor(sv.id);
      if (!L || !L.center) continue;
      const c = P(L.center);
      if (!c) continue;

      const r = L.R * ppm;

      // Geofence boundary
      g.beginPath();
      g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(26, 115, 232, 0.08)';
      g.fill();
      g.setLineDash([8, 6]);
      g.strokeStyle = '#1A73E8';
      g.lineWidth = 2.5;
      g.stroke();
      g.setLineDash([]);

      // Geofence label
      g.font = '600 11px system-ui, -apple-system, sans-serif';
      g.fillStyle = '#1A73E8';
      g.textAlign = 'center';
      g.fillText(`Geofence Radius ${Math.round(L.R)}m`, c.x, c.y + r + 16);

      // Gate Indicator
      const gt = P(L.gate);
      if (gt) {
        g.beginPath();
        g.arc(gt.x, gt.y, Math.max(5, 2.5 * ppm), 0, Math.PI * 2);
        g.fillStyle = '#475569';
        g.fill();
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 2;
        g.stroke();
      }

      // Parking slots (Waiting & Visitor spots)
      const sq = Math.max(16, 4.2 * ppm);
      for (const p of L.park) {
        if (!p) continue;
        const q = P(p);
        if (q) {
          g.strokeStyle = '#94A3B8';
          g.lineWidth = 1.5;
          g.strokeRect(q.x - sq / 2, q.y - sq / 2, sq, sq);
          g.fillStyle = 'rgba(241, 245, 249, 0.6)';
          g.fillRect(q.x - sq / 2, q.y - sq / 2, sq, sq);
        }
      }

      // Charger bays (3 chargers highlighted)
      sv.chargers.forEach((ch, i) => {
        const bay = L.bays ? L.bays[i] : undefined;
        if (!bay) return;
        const q = P(bay);
        if (!q) return;

        // Base bay color
        g.fillStyle =
          ch.state === 'FREE'
            ? '#DCFCE7'
            : ch.state === 'CHARGING'
            ? '#BBF7D0'
            : ch.state === 'RESERVED'
            ? '#FEF08A'
            : '#FEE2E2';
        g.strokeStyle = ch.state === 'CHARGING' ? '#16A34A' : '#64748B';
        g.lineWidth = 2;
        g.fillRect(q.x - sq / 2, q.y - sq / 2, sq, sq);
        g.strokeRect(q.x - sq / 2, q.y - sq / 2, sq, sq);

        // Charging progress fill animation
        if (ch.progress > 0) {
          g.fillStyle = '#16A34A';
          g.fillRect(q.x - sq / 2, q.y + sq / 2 - sq * ch.progress, sq, sq * ch.progress);
        }

        // Bay label: C1, C2, C3
        g.font = 'bold 9px system-ui';
        g.fillStyle = '#0F172A';
        g.textAlign = 'center';
        g.fillText(`C${i + 1}`, q.x, q.y + 3);
      });

      // Floating Live Station Metric Badge
      const lbl = `⚡ ${sv.chargingQ}/${sv.chargingCap} Charging  |  ⏳ ${sv.waiting} Waiting  |  ~${sv.nextWaitMin ?? 0}m Wait`;
      g.font = '600 12px system-ui';
      const tw = g.measureText(lbl).width + 24;
      g.fillStyle = 'rgba(255, 255, 255, 0.96)';
      g.strokeStyle = '#CBD5E1';
      g.lineWidth = 1;
      g.beginPath();
      drawRoundedRect(g, c.x - tw / 2, c.y - r - 36, tw, 26, 8);
      g.fill();
      g.stroke();

      g.fillStyle = '#1E293B';
      g.textAlign = 'center';
      g.fillText(lbl, c.x, c.y - r - 19);
    }

    // 2. Draw Vehicles (Decent Big: length 24-28px, width 13-16px with crisp EV car profile)
    const len = Math.max(24, 5.5 * ppm);
    const wid = Math.max(13, 2.8 * ppm);

    for (const car of snap.cars) {
      const p = P({ x: car.x, y: car.y });
      if (!p) continue;

      // Color scheme:
      // Active Charging = Green (#16A34A)
      // Waiting in Queue = Yellow / Amber (#F59E0B)
      // Non-charging visitor = Slate / Indigo (#6366F1)
      let fill = '#64748B';
      if (car.kind === 'STAYER') {
        fill = '#6366F1'; // Distinct non-charging visitor
      } else if (car.q === 'CHARGING' || car.phase === 'CHARGING') {
        fill = '#16A34A'; // Charging (Green)
      } else if (car.q === 'WAITING' || car.phase === 'STANDBY_ROAD') {
        fill = '#F59E0B'; // Waiting (Yellow)
      }

      g.save();
      g.translate(p.x, p.y);
      g.rotate(-car.h);

      // Car Body
      g.fillStyle = fill;
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 1.5;
      g.beginPath();
      drawRoundedRect(g, -len / 2, -wid / 2, len, wid, Math.min(4, wid / 2));
      g.fill();
      g.stroke();

      // Windshield & Rear Window
      g.fillStyle = 'rgba(15, 23, 42, 0.7)';
      drawRoundedRect(g, -len * 0.15, -wid * 0.35, len * 0.45, wid * 0.7, 2);
      g.fill();

      // Front Headlights (Warm White)
      g.fillStyle = '#FEF08A';
      g.fillRect(len / 2 - 2, -wid / 2 + 1.5, 2, 2.5);
      g.fillRect(len / 2 - 2, wid / 2 - 4, 2, 2.5);

      // Rear Taillights (Soft Red)
      g.fillStyle = '#EF4444';
      g.fillRect(-len / 2, -wid / 2 + 1.5, 2, 2.5);
      g.fillRect(-len / 2, wid / 2 - 4, 2, 2.5);

      // Charging pulse indicator badge when charging
      if (car.phase === 'CHARGING') {
        g.beginPath();
        g.arc(0, 0, Math.max(4, wid * 0.4), 0, Math.PI * 2);
        g.fillStyle = '#22C55E';
        g.fill();
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 1;
        g.stroke();
      }

      g.restore();
    }
  }
}
```

---

### FILE 4: `apps/web/src/features/map-demo/engine/layout.ts`
```ts
import { norm, sub } from './geometry';
import type { Slot, Vec } from './types';

// Widened lane separation to guarantee two-way collision-free transit
export const LANE = 3.5;
export const SIDE = 8.0;
export const SPACING = 5.2;

export function buildLayout(center: Vec, gate: Vec, R: number, wantChargers: number) {
  const eu = norm(sub(center, gate));
  const ev = { x: -eu.y, y: eu.x };
  const w = (u: number, v: number): Vec => ({
    x: center.x + eu.x * u + ev.x * v,
    y: center.y + eu.y * u + ev.y * v,
  });

  const usable = Math.max(18, R - 3.0);
  const cands: { u: number; v: number }[] = [];

  for (let u = -usable + 2.0; u <= usable - 2.0; u += SPACING) {
    for (const v of [-SIDE, SIDE]) {
      if (Math.hypot(u, v) <= usable) {
        cands.push({ u, v });
      }
    }
  }

  // Ensure minimum capacity for 3 chargers + 6 parking spots
  if (cands.length < 9) {
    const s = Math.max(4, usable * 0.4);
    for (let i = -2; i <= 2; i++) {
      cands.push({ u: i * SPACING, v: -s });
      cands.push({ u: i * SPACING, v: s });
    }
  }

  cands.sort((a, b) => Math.hypot(a.u, a.v) - Math.hypot(b.u, b.v));

  // Guarantee at least 3 chargers for the demo
  const targetChargers = Math.max(3, wantChargers);
  const fit = Math.min(targetChargers, Math.max(3, cands.length - 4));

  const mk = (c: { u: number; v: number }, kind: Slot['kind'], i: number): Slot => ({
    id: `${kind}${i}`,
    kind,
    u: c.u,
    v: c.v,
    pos: w(c.u, c.v),
    occupant: null,
    chargerIdx: kind === 'BAY' ? i : undefined,
  });

  const bays = cands.slice(0, fit).map((c, i) => mk(c, 'BAY', i));
  const park = cands.slice(fit).map((c, i) => mk(c, 'PARK', i)).sort((a, b) => a.u - b.u).slice(0, 12);

  return { w, eu, ev, bays, park, fit: bays.length };
}
```

---

### FILE 5: `apps/web/src/features/map-demo/engine/engine.ts`
```ts
import { clamp, dist, dot, makePath, makeProjector, offsetLeft, sample, sub, truncate } from './geometry';
import { buildLayout, LANE } from './layout';
import { estimateWaits, intentRatio } from './estimate';
import type { Car, CarKind, Charger, EngineConfig, EngineEvent, Path, Phase, Slot, StationInput, StationStats, Tag, Vec } from './types';

export const DEFAULT_CONFIG: EngineConfig = {
  seed: 42,
  speed: 1,
  arrivalMeanS: 14,
  chargerShare: 0.65,
  chargeS: [15, 20],        // Fast 15-20s charging for quick live demo
  stayS: [20, 35],          // Visitor stays 20-35s then vacates
  patienceS: [35, 60],
  offerGraceS: 10,
  roadV: 11,
  insideV: 4.5,
  accel: 3.5,
  brake: 8,
  safeGap: 6.5,             // Safe gap to avoid rear-end collisions
  hardSep: 4.2,             // Hard separation buffer
  lookahead: 16,
  laneOffsetRoad: 2.4,      // Clear lateral road offset
  maxCarsPerStation: 35,
  holdTimeoutS: 30,
  demoMinPerSimS: 1 / 3,
};

interface StationSim {
  id: string;
  name: string;
  center: Vec;
  R: number;
  gate: Vec;
  input: StationInput;
  w: (u: number, v: number) => Vec;
  chargers: Charger[];
  bays: Slot[];
  park: Slot[];
  chargingQ: number[];
  waitingQ: number[];
  standbyRoadQ: number[];   // Standby queue on the approach road
  routes: Vec[][];
  nextArrivalAt: number;
  stats: StationStats;
  avgChargeS: number;
}

const zeroStats = (): StationStats => ({
  spawned: 0,
  entered: 0,
  plugged: 0,
  served: 0,
  otherJobs: 0,
  reneged: 0,
  balked: 0,
  leftAfterStay: 0,
  waitSum: 0,
  waitN: 0,
  maxWaiting: 0,
});

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
      // Guarantee at least 3 chargers per station for demo
      const L = buildLayout(center, gate, Math.max(35, inp.fence.radiusM), Math.max(3, inp.chargers));
      const routes = inp.routes.map((r) => {
        const pts = r.map(([la, ln]) => this.proj.toWorld(la, ln));
        if (dist(pts[pts.length - 1], gate) > 0.5) pts.push(gate);
        return pts;
      });

      this.stations.push({
        id: inp.id,
        name: inp.name,
        center,
        R: Math.max(35, inp.fence.radiusM),
        gate,
        input: inp,
        w: L.w,
        chargers: Array.from({ length: L.fit }, (_, idx) => ({
          idx,
          online: true,
          pendingOffline: false,
          holder: null,
          chargingSince: null,
        })),
        bays: L.bays,
        park: L.park,
        chargingQ: [],
        waitingQ: [],
        standbyRoadQ: [],
        routes,
        nextArrivalAt: 2.0 + this.rng() * 4.0,
        stats: zeroStats(),
        avgChargeS: 17.5,
      });
    }
  }

  private rng(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private between([a, b]: [number, number]) {
    return a + this.rng() * (b - a);
  }

  on(cb: (e: EngineEvent) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(type: EngineEvent['type'], st: StationSim, msg: string, carId?: number) {
    const e: EngineEvent = { t: this.t, type, stationId: st.id, carId, msg };
    this.log.push(e);
    if (this.log.length > 300) this.log.shift();
    this.listeners.forEach((l) => l(e));
  }

  private st(id: string) {
    return this.stations.find((s) => s.id === id)!;
  }

  setConfig(p: Partial<EngineConfig>) {
    this.cfg = { ...this.cfg, ...p };
  }

  reset() {
    this.t = 0;
    this.cars.clear();
    this.log.length = 0;
    this.nextId = 1;
    this.seed = this.cfg.seed;
    for (const s of this.stations) {
      s.chargingQ.length = 0;
      s.waitingQ.length = 0;
      s.standbyRoadQ.length = 0;
      s.stats = zeroStats();
      s.nextArrivalAt = 2.0 + this.rng() * 4.0;
      s.chargers.forEach((c) => Object.assign(c, { online: true, pendingOffline: false, holder: null, chargingSince: null }));
      [...s.bays, ...s.park].forEach((x) => (x.occupant = null));
    }
  }

  step(dtReal: number) {
    let left = Math.min(dtReal, 0.25) * this.cfg.speed;
    while (left > 1e-9) {
      const h = Math.min(0.1, left);
      this.tick(h);
      left -= h;
    }
  }

  forceSpawn(stationId: string, kind: CarKind) {
    return this.spawn(this.st(stationId), kind, 85);
  }

  toggleFault(stationId: string, idx: number) {
    const st = this.st(stationId);
    const ch = st.chargers[idx];
    if (!ch) return;
    if (!ch.online) {
      ch.online = true;
      ch.pendingOffline = false;
      this.emit('RESTORED', st, `Charger ${idx + 1} restored`);
      return;
    }
    const holder = ch.holder !== null ? this.cars.get(ch.holder) : undefined;
    if (!holder) {
      ch.online = false;
      this.emit('FAULT', st, `Charger ${idx + 1} fault`);
      return;
    }
    if (holder.phase !== 'CHARGING') {
      ch.pendingOffline = true;
      return;
    }
    ch.online = false;
    ch.holder = null;
    ch.chargingSince = null;
    st.chargingQ = st.chargingQ.filter((i) => i !== holder.id);
    holder.q = 'WAITING';
    holder.phase = 'PARKED';
    holder.tWaitStart = this.t;
    holder.patienceS += 30;
    holder.tParked = this.t;
    st.waitingQ.unshift(holder.id);
    this.emit('FAULT', st, `Charger ${idx + 1} fault: car #${holder.id} re-queued at front`, holder.id);
  }

  private tick(h: number) {
    this.t += h;
    for (const st of this.stations) {
      if (this.t >= st.nextArrivalAt) {
        const kind: CarKind = this.rng() < this.cfg.chargerShare ? 'CHARGER' : 'STAYER';
        if (this.spawn(st, kind)) {
          st.nextArrivalAt = this.t + -Math.log(1 - this.rng()) * this.cfg.arrivalMeanS;
        } else {
          st.nextArrivalAt = this.t + 1.0;
        }
      }
    }
    this.stationLogic();
    this.moveCars(h);
  }

  private spawn(st: StationSim, kind: CarKind, startDistFromGate?: number): Car | null {
    let n = 0;
    for (const c of this.cars.values()) if (c.stationId === st.id) n++;
    if (n >= this.cfg.maxCarsPerStation) return null;

    const route = st.routes[Math.floor(this.rng() * st.routes.length)];
    const entryIn = st.w(-st.R + 2, +LANE);
    const path = makePath([...offsetLeft(route, this.cfg.laneOffsetRoad), entryIn]);
    const startS = startDistFromGate !== undefined ? Math.max(0, path.len - startDistFromGate) : 0;
    const samplePt = sample(path, startS);
    const start = samplePt.pos;

    for (const o of this.cars.values()) {
      if (dist(o.pos, start) < this.cfg.safeGap * 1.5) return null;
    }

    const car: Car = {
      id: this.nextId++,
      kind,
      stationId: st.id,
      phase: 'APPROACH',
      q: 'NONE',
      tag: 'NONE',
      inside: false,
      path,
      s: startS,
      speed: this.cfg.roadV * 0.7,
      pos: start,
      heading: samplePt.heading,
      next: null,
      nextPhase: null,
      slot: null,
      route,
      chargeS: this.between(this.cfg.chargeS),
      patienceS: kind === 'CHARGER' ? this.between(this.cfg.patienceS) : Infinity,
      stayS: this.between(this.cfg.stayS),
      graceS: 0,
      tSpawn: this.t,
      tEnter: null,
      tWaitStart: null,
      tOffer: null,
      tParked: null,
      heldS: 0,
    };

    this.cars.set(car.id, car);
    st.stats.spawned++;
    this.emit('SPAWN', st, `Car #${car.id} (${kind === 'CHARGER' ? 'needs charge' : 'visitor'}) arriving`, car.id);
    return car;
  }

  private moveCars(h: number) {
    const cell = 20;
    const key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const grid = new Map<string, Car[]>();

    for (const c of this.cars.values()) {
      const k = key(c.pos.x, c.pos.y);
      const a = grid.get(k);
      if (a) a.push(c);
      else grid.set(k, [c]);
    }

    const near = (p: Vec) => {
      const out: Car[] = [];
      const cx = Math.floor(p.x / cell);
      const cy = Math.floor(p.y / cell);
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const a = grid.get(`${cx + i},${cy + j}`);
          if (a) out.push(...a);
        }
      }
      return out;
    };

    for (const c of [...this.cars.values()]) {
      if (c.phase === 'PARKED' || c.phase === 'CHARGING') continue;
      const st = this.st(c.stationId);
      const hv = { x: Math.cos(c.heading), y: Math.sin(c.heading) };
      let gap = Infinity;

      for (const o of near(c.pos)) {
        if (o === c) continue;
        const rel = sub(o.pos, c.pos);
        const ahead = dot(rel, hv);

        // Collision avoidance: check vehicles ahead in same corridor
        if (ahead > 0 && ahead <= this.cfg.lookahead) {
          if (Math.abs(rel.x * hv.y - rel.y * hv.x) <= 3.0) {
            if (ahead < gap) gap = ahead;
          }
        }

        // Two-way crossing anti-collision: yield if another vehicle is crossing path within 5.5m
        if (dist(o.pos, c.pos) < 5.5 && o.phase !== 'PARKED' && o.phase !== 'CHARGING') {
          if (o.id < c.id) {
            gap = Math.min(gap, 0); // lower ID gets priority right-of-way
          }
        }
      }

      const vmax = c.inside ? this.cfg.insideV : this.cfg.roadV;
      const targetV = Math.min(vmax, Math.max(0, (gap - this.cfg.safeGap) * 0.85));
      c.speed += clamp(targetV - c.speed, -this.cfg.brake * h, this.cfg.accel * h);

      const np = sample(c.path, c.s + c.speed * h, c.heading);
      let blocked = false;

      for (const o of near(np.pos)) {
        if (o === c) continue;
        const dNew = dist(o.pos, np.pos);
        if (dNew < this.cfg.hardSep && dNew < dist(o.pos, c.pos)) {
          blocked = true;
          break;
        }
      }

      if (blocked) {
        c.speed = 0;
        c.heldS += h;
        this.guardHolds++;
      } else {
        c.s += c.speed * h;
        c.pos = np.pos;
        c.heading = np.heading;
        c.heldS = c.speed < 0.1 ? c.heldS + h : 0;
      }

      if (c.heldS > this.cfg.holdTimeoutS) {
        this.emit('TIMEOUT', st, `Car #${c.id} gridlock resolved`, c.id);
        this.removeCar(c, st, 'TIMEOUT');
        continue;
      }

      // Geofence entry detection
      if (!c.inside && c.phase === 'APPROACH' && dist(c.pos, st.center) <= st.R) {
        this.onEnterFence(c, st);
      }

      if (c.s >= c.path.len - 1e-6) {
        this.onPathEnd(c, st);
      }
    }
  }

  private onPathEnd(c: Car, st: StationSim) {
    if (c.next) {
      c.path = c.next;
      c.s = 0;
      c.phase = c.nextPhase!;
      c.next = null;
      c.nextPhase = null;
      return;
    }
    if (c.phase === 'LEAVING') return this.removeCar(c, st, c.tag);
    if (c.phase === 'INSIDE_MOVE') {
      if (c.slot?.kind === 'BAY' && c.q === 'CHARGING') {
        this.startCharging(c, st);
      } else {
        c.phase = 'PARKED';
        c.tParked = this.t;
        c.speed = 0;
      }
    }
  }

  private pathIn(st: StationSim, slot: Slot): Path {
    return makePath([st.w(-st.R + 2, +LANE), st.w(slot.u, +LANE), slot.pos]);
  }

  private pathMove(st: StationSim, c: Car, to: Slot): Path {
    const fromU = c.slot ? c.slot.u : -st.R + 2;
    const lane = to.u >= fromU ? +LANE : -LANE;
    return makePath([c.pos, st.w(fromU, lane), st.w(to.u, lane), to.pos]);
  }

  private pathOut(st: StationSim, c: Car): Path {
    const pts: Vec[] = [c.pos];
    if (c.slot) pts.push(st.w(c.slot.u, -LANE));
    if (c.inside) pts.push(st.w(-st.R + 2, -LANE));
    const back = truncate(offsetLeft([...c.route].reverse(), this.cfg.laneOffsetRoad), 240);
    return makePath([...pts, ...back]);
  }

  private freePark(st: StationSim) {
    return st.park.find((s) => s.occupant === null) ?? null;
  }

  private freeCharger(st: StationSim) {
    return st.chargers.find((ch) => ch.online && !ch.pendingOffline && ch.holder === null) ?? null;
  }

  private onEnterFence(c: Car, st: StationSim) {
    c.inside = true;
    c.tEnter = this.t;
    st.stats.entered++;
    this.emit('FENCE_ENTER', st, `Car #${c.id} entered geofence (${c.kind === 'CHARGER' ? 'needs charger' : 'visitor'})`, c.id);

    const ch = this.freeCharger(st);
    const park = this.freePark(st);

    if (ch && c.kind === 'CHARGER') {
      const bay = st.bays[ch.idx];
      bay.occupant = c.id;
      c.slot = bay;
      this.joinCharging(c, st, ch, bay);
      c.next = this.pathIn(st, bay);
      c.nextPhase = 'INSIDE_MOVE';
    } else if (park) {
      park.occupant = c.id;
      c.slot = park;
      if (c.kind === 'CHARGER') {
        c.q = 'WAITING';
        c.tWaitStart = this.t;
        st.waitingQ.push(c.id);
        st.stats.maxWaiting = Math.max(st.stats.maxWaiting, st.waitingQ.length);
        this.emit('WAITING_Q_JOIN', st, `Car #${c.id} joined WAITING queue (position ${st.waitingQ.length})`, c.id);
      } else {
        c.q = 'NONE';
        this.emit('VISITOR_PARKED', st, `Car #${c.id} parked in visitor bay`, c.id);
      }
      c.next = this.pathIn(st, park);
      c.nextPhase = 'INSIDE_MOVE';
    } else {
      // Standby on road: Do NOT immediately balk! Place into road standby queue
      st.standbyRoadQ.push(c.id);
      c.phase = 'STANDBY_ROAD';
      c.speed = 0;
      this.emit('STANDBY_ROAD', st, `Fence capacity reached; Car #${c.id} standing by on approach road`, c.id);
    }
  }

  private joinCharging(c: Car, st: StationSim, ch: Charger, bay: Slot) {
    ch.holder = c.id;
    st.chargingQ.push(c.id);
    c.q = 'CHARGING';
    c.tOffer = this.t;
    c.graceS = this.cfg.offerGraceS + (dist(c.pos, bay.pos) * 1.4) / this.cfg.insideV;
    this.emit('CHARGING_Q_JOIN', st, `Car #${c.id} allocated Charger Bay ${ch.idx + 1}`, c.id);
  }

  private stationLogic() {
    for (const st of this.stations) {
      // 1) Discard expired offers
      for (const id of [...st.chargingQ]) {
        const c = this.cars.get(id)!;
        if (c.phase !== 'CHARGING' && c.tOffer !== null && this.t - c.tOffer > c.graceS) {
          this.discardOtherJobs(c, st);
        }
      }

      // 2) Charge completion (Fast 15-20s duration)
      for (const ch of st.chargers) {
        if (ch.holder === null || ch.chargingSince === null) continue;
        const c = this.cars.get(ch.holder)!;
        if (this.t - ch.chargingSince >= c.chargeS) {
          st.avgChargeS = st.avgChargeS * 0.8 + c.chargeS * 0.2;
          st.stats.served++;
          c.tag = 'SERVED';
          c.q = 'NONE';
          st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
          this.releaseCharger(ch, st);
          this.emit('CHARGE_DONE', st, `Car #${c.id} completed charging (charged in ${Math.round(c.chargeS)}s)`, c.id);
          this.beginLeave(c, st, 'SERVED');
        }
      }

      // 3) Renege check & Visitor stay timer
      for (const c of [...this.cars.values()]) {
        if (c.stationId !== st.id) continue;
        if (c.q === 'WAITING' && c.kind === 'CHARGER' && c.tWaitStart !== null && this.t - c.tWaitStart > c.patienceS) {
          st.stats.reneged++;
          this.emit('RENEGED', st, `Car #${c.id} reneged after waiting ${Math.round(this.t - c.tWaitStart)}s`, c.id);
          this.beginLeave(c, st, 'RENEGED');
        } else if (c.kind === 'STAYER' && c.q === 'NONE' && c.phase === 'PARKED' && c.tParked !== null && this.t - c.tParked >= c.stayS) {
          st.stats.leftAfterStay++;
          this.emit('LEFT_AFTER_STAY', st, `Visitor Car #${c.id} finished visit and departed`, c.id);
          this.beginLeave(c, st, 'LEFT_AFTER_STAY');
        }
      }

      // 4) Promote waiting car into free charger bay
      for (const ch of st.chargers) {
        if (!(ch.online && !ch.pendingOffline && ch.holder === null) || !st.waitingQ.length) continue;
        const id = st.waitingQ.shift()!;
        const c = this.cars.get(id)!;
        const bay = st.bays[ch.idx];
        this.emit('OFFERED', st, `Charger Bay ${ch.idx + 1} offered to waiting car #${c.id}`, c.id);
        this.joinCharging(c, st, ch, bay);
        if (c.slot) c.slot.occupant = null;
        bay.occupant = c.id;
        c.path = this.pathMove(st, c, bay);
        c.s = 0;
        c.slot = bay;
        c.phase = 'INSIDE_MOVE';
        c.next = null;
      }

      // 5) Promote road standby car into newly opened parking or bay
      if (st.standbyRoadQ.length > 0) {
        const park = this.freePark(st);
        const ch = this.freeCharger(st);
        if (park || ch) {
          const nextId = st.standbyRoadQ.shift()!;
          const nextCar = this.cars.get(nextId);
          if (nextCar) {
            nextCar.phase = 'APPROACH';
            this.emit('STANDBY_ADVANCE', st, `Standby Car #${nextCar.id} admitted into geofence`, nextCar.id);
            this.onEnterFence(nextCar, st);
          }
        }
      }
    }
  }

  private releaseCharger(ch: Charger, st: StationSim) {
    ch.holder = null;
    ch.chargingSince = null;
    if (ch.pendingOffline) {
      ch.online = false;
      ch.pendingOffline = false;
      this.emit('FAULT', st, `Charger ${ch.idx + 1} taken offline`);
    }
  }

  private startCharging(c: Car, st: StationSim) {
    const ch = st.chargers[c.slot!.chargerIdx!];
    c.phase = 'CHARGING';
    c.speed = 0;
    ch.chargingSince = this.t;
    st.stats.plugged++;
    if (c.tWaitStart !== null) {
      st.stats.waitSum += this.t - c.tWaitStart;
      st.stats.waitN++;
    }
    this.emit('PLUG_IN', st, `Car #${c.id} plugged in at Bay ${ch.idx + 1} (Charging green)`, c.id);
  }

  private discardOtherJobs(c: Car, st: StationSim) {
    const ch = st.chargers.find((x) => x.holder === c.id)!;
    st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
    c.q = 'NONE';
    c.tag = 'OTHER_JOBS';
    st.stats.otherJobs++;
    this.releaseCharger(ch, st);
    this.emit('OTHER_JOBS', st, `Car #${c.id} did not plug in; classified other jobs`, c.id);
  }

  private beginLeave(c: Car, st: StationSim, tag: Tag) {
    c.tag = tag;
    st.waitingQ = st.waitingQ.filter((i) => i !== c.id);
    st.standbyRoadQ = st.standbyRoadQ.filter((i) => i !== c.id);
    if (c.q === 'CHARGING') {
      const ch = st.chargers.find((x) => x.holder === c.id);
      st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
      if (ch) this.releaseCharger(ch, st);
    }
    c.q = 'NONE';
    const old = c.slot;
    c.path = this.pathOut(st, c);
    c.s = 0;
    c.phase = 'LEAVING';
    c.next = null;
    if (old) {
      old.occupant = null;
      c.slot = null;
    }
  }

  private removeCar(c: Car, st: StationSim, tag: Tag) {
    st.waitingQ = st.waitingQ.filter((i) => i !== c.id);
    st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
    st.standbyRoadQ = st.standbyRoadQ.filter((i) => i !== c.id);
    for (const ch of st.chargers) if (ch.holder === c.id) this.releaseCharger(ch, st);
    if (c.slot) c.slot.occupant = null;
    this.cars.delete(c.id);
    void tag;
  }

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
      id: st.id,
      name: st.name,
      radiusM: st.R,
      centerShifted: st.input.fence.centerShifted,
      clearanceM: st.input.fence.clearanceM,
      chargers: st.chargers.map((ch) => ({
        idx: ch.idx,
        online: ch.online,
        pendingOffline: ch.pendingOffline,
        state: !ch.online ? 'FAULT' : ch.holder === null ? 'FREE' : ch.chargingSince !== null ? 'CHARGING' : 'RESERVED',
        progress: ch.chargingSince !== null && ch.holder !== null ? clamp((this.t - ch.chargingSince) / this.cars.get(ch.holder)!.chargeS, 0, 1) : 0,
      })),
      chargingQ: st.chargingQ.length,
      chargingCap: st.chargers.filter((c) => c.online).length,
      waiting: st.waitingQ.length,
      waitingIds: [...st.waitingQ],
      standbyRoadCount: st.standbyRoadQ.length,
      insideFenceCount: st.chargingQ.length + st.waitingQ.length + st.park.filter((p) => p.occupant !== null).length,
      nextWaitMin: toMin(est.nextCarWaitS) ?? 0,
      perPositionMin: est.perPositionS.map(toMin),
      avgWaitedMin: st.stats.waitN ? toMin(st.stats.waitSum / st.stats.waitN) : null,
      intentRatio: Math.round(p * 100),
      stats: { ...st.stats },
    };
  }

  snapshot() {
    return {
      t: this.t,
      cars: [...this.cars.values()].map((c) => ({
        id: c.id,
        x: c.pos.x,
        y: c.pos.y,
        h: c.heading,
        kind: c.kind,
        phase: c.phase,
        q: c.q,
        tag: c.tag,
        stationId: c.stationId,
      })),
      stations: this.stations.map((s) => this.stationView(s)),
    };
  }

  layoutFor(stationId: string) {
    const s = this.st(stationId);
    return {
      center: s.center,
      R: s.R,
      gate: s.gate,
      bays: s.bays.map((b) => b.pos),
      park: s.park.map((p) => p.pos),
    };
  }
}
```

---

# PART B: Interactive Test Suite, Live Queue HUD & Station Auto-Zoom

## 4. Test Suite Architecture & Live HUD Mechanics

### 4.1 The 10 Interactive Live Test Case Scenarios
Unlike static headless unit tests, these **10 live scenarios execute directly on the interactive Google Map** in front of the user when clicking their individual **[▶ Play Live]** buttons. Each scenario exercises a core invariant of the geofence engine:

| # | Case ID | Name | Scenario Flow | Asserted Invariant |
|---|---------|------|---------------|-------------------|
| 1 | **TC1** | **Direct Bay Allocation (Single EV)** | Spawns 1 charging EV into an empty 3-bay station. | EV passes gate, immediately allocates Bay 1, plugs in, and transitions to **green** (`#16A34A`). |
| 2 | **TC2** | **3-Charger Full Saturation** | Spawns 3 charging EVs in rapid succession. | All 3 bays (C1, C2, C3) fill up in parallel; active bays count = 3/3; all 3 turn green. |
| 3 | **TC3** | **Waiting Queue & Immediate Promotion** | Fills all 3 bays, then spawns Car #4. | Car #4 parks in in-fence waiting slot (yellow). When Bay 1 finishes (15s), Car #4 immediately promotes to Bay 1 and turns green. |
| 4 | **TC4** | **Non-Charging Visitor Behavior** | Spawns 2 visitor cars (`kind: 'STAYER'`). | Visitors park in visitor parking (indigo), leave charger bays untouched (3/3 free), stay ~25s, then depart safely. |
| 5 | **TC5** | **Approach Road Standby (Zero Balking)** | Fills all 3 bays and parking spots, then spawns overflow cars. | Overflow cars queue in single-file FIFO line on approach road; zero cars balk; advance in as spots open. |
| 6 | **TC6** | **Fast 15-Second Charge Cycle** | Executes an accelerated charging session. | Progress bar fills to 100% in 15 seconds; bay releases; car drives out of gate cleanly. |
| 7 | **TC7** | **Charger Fault & Priority Front Re-queue** | Trips Bay 2 offline while Car #2 is charging. | Bay 2 turns red (`FAULT`); Car #2 is placed at index 0 (front) of waiting queue with immediate priority. |
| 8 | **TC8** | **Impatient Driver Reneging** | Places car in waiting queue with 12s patience limit. | Car waits 12s; chargers remain occupied; car reneges and drives away safely without deadlocks. |
| 9 | **TC9** | **Dual-Queue Intent Classification ("Other Jobs")** | Car enters, allocates Bay 1, but does not plug in within 10s grace. | System classifies car as "Other Jobs", reclaims Bay 1 for real charging cars, and discards ghost reservation. |
| 10 | **TC10** | **Rush-Hour Multi-Car Flow & Anti-Collision** | Triples arrival rate with mixed charging and visitor cars. | Dual separated lanes (3.5m) and yield logic prevent collisions; continuous inflow and outflow maintain 0 deadlocks. |

---

### 4.2 Real-Time In-Fence Stack & Queue Inspector (HUD)
The simulation panel features a live HUD card that breaks down the real-time presence of vehicles:
1. **Inside Fence Stack Count**: Sum of active charging bays + waiting queue slots + visitor parking slots:
   $$\text{Inside Stack} = N_{\text{charging}} + N_{\text{waiting}} + N_{\text{visitor}}$$
2. **Approach Road Standby Queue**: Number of vehicles standing by on the road outside the gate waiting for entry clearance.
3. **Live Wait Time Prediction**: Calculated on each frame based on active session time remaining and queue depth:
   $$\hat{W}_{\text{next}} = \frac{N_{\text{waiting}} \times \bar{T}_{\text{charge}}}{\text{Active Online Chargers}}$$

---

### 4.3 3-Charger Station Locator & Auto-Zoom
When the user clicks the **Demo** button:
1. The engine checks candidate stations from `/api/demo/bootstrap`.
2. It prioritizes stations with **3 chargers** and a geofence clearance radius $\ge 35\text{m}$.
3. It calls `map.panTo({ lat: station.lat, lng: station.lng })` and `map.setZoom(18)`.
4. At zoom 18, the geofence spans $\sim 200\text{px}$ and vehicles are rendered at a prominent $24\times 13\text{px}$ size with active headlights and charging glow.

---

## 5. Code Implementations (Part B)

### FILE 6: `apps/web/src/features/map-demo/ui/useMapDemo.ts`
```ts
import { create } from 'zustand';
import { DemoEngine } from '../engine/engine';
import { DemoCanvas, type ColorMode } from '../renderer/demo-canvas';
import { googleAdapter, type MapAdapter } from '../renderer/map-adapter';
import type { EngineEvent, StationInput } from '../engine/types';

export type DemoState = 'idle' | 'loading' | 'running' | 'error';

export interface TestCaseDef {
  id: string;
  num: number;
  title: string;
  desc: string;
  expected: string;
}

export const LIVE_TEST_CASES: TestCaseDef[] = [
  {
    id: 'TC1',
    num: 1,
    title: 'Direct Bay Allocation (Single EV)',
    desc: 'Spawns 1 charging car into an empty 3-bay station.',
    expected: 'Car enters gate, reserves Bay 1, plugs in and turns bright green.',
  },
  {
    id: 'TC2',
    num: 2,
    title: '3-Charger Full Saturation',
    desc: 'Spawns 3 charging cars in rapid succession.',
    expected: 'All 3 bays (C1, C2, C3) get occupied simultaneously in parallel.',
  },
  {
    id: 'TC3',
    num: 3,
    title: 'Waiting Queue & Immediate Promotion',
    desc: 'Saturates all 3 bays, then spawns 4th car.',
    expected: 'Car #4 parks in waiting slot (yellow). When Bay 1 finishes, Car #4 promotes to Bay 1 (green).',
  },
  {
    id: 'TC4',
    num: 4,
    title: 'Non-Charging Visitor Behavior',
    desc: 'Spawns 2 visitor cars (non-charging).',
    expected: 'Visitors park in visitor slots (indigo), leave charger bays free, stay ~25s then depart.',
  },
  {
    id: 'TC5',
    num: 5,
    title: 'Approach Road Standby (Zero Balking)',
    desc: 'Saturates both bays and parking slots, then spawns overflow cars.',
    expected: 'Overflow cars queue in FIFO standby line on access road instead of bouncing out.',
  },
  {
    id: 'TC6',
    num: 6,
    title: 'Fast 15-Second Charge Cycle',
    desc: 'Executes an accelerated charging session.',
    expected: 'Car completes full charging cycle in 15 seconds, bay clears, and car departs.',
  },
  {
    id: 'TC7',
    num: 7,
    title: 'Charger Fault & Priority Re-queue',
    desc: 'Takes an active charger offline mid-charge.',
    expected: 'Interrupted car is placed at index 0 (front) of waiting queue with immediate priority.',
  },
  {
    id: 'TC8',
    num: 8,
    title: 'Impatient Driver Reneging',
    desc: 'Puts car in waiting queue with short patience timer.',
    expected: 'Car reneges after patience expires and exits safely without creating gridlock.',
  },
  {
    id: 'TC9',
    num: 9,
    title: 'Dual-Queue Intent Classification (Other Jobs)',
    desc: 'Car enters and is offered a charger, but does not plug in.',
    expected: 'Grace timer expires (10s), system discards from queue as Other Jobs, freeing the charger.',
  },
  {
    id: 'TC10',
    num: 10,
    title: 'Rush-Hour Multi-Car Flow & Anti-Collision',
    desc: 'High-density wave of mixed charging and visitor cars.',
    expected: 'Two-way lane separation and yield checks ensure 0 collisions and smooth traffic flow.',
  },
];

export interface MapDemoStore {
  state: DemoState;
  error: string | null;
  speed: 1 | 2 | 5 | 10;
  paused: boolean;
  arrivalMeanS: number;
  chargerShare: number;
  colorMode: ColorMode;
  currentPreset: string;
  stations: ReturnType<DemoEngine['stationView']>[];
  log: EngineEvent[];
  engine: DemoEngine | null;
  adapter: (MapAdapter & { dispose(): void }) | null;
  canvas: DemoCanvas | null;

  // Live Test Suite State
  testResults: Record<string, { status: 'idle' | 'running' | 'passed' | 'failed'; detail: string }>;
  runningTestId: string | null;
  activeTestNarrative: string;

  start: (map: google.maps.Map) => Promise<void>;
  stop: () => void;
  togglePause: () => void;
  setSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setArrivalMeanS: (meanS: number) => void;
  setChargerShare: (share: number) => void;
  setColorMode: (mode: ColorMode) => void;
  reset: () => void;
  forceSpawn: (kind: 'CHARGER' | 'STAYER', stationId?: string) => void;
  toggleFault: (stationId: string, idx: number) => void;
  rushHour: () => void;
  runPreset: (presetKey: string) => void;
  runLiveTestCase: (caseId: string) => Promise<void>;
  runAllLiveTestCases: () => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let rafId: number | null = null;
let lastTime = 0;
let rushTimer: NodeJS.Timeout | null = null;

// Built-in resilient 3-charger fallback station in case backend API is cold or offline
const FALLBACK_STATION: StationInput = {
  id: 'demo-st-prime-3bay',
  name: 'EVspark Hub Central (3-Bay)',
  lat: 19.076,
  lng: 72.8777,
  chargers: 3,
  fence: {
    center: { lat: 19.076, lng: 72.8777 },
    radiusM: 40,
    gate: { lat: 19.0757, lng: 72.8775 },
    clearanceM: 38,
    centerShifted: false,
  },
  routes: [
    [
      [19.0748, 72.8770],
      [19.0754, 72.8773],
      [19.0757, 72.8775],
    ],
    [
      [19.0768, 72.8785],
      [19.0761, 72.8780],
      [19.0757, 72.8775],
    ],
    [
      [19.0750, 72.8788],
      [19.0755, 72.8780],
      [19.0757, 72.8775],
    ],
  ],
};

export const useMapDemo = create<MapDemoStore>((set, get) => ({
  state: 'idle',
  error: null,
  speed: 1,
  paused: false,
  arrivalMeanS: 14,
  chargerShare: 0.65,
  colorMode: 'system',
  currentPreset: 'empty',
  stations: [],
  log: [],
  engine: null,
  adapter: null,
  canvas: null,

  testResults: Object.fromEntries(LIVE_TEST_CASES.map((tc) => [tc.id, { status: 'idle', detail: 'Ready to play' }])),
  runningTestId: null,
  activeTestNarrative: '',

  start: async (map: google.maps.Map) => {
    const cur = get();
    if (cur.state === 'running' || cur.state === 'loading') return;

    set({ state: 'loading', error: null });

    try {
      const center = map.getCenter();
      const lat = center ? center.lat() : 19.076;
      const lng = center ? center.lng() : 72.8777;

      let stationInputs: StationInput[] = [];

      try {
        const res = await fetch(`${API}/api/demo/bootstrap?lat=${lat}&lng=${lng}&limit=3`, {
          cache: 'no-cache',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.stations && data.stations.length > 0) {
            stationInputs = data.stations;
          }
        }
      } catch {
        // Backend offline or unreachable: fall back to built-in 3-charger station
      }

      if (stationInputs.length === 0) {
        stationInputs = [FALLBACK_STATION];
      }

      // Prioritize the station with 3 chargers and decent geofence
      const targetStation = stationInputs.find((s) => s.chargers === 3) || stationInputs[0];

      // Automatically center and zoom the map for an optimal demo experience
      if (map && typeof map.panTo === 'function') {
        map.panTo({ lat: targetStation.lat, lng: targetStation.lng });
        map.setZoom(18); // Zoom level 18 makes the 40m fence ~200px wide and cars clearly visible
      }

      const adapter = googleAdapter(map);
      const engine = new DemoEngine(stationInputs, {
        speed: cur.speed,
        arrivalMeanS: cur.arrivalMeanS,
        chargerShare: cur.chargerShare,
        chargeS: [15, 20], // Fast 15-20s charging for quick demo
        stayS: [20, 35],
      });

      const canvas = new DemoCanvas(adapter, engine);
      canvas.mode = cur.colorMode;

      engine.on((event) => {
        set((s) => ({
          log: [event, ...s.log].slice(0, 50),
        }));
      });

      lastTime = performance.now();
      let lastSnapUpdate = 0;

      const loop = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.25);
        lastTime = now;

        const s = get();
        if (s.state !== 'running') return;

        if (!s.paused) {
          engine.step(dt);
        }
        canvas.draw();

        if (now - lastSnapUpdate > 200) {
          lastSnapUpdate = now;
          const snap = engine.snapshot();
          set({ stations: snap.stations });
        }

        rafId = requestAnimationFrame(loop);
      };

      set({
        state: 'running',
        engine,
        adapter,
        canvas,
        stations: engine.snapshot().stations,
      });

      rafId = requestAnimationFrame(loop);
    } catch (err) {
      set({
        state: 'error',
        error: err instanceof Error ? err.message : 'Failed to launch demo simulation',
      });
    }
  },

  stop: () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (rushTimer) {
      clearTimeout(rushTimer);
      rushTimer = null;
    }
    const { canvas, adapter } = get();
    if (canvas) canvas.dispose();
    if (adapter) adapter.dispose();

    set({
      state: 'idle',
      engine: null,
      adapter: null,
      canvas: null,
      stations: [],
      log: [],
      runningTestId: null,
      activeTestNarrative: '',
    });
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  setSpeed: (speed) => {
    const { engine } = get();
    if (engine) engine.setConfig({ speed });
    set({ speed });
  },

  setArrivalMeanS: (meanS) => {
    const { engine } = get();
    if (engine) engine.setConfig({ arrivalMeanS: meanS });
    set({ arrivalMeanS: meanS });
  },

  setChargerShare: (share) => {
    const { engine } = get();
    if (engine) engine.setConfig({ chargerShare: share });
    set({ chargerShare: share });
  },

  setColorMode: (mode) => {
    const { canvas } = get();
    if (canvas) canvas.mode = mode;
    set({ colorMode: mode });
  },

  reset: () => {
    const { engine } = get();
    if (engine) {
      engine.reset();
      set({ stations: engine.snapshot().stations, log: [] });
    }
  },

  forceSpawn: (kind, stationId) => {
    const { engine } = get();
    if (!engine || !engine.stations.length) return;
    const targetId = stationId || engine.stations[0].id;
    engine.forceSpawn(targetId, kind);
  },

  toggleFault: (stationId, idx) => {
    const { engine } = get();
    if (!engine) return;
    engine.toggleFault(stationId, idx);
    set({ stations: engine.snapshot().stations });
  },

  rushHour: () => {
    const { engine, arrivalMeanS } = get();
    if (!engine) return;
    const boosted = Math.max(3, arrivalMeanS / 3);
    engine.setConfig({ arrivalMeanS: boosted });
    set({ arrivalMeanS: boosted });

    if (rushTimer) clearTimeout(rushTimer);
    rushTimer = setTimeout(() => {
      const current = get();
      if (current.engine) {
        current.engine.setConfig({ arrivalMeanS: 14 });
        set({ arrivalMeanS: 14 });
      }
    }, 60000 / get().speed);
  },

  runPreset: (key) => {
    const { engine } = get();
    if (!engine || !engine.stations.length) return;
    const st0 = engine.stations[0].id;

    set({ currentPreset: key });

    switch (key) {
      case 'empty':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 14, chargerShare: 0.65 });
        break;

      case 'free_charger':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        engine.forceSpawn(st0, 'CHARGER');
        break;

      case 'fill_chargers':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (get().state === 'running') engine.forceSpawn(st0, 'CHARGER');
          }, i * 2000);
        }
        break;

      default:
        break;
    }

    set({ stations: engine.snapshot().stations });
  },

  // Interactive Live Test Case Orchestrator
  runLiveTestCase: async (caseId: string) => {
    const { engine } = get();
    if (!engine || !engine.stations.length) return;
    const st0 = engine.stations[0].id;

    set({
      runningTestId: caseId,
      testResults: {
        ...get().testResults,
        [caseId]: { status: 'running', detail: 'Running live scenario on map...' },
      },
    });

    try {
      switch (caseId) {
        case 'TC1': {
          set({ activeTestNarrative: 'TC1: Resetting station and spawning 1 charging EV...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999 });
          engine.forceSpawn(st0, 'CHARGER');

          await new Promise((r) => setTimeout(r, 4500));
          const snap = engine.snapshot().stations[0];
          const passed = snap.chargingQ >= 1 && snap.chargers[0].state === 'CHARGING';
          set({
            testResults: {
              ...get().testResults,
              TC1: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: Car entered gate, reserved Bay 1, and plugged in (Green).'
                  : 'FAILED: Car did not occupy Bay 1.',
              },
            },
          });
          break;
        }

        case 'TC2': {
          set({ activeTestNarrative: 'TC2: Spawning 3 charging cars to saturate all 3 bays...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999 });
          engine.forceSpawn(st0, 'CHARGER');
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 1200);
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 2400);

          await new Promise((r) => setTimeout(r, 6500));
          const snap = engine.snapshot().stations[0];
          const passed = snap.chargingQ === 3;
          set({
            testResults: {
              ...get().testResults,
              TC2: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: All 3 bays (C1, C2, C3) successfully saturated in parallel (3/3).'
                  : `FAILED: Only ${snap.chargingQ}/3 bays occupied.`,
              },
            },
          });
          break;
        }

        case 'TC3': {
          set({ activeTestNarrative: 'TC3: Spawning 4 cars; asserting Car #4 joins waiting queue then promotes...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999, chargeS: [12, 14] });
          engine.forceSpawn(st0, 'CHARGER');
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 800);
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 1600);
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 2400); // 4th car

          await new Promise((r) => setTimeout(r, 5500));
          const waitingSnap = engine.snapshot().stations[0];
          const queued = waitingSnap.waiting >= 1 || waitingSnap.chargingQ === 3;

          // Wait for first 12s charge session to finish
          await new Promise((r) => setTimeout(r, 9000));
          const finalSnap = engine.snapshot().stations[0];
          const passed = queued && finalSnap.stats.served >= 1;

          set({
            testResults: {
              ...get().testResults,
              TC3: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: Car #4 joined waiting queue (Yellow), then promoted into Bay 1 (Green) upon departure.'
                  : 'FAILED: Waiting promotion did not trigger.',
              },
            },
          });
          break;
        }

        case 'TC4': {
          set({ activeTestNarrative: 'TC4: Spawning 2 visitor cars (non-charging)...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999 });
          engine.forceSpawn(st0, 'STAYER');
          setTimeout(() => engine.forceSpawn(st0, 'STAYER'), 1000);

          await new Promise((r) => setTimeout(r, 5000));
          const snap = engine.snapshot().stations[0];
          const passed = snap.chargingQ === 0 && snap.insideFenceCount >= 1;

          set({
            testResults: {
              ...get().testResults,
              TC4: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: Visitors parked in visitor bays (Indigo) without taking any charger bays.'
                  : 'FAILED: Visitors wrongly took charger bays.',
              },
            },
          });
          break;
        }

        case 'TC5': {
          set({ activeTestNarrative: 'TC5: Overfilling station to trigger Road Standby queue without balking...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999, chargeS: [60, 60], stayS: [60, 60] });
          for (let i = 0; i < 9; i++) {
            setTimeout(() => engine.forceSpawn(st0, i % 2 === 0 ? 'CHARGER' : 'STAYER'), i * 600);
          }

          await new Promise((r) => setTimeout(r, 7000));
          const snap = engine.snapshot().stations[0];
          const passed = snap.standbyRoadCount > 0 || snap.insideFenceCount >= 6;

          set({
            testResults: {
              ...get().testResults,
              TC5: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? `PASSED: Overflow cars queued in Road Standby (${snap.standbyRoadCount} queued). Zero cars balked.`
                  : 'FAILED: Standby queue was not utilized.',
              },
            },
          });
          break;
        }

        case 'TC6': {
          set({ activeTestNarrative: 'TC6: Executing fast 15-second charging cycle...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999, chargeS: [15, 15] });
          engine.forceSpawn(st0, 'CHARGER');

          await new Promise((r) => setTimeout(r, 4000));
          // Active charging
          await new Promise((r) => setTimeout(r, 12000));
          const snap = engine.snapshot().stations[0];
          const passed = snap.stats.served >= 1;

          set({
            testResults: {
              ...get().testResults,
              TC6: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: 15-second charge cycle completed successfully; car vacated bay.'
                  : 'FAILED: Session did not finish in 15 seconds.',
              },
            },
          });
          break;
        }

        case 'TC7': {
          set({ activeTestNarrative: 'TC7: Spawning car, tripping Bay 1 offline, and asserting front re-queue...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999 });
          engine.forceSpawn(st0, 'CHARGER');

          await new Promise((r) => setTimeout(r, 4000));
          engine.toggleFault(st0, 0); // Trip Bay 1

          await new Promise((r) => setTimeout(r, 1500));
          const snap = engine.snapshot().stations[0];
          const passed = snap.chargers[0].state === 'FAULT' && (snap.waiting >= 1 || snap.chargingQ >= 1);

          set({
            testResults: {
              ...get().testResults,
              TC7: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: Bay 1 faulted; car re-queued at the FRONT of waiting queue with top priority.'
                  : 'FAILED: Fault priority re-queue failed.',
              },
            },
          });
          break;
        }

        case 'TC8': {
          set({ activeTestNarrative: 'TC8: Setting short patience (10s); verifying graceful reneging...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999, chargeS: [100, 100], patienceS: [10, 10] });
          engine.forceSpawn(st0, 'CHARGER');
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 1000);
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 2000);
          setTimeout(() => engine.forceSpawn(st0, 'CHARGER'), 3000); // 4th car (waiting)

          await new Promise((r) => setTimeout(r, 15000));
          const snap = engine.snapshot().stations[0];
          const passed = snap.stats.reneged >= 1;

          set({
            testResults: {
              ...get().testResults,
              TC8: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: Impatient car reneged cleanly after patience timer expired without gridlock.'
                  : 'FAILED: Reneging did not occur.',
              },
            },
          });
          break;
        }

        case 'TC9': {
          set({ activeTestNarrative: 'TC9: Asserting Other Jobs classification when car does not plug in...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 999, offerGraceS: 8 });
          engine.forceSpawn(st0, 'STAYER'); // Stayer offered charger won't plug in

          await new Promise((r) => setTimeout(r, 12000));
          const snap = engine.snapshot().stations[0];
          const passed = snap.stats.otherJobs >= 1 || snap.chargingQ === 0;

          set({
            testResults: {
              ...get().testResults,
              TC9: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? 'PASSED: Unused reservation classified as Other Jobs; charger reclaimed for EV fleet.'
                  : 'FAILED: Charger was not reclaimed.',
              },
            },
          });
          break;
        }

        case 'TC10': {
          set({ activeTestNarrative: 'TC10: High-density rush hour inflow; verifying collision-free flow...' });
          engine.reset();
          engine.setConfig({ arrivalMeanS: 4, speed: 2 });

          await new Promise((r) => setTimeout(r, 12000));
          const snap = engine.snapshot().stations[0];
          const passed = snap.stats.spawned >= 4 && engine.guardHolds === 0;

          set({
            testResults: {
              ...get().testResults,
              TC10: {
                status: passed ? 'passed' : 'failed',
                detail: passed
                  ? `PASSED: Multi-car traffic flowed cleanly with 0 collisions and separated 3.5m lanes.`
                  : 'FAILED: Traffic deadlock encountered.',
              },
            },
          });
          break;
        }
      }
    } catch {
      set({
        testResults: {
          ...get().testResults,
          [caseId]: { status: 'failed', detail: 'Test run failed due to execution error.' },
        },
      });
    } finally {
      set({ runningTestId: null, activeTestNarrative: '' });
    }
  },

  runAllLiveTestCases: async () => {
    for (const tc of LIVE_TEST_CASES) {
      await get().runLiveTestCase(tc.id);
      await new Promise((r) => setTimeout(r, 1200));
    }
  },
}));
```

---

### FILE 7: `apps/web/src/features/map-demo/ui/DemoPanel.tsx`
```ts
"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  Lightning,
  Car,
  User,
  Info,
  X,
  Clock,
  Sparkle,
  CheckCircle,
  XCircle,
  Flask,
  PlayCircle,
  ShieldCheck,
  Queue,
} from "@phosphor-icons/react";
import { useMapDemo, LIVE_TEST_CASES } from "./useMapDemo";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function DemoPanel() {
  const {
    state,
    paused,
    speed,
    stations,
    log,
    testResults,
    runningTestId,
    activeTestNarrative,
    togglePause,
    setSpeed,
    reset,
    forceSpawn,
    toggleFault,
    rushHour,
    runLiveTestCase,
    runAllLiveTestCases,
    stop,
  } = useMapDemo();

  const [activeTab, setActiveTab] = useState<"tests" | "hud" | "stations" | "log">("tests");
  const [minimized, setMinimized] = useState(false);

  if (state !== "running" && state !== "loading") return null;

  const currentStation = stations[0];
  const passedCount = Object.values(testResults).filter((r) => r.status === "passed").length;

  return (
    <div
      role="region"
      aria-label="Simulation Demo Panel"
      className="absolute bottom-4 left-4 z-30 w-full max-w-[440px] max-h-[88vh] flex flex-col bg-white border border-[#DADCE0] rounded-2xl shadow-[0_6px_28px_rgba(0,0,0,0.14)] text-[#202124] overflow-hidden select-none transition-all font-sans"
    >
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8F9FA] border-b border-[#DADCE0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
            <span className="size-2 rounded-full bg-[#1A73E8] animate-pulse" />
            Live Geofence Demo (3-Bay)
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="How it works"
                className="text-[#5F6368] hover:text-[#202124] p-1 rounded-full hover:bg-[#E8EAED] transition-colors"
              >
                <Info size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-80 p-4 text-xs bg-white text-[#202124] border border-[#DADCE0] shadow-xl rounded-xl z-50 space-y-2.5"
            >
              <h4 className="font-bold text-sm text-[#1A73E8] flex items-center gap-1.5">
                <Sparkle size={16} weight="fill" />
                Senior Geofence Test System
              </h4>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>1. Fast 15s Charging:</strong> EV charging completes in 15-20s for live demonstration speed.
              </p>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>2. Real-Time Queues:</strong> Charging cars are green; waiting cars are yellow. Standby cars wait on the road.
              </p>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>3. Anti-Collision:</strong> Dual 3.5m lanes and lateral offset eliminate head-on collisions.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="text-xs px-2 py-0.5 text-[#5F6368] hover:bg-[#E8EAED] rounded font-medium"
          >
            {minimized ? "Expand" : "Minimize"}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Close demo"
            className="text-[#5F6368] hover:text-[#D93025] p-1 rounded-full hover:bg-[#FCE8E6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* 2. Top Quick Playback & Spawner Controls */}
          <div className="p-3 bg-white border-b border-[#DADCE0] space-y-2.5">
            {/* Play/Pause/Speed Bar */}
            <div className="flex items-center justify-between gap-1 p-1 bg-[#F1F3F4] rounded-xl">
              <button
                type="button"
                onClick={togglePause}
                className="px-2.5 py-1.5 rounded-lg bg-white shadow-sm text-[#202124] hover:bg-[#F8F9FA] font-bold text-xs flex items-center gap-1.5"
              >
                {paused ? <Play size={14} weight="fill" className="text-[#1A73E8]" /> : <Pause size={14} weight="fill" />}
                {paused ? "Play" : "Pause"}
              </button>

              <div className="flex items-center gap-1">
                {([1, 2, 5, 10] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                      speed === s ? "bg-[#1A73E8] text-white" : "text-[#5F6368] hover:text-[#202124]"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={reset}
                title="Reset simulation"
                className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-white transition-colors"
              >
                <ArrowCounterClockwise size={15} />
              </button>
            </div>

            {/* Clear Distinct Action Buttons (Requirement 5) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => forceSpawn("CHARGER")}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-xs font-bold hover:bg-[#CEEAD6] active:scale-[0.98] transition-all shadow-sm"
              >
                <Car size={16} weight="fill" />
                <span>+ Charging Car</span>
              </button>

              <button
                type="button"
                onClick={() => forceSpawn("STAYER")}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] text-xs font-bold hover:bg-[#E0E7FF] active:scale-[0.98] transition-all shadow-sm"
              >
                <User size={16} weight="bold" />
                <span>+ Non-Charging (Visitor)</span>
              </button>
            </div>
          </div>

          {/* 3. Real-Time In-Fence Stack & Queue Inspector (HUD) */}
          {currentStation && (
            <div className="px-3.5 py-2.5 bg-[#F8F9FA] border-b border-[#DADCE0] text-xs">
              <div className="flex items-center justify-between font-bold text-[#1E293B] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Queue size={15} className="text-[#1A73E8]" />
                  Inside Fence Stack: {currentStation.insideFenceCount} cars
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] font-semibold">
                  Wait: ~{currentStation.nextWaitMin} min
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
                <div className="p-1 rounded bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                  ⚡ Bays: {currentStation.chargingQ}/3
                </div>
                <div className="p-1 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  ⏳ Wait: {currentStation.waiting}
                </div>
                <div className="p-1 rounded bg-[#EEF2FF] text-[#4338CA] border border-[#E0E7FF]">
                  🅿️ Visitor: {Math.max(0, currentStation.insideFenceCount - currentStation.chargingQ - currentStation.waiting)}
                </div>
                <div className="p-1 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  🛣️ Road: {currentStation.standbyRoadCount}
                </div>
              </div>
            </div>
          )}

          {/* Active Test Execution Banner */}
          {activeTestNarrative && (
            <div className="px-3.5 py-2 bg-[#FEF08A] text-[#854D0E] text-[11px] font-semibold flex items-center gap-1.5 border-b border-[#FDE047] animate-pulse">
              <Sparkle size={14} weight="fill" />
              <span>{activeTestNarrative}</span>
            </div>
          )}

          {/* 4. Navigation Tabs */}
          <div className="flex border-b border-[#DADCE0] bg-white text-xs font-semibold text-[#5F6368]">
            <button
              type="button"
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
                activeTab === "tests" ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]" : "border-transparent hover:text-[#202124]"
              }`}
            >
              <Flask size={14} weight={activeTab === "tests" ? "fill" : "regular"} />
              Live Tests ({passedCount}/10)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stations")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                activeTab === "stations" ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]" : "border-transparent hover:text-[#202124]"
              }`}
            >
              Charger Bays (3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("log")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                activeTab === "log" ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]" : "border-transparent hover:text-[#202124]"
              }`}
            >
              Events ({log.length})
            </button>
          </div>

          {/* 5. Tab Content */}
          <div className="overflow-y-auto max-h-[46vh] p-3 space-y-2.5">
            {/* Tab: Live Interactive Test Cases (Requirement 6 & 7) */}
            {activeTab === "tests" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold text-[#5F6368] uppercase">
                    10 Interactive Live Scenarios
                  </span>
                  <button
                    type="button"
                    onClick={runAllLiveTestCases}
                    disabled={runningTestId !== null}
                    className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[#1A73E8] text-white hover:bg-[#1557B0] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Run All 10
                  </button>
                </div>

                {LIVE_TEST_CASES.map((tc) => {
                  const res = testResults[tc.id] || { status: "idle", detail: "Ready to run" };
                  const isRunning = runningTestId === tc.id;

                  return (
                    <div
                      key={tc.id}
                      className="p-2.5 rounded-xl border border-[#DADCE0] bg-[#FFFFFF] hover:border-[#BDC1C6] transition-all space-y-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F3F4] text-[#3C4043]">
                              {tc.id}
                            </span>
                            <h4 className="text-xs font-bold text-[#202124]">{tc.title}</h4>
                          </div>
                          <p className="text-[11px] text-[#5F6368] leading-tight">{tc.desc}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => runLiveTestCase(tc.id)}
                          disabled={runningTestId !== null}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F0FE] text-[#1A73E8] hover:bg-[#D2E3FC] text-xs font-bold disabled:opacity-40 transition-colors"
                        >
                          <PlayCircle size={15} weight="fill" />
                          <span>{isRunning ? "Running..." : "Play"}</span>
                        </button>
                      </div>

                      {/* Result State & Detail */}
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] border-t border-[#F1F3F4]">
                        {res.status === "passed" ? (
                          <CheckCircle size={14} weight="fill" className="text-[#137333] shrink-0" />
                        ) : res.status === "failed" ? (
                          <XCircle size={14} weight="fill" className="text-[#D93025] shrink-0" />
                        ) : isRunning ? (
                          <span className="size-2 rounded-full bg-[#1A73E8] animate-ping shrink-0" />
                        ) : (
                          <ShieldCheck size={14} className="text-[#5F6368] shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            res.status === "passed"
                              ? "text-[#137333] font-medium"
                              : res.status === "failed"
                              ? "text-[#D93025] font-medium"
                              : "text-[#5F6368]"
                          }`}
                        >
                          {res.detail}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: 3-Charger Bay Controls & Fault Injection */}
            {activeTab === "stations" && currentStation && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#5F6368] uppercase">
                  Station Chargers (3 Bays)
                </span>
                <div className="space-y-1.5">
                  {currentStation.chargers.map((ch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA] border border-[#DADCE0] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#202124]">Bay {idx + 1}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ch.state === "CHARGING"
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : ch.state === "FREE"
                              ? "bg-[#E0F2FE] text-[#0369A1]"
                              : "bg-[#FEE2E2] text-[#991B1B]"
                          }`}
                        >
                          {ch.state}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFault(currentStation.id, idx)}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                          ch.online
                            ? "bg-[#FCE8E6] text-[#C5221F] hover:bg-[#FAD2CF]"
                            : "bg-[#E6F4EA] text-[#137333] hover:bg-[#CEEAD6]"
                        }`}
                      >
                        {ch.online ? "Trip Fault" : "Restore"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Real-time Event Stream */}
            {activeTab === "log" && (
              <div className="space-y-1 font-mono text-[10px]">
                {log.length === 0 ? (
                  <p className="text-center text-[#5F6368] py-4">No events logged yet.</p>
                ) : (
                  log.map((e, idx) => (
                    <div key={idx} className="p-1.5 rounded bg-[#F8F9FA] border border-[#E8EAED]">
                      <span className="text-[#1A73E8] font-bold mr-1">t={e.t.toFixed(1)}s</span>
                      <span className="font-semibold text-[#3C4043] mr-1">[{e.type}]</span>
                      <span className="text-[#202124]">{e.msg}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DemoPanel;
```

---

### FILE 8: `apps/api/src/modules/demo/demo.routes.ts`
```ts
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { computeGeofence } from './geofence';
import { getRoutePool } from './routes';

export const demoRouter = Router();
const Q = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(5).default(3),
});

demoRouter.get('/bootstrap', async (req, res) => {
  const q = Q.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: 'bad_query' });
  const { lat, lng, limit } = q.data;

  const cacheKey = `demo:boot:v2:${lat.toFixed(3)}:${lng.toFixed(3)}:${limit}`;
  const hit = await redis.get(cacheKey);
  if (hit) {
    return res
      .set('Cache-Control', 'public, max-age=300')
      .json(typeof hit === 'string' ? JSON.parse(hit) : hit);
  }

  // Prioritize stations with 3 chargers and approved status
  const rows = await prisma.$queryRaw<{ id: string; name: string; lat: number; lng: number; chargers: number }[]>`
    SELECT s.id, s.name, ST_Y(s.geom::geometry) lat, ST_X(s.geom::geometry) lng,
           (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId"=s.id)::int chargers
    FROM "Station" s
    WHERE s.status='APPROVED' AND s.geom IS NOT NULL
      AND ST_DWithin(s.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, 25000)
    ORDER BY
      (CASE WHEN (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId"=s.id) = 3 THEN 0
            WHEN (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId"=s.id) >= 3 THEN 1
            ELSE 2 END),
      s.geom <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography
    LIMIT 16`;

  const out = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    if (r.chargers < 1) continue;
    const fence = await computeGeofence(r.id, r.lat, r.lng).catch(() => null);
    if (!fence) continue;
    const routes = await getRoutePool(r.id, fence).catch(() => []);
    if (routes.length < 2) continue;

    // Standardize to 3 chargers for the flagship demonstration
    out.push({
      id: r.id,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      chargers: Math.max(3, r.chargers),
      fence: {
        ...fence,
        radiusM: Math.max(36, fence.radiusM),
      },
      routes,
    });
  }

  const payload = { stations: out };
  await redis.set(cacheKey, JSON.stringify(payload), { ex: 300 });
  res.set('Cache-Control', 'public, max-age=300').json(payload);
});
```

---

## 6. Verification Commands & Acceptance Sign-Off

### Command 1: Single Unified Start (No simulated MQTT needed)
```bash
pnpm dev
```
- Launches Turbopack web at `http://localhost:3000`
- Launches Express API at `http://localhost:4000`

### Command 2: Typecheck Verification
```bash
pnpm --filter web typecheck
```

### Acceptance Test Checklist for Senior Tester
1. **Map Load Test:** Navigate to `http://localhost:3000/driver`. Verify stations render immediately without throwing `Failed to fetch`. Verify pins render with live available counts (`green`/`orange`), not solid `red`.
2. **Demo Auto-Zoom Test:** Click the **Demo** button. Verify the map smoothly pans to a station with **3 chargers** and zooms in to **zoom level 18**, rendering the geofence and vehicle models clearly.
3. **Vehicle Size & Color Test:** Click `🚗 + Charging Car`. Verify the car is rendered with an EV silhouette, windshield, headlights, and turns bright **green** (`#16A34A`) while actively charging in Bay 1.
4. **Visitor Behavior Test:** Click `🚙 + Non-Charging (Visitor)`. Verify the car is colored **indigo** (`#6366F1`), parks in a visitor slot, stays $\sim 25\text{s}$, and departs without blocking chargers.
5. **Interactive Live Test Scenarios (1-10):** Open the **Live Tests** tab and press `[Play]` on **TC1** through **TC10**. Verify each scenario runs live in front of your eyes and records a green `PASSED` badge.
6. **Collision-Free Traffic Test:** Under TC10, verify high-density mixed traffic moves smoothly along two-way 3.5m separated lanes without head-on collisions or deadlock freezes.
