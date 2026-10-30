# EVspark — Driver map page: design.md

> STATUS: COMPLETE — all 4 steps written (foundation, components, behaviour + core code, data + backend + agent prompts + QA).
> Audience: Antigravity coding agent. Follow literally. Do not improvise colors, sizes, or file names.

---

## 0. RULES FOR THE AGENT (read first)

1. Work in the order of the sections. Finish one file fully before starting the next.
2. Never leave `TODO`, `...`, or placeholder text in code. Every file must compile.
3. After every new file run `npm run build -w apps/web` (or `npx tsc --noEmit`). Fix errors before moving on.
4. Use ONLY the tokens in section 2. No hardcoded hex values inside components; use CSS variables or the Tailwind aliases.
5. Do not add a top navbar on the driver page. Navigation = slim left dock only.
6. Do not use a dark theme. Light only (the map must never be black or dark).
7. Do not install libraries that are not listed in section 1.3.
8. Keep every component under 250 lines. Split if bigger.
9. All text is sentence case. No ALL CAPS labels, no emoji in UI text.
10. If something is unclear, choose the simplest option and add a one-line comment `// DECISION: ...`.

---

## 1. DECISIONS AND SCOPE

### 1.1 What we are building
The **Driver map page** (`/map`) of EVspark. The map is the product: it fills the whole viewport. Everything else floats on top of it as cards.

Primary job of the page: answer "Can I charge here, now, and how long will I wait?" in under 2 seconds.

### 1.2 Visual direction (decided)
- Reference look: red/white "Shipment track" dashboard (big rounded white cards, one strong red accent, one solid red hero card, large numbers, pill chips, thick red route line with numbered stops).
- Reference structure: Torque admin system already used on the operator side (Geist fonts, 20px cards, pill controls, tabular numbers).
- **Unified system**: driver page uses the same Torque tokens but with a red-orange accent `--ev-accent`. Map is large and light, Google-Maps-like.
- Differences from the reference: map is 100% of the viewport (not 25%), no top navbar, no sidebar with labels (icon dock only), no chat.

### 1.3 Stack (do not add others)
- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui primitives
- Map: `@vis.gl/react-google-maps` (Google Maps JS API, vector map with a mapId)
- Clustering: `supercluster` (client side, custom React markers)
- Icons: `@phosphor-icons/react`
- Motion: `framer-motion`
- Fonts: `geist` (Geist Sans + Geist Mono via `geist/font`)
- Realtime: `socket.io-client`
- Data fetching: `@tanstack/react-query`
- State: `zustand`

Install command:
```bash
npm i -w apps/web @vis.gl/react-google-maps supercluster @types/supercluster @phosphor-icons/react framer-motion geist socket.io-client @tanstack/react-query zustand
```

### 1.4 Files this design will create (final tree)
```
apps/web/src/app/(driver)/map/page.tsx
apps/web/src/features/driver-map/
  tokens.css
  map-style.ts
  types.ts
  store.ts
  hooks/useStations.ts
  hooks/useLiveStatus.ts
  hooks/useUserLocation.ts
  hooks/useRoute.ts
  components/MapCanvas.tsx
  components/StationPin.tsx
  components/ClusterBubble.tsx
  components/UserMarker.tsx
  components/DemoCarMarker.tsx
  components/RouteLayer.tsx
  components/SearchPill.tsx
  components/FilterChips.tsx
  components/NearbyPanel.tsx
  components/StationListItem.tsx
  components/StationCard.tsx
  components/ChargerRow.tsx
  components/WaitHeroCard.tsx
  components/StartRouteCard.tsx
  components/LiveChip.tsx
  components/AlertStack.tsx
  components/CompareTray.tsx
  components/MapControls.tsx
  components/Dock.tsx
  components/BottomSheet.tsx
  components/Skeletons.tsx
  components/EmptyStates.tsx
```

---

## 2. DESIGN TOKENS

### 2.1 Create `features/driver-map/tokens.css` and import it in `app/layout.tsx`
```css
:root {
  /* surfaces */
  --ev-canvas: #f1f0ec;          /* warm paper behind everything */
  --ev-card: #ffffff;            /* floating cards */
  --ev-card-soft: #f7f6f2;       /* inset areas inside cards */
  --ev-line: rgba(23, 24, 27, 0.08); /* 1px hairlines */

  /* text */
  --ev-ink: #17181b;
  --ev-ink-2: #5b616b;
  --ev-ink-3: #9096a0;

  /* accent (brand, selection, CTA, hero card) */
  --ev-accent: #e5392a;
  --ev-accent-ink: #ffffff;
  --ev-accent-soft: #fdeceb;      /* tinted pill background */
  --ev-accent-deep: #c2410c;      /* Torque burnt orange, used for pressed state and links */

  /* status (map pins and pills) */
  --ev-free: #12a36b;
  --ev-free-soft: #e3f6ee;
  --ev-busy: #f5a524;
  --ev-busy-soft: #fff4dc;
  --ev-full: #5b616b;             /* full = neutral ink-grey, NOT red (red is the brand) */
  --ev-full-soft: #ececef;
  --ev-offline: #b8bcc4;

  /* info */
  --ev-sky: #2b8bd6;
  --ev-sky-soft: #e4f1fb;

  /* shape */
  --ev-r-card: 20px;
  --ev-r-inner: 14px;
  --ev-r-pill: 999px;

  /* elevation: ONE soft layered shadow for floating cards */
  --ev-shadow: 0 1px 2px rgba(23,24,27,.06), 0 8px 24px rgba(23,24,27,.10), 0 24px 48px rgba(23,24,27,.06);
  --ev-shadow-pin: 0 2px 6px rgba(23,24,27,.25);

  /* motion */
  --ev-ease: cubic-bezier(.2, .8, .2, 1);
  --ev-fast: 160ms;
  --ev-med: 280ms;

  /* layout */
  --ev-gap: 12px;                 /* gap between floating cards and screen edge */
  --ev-panel-w: 352px;
  --ev-dock-w: 64px;
  --ev-control: 44px;             /* height of buttons, inputs, chips */
}

@media (prefers-reduced-motion: reduce) {
  :root { --ev-fast: 0ms; --ev-med: 0ms; }
}
```

### 2.2 Tailwind aliases (`tailwind.config.ts` → `theme.extend`)
```ts
colors: {
  ev: {
    canvas: 'var(--ev-canvas)', card: 'var(--ev-card)', soft: 'var(--ev-card-soft)',
    line: 'var(--ev-line)', ink: 'var(--ev-ink)', ink2: 'var(--ev-ink-2)', ink3: 'var(--ev-ink-3)',
    accent: 'var(--ev-accent)', accentSoft: 'var(--ev-accent-soft)', accentDeep: 'var(--ev-accent-deep)',
    free: 'var(--ev-free)', freeSoft: 'var(--ev-free-soft)',
    busy: 'var(--ev-busy)', busySoft: 'var(--ev-busy-soft)',
    full: 'var(--ev-full)', fullSoft: 'var(--ev-full-soft)',
    sky: 'var(--ev-sky)', skySoft: 'var(--ev-sky-soft)',
  },
},
borderRadius: { card: 'var(--ev-r-card)', inner: 'var(--ev-r-inner)' },
boxShadow: { ev: 'var(--ev-shadow)', pin: 'var(--ev-shadow-pin)' },
fontFamily: { sans: ['var(--font-geist-sans)'], mono: ['var(--font-geist-mono)'] },
```

