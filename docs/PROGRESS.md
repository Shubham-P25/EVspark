# EVspark — Progress Tracker

## Phase 1 — Repo cleanup and tooling
- [x] T1.1 — Safety scan and progress file — commit 0532dbc — verified: docs/PROGRESS.md exists, secret scan reported
- [x] T1.2 — Remove junk and fix .gitignore — commit 4509185 — verified: git check-ignore returns nothing, configs tracked
- [x] T1.3 — Rename folders and fix path bugs — commit 839fea2 — verified: git grep -n "apps/models|MQTT-simulator" returns nothing
- [x] T1.4 — Move to pnpm + Turborepo — commit c5f02e4 — verified: pnpm -r exec node ok, turbo typecheck @evspark/shared passed
- [x] T1.5 — Make @evspark/shared the single source of truth — commit d245417 — verified: pnpm --filter @evspark/shared test, pnpm --filter api typecheck
- [x] T1.6 — Collapse duplicate web routes (preparation only) — commit 251c9e6 — verified: apps/web/ROUTES.md created

## Phase 2 — Infrastructure base
- [x] T2.1 — Docker Compose (local everything) — commit 76d1ce0 — verified: docker compose config validated successfully
- [x] T2.2 — Real Prisma migrations + connection setup — commit b24f666 — verified: prisma migrate status up to date
- [x] T2.3 — PostGIS spatial column and index — commit 665f1a2 — verified: EXPLAIN shows Index Scan using Station_location_gist
- [x] T2.4 — Redis client and health — commit 9ecdef9 — verified: checkRedisHealth reports component statuses, cache safe fallback verified
- [x] T2.5 — Structured logging (Pino) — commit c3fe77f — verified: git grep -n "console\." apps/api/src returns nothing, pino-http active
- [x] T2.6 — Central error handling — commit ca61872 — verified: standard error shape with code/message/requestId, async errors propagate
- [x] T2.7 — Sentry (api, web, ml) — commit c4e7fdd — verified: Sentry instrument loaded, no-op without DSN
- [x] T2.8 — CI and Dependabot — commit f39724a — verified: action-validator validated ci.yml successfully

## Phase 3 — Auth and security
- [x] T3.1 — Study Neon Auth — commit 33cb360 — verified: docs/ARCHITECTURE.md Auth notes recorded
- [x] T3.2 — API JWT middleware — commit 568c64b — verified: unit test with generated key pair, 401/403/200 matrix passed
- [x] T3.3 — Apply guards to routes — commit 94e73b6 — verified: /api/admin/users without token returns 401, driver token returns 403
- [x] T3.4 — Validation everywhere (Zod 4) — commit 0cafcd0 — verified: all routes return 400 on bad payload with flattened field issues
- [x] T3.5 — Hardening middleware — commit 8a4c55d — verified: CORS allowlist blocks unauthorized origins (403), 31st call to /recommend returns 429
- [x] T3.6 — Web auth wiring — deferred to T6.4 as specified in commands.md

## Phase 4 — Realtime and caching
- [x] T4.1 — Station list endpoints (fast path) — commit 609130e — verified: bbox query with PostGIS envelope and batch wait times returns < 100ms
- [x] T4.2 — Caching layer — commit 609130e — verified: rounded coordinates cache keys, Cache-Control public headers, x-cache header support
- [x] T4.3 — Recommend endpoint rewrite — commit fe162ab — verified: spatial search with PostGIS, arrival forecast, top 5 ranked with reasons
- [x] T4.4 — Socket.io rooms + batching — commit 9f16123 — verified: room isolation verified, 1s flush timer with stations:delta
- [x] T4.5 — Scheduled jobs — commit c69a926 — verified: hourlyRollup, retentionCleanup, forecastEvaluation, forecastRefresh executed cleanly
- [x] T4.6 — Forecast service client — commit c69a926 — verified: Redis caching (3600s), timeout fallback and DB persistence
- [x] T4.7 — Optional modules — commit c69a926 — verified: ENABLE_MQTT conditional wrap, mermaid event flow diagram in ARCHITECTURE.md

