# EVspark: Map Redesign (codedesign.md)

Scope: TODO #1 (live station map, markers, cards, loader/error, Demo button, profile button).
Written against the repo as cloned on 2026-10-17: `github.com/Shubham-P25/EVspark`, active app `apps/web`, API `apps/api`.
Demo *logic* (simulated cars, geofence) is Step 2. This file only leaves a clean slot for it.

---

## 0. How to use this file

1. Read sections 1-4 once (the audit and decisions). They explain *why*.
2. Give your AI **one prompt at a time** from section 11, in order (P0 → P10). Each prompt is self-contained.
3. After each prompt, run the acceptance check listed under it before moving on.
4. Do not let the AI "improve" other files. Every prompt lists the files it may touch.

Rules for the AI (paste at the top of every session):

```text
You are editing the EVspark monorepo (pnpm workspaces: apps/web Next.js 16 + React 19 + Tailwind v4,
apps/api Express 5 + Prisma + PostGIS, packages/shared). Rules:
- Touch only the files named in the task. If you think another file must change, say so and stop.
- No new dependency unless the task names it.
- No backdrop-blur, no CSS filter blur, no animate-ping on map markers. Map UI = solid colours + transforms only.
- No `any`. Types come from packages/shared.
- One source of truth for marker colour: packages/shared `pinState()`. Never recompute it in the web app.
- Every async UI has three states: loading (skeleton or EvLoader), error (EvError with retry), empty.
- Finish by listing: files changed, files deleted, how to verify.
```

---

## 1. Audit: why the map lags and feels cheap today

These are real findings from the code, not guesses.

### 1.1 Performance root causes

| # | Finding | Where | Effect |
|---|---------|-------|--------|
| 1 | `markerStations` is wrapped in `useMemo` but depends on `filteredStations`, which is a **new array every render**. The memo never holds, so `ClusterLayer` rebuilds the whole **Supercluster index on every render** of MapShell. | `driver/map-shell.tsx` → `map/cluster-layer.tsx` | Main cause of lag. Any state change (opening a panel, typing in search) re-indexes all stations. |
| 2 | `MapShell` is 734 lines with ~25 `useState` calls. Every toggle re-renders the map subtree. | `driver/map-shell.tsx` | Frequent full re-renders. |
| 3 | Markers are DOM `OverlayViewF` elements with `backdrop-blur`, multi-layer gradients, big box-shadows, `blur-md` halos and `animate-ping`. Each marker can also mount a hover card with an `<img>`. | `map/station-marker.tsx` | Expensive compositing per marker. This is why panning stutters. |
| 4 | Query key is `["stations-bbox", bbox, zoom, filter]`. Every tiny pan or zoom is a new key, so there is **no cache reuse and no previous-data placeholder**. Markers vanish, then reappear. | `map-shell.tsx` | The "refresh time" you see. |
| 5 | The bbox endpoint does heavy work per request: chargers `findMany`, queue `groupBy`, geofence counts and `computeWaitTime` for up to 200 stations, and returns full charger arrays. | `api/controllers/stations.controller.ts` `attachBatchWaitTimes` | Slow, large payloads for something that only needs a colour. |
| 6 | The map is created only after `useJsApiLoader` resolves, inside a dynamically imported client component with `ssr:false`, so the Google script starts loading late. | `map/ev-map.tsx`, `driver/page.tsx` | Slow first paint. |
| 7 | `@react-google-maps/api` + legacy `OverlayView` for everything (stations, ghost cars, clusters). | map components | No Advanced Markers, no GPU path. |

### 1.2 Live-data bugs (live updates are effectively dead)

| # | Finding | Detail |
|---|---------|--------|
| 8 | **Tiles never subscribed.** `map-shell.tsx` creates `const tiles: string[] = []` and calls `subscribeTiles(tiles)` with an empty array. The server only emits `stations:delta` to rooms named `tile:z:x:y` (zoom 10-14). | No viewport deltas ever arrive. |
| 9 | **Cache key mismatch.** `socket.ts` patches queries with key `["stations"]`, but the map query key starts with `"stations-bbox"`. | Even if deltas arrived, the map would not update. |
| 10 | **Marker colour logic contradicts your spec.** The page marks only the *top 3* highest-wait stations red; the marker then recomputes colour again from a simulation store. The API already returns `markerColor`, and it is ignored. | Colour is computed in 3 places and none follows "all chargers full = red". |
| 11 | `waitMinutes` is used to colour markers. Your rule is about **charger counts**, not wait. | Wrong signal. |

### 1.3 UI / structure problems

- Cards (`station-card.tsx` 647 lines, `side-panel.tsx` 326, `directions-panel.tsx` 321) are long, mix data fetching with layout, and use `backdrop-blur-md` on many small buttons.
- Styling presets (`default/clean/silver`) use `styles` on the map. **If a `mapId` is set (required for Advanced Markers), the `styles` option is ignored.** Presets must go, or become Cloud-styled Map IDs.
- `PresentationSuite` (574 lines) and `ghost-simulation-store` (635 lines) are demo code mounted straight into the main map shell.
- Dead or duplicate code: `apps/web-legacy`, `apps/ml` vs `apps/ml-service`, `app/classic/page.tsx`, `proxy.disabled.ts`, `@clerk/nextjs` next to Neon Auth, both `framer-motion` and `motion`, both `lucide-react` and Phosphor.

### 1.4 ⚠ Security: rotate your Google key now

`apps/web/.env.example` (line 8) contains what looks like a **real Google Maps API key** (`AIzaSy…`) in a public GitHub repo. Do this before anything else:

