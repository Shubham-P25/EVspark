# EVspark — Frontend Rebuild Manual (`frontend.md`)

> Audience: an autonomous coding agent (Gemini Flash class) inside the EVspark monorepo.
> Owner: pp. Scope: **frontend only** (`apps/web`) plus the small, listed backend additions the new UI needs (tasks starting with `B`).
> Authority: this file wins over `commands.md` Phase 6 for anything about the web app. All hard rules in `commands.md` section 0 still apply (no placeholders, no invented data, no secrets in code, one task at a time, stop-and-ask rules, never open generated/lock files, pnpm only). They are repeated in short in section 0 so you do not have to hunt for them.

---

## 0. HOW YOU MUST WORK

1. **One task at a time** (IDs like `F2.3`, `B4`). Never start the next task before the current one is verified.
2. Before editing, write a **plan of at most 5 lines**: files you touch, what changes, how you verify.
3. Read **only** the files the task names. Never open: `node_modules/`, `.next/`, `pnpm-lock.yaml`, `apps/api/src/generated/`, `codedump.txt`, `*.zip`, `apps/web-legacy/**` (except the single legacy files a task tells you to port).
4. After the change run the task's **Verify** commands. Max 3 fix attempts, then STOP and report.
5. If you have a browser tool: open the page, take a screenshot, and check it against the task's **Looks like** bullets. If you have no browser tool, say so and list what the user must eyeball.
6. Commit with the message given. Append one line to `docs/PROGRESS.md`: `- [x] F2.3 Station marker — commit abc1234 — verified: pnpm --filter web build`.
7. After the last task of a phase print a **Phase Report** (done / skipped and why / open risks) and **wait for the user to say "continue"**.

**Hard rules (short form)**
- No `// TODO`, no stubs, no fake returns. If you cannot finish, STOP and report.
- **No invented numbers.** Everything shown comes from the API/socket or is labelled **"Simulated data"**. The twin engine's output counts as simulated and must carry that label (one small badge per page is enough).
- **Light theme only. There is no dark mode anywhere.** No `dark:` classes, no theme toggle, no `<html class="dark">`.
- TypeScript strict; no `any` without a one-line reason; no `@ts-ignore`.
- Do not guess third-party APIs (Clerk, Google Maps, shadcn blocks, supercluster). Read the installed package's types/README or official docs first. If unclear, STOP and ask.
- Do not touch files a task does not mention. No drive-by refactors.
- Secrets live only in git-ignored `.env*` files. `.env.example` has empty values. Never print a key.
- Branch per phase: `fe-0-foundation`, `fe-1-auth`, `fe-2-map`, `fe-3-station`, `fe-4-admin`, `fe-5-landing`, `fe-6-polish`.

**STOP and ask the user (one question + your recommended default) when:** a key/ID is missing (Clerk, Google Maps, Cloudinary), a dashboard setting must be changed by a human (see "USER ACTION" boxes), a verify step fails 3 times, or two instructions conflict.

---

## 1. WHAT IS WRONG TODAY (audited from the 5 screenshots + the zip — do not re-derive)

| # | Symptom the user sees | Real cause in code | Fixed by |
|---|---|---|---|
| 1 | Everything dark, mixed light/dark, text barely readable (sidebar items almost invisible, operator cards show blank `Connector:` / `Power Output:` values) | `app/layout.tsx` forces `class="dark"`, `colorScheme:'dark'`, bg `#0B0F17`; `Navbar.tsx` toggles `dark` on `<html>`; light and dark tokens disagree, so sidebar text colour ≈ background. Charger cards read fields that do not exist on the API object (`connector`, `power`, `sessionsToday`) | F0.3, F3.3 |
| 2 | One navbar for Driver / Operator / Admin on every page, plus a "DRIVER" badge and "Sign In" button at once | `components/layout/Navbar.tsx` is mounted by `app/page.tsx`, `operator/page.tsx`, `journey/page.tsx`, `admin/page.tsx`; role switcher exists "for testing" | F0.2, F2.1 |
| 3 | Map is black, stations are plain circles with minutes, no live user location | `components/map/StationMap.tsx` uses a dark JSON style and circle `Marker` icons; `useGeolocation` exists but the page never shows a user dot | F2.2–F2.4 |
| 4 | Station card has an empty image area, dull fields, cannot be moved | Card is a fixed side panel with no photo source | F2.5 |
| 5 | Login = fake email + OTP; "validation errors"; Next overlay shows "1–2 Issues" | `(auth)/login` and `auth/login` call `setTimeout` and then `setAuth("token_driver_"+Date.now())` (no real auth). `lib/auth-store.ts` starts with a **mock dev driver user** read from `localStorage` at store creation → server/client HTML mismatch (hydration error). `lib/neon-auth.ts` has a **hardcoded fallback auth URL** (remove it). Onboarding completion is stored in `localStorage`, not the database. `Toggle.tsx`, `role-guard.tsx`, `auth-submit.tsx` use hooks without `"use client"`. `<html>` class changes on the client without `suppressHydrationWarning` | F0.1, F1.* |
| 6 | Operator data is static | `operator/page.tsx` falls back to constants (`\|\| 62`, `\|\| 14250`, fake queue list) and `lib/mock/operator-data.ts`; nothing ticks | F3.* |
| 7 | Admin looks like a prototype | Hand-rolled cards, no tables, no real sections | F4.* |
| 8 | Route Planner page "does nothing" | `journey/page.tsx` uses select boxes and the public OSRM demo server; result panel never fills | Replaced by in-map directions (F2.7). Delete `journey/` |
| 9 | Duplicate trees | `/auth` and `/(auth)`, `/operator` and `/dashboard/operator`, `/driver` and `/dashboard/driver`, Leaflet **and** Google Maps, three auth libs (`@stackframe/stack`, `next-auth`, `@neondatabase/auth`) | F0.2, F0.4 |

The API already provides: `GET /api/stations?bbox=…&zoom=…`, `GET /api/stations/nearby`, `GET /api/stations/:id`, `POST /api/recommend`, `POST /api/journeys/plan`, `GET|POST|DELETE /api/bookings`, `GET|POST|DELETE /api/favorites`, `POST /api/reviews`, `GET /api/vehicles`, `GET /api/me`, `GET /api/me/sessions`, `GET /api/me/stats`, operator routes (`/api/operator/stations`, `…/chargers/:id/status`, `…/analytics/revenue|heatmap|sessions`), admin routes (`/api/admin/overview|users|issues|stations/pending|sim-config|inject-fault|forecast-eval`). Socket events: `stations:delta`, `station:update`, `station:overload`, `booking:update`; rooms via `subscribe:tiles`, `subscribe:station`, `join:operator`, `join:admin`. Station list items already carry `waitMinutes`, `markerColor`, `isOverloaded`, `availableChargers`, `totalChargers`, `chargers[]`. Charger status enum: `FREE | BUSY | MAINTENANCE | FAULTED | OFFLINE`.

---

## 2. DECISIONS (already made — do not re-open)

| Topic | Decision | Why |
|---|---|---|
| Theme | **Light only**, Google-Maps-like neutral look. Tokens: text `#202124`, muted `#5F6368`, border `#DADCE0`, page bg `#F8F9FA`, surface `#FFFFFF`, action blue `#1A73E8`, available green `#1E8E3E`, busy amber `#F9AB00`, overloaded red `#D93025`, offline grey `#80868B`. Never neon yellow | user: "natural and professional like Google Maps" |
| Base template | `evspark-ui/` (arhamkhnz shadcn admin template, already in the zip) becomes `apps/web`. Legacy web moves to `apps/web-legacy` until ported, then is deleted | user wants templates, not hand-rolled UI |
| Icons | Phosphor for EVspark components; the template's own components may keep lucide (do not mass-replace) | earlier decision |
| Fonts | Geist (UI), Geist Mono (kW, ₹, minutes), Plus Jakarta Sans (landing headings) via `next/font` | earlier decision |
| Auth | **Clerk** (free plan covers 10,000 monthly active users): username + password, Google, GitHub. Replaces Neon Auth, `@stackframe/stack`, `next-auth` | user asked for username/password + 2 socials; Clerk supports all three out of the box, API already verifies JWTs through a JWKS URL so the backend change is small |
| Map | `@react-google-maps/api` (already installed) with the **default Google look (no JSON style, no mapId)**, custom HTML markers via `OverlayViewF`, clustering with `supercluster`. | Google treats JSON `styles` and `mapId` as mutually exclusive and `AdvancedMarker` needs a `mapId`; avoiding both keeps the real Google look and zero Cloud-Console setup |
| Map layers | Default / Satellite / Terrain + Traffic + Transit + Bicycling overlays + 2 optional style presets (Clean = POIs hidden, Silver). All light | user asked for layers/themes |
| Routing | Google `DirectionsService` (alternatives on). Remove OSRM and Leaflet | one map vendor |
| Station photos | Google Places photos **only fetched when a card opens**, via a small API proxy (B3); operator-uploaded Cloudinary photo wins if present; otherwise a neutral illustrated placeholder. Store only `googlePlaceId` permanently; never store photo bytes | Google's rules limit caching of Places content; check the current terms and pricing page before launch |
| Compass | Map stays north-up (rotation needs a vector `mapId`, which we avoid). The compass button = "recenter on me + show heading arrow" | consequence of the Map decision |
| Onboarding | Multi-step wizard, saved to the database once, completion stored in DB + Clerk `publicMetadata`; never `localStorage` | user spec |
| Email on signup | Not collected on the username form (per spec). Google/GitHub users have one. Tell the user in the Phase Report: without an email, password reset is impossible — suggest an optional email field in onboarding | honest trade-off |

---

## 3. TEMPLATES AND COMPONENT SOURCES (use these; do not hand-roll what they provide)