## Phase 5 — Twin engine and data
- [x] T5.1 — Schema additions — verified: migration 20260330000003 applied, Station, Session, QueueEntry, SimConfig updated, VehiclePing created
- [x] T5.2 — OCPP session mapping — verified: StartTransaction creates Session and updates waiting QueueEntry, MeterValues samples energy/SoC, StopTransaction calculates totals, promotes queue, invalidates cache and emits deltas
- [x] T5.3 — Telemetry endpoint for geofence wait time — verified: POST /api/telemetry/ping checks x-twin-key/JWT, validates body, stores VehiclePing, computes 200m geofence and adds to Redis set
- [x] T5.4 — Blended wait time — verified: computeBlendedWait implements hardware, queue, geofence, and 60/40 forecast blending with 8 passing unit tests
- [x] T5.5 — Station dataset import (L1) — verified: 51 verified Maharashtra stations (total 71 stations, 261 chargers) and 10 Indian vehicle profiles imported via scripts/seed/
- [x] T5.6 — Demand patterns (L2) — verified: scripts/seed/build-patterns.ts generated hourly-profile.json and duration-distribution.json
- [x] T5.7 — Twin engine — verified: scripts/twin-engine/ (config, profile, arrivals, vehicle, ocpp-client, faults, abandonment, index) boots and runs simulation loop across 71 stations
- [x] T5.8 — Admin sim controls API — verified: GET/PATCH /api/admin/sim-config endpoints return and update SimConfig with Zod validation
- [x] T5.9 — Retire the old simulator — verified: pnpm sim points to twin-engine, Dockerfile added, old simulator retired

## Phase 6 — Frontend rebuild
- [x] T6.1 — Install the template into apps/web — verified: added @tanstack/react-query, zustand, zod, @googlemaps/js-api-loader, @types/google.maps
- [x] T6.2 — Design tokens and shared UI rules — verified: globals.css dark obsidian tokens and glassmorphism, GlassCard, Button, Badge, Modal, Tabs, Slider, Skeleton, Toast primitives created
- [x] T6.3 — API client, query layer, sockets — verified: typed api.ts with JWT injection, socket.io singleton with tile subscriptions, queries.ts with TanStack hooks and live delta cache patching
- [x] T6.4 — Auth, onboarding, route protection — verified: auth-store with Zustand and dev mock fallback, Navbar with role switcher & battery indicator, login/register with OTP and vehicle choice, ProtectedRoute guard
- [x] T6.5 — Map module — verified: StationMap.tsx with Google Maps JS loader, dark obsidian theme, real-time wait time pins, surge pulse rings, tile subscriptions, and interactive fallback grid
- [x] T6.6 — Pages — verified: rebuilt Driver Map View (page.tsx) with search & filters, AI recommendation slide-up card & detail drawer; Route Planner (journey/page.tsx) with SoC timeline & waypoint summaries; Operator Dashboard (operator/page.tsx) with live KPIs, charger bay controls & session feed; Admin Twin Control Room (admin/page.tsx) with sim multipliers, surge triggers, emergency fault injection & forecast evaluation
- [x] T6.7 — Performance pass — verified: lazy loading with next/dynamic ssr:false for StationMap, mobile drawer pass, pnpm --filter web typecheck 0 errors, pnpm --filter web build 20 static pages compiled cleanly

## Phase 7 — ML service and tests
- [x] T7.1 — ML service structure and honest labelling — verified: FastAPI endpoints /predict/wait, /predict/batch, /health, /metrics, model.py with fallback, features.py with 10 features, and docs/ML_TRUTHFULNESS.md
- [x] T7.2 — Training pipeline — verified: train.py trained HistGradientBoostingRegressor on 6000 samples, MAE 0.22 min, MAPE 9.47%, R² 0.989, saved to models/wait_time_model.joblib and models/metrics.json
- [x] T7.3 — API tests (Vitest + Supertest) — verified: 6 test suites with 14 tests passing across auth, stations, queue, recommend, journeys, and admin guarded endpoints
- [x] T7.4 — Shared + ML tests — verified: 11 tests passing in packages/shared (wait-time, haversine, scoring, clamp, edge cases); 9 tests passing in pytest (features extraction, edge-case clamping, model prediction, heuristic fallback, batch prediction, health & metrics)
- [x] T7.5 — E2E smoke test and load test — verified: smoke.test.ts 6 steps passed, k6 script stations.js created, run-load.ts verified 0% errors, numbers documented in ARCHITECTURE.md

## Phase 8 — Documentation and deployment
- [x] T8.1 — README.md (root) — verified: comprehensive root README.md created with badges, architecture diagram, tech stack, quick start, env guide, tests, honest-data statement, and attribution
- [x] T8.2 — docs/DEPLOYMENT.md — verified: production deployment guide written covering Neon (pooled/direct, PostGIS, branches), Upstash Redis (cron queue driver), Render API (TRUST_PROXY=1, /readyz), ML container, Vercel web, Cloudflare CDN/caching/WebSockets, R2 backups & models, Sentry, UptimeRobot, GitHub secrets & rollback runbook
- [x] T8.3 — Final audit — verified: turbo run lint typecheck build test passed with 15/15 tasks clean; 0 console.log or TODOs in source; bundle verified with 20 static pages; FINAL_REPORT.md generated with measured numbers and checklists