1. Google Cloud Console → Credentials → **delete or regenerate** that key.
2. Replace the value in `.env.example` with an empty placeholder: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=`.
3. Check git history too (`git log -p -- apps/web/.env.example`). A key that was ever pushed is burned even after you remove it.
4. Create new keys following section 10.1 (referrer-restricted browser key, IP-restricted server key).

A leaked unrestricted key can be used by strangers and drain your quota. This may also explain some of the flakiness you see.

---

## 2. Decisions (with reasons)

These are my recommendations. Change them if you disagree, but change them knowingly.

### D1. Station data: **own Postgres is the source of truth. Google is a live layer only. Open Charge Map is an import tool, not a runtime API.**

| Source | Role | Why |
|--------|------|-----|
| **Your Postgres (PostGIS)**: Ministry of Power import + OCM enrichment | Stations, chargers, connectors, price, photos. Everything the map draws. | Fast (one indexed bbox query), free, works offline of any third party, you control it. |
| **Google Places API (New)** `evChargeOptions` | **Live availability** for a limited set of stations (see D3). | Returns per-connector-type `count`, `availableCount`, `outOfServiceCount` and `availabilityLastUpdateTime`. This is the data that makes Google Maps feel live. |
| **Open Charge Map** | One-time / nightly **import** to enrich amenities and connector detail. | It has no reliable live status for India. Remove any runtime calls. I found none in `apps/api/src` besides the env example, so this is mostly docs cleanup. |
| **Twin engine (OCPP simulator)** | Live data for stations Google does not cover. | Already built. Must be labelled "Simulated". |

So the answer to your question 2 is: **keep Google (narrowly, for live status) and keep OCM only as an offline enrichment script.** Do not use Google as the station list. It costs money per call and its terms restrict storing the data.

### D2. Map library: **`@vis.gl/react-google-maps` + Advanced Markers (vector map with a Map ID)**

- `@react-google-maps/api` is used today with legacy `OverlayView`. Replace it with `@vis.gl/react-google-maps` (`APIProvider`, `Map`, `AdvancedMarker`, `useMap`). It is the library Google's own docs point to, loads the API with the modern async loader, and supports Advanced Markers.
- Create one **vector Map ID** in Google Cloud (section 10.1). Needed for Advanced Markers.
- Remove style presets. Keep: `roadmap`, `satellite`, traffic toggle.

### D3. Where live Google data is used (cost control)

`evChargeOptions` sits in the **Enterprise + Atmosphere** SKU of Nearby Search / Text Search / Place Details, which is the most expensive tier. So:

- Never call it from the browser. Only the API calls Google, with a **server key**.
- Use **one Nearby Search (New) request per map tile** (it returns up to 20 places per request) instead of one Place Details call per station.
- Only when zoom ≥ 13, and only for the tile(s) in view. Cache the result in Redis for **90 seconds**.
- A global **daily call cap** in Redis (default 300). When exceeded, fall back to twin/static data and show no "Google live" badge.
- Match your stations to Google places **once**, offline, by script, and store only `googlePlaceId` (the `Station.googlePlaceId` column already exists).

**Honest caveat to design around:** I could not verify how many Indian stations actually return `availableCount`. Many may return only `count`. So the system must work in three states per station: `google` (fresh live counts), `twin` (simulated), `none` (static, grey pin). Test coverage on 20 Thane/Mumbai stations *before* promising it in the demo.

**Terms:** Google restricts caching/storing Places content (generally only `place_id` may be stored long-term). Keep counts only in a short-TTL Redis key, never in Postgres. Re-check the current Maps Platform Service Specific Terms before launch.

### D4. One marker-colour rule, in one place

Your spec, made precise. "Usable charger" = status `FREE` or `BUSY` (faulted / offline / maintenance chargers are excluded from the count).

| State | Rule | Colour |
|-------|------|--------|
| `green` | usable > 0 and free == usable | `#1E8E3E` |
| `orange` | usable > 0 and 0 < free < usable | `#E8710A` |
| `red` | usable > 0 and free == 0 | `#D93025` |
| `grey` | usable == 0, or no data | `#80868B` |

A 1-charger station is only ever green or red. Queue length and wait time **do not** change the colour; they appear on the card.

### D5. State management

- **TanStack Query** fetches tiles (cache, retries, dedupe).
- A **normalized Zustand store** `usePinStore` (`Map<id, Pin>`) holds the current pins. Each marker subscribes to *its own id only*, so a socket delta re-renders one marker, not the map.
- A second small Zustand store `useMapUiStore` holds UI state (selected station, open panel, filter, demo-open). This replaces ~20 `useState` hooks in MapShell.

---

## 3. Target architecture

```
                        ┌────────────────────────── Browser (Next.js, apps/web) ───────────────────────────┐
                        │                                                                                  │
 Google Maps JS ◄───────┤  <APIProvider> (loaded once, async, preconnect)                                  │
 (vector map, Map ID)   │      └─ <Map>                                                                    │
                        │          ├─ <PinLayer>   Supercluster + AdvancedMarker (≤150 DOM markers)        │
                        │          ├─ <UserDot>                                                            │
                        │          ├─ <RouteLine>  (polyline only when a route exists)                     │
                        │          └─ <DemoSlot>   (empty in Step 1; Step 2 mounts simulated cars here)    │
                        │                                                                                  │
                        │  useTilePins(viewport) ──► React Query (key: pins:z:x:y:filter)                  │
                        │        │ on success                       ▲ socket "stations:delta"              │
                        │        ▼                                  │                                      │
                        │  usePinStore (Map<id,Pin>)  ◄─────────────┘                                      │
                        │        │ selector by id                                                          │
                        │        ▼                                                                         │
                        │  <PinMarker id/> (memo)         <StationCard id/> opens instantly from the pin   │
                        └───────────────┬───────────────────────────────────────────────▲──────────────────┘
                                        │ HTTPS GET /api/stations/pins?z&x&y            │ Socket.io
                                        ▼                                               │ rooms tile:12:x:y
          ┌───────────────────────── API (Express, apps/api) ────────────────────────────┴───────────────┐
          │  pins.controller   one SQL (PostGIS bbox + FILTER aggregates), ETag, Cache-Control 10s       │
          │  stations/:id      full detail (chargers, wait, photos) only when a card opens                │
          │  googleLive.service  Nearby Search (New) per tile → Redis TTL 90s → merge, daily cap          │
          │  socket.ts         emits compact deltas to tile rooms (already exists)                        │
          │  packages/shared   pinState(), tile math, zod schemas (used by API and web)                  │
          └───────┬─────────────────────────────┬─────────────────────────────┬──────────────────────────┘
                  ▼                             ▼                             ▼
         Postgres + PostGIS (Neon)          Redis (optional)           Google Places API (New)
         stations, chargers                 tile cache, daily cap      server key, field mask = evChargeOptions
                  ▲
                  └── Twin engine (OCPP) updates charger.status → API emits deltas
```

### 3.1 Latency budget (what "fast" means here)

| Moment | Target | How |
|--------|--------|-----|
| Map canvas visible | < 1.5 s on 4G | Google script preconnected and loaded at the route layout, not after hydration; map container has a fixed size and an EvLoader skeleton |
| Markers first paint on a repeat visit | < 300 ms | React Query persisted cache (last pins in `localStorage`), shown immediately as stale, then revalidated |
| Pan/zoom → markers update | < 100 ms when the tile is cached; < 400 ms otherwise | Tile-snapped keys, `placeholderData: keepPreviousData`, slim payload |
| Open station card | < 50 ms to first paint | Card renders from the pin already in the store, then fills details |
| Live status change → marker colour | < 1 s | Socket delta patches one pin |
| Pan frame rate | 60 fps with 150 visible markers | Solid-colour SVG pins, no blur, transform-only hover/select |

