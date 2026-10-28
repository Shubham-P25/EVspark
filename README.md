# EVspark ⚡
> Industrial-Grade Digital Twin Electric Vehicle Charging Network Platform for India

[![Turborepo](https://img.shields.io/badge/monorepo-turborepo-ef4444?style=flat-square)](https://turbo.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20Strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-000000?style=flat-square)](https://nextjs.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial%20GIST-336791?style=flat-square)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-Upstash%20PubSub-dc2626?style=flat-square)](https://redis.io/)
[![FastAPI](https://img.shields.io/badge/Python-FastAPI%20ML-009688?style=flat-square)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

## 📖 What EVspark Is

**EVspark** is an end-to-end, high-performance electric vehicle charging orchestration platform tailored to the Indian EV ecosystem (Mumbai, Pune, Bangalore, Delhi-NCR, and expressway corridors). It bridges the gap between drivers, station operators, and grid controllers through real-time telemetry, PostGIS spatial indexing, and honest ML-driven wait time forecasting.

### Key Capabilities
- **🗺️ Live Driver Map View (`/driver`)**: Google Maps interface with natural neutral light styling, PostGIS spatial queries, real-time charger bay statuses (Free, Busy, Faulted), supercluster clustering, live user location, along-route directions, AI Top 5 recommendations, and 15-min slot booking with ICS export.
- **⚡ Station Operator Console (`/station`)**: Real-time revenue & kWh counters ticking every second, animated vertical battery tanks (`ChargerCard`), virtual queue manager, and dedicated views for chargers, analytics, pricing, reviews, and alerts.
- **🎛️ Admin Control Room (`/admin`)**: Platform-wide overview, station approval queue, users directory, digital twin controls (speed & surge multipliers, fault injection), and ML forecast evaluation.
- **🌟 New Landing (`/`) & Classic View (`/classic`)**: High-converting light landing with live network metrics (B6), OCPP marquee, 3-step explainer, feature bento grid, and PM e-DRIVE policy context.
- **⚡ OCPP 1.6J Digital Twin Engine**: Continuous simulation engine emulating hundreds of real Indian EV models arriving, queuing, plugging in, transmitting `MeterValues`, and disconnecting. Supports `FOCUS_STATION_IDS` for targeted high-traffic simulation.
- **🛰️ Geofence & Virtual Queue**: Virtual queue reservation with automatic position tracking and 200-meter radius telemetry geofencing to blend physical arrivals into predictive wait algorithms.

---

## 🏛️ System Architecture

> [!IMPORTANT]
> **Core Architecture Note:**
> **Station data = own DB; Google = live layer only; OCM = import script.**
> - **Your Postgres (PostGIS)**: Ministry of Power import + OCM enrichment is the single source of truth for stations, chargers, connectors, price, and locations. Fast, single-query PostGIS bbox retrieval.
> - **Google Places API (New)** `evChargeOptions`: Server-side live availability layer only (`availableCount`, `count`, `outOfServiceCount`), cached in Redis for 90s with a strict daily cap (300 req/day).
> - **Open Charge Map**: Offline enrichment tool, not a runtime API.
> - **Twin Engine (OCPP)**: Real-time simulation layer for stations without Google live status.

```text
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
          │  socket.ts         emits compact deltas to tile rooms                                        │
          │  packages/shared   pinState(), tile math, zod schemas (used by API and web)                  │
          └───────┬─────────────────────────────┬─────────────────────────────┬──────────────────────────┘
                  ▼                             ▼                             ▼
         Postgres + PostGIS (Neon)          Redis (optional)           Google Places API (New)
         stations, chargers                 tile cache, daily cap      server key, field mask = evChargeOptions
                  ▲
                  └── Twin engine (OCPP) updates charger.status → API emits deltas
```

---

## 💻 Tech Stack Monorepo

| Layer | Technologies | Description |
|---|---|---|
| **Monorepo** | Turborepo, pnpm workspaces | Unified multi-package caching, scripts, and type checking |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript | Google Maps Neutral Light Theme, Geist & Plus Jakarta Sans, TailwindCSS, Phosphor Icons |
| **State & Data** | TanStack Query v5, Zustand | Reactive caching, delta cache patching, local auth state |
| **Maps** | `@googlemaps/js-api-loader`, Fallback Vector Grid | Dynamic Google Map styling with vector backup grid |
| **Backend API** | Node.js (>=22), Express, TypeScript strict | Structured Pino logging, Zod v4 validation, Central Error Handler |
| **Database & GIS**| PostgreSQL 16, PostGIS 3.4, Prisma | Spatial indexing (`GIST`), PostGIS envelope & radius queries |
| **Caching & PubSub**| Upstash Redis, Redis Pub/Sub, In-Memory Fallback | 15s bbox cache, 1000ms delta batching, rate limiting |
| **ML Service** | Python 3.11+, FastAPI, Scikit-learn, Joblib | 10-feature arrival/wait-time regressor with fallback curves |
| **Simulation** | Node.js OCPP 1.6J WebSocket client | Multi-station virtual vehicle arrival and charging lifecycle |
| **Testing** | Vitest, Supertest, Pytest, k6 | 30+ integration, unit, ML, and load test scripts |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js `>= 22.0.0`
- `pnpm` `>= 9.0.0` (Install via `npm install -g pnpm`)
- Docker & Docker Compose (for local Postgres + PostGIS)
- Python `>= 3.10` (for ML service)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Shubham-P25/EVspark.git
cd EVspark
pnpm install
```

### 2. Start Local Infrastructure
```bash
# Start PostGIS and Redis containers
docker compose up -d postgres redis
```

### 3. Run Database Migrations & Seeds
```bash
# Push database schema & PostGIS extensions
pnpm db:migrate

# Seed 71 verified Indian stations (261 chargers) and 10 Indian vehicle profiles
pnpm db:seed
```

### 4. Start Development Servers
```bash
# Starts Next.js Web (port 3000) and Express API (port 4000)
pnpm dev
```

### 5. Launch Digital Twin Simulator
```bash
# In a separate terminal, launch the real-time OCPP vehicle simulation loop
pnpm sim

# To simulate high-frequency arrivals (1–5 min) at specific stations:
FOCUS_STATION_IDS="station-id-1,station-id-2" pnpm sim
```

### 6. (Optional) Run ML Service
```bash
cd apps/ml-service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in `apps/web/` and `apps/api/`:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

| Variable | Scope | Description |
|---|---|---|
| `DATABASE_URL` | API | Neon PostgreSQL PostGIS connection string |
| `DIRECT_URL` | API | Direct connection string for Prisma migrations |
| `PORT` | API | Express API port (`4000`) |
| `NODE_ENV` | Global | Runtime environment (`development`, `production`, `test`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Web | Referrer-restricted browser key for Google Maps JS API |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Web | Vector Map ID (required for Advanced Markers) |
| `GOOGLE_PLACES_SERVER_KEY` | API | Server-side key restricted to Places API (New) |
| `GOOGLE_LIVE_DAILY_CAP` | API | Max Google Places live availability queries per day (default `300`) |
| `UPSTASH_REDIS_REST_URL` | API | Redis REST URL for live overlays and tile caching (optional) |
| `UPSTASH_REDIS_REST_TOKEN` | API | Redis REST token |
| `NEXT_PUBLIC_API_URL` | Web | Backend API URL (`http://localhost:4000`) |

---

## 🗺️ Google Cloud Key Setup Guide

To protect your quota and enable vector maps with Advanced Markers:

1. **Two Separate Keys**:
   - **Browser Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)**:
     - Restrictions: *HTTP referrers* (`http://localhost:3000/*`, `https://<your-domain>/*`).
     - APIs: *Maps JavaScript API* (+ *Routes API* if directions run client-side).
   - **Server Key (`GOOGLE_PLACES_SERVER_KEY`)**:
     - Restrictions: *IP addresses* (or API restriction to Places API (New) only).
     - APIs: *Places API (New)* only.
2. **Vector Map ID**:
   - Google Cloud Console → Google Maps Platform → **Map Management** → Create Map ID.
   - Choose **JavaScript**, select **Vector**, and copy the Map ID to `NEXT_PUBLIC_GOOGLE_MAP_ID`.
3. **Budget & Quotas**:
   - In Google Cloud Console, set a billing budget alert and request cap on Places API (New) to prevent unintended spend.
   - The EVspark backend enforces an automatic Redis daily cap (`GOOGLE_LIVE_DAILY_CAP=300`) and a 5-failure circuit breaker to safeguard your quota.

---

## 📁 Monorepo Structure

```
EVspark/
├── apps/
│   ├── api/                    # Express REST + WebSocket API server
│   │   ├── src/
│   │   │   ├── controllers/    # Route controllers (stations, recommend, queue, bookings, etc.)
│   │   │   ├── middleware/     # Auth, Zod validation, Rate limiting, CORS, Error handling
│   │   │   ├── ocpp/           # OCPP 1.6J WebSocket handler & session tracking
│   │   │   ├── repositories/   # PostGIS spatial queries & Prisma database queries
│   │   │   └── services/       # Cache, Redis, Forecast, and spatial helper services
│   │   └── tests/              # Supertest + Vitest integration tests
│   ├── web/                    # Next.js 15 App Router Frontend
│   │   ├── src/app/            # Driver view, Journey planner, Operator, Admin pages
│   │   ├── src/components/     # Obsidian design system, GlassCard, StationMap, Nav
│   │   └── src/lib/            # TanStack query layer, Socket.io client, auth store
│   └── ml-service/             # FastAPI Machine Learning Service
│       ├── features.py         # 10-feature arrival & wait time feature extraction
│       ├── model.py            # Model loader & physics-based heuristic fallback curve
│       ├── train.py            # Scikit-learn HistGradientBoosting training pipeline
│       └── tests/              # Pytest unit tests
├── packages/
│   └── shared/                 # Shared TypeScript types, schemas (Zod), and math utils
│       └── src/
│           ├── types.ts        # Common interfaces & Enums
│           ├── schemas/        # Shared Zod validation schemas
│           └── wait-time.ts    # Blended wait time & Haversine formulas
├── scripts/
│   ├── seed/                   # Maharashtra station & vehicle profile seed scripts
│   └── twin-engine/            # Autonomous OCPP digital twin simulator
├── tests/
│   ├── e2e/                    # Vitest / Playwright smoke test suites
│   └── load/                   # k6 and Node.js load benchmark scripts
└── docs/                       # Architectural docs, ML truthfulness, deployment guides
```

---

## 🧪 Testing & Verification

Run all test suites across the monorepo:

```bash
# Run all unit and integration tests across packages
pnpm test

# Run API integration test suite (Vitest + Supertest)
pnpm --filter api test

# Run E2E driver flow smoke test
pnpm test:e2e

# Run concurrent load test benchmark (50 concurrent VUs)
pnpm test:load

# Run Python ML test suite
cd apps/ml-service && pytest
```

---

## 🛡️ Honest Data Statement

> **Honesty & Integrity Policy:**
> - **Station Locations**: All initial station coordinates, operator designations, and plug specifications are imported from verified Ministry of Power and Maharashtra state public datasets.
> - **Charger State & Vehicle Activity**: All live charger statuses, vehicle sessions, power meter fluctuations, and queue lengths are realistically simulated in real time by the **EVspark Digital Twin Engine** via authentic OCPP 1.6J transactions.
> - **ML Model Truthfulness**: Wait-time predictions are honestly labelled. When a trained regressor artifact is present and beats baseline benchmarks, it reports `model_version: "wait_time_model_v1"`. When operating on mathematical queuing heuristics, it transparently reports `source: "fallback-curve"` without misleading users.

---

## 📄 License & Attribution

This project is licensed under the **MIT License**.

- UI design primitives inspired by Magic UI and TailwindCSS design tokens.
- Vector iconography provided by Phosphor Icons and Lucide Icons.
- Maps powered by Google Maps Platform JavaScript API with fallback vector rendering.