| Need | Source | Command / note |
|---|---|---|
| App shell, sidebar, tables, charts, date picker, drawers | `evspark-ui` (already in zip) | moved in F0.2 |
| Login / signup screens | shadcn blocks `login-02` and `signup-02` (two-column with image panel) | `pnpm dlx shadcn@latest add login-02 signup-02`. Open the generated files and confirm they are the two-column variant; if not, use `login-04` / `signup-04`. If the registry call fails, copy the layout by hand from the shadcn blocks page |
| Landing (new) | `redpangilinan/next-shadcn-landing` (MIT, Next.js + shadcn) | `npx degit redpangilinan/next-shadcn-landing tmp-landing` — read only `src/components` section files, port into `apps/web` |
| Landing (old) | existing `apps/web-legacy/src/components/landing/*` | restyle to light, mount at `/classic` |
| Number tickers, marquee, bento | Magic UI (MIT) | `pnpm dlx shadcn@latest add "https://magicui.design/r/number-ticker.json"` (same for `marquee`, `bento-grid`, `shimmer-button`) |
| Cluster math | `supercluster` (MIT) | `pnpm --filter web add supercluster && pnpm --filter web add -D @types/supercluster` |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` (template already has all three) | — |
| Drag | `motion` (framer-motion successor, already a dep) `drag` prop | — |
| Bottom sheet (mobile) | `vaul` via the template's `drawer.tsx` | — |
| Stepper | **No single verified template.** Build `components/onboarding/stepper.tsx` from shadcn `Progress` + `Form` (spec in F1.5) | — |

---

# PHASE F0 — Foundation (branch `fe-0-foundation`)

### F0.1 — Reproduce and record the current errors
1. `pnpm install` (root). `pnpm --filter web dev`. Open `/`, `/operator`, `/journey`, `/admin`, `/register` with the browser console and the Next overlay open.
2. Write every console error / overlay issue verbatim (file + line) into `docs/FRONTEND_AUDIT.md`. Expected: hydration mismatches (mock user from `localStorage`, `<html>` class), hooks without `"use client"` in `components/ui/Toggle.tsx`, `components/ui/role-guard.tsx`, `components/auth/auth-submit.tsx`, anything from Google Maps (missing key / `Loading` flicker).
3. Run `pnpm --filter web typecheck` and record failures there too. **Do not fix anything yet** — the files will be replaced.
**Commit:** `docs(web): record current frontend errors`.

### F0.2 — Swap the template in as `apps/web`
1. `git mv apps/web apps/web-legacy`. Remove `apps/web-legacy` from `pnpm-workspace.yaml` (it is reference-only; add `apps/web-legacy` to `.gitignore`'s build ignores and to `tsconfig` excludes only if it is ever re-added).
2. `git mv evspark-ui apps/web`. Remove `'evspark-ui'` from `pnpm-workspace.yaml`.
3. In `apps/web/package.json`: set `"name": "web"`; `"dev": "next dev -p 3000"`; **delete** the `prepare` (husky) script and the `husky`/`lint-staged` blocks; add `"typecheck": "tsc --noEmit"`; add dependency `"@evspark/shared": "workspace:*"`. Keep the template's Next/React versions.
4. Delete template demo routes you will not use: everything under `src/app/(main)/dashboard/` except `layout.tsx`, `_components/` and the folders you create later; delete `mail`, `chat`, `(legacy)`, `[...not-found]`, `src/app/(main)/auth/v1`; delete matching demo `data.*` files and unused `_components`. Keep `unauthorized`. Keep `(external)` (its landing is a candidate for F5).
5. Replace `APP_CONFIG` in `src/config/app-config.ts` with EVspark name/description.
**Verify:** `pnpm install && pnpm --filter web build` passes. **Commit:** `feat(web): adopt shadcn admin template as apps/web`.

### F0.3 — Light-only theme and tokens
1. In the preference defaults (`src/lib/preferences/preferences-config.ts`) set `theme_mode` to `"light"`; remove the theme switcher component from the header (`theme-switcher.tsx`) and its usages; remove any `next-themes` `ThemeProvider` toggling; set `<html lang="en" className="light" style={{colorScheme:'light'}} suppressHydrationWarning>` in `src/app/layout.tsx`. Remove the `dark` variant block usage in new code (the template's CSS may keep it; just never apply the class).
2. Add the colour tokens from section 2 into the theme CSS variables (primary = action blue, plus `--ev-available`, `--ev-busy`, `--ev-overload`, `--ev-offline`). Add a tiny `src/lib/tokens.ts` exporting the same hex values for map markers (CSS variables cannot be read inside map overlays reliably).
3. Fonts: Geist + Geist Mono + Plus Jakarta Sans in `layout.tsx`, exposed as CSS variables; body 16 px/1.6.
4. Numbers: `src/lib/format.ts` with `inr(n)` (`Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0})`), `mins(n)`, `km(n)`.
**Looks like:** white/very light grey surfaces everywhere, no black areas. **Verify:** build; grep `rg "dark:" apps/web/src --glob '!components/ui/**'` returns nothing in files you wrote. **Commit:** `feat(web): light-only theme and design tokens`.

### F0.4 — Dependencies
Run in `apps/web`: remove `@stackframe/stack next-auth @neondatabase/auth axios leaflet react-leaflet @types/leaflet`; add `@clerk/nextjs @react-google-maps/api @googlemaps/js-api-loader supercluster @tanstack/react-query socket.io-client @phosphor-icons/react @sentry/nextjs`; dev: `@types/supercluster @types/google.maps @next/bundle-analyzer`. Do not add `@googlemaps/markerclusterer` (it clusters `Marker` objects, not our HTML overlays).
**Verify:** `pnpm --filter web build`. **Commit:** `chore(web): dependency cleanup`.

### F0.5 — API client, query layer, sockets
Create `src/lib/api.ts` (fetch wrapper: base URL from `NEXT_PUBLIC_API_URL`; attaches the Clerk session token via a `getToken` function injected from a client provider; 10 s timeout; maps the API's standard error shape; no axios; no mock token). `src/lib/queries/` hooks: `useStationsInBbox`, `useStation`, `useRecommend`, `useBookings`, `useFavorites`, `useMyProfile`, `useOperatorLive`, `useAdminOverview`. `src/lib/socket.ts`: singleton, reuse the legacy `subscribeTiles/subscribeStation` logic from `apps/web-legacy/src/lib/socket.ts` but authenticate with the Clerk token and merge `stations:delta` into the Query cache. `src/hooks/use-now.ts`: `useNow(intervalMs = 1000)` returns `Date.now()` ticking (used for every live countdown). Types come from `@evspark/shared`.
**Verify:** typecheck. **Commit:** `feat(web): api client, query layer, realtime`.

---

# PHASE F1 — Auth and onboarding (branch `fe-1-auth`)

> **USER ACTION (stop and ask for it if keys are missing):** create a Clerk application (free plan). In the Clerk dashboard enable **Username** and **Password**, enable **Google** and **GitHub** social connections, and copy the publishable and secret keys into `apps/web/.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Add the same two to `.env.example` with empty values. Also add a session-token custom claim so the API can read the user's identity: read Clerk's docs page "Customize your session token" and add claims for `email`, `name`, `username` and `metadata` (the user's public metadata). Social sign-in (Google/GitHub) needs the Clerk-provided dev credentials in development; the user must add their own OAuth apps before production.

### B1 — Database additions (new Prisma migration `add_profile_fields`)
In `apps/api/prisma/schema.prisma` (then `pnpm --filter api db:migrate`):
- `User`: `username String? @unique`, `phone String?`, `onboardedAt DateTime?`.
- `DriverProfile`: `vehicleRegNo String?`, `batteryPct Float?`, `city String?`, `homeLabel String?`, `workLat Float?`, `workLng Float?`, `workLabel String?`, `maxWaitMin Int?`, `minKw Float?`.
- `OperatorProfile`: `gstin String?`, `contactName String?`.
- `Favorite`: `label String?` (values `HOME`, `WORK`, or null).
- `Station`: `googlePlaceId String?`, `photoUrl String?` (Cloudinary URL only), `phone String?`.
- `Session`: `estimatedEndTs DateTime?`.
Add the matching Zod schemas to `packages/shared/src/schemas/` (`onboarding.schema.ts`, discriminated on `role`, see F1.5 for the fields). **Verify:** `pnpm --filter api test`, `pnpm --filter shared test`. **Commit:** `feat(api): profile and onboarding fields`.

### B2 — API: Clerk token verification and profile endpoints
1. `apps/api/src/middleware/auth.ts` already verifies a JWT through a JWKS URL with `jose`. Add env vars `AUTH_JWKS_URL` and `AUTH_ISSUER` (fall back to the old `NEON_AUTH_*` names for one release), set them for Clerk (the JWKS URL and issuer come from the Clerk dashboard "API keys" page), and map claims: `sub → authId`, `email`, `name`, `username`, `metadata.role`. Keep the `ADMIN_EMAILS` rule for admins. A user can never self-assign `ADMIN`.
2. New routes in `me.routes.ts`: `GET /api/me/profile` (user + profile + `onboarded: boolean`), `PUT /api/me/onboarding` (validated with the shared schema; creates `DriverProfile` or `OperatorProfile`; for operators also creates the `Station` + chargers through the existing station creation logic with status `PENDING`, or `APPROVED` when env `AUTO_APPROVE_DEMO=true`; sets `onboardedAt`), `PUT /api/me/places` (home/work). All behind `requireAuth`; rate limited.
3. After a successful onboarding save, the **Next.js** side (F1.6) writes `role` and `onboardingComplete` into Clerk `publicMetadata`. The database remains the source of truth.
**Verify:** add Vitest tests for onboarding (driver ok, operator ok, role `ADMIN` rejected, missing field → 400). **Commit:** `feat(api): clerk jwt auth and onboarding endpoints`.

### F1.1 — Clerk provider and middleware
`ClerkProvider` in the root layout (light appearance, `variables.colorPrimary = #1A73E8`). `src/middleware.ts` using Clerk's middleware: public routes `/`, `/classic`, `/login(.*)`, `/register(.*)`, `/api/webhooks(.*)`; everything else requires sign-in. Role/onboarding redirects (read Clerk's docs "Add custom onboarding flow" for the session-claims pattern): signed-in + not onboarded → `/onboarding`; onboarded driver → `/driver`; operator → `/station`; admin → `/admin`; wrong role on a route → `/unauthorized`. Delete `lib/auth-store.ts`, `ProtectedRoute`, `role-guard`, the role switcher. Inject Clerk's `getToken` into `lib/api.ts` through a small client provider.
**Verify:** signed-out visit to `/driver` redirects to `/login`. **Commit:** `feat(web): clerk provider and route guards`.

### F1.2 — Login page (`/login`)
Based on the shadcn `login-02` block. Fields exactly: **username, password, "Log in" button**, then a divider "or continue with" and two buttons **Continue with Google** and **Continue with GitHub**. Link to `/register`. Use Clerk's custom-flow hooks (`useSignIn`) — read the docs for the installed version; show Clerk's error messages inline under the field (invalid username/password), disabled button + spinner while submitting, `aria-live` error region. Right panel: calm light image/illustration panel with a one-line value statement and a small "Simulated charging data" note. No OTP, no email field, no demo-role shortcuts.
**Looks like:** clean white card on light grey, blue primary button, Google/GitHub outline buttons with brand icons (`simple-icons` is already in the template).
**Verify:** wrong password shows an error; correct login lands on `/onboarding` or the role dashboard. **Commit:** `feat(web): login page`.

### F1.3 — Signup page (`/register`)
Based on `signup-02`. Fields exactly: **username, full name, password, "I am a" segmented control (EV Driver / Station Operator), "Sign up" button**, plus Google and GitHub. Validate with Zod (username 3–24 chars `[a-z0-9_]`, name 2–60, password ≥ 8 with a strength meter). The role is stored as `unsafeMetadata.role` at sign-up (Clerk custom flow) and re-validated server-side in B2. Social signups skip the role field, so onboarding step 1 asks for it when missing. After sign-up go to `/onboarding`.
**Verify:** duplicate username shows an error. **Commit:** `feat(web): signup page`.

### F1.4 — Auth layout polish
`(auth)/layout.tsx`: shared left brand panel (logo, tagline, three trust bullets), consistent spacing, mobile collapses to a single card. Remove `/auth/*` and `auth.css` from legacy. **Commit:** `feat(web): auth layout`.

### F1.5 — Onboarding wizard (`/onboarding`) — one-time, saved to the database
Components in `src/components/onboarding/`: `stepper.tsx`, `step-shell.tsx`, one file per step. **Progress bar** across the top: one segment per step; **completed = solid green with a check, current = blue with a ring, upcoming = grey**; below it the step title and "Step 2 of 5". Each step is its own `react-hook-form` + Zod form. **Next is disabled until the step is valid**; Back is always allowed; draft kept in `sessionStorage` so a refresh does not lose it; **nothing is written to the DB until the last step's "Finish"**, which calls `PUT /api/me/onboarding` once. If `GET /api/me/profile` says `onboarded:true`, redirect straight to the dashboard (this is how "next time direct login" works).