### 3.2 Why this is "non-messy"

- **3 data shapes only**: `Pin` (map), `StationDetail` (card), `LiveOverlay` (Google/twin counts). Nothing else crosses the wire for the map.
- **MapShell shrinks to ~120 lines**: it only composes. Logic lives in hooks (`useTilePins`, `useLiveDeltas`, `useMapActions`) and 2 stores.
- **Delete before adding.** Prompt P0 removes dead code first.

---

## 4. Data contracts

Put these in `packages/shared/src/pins.ts` and use them on both sides.

```ts
export type PinColor = "green" | "orange" | "red" | "grey";
export type LiveSource = "google" | "twin" | "none";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  free: number;        // usable chargers currently free
  usable: number;      // chargers with status FREE or BUSY
  total: number;       // all chargers incl. faulted/offline
  maxKw: number;
  color: PinColor;     // always from pinState()
  source: LiveSource;
  updatedAt: number;   // epoch ms of the underlying data
}

export function pinState(free: number, usable: number): PinColor {
  if (usable <= 0) return "grey";
  if (free <= 0) return "red";
  if (free >= usable) return "green";
  return "orange";
}

// Compact wire format (about 40 bytes/pin instead of ~2 KB/station)
export type PinTuple = [id: string, lat: number, lng: number, free: number, usable: number, total: number, maxKw: number, source: 0 | 1 | 2, updatedAtSec: number];
```

### 4.1 Endpoints

| Method / path | Purpose | Notes |
|---------------|---------|-------|
| `GET /api/stations/pins?z=12&x=2930&y=1892&connector=CCS2` | Pins for one tile, as `PinTuple[]` | One SQL query, no per-station loops, ETag + `Cache-Control: public, max-age=10, stale-while-revalidate=30`. z is snapped to 10-14 by the client. |
| `GET /api/stations/:id` | Card detail | Already exists. Computes wait time here only. |
| `GET /api/stations/nearby` | Fuel button, list ranking | Already exists. Keep. |
| Socket `subscribe:tiles` | Join `tile:12:x:y` rooms | Client must compute tiles from the viewport (today it sends `[]`). |
| Socket `stations:delta` | Patch pins | Payload becomes `{ pins: PinTuple[] }` (compact). |

### 4.2 The pins SQL (replaces `attachBatchWaitTimes` for the map)

```sql
SELECT s.id, s.lat, s.lng,
       COUNT(c.id) FILTER (WHERE c."status" = 'FREE')                     AS free,
       COUNT(c.id) FILTER (WHERE c."status" IN ('FREE','BUSY'))           AS usable,
       COUNT(c.id)                                                         AS total,
       COALESCE(MAX(c."powerKw"), 0)                                       AS max_kw
FROM "Station" s
LEFT JOIN "Charger" c ON c."stationId" = s.id
WHERE s.status = 'APPROVED'
  AND s.location && ST_MakeEnvelope($1,$2,$3,$4,4326)::geography
GROUP BY s.id
LIMIT 400;
```

Add (if missing) a GiST index on `Station.location` and a btree on `Charger(stationId, status)`.

### 4.3 Live merge order (server, per station)

1. `google`: `googleLive` has a fresh entry (< 10 min old) with `availableCount` defined → use summed `availableCount` / `count` minus `outOfServiceCount`.
2. `twin`: station is in the simulated set → use charger rows (already what the SQL above returns).
3. `none`: static data → `usable` from rows if known, otherwise `grey`.

The card must show the source: "Live · Google · 40 s ago", "Simulated live", or "No live data".

---

## 5. Frontend structure (what stays, what is new)

```
apps/web/src/
  app/(main)/driver/
    layout.tsx            NEW   <MapsProvider> + preconnect + route-level Suspense
    page.tsx              slim: renders <DriverMap/>
    loading.tsx           NEW   <EvLoader variant="page"/>
    error.tsx             NEW   <EvError kind="page" onRetry/>
  features/driver-map/    NEW folder, everything map-specific lives here
    DriverMap.tsx         ≤150 lines, composition only
    MapsProvider.tsx      APIProvider (key, mapId, libraries: ["marker"], language/region en-IN)
    MapCanvas.tsx         <Map> with fixed options, idle handler
    PinLayer.tsx          Supercluster + visible PinMarkers
    PinMarker.tsx         memo(AdvancedMarker + SVG pin)
    ClusterMarker.tsx
    UserDot.tsx
    RouteLine.tsx
    DemoSlot.tsx          renders null in Step 1
    hooks/
      useViewportTiles.ts   bbox + zoom → tile list (snapped)
      useTilePins.ts        React Query per tile + merge into usePinStore
      useLiveDeltas.ts      socket subscribe/unsubscribe tiles, apply deltas
      useMapActions.ts      flyTo, fitBounds, locateMe, fuel (best station)
    stores/
      pin-store.ts          Map<id,Pin> + patchPins()
      map-ui-store.ts       selectedId, panel, filter, demoOpen
    ui/
      SearchBar.tsx  FilterChips.tsx  MapControls.tsx  ProfileButton.tsx  DemoButton.tsx
      StationCard/  (index.tsx, Header.tsx, LiveRow.tsx, Connectors.tsx, Actions.tsx, Tabs.tsx, Skeleton.tsx)
  components/feedback/    NEW
    EvLoader.tsx  EvError.tsx  ev-anim.css
```

Keep `lib/api.ts`, `lib/socket.ts` (fixed), `lib/query-client.ts`, `lib/format.ts`. Everything else map-related that is not on this list gets deleted or moved in P0/P9.

---

## 6. Marker spec

**Look:** Google-style teardrop pin, 30×38 px, solid fill, 2 px white outline, a white bolt glyph. Nothing else is drawn on the pin by default.

| State | Fill | Extra |
|-------|------|-------|
| green | `#1E8E3E` | none |
| orange | `#E8710A` | none |
| red | `#D93025` | none |
| grey | `#80868B` | none |
| selected (any colour) | same | scale 1.18 via `transform`, soft shadow, label chip always on, z-index above others |

**Label chip** (`3/4` free + `₹18`): shown only when the marker is selected, hovered (pointer devices), or zoom ≥ 15. Pure CSS (`opacity` + `transform`), no mount/unmount on hover.