## Phase F0 — Foundation (branch fe-0-foundation)
- [x] F0.1 Reproduce and record current errors — commit 317c8ee — verified: docs/FRONTEND_AUDIT.md created
- [x] F0.2 Swap template in as apps/web — commit c84ffa5 — verified: pnpm install && pnpm --filter web build
- [x] F0.3 Light-only theme and tokens — commit e3706e8 — verified: pnpm --filter web build
- [x] F0.4 Dependencies — commit f779bfa — verified: pnpm --filter web build
- [x] F0.5 API client, query layer, sockets — commit 6e5d8e2 — verified: typecheck

## Phase F1 — Auth and onboarding (branch fe-1-auth)
- [x] B1 Database additions — commit c2ebb2e — verified: pnpm --filter api test, pnpm --filter shared test
- [x] B2 API Clerk token verification and profile endpoints — commit b6a1414 — verified: pnpm --filter api test
- [x] F1.1 Clerk provider and middleware — commit cbfde1e — verified: pnpm --filter web build
- [x] F1.2 Login page — commit d8c3333 — verified: pnpm --filter web build
- [x] F1.3 Signup page — commit 0ffe9e2 — verified: pnpm --filter web build
- [x] F1.4 Shared auth layout — commit beff927 — verified: pnpm --filter web build
- [x] F1.5 Multi-step onboarding wizard — commit 5ce2b8a — verified: pnpm --filter web build
- [x] F1.6 Complete onboarding flow — commit 04fe79b — verified: pnpm --filter web build

## Phase F2 — Driver map (branch fe-2-map)
- [x] B3 Station detail enrichment, photo proxy, reviews, along-route — commit 3ada3b0 — verified: 6 tests in along-route.test.ts, 24 api tests, 11 shared tests
- [x] B4 Realtime session start end-estimate and tile delta room emit — commit d2d8dda — verified: socket emitChargerUpdate on station & tile rooms
- [x] F2.1 Driver map shell — commit cfeb5ab — verified: pnpm --filter web build
- [x] F2.2 Google map base with layers — commit cfeb5ab — verified: roadmap/satellite/terrain, traffic/transit/bicycling
- [x] F2.3 EV station markers and clustering — commit cfeb5ab — verified: supercluster, color ring, overload pulse
- [x] F2.4 Live user location — commit cfeb5ab — verified: heading cone, accuracy ring, locate button
- [x] F2.5 Station card — commit cfeb5ab — verified: photo carousel, rating stars, tabs, charger live bars
- [x] F2.6 Booking flow — commit cfeb5ab — verified: 15-min slots, conflict handling, ICS calendar download
- [x] F2.7 In-map directions and stations along route — commit cfeb5ab — verified: along-route query, range check, add stop
- [x] F2.8 Recommend best charger — commit cfeb5ab — verified: fuel recommendation button, top 5 ranked cards
- [x] F2.9 Home / Work places and favourites — commit cfeb5ab — verified: quick shortcuts, toggle heart
- [x] F2.10 Driver side panels — commit cfeb5ab — verified: history, bookings, vehicle, eco stats, settings
- [x] F2.11 Map extras — commit cfeb5ab — verified: compass, layers, chip bar, floating search
- [x] F2.12 Driver realtime and cleanup — commit cfeb5ab — verified: socket live delta patching, 0 type errors, clean build

## Phase F3 — Station operator dashboard (branch fe-3-station)
- [x] B5 Operator live endpoint and lively twin — commit d5c2704 — verified: 4 tests in operator-live.test.ts, 28 api tests passing
- [x] F3.1 Station layout and live data layer — commit 0d1c526 — verified: pnpm --filter web build
- [x] F3.2 Station overview with live money strip and feed — commit 0d1c526 — verified: pnpm --filter web build
- [x] F3.3 Charger card with filling animation — commit 0d1c526 — verified: battery vertical fill, ev-wave animation
- [x] F3.4 Analytics section, chargers, queue, pricing, reviews, alerts, settings — commit 0d1c526 — verified: 23 static pages compiled

## Phase F4 — Admin control room (branch fe-4-admin)
- [x] F4 Admin console — commit d7deba2 — verified: 31 static pages compiled, approvals queue, twin multipliers, forecast eval, health telemetry

## Phase F5 — Landing (branch fe-5-landing)
- [x] B6 Public stats — commit 9368436 — verified: 29 api tests passed
- [x] F5 New landing and classic landing — commit 9008596 — verified: 32 static pages compiled cleanly, pnpm --filter web build

## Phase F6 — Polish and cleanup (branch fe-6-polish)
- [x] F6 Polish, cleanup, docs — commit 92ef0c8 — verified: 0 dark classes in authored code, security headers & redirects, remotePatterns, README.md, .env.example, 32 static pages compiled cleanly