Driver steps (all mandatory unless marked optional):
1. **Role** (skipped if already chosen at signup; Admin is not selectable).
2. **About you:** full name (prefilled), mobile (Indian 10-digit, `^[6-9]\d{9}$`), city (select, India list).
3. **Your EV:** make and model from `GET /api/vehicles` (searchable combobox), registration number (`^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$`, upper-cased as typed), battery capacity (auto-filled from the model, read-only), current battery % slider, connector types (multi-select, at least one, pre-selected from the model's `connectors`), preferred charging (AC / DC fast / either). **No vehicle = no Next** ("You need an electric vehicle to use the driver app").
4. **Home and work:** Home required (Places Autocomplete restricted to India, plus "use my current location"), Work optional. Saved to `DriverProfile.homeLat/homeLng/homeLabel` and work fields.
5. **Preferences:** max acceptable wait (minutes), minimum charger power (kW), notification toggles. Then **Review** card and **Finish**.

Operator steps (all mandatory unless marked optional):
1. **Role.**
2. **Business:** business/CPO name, contact person, mobile, GSTIN (optional, 15-char regex when filled).
3. **Station:** station name, full address, location pin (map picker with a draggable marker + Autocomplete — must be set), city, photo (optional Cloudinary upload through a signed upload from the API).
4. **Chargers:** at least one row: label, connector type, power kW; "Add charger" button; shows how many chargers will be created.
5. **Pricing and hours:** ₹/kWh, open hours or 24/7, amenities (checkbox group). **Review** and **Finish**: explain "Your station will be reviewed before it goes live" unless `AUTO_APPROVE_DEMO`.

After Finish: success screen with a green check and "Go to dashboard" (role-based). **Verify:** driver cannot pass step 3 without a valid registration number; refreshing mid-wizard keeps values; second login skips the wizard. **Commit:** `feat(web): onboarding wizard`.

### F1.6 — Finish handler
`src/app/api/onboarding/complete/route.ts` (Next route handler): after the API call succeeds, call Clerk's backend client to set `publicMetadata = { role, onboardingComplete: true }`, then respond. Use only the documented Clerk backend API (read docs). **Commit:** `feat(web): mark onboarding complete in clerk`.

**Phase F1 report:** include the "no email → no password reset" note.

---

# PHASE F2 — Driver map (branch `fe-2-map`)

**Product shape:** `/driver` is **one full-screen map, no navbar, no top bar**. Everything floats on the map like Google Maps. Other driver sections (favourites, bookings, history, vehicle, eco) open as a **left side panel** over the map (URL `?panel=favorites`), not as separate pages with a nav.

```
┌───────────────────────────────────────────────────────────┐
│ [☰] [ Search stations, places…        ][Directions]       │  <- top-left card (400px)
│ (Home) (Work) (Available) (Fast DC) (CCS2) (Type 2) …     │  <- chip row (scrolls)
│                                                  ┌──────┐ │
│                                                  │ card │ │  <- draggable station card
│                                                  └──────┘ │
│ [layers]                                          [⛽ best]│  <- bottom-left layers, right stack:
│                                                   [🧭 me ]│     fuel, compass, +, -
└───────────────────────────────────────────────────────────┘
```

### B3 — Station detail data for the live card (API)
1. `GET /api/stations/:id` additionally returns: `chargers[]` each with `activeSession: { startTs, estimatedEndTs, socStart, socNow } | null`; `queueLength`; `amenities: string[]` (split the stored comma string); `hours`; `phone`; `photoUrl`; `googlePlaceId`; `ratingAvg`, `ratingCount`, `ratingBreakdown` (counts for 1–5).
2. `GET /api/stations/:id/reviews?cursor=` (paged, newest first, author display name only).
3. `GET /api/stations/:id/photos`: if `Station.googlePlaceId` is empty, resolve it once with Places API (New) text search using name + lat/lng and store the **place id only**; return up to 5 photo URLs from the Places Photos endpoint (key stays on the server, return our own proxy URLs `/api/stations/:id/photo/:i`); cache the list in Redis ≤ 24 h; respond with `{ photos: [], attributions: [] }` when nothing is found. Include author attributions in the payload. Read Google's current Places (New) docs before coding; do not store photo bytes.
4. `POST /api/stations/along-route` body `{ polyline: string (encoded), radiusM: 1..5000 default 2000, connector?, minKw?, limit<=40 }` → stations within `radiusM` of the route using PostGIS (`ST_DWithin` on the existing geography column against a line built from the encoded polyline with `ST_LineFromEncodedPolyline`), each with `distanceAlongRouteKm` (`ST_LineLocatePoint` × route length) and `detourKm` (distance to the line). Same enrichment as the list endpoint (wait, colour, chargers).
5. Rate-limit 4. and 3.; Zod on both.
**Verify:** Vitest for 4 (a station on the line is returned, one 10 km away is not). **Commit:** `feat(api): station detail enrichment, photos, along-route search`.

### B4 — Live ticking support
Make sure every charger update that starts or ends a session writes `Session.estimatedEndTs` (start + planned duration) and emits `charger:update` with `{ chargerId, stationId, status, activeSession }` into the `station:{id}` room and the tile rooms. Read `scripts/twin-engine/vehicle.ts` and `apps/api/src/lib/ocpp.ts` first; change only what is needed. **Commit:** `feat(api): estimated end time on sessions`.

### F2.1 — Page shell and floating UI frame
Create `src/app/(main)/driver/page.tsx` (client) and `src/components/driver/`:
`map-shell.tsx` (relative full-viewport container `h-dvh`), `search-card.tsx`, `chip-row.tsx`, `map-controls.tsx`, `side-panel.tsx`, `menu-drawer.tsx`. A route group layout for `/driver` with **no header/sidebar**. The ☰ opens `menu-drawer` (shadcn `Sheet`, left) with: profile header (name, username, vehicle), **Saved** (Favourites, Home, Work), Bookings, History, My vehicle, Eco impact, Settings, Sign out. A small "Simulated data" pill sits bottom-center above the Google attribution.
**Looks like:** Google Maps desktop: rounded-xl white cards with soft shadow, 16 px text, 44 px tap targets. **Verify:** no navbar markup in the DOM on `/driver`; mobile width 390 px shows search card full-width with chips below. **Commit:** `feat(web): driver map shell`.

### F2.2 — Map base (`components/map/ev-map.tsx`)
- `useJsApiLoader` once (libraries `['places','geometry']` as a module-level constant), key from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; if missing, render an explicit error card (not a blank map).
- Options: `disableDefaultUI: true`, `gestureHandling: 'greedy'`, `clickableIcons: false`, **no `styles`, no `mapId`**, `mapTypeId` from state. Default centre = user location, else Mumbai.
- `onIdle` (debounced 400 ms) → compute bbox + zoom → `useStationsInBbox` and `subscribeTiles`. Exactly one request per idle.
- `map-layers.tsx` (bottom-left button like Google's "Layers", opens a card with tiles): **Map type** Default / Satellite / Terrain; **Overlays** Traffic (`TrafficLayer`), Transit (`TransitLayer`), Bicycling (`BicyclingLayer`) toggles; **Style** Default / Clean (`styles` hiding `poi` and `transit` — only when the user picks it; remember this applies `styles` on the same map, which is fine because there is no `mapId`) / Silver. Persist choice in `localStorage` (wrapped in try/catch, SSR-safe).
- `map-controls.tsx` right stack: zoom in/out, **compass/locate** (recenters on the user, flies to zoom 15, rotates the user marker's heading arrow when `coords.heading` exists — the map itself stays north-up), **fuel button** (F2.8).
**Looks like:** the normal bright Google map with place labels. **Verify:** full tiles, switching Satellite/Terrain/Traffic works, no console errors. **Commit:** `feat(web): google map base with layers`.

### F2.3 — Station markers (`components/map/station-marker.tsx`, `cluster-layer.tsx`)
- `StationMarker` = `OverlayViewF` (`mapPaneName="overlayMouseTarget"`, centred with `getPixelPositionOffset`) rendering HTML: a **44 px round marker with a white border** — station photo thumbnail if `photoUrl` exists, otherwise a solid circle in the status colour — with a **white lightning-bolt badge** (Phosphor `Lightning` fill) at the lower right, a small downward tail like a Google pin, and a coloured ring from `markerColor` (green/amber/red/grey from `lib/tokens.ts`). Selected = scale 1.15 + shadow. At zoom ≥ 14 show a pill under the marker: `Free` or `12 min`. **Overloaded** (`isOverloaded`) = pulsing red ring (CSS keyframes, disabled under `prefers-reduced-motion`).
- `cluster-layer.tsx`: build a `supercluster` index from the bbox result (radius 60, maxZoom 15), recompute on idle/zoom. Cluster bubble = white circle with the count and a ring in the worst status colour; click zooms into the cluster. Never render more than ~300 overlays at once.
- Memoize markers (`React.memo`), key by station id; socket `stations:delta` updates colours/minutes without remounting.
**Looks like:** a Google-style "place" marker that clearly says "EV station" with the bolt. **Verify:** 200 stations pan smoothly; clicking a marker selects it. **Commit:** `feat(web): ev station markers and clustering`.

### F2.4 — Live user location (`components/map/user-location.tsx`)
`useGeolocation` (keep the watch, add `heading`). Render a Google-style **blue dot with white border, translucent accuracy circle and a heading cone**. Permission denied/unavailable → dismissible banner "Location is off — showing Mumbai. [Use my location] [Set on map]". First fix flies the map once, then never steals the camera again unless the user presses the locate button. Distances and ETAs everywhere use this position. **Commit:** `feat(web): live user location`.

### F2.5 — Station card (`components/driver/station-card.tsx`)
**Draggable on desktop:** wrapped in a `motion.div` with `drag`, `dragMomentum={false}`, `dragConstraints` = the map container ref, `dragElastic={0}`; drag handle = the header grip (Phosphor `DotsSixVertical`); a "Reset position" icon button; position kept for the session. **On screens < 768 px** render in the template's `Drawer` (vaul) with snap points (peek 30% / half / full) instead. Close with X or `Esc`.
Content, top to bottom:
1. **Photo carousel** (up to 5, `next/image`, from `GET /api/stations/:id/photos`; operator `photoUrl` first; placeholder illustration + brand initial when none; Google attribution text under photos when present). Street View button opens a dialog with `StreetViewPanorama` at the station.
2. Title row: station name, operator chip, **rating** (★ 4.5 · 128 reviews, from `ratingAvg/ratingCount`), **Open now / Closed** from `hours`, price **₹/kWh**.
3. Address with copy button, **live distance and drive ETA from the user** (Directions result, cached per station; fallback haversine labelled "approx").
4. **Predicted wait block (ticks every second):** big number with `useNow(1000)`:
   - If any compatible charger is free → shows **"–"** with caption "Charger free now".
   - Else → time until the earliest charger frees, computed as `max(0, estimatedEndTs − now)` shown as `mm:ss`, plus "+ N in queue" when `queueLength > 0`. It must visibly count down; when a `charger:update` arrives it re-bases.
5. Action row (icon buttons with labels): **Start** (computes route to the station, draws it, shows distance + ETA and "Open in Google Maps" link — see F2.7), **Directions**, **Save** (heart, `POST/DELETE /api/favorites`), **Book** (F2.6), **Share** (copy link `/driver?station=ID`), **Report issue** (`POST /api/issues`).
6. Tabs: **Chargers | Reviews | About**.
   - **Chargers:** one row per charger: label, connector icon + type (CCS2, Type 2, CHAdeMO…), power kW, ₹/kWh, status chip (Available green / Charging amber / Faulted red / Offline grey / Maintenance grey). Occupied rows show a slim progress bar (SoC from `socNow`, interpolated each second between socket updates) and the **ticking remaining time**; free rows show "–". Header summary "3 of 4 available".
   - **Reviews:** average, 5-bar breakdown, paged list, "Write a review" (stars + comment → `POST /api/reviews`, only when signed in).
   - **About:** facilities as icon chips (Wi-Fi, café, restroom, parking, 24/7, covered… from `amenities`), hours, phone (tel link), operator, "Report a problem".
**Looks like:** Google Maps place sheet: photo on top, bold name, stars, chips, tabs. **Verify:** drag works within the map and cannot be dragged off-screen; wait number changes every second; Chargers tab matches API data. **Commit:** `feat(web): station card`.

### F2.6 — Booking flow (`components/driver/booking-dialog.tsx`)
Click **Book** → `Dialog` (full-screen sheet on mobile) with a small form (RHF + Zod): vehicle (prefilled from profile, read-only chip), **charger** (only compatible with the vehicle's connectors; shows availability at the chosen time), **date** (today/tomorrow), **start time** (15-minute slots from now + 15 min), **duration** (30/45/60/90 min), mobile (prefilled), and an **estimated cost** line (`power × duration × ₹/kWh`, labelled "Estimate"). **Confirm** → `POST /api/bookings` → success state: animated green check, "Booking confirmed", summary (station, charger, time, booking id), buttons **Get directions**, **Add to calendar** (download a generated `.ics`), **Done**. Overlap → API 409 → inline message "That charger is already booked at this time". Add the booking to the Bookings panel immediately (cache update).
**Verify:** booking appears in `?panel=bookings`; double booking shows the error. **Commit:** `feat(web): booking flow`.

### F2.7 — Directions inside the map (`components/driver/directions-panel.tsx`)
The **Directions** button on the search card morphs it into Google's two-box layout: **Start** (default "Your location") and **Destination**, swap button, optional "Add stop", each with Places Autocomplete (`componentRestrictions: { country: 'in' }`). On submit: `DirectionsService` driving, `provideRouteAlternatives: true`; draw up to 3 routes (selected = `#1A73E8` 6 px, others grey; click a route to select). Route cards: duration, distance, "via …". Then:
- **Stations along this route:** encode the selected route's `overview_polyline`, call `POST /api/stations/along-route`, show the list under the route cards sorted by `distanceAlongRouteKm` with: name, status colour, wait (live), detour km/min, connector chips, and **Add as stop** (re-runs Directions with that station as a waypoint and updates distance/time). Markers for these stations are highlighted; others dim.
- **Range check:** with the profile's battery % and range, if the trip needs charging call `POST /api/journeys/plan` and show a banner "Charging stop recommended" with the planned stops.
- "Start" on a route shows the summary header (time, distance, arrival clock) and a "Open in Google Maps" deep link. Closing the panel clears routes.
- Share: copy URL `/driver?from=…&to=…`; the page restores directions from those params.
**Verify:** Pune → Mumbai shows 2–3 routes and stations near the selected route; adding a stop changes the time. **Commit:** `feat(web): in-map directions and stations along route`.

### F2.8 — Fuel button: best charger by waiting time
The ⛽ button (right stack) calls `POST /api/recommend` with the user position, vehicle connector, battery % and radius 15 km. Opens the left panel "Best chargers now": top 5 cards (rank, name, drive ETA, **predicted wait**, ₹/kWh, one-line reason from the API's score), highlights #1 on the map with a pulsing marker and fits bounds; clicking a card selects the station and opens the station card. Label: "Ranked by total time = drive + wait + charge". **Commit:** `feat(web): recommend best charger`.

### F2.9 — Home, Work and nearby favourites
- Search card chips **Home** and **Work**: if set, click flies to it and shows "Stations near Home" (radius 5 km, from `/api/stations/nearby`); if not set, opens a small dialog to search or click-to-set. Saved with `PUT /api/me/places`.
- Right after setting or changing Home/Work, show a dialog: "Add stations near Home to favourites?" listing the **3 nearest within 5 km** with checkboxes (all ticked) → Save posts `/api/favorites` for each with `label: 'HOME'` / `'WORK'` (extend the favourites endpoint and shared schema for the optional `label`).
- Favourites panel groups: **Near Home**, **Near Work**, **Other**; each row shows live wait and a remove button.
**Verify:** set Home, accept dialog, three favourites appear under "Near Home". **Commit:** `feat(web): home/work places and favourites`.

### F2.10 — Side panels (no pages)
`side-panel.tsx` hosts, selected by `?panel=`: `favorites`, `bookings` (upcoming/past, cancel via `DELETE /api/bookings/:id`), `history` (`/api/me/sessions`: date, station, kWh, ₹), `vehicle` (profile + battery), `eco` (CO₂ avoided = kWh × grid factor constant in `@evspark/shared` with a source comment; label "Estimate"), `settings`. Each has loading skeleton, empty state, error state. **Commit:** `feat(web): driver side panels`.

### F2.11 — More Google-Maps-style touches (do all; each is small)
Recent searches list in the search dropdown (localStorage, max 8); search box also filters stations by name/operator/connector and shows place results (Autocomplete) — selecting a place flies there and shows nearby stations; "Share my location" copy link; keyboard shortcuts (`/` focus search, `Esc` close card, `+`/`-` zoom); a "Measure distance" tool (click two points, shows km; optional, skip only if time is short); scale/units in km; the legend (green free / amber busy / red overloaded / grey offline) as a collapsible chip bottom-center. **Commit:** `feat(web): map extras`.

### F2.12 — Realtime and perf
`stations:delta` merges into the bbox cache; `charger:update` re-bases the open card's countdowns; unsubscribe tiles/stations on unmount. Lazy-load the map with `next/dynamic({ ssr:false })`. Remove all files of `apps/web-legacy` that belong to the driver map and the whole `journey` page once this phase is verified. **Verify:** Network tab shows no OSRM or Leaflet requests; `pnpm --filter web build`. **Commit:** `feat(web): driver realtime and cleanup`.

**Phase F2 report:** list which of the 12 user map requirements pass (use section 8's table).

---

# PHASE F3 — Station (operator) dashboard (branch `fe-3-station`)

Route: `/station` (formerly `/operator`). Uses the template's **sidebar layout** with a **clearly visible** sidebar (text `#202124` on white, active item blue pill, icons Phosphor). Sidebar items, all real routes: **Overview, Chargers, Queue & bookings, Analytics, Pricing & hours, Reviews, Alerts, Settings**. Header: station switcher (only if the operator owns several), live clock, **"Live · Simulated data"** badge, notifications bell, user menu.

### B5 — Operator live endpoint and lively twin
1. `GET /api/operator/stations/:id/live` (operator must own the station; admin allowed): returns `{ station, chargers: [{ id,label,connectorType,powerKw,status,activeSession:{ vehicleModel, regMasked, startTs, estimatedEndTs, socStart, socNow, kwNow, energyKwh, amountInr }|null }], queue: [...], kpis: { revenueToday, energyTodayKwh, sessionsToday, avgWaitMin, occupancyPct, uptimePct, tariff }, recentEvents: [{ ts, type, text }] }`. Registration numbers are masked (`MH12••4021`). Cache 2 s in Redis.
2. Emit `session:update` and `charger:update` to the `operator:{userId}` room on every start/finish.
3. **Make the demo feel real (twin engine):** read `scripts/twin-engine/config.ts` and `arrivals.ts`, then add env `FOCUS_STATION_IDS` (comma list; the operator's own station) with `FOCUS_ARRIVAL_MIN_SEC=60` and `FOCUS_ARRIVAL_MAX_SEC=300`: for focused stations a vehicle arrives at a **random interval between 1 and 5 minutes**, takes a free compatible charger (or joins the queue), charges 10–40 minutes (existing duration distribution), then frees. Non-focused stations keep the existing global behaviour. Document in `docs/` how to set the focus ids.
**Verify:** Vitest for the live endpoint (ownership, masking); run the twin for 6 minutes and confirm ≥ 1 new session on the focused station. **Commit:** `feat(api): operator live endpoint and focused twin arrivals`.

### F3.1 — Layout and data layer
`src/app/(main)/station/layout.tsx` (sidebar + header), `src/lib/queries/use-operator-live.ts` (`GET …/live`, `refetchInterval: 5000`, plus socket merge on `session:update`/`charger:update`; polling stays as fallback). **No fallback constants anywhere** (delete every `|| 62`, `|| 14250`, mock queue). Empty/error/loading states required. Delete `lib/mock/*`, `mockData.ts`, `stations-data.ts`, `driver.css`, `operator.css`.
**Commit:** `feat(web): station layout and live data layer`.

### F3.2 — Overview, top to bottom (this order is the user's spec)
1. **Station header** (first thing on the page): station name (large), address, status chip (Live / Pending approval), hours, rating, operator name, tariff ₹/kWh, and a "Simulated data" pill.
2. **Charger bays row** (F3.3): one animated card per charger.
3. **Live money strip:** `Revenue today` (₹, ticking), `Energy today` (kWh), `Sessions today`, `Occupancy` (ring gauge), `Avg wait`, `Uptime`. **Revenue and energy keep rising every second:** `revenueNow = revenueCompletedToday + Σ over active sessions (kWhSoFar × tariff)`, where `kWhSoFar` is interpolated each second from `kwNow` between server updates (`useNow(1000)`); re-base whenever a socket/poll update lands. Use Magic UI `number-ticker` (or the template's counter) for smooth changes; no jumps backwards.
4. **Live activity feed** (right column): newest first, animated insertion, items like "MH12••4021 · Tata Nexon EV plugged into Bay 2", "Session finished · 31 kWh · ₹596", "Bay 3 went offline". Source: `recentEvents` + socket. Shows a vehicle starting roughly every 1–5 minutes because of B5.
5. **Queue and incoming vehicles:** list with ETA countdowns, position, connector, and "call"/"remove" actions (existing queue routes).
6. Analytics block (F3.4).
**Looks like:** a Google-style clean ops dashboard: white cards, thin borders, colour only for status. **Verify:** leave the page open 5 minutes — revenue, kW, progress bars and feed visibly change; no static numbers. **Commit:** `feat(web): station overview`.

### F3.3 — Charger card with filling animation (`components/station/charger-card.tsx`)
Each bay is a card with an **SVG charger illustration** (wall unit with cable and plug) and a **vertical battery-style fill** that rises with the live SoC:
- **FREE:** outline only, "Available", connector + max kW, "Waiting for vehicle".
- **CHARGING (BUSY):** fill height = `socNow` (0–100), colour gradient amber→green as it rises, soft "charging" pulse; big **% number** (ticker), `kwNow` (± small live variation from the server value), `kWh delivered`, `₹ so far`, **time remaining** `mm:ss` from `estimatedEndTs`, vehicle model and masked reg no. SoC interpolates smoothly each second between server updates (CSS transition on `height`, 1 s linear).
- **COMPLETE (100%):** fill at 100 with a green check and a 3-second celebration pulse, then the card returns to FREE when the next update says so.
- **FAULTED / OFFLINE / MAINTENANCE:** hatched grey/red state with the reason, no fill.
Fix the old blank fields: the API fields are `label`, `connectorType`, `powerKw`, `status`, `activeSession` — never `connector`/`power`/`sessionsToday`. Action: **Put in maintenance / Bring online** with a confirm dialog (`PATCH /api/operator/chargers/:id/status`). Overloaded station → red highlight on the header and affected chargers (no emails).
Animations respect `prefers-reduced-motion` (no pulse, instant fill). **Verify:** a session on the focused station fills over minutes and completes. **Commit:** `feat(web): animated charger cards`.

### F3.4 — Analytics section (and `/station/analytics`): "from every angle"
Use the template's chart components (Recharts via shadcn `chart`) and its date-range picker (Today / 7 days / 30 days). All from the API; live ones append a point every 15 s.
1. KPI cards with sparklines and deltas vs previous period: revenue, energy, sessions, avg session duration, utilisation, avg wait.
2. **Revenue by hour** (bar) with **forecast overlay** from the existing forecast endpoints; tooltip shows ₹.
3. **Occupancy over time** (area, live).
4. **Sessions per hour** (bar) and **peak-hour heatmap** (7 × 24 grid from `/api/operator/analytics/heatmap`).
5. **Charger utilisation** (one horizontal bar per charger) and **connector mix** (donut).
6. **Wait and queue trend** (line).
7. **Session duration histogram** and **energy per session** distribution.
8. **Top vehicle models** (bar) and **new vs returning drivers** if the API has it; otherwise skip and say so (no invented data).
9. **Recent sessions table** (TanStack table: sort, filter by charger/status, export CSV).
10. **Reviews and issues summary** (average, latest 3, open issues count).
Also build the remaining pages: **Chargers** (table + actions), **Queue & bookings** (upcoming bookings from `booking:update`), **Pricing & hours** (`PATCH …/pricing`), **Reviews** (reply via `…/reviews/:id/reply`), **Alerts** (overload/fault list, red highlights), **Settings** (station details, Cloudinary photo upload). **Verify:** every chart renders with real data, empty state when none; build passes. **Commit per page:** `feat(web): station <page>`.

---

# PHASE F4 — Admin (branch `fe-4-admin`) — low priority, make it look professional

Template shell (sidebar + header), light only, route `/admin`. Pages: **Overview** (platform KPIs: stations, chargers online, sessions today, active drivers — from `GET /api/admin/overview`), **Approvals** (table of pending stations with approve/reject → `PATCH /api/admin/stations/:id/approval`), **Stations** (table + filters), **Users** (table, role filter, search), **Digital twin controls** (speed, arrival multiplier, surge stations, run/pause, inject fault — existing `sim-config` and `inject-fault`), **Forecast evaluation** (`forecast-eval`), **Issues**, **System health** (readyz/Redis/jobs). Anything without an endpoint (audit log, billing, roles editor) is shown as a real page with a **"Coming soon"** badge in the sidebar and an honest empty state — never fake rows. Delete the legacy admin pages. **Verify:** non-admin gets `/unauthorized`; tables paginate. **Commit:** `feat(web): admin console`.

---

# PHASE F5 — Landing (branch `fe-5-landing`)

Two candidates so the user can choose:
- **New (`/`)** from `redpangilinan/next-shadcn-landing` (MIT): `npx degit redpangilinan/next-shadcn-landing tmp-landing`, port its section components into `src/components/landing/`, then retheme to the EVspark light tokens, Plus Jakarta Sans headings, India context. Sections: hero (headline "Find a charger without the wait", sub-line, two CTAs: *Find chargers* → `/register`, *See how it works*; right side = looping muted product video or a live mini map card), OCPP-compatibility marquee (text only, no partner logos), problem, how it works (3 steps), feature bento (live wait time, smart recommendation, directions with stations on route, bookings, operator analytics), **live network metrics** (number tickers from B6, labelled "Simulated data"), forecasting explainer, charger fill animation teaser (reuse F3.3 card), role showcase tabs (Driver / Station / Admin with real screenshots), India pricing in ₹ and policy context (FAME II / PM e-DRIVE as context only), FAQ, final CTA, footer. Logged-in users see a "Go to dashboard" button instead of sign-up.
- **Classic (`/classic`)**: assemble the old landing from `apps/web-legacy/src/components/landing/*` on a light background (no dark sections), keep its content.
No invented numbers. Hero video optional via `NEXT_PUBLIC_HERO_VIDEO_URL` with a poster image, `preload="metadata"`, paused off-screen, poster only for reduced motion.

### B6 — `GET /api/public/stats` (API)
Cached 30 s: `{ stations, chargersOnline, sessionsToday, kWhToday, simulated: true }`. Public, rate-limited. **Commit:** `feat(api): public stats`.

**Verify:** both `/` and `/classic` render without console errors; Lighthouse mobile ≥ 85 on `/`. Report to the user: "Pick `/` or `/classic`; tell me which to delete." **Commit:** `feat(web): new landing and classic landing`.

---

# PHASE F6 — Polish and cleanup (branch `fe-6-polish`)

1. Delete `apps/web-legacy` (after the user approves), `evspark-ui` leftovers, unused deps (`rg` for imports first), unused template demo code.
2. Accessibility: visible focus rings, AA contrast, labels on all inputs/icon buttons, `aria-live` for toasts and errors, full keyboard path through search → card → book.
3. Performance: `ANALYZE=true pnpm --filter web build`; targets landing ≤ 180 kB first-load JS, driver ≤ 300 kB; lazy-load Maps, Recharts, Street View, globe/video; `next/image` with `remotePatterns` for Cloudinary and our photo proxy.
4. Sentry for web, security headers in `next.config.ts` (CSP report-only first).
5. Update `README.md` (routes, env vars, how to run the twin with `FOCUS_STATION_IDS`), `.env.example` (Clerk, Maps, Cloudinary keys, empty).
6. Final screenshot pass of every page at 1440 px and 390 px; list any requirement from section 8 that is not met.
**Commit:** `chore(web): polish, cleanup, docs`.

---

## 7. QUICK COMMANDS

```
pnpm install
pnpm --filter web dev            # http://localhost:3000
pnpm --filter api dev            # http://localhost:4000
pnpm --filter twin-engine dev    # simulated traffic (see FOCUS_STATION_IDS)
pnpm --filter web typecheck && pnpm --filter web build
pnpm --filter api db:migrate && pnpm --filter api test
rg "dark:" apps/web/src          # must show nothing in files you wrote
```

---

## 8. TRACEABILITY — every request from the user and where it is built

| User request | Task |
|---|---|
| All pages light theme, natural/professional like Google Maps | F0.3 |
| Use templates and cool UI components | Section 3, F0.2, F1.2–F1.3, F5 |
| Map 1 — not everything in one navbar; 13 — no navbar on driver dashboard | F0.2, F2.1 |
| Map 2 — map not black | F2.2 |
| Map 3 — Google-style station markers with electric icon (+ image) | F2.3 |
| Map 4 — moveable card | F2.5 |
| Map 5 — live user location | F2.4 |
| Map 6 — rich card: address, photo, continuously changing predicted time ("–" when free, remaining charge time when occupied), multiple chargers + types, favourites, Start with distance/ETA, reviews, facilities | B3, B4, F2.5 |
| Map 7 — compass and fuel buttons (best station by waiting time) | F2.2, F2.8 |
| Map 8 — booking button, small form, confirmation | F2.6 |
| Map 9 — directions inside the map, 2 places, stations on/near the route | B3 (along-route), F2.7 |
| Map 10 — remove the useless travelling nav section | F2.12 (delete `journey/`) |
| Map 11 — Home and Work, add nearby stations to favourites | F2.9 |
| Map 12 — more Google Maps options, layers, map themes | F2.2, F2.11 |
| Login 1–3 — professional login (username, password, Google, GitHub) and signup (username, name, password, role, Google, GitHub), Clerk allowed | F1.1–F1.3, B2 |
| Login 2 — fix validation errors found in the zip | F0.1, F1.1 |
| Login 4 — one-time multi-step form with green progress bar, saved to DB, mandatory vehicle/station fields | B1, B2, F1.5, F1.6 |
| Login 5 — use a template | Section 3 (shadcn login/signup blocks; stepper is custom) |
| Admin — looks like a professional admin console, can be incomplete | F4 |
| Landing — hooking new landing from a template, or keep the old | F5 |
| Operator 1 — sidebar options visible | F3 (layout), F0.3 |
| Operator 2 — live-changing data, not static | B5, F3.1, F3.2 |
| Operator 3 — station name at the top | F3.2 item 1 |
| Operator 4 — charger visuals that fill up to 100% | F3.3 |
| Operator 5 — rising prices, a vehicle starting every ~1–5 min | F3.2 item 3, B5 |
| Operator 6 — full analytics from every angle | F3.4 |

## 9. ACCEPTANCE (the user checks these by eye at the end)

- No dark area on any page; `/driver` has no navbar.
- Markers are photo/bolt pins, not circles; the card can be dragged; the wait number counts down.
- Directions between two typed places shows routes plus stations along them.
- First login → wizard with green progress; second login → straight to the dashboard.
- `/station` numbers, charger fills and the feed change on their own within a minute.
- `pnpm --filter web build` and `pnpm --filter api test` pass.

---

# 10. CODE LIBRARY — real code for the tasks above

> **Agent: when a task in sections F0–F5 names a file listed here, create that file with this code first, then adapt only imports/paths/types to the repo and run the task's Verify.** Do not rewrite the logic from scratch. Third-party calls (Clerk, Google Maps, supercluster) were written against their classic APIs — if the installed version differs, read its types and adjust the call, not the structure.

| Code block | Used by task |
|---|---|
| 10.1 tokens, format, use-now, live helpers | F0.3, F0.5, F2.5, F3.2 |
| 10.2 api client | F0.5 |
| 10.3 station marker, cluster layer | F2.3 |
| 10.4 ev-map (layers, idle bbox, user dot) | F2.2, F2.4 |
| 10.5 predicted wait + charger rows (station card) | F2.5 |
| 10.6 draggable card wrapper | F2.5 |
| 10.7 booking schema + dialog | F2.6 |
| 10.8 along-route SQL (API) + client call | B3, F2.7 |
| 10.9 stepper + onboarding schemas | F1.5 |
| 10.10 login form (Clerk) | F1.2 |
| 10.11 operator live hook + charger card | F3.2, F3.3 |
| 10.12 twin focus arrival helper | B5 |

## 10.1 `src/lib/tokens.ts`, `src/lib/format.ts`, `src/hooks/use-now.ts`, `src/lib/live.ts`

```ts
// src/lib/tokens.ts
export const COLORS = {
  text: "#202124", muted: "#5F6368", border: "#DADCE0", bg: "#F8F9FA", surface: "#FFFFFF",
  action: "#1A73E8", available: "#1E8E3E", busy: "#F9AB00", overload: "#D93025", offline: "#80868B",
} as const;

export type MarkerColor = "green" | "amber" | "red" | "grey";
export const MARKER_HEX: Record<MarkerColor, string> = {
  green: COLORS.available, amber: COLORS.busy, red: COLORS.overload, grey: COLORS.offline,
};
// API sends markerColor as "green" | "yellow" | "amber" | "red" | "grey"
export function toMarkerColor(v: string | undefined): MarkerColor {
  if (v === "green") return "green";
  if (v === "yellow" || v === "amber") return "amber";
  if (v === "red") return "red";
  return "grey";
}
export const COLOR_RANK: Record<MarkerColor, number> = { green: 0, amber: 1, red: 2, grey: 3 };
```

```ts
// src/lib/format.ts
const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const inr = (n: number) => inrFmt.format(Math.round(n));
export const num = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
export const km = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)} km`;
export const mins = (n: number) => `${Math.round(n)} min`;
export function mmss(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
```

```ts
// src/hooks/use-now.ts
"use client";
import { useEffect, useState } from "react";
/** Returns Date.now() re-evaluated every `intervalMs`. Every live countdown uses this. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

```ts
// src/lib/live.ts  — pure helpers, unit-test these with Vitest
export type ChargerStatus = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";
export interface ActiveSession {
  startTs: string; estimatedEndTs: string; socStart?: number | null; socNow?: number | null;
  kwNow?: number | null; energyKwh?: number | null; amountInr?: number | null;
  vehicleModel?: string | null; regMasked?: string | null;
}
export interface LiveCharger {
  id: string; label?: string | null; connectorType: string; powerKw: number;
  status: ChargerStatus; activeSession?: ActiveSession | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function remainingSec(c: LiveCharger, nowMs: number): number | null {
  if (!c.activeSession) return null;
  return Math.max(0, Math.round((Date.parse(c.activeSession.estimatedEndTs) - nowMs) / 1000));
}

export type StationWait =
  | { kind: "free" }
  | { kind: "wait"; seconds: number; queue: number }
  | { kind: "unavailable" };

/** "-" when any usable charger is free; otherwise time until the earliest charger frees. */
export function stationWait(chargers: LiveCharger[], queueLength: number, nowMs: number): StationWait {
  const usable = chargers.filter((c) => c.status === "FREE" || c.status === "BUSY");
  if (usable.length === 0) return { kind: "unavailable" };
  if (usable.some((c) => c.status === "FREE")) return { kind: "free" };
  const rem = usable.map((c) => remainingSec(c, nowMs)).filter((n): n is number => n !== null).sort((a, b) => a - b);
  if (rem.length === 0) return { kind: "unavailable" };
  return { kind: "wait", seconds: rem[0], queue: queueLength };
}

/** Smooth SoC between server updates: from socNow at `updatedAtMs` linearly to 100% at estimatedEndTs. */
export function liveSoc(s: ActiveSession, updatedAtMs: number, nowMs: number): number {
  const base = s.socNow ?? s.socStart ?? 0;
  const end = Date.parse(s.estimatedEndTs);
  const span = end - updatedAtMs;
  if (span <= 0) return 100;
  return clamp(base + (100 - base) * ((nowMs - updatedAtMs) / span), 0, 100);
}

/** kWh delivered so far, extrapolated from the last server value and current power. */
export function liveEnergyKwh(s: ActiveSession, updatedAtMs: number, nowMs: number): number {
  const base = s.energyKwh ?? 0;
  const kw = s.kwNow ?? 0;
  return base + (kw * Math.max(0, nowMs - updatedAtMs)) / 3_600_000;
}

/** Revenue that keeps rising every second: completed + active sessions extrapolated. */
export function liveRevenue(completedInr: number, sessions: ActiveSession[], tariff: number, updatedAtMs: number, nowMs: number) {
  const active = sessions.reduce((sum, s) => sum + liveEnergyKwh(s, updatedAtMs, nowMs) * tariff, 0);
  return completedInr + active;
}
```

## 10.2 `src/lib/api.ts`

```ts
// src/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter = async () => null;
/** Called once from a client provider: setTokenGetter(() => clerkGetToken()) */
export function setTokenGetter(fn: TokenGetter) { getToken = fn; }

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = await getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) { headers.set("Content-Type", "application/json"); body = JSON.stringify(init.json); }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, { ...init, headers, body, signal: ctrl.signal });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => undefined);
    if (!res.ok) {
      const msg = (data as { error?: { message?: string }; message?: string } | undefined);
      throw new ApiError(res.status, msg?.error?.message ?? msg?.message ?? `HTTP ${res.status}`, data);
    }
    return data as T;
  } finally { clearTimeout(timer); }
}
```

```tsx
// src/components/providers/auth-bridge.tsx
"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { setTokenGetter } from "@/lib/api";
export function AuthBridge() {
  const { getToken } = useAuth();
  useEffect(() => { setTokenGetter(() => getToken()); }, [getToken]);
  return null;
}
```

## 10.3 Station marker and clusters

```tsx
// src/components/map/station-marker.tsx
"use client";
import { memo } from "react";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { Lightning } from "@phosphor-icons/react";
import { MARKER_HEX, type MarkerColor } from "@/lib/tokens";

export interface MarkerStation {
  id: string; lat: number; lng: number; name: string; color: MarkerColor;
  photoUrl?: string | null; isOverloaded?: boolean; waitLabel?: string; // "Free" | "12 min"
}

function StationMarkerBase({ s, selected, showLabel, onSelect }: {
  s: MarkerStation; selected: boolean; showLabel: boolean; onSelect: (id: string) => void;
}) {
  const ring = MARKER_HEX[s.color];
  return (
    <OverlayViewF
      position={{ lat: s.lat, lng: s.lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
    >
      <button
        type="button"
        aria-label={`${s.name}, ${s.waitLabel ?? ""}`}
        onClick={() => onSelect(s.id)}
        className="group relative flex flex-col items-center outline-none"
        style={{ transform: selected ? "scale(1.15)" : undefined, transition: "transform .15s", zIndex: selected ? 10 : 1 }}
      >
        {s.isOverloaded && <span className="ev-pulse-ring" style={{ borderColor: ring }} />}
        <span
          className="relative block size-11 overflow-hidden rounded-full bg-white shadow-md"
          style={{ border: `3px solid ${ring}`, boxShadow: selected ? "0 4px 14px rgba(0,0,0,.35)" : "0 2px 6px rgba(0,0,0,.3)" }}
        >
          {s.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={s.photoUrl} alt="" className="size-full object-cover" loading="lazy" />
            : <span className="block size-full" style={{ background: ring }} />}
        </span>
        <span className="absolute -right-1 top-6 grid size-5 place-items-center rounded-full bg-white shadow" style={{ color: ring }}>
          <Lightning weight="fill" size={13} />
        </span>
        {/* pin tail */}
        <span className="-mt-[3px] size-2.5 rotate-45 bg-white" style={{ borderRight: `3px solid ${ring}`, borderBottom: `3px solid ${ring}` }} />
        {showLabel && s.waitLabel && (
          <span className="mt-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold shadow" style={{ color: ring }}>
            {s.waitLabel}
          </span>
        )}
      </button>
    </OverlayViewF>
  );
}
export const StationMarker = memo(StationMarkerBase);
```

```css
/* add to src/app/globals.css */
.ev-pulse-ring { position:absolute; top:-6px; left:50%; width:56px; height:56px; margin-left:-28px;
  border:3px solid; border-radius:9999px; animation: ev-pulse 1.6s ease-out infinite; pointer-events:none; }
@keyframes ev-pulse { 0%{transform:scale(.7);opacity:.9} 100%{transform:scale(1.35);opacity:0} }
@media (prefers-reduced-motion: reduce) { .ev-pulse-ring { animation:none; opacity:.6 } }
```

```tsx
// src/components/map/cluster-layer.tsx
"use client";
import { useMemo } from "react";
import Supercluster from "supercluster";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { COLOR_RANK, MARKER_HEX, type MarkerColor } from "@/lib/tokens";
import { StationMarker, type MarkerStation } from "./station-marker";

type P = { stationId: string; rank: number };
type C = { worst: number };
const RANKS: MarkerColor[] = ["green", "amber", "red", "grey"];

export function ClusterLayer({ stations, bounds, zoom, selectedId, onSelect, onClusterClick }: {
  stations: MarkerStation[];
  bounds: [number, number, number, number] | null; // west, south, east, north
  zoom: number; selectedId: string | null;
  onSelect: (id: string) => void;
  onClusterClick: (lat: number, lng: number, nextZoom: number) => void;
}) {
  const index = useMemo(() => {
    const idx = new Supercluster<P, C>({
      radius: 60, maxZoom: 15,
      map: (p) => ({ worst: p.rank }),
      reduce: (acc, p) => { acc.worst = Math.max(acc.worst, p.worst); },
    });
    idx.load(stations.map((s) => ({
      type: "Feature" as const,
      properties: { stationId: s.id, rank: COLOR_RANK[s.color] },
      geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
    })));
    return idx;
  }, [stations]);

  const byId = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const items = useMemo(() => (bounds ? index.getClusters(bounds, Math.round(zoom)).slice(0, 300) : []), [index, bounds, zoom]);

  return (
    <>
      {items.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties as Supercluster.ClusterProperties & Partial<P> & Partial<C>;
        if (props.cluster) {
          const color = MARKER_HEX[RANKS[props.worst ?? 0]];
          return (
            <OverlayViewF key={`c-${f.id}`} position={{ lat, lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}>
              <button type="button" aria-label={`${props.point_count} stations`}
                onClick={() => onClusterClick(lat, lng, Math.min(index.getClusterExpansionZoom(Number(f.id)), 18))}
                className="grid size-11 place-items-center rounded-full bg-white text-sm font-bold shadow-lg"
                style={{ border: `3px solid ${color}`, color: "#202124" }}>
                {props.point_count_abbreviated}
              </button>
            </OverlayViewF>
          );
        }
        const s = byId.get(props.stationId as string);
        return s ? <StationMarker key={s.id} s={s} selected={s.id === selectedId} showLabel={zoom >= 14} onSelect={onSelect} /> : null;
      })}
    </>
  );
}
```

## 10.4 `src/components/map/ev-map.tsx` and `user-location.tsx`

```tsx
// src/components/map/ev-map.tsx
"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GoogleMap, TrafficLayer, TransitLayer, BicyclingLayer, useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]; // module-level: never inline
export type MapTypeId = "roadmap" | "satellite" | "terrain";
export type StylePreset = "default" | "clean" | "silver";

const STYLES: Record<StylePreset, google.maps.MapTypeStyle[] | undefined> = {
  default: undefined,
  clean: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
  silver: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d6e2" }] },
  ],
};

export interface Viewport { bounds: [number, number, number, number]; zoom: number; center: { lat: number; lng: number } }
const MUMBAI = { lat: 19.076, lng: 72.8777 };

export function EvMap({ center, mapTypeId, stylePreset, traffic, transit, bicycling, onViewport, onMapReady, onMapClick, children }: {
  center?: { lat: number; lng: number }; mapTypeId: MapTypeId; stylePreset: StylePreset;
  traffic: boolean; transit: boolean; bicycling: boolean;
  onViewport: (v: Viewport) => void; onMapReady?: (m: google.maps.Map) => void;
  onMapClick?: (ll: google.maps.LatLngLiteral) => void; children?: ReactNode;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({ id: "evspark-gmaps", googleMapsApiKey: key ?? "", libraries: LIBRARIES });
  const mapRef = useRef<google.maps.Map | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opts] = useState<google.maps.MapOptions>({
    disableDefaultUI: true, gestureHandling: "greedy", clickableIcons: false, minZoom: 4, maxZoom: 20,
  });

  const emit = useCallback(() => {
    const m = mapRef.current; const b = m?.getBounds(); const c = m?.getCenter();
    if (!m || !b || !c) return;
    const sw = b.getSouthWest(), ne = b.getNorthEast();
    onViewport({ bounds: [sw.lng(), sw.lat(), ne.lng(), ne.lat()], zoom: m.getZoom() ?? 12, center: { lat: c.lat(), lng: c.lng() } });
  }, [onViewport]);

  const onIdle = useCallback(() => { // debounce 400 ms => one request per idle
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(emit, 400);
  }, [emit]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { mapRef.current?.setOptions({ styles: STYLES[stylePreset] }); }, [stylePreset]);

  if (!key) return <MapError text="NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Add it to apps/web/.env.local." />;
  if (loadError) return <MapError text="Google Maps failed to load. Check the API key, billing and allowed referrers." />;
  if (!isLoaded) return <div className="grid h-full place-items-center bg-[#F8F9FA] text-sm text-[#5F6368]">Loading map…</div>;

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={center ?? MUMBAI} zoom={12} mapTypeId={mapTypeId} options={opts}
      onLoad={(m) => { mapRef.current = m; m.setOptions({ styles: STYLES[stylePreset] }); onMapReady?.(m); }}
      onIdle={onIdle}
      onClick={(e) => e.latLng && onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
    >
      {traffic && <TrafficLayer />}
      {transit && <TransitLayer />}
      {bicycling && <BicyclingLayer />}
      {children}
    </GoogleMap>
  );
}
function MapError({ text }: { text: string }) {
  return <div className="grid h-full place-items-center bg-[#F8F9FA] p-6"><p className="max-w-sm rounded-xl bg-white p-4 text-sm shadow">{text}</p></div>;
}
```

```tsx
// src/components/map/user-location.tsx
"use client";
import { CircleF, OverlayViewF, OverlayView } from "@react-google-maps/api";
export interface Me { lat: number; lng: number; accuracy?: number; heading?: number | null }

export function UserLocation({ me }: { me: Me | null }) {
  if (!me) return null;
  return (
    <>
      {me.accuracy ? (
        <CircleF center={me} radius={Math.min(me.accuracy, 500)}
          options={{ strokeWeight: 0, fillColor: "#1A73E8", fillOpacity: 0.12, clickable: false }} />
      ) : null}
      <OverlayViewF position={me} mapPaneName={OverlayView.OVERLAY_LAYER}
        getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}>
        <div className="relative grid size-6 place-items-center">
          {typeof me.heading === "number" && (
            <span className="absolute size-12 rounded-full"
              style={{ background: "conic-gradient(from -25deg, rgba(26,115,232,.35) 0deg 50deg, transparent 50deg)", transform: `rotate(${me.heading}deg)` }} />
          )}
          <span className="relative size-4 rounded-full border-[3px] border-white bg-[#1A73E8] shadow-[0_0_0_1px_rgba(0,0,0,.2),0_2px_6px_rgba(0,0,0,.35)]" />
        </div>
      </OverlayViewF>
    </>
  );
}
```

```ts
// src/hooks/use-geolocation.ts  (replaces the legacy hook; adds heading + status)
"use client";
import { useEffect, useState } from "react";
import type { Me } from "@/components/map/user-location";
export type GeoStatus = "idle" | "ok" | "denied" | "unavailable";
export function useGeolocation() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  useEffect(() => {
    if (!("geolocation" in navigator)) { setStatus("unavailable"); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, heading: p.coords.heading }); setStatus("ok"); },
      (e) => setStatus(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);
  return { me, status };
}
```

## 10.5 Predicted wait + charger rows (inside the station card)

```tsx
// src/components/driver/predicted-wait.tsx
"use client";
import { useNow } from "@/hooks/use-now";
import { mmss } from "@/lib/format";
import { stationWait, type LiveCharger } from "@/lib/live";

export function PredictedWait({ chargers, queueLength }: { chargers: LiveCharger[]; queueLength: number }) {
  const now = useNow(1000); // re-renders every second => visibly counts down
  const w = stationWait(chargers, queueLength, now);
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#5F6368]">Predicted wait</p>
        <p className="font-mono text-3xl font-semibold tabular-nums text-[#202124]" aria-live="off">
          {w.kind === "free" ? "–" : w.kind === "wait" ? mmss(w.seconds) : "n/a"}
        </p>
      </div>
      <p className="max-w-[9rem] text-right text-xs text-[#5F6368]">
        {w.kind === "free" && "A charger is free right now"}
        {w.kind === "wait" && `Until the next charger frees${w.queue > 0 ? ` · ${w.queue} in queue` : ""}`}
        {w.kind === "unavailable" && "No charger in service"}
      </p>
    </div>
  );
}
```

```tsx
// src/components/driver/charger-row.tsx
"use client";
import { useNow } from "@/hooks/use-now";
import { mmss } from "@/lib/format";
import { liveSoc, remainingSec, type LiveCharger } from "@/lib/live";
import { inr } from "@/lib/format";

const STATUS: Record<LiveCharger["status"], { label: string; cls: string }> = {
  FREE: { label: "Available", cls: "bg-[#E6F4EA] text-[#1E8E3E]" },
  BUSY: { label: "Charging", cls: "bg-[#FEF7E0] text-[#B06000]" },
  FAULTED: { label: "Faulted", cls: "bg-[#FCE8E6] text-[#D93025]" },
  OFFLINE: { label: "Offline", cls: "bg-[#F1F3F4] text-[#5F6368]" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-[#F1F3F4] text-[#5F6368]" },
};

export function ChargerRow({ c, pricePerKwh, updatedAt }: { c: LiveCharger; pricePerKwh: number; updatedAt: number }) {
  const now = useNow(1000);
  const st = STATUS[c.status];
  const rem = remainingSec(c, now);
  const soc = c.activeSession ? liveSoc(c.activeSession, updatedAt, now) : null;
  return (
    <li className="rounded-xl border border-[#DADCE0] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#202124]">{c.label ?? "Charger"}</p>
          <p className="text-xs text-[#5F6368]">{c.connectorType} · <span className="font-mono">{c.powerKw} kW</span> · <span className="font-mono">{inr(pricePerKwh)}/kWh</span></p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {soc !== null ? (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8EAED]" role="progressbar" aria-valuenow={Math.round(soc)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-[#F9AB00]" style={{ width: `${soc}%`, transition: "width 1s linear" }} />
            </div>
            <span className="font-mono text-xs tabular-nums text-[#202124]">{Math.round(soc)}%</span>
            <span className="font-mono text-xs tabular-nums text-[#5F6368]">{rem !== null ? mmss(rem) : "–"}</span>
          </>
        ) : (
          <span className="font-mono text-sm text-[#5F6368]">–</span>
        )}
      </div>
    </li>
  );
}
```

`updatedAt` = the react-query `dataUpdatedAt` of the station query (pass it down), or the time the last `charger:update` socket message was merged.

## 10.6 `src/components/driver/draggable-card.tsx`

```tsx
"use client";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useDragControls } from "motion/react";
import { ArrowCounterClockwise, DotsSixVertical, X } from "@phosphor-icons/react";

/** Desktop: draggable inside `boundsRef`. Mobile (<768px): render <Drawer> instead (see F2.5). */
export function DraggableCard({ boundsRef, onClose, children }: {
  boundsRef: RefObject<HTMLElement | null>; onClose: () => void; children: ReactNode;
}) {
  const controls = useDragControls();
  const [key, setKey] = useState(0); // remount = reset position
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      key={key} ref={ref}
      drag dragControls={controls} dragListener={false} dragMomentum={false} dragElastic={0}
      dragConstraints={boundsRef}
      className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[400px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
    >
      <div className="flex cursor-grab touch-none items-center justify-between border-b border-[#DADCE0] px-2 py-1 active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}>
        <DotsSixVertical size={20} className="text-[#5F6368]" aria-hidden />
        <div className="flex items-center">
          <button aria-label="Reset card position" className="rounded-full p-1.5 hover:bg-[#F1F3F4]" onClick={() => setKey((k) => k + 1)}>
            <ArrowCounterClockwise size={18} />
          </button>
          <button aria-label="Close" className="rounded-full p-1.5 hover:bg-[#F1F3F4]" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </motion.div>
  );
}
```
Note: if the installed `motion` exports from `"motion/react"` use that; if the repo uses `framer-motion`, import from `"framer-motion"` instead — same API.

## 10.7 Booking: schema + dialog + `.ics`

```ts
// src/lib/booking.ts
import { z } from "zod";
export const bookingFormSchema = z.object({
  chargerId: z.string().min(1, "Choose a charger"),
  date: z.enum(["today", "tomorrow"]),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time"),
  durationMin: z.coerce.number().refine((n) => [30, 45, 60, 90].includes(n), "Choose a duration"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});
export type BookingForm = z.infer<typeof bookingFormSchema>;

export function slots(date: "today" | "tomorrow", nowMs = Date.now()): string[] {
  const out: string[] = [];
  const base = new Date(nowMs);
  const start = new Date(base);
  if (date === "tomorrow") { start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0); }
  else { start.setMinutes(Math.ceil((base.getMinutes() + 15) / 15) * 15, 0, 0); }
  const end = new Date(start); end.setHours(23, 45, 0, 0);
  for (let t = new Date(start); t <= end; t = new Date(t.getTime() + 15 * 60_000)) {
    out.push(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
  }
  return out;
}

export function toRange(f: BookingForm, nowMs = Date.now()) {
  const d = new Date(nowMs); if (f.date === "tomorrow") d.setDate(d.getDate() + 1);
  const [h, m] = f.start.split(":").map(Number); d.setHours(h, m, 0, 0);
  return { startTs: d.toISOString(), endTs: new Date(d.getTime() + f.durationMin * 60_000).toISOString() };
}

export function icsFile(title: string, location: string, startIso: string, endIso: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EVspark//EN", "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@evspark`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(startIso)}`, `DTEND:${f(endIso)}`, `SUMMARY:${title}`, `LOCATION:${location}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return new Blob([body], { type: "text/calendar" });
}
```

```tsx
// src/components/driver/booking-dialog.tsx
"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { bookingFormSchema, icsFile, slots, toRange, type BookingForm } from "@/lib/booking";
import { inr } from "@/lib/format";
import type { LiveCharger } from "@/lib/live";

const field = "h-10 w-full rounded-lg border border-[#DADCE0] bg-white px-3 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20";

export function BookingDialog({ open, onOpenChange, station, defaultPhone, vehicleLabel, vehicleConnectors }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  station: { id: string; name: string; address?: string | null; pricePerKwh: number; chargers: LiveCharger[] };
  defaultPhone?: string; vehicleLabel?: string; vehicleConnectors: string[];
}) {
  const qc = useQueryClient();
  const [done, setDone] = useState<{ id: string; startTs: string; endTs: string; chargerLabel: string } | null>(null);
  const compatible = useMemo(() => station.chargers.filter((c) =>
    (c.status === "FREE" || c.status === "BUSY") && (vehicleConnectors.length === 0 || vehicleConnectors.includes(c.connectorType))), [station.chargers, vehicleConnectors]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { chargerId: compatible[0]?.id ?? "", date: "today", durationMin: 45, phone: defaultPhone ?? "", start: "" },
  });
  const date = watch("date"); const dur = Number(watch("durationMin")); const chargerId = watch("chargerId");
  const kw = compatible.find((c) => c.id === chargerId)?.powerKw ?? 0;
  const estimate = kw * 0.7 * (dur / 60) * station.pricePerKwh; // 0.7 = average power factor; shown as "Estimate"

  const m = useMutation({
    mutationFn: (f: BookingForm) => api<{ id: string }>("/api/bookings", { method: "POST", json: { stationId: station.id, chargerId: f.chargerId, ...toRange(f) } })
      .then((b) => ({ b, f })),
    onSuccess: ({ b, f }) => {
      const r = toRange(f);
      setDone({ id: b.id, ...r, chargerLabel: compatible.find((c) => c.id === f.chargerId)?.label ?? "Charger" });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
  const serverError = m.error instanceof ApiError
    ? (m.error.status === 409 ? "That charger is already booked at this time. Pick another time or charger." : m.error.message) : m.error ? "Something went wrong. Try again." : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle weight="fill" size={56} className="text-[#1E8E3E]" />
            <DialogTitle>Booking confirmed</DialogTitle>
            <DialogDescription>{station.name} · {done.chargerLabel}<br />{new Date(done.startTs).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</DialogDescription>
            <p className="font-mono text-xs text-[#5F6368]">Booking ID {done.id}</p>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                const a = document.createElement("a"); a.href = URL.createObjectURL(icsFile(`Charging at ${station.name}`, station.address ?? station.name, done.startTs, done.endTs));
                a.download = "evspark-booking.ics"; a.click(); URL.revokeObjectURL(a.href);
              }}>Add to calendar</Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit((f) => m.mutate(f))} className="space-y-3" noValidate>
            <DialogHeader><DialogTitle>Book a charger</DialogTitle><DialogDescription>{station.name}</DialogDescription></DialogHeader>
            {vehicleLabel && <p className="rounded-lg bg-[#F1F3F4] px-3 py-2 text-sm">Vehicle: <b>{vehicleLabel}</b></p>}
            <label className="block text-sm font-medium">Charger
              <select className={field} {...register("chargerId")}>
                {compatible.length === 0 && <option value="">No compatible charger</option>}
                {compatible.map((c) => <option key={c.id} value={c.id}>{c.label ?? "Charger"} · {c.connectorType} · {c.powerKw} kW</option>)}
              </select>
              {errors.chargerId && <span className="text-xs text-[#D93025]">{errors.chargerId.message}</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Date
                <select className={field} {...register("date")}><option value="today">Today</option><option value="tomorrow">Tomorrow</option></select>
              </label>
              <label className="block text-sm font-medium">Start time
                <select className={field} {...register("start")}>
                  <option value="">Select</option>
                  {slots(date).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.start && <span className="text-xs text-[#D93025]">{errors.start.message}</span>}
              </label>
            </div>
            <label className="block text-sm font-medium">Duration
              <select className={field} {...register("durationMin")}>{[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}</select>
            </label>
            <label className="block text-sm font-medium">Mobile number
              <input className={field} inputMode="numeric" maxLength={10} {...register("phone")} />
              {errors.phone && <span className="text-xs text-[#D93025]">{errors.phone.message}</span>}
            </label>
            <p className="text-sm text-[#5F6368]">Estimated cost <b className="font-mono text-[#202124]">{inr(estimate)}</b> <span className="text-xs">(estimate)</span></p>
            {serverError && <p role="alert" className="rounded-lg bg-[#FCE8E6] px-3 py-2 text-sm text-[#D93025]">{serverError}</p>}
            <Button type="submit" className="w-full" disabled={m.isPending || compatible.length === 0}>{m.isPending ? "Booking…" : "Confirm booking"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

## 10.8 Stations along a route (API SQL + client)

```ts
// apps/api/src/repositories/along-route.repo.ts
import prisma from "../lib/prisma";

export interface AlongRouteRow { id: string; detourM: number; fraction: number; routeLengthM: number }

/** Stations within radiusM of an encoded polyline, ordered along the route. Needs PostGIS (already enabled). */
export async function findStationsAlongRoute(polyline: string, radiusM: number, limit: number): Promise<AlongRouteRow[]> {
  const rows = await prisma.$queryRaw<{ id: string; detour_m: number; fraction: number; route_len: number }[]>`
    WITH r AS (
      SELECT ST_SetSRID(ST_LineFromEncodedPolyline(${polyline}::text), 4326) AS geom
    )
    SELECT s.id,
           ST_Distance(s.location, r.geom::geography)            AS detour_m,
           ST_LineLocatePoint(r.geom, s.location::geometry)      AS fraction,
           ST_Length(r.geom::geography)                          AS route_len
    FROM "Station" s, r
    WHERE s.status = 'APPROVED'
      AND s.location IS NOT NULL
      AND ST_DWithin(s.location, r.geom::geography, ${radiusM})
    ORDER BY fraction ASC
    LIMIT ${limit}`;
  return rows.map((x) => ({ id: x.id, detourM: Number(x.detour_m), fraction: Number(x.fraction), routeLengthM: Number(x.route_len) }));
}
```

```ts
// packages/shared/src/schemas/along-route.schema.ts
import { z } from "zod";
export const alongRouteSchema = z.object({
  polyline: z.string().min(2).max(100_000),
  radiusM: z.coerce.number().min(100).max(5000).optional().default(2000),
  connector: z.string().max(50).optional(),
  minKw: z.coerce.number().min(0).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(40).optional().default(25),
}).strip();
```

Controller (add to `stations.controller.ts`, route `POST /api/stations/along-route` registered **before** `/:id`, with `validate({ body: alongRouteSchema })` and the rate limiter): call `findStationsAlongRoute`, load those stations with chargers, run them through the existing `attachBatchWaitTimes`, then add `distanceAlongRouteKm = fraction * routeLengthM / 1000` and `detourKm = detourM / 1000`, apply the optional `connector`/`minKw` filters in JS, and return the array in route order.

```ts
// src/lib/queries/along-route.ts (client)
import { api } from "@/lib/api";
export interface RouteStation {
  id: string; name: string; lat: number; lng: number; markerColor: string; waitMinutes: number;
  distanceAlongRouteKm: number; detourKm: number; chargers: { connectorType: string; powerKw: number }[];
}
export const stationsAlongRoute = (polyline: string, radiusM = 2000, connector?: string) =>
  api<RouteStation[]>("/api/stations/along-route", { method: "POST", json: { polyline, radiusM, connector } });
```

```tsx
// src/components/driver/use-directions.ts — Directions with alternatives + waypoint
"use client";
import { useCallback, useState } from "react";
export interface RouteOption { index: number; summary: string; distanceKm: number; durationMin: number; encoded: string; path: google.maps.LatLngLiteral[] }

export function useDirections() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useCallback(async (origin: google.maps.LatLngLiteral | string, destination: google.maps.LatLngLiteral | string, via?: google.maps.LatLngLiteral) => {
    setLoading(true); setError(null);
    try {
      const svc = new google.maps.DirectionsService();
      const res = await svc.route({
        origin, destination, travelMode: google.maps.TravelMode.DRIVING, provideRouteAlternatives: !via,
        waypoints: via ? [{ location: via, stopover: true }] : undefined, region: "in",
      });
      const opts = res.routes.slice(0, 3).map((r, i): RouteOption => {
        const legs = r.legs;
        return {
          index: i, summary: r.summary,
          distanceKm: legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0) / 1000,
          durationMin: legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0) / 60,
          encoded: typeof r.overview_polyline === "string" ? r.overview_polyline : (r.overview_polyline as unknown as { points: string }).points,
          path: r.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })),
        };
      });
      setRoutes(opts); setSelected(0);
    } catch { setError("No route found between these places."); setRoutes([]); }
    finally { setLoading(false); }
  }, []);

  return { routes, selected, setSelected, plan, clear: () => setRoutes([]), loading, error };
}
```
Draw each route with `<PolylineF path={r.path} options={{ strokeColor: i === selected ? "#1A73E8" : "#9AA0A6", strokeWeight: i === selected ? 6 : 4, zIndex: i === selected ? 2 : 1 }} onClick={() => setSelected(i)} />`; after `selected` changes call `stationsAlongRoute(routes[selected].encoded)` (React Query, key `["along", encoded]`).

## 10.9 Onboarding: stepper + schemas

```ts
// packages/shared/src/schemas/onboarding.schema.ts
import { z } from "zod";
const phone = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");
const place = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), label: z.string().min(2) });

export const driverOnboardingSchema = z.object({
  role: z.literal("DRIVER"),
  name: z.string().trim().min(2).max(60), phone, city: z.string().min(2),
  vehicleModelId: z.string().min(1, "Choose your vehicle"),
  vehicleRegNo: z.string().regex(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/, "Format like MH12AB1234"),
  batteryPct: z.number().min(0).max(100),
  connectors: z.array(z.string()).min(1, "Select at least one connector"),
  chargingPref: z.enum(["AC", "DC", "ANY"]),
  home: place, work: place.optional(),
  maxWaitMin: z.number().int().min(0).max(180), minKw: z.number().min(0).max(350),
}).strip();

export const operatorOnboardingSchema = z.object({
  role: z.literal("OPERATOR"),
  businessName: z.string().trim().min(2).max(120), contactName: z.string().trim().min(2).max(80), phone,
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Invalid GSTIN").optional().or(z.literal("").transform(() => undefined)),
  station: z.object({ name: z.string().trim().min(2).max(120), address: z.string().trim().min(5).max(255), city: z.string().min(2), lat: z.number(), lng: z.number(), photoUrl: z.string().url().optional() }),
  chargers: z.array(z.object({ label: z.string().trim().min(1).max(50), connectorType: z.string().min(1), powerKw: z.number().min(1).max(500) })).min(1, "Add at least one charger"),
  pricePerKwh: z.number().min(0).max(1000), hours: z.string().min(2).max(60), amenities: z.array(z.string()).max(12),
}).strip();

export const onboardingSchema = z.discriminatedUnion("role", [driverOnboardingSchema, operatorOnboardingSchema]);
export type OnboardingInput = z.infer<typeof onboardingSchema>;
```

```tsx
// src/components/onboarding/stepper.tsx
import { Check } from "@phosphor-icons/react";
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center gap-2">
        {steps.map((label, i) => {
          const done = i < current, active = i === current;
          return (
            <li key={label} className="flex flex-1 flex-col gap-2" aria-current={active ? "step" : undefined}>
              <div className={`h-1.5 rounded-full transition-colors ${done ? "bg-[#1E8E3E]" : active ? "bg-[#1A73E8]" : "bg-[#E8EAED]"}`} />
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${done ? "bg-[#1E8E3E] text-white" : active ? "bg-[#1A73E8] text-white ring-4 ring-[#1A73E8]/15" : "bg-[#E8EAED] text-[#5F6368]"}`}>
                  {done ? <Check size={12} weight="bold" /> : i + 1}
                </span>
                <span className={`hidden sm:inline ${active ? "font-semibold text-[#202124]" : "text-[#5F6368]"}`}>{label}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-[#5F6368]">Step {current + 1} of {steps.length}: <b className="text-[#202124]">{steps[current]}</b></p>
    </nav>
  );
}
```

```tsx
// src/components/onboarding/wizard.tsx — shell: validates each step with its own zod schema, saves ONCE at the end
"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { ZodTypeAny } from "zod";
import { Button } from "@/components/ui/button";
import { Stepper } from "./stepper";

export interface WizardStep<T> { title: string; schema: ZodTypeAny; render: (v: Partial<T>, set: (patch: Partial<T>) => void, errors: Record<string, string>) => ReactNode }

export function Wizard<T extends object>({ steps, storageKey, onFinish }: {
  steps: WizardStep<T>[]; storageKey: string; onFinish: (values: T) => Promise<void>;
}) {
  const [i, setI] = useState(0);
  const [values, setValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => { try { const s = sessionStorage.getItem(storageKey); if (s) setValues(JSON.parse(s)); } catch {} }, [storageKey]);
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(values)); } catch {} }, [values, storageKey]);

  const set = (patch: Partial<T>) => setValues((v) => ({ ...v, ...patch }));
  const next = async () => {
    const r = steps[i].schema.safeParse(values);
    if (!r.success) {
      const e: Record<string, string> = {};
      for (const issue of r.error.issues) e[issue.path.join(".")] ||= issue.message;
      setErrors(e); return;
    }
    setErrors({});
    if (i < steps.length - 1) { setI(i + 1); return; }
    setBusy(true); setFatal(null);
    try { await onFinish(values as T); sessionStorage.removeItem(storageKey); }
    catch (e) { setFatal(e instanceof Error ? e.message : "Could not save. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#DADCE0]">
      <Stepper steps={steps.map((s) => s.title)} current={i} />
      <div className="min-h-64">{steps[i].render(values, set, errors)}</div>
      {fatal && <p role="alert" className="rounded-lg bg-[#FCE8E6] px-3 py-2 text-sm text-[#D93025]">{fatal}</p>}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0 || busy}>Back</Button>
        <Button onClick={next} disabled={busy}>{busy ? "Saving…" : i === steps.length - 1 ? "Finish" : "Continue"}</Button>
      </div>
    </div>
  );
}
```
Per-step schemas: build them with `driverOnboardingSchema.pick({...})` / `operatorOnboardingSchema.pick({...})` (e.g. vehicle step = `pick({ vehicleModelId, vehicleRegNo, batteryPct, connectors, chargingPref })`). Step 3 of the driver therefore blocks Next until the vehicle fields are valid. Finish calls `api("/api/me/onboarding", { method:"PUT", json: values })`, then `fetch("/api/onboarding/complete", { method:"POST" })`, then `router.replace("/driver" | "/station")`.

## 10.10 Login form (Clerk custom flow)

```tsx
// src/app/(auth)/login/login-form.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({ username: z.string().min(3, "Enter your username"), password: z.string().min(1, "Enter your password") });