**Cluster marker:** 40 px white circle, 3 px border in the *worst* colour among its children (red > orange > green > grey), bold count. Click → `map.fitBounds` to the cluster's leaves or expand zoom.

**Rules**
- SVG written once as a string constant per colour; reuse via `<svg><use/></svg>` or a memoized component. No per-render gradients/filters.
- `React.memo` the marker; props are `id` and `selected` only. Colour/free count come from `usePinStore(s => s.pins.get(id))`.
- Cap: Supercluster `radius: 56`, `maxZoom: 16`; render ≤ 150 items; beyond that, increase cluster radius, never render more.
- Selecting a marker must not re-render other markers.
- Escape hatch if you ever show > 500 individual pins: move the pin layer to a deck.gl `GoogleMapsOverlay` (WebGL). Not needed for the demo.

---

## 7. Station card spec (Google-Maps-class)

Desktop: left side panel, 408 px wide, full height, slides in over the map (not a floating draggable card). Mobile: bottom sheet with 3 snap points (peek 30%, half 60%, full). Drag handle, momentum, no jank.

**Order of content (top to bottom)**

1. **Photo strip** (hero, 3:2, lazy, shows first photo only until opened, `next/image` with sizes). Fallback: neutral gradient with a bolt, never a broken image.
2. **Title block:** name (20 px, 600), operator · distance · ETA, rating stars + count, price `₹ / kWh`, open hours.
3. **Live row** (the feature that sells the project): big status chip coloured like the pin ("3 of 4 free", "All busy", "1 of 4 free"), source + freshness ("Live · Google · 40 s ago" / "Simulated live"), and a thin segmented bar with one segment per charger.
4. **Predicted wait** (existing `predicted-wait` logic): "Wait ≈ 12 min · 2 cars heading here" with the geofence count. Show "No wait" when free > 0.
5. **Primary actions** (Google style pills): **Directions** (filled blue), **Start**, **Save**, **Book**, **Share**.
6. **Tabs:** Overview · Chargers · Reviews · Photos. Chargers tab lists each charger: connector icon, kW, status dot, "free in 8 min" when busy.
7. Footer: "Report a problem".

**Behaviour**
- Opens in < 50 ms from the pin in the store (title, colour, counts, distance), then fills details via `GET /api/stations/:id` with a skeleton for the rest.
- URL sync: `?station=<id>`; Back closes the card.
- Card data refreshes on socket delta for this id (`subscribe:station`).
- One data hook (`useStationDetail(id)`), no fetching in presentational components.
- Max ~120 lines per file. No `backdrop-blur` on buttons: solid `bg-white/ border` or solid colour.
- Tokens: text `#202124`, muted `#5F6368`, border `#DADCE0`, primary `#1A73E8`, radius 12/16, shadow `0 1px 2px rgb(60 64 67 / .3), 0 2px 6px 2px rgb(60 64 67 / .15)` (Google elevation 2). Fonts already in repo: Plus Jakarta Sans headings, Geist body, Geist Mono for numbers (kW, ₹).

---

## 8. Loading and error experience (EV animation)

Pure **SVG + CSS keyframes**, no Lottie, no extra dependency, respects `prefers-reduced-motion`.

### 8.1 `<EvLoader variant="map" | "page" | "inline" message? />`

Scene (viewBox 320×140):
- A rounded EV (simple side silhouette: body path, two wheels, window) drives on a dashed road line that scrolls left (`stroke-dashoffset` animation, 1.2 s linear infinite) while the car bobs 1 px.
- Above the car a **battery bar** fills 0 → 100 % over 2.4 s with a bolt icon that pulses; loops.
- At the right, a charger post with a cable.
- Message line rotates every 2 s: "Finding chargers near you…", "Checking live availability…", "Plugging in…".
- If loading exceeds **8 s**, swap the message to "Still working. Slow network?" and show a **Retry** link. Never spin forever silently.

Variants: `map` (fills the map container, light background), `page` (route `loading.tsx`), `inline` (48 px battery-only version for buttons and card sections).

### 8.2 `<EvError kind="offline" | "map-key" | "api" | "geolocation" | "not-found" | "unknown" onRetry />`

Scene: same car, **stopped**, headlights off, battery bar at 0 % with a slow red blink, an unplugged cable lying next to it; for `offline` add a small "no signal" icon.

| kind | Headline | Body | Primary action |
|------|----------|------|----------------|
| offline | You're offline | Showing the last stations we saved. | Retry |
| map-key | Map couldn't load | Check the Google Maps key, billing and allowed referrers. | Retry |
| api | Can't reach EVspark servers | We'll keep trying. | Retry |
| geolocation | Location is off | Turn on location to see chargers near you, or search a place. | Allow location / Search |
| not-found | This charger isn't here | It may have been removed. | Back to map |
| unknown | Something went wrong | Details below for debugging. | Retry |

A collapsible "Details" shows `error.message` and `requestId` in dev and for admins only.

### 8.3 Wiring
`app/(main)/driver/loading.tsx`, `error.tsx`, root `global-error.tsx`, `not-found.tsx`; `MapCanvas` shows `EvLoader variant="map"` until the map's first `idle` event, and `EvError kind="map-key"` on load failure. React Query `onError` for pins shows a non-blocking toast plus keeps the last pins on screen (stale pins beat an empty map).

---

## 9. Demo button and profile button

### 9.1 Demo button (Step 1 = UI only)

- Position: top-right, **left of the profile avatar**, 40 px tall pill: ▶ icon + "Demo". Hidden under the search bar on narrow screens (icon only).
- Click toggles `useMapUiStore.demoOpen`. In Step 1 it opens a small popover: "Demo mode, coming in Step 2" and mounts `<DemoSlot/>` (renders `null`).
- Do **not** delete `presentation-suite.tsx` or `ghost-simulation-store.ts` in this step. Unmount them from MapShell and keep the files, so Step 2 can rebuild from them.

### 9.2 Profile button

- 40 px circular avatar (user image or initials on a coloured disc), 2 px white ring with shadow, top-right like Google Maps.
- Click opens a Radix **Popover** (keyboard accessible, focus-trapped, Esc to close), 320 px wide:
  1. Header: avatar 48 px, name, email/username.
  2. **Vehicle chip:** make/model, connector icons, battery % (from `/api/me/profile`). "Edit" → vehicle panel.
  3. Links: Saved places · Bookings · History · Eco stats · Settings.
  4. Role switcher if the user has more than one role; **Sign out** at the bottom.
