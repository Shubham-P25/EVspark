# Map Discovery — EVspark Repository

This document contains repository discovery findings for the EVspark Map Upgrade and Geofence Demo implementation.

---

### 1. Driver Map Library & Components
- **Map Library:** `@vis.gl/react-google-maps` (v1.10.1) using Google Maps JavaScript API via `@googlemaps/js-api-loader` (v2.1.3). Neither `@react-google-maps/api` nor `react-leaflet` is used.
- **Page Path:** [`apps/web/src/app/(main)/driver/page.tsx`](file:///d:/EVspark/apps/web/src/app/(main)/driver/page.tsx)
- **Map Components:**
  - Container / Orchestrator: [`apps/web/src/features/driver-map/DriverMap.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/DriverMap.tsx)
  - Google Map Canvas wrapper: [`apps/web/src/features/driver-map/MapCanvas.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/MapCanvas.tsx)
  - Maps Provider: [`apps/web/src/features/driver-map/MapsProvider.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/MapsProvider.tsx)

---

### 2. Station Fetching & Rendering Mechanism
- **Hook Name:** `useTilePins` in [`apps/web/src/features/driver-map/hooks/useTilePins.ts`](file:///d:/EVspark/apps/web/src/features/driver-map/hooks/useTilePins.ts) (computes bounding tile coords with `useViewportTiles` in [`apps/web/src/features/driver-map/hooks/useViewportTiles.ts`](file:///d:/EVspark/apps/web/src/features/driver-map/hooks/useViewportTiles.ts))
- **Endpoint:** `GET /api/stations/pins?z={z}&x={x}&y={y}` (handled by `apps/api/src/controllers/pins.controller.ts` returning compact columnar `PinTuple[]`)
- **Marker Components:**
  - Layer Orchestrator: [`apps/web/src/features/driver-map/PinLayer.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/PinLayer.tsx) (uses `supercluster` client-side clustering)
  - Station Marker: [`apps/web/src/features/driver-map/PinMarker.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/PinMarker.tsx) (uses `AdvancedMarker` from `@vis.gl/react-google-maps`)
  - Cluster Marker: [`apps/web/src/features/driver-map/ClusterMarker.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/ClusterMarker.tsx) (uses `AdvancedMarker`)

---

### 3. Prisma Models & PostGIS Configuration
- **Prisma Schema Path:** [`apps/api/prisma/schema.prisma`](file:///d:/EVspark/apps/api/prisma/schema.prisma)
- **Station Model:**
  - Name: `Station` (table `"Station"`)
  - Coordinates: `lat` (Float) and `lng` (Float)
  - Status Enum: `StationStatus` (`PENDING`, `APPROVED`, `REJECTED`), field: `status` with default `APPROVED`
  - Approved flag: `status == APPROVED`
  - Spatial Column: `location` defined in schema as `Unsupported("geography(Point,4326)")?` (populated as generated column `ST_SetSRID(ST_MakePoint("lng","lat"),4326)::geography STORED`)
  - Charger Relation: `chargers Charger[]`
- **Charger Model:**
  - Name: `Charger` (table `"Charger"`)
  - Foreign Key: `stationId` (String) referencing `Station(id)`
  - Status Enum: `ChargerStatus` (`FREE`, `BUSY`, `MAINTENANCE`, `FAULTED`, `OFFLINE`), field: `status` with default `FREE`
  - Count of chargers per station: query via `(SELECT COUNT(*) FROM "Charger" c WHERE c."stationId" = s.id)::int` or Prisma `_count: { chargers: true }`
- **PostGIS Status:**
  - **ENABLED**. Created in migration [`apps/api/prisma/migrations/20260330000001_postgis_station_location/migration.sql`](file:///d:/EVspark/apps/api/prisma/migrations/20260330000001_postgis_station_location/migration.sql) with `CREATE EXTENSION IF NOT EXISTS postgis;`
  - Spatial index: `CREATE INDEX "Station_location_gist" ON "Station" USING GIST ("location");`

---

### 4. Redis Client Module Path
- **Existing Client:** [`apps/api/src/lib/redis.ts`](file:///d:/EVspark/apps/api/src/lib/redis.ts) using `ioredis` (exports `getRedis()`, `cacheGet()`, `cacheSet()`, `delStationCache()`, `checkRedisHealth()`).
- **Upstash REST Client (`@upstash/redis`):** **missing** (not installed; `ioredis` connects to `REDIS_URL`).

---

### 5. Socket.io Server & Room Subscriptions
- **Server File:** [`apps/api/src/lib/socket.ts`](file:///d:/EVspark/apps/api/src/lib/socket.ts)
- **Client Room Joining:**
  - Map tile rooms: Client emits `subscribe:tiles` with array of string room names (e.g. `['tile:12:x:y']`). Server caps to 12 tiles and calls `socket.join(tile)`.
  - Leaving tiles: Client emits `unsubscribe:tiles` with array of string room names; server calls `socket.leave(tile)`.
  - Station detail room: Client emits `subscribe:station` with `stationId`; server joins `station:${stationId}`.
  - Operator room: Client emits `join:operator` with `userId`; joins `operator:${userId}` if role is ADMIN or matching OPERATOR.
  - Admin room: Client emits `join:admin`; joins `admin` room if role is ADMIN.
  - Broadcasts: Periodic flush timer (1 sec) pushes batched `stations:delta` to rooms `tile:${z}:${x}:${y}` and `station:${id}`.

---

### 6. Package Manager & Test Runner
- **Package Manager:** `pnpm` (lockfile: [`pnpm-lock.yaml`](file:///d:/EVspark/pnpm-lock.yaml), `packageManager: "pnpm@11.2.2"` in root [`package.json`](file:///d:/EVspark/package.json)).
- **Test Runner:** **Vitest** is present (`"vitest": "^5.0.3"` in root [`package.json`](file:///d:/EVspark/package.json) and in [`apps/api/package.json`](file:///d:/EVspark/apps/api/package.json)).

---

### 7. Existing Environment Variables
- **Root `.env.example`:**
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `REDIS_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_JWKS_URL`
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - `GOOGLE_MAPS_API_KEY`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
  - `PORT`
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_SOCKET_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `ML_SERVICE_URL`
  - `SIM_SPEED_MULTIPLIER`
  - `FOCUS_STATION_IDS`
  - `FOCUS_ARRIVAL_MIN_SEC`
  - `FOCUS_ARRIVAL_MAX_SEC`
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `ENABLE_MQTT`
  - `MQTT_BROKER_URL`
  - `MQTT_USERNAME`
  - `MQTT_PASSWORD`
  - `DEMO_MODE`
  - `GEOFENCE_RADIUS_M`
  - `TWIN_SECRET`
- **`apps/api/.env.example` Additional Variables:**
  - `NODE_ENV`
  - `WEB_ORIGIN`
  - `LOG_LEVEL`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `NEON_AUTH_JWKS_URL`
  - `NEON_AUTH_ISSUER`
  - `ADMIN_EMAILS`
  - `SIM_SPEED`
  - `SIM_SEED`
  - `QUEUE_DRIVER`
  - `OCM_API_KEY`
  - `GOOGLE_PLACES_SERVER_KEY`
  - `GOOGLE_LIVE_DAILY_CAP`
  - `SOCKET_REDIS_ADAPTER`

---

### 8. Driver Page Toolbar / Controls Placement
- **Location:** [`apps/web/src/features/driver-map/DriverMap.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/DriverMap.tsx) lines 78–82:
  - Top-Right Container: `absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-center gap-2 pointer-events-auto`
  - Existing Controls in this container:
    - [`apps/web/src/features/driver-map/ui/DemoButton.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/ui/DemoButton.tsx)
    - [`apps/web/src/features/driver-map/ui/ProfileButton.tsx`](file:///d:/EVspark/apps/web/src/features/driver-map/ui/ProfileButton.tsx)
  - There is no top navbar on this page, matching the full-screen map design.