export function LoginForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const [err, setErr] = useState<{ username?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded) return;
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const p = schema.safeParse(data);
    if (!p.success) { const f = p.error.flatten().fieldErrors; setErr({ username: f.username?.[0], password: f.password?.[0] }); return; }
    setErr({}); setBusy(true);
    try {
      const res = await signIn.create({ identifier: p.data.username, password: p.data.password });
      if (res.status === "complete") { await setActive({ session: res.createdSessionId }); router.replace("/onboarding"); }
      else setErr({ form: "Extra verification is required for this account." });
    } catch (ex) {
      const msg = (ex as { errors?: { longMessage?: string; message: string }[] }).errors?.[0];
      setErr({ form: msg?.longMessage ?? msg?.message ?? "Could not sign in. Try again." });
    } finally { setBusy(false); }
  }

  const social = (strategy: "oauth_google" | "oauth_github") =>
    signIn?.authenticateWithRedirect({ strategy, redirectUrl: "/sso-callback", redirectUrlComplete: "/onboarding" });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5"><Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" aria-invalid={!!err.username} />
        {err.username && <p className="text-xs text-[#D93025]">{err.username}</p>}</div>
      <div className="space-y-1.5"><Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!err.password} />
        {err.password && <p className="text-xs text-[#D93025]">{err.password}</p>}</div>
      <div aria-live="polite">{err.form && <p className="rounded-lg bg-[#FCE8E6] px-3 py-2 text-sm text-[#D93025]">{err.form}</p>}</div>
      <Button type="submit" className="w-full" disabled={busy || !isLoaded}>{busy ? "Logging in…" : "Log in"}</Button>
      <div className="flex items-center gap-3 text-xs text-[#5F6368]"><span className="h-px flex-1 bg-[#DADCE0]" />or continue with<span className="h-px flex-1 bg-[#DADCE0]" /></div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={() => social("oauth_google")}>Google</Button>
        <Button type="button" variant="outline" onClick={() => social("oauth_github")}>GitHub</Button>
      </div>
    </form>
  );
}
```
Also create `src/app/sso-callback/page.tsx` rendering Clerk's `AuthenticateWithRedirectCallback` (from `@clerk/nextjs`). The signup form is the same pattern with `useSignUp`: `signUp.create({ username, password, firstName, lastName, unsafeMetadata: { role } })`, then `setActive`. If Clerk requires an email or verification for the instance, turn that requirement off in the Clerk dashboard (username + password only), or STOP and ask. If the installed `@clerk/nextjs` has a different `useSignIn` shape, read its types and adapt.

## 10.11 Operator: live hook, revenue ticker, animated charger card

```ts
// src/lib/queries/use-operator-live.ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LiveCharger } from "@/lib/live";