- Signed-out state: shows "Sign in" pill instead.
- Loading: avatar skeleton circle. Error: still shows initials from auth session, no crash.
- Account items move out of `menu-drawer.tsx`; the drawer keeps map-navigation items only.

---

## 10. Maps build guide (do-this checklist)

### 10.1 Google Cloud setup
1. **Two keys.** Browser key: *HTTP referrers* = `https://<your-domain>/*` and `http://localhost:3000/*`; APIs = Maps JavaScript API (+ Routes if used from the client). Server key: *IP restriction* (or none while on a host with changing IPs, but keep API restriction); APIs = Places API (New) only.
2. Enable: Maps JavaScript API, **Places API (New)**, Routes API (or Directions, see note below).
3. Create a **Map ID** (Map Management → Create → JavaScript, **Vector**). Put it in `NEXT_PUBLIC_GOOGLE_MAP_ID`.
4. Set a **budget alert** and quotas on Places (New). Set a hard cap so a bug can't spend money.
5. `.env.example` files get **empty placeholders only**.

### 10.2 Load strategy
- Load the API once at the route layout with `APIProvider` (async loader). Add `<link rel="preconnect" href="https://maps.googleapis.com">` and `https://maps.gstatic.com`.
- Load only `marker` up front. Load `places` and `routes` with `importLibrary` when first needed (search box focus, first directions).
- Never create more than one `APIProvider` / map instance. Never remount the map when panels open (panels are siblings, not parents).

### 10.3 Map options (fixed, defined outside the component)
`mapId`, `disableDefaultUI: true`, `gestureHandling: "greedy"`, `clickableIcons: false`, `minZoom: 5`, `maxZoom: 19`, `restriction` to India bounds (`latLngBounds` roughly 6°–37.5° N, 68°–98° E, `strictBounds: false`), `renderingType: VECTOR`. Use `defaultCenter`/`defaultZoom` (uncontrolled) and move the camera imperatively with `map.moveCamera` / `panTo`; do not store center in React state.

### 10.4 Event handling
- Listen to `idle` (not `bounds_changed`, which fires every frame). Debounce 150 ms (not 400 ms), then compute tiles. Keep the debounce inside `useViewportTiles`.
- Compute tiles at `zTile = clamp(round(zoom), 10, 14)`; at zoom < 10 request nothing and show clusters from the last fetched cities only (or a "Zoom in to see chargers" hint).

### 10.5 Do / don't

| Do | Don't |
|----|-------|
| One normalized pin store, per-id selectors | `.filter().map()` of full station arrays in the render of the shell |
| Tile-snapped query keys | Key = exact bbox + exact zoom |
| Solid SVG pins, `transform` animations | `backdrop-blur`, blur halos, `animate-ping` on many markers |
| Camera moves via `map.moveCamera/panTo` | Putting map center in React state |
| Server computes colour with `pinState()` | Recomputing colour in 3 components |
| Keep last pins when a refetch fails | Clearing markers on error |
| Google calls server-side with caps | Calling Places from the browser |

### 10.6 Directions note
The repo uses client-side `google.maps.DirectionsService` (legacy). It works today, but Google steers new work to the Routes API. In P7, wrap it in one hook `useRoute()` so the implementation can be swapped (Routes library `Route.computeRoutes`, or a server proxy) without touching the UI. Check the current docs before choosing; do not migrate in this step unless the legacy call fails.

---

## 11. Prompts for your AI (run in order)

Paste the "Rules for the AI" block from section 0 first. Each prompt below is a full task.

### P0: Clean-up and safety (no features)

````text
TASK P0: Remove dead code and fix repo hygiene. Do not add features.

1. apps/web/.env.example and apps/api/.env.example: replace every real-looking secret/API key with an empty
   placeholder. Add NEXT_PUBLIC_GOOGLE_MAP_ID= and GOOGLE_PLACES_SERVER_KEY= and GOOGLE_LIVE_DAILY_CAP=300.
2. Delete: apps/web-legacy/, apps/ml/ (keep apps/ml-service), apps/web/src/app/classic/,
   apps/web/src/proxy.disabled.ts, and any file that is only imported by those. Run `pnpm -r typecheck` after.
3. apps/web/package.json: remove "motion" (keep framer-motion only if grep shows imports; otherwise keep "motion"
   and remove the other; choose one), remove "lucide-react" if all imports can be swapped to @phosphor-icons/react
   within this task, remove @clerk/nextjs only if grep shows no imports outside clerk-auth-provider.tsx and
   auth-bridge.tsx and the app uses Neon Auth. If unsure about any removal, leave it and list it in your report.
4. Add `@vis.gl/react-google-maps` to apps/web. Do not remove @react-google-maps/api yet.
5. Do NOT touch map components in this task.

Acceptance: `pnpm -r typecheck` and `pnpm --filter web build` pass. Report every file deleted and every dependency changed.
````

### P1: Shared pin contract

````text
TASK P1: Create the shared pin contract in packages/shared.

Create packages/shared/src/pins.ts exporting:
  - type PinColor = "green" | "orange" | "red" | "grey"
  - type LiveSource = "google" | "twin" | "none"
  - interface Pin { id, lat, lng, free, usable, total, maxKw, color, source, updatedAt }
  - function pinState(free: number, usable: number): PinColor
      usable <= 0 -> "grey"; free <= 0 -> "red"; free >= usable -> "green"; otherwise "orange"
  - type PinTuple = [id, lat, lng, free, usable, total, maxKw, source(0|1|2), updatedAtSec]
  - functions tupleToPin(t: PinTuple): Pin and pinToTuple(p: Pin): PinTuple
  - const PIN_HEX: Record<PinColor,string> = { green:"#1E8E3E", orange:"#E8710A", red:"#D93025", grey:"#80868B" }
  - zod schema pinsQuerySchema { z: int 10..14, x: int>=0, y: int>=0, connector?: string }
Export from packages/shared index. Reuse the existing latLngToTile and add tileToBbox(z,x,y): [west,south,east,north]
if it does not exist.
Add unit tests (vitest) covering pinState for: 0 usable, 1 charger free, 1 charger busy, 4 chargers with 0/2/4 free,
and a tupleToPin/pinToTuple round trip.
Do not change any other file.

Acceptance: `pnpm --filter @evspark/shared test` passes.
````

### P2: Pins API (fast, slim)

````text
TASK P2: Add GET /api/stations/pins to apps/api.

Files you may touch: apps/api/src/routes/stations.routes.ts, a NEW apps/api/src/controllers/pins.controller.ts,
a NEW apps/api/src/repositories/pins.repo.ts, apps/api/prisma migration (index only), apps/api/tests/pins.test.ts.