### 2.3 Typography
| Role | Font | Size / weight | Letter-spacing | Notes |
|---|---|---|---|---|
| Hero number (wait time, ETA) | Geist Mono | 44px / 600 | -0.04em | `font-variant-numeric: tabular-nums` |
| Card title | Geist Sans | 18px / 600 | -0.02em | station name |
| Section title | Geist Sans | 15px / 600 | -0.01em | |
| Body | Geist Sans | 14px / 400 | -0.005em | line-height 1.45 |
| Label (grey) | Geist Sans | 12px / 500 | 0 | color `--ev-ink-3`, sentence case |
| Number inline | Geist Mono | 14px / 500 | -0.02em | prices, kW, distance |

Rules: every number uses `tabular-nums`. Max line length 60 characters inside cards.

### 2.4 Component shape rules
- Floating cards: background `--ev-card`, radius 20px, border `1px solid var(--ev-line)`, shadow `--ev-shadow`.
- Inner areas (chips rows, stat boxes inside a card): background `--ev-card-soft`, radius 14px.
- Buttons, inputs, chips: height 44px (chips 36px), fully pill-shaped.
- Primary button: background `--ev-accent`, text white, hover `--ev-accent-deep`, active scale 0.98.
- Secondary button: white, 1px line border, hover background `--ev-card-soft`.
- Only ONE solid-accent hero card is allowed on screen at a time (the wait hero card). Everything else is white.
- Focus ring on every interactive element: `outline: 2px solid var(--ev-accent); outline-offset: 2px`.

---

## 3. PAGE LAYOUT

### 3.1 Desktop (width ≥ 1024px)
```
┌────────────────────────────────────────────────────────────────────────┐
│ ┌─┐ ┌───────────────────┐ ┌ chips: Free now · Fast DC · CCS2 · Fav ┐ ┌─┐│
│ │D│ │ Search pill       │ └────────────────────────────────────────┘ │C││
│ │O│ ├───────────────────┤                                            │O││
│ │C│ │ Nearby stations   │        FULL-SCREEN LIGHT MAP               │N││
│ │K│ │ (collapsible)     │        pins · clusters · route · cars      │T││
│ │ │ │ ┌───────────────┐ │                                            │R││
│ │ │ │ │ list item     │ │          ┌───────────────────────────┐     │O││
│ │ │ │ │ list item     │ │          │ Station card (draggable)  │     │L││
│ │ │ │ └───────────────┘ │          │ tabs · chargers · [Start] │     │S││
│ └─┘ └───────────────────┘          └───────────────────────────┘     └─┘│
│                    ● Live · 12 free nearby · updated 4s ago            │
└────────────────────────────────────────────────────────────────────────┘
```

Positions (all `position: absolute` inside a `relative h-dvh w-dvw overflow-hidden` root; the map is `absolute inset-0`):
| Element | Position |
|---|---|
| Dock | `left: 12px; top: 12px; bottom: 12px; width: 64px` (vertical pill, white card) |
| Search pill | `left: calc(12px + 64px + 12px); top: 12px; width: 352px` |
| Nearby panel | under the search pill, `top: 12px + 44px + 12px; bottom: 12px; width: 352px` |
| Filter chips | `top: 12px; left: calc(12px + 64px + 12px + 352px + 12px)`; horizontal scroll, no wrap |
| Map controls | `right: 12px; top: 12px` (vertical stack) |
| Station card | default `left: calc(100% - 12px - 392px - 64px)`; width 392px; draggable anywhere inside the viewport |
| Live chip | `left: 50%; bottom: 16px; transform: translateX(-50%)` |
| Alert stack | `right: 12px; bottom: 16px; width: 320px` |
| Compare tray | `left: 50%; bottom: 64px; transform: translateX(-50%)` (only when 1+ items) |

When the Nearby panel is collapsed, the search pill stays and the panel slides out; the filter chips move left to follow.

### 3.2 Mobile (width < 1024px)
```
┌─────────────────────────┐
│ [Search pill]   [layers]│
│ chips →                 │
│        MAP              │
│                    [loc]│
│                         │
│ ┌─────────────────────┐ │
│ │ Bottom sheet        │ │  3 snaps: peek 120px / half 50dvh / full 92dvh
│ └─────────────────────┘ │
│  [ dock: Map Saved Trips Me ] floating bottom pill
└─────────────────────────┘
```
- Dock becomes a floating bottom pill (height 56px, `bottom: calc(12px + env(safe-area-inset-bottom))`).
- Nearby panel + Station card both live inside the Bottom sheet (list view by default; station detail replaces list when a pin is selected).
- Live chip sits above the sheet in peek state and hides when the sheet is half or full.

### 3.3 Z-index scale (use exactly these)
`map 0` · `route/pins 10` · `controls & chips 20` · `panel & dock 30` · `station card 40` · `compare tray 45` · `alerts 50` · `sheet 55` · `modal 60`

---

## 4. MAP STYLE AND MAP OBJECTS

### 4.1 Google Map setup
- Use `<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}>` and `<Map mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID} ...>`.
- Map options: `disableDefaultUI: true`, `gestureHandling: 'greedy'`, `clickableIcons: false`, `mapTypeId: 'roadmap'` (satellite via toggle), default zoom 13, center = user location or Mumbai (`19.0760, 72.8777`).
- Create the Map ID in Google Cloud Console with "Vector" type and apply the light style below as a cloud style, OR (fallback) pass `styles` using the JSON in 4.2.

### 4.2 Fallback light style (`map-style.ts`)
```ts
export const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#eceae4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5b616b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f7f6f2' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#dfe7d6' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e1dfd8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#fbe3c8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#efc9a0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfe3ee' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d6d3ca' }] },
];
```
The map must look quiet so that pins and the red route are the loudest things on it.

### 4.3 Station pin (`StationPin.tsx`)
- Shape: 40×40 circle + 8px pointer, white 2px ring, `--ev-shadow-pin`.
- Fill by status: free `--ev-free`, busy `--ev-busy`, full `--ev-full`, offline `--ev-offline`.
- Icon: Phosphor `Lightning` weight `fill`, white, 20px.
- Badge (top-right, 18px circle, white, mono 11px/600): number of free chargers. Hide when status is full/offline.
- Selected: scale 1.2, ring becomes `--ev-accent` 3px, pulse ring animation (one ring expanding, 1.6s, infinite, opacity 0.35 to 0).
- Hover (desktop): scale 1.08 and show tooltip (section 4.5).
- Use `AdvancedMarker` with `zIndex`: selected 100, free 20, busy 15, full 10.

### 4.4 Cluster bubble (`ClusterBubble.tsx`)
- Circle, size = `clamp(40, 28 + log2(count) * 8, 64)` px, white fill, 3px ring `--ev-ink`, count in Geist Mono 14px/600.
- Optional inner arc (conic-gradient) showing the % of free stations in the cluster in `--ev-free`.
- Click: `map.fitBounds(cluster bounds, 80)` (zoom into it).
- Clustering with `supercluster`: `radius: 60`, `maxZoom: 16`, `minPoints: 3`. Rebuild the index only when stations change, query on `idle` event with current bounds + zoom.