export interface OperatorLive {
  station: { id: string; name: string; address?: string | null; pricePerKwh: number; hours?: string | null; ratingAvg?: number | null; status: string };
  chargers: LiveCharger[];
  queue: { id: string; vehicleRef: string; connector: string; etaTs?: string | null }[];
  kpis: { revenueToday: number; energyTodayKwh: number; sessionsToday: number; avgWaitMin: number; occupancyPct: number; uptimePct: number; tariff: number };
  recentEvents: { ts: string; type: string; text: string }[];
}
export function useOperatorLive(stationId: string | undefined) {
  return useQuery({
    queryKey: ["operator-live", stationId],
    queryFn: () => api<OperatorLive>(`/api/operator/stations/${stationId}/live`),
    enabled: !!stationId, refetchInterval: 5000, refetchIntervalInBackground: false,
  });
}
// In the page: const { data, dataUpdatedAt } = useOperatorLive(id);  // dataUpdatedAt = updatedAt for live.ts helpers.
// Socket: on "session:update" / "charger:update" call queryClient.invalidateQueries({ queryKey: ["operator-live", id] }).
```

```tsx
// src/components/station/live-money.tsx — revenue/energy that keep rising every second
"use client";
import { useNow } from "@/hooks/use-now";
import { inr, num } from "@/lib/format";
import { liveEnergyKwh, liveRevenue, type LiveCharger } from "@/lib/live";