Behaviour:
- Query validated with pinsQuerySchema from @evspark/shared (z, x, y, optional connector).
- Convert tile to bbox with tileToBbox. Run ONE raw SQL (PostGIS) that returns, per station in the bbox with
  status APPROVED: id, lat, lng, free (count of chargers status FREE), usable (status IN FREE,BUSY), total, max_kw.
  Use LEFT JOIN Charger + COUNT(...) FILTER. LIMIT 400. If `connector` is given, count only chargers of that connectorType.
  The exact SQL is in codedesign.md section 4.2.
- Colour comes from pinState(free, usable). Source = "twin" when the station has any charger with ocppId, else "none".
  (A later task merges Google live data; leave a clearly named hook `applyLiveOverlay(pins)` that currently returns pins unchanged.)
- Response: JSON array of PinTuple. Headers: ETag (hash of body), Cache-Control: public, max-age=10, stale-while-revalidate=30.
  Respond 304 when If-None-Match matches.
- Redis cache of the response body per (z,x,y,connector) for 10 s using existing cacheGet/cacheSet. Must still work when Redis is down.
- Add a migration creating, if missing: GIST index on "Station"(location) and btree index on "Charger"("stationId","status").
- Route must be registered BEFORE "/:id" in stations.routes.ts.
- Do NOT call computeWaitTime, geofence, or queue queries in this endpoint.

Tests: tile returns tuples, 304 on matching ETag, invalid z returns 400, empty tile returns [].
Acceptance: p95 response for a tile with 100 stations < 40 ms locally (log it), payload < 6 KB.
````

### P3: Web data layer (tiles + store + socket)

````text
TASK P3: Build the client data layer for pins. No UI yet.

Create under apps/web/src/features/driver-map/:
  stores/pin-store.ts      zustand: pins: Map<string,Pin>; upsertPins(pins: Pin[]); patchPins(pins: Pin[]).
                           Only create a new Map entry when a value actually changed (compare free/usable/color/source).
  stores/map-ui-store.ts   zustand: selectedId, panel, filter ("ALL"|"AVAILABLE"|"FAST_DC"|connector), demoOpen, + setters.
  hooks/useViewportTiles.ts  input: map bounds + zoom (from the map idle event). Output: list of {z,x,y} tiles covering
                           the viewport at z = clamp(round(zoom),10,14). Max 12 tiles. Debounce 150 ms inside the hook.
  hooks/useTilePins.ts     useQueries over the tiles. Query key ["pins", z, x, y, connector]. staleTime 10_000,
                           gcTime 5*60_000, placeholderData: keepPreviousData, retry 2 with exponential backoff.
                           On success: map tuples -> Pin via tupleToPin and upsertPins. NEVER clear the store on error.
  hooks/useLiveDeltas.ts   subscribes to socket rooms for the tiles at z=12 (tile:12:x:y) using the existing socket
                           (apps/web/src/lib/socket.ts) and applies "stations:delta" payloads to patchPins.

Fix apps/web/src/lib/socket.ts: remove the queryClient.setQueriesData({queryKey:["stations"]}) logic (cache key mismatch bug);
the delta handler must call a registered callback instead. Keep subscribeStation/unsubscribeStation.
Also change apps/api/src/lib/socket.ts to emit deltas as { pins: PinTuple[] } computed with pinState (same formula as P2).
Persist the React Query cache for the "pins" key to localStorage (persistQueryClient, maxAge 30 min) so a repeat visit shows
markers instantly. Add the persister only to the pins queries.

Write vitest tests for useViewportTiles (tile math, cap of 12) and pin-store (no new Map entry when unchanged).
Acceptance: unit tests pass; with the API running, calling the hook in a test page logs pins in the store within one request.
````

### P4: Map engine and markers

````text
TASK P4: Replace the map engine. Use @vis.gl/react-google-maps (already added in P0).

Create in apps/web/src/features/driver-map/:
  MapsProvider.tsx   <APIProvider apiKey={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} libraries={["marker"]} region="IN" language="en">
  MapCanvas.tsx      <Map mapId={NEXT_PUBLIC_GOOGLE_MAP_ID} defaultCenter defaultZoom={13} + the fixed options from
                     codedesign.md 10.3, defined as module-level constants>. Calls onIdle(bounds, zoom).
                     Shows <EvLoader variant="map"/> until the first idle; shows <EvError kind="map-key"/> if the API fails to load
                     or the key/mapId is missing. (EvLoader/EvError arrive in P8; use a temporary spinner/div until then.)
  PinLayer.tsx       Supercluster built once per pin-set change (useMemo on a version counter from pin-store, NOT on array identity).
                     radius 56, maxZoom 16. Render at most 150 items. Cluster click -> map.fitBounds to leaves.
  PinMarker.tsx      memo(({id, selected}) => AdvancedMarker + inline SVG teardrop pin). Reads its Pin via
                     usePinStore(s => s.pins.get(id)). Follow the marker spec in codedesign.md section 6 exactly:
                     solid fill from PIN_HEX, white outline, bolt glyph, selected = transform scale(1.18) + shadow.
                     Label chip (free/total + price) only when selected, hovered or zoom >= 15; CSS-only show/hide.
                     FORBIDDEN: backdrop-blur, blur filters, gradients, animate-ping, <img> inside markers.
  ClusterMarker.tsx  40px white circle, 3px border in worst child colour, bold count.
  UserDot.tsx        blue dot + accuracy ring using AdvancedMarker, heading arrow optional.
  RouteLine.tsx      draws a google.maps.Polyline imperatively only when a route exists.
  DemoSlot.tsx       returns null.
  DriverMap.tsx      composes MapsProvider > MapCanvas > (PinLayer, UserDot, RouteLine, DemoSlot) plus overlay UI slots.

Replace apps/web/src/app/(main)/driver/page.tsx with a thin component rendering <DriverMap/>. Remove the style presets feature
(default/clean/silver) and the Transit/Bicycling layers; keep roadmap/satellite and a Traffic toggle in MapLayers.
Do NOT delete the old map-shell.tsx yet; just stop importing it.

Acceptance: markers appear for the current viewport; panning does not blank the markers; in React DevTools Profiler,
selecting a marker re-renders only that marker and the card; Chrome Performance shows no long tasks > 50 ms during pan with 100+ pins.
````

### P5: Google live layer (server)

````text
TASK P5: Add live availability from Google Places API (New) to apps/api. Server-side only.