### 4.5 Pin tooltip (desktop hover)
Dark pill (`--ev-ink` background, white text, 12px, radius 12px, padding 8px 10px) above the pin: station name, then `3 free · ~6 min wait` in mono. Appears after 120ms, disappears instantly on leave. Not shown on touch devices.

### 4.6 Other map objects
| Object | Spec |
|---|---|
| User marker | 16px `--ev-sky` dot, 3px white ring, plus a translucent 56px pulse circle. Heading cone only if `heading` is available. |
| Geofence (selected station only) | Circle polygon, radius 100m, fill `--ev-accent` at 8% opacity, stroke `--ev-accent` 1.5px dashed. Shrinks visually if it overlaps a road (use server value `geofence.radiusM`). |
| Route line | Polyline, 6px, color `--ev-accent`, rounded caps, 2px white casing underneath (draw a wider white polyline first, z below). |
| Route stops | 24px white circle with 2px accent border and mono number inside (origin = user dot, destination = selected pin). |
| Demo cars | 22px white rounded square, 1px line border, Phosphor `Car` icon in `--ev-ink-2`; cars heading to a station get an accent dot. Move with 1s linear transitions, never overlap (server decides positions). |
| Heat overlay (optional layer) | Off by default. Toggle in layers menu: shows predicted busy hours as soft red-to-transparent circles. |

---

_End of step 1._

---

# STEP 2 — COMPONENTS

All components live in `apps/web/src/features/driver-map/components/`. All are client components (`'use client'`). Props are typed in `types.ts` (defined in section 11).

## 5. SHARED PRIMITIVES (build these inline first, in `components/ui-bits.tsx`)

```tsx
// Pill: tinted status label
export function Pill({ tone, children }: { tone: 'free'|'busy'|'full'|'accent'|'sky'|'neutral'; children: React.ReactNode }) {
  const map = {
    free: 'bg-ev-freeSoft text-ev-free', busy: 'bg-ev-busySoft text-[#a86a00]',
    full: 'bg-ev-fullSoft text-ev-full', accent: 'bg-ev-accentSoft text-ev-accent',
    sky: 'bg-ev-skySoft text-ev-sky', neutral: 'bg-ev-soft text-ev-ink2',
  } as const;
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

// Card: floating surface
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-card border border-ev-line bg-ev-card shadow-ev ${className}`}>{children}</div>;
}