export function LiveMoney({ chargers, completedRevenue, completedKwh, tariff, updatedAt }: {
  chargers: LiveCharger[]; completedRevenue: number; completedKwh: number; tariff: number; updatedAt: number;
}) {
  const now = useNow(1000);
  const sessions = chargers.map((c) => c.activeSession).filter((s): s is NonNullable<typeof s> => !!s);
  const revenue = liveRevenue(completedRevenue, sessions, tariff, updatedAt, now);
  const kwh = completedKwh + sessions.reduce((a, s) => a + liveEnergyKwh(s, updatedAt, now), 0);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl bg-white p-4 ring-1 ring-[#DADCE0]"><p className="text-xs text-[#5F6368]">Revenue today</p>
        <p className="font-mono text-3xl font-semibold tabular-nums">{inr(revenue)}</p></div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-[#DADCE0]"><p className="text-xs text-[#5F6368]">Energy today</p>
        <p className="font-mono text-3xl font-semibold tabular-nums">{num(kwh, 1)} <span className="text-base text-[#5F6368]">kWh</span></p></div>
    </div>
  );
}
```
(`completedRevenue`/`completedKwh` = `kpis.revenueToday`/`kpis.energyTodayKwh` minus the active sessions' amounts as the API counted them — have B5 return both `completedRevenueToday` and `completedKwhToday` separately so the page does no subtraction.)

```tsx
// src/components/station/charger-card.tsx — the "fills up to 100%" charger
"use client";
import { Lightning, Plug, Warning } from "@phosphor-icons/react";
import { useNow } from "@/hooks/use-now";
import { inr, mmss, num } from "@/lib/format";
import { liveEnergyKwh, liveSoc, remainingSec, type LiveCharger } from "@/lib/live";

export function ChargerCard({ c, tariff, updatedAt, onToggleMaintenance }: {
  c: LiveCharger; tariff: number; updatedAt: number; onToggleMaintenance: (c: LiveCharger) => void;
}) {
  const now = useNow(1000);
  const s = c.activeSession;
  const charging = c.status === "BUSY" && !!s;
  const soc = charging ? liveSoc(s!, updatedAt, now) : 0;
  const complete = charging && soc >= 99.5;
  const down = c.status === "FAULTED" || c.status === "OFFLINE" || c.status === "MAINTENANCE";
  const kwh = charging ? liveEnergyKwh(s!, updatedAt, now) : 0;
  const rem = charging ? remainingSec(c, now) : null;
  const fill = complete ? "#1E8E3E" : `color-mix(in oklab, #F9AB00 ${100 - soc}%, #1E8E3E)`; // amber → green as it fills

  return (
    <div className={`rounded-2xl bg-white p-4 ring-1 ${down ? "ring-[#D93025]/30" : "ring-[#DADCE0]"}`}>
      <div className="flex items-center justify-between">
        <div><p className="font-semibold">{c.label ?? "Charger"}</p>
          <p className="text-xs text-[#5F6368]">{c.connectorType} · <span className="font-mono">{c.powerKw} kW</span></p></div>
        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: down ? "#FCE8E6" : charging ? "#FEF7E0" : "#E6F4EA", color: down ? "#D93025" : charging ? "#B06000" : "#1E8E3E" }}>
          {down ? c.status.toLowerCase() : complete ? "complete" : charging ? "charging" : "available"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {/* battery-style tank that fills from the bottom */}
        <div className="relative h-32 w-16 overflow-hidden rounded-xl border-2 border-[#9AA0A6] bg-[#F8F9FA]" role="img" aria-label={`State of charge ${Math.round(soc)} percent`}>
          <div className="absolute inset-x-0 bottom-0" style={{ height: `${soc}%`, background: fill, transition: "height 1s linear, background 1s linear" }}>
            {charging && !complete && <div className="ev-wave" />}
          </div>
          <div className="absolute inset-0 grid place-items-center">
            {down ? <Warning size={28} className="text-[#D93025]" weight="fill" />
              : charging ? <Lightning size={28} weight="fill" className={complete ? "text-white" : "text-[#202124]/70"} />
              : <Plug size={28} className="text-[#9AA0A6]" />}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          {charging ? (
            <>
              <p className="font-mono text-3xl font-semibold tabular-nums">{Math.round(soc)}%</p>
              <p className="truncate text-xs text-[#5F6368]">{s!.vehicleModel ?? "Vehicle"} · {s!.regMasked ?? ""}</p>
              <p className="font-mono text-xs tabular-nums">{num(s!.kwNow ?? 0, 1)} kW · {num(kwh, 1)} kWh · {inr(kwh * tariff)}</p>
              <p className="font-mono text-xs tabular-nums text-[#5F6368]">{complete ? "Charge complete" : `${rem !== null ? mmss(rem) : "–"} left`}</p>
            </>
          ) : (
            <p className="text-sm text-[#5F6368]">{down ? "Not in service" : "Waiting for a vehicle"}</p>
          )}
        </div>
      </div>

      <button className="mt-4 w-full rounded-lg border border-[#DADCE0] py-2 text-sm font-medium hover:bg-[#F8F9FA]" onClick={() => onToggleMaintenance(c)}>
        {c.status === "MAINTENANCE" ? "Bring online" : "Put in maintenance"}
      </button>
    </div>
  );
}
```

```css
/* add to src/app/globals.css */
.ev-wave { position:absolute; left:0; right:0; top:-6px; height:12px;
  background: radial-gradient(12px 6px at 50% 100%, rgba(255,255,255,.55) 98%, transparent) 0 0/24px 12px repeat-x;
  animation: ev-wave 1.4s linear infinite; }