Create apps/api/src/services/googleLive.service.ts and scripts/match-google-places.ts.

1. match-google-places.ts (run manually): for each station without googlePlaceId in the target city (arg --city Thane),
   call Places Text Search (New) with textQuery "<station name> EV charging", locationBias circle radius 150 m around the station,
   fieldMask "places.id,places.displayName,places.location". Accept a match only if the place is within 75 m of the station.
   Store ONLY googlePlaceId. Print a summary: matched / ambiguous / none. Rate-limit to 5 req/s. Support --dry-run.
2. googleLive.service.ts exports getLiveForTile(z,x,y): Promise<Map<googlePlaceId, LiveOverlay>>.
   - Only when z >= 13. Otherwise return empty map.
   - Uses POST https://places.googleapis.com/v1/places:searchNearby with header X-Goog-Api-Key = GOOGLE_PLACES_SERVER_KEY and
     X-Goog-FieldMask: places.id,places.evChargeOptions . Body: includedTypes ["electric_vehicle_charging_station"],
     maxResultCount 20, locationRestriction circle = tile centre, radius = tile half-diagonal (max 5000 m).
   - From evChargeOptions.connectorAggregation[] sum: count, availableCount, outOfServiceCount, and take the oldest
     availabilityLastUpdateTime. usable = count - outOfServiceCount; free = availableCount. If availableCount is undefined
     for every aggregation, return no overlay for that place (do not invent numbers).
   - Cache in Redis for 90 s under key google:live:{z}:{x}:{y}. Cache an empty result for 60 s too (avoid hammering).
   - Global daily cap: INCR google:live:calls:{YYYY-MM-DD} (expire 36 h). If the value exceeds GOOGLE_LIVE_DAILY_CAP, skip the call.
   - 3 s timeout, circuit breaker: after 5 consecutive failures stop calling for 60 s. Never throw to callers; return empty map.
   - Never write availability numbers to Postgres. Log call count and cache hit ratio with pino.
3. In apps/api/src/controllers/pins.controller.ts implement applyLiveOverlay(pins): for stations with googlePlaceId and a fresh overlay
   (updated < 10 min ago), replace free/usable, recompute color with pinState, set source = "google" and updatedAt.
   Otherwise leave the pin unchanged.
4. Add GET /api/stations/:id/live that returns the per-connector aggregation for a card (same cache + cap rules).

Tests: mock fetch; verify aggregation sum, cap exceeded returns empty, failure returns empty, no DB writes of counts.
Acceptance: with a real key and 20 matched Thane stations, log how many returned availableCount. Report that number honestly.
````

### P6: Station card

````text
TASK P6: Rebuild the station card as specified in codedesign.md section 7.

Create apps/web/src/features/driver-map/ui/StationCard/ with: index.tsx, Header.tsx, LiveRow.tsx, Connectors.tsx, Actions.tsx,
Tabs.tsx, Skeleton.tsx, and hooks/useStationDetail.ts.

- Desktop (>= 1024px): left side panel 408px, slides in, full height. Mobile: bottom sheet with 3 snap points (use vaul, already installed).
- Renders instantly from usePinStore pin (name needs a minimal field: add `name` to the detail query only; for the instant paint
  use the name from the last search/suggestion or leave a skeleton line, never block the card).
- useStationDetail(id): useQuery(["station", id]) -> GET /api/stations/:id, plus GET /api/stations/:id/live when available,
  and subscribeStation(id) for deltas. staleTime 15 s.
- LiveRow: status chip with pin colour, "3 of 4 free", source + freshness text ("Live · Google · 40 s ago", "Simulated live",
  "No live data"), segmented bar (one segment per charger).