// Num: tabular mono number
export function Num({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono tabular-nums tracking-[-0.02em] ${className}`}>{children}</span>;
}
```

## 6. COMPONENT SPECS

### 6.1 `Dock.tsx`
- Desktop: vertical white card pill, 64px wide, icons only, 44px round buttons, 8px gap.
- Items in order: Logo bolt (top, accent filled circle), Map, Saved (heart), Trips (clock-counter-clockwise), Vehicle (car), then spacer, then Settings, Avatar (bottom).
- Active item: a sliding pill (absolute element, 44px, `--ev-accent` background, icon white) animated with framer-motion `layoutId="dock-pill"`.
- Tooltip on hover (right side) with the label.
- Mobile: horizontal bottom pill with 4 items (Map, Saved, Trips, Me), same sliding pill.
- Icons: Phosphor `MapTrifold`, `Heart`, `ClockCounterClockwise`, `Car`, `Gear`.

### 6.2 `SearchPill.tsx`
- 44px high pill, white, shadow, icon `MagnifyingGlass` at left, placeholder `Search stations or places`.
- Right side: a `⌘K` key hint on desktop (mono 12px, soft background, radius 8px). `⌘K` / `Ctrl+K` focuses the input.
- Typing opens a dropdown card (max 6 results): recent searches (clock icon), station matches (bolt icon + name + distance), place matches (Google Places Autocomplete via `@vis.gl` places library or `/api/search`).
- Selecting a station flies the map to it and selects it. Selecting a place recenters the map and reloads nearby.
- Keyboard: arrows move highlight, Enter selects, Esc closes.

### 6.3 `FilterChips.tsx`
- Horizontal scroll row, chips 36px high, pill, white, 1px line border. Hide scrollbar.
- Chips (in order): `Free now`, `Fast DC`, `CCS2`, `Type 2`, `CHAdeMO`, `Under ₹15/kWh`, `Favourites`, `Open 24h`.
- Each chip shows a 8px color dot when relevant (Free now = green dot).
- Active chip: background `--ev-accent`, text white, border transparent. Chip count badge in mono when results change (`Free now 12`).
- A chip that would return 0 results in the current view is greyed (opacity .45) and `aria-disabled`, as in the Lamar reference.
- Last item: `Filters` button with `SlidersHorizontal` icon opening a modal for price range, min kW, amenities.
- State lives in zustand `filters`; changes update the URL query string (`?f=free,fast`).

### 6.4 `NearbyPanel.tsx` (left list)
- White card, 352px wide, full height minus margins, three zones:
  1. Header: title `Nearby stations` (15px/600), count pill, sort dropdown (`Closest`, `Shortest wait`, `Cheapest`, `Fastest`), collapse button (`CaretLeft`).
  2. Tabs (pill segmented, 36px): `All`, `Free now`, `Saved`.
  3. Scrollable list of `StationListItem` (virtualize if > 50 items; use plain CSS `content-visibility: auto` on items).
- Linked selection: hovering a list item highlights its pin (scale 1.15) and hovering a pin scrolls the list to its item and highlights it with `--ev-card-soft`.
- Collapse: panel slides left with framer-motion (x: -380) and a small floating `Stations` button (44px pill) stays in its place to reopen it.
- Footer: `Updated 4s ago` with a tiny green live dot (from `useLiveStatus`).

### 6.5 `StationListItem.tsx`
Layout (height 92px, padding 12px, radius 14px, hover `--ev-card-soft`, selected = 1.5px accent border + `--ev-accent-soft` background):
```
[ 56x56 photo ]  Station name (15/600, 1 line ellipsis)
                 1.2 km · 4 min drive (mono 13, ink2)
                 [Pill free: 3 free]   [Pill: ~6 min wait]            ♡
```
- Photo: rounded 12px, `object-cover`, fallback = soft background with Phosphor `Lightning` icon.
- Pill tone by status; wait pill is `neutral`; for a free charger show `No wait` in `free` tone.
- Heart button toggles favourite (optimistic update, filled red when active).

### 6.6 `StationCard.tsx` (draggable detail card, desktop)
- Width 392px, max-height `calc(100dvh - 24px)`, white card, internal scroll area. Drag by the top handle (the 40x4 grey bar) using framer-motion `drag` with `dragConstraints` = viewport ref, `dragMomentum={false}`, `dragElastic={0.05}`.
- Open animation: scale .96 → 1, opacity 0 → 1, 280ms `--ev-ease`. Close: reverse 160ms.
- Structure top to bottom:
  1. Drag handle row + close `X` button (top right).
  2. Photo carousel, height 160px, radius 14px, dots at the bottom, Google Places photo via `/api/stations/:id/photos` (fallback gradient `--ev-card-soft`). Max 5 photos.
  3. Title row: station name (18/600), rating chip (`Star` fill amber + `4.5` mono), heart button.
  4. Address line (13px, ink2), with `Copy` icon button (copies address, toast `Address copied`).
  5. Status row: status pill, `Open 24h` pill, distance and drive time (mono).
  6. `WaitHeroCard` (section 6.7).
  7. Tabs: `Chargers` · `Reviews` · `Info` (underline tabs, animated underline with `layoutId`).
  8. Tab content (see below).
  9. Sticky footer with two buttons: `Save` (secondary, heart icon) and `Start` (primary, `NavigationArrow` icon, flex-1).
- Tab `Chargers`: list of `ChargerRow`. Above the list a one-line summary `2 of 4 free` and the striped occupancy bar.
- Tab `Reviews`: rating histogram (5 thin bars) + list of 3 latest reviews (avatar initials circle, name, stars, text max 3 lines) + `Write a review` secondary button.
- Tab `Info`: price per kWh table, amenities icons row (`Coffee`, `Toilet`, `WifiHigh`, `Storefront`, `Umbrella`), opening hours, operator name, `Report an issue` text button.
- Mobile: same content rendered inside `BottomSheet` (no drag, sheet handles it).

### 6.7 `WaitHeroCard.tsx` (the ONE solid red card)
```tsx
// Props: { waitMin: number | null; freeCount: number; total: number; forecast: number[]; confidence: 'high'|'medium'|'low'; ahead: number }
```
- Background `--ev-accent`, text white, radius 20px, padding 16px, height 132px, `overflow: hidden`.
- Left: label `Predicted wait` (12px, 80% white). Number: if `freeCount > 0` show `No wait` (28/600); else `{waitMin}` hero mono 44px with `min` unit in 14px. Number animates with a count-up (400ms) whenever it changes.
- Below the number: `Based on {ahead} cars ahead` and a confidence dot (3 dots filled by level).
- Right/bottom: smooth white line chart (SVG path, 2px stroke, 60% opacity fill below) of the next 60 min forecast (12 points), with a small dot marking "now". Faint dotted grid like the reference's Route efficiency card.
- Value "-" rule from the project: when a charger is free the *per-charger* wait shows `-`; the hero shows `No wait`.
- Re-render only when values change; use `React.memo`.

### 6.8 `ChargerRow.tsx`
```
[ connector icon 36 ]  Charger 2 · CCS2 · 60 kW             ₹18/kWh
                        [striped bar ▓▓▓▓▓▓░░░░ 62%]       Done in 14 min
```
- Connector icon: round 36px, background `--ev-card-soft`, Phosphor `PlugsConnected`, color by status.
- Status text on the right: free → `-` (grey mono, per project rule) with a `Free` green pill at the left of the price; charging → `Done in {n} min` mono; reserved → `Reserved`; offline → `Offline` grey.
- Progress bar: 8px high, radius 999px, track `--ev-card-soft`. Charging fill = `--ev-accent` with diagonal stripes (the "truck capacity" look): `background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px)`, stripes slide slowly with `background-position` animation (2s linear infinite). Free = no fill. Offline = hatched grey.
- Row height 64px, divider hairline between rows.

### 6.9 `StartRouteCard.tsx`
Appears when the driver presses `Start` (replaces the footer area of the Station card on desktop; on mobile becomes the sheet content).
- Title `Route to {station}`; big mono line `{distanceKm} km` and `{etaMin} min` side by side (28px).
- Row of 3 small stat boxes (soft background, radius 14px): `Arrive at 14:32`, `Wait on arrival ~6 min`, `Battery on arrival 42%` (only if vehicle battery is known).
- Match score ring (reference "route optimization 85%"): 56px SVG ring, accent stroke, number in the middle. Label `Good match`.
- Buttons: `Open in Google Maps` (secondary), `Cancel` (text), and primary `Start driving`.
- When started: map draws route (`RouteLayer`), camera fits both points, a numbered stop 1 (you) and 2 (station). Card shrinks to a one-line banner `Driving to {station} · {etaMin} min` with a `Stop` button.
- If the wait grows by 5+ min while driving, push an alert (section 7.4) offering the next-best station: `Another station is faster. Switch?`.

### 6.10 `LiveChip.tsx`
- Pill, white, shadow, height 36px: pulsing 8px green dot, `Live`, divider, `{n} free nearby`, divider, `Updated {s}s ago` (mono). Updates every second without re-rendering siblings.
- States: connected (green dot), reconnecting (amber dot, text `Reconnecting`), offline (grey dot, text `Offline · showing saved data`).

### 6.11 `AlertStack.tsx`
- Up to 3 stacked toast cards bottom-right, each: tinted icon circle (36px), title (14/600), body (13 ink2), time (mono 12), close `X`. Auto-dismiss 8s, pause on hover.
- Types: `charger_freed` (green), `geofence` (sky, `You're within the station's range`), `wait_increased` (amber), `station_offline` (grey), `favourite_free` (accent).
- Actions inside toast: `View` (selects station) and, for favourites undo, `Undo` (5s).
- Use framer-motion `AnimatePresence` for in/out (x: 24 → 0).

### 6.12 `CompareTray.tsx`
- Appears when the user adds stations to compare (a `Compare` icon on list items and station card). Pill tray at bottom center with up to 3 mini chips (name + `X`) and a `Compare` primary button (enabled at 2+).
- Opens a modal (width 720px) with a table: rows = Distance, Drive time, Wait, Price/kWh, Max kW, Connectors, Free chargers, Rating. Best value per row is bold with a green tick. Desktop table; mobile stacked cards.

### 6.13 `MapControls.tsx`
Vertical stack of 44px round white buttons, 8px gap, shadow:
1. `Layers` (opens small popover: `Map`, `Satellite`, `Heat`) 
2. `Crosshair` locate me (turns accent when tracking)
3. `Plus` / `Minus` (joined as one 44x88 pill)
4. `ArrowsOut` fullscreen (hides panels; press again to restore)

### 6.14 `BottomSheet.tsx` (mobile)
- Snaps: peek 120px, half 50dvh, full 92dvh. Use framer-motion `drag="y"` with velocity-based snapping (`offset.y`/`velocity.y` thresholds 80px / 500).
- Handle 40x4 grey bar centered. Content scrolls only when the sheet is at full.
- Body scroll locked. Safe-area padding bottom.

### 6.15 `Skeletons.tsx` and `EmptyStates.tsx`
- Skeletons: `ListItemSkeleton` (shimmer, same 92px size), `CardSkeleton`, `PinsLoadingPill` (`Loading stations…` white pill with a spinner at top center).
- Shimmer: linear-gradient moving 1.4s, colors `--ev-card-soft` to `#fff`.
- Empty states (icon 48px in soft circle, title, one-line help, one action):
  - No stations in view: `No stations in this area` / `Zoom out or clear filters.` / `Clear filters`
  - No results for filters: `Nothing matches your filters` / `Try removing one.` / `Reset filters`
  - Location blocked: `Location is off` / `Turn it on to see stations near you.` / `Enable location`
  - Offline: `You're offline` / `Showing the last saved stations.`

---

_End of step 2._

---

# STEP 3 — BEHAVIOUR, MOTION, RESPONSIVE, CORE CODE

## 7. INTERACTION FLOWS

### 7.1 Page load
1. Render the shell immediately (map container + dock + search pill). Show `PinsLoadingPill` and 4 `ListItemSkeleton`.
2. Request location. If granted: center map on user (animate pan 600ms). If denied: keep Mumbai and show the `Location is off` empty state inside the Nearby panel, but still show all stations.
3. Fetch stations for the current bounds (`GET /api/stations?bbox=...`). Target: pins visible under 300ms from cache.
4. Open the socket and subscribe to the visible area. Pins update in place (no re-mount).

### 7.2 Select a station
Trigger: click pin, click list item, search result, or `?s=<id>` in URL.
1. Set `selectedId` in the store and push `?s=<id>` (shallow routing, no reload).
2. Map pans so the pin sits in the left-center of the free area (offset by the card width), 400ms.
3. Pin scales up with pulse; geofence circle fades in (200ms).
4. Station card opens (or the sheet moves to half on mobile). Card data loads: show `CardSkeleton` for max 300ms, then content.
5. Close: `Esc`, `X`, or click on empty map. Remove `?s=`.

### 7.3 Start driving
`Start` → `StartRouteCard` → `Start driving`.
1. `POST /api/route` with origin (user) and destination (station) → polyline, distance, etaMin, waitOnArrival.
2. Draw the route (casing then accent line), fit bounds with padding `{top:96,bottom:96,left:392+24,right:96}` on desktop.
3. While driving: update user marker and ETA every 5s; wait time continues to update live; geofence entry (80m) triggers the `geofence` alert.
4. `Stop` clears the route and returns to the station card.

### 7.4 Alert rules (server events → toasts)
| Event | Condition | Toast title | Body |
|---|---|---|---|
| `charger_freed` | selected or favourite station gets a free charger | `A charger is free` | `{station} now has {n} free.` |
| `wait_increased` | wait for the driving target grows by ≥ 5 min | `Wait got longer` | `{station}: about {m} min now. Another station is faster.` |
| `geofence` | user enters 80m fence of the target | `You've arrived` | `Park near {station} to join the queue.` |
| `station_offline` | selected or saved station goes offline | `Station offline` | `{station} stopped reporting.` |
| `favourite_free` | any saved station becomes free | `Saved station is free` | `{station} has a free charger.` |
Rate limit: at most 1 toast per (type, station) per 60 seconds.

### 7.5 Favourites and compare
- Heart toggles instantly (optimistic). On failure revert and toast `Couldn't save. Try again.`
- Removing a favourite shows a toast with `Undo` for 5s.
- Compare list max 3; adding a 4th shows toast `You can compare up to 3 stations.`

### 7.6 Filtering
Filters apply on the client to the already-loaded stations (instant) and trigger a refetch only when the bounds change. The count on each chip updates live. Pins that do not match are hidden (not greyed) except the selected one.

## 8. MOTION RULES
| Moment | Animation | Duration / easing |
|---|---|---|
| Card open | scale .96→1, opacity 0→1 | 280ms `--ev-ease` |
| Panel collapse | x 0→-380 | 280ms `--ev-ease` |
| Dock active pill | framer `layoutId` slide | spring `{stiffness: 500, damping: 38}` |
| Chip toggle | background fill, scale .98 on press | 160ms |
| Pin select | scale 1→1.2 + pulse ring | 200ms + 1.6s loop |
| Wait number change | count-up | 400ms |
| Striped progress | background-position loop | 2s linear |
| Toast in/out | x 24→0 / 0→24, opacity | 280ms / 160ms |
| Route draw | polyline path reveals from origin | 700ms `--ev-ease` (animate by slicing the path array progressively) |
| Cars moving | position tween | 1000ms linear |
- Only ONE entrance moment on load: the dock and search pill fade/slide in once (200ms stagger 60ms). Do not add entrance animations to every card.
- Respect `prefers-reduced-motion`: no loops, no pulse, instant transitions.
- Hover micro-motion only on buttons (`translateY(-1px)`) and list items (background). Nothing else.

## 9. RESPONSIVE AND ACCESSIBILITY

### 9.1 Breakpoints
- `≥1024px` desktop layout (section 3.1)
- `640–1023px` tablet: dock = bottom pill, Nearby panel becomes a 320px left drawer (collapsed by default), station card = right-docked (not draggable)
- `<640px` mobile: section 3.2

### 9.2 Accessibility floor
- Every icon-only button has `aria-label`. Dock is `<nav aria-label="Primary">`.
- Pins are focusable (`tabIndex=0`, `role="button"`, `aria-label="{name}, {n} free, {wait}"`), Enter/Space selects.
- Keyboard: `/` or `⌘K` focus search, `Esc` closes card/popover, arrow keys move in the list, `F` toggles favourites of the selected station.
- Live regions: the Live chip and AlertStack use `aria-live="polite"`.
- Color is never the only signal: status pills always carry text (`Free`, `Busy`, `Full`).
- Contrast: body text ≥ 4.5:1. White on `--ev-accent` is 4.6:1 at ≥14px/600. Do not use accent text on `--ev-accent-soft` below 14px.
- Touch targets ≥ 44px.

## 10. CORE CODE (copy exactly, then extend)

### 10.1 `store.ts`
```ts
import { create } from 'zustand';
import type { Filters, LatLng, Station } from './types';

type DriverMapState = {
  selectedId: string | null;
  hoverId: string | null;
  panelOpen: boolean;
  sheetSnap: 'peek' | 'half' | 'full';
  filters: Filters;
  sort: 'closest' | 'wait' | 'price' | 'power';
  tab: 'all' | 'free' | 'saved';
  favourites: Set<string>;
  compare: string[];
  user: (LatLng & { heading?: number }) | null;
  routeTo: string | null;
  mapType: 'roadmap' | 'satellite';
  showHeat: boolean;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setFilters: (f: Partial<Filters>) => void;
  toggleFav: (id: string) => void;
  toggleCompare: (id: string) => void;
  setUser: (u: DriverMapState['user']) => void;
  startRoute: (id: string | null) => void;
};

export const useDriverMap = create<DriverMapState>((set, get) => ({
  selectedId: null, hoverId: null, panelOpen: true, sheetSnap: 'peek',
  filters: { freeNow: false, fast: false, connectors: [], maxPrice: null, favOnly: false, open24h: false },
  sort: 'closest', tab: 'all', favourites: new Set(), compare: [], user: null,
  routeTo: null, mapType: 'roadmap', showHeat: false,
  select: (id) => set({ selectedId: id, sheetSnap: id ? 'half' : 'peek' }),
  hover: (id) => set({ hoverId: id }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  toggleFav: (id) => { const s = new Set(get().favourites); s.has(id) ? s.delete(id) : s.add(id); set({ favourites: s }); },
  toggleCompare: (id) => {
    const c = get().compare;
    set({ compare: c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c });
  },
  setUser: (user) => set({ user }),
  startRoute: (routeTo) => set({ routeTo }),
}));
```

### 10.2 `hooks/useUserLocation.ts`
```ts
import { useEffect } from 'react';
import { useDriverMap } from '../store';

export function useUserLocation() {
  const setUser = useDriverMap((s) => s.setUser);
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setUser({ lat: p.coords.latitude, lng: p.coords.longitude, heading: p.coords.heading ?? undefined }),
      () => setUser(null),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [setUser]);
}
```

### 10.3 `components/MapCanvas.tsx` (map + clustering)
```tsx
'use client';
import { useMemo, useState, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import Supercluster from 'supercluster';
import { useDriverMap } from '../store';
import { StationPin } from './StationPin';
import { ClusterBubble } from './ClusterBubble';
import { UserMarker } from './UserMarker';
import { RouteLayer } from './RouteLayer';
import { DemoCarMarker } from './DemoCarMarker';
import { LIGHT_MAP_STYLE } from '../map-style';
import type { Station, DemoCar } from '../types';

type Props = { stations: Station[]; cars: DemoCar[]; onBoundsChange: (b: google.maps.LatLngBoundsLiteral, zoom: number) => void };

function Inner({ stations, cars, onBoundsChange }: Props) {
  const map = useMap();
  const [view, setView] = useState<{ bbox: [number, number, number, number]; zoom: number }>({ bbox: [-180, -85, 180, 85], zoom: 13 });
  const { selectedId, select, user, hover, routeTo } = useDriverMap();

  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string }, { free: number }>({
      radius: 60, maxZoom: 16, minPoints: 3,
      map: (p) => ({ free: 0 }), reduce: () => {},
    });
    sc.load(stations.map((s) => ({
      type: 'Feature' as const, properties: { id: s.id },
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
    })));
    return sc;
  }, [stations]);

  const byId = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const items = useMemo(() => index.getClusters(view.bbox, Math.round(view.zoom)), [index, view]);

  const handleIdle = useCallback(() => {
    const b = map?.getBounds(); const z = map?.getZoom();
    if (!b || z == null) return;
    const ne = b.getNorthEast(), sw = b.getSouthWest();
    setView({ bbox: [sw.lng(), sw.lat(), ne.lng(), ne.lat()], zoom: z });
    onBoundsChange({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() }, z);
  }, [map, onBoundsChange]);

  // attach idle listener once the map exists
  useMemo(() => { map?.addListener('idle', handleIdle); }, [map, handleIdle]);

  return (
    <>
      {items.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        if ((f.properties as any).cluster) {
          const count = (f.properties as any).point_count as number;
          return (
            <AdvancedMarker key={`c-${f.id}`} position={{ lat, lng }} zIndex={5}
              onClick={() => map?.fitBounds(clusterBounds(index, f.id as number), 80)}>
              <ClusterBubble count={count} />
            </AdvancedMarker>
          );
        }
        const s = byId.get((f.properties as any).id as string);
        if (!s) return null;
        return (
          <AdvancedMarker key={s.id} position={{ lat, lng }} zIndex={s.id === selectedId ? 100 : s.status === 'free' ? 20 : 10}
            onClick={() => select(s.id)}>
            <StationPin station={s} selected={s.id === selectedId} onHover={(h) => hover(h ? s.id : null)} />
          </AdvancedMarker>
        );
      })}
      {user && <AdvancedMarker position={user} zIndex={90}><UserMarker heading={user.heading} /></AdvancedMarker>}
      {cars.map((c) => <DemoCarMarker key={c.id} car={c} />)}
      {routeTo && <RouteLayer />}
    </>
  );
}

function clusterBounds(index: Supercluster, clusterId: number): google.maps.LatLngBoundsLiteral {
  const leaves = index.getLeaves(clusterId, Infinity);
  let n = -90, s = 90, e = -180, w = 180;
  for (const l of leaves) {
    const [lng, lat] = l.geometry.coordinates;
    n = Math.max(n, lat); s = Math.min(s, lat); e = Math.max(e, lng); w = Math.min(w, lng);
  }
  return { north: n, south: s, east: e, west: w };
}

export function MapCanvas(props: Props) {
  const mapType = useDriverMap((s) => s.mapType);
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}>
      <Map
        className="absolute inset-0"
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
        defaultCenter={{ lat: 19.076, lng: 72.8777 }} defaultZoom={13}
        mapTypeId={mapType} disableDefaultUI gestureHandling="greedy" clickableIcons={false}
        styles={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ? undefined : LIGHT_MAP_STYLE}
        onClick={() => useDriverMap.getState().select(null)}
      >
        <Inner {...props} />
      </Map>
    </APIProvider>
  );
}
```
Agent note: replace the `useMemo(() => map.addListener...)` line with a proper `useEffect` that adds the `idle` listener and returns a cleanup that removes it. `// DECISION:` comment if changed.

### 10.4 `components/StationPin.tsx`
```tsx
'use client';
import { Lightning } from '@phosphor-icons/react';
import type { Station } from '../types';

const COLOR = { free: 'var(--ev-free)', busy: 'var(--ev-busy)', full: 'var(--ev-full)', offline: 'var(--ev-offline)' } as const;

export function StationPin({ station, selected, onHover }: { station: Station; selected: boolean; onHover: (h: boolean) => void }) {
  const showBadge = station.status === 'free' || station.status === 'busy';
  return (
    <div role="button" tabIndex={0}
      aria-label={`${station.name}, ${station.freeChargers} free`}
      onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)}
      className="relative flex flex-col items-center transition-transform duration-200"
      style={{ transform: selected ? 'scale(1.2)' : undefined, transitionTimingFunction: 'var(--ev-ease)' }}>
      {selected && <span className="absolute -top-1 h-12 w-12 animate-ping rounded-full bg-ev-accent/30 motion-reduce:hidden" />}
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full shadow-pin"
        style={{ background: COLOR[station.status], border: `${selected ? 3 : 2}px solid ${selected ? 'var(--ev-accent)' : '#fff'}` }}>
        <Lightning weight="fill" size={20} color="#fff" />
        {showBadge && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 font-mono text-[11px] font-semibold text-ev-ink shadow-pin">
            {station.freeChargers}
          </span>
        )}
      </div>
      <div className="-mt-0.5 h-2 w-2 rotate-45" style={{ background: COLOR[station.status] }} />
    </div>
  );
}
```

### 10.5 `components/ClusterBubble.tsx`
```tsx
export function ClusterBubble({ count }: { count: number }) {
  const size = Math.min(64, Math.max(40, 28 + Math.log2(count) * 8));
  return (
    <div className="flex items-center justify-center rounded-full bg-white shadow-pin"
      style={{ width: size, height: size, border: '3px solid var(--ev-ink)' }}>
      <span className="font-mono text-sm font-semibold tabular-nums text-ev-ink">{count}</span>
    </div>
  );
}
```

### 10.6 `app/(driver)/map/page.tsx` (page shell)
```tsx
'use client';
import { useCallback, useState } from 'react';
import { MapCanvas } from '@/features/driver-map/components/MapCanvas';
import { Dock } from '@/features/driver-map/components/Dock';
import { SearchPill } from '@/features/driver-map/components/SearchPill';
import { FilterChips } from '@/features/driver-map/components/FilterChips';
import { NearbyPanel } from '@/features/driver-map/components/NearbyPanel';
import { StationCard } from '@/features/driver-map/components/StationCard';
import { MapControls } from '@/features/driver-map/components/MapControls';
import { LiveChip } from '@/features/driver-map/components/LiveChip';
import { AlertStack } from '@/features/driver-map/components/AlertStack';
import { CompareTray } from '@/features/driver-map/components/CompareTray';
import { BottomSheet } from '@/features/driver-map/components/BottomSheet';
import { useStations } from '@/features/driver-map/hooks/useStations';
import { useLiveStatus } from '@/features/driver-map/hooks/useLiveStatus';
import { useUserLocation } from '@/features/driver-map/hooks/useUserLocation';
import { useDriverMap } from '@/features/driver-map/store';
import { useMediaQuery } from '@/lib/useMediaQuery';

export default function DriverMapPage() {
  useUserLocation();
  const [bounds, setBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const { stations, isLoading } = useStations(bounds);
  const { cars, alerts, connection, updatedAgoSec } = useLiveStatus(bounds);
  const selectedId = useDriverMap((s) => s.selectedId);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const onBounds = useCallback((b: google.maps.LatLngBoundsLiteral) => setBounds(b), []);
  const selected = stations.find((s) => s.id === selectedId) ?? null;

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-ev-canvas text-ev-ink">
      <MapCanvas stations={stations} cars={cars} onBoundsChange={onBounds} />
      <Dock />
      <SearchPill stations={stations} />
      <FilterChips stations={stations} />
      <MapControls />
      <LiveChip connection={connection} updatedAgoSec={updatedAgoSec} freeNearby={stations.filter((s) => s.status === 'free').length} />
      <AlertStack alerts={alerts} />
      <CompareTray stations={stations} />
      {isDesktop ? (
        <>
          <NearbyPanel stations={stations} loading={isLoading} />
          {selected && <StationCard station={selected} />}
        </>
      ) : (
        <BottomSheet>
          {selected ? <StationCard station={selected} embedded /> : <NearbyPanel stations={stations} loading={isLoading} embedded />}
        </BottomSheet>
      )}
    </main>
  );
}
```
Create `lib/useMediaQuery.ts` (a standard `matchMedia` hook with `useSyncExternalStore`) if it does not exist.

---

_End of step 3._

---

# STEP 4 — DATA, BACKEND, AGENT PROMPTS, QA

## 11. TYPES (`features/driver-map/types.ts`)
```ts
export type LatLng = { lat: number; lng: number };
export type StationStatus = 'free' | 'busy' | 'full' | 'offline';
export type ChargerState = 'free' | 'charging' | 'reserved' | 'offline';
export type Connector = 'CCS2' | 'Type2' | 'CHAdeMO' | 'GBT';

export type Charger = {
  id: string; label: string; connector: Connector; powerKw: number; pricePerKwh: number;
  state: ChargerState; progressPct: number | null; minutesLeft: number | null;
};

export type Station = LatLng & {
  id: string; name: string; address: string; operator: string;
  status: StationStatus; freeChargers: number; totalChargers: number;
  waitMin: number | null;          // null when a charger is free
  queueAhead: number;
  distanceKm?: number; driveMin?: number;
  rating: number | null; ratingCount: number;
  open24h: boolean; minPrice: number; maxPowerKw: number; connectors: Connector[];
  photoUrl?: string; geofence: { radiusM: number };
  updatedAt: string;               // ISO
};

export type StationDetail = Station & {
  chargers: Charger[];
  forecast: number[];              // next 60 min, 12 points (predicted wait, min)
  confidence: 'high' | 'medium' | 'low';
  amenities: string[];
  photos: string[];
  hours: string;
};

export type DemoCar = { id: string; lat: number; lng: number; heading: number; targetStationId: string | null; mode: 'driving' | 'queueing' | 'charging' };

export type Filters = { freeNow: boolean; fast: boolean; connectors: Connector[]; maxPrice: number | null; favOnly: boolean; open24h: boolean };

export type AlertItem = {
  id: string; type: 'charger_freed' | 'wait_increased' | 'geofence' | 'station_offline' | 'favourite_free';
  stationId: string; title: string; body: string; at: string;
};

export type RouteResult = { path: LatLng[]; distanceKm: number; etaMin: number; waitOnArrivalMin: number | null; matchScore: number };
```

## 12. BACKEND CONTRACTS (build together with the UI, same step)

### 12.1 REST endpoints (Express, `apps/api`)
| Method + path | Purpose | Response | Cache |
|---|---|---|---|
| `GET /api/stations?bbox=w,s,e,n&zoom=` | stations in view (light fields only) | `Station[]` | Redis tile cache key `st:{zoom}:{geohash5}`, TTL 5s |
| `GET /api/stations/:id` | full detail + chargers + forecast | `StationDetail` | Redis 5s |
| `GET /api/stations/:id/photos` | Google Places photos proxy (max 5 URLs) | `string[]` | Redis 24h |
| `GET /api/stations/:id/reviews?cursor=` | reviews + histogram | `{histogram:number[5], items:Review[]}` | none |
| `POST /api/stations/:id/reviews` | add review (auth) | `Review` | none |
| `GET /api/search?q=&lat=&lng=` | stations + places autocomplete | `{stations:Station[], places:{id:string,label:string,lat:number,lng:number}[]}` | Redis 60s |
| `POST /api/route` | route + ETA + wait on arrival + match score | `RouteResult` | none |
| `GET /api/favourites` / `PUT` / `DELETE /api/favourites/:stationId` | favourites (auth) | `string[]` | none |
| `GET /api/recommend?lat=&lng=&vehicleId=` | top 3 stations ranked | `Station[]` with `matchScore` | Redis 15s |
All routes return JSON, validate input with `zod`, and respond with `{ error: { code, message } }` on failure.

### 12.2 SQL for the bbox query (PostGIS on Neon)
```sql
SELECT s.id, s.name, s.address, s.operator, ST_Y(s.geom) AS lat, ST_X(s.geom) AS lng,
       s.status, s.free_chargers, s.total_chargers, s.wait_min, s.queue_ahead,
       s.rating, s.rating_count, s.open_24h, s.min_price, s.max_power_kw, s.connectors,
       s.photo_url, s.geofence_radius_m, s.updated_at
FROM stations s
WHERE s.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
LIMIT 2000;
```
Create index once: `CREATE INDEX IF NOT EXISTS stations_geom_gix ON stations USING GIST (geom);`

### 12.3 Socket.io events
- Client → server: `area:subscribe` `{ bbox: [w,s,e,n] }` (re-send on pan, debounce 500ms), `area:unsubscribe`.
- Server → client: 
  - `station:update` `{ id, status, freeChargers, waitMin, queueAhead, chargers?: Charger[], updatedAt }` (batch max every 1s)
  - `cars:update` `DemoCar[]` (demo mode only, every 1s, only cars inside the subscribed bbox)
  - `alert` `AlertItem` (to the user's room only)
- Rooms: `area:{geohash4}` for map updates, `user:{id}` for alerts.

### 12.4 Wait-time rule (server, single source of truth)
```
if freeChargers > 0: waitMin = null (UI shows "-" per charger and "No wait" in the hero)
else: waitMin = ceil( (min(minutesLeft of all charging chargers) + queueAhead * avgSessionMin / totalChargers) )
confidence: high if sample >= 20 sessions in last 7d and data age < 30s; medium if >= 5; else low
```

### 12.5 Match score (0-100) for `recommend` and `RouteResult`
```
score = 100 - (etaMin * 1.2) - ((waitOnArrivalMin ?? 0) * 1.5) - (pricePerKwh * 0.6) + (connectorMatch ? 10 : -40) + (maxPowerKw >= 50 ? 5 : 0)
clamp to 0..100 and round. Labels: >= 80 "Great match", 60-79 "Good match", < 60 "Okay match".
```

### 12.6 Hooks
```ts
// hooks/useStations.ts
import { useQuery } from '@tanstack/react-query';
import { useDriverMap } from '../store';
import type { Station } from '../types';

export function useStations(bounds: google.maps.LatLngBoundsLiteral | null) {
  const filters = useDriverMap((s) => s.filters);
  const favs = useDriverMap((s) => s.favourites);
  const key = bounds ? [bounds.west, bounds.south, bounds.east, bounds.north].map((n) => n.toFixed(2)).join(',') : 'none';
  const q = useQuery({
    queryKey: ['stations', key],
    enabled: !!bounds,
    staleTime: 4000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Station[]> => {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stations?bbox=${key}`);
      if (!r.ok) throw new Error('stations');
      return r.json();
    },
  });
  const stations = (q.data ?? []).filter((s) =>
    (!filters.freeNow || s.status === 'free') &&
    (!filters.fast || s.maxPowerKw >= 50) &&
    (!filters.open24h || s.open24h) &&
    (!filters.favOnly || favs.has(s.id)) &&
    (filters.maxPrice == null || s.minPrice <= filters.maxPrice) &&
    (filters.connectors.length === 0 || filters.connectors.some((c) => s.connectors.includes(c))));
  return { stations, isLoading: q.isLoading };
}
```
`hooks/useLiveStatus.ts`: connect one `socket.io-client` instance (module singleton), emit `area:subscribe` when bounds change (debounced 500ms), merge `station:update` into the React Query cache with `queryClient.setQueriesData`, keep `cars`, `alerts` (max 3) and `connection` (`'live'|'reconnecting'|'offline'`) in local state, and compute `updatedAgoSec` with a 1s interval from the latest `updatedAt`.

## 13. PERFORMANCE RULES
- Map pins must render from cache in < 300ms: Redis tile cache + `Cache-Control: public, max-age=3, stale-while-revalidate=10` + Cloudflare in front.
- Send only light fields in the bbox list; fetch chargers/forecast only on select.
- Socket batching: coalesce updates into one emit per second per area.
- Client: never re-create the Supercluster index unless the stations array identity changes; memoize `StationPin` with `React.memo` and compare `status`, `freeChargers`, `selected`.
- Use `next/image` for photos with `sizes`; lazy-load the carousel images after the first.
- Lighthouse targets: LCP < 2.5s, CLS < 0.05, no layout shift when the card opens.

## 14. BUILD ORDER AND PROMPTS FOR THE ANTIGRAVITY AGENT
Give the agent ONE prompt at a time. Do not move on until the build passes and the check at the end of each prompt is true.

**Prompt 1 — Foundation.** `Read design.md sections 0-2 and 4. Install the packages from 1.3. Create tokens.css (2.1), add the Tailwind aliases (2.2), add Geist fonts to app/layout.tsx, create map-style.ts (4.2), types.ts (section 11), and ui-bits.tsx (section 5). Run the build. Check: build passes, a test page can render <Card><Pill tone="free">Free</Pill></Card> with correct colors.`

**Prompt 2 — Map shell.** `Read design.md sections 3, 4, 10. Create store.ts, hooks/useUserLocation.ts, components/MapCanvas.tsx, StationPin.tsx, ClusterBubble.tsx, UserMarker.tsx, and app/(driver)/map/page.tsx with only MapCanvas for now. Use mock stations from a local array of 30 Mumbai stations. Check: light map fills the screen, pins show colors and free badges, clusters appear when zoomed out, clicking a cluster zooms in, clicking a pin sets selectedId.`

**Prompt 3 — Panels.** `Read design.md sections 6.1 to 6.5 and 6.13. Create Dock, SearchPill, FilterChips, NearbyPanel, StationListItem, MapControls, Skeletons, EmptyStates. Wire filters and the sort and tabs to the store. Check: hovering a list item highlights its pin and vice versa, chips filter instantly, panel collapses and reopens, no top navbar.`

**Prompt 4 — Station card.** `Read design.md sections 6.6 to 6.9. Create StationCard (draggable), WaitHeroCard, ChargerRow, StartRouteCard, RouteLayer, hooks/useRoute.ts. Use mock detail data first. Check: card drags inside the viewport, tabs animate, striped progress animates, hero card is the only solid red card, Start draws a red route with numbered stops.`

**Prompt 5 — Live layer.** `Read design.md sections 6.10, 6.11, 6.12, 7, 12.3. Create LiveChip, AlertStack, CompareTray, hooks/useLiveStatus.ts and DemoCarMarker. Connect to the socket server. Check: wait number counts up when it changes, toasts appear with the rules in 7.4, compare modal works for 2-3 stations.`

**Prompt 6 — Backend.** `Read design.md sections 11, 12, 13. In apps/api create the endpoints in 12.1 with zod validation, the PostGIS query (12.2), Redis caching, the socket events (12.3), and the wait-time and match-score functions (12.4, 12.5). Seed 30 Mumbai stations with chargers. Check: GET /api/stations?bbox=... returns in under 100ms on a warm cache; socket emits station:update every second in demo mode.`

**Prompt 7 — Replace mocks.** `Replace every mock in the driver map with real API calls. Remove the local mock array. Handle loading, empty and error states from 6.15. Check: no console errors, network tab shows one bbox request per pan (debounced), pins appear from cache instantly on reload.`

**Prompt 8 — Mobile and polish.** `Read design.md sections 3.2, 6.14, 8, 9. Create BottomSheet with 3 snaps, move NearbyPanel and StationCard into it for widths under 1024px, add the bottom dock, add reduced-motion handling and aria labels. Check: at 390px wide the sheet snaps correctly, nothing overlaps, every icon button has an aria-label.`

## 15. ACCEPTANCE CHECKLIST (the agent must tick every item before finishing)
- [ ] Map fills the viewport; no top navbar; light map (not dark).
- [ ] Pins: 4 status colors, free-count badge, selected pulse, clusters with counts.
- [ ] Search pill with `⌘K`, recents, station and place results.
- [ ] Filter chips with live counts; disabled chips when 0 results.
- [ ] Nearby panel: sort, tabs, linked hover with pins, collapsible, "Updated Xs ago".
- [ ] Station card: draggable, photo carousel, rating, address copy, status row, wait hero card, 3 tabs, sticky `Save` and `Start`.
- [ ] Charger rows show `-` when free, `Done in n min` when charging, striped progress.
- [ ] Start flow: route line (white casing + red), numbered stops, ETA, match score ring, open in Google Maps.
- [ ] Live chip with connection states; alert toasts follow rules in 7.4 and rate limit.
- [ ] Compare tray (max 3) and compare modal.
- [ ] Favourites optimistic with Undo toast.
- [ ] Demo cars move without overlapping; wait time updates when a car heads to a station.
- [ ] Empty, loading, offline and location-denied states exist.
- [ ] Mobile: bottom sheet with 3 snaps and a floating bottom dock.
- [ ] Only one solid-red hero card on screen. No emoji, no ALL CAPS labels, sentence case copy.
- [ ] `prefers-reduced-motion` respected; keyboard and aria checks pass.
- [ ] `npm run build` passes; no TypeScript errors; no hardcoded hex in components.

## 16. COMMON MISTAKES TO AVOID
1. Re-creating Supercluster or re-rendering all pins on every socket tick (use memo and in-place cache updates).
2. Adding `addListener` inside render (use `useEffect` with cleanup).
3. Using red for the "full" status (red is the brand accent; full is grey).
4. Making the station card a separate page/route (it must be an overlay so the map never reloads).
5. Showing a number for wait when a charger is free (must be `No wait` / `-`).
6. Fetching chargers for every station in the list (fetch only on select).
7. Hardcoding the Google key in code (use `NEXT_PUBLIC_GOOGLE_MAPS_KEY` and restrict by HTTP referrer in Google Cloud).
8. Letting panels cover the map controls (respect the positions and z-index in section 3).

---

_End of design.md._