@keyframes ev-wave { to { background-position-x: 24px } }
@media (prefers-reduced-motion: reduce) { .ev-wave { animation:none } }
```

## 10.12 Twin: focused arrival every 1–5 minutes

```ts
// scripts/twin-engine/focus.ts
const min = Number(process.env.FOCUS_ARRIVAL_MIN_SEC ?? 60) * 1000;
const max = Number(process.env.FOCUS_ARRIVAL_MAX_SEC ?? 300) * 1000;
export const focusIds = new Set((process.env.FOCUS_STATION_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
/** Random delay in [min, max] ms until the next vehicle arrives at a focused station. */
export const nextFocusDelayMs = () => Math.round(min + Math.random() * (max - min));

/* Wire-in (read arrivals.ts first and adapt names): for every id in focusIds start a loop
   const loop = async (id: string) => { for (;;) { await sleep(nextFocusDelayMs() / speedMultiplier); spawnVehicleAt(id); } }
   where spawnVehicleAt uses the same vehicle/charge-duration logic as the global arrivals, picks a free compatible
   charger (or joins the queue), writes Session.estimatedEndTs = start + duration, and emits the charger update.
   Stations in focusIds are excluded from the global random arrival picker so they do not get double traffic. */
```

---

## 11. WHAT IS NOT CODED HERE (agent writes these following the specs above, using the code library as the pattern)
Station card tabs UI (Chargers/Reviews/About), directions panel UI, side panels, favourites/home/work dialogs, driver menu drawer, onboarding step bodies, signup form, landing sections, admin pages, operator analytics charts, queue/pricing/reviews pages. Each has its spec in F2–F5; reuse `useNow`, `live.ts`, the tokens, `api()` and the shadcn components from the template.
