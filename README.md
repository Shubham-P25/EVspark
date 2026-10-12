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

```mermaid
flowchart TB
    subgraph Clients["Frontend Clients (Next.js 15)"]
        Driver["Driver Map View<br/>(/page.tsx)"]
        Planner["Route Journey Planner<br/>(/journey)"]
        Operator["Operator Dashboard<br/>(/operator)"]
        Admin["Twin Control Room<br/>(/admin)"]
    end

    subgraph Gateway["Edge & API Gateway"]
        CORS["Helmet / CORS Allowlist / Rate Limiter"]
        Auth["JWT Auth Guard (Neon Auth / Jose)"]
        API["Express API Server (Port 4000)"]
    end

    subgraph Realtime["Realtime Engine & Message Bus"]
        SocketServer["Socket.io Server<br/>(Tile & Station Rooms)"]
        Batcher["1-Second Delta Buffer<br/>(stations:delta)"]
        Redis["Redis Pub/Sub & Cache<br/>(Upstash / In-Memory Fallback)"]
    end

    subgraph Data["Persistence & Spatial Compute"]
        Postgres[("Neon PostgreSQL 16")]
        PostGIS["PostGIS Geography Engine<br/>(ST_DWithin / ST_Distance / GIST Index)"]
        Prisma["Prisma ORM Client"]
    end

    subgraph ML["Intelligence & Prediction"]
        MLService["FastAPI ML Service (Port 8000)"]
        Model["HistGradientBoosting / Fallback Curve"]
    end

    subgraph Simulation["Digital Twin Engine"]
        Twin["Autonomous Twin Simulator<br/>(OCPP 1.6J WebSocket Client)"]
    end

    Clients <-->|REST & WebSocket| API
    Gateway --> Auth --> API
    API <--> SocketServer
    SocketServer <--> Batcher <--> Redis
    API <--> Prisma <--> Postgres
    Postgres --- PostGIS
    API <-->|HTTP /predict/wait| MLService
    MLService --> Model
    Twin -->|OCPP 1.6J WS| API
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

Copy `.env.example` to `.env` in the root and in `apps/api/`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/evspark` | PostgreSQL PostGIS connection string |
| `DIRECT_URL` | Same as `DATABASE_URL` | Direct connection string for Prisma migrations |
| `PORT` | `4000` | Express API port |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `JWT_SECRET` | *(generate a secure random 256-bit string)* | Secret for verifying auth tokens |
| `UPSTASH_REDIS_REST_URL` | *(optional)* | Upstash Redis REST URL (falls back to local/in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | *(optional)* | Upstash Redis REST token |
| `ML_SERVICE_URL` | `http://localhost:8000` | FastAPI ML service URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend API URL used by the web client |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY`| *(optional)* | Google Maps JavaScript API key (fallback vector grid included) |

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