- Predicted wait from the existing predicted-wait logic; show "No wait" when free > 0.
- Actions row (pills): Directions (filled #1A73E8), Start, Save, Book, Share. Reuse existing handlers from
  directions-panel / booking-dialog / favorites; do not rewrite them.
- Tabs: Overview, Chargers, Reviews, Photos. Lazy-load the Reviews and Photos tab content.
- Style: tokens in codedesign.md section 7, solid colours, NO backdrop-blur anywhere, each file <= 120 lines.
- URL sync ?station=<id>; Back closes.
Delete apps/web/src/components/driver/station-card.tsx and draggable-card.tsx once nothing imports them.

Acceptance: opens < 50 ms with data from the store; skeleton for the rest; closing/reopening the same card shows cached detail with no flash;
no console warnings; keyboard: Esc closes, focus returns to the marker.
````

### P7: Search, chips, controls and directions hook (small, no redesign)

````text
TASK P7: Port the remaining map UI onto the new engine with minimal change.

Create apps/web/src/features/driver-map/ui/: SearchBar.tsx, FilterChips.tsx, MapControls.tsx, MapLayers.tsx.
Move logic from components/driver/search-card.tsx, chip-row.tsx and components/map/map-controls.tsx, map-layers.tsx.
- SearchBar: top-left, 360px, Google-style (white, radius 24, elevation shadow). Station name search runs on the local pin store first,
  then on Places Autocomplete (importLibrary("places") only when the input is first focused) for places/addresses.
- FilterChips: All, Available now (free > 0), Fast DC (maxKw >= 50), CCS2, Type 2, CHAdeMO, Home, Work. Filtering is a derived
  selector over the pin store; it must NOT trigger a new fetch except for connector filters (pass `connector` to the pins endpoint).
- MapControls: zoom, locate-me, Fuel (best station). Implement through hooks/useMapActions.ts (flyTo, fitBounds, locateMe, fuel).
  Locate-me: pan to the user, zoom so at least the nearest station is visible (existing logic from map-shell handleLocateMe).
  Fuel: pick the best pin by score = distanceKm*1.5 + predicted wait; open its card and draw the route.
- hooks/useRoute.ts: one hook wrapping the existing client-side DirectionsService, returning {route, status, error} and cancelling
  stale requests. UI components must not call google.maps.DirectionsService directly.
Then delete components/driver/map-shell.tsx, components/map/ev-map.tsx, cluster-layer.tsx, station-marker.tsx, user-location.tsx
and remove @react-google-maps/api from package.json. Do NOT delete ghost-layer.tsx, presentation-suite.tsx or ghost-simulation-store.ts
(Step 2 will use them); just make sure nothing imports them.

Acceptance: build passes with @react-google-maps/api removed; chips filter instantly; typing in search does not re-render markers.
````

### P8: EV loader and error screens

````text
TASK P8: Build the EV animation loader and error components.

Create apps/web/src/components/feedback/EvLoader.tsx, EvError.tsx, ev-anim.css. Follow codedesign.md section 8.
- Pure SVG + CSS keyframes. No new dependencies. Honour prefers-reduced-motion (static frame, no motion).
- EvLoader props: variant "map" | "page" | "inline", message?. Car drives over a scrolling dashed road, battery bar fills and loops,
  bolt pulses, message rotates every 2 s. After 8 s show "Still working. Slow network?" and a Retry callback prop `onRetry`.
- EvError props: kind ("offline"|"map-key"|"api"|"geolocation"|"not-found"|"unknown"), onRetry?, details?. Stopped car, 0% battery
  with a slow red blink, unplugged cable. Texts and actions exactly as the table in section 8.2. `details` is collapsible and only
  rendered when process.env.NODE_ENV !== "production" or when `showDetails` is true.
- Accessible: role="status" aria-live="polite" for the loader, role="alert" for the error, buttons focusable.
Wire: app/(main)/driver/loading.tsx (page loader), app/(main)/driver/error.tsx and app/global-error.tsx (EvError kind unknown/api),
update app/not-found.tsx (kind not-found), MapCanvas (map loader / map-key error), and pins query errors (toast only, keep markers).
Add a /dev/feedback page (non-production only) showing every variant side by side for visual review.

Acceptance: all 3 loader variants and 6 error kinds render; animation uses only transform/opacity/stroke-dashoffset; Lighthouse accessibility >= 95 on /dev/feedback.
````

### P9: Demo button and profile button

````text
TASK P9: Add the Demo button and the new Profile button (top-right overlay on the driver map).

Create ui/DemoButton.tsx and ui/ProfileButton.tsx in apps/web/src/features/driver-map/ui/.
Layout: a flex row fixed top-right (gap 8px): [DemoButton][ProfileButton]. Respect safe-area insets on mobile.

DemoButton: 40px-tall pill, play icon + "Demo" (icon only below 640px). onClick toggles useMapUiStore.demoOpen. In Step 1 the open state
shows a small popover "Demo mode arrives in Step 2" and mounts <DemoSlot/> (null). Do not import presentation-suite or ghost stores.

ProfileButton: 40px avatar (image or initials on a deterministic colour), white ring + elevation shadow. Radix Popover, 320px wide:
 header (avatar 48px, name, email/username); vehicle chip (make model, connector icons, battery % from useQuery(["my-profile"], /api/me/profile),
 an Edit link opening ?panel=vehicle); links to ?panel=favorites|bookings|history|eco|settings; role switcher when the user has more than
 one role; Sign out. Signed-out: show a "Sign in" pill instead. Loading: skeleton circle. Error: fall back to initials from the auth session,
 never throw.
Remove account items from components/driver/menu-drawer.tsx (keep map-navigation items only).

Acceptance: keyboard nav works (Tab, Enter, Esc), popover closes on outside click, no layout shift, buttons never overlap the station card
or the search bar on 360px-wide screens.
````

### P10: Verify, measure, tidy

````text
TASK P10: Measure and tidy. No new features.

1. Add a dev-only perf overlay (NODE_ENV !== "production", toggle with Shift+P): shows pins in store, markers rendered, last tile fetch ms,
   cache hit/miss, socket connected, Google-live calls today (from a new GET /api/stations/live-stats on the API, dev only).
2. Run through the acceptance table in codedesign.md section 12 and report PASS/FAIL with the measured number for each row.
3. Fix only what fails. List anything you could not fix and why.
4. Update README: new architecture diagram (copy section 3 of codedesign.md), env vars, the Google key setup steps, and a note
   "Station data = own DB; Google = live layer only; OCM = import script".
````

---

## 12. Acceptance checklist (the demo-day test)

| # | Check | Pass condition |
|---|-------|----------------|
| 1 | Cold load of `/driver` on throttled "Fast 4G" | Map visible < 1.5 s, EvLoader shown before that |
| 2 | Repeat visit | Markers visible < 300 ms (from persisted cache), then silently refreshed |
| 3 | Pan across Thane → Mumbai | No blank marker flash; no request for already-cached tiles |
| 4 | Chrome Performance while panning with ≥100 pins | No long task > 50 ms, ~60 fps |
| 5 | Click a marker | Card paints < 50 ms with name/colour/counts; details fill in |
| 6 | Make a charger busy via twin/OCPP | Marker colour changes < 1 s with no page refresh; only that marker re-renders |
| 7 | Station with all chargers busy | Red pin. Some busy, some free → orange. All free → green. Offline/no data → grey |
| 8 | Google live station (if coverage exists) | Card shows "Live · Google · <60 s ago"; counts match Google Maps |
| 9 | Station with no live data | Grey pin, card says "No live data", nothing fake |
| 10 | Kill the API | Map stays, last pins remain, non-blocking error toast, EvError offered after retries |
| 11 | Break the Maps key | EvError "Map couldn't load" with Retry; app does not crash |
| 12 | Daily cap exceeded | Google calls stop, pins fall back to twin/none, no errors in UI |
| 13 | Demo button | Visible top-right, opens placeholder, no console errors |
| 14 | Profile button | Popover works by keyboard and mouse; signed-out state correct |
| 15 | Repo | No real keys in any `.env.example`; `@react-google-maps/api`, web-legacy, classic page gone |

---

## 13. Honest limits and things to verify

- **Google live coverage in India is unproven.** Run P5's matching + availability test on 20 Thane stations first. If few return `availableCount`, the demo should lead with the twin (labelled "Simulated live") and show Google as a bonus on the stations where it works.
- **Do not scrape Google Maps** (Selenium, unofficial endpoints). It breaks Google's terms and is brittle; the API route above is the legitimate way to get the same data.
- **Aggregator data (ChargePe, One Bharat Charge):** your pending email is the right path for real per-charger status. If they reply with a feed, it plugs in as another overlay source next to `google` and `twin` (add a `LiveSource` value), with no map changes.
- **Google pricing and terms change.** Check the Places API (New) pricing page (Enterprise + Atmosphere SKU) and the Service Specific Terms on caching before relying on the numbers in section D3.
- **`@vis.gl/react-google-maps` and Routes API specifics** (exact prop names, `Route.computeRoutes`) should be checked against current docs when the AI writes the code; the prompts describe intent, not exact signatures.
- Step 2 (demo cars, geofence wait-time logic) deliberately reuses `DemoSlot`, `useMapUiStore.demoOpen`, the kept `ghost-*` files, and the pin store: simulated cars should write to the same `usePinStore` so the marker colours react exactly like real data.
