# EVspark Map Simulation & Geofence Architecture

This document provides a comprehensive technical guide to the geofence calculation mathematics, dual-queue simulation engine, station ingestion workflow, self-hosting OSRM routing, and the 15-rule traceability matrix.

---

## 1. Geofence Mathematics & Road Clearance Algorithm

The core safety invariant of EVspark's simulation is: **A station's geofence circle must never intersect or touch any public roadway**.

### Mathematical Formulation

Given:
- Station center coordinate $S = (\text{lat}_s, \text{lng}_s)$
- Surrounding road line segments $R = \{r_1, r_2, \dots, r_k\}$ fetched via OpenStreetMap Overpass API within a 300 m radius
- Estimated road half-width $W_{\text{road}} = 5.0\text{ m}$
- Safety buffer margin $M = 2.0\text{ m}$
- Total clearance safety offset: $D_{\text{offset}} = W_{\text{road}} + M = 7.0\text{ m}$
- Minimum and maximum allowable fence radius: $R_{\min} = 8.0\text{ m}$, $R_{\max} = 45.0\text{ m}$
- Minimum road distance threshold: $D_{\text{threshold}} = 15.0\text{ m}$

### 1. Distance Calculation & Gate Point
The algorithm identifies the closest road segment $r^* \in R$ and computes:
$$\text{snap} = \text{argmin}_{p \in r^*} \text{dist}(S, p)$$
$$d = \text{dist}(S, \text{snap})$$

The gate of the station is established at the snapped point on the road edge: $\text{Gate} = \text{snap}$.

### 2. Iterative Center Nudge (Road Frontage Correction)
If the station is situated right on the street frontage ($d < D_{\text{threshold}}$):
1. Compute the bearing vector pointing away from the road:
   $$\theta = \text{bearing}(\text{snap}, S)$$
2. Shift the fence center backwards away from the road frontage:
   $$\Delta d = D_{\text{threshold}} - d + 1.0\text{ m}$$
   $$S' = \text{destination}(S, \Delta d, \theta)$$
3. Recompute distance $d' = \text{dist}(S', \text{nearest}(R, S'))$.
4. Repeat up to 5 iterations until $d' \ge D_{\text{threshold}}$, setting `centerShifted: true`.

### 3. Radius Shrinkage
The final geofence circle radius $R_{\text{fence}}$ is clamped:
$$R_{\text{fence}} = \text{clamp}(d - D_{\text{offset}}, R_{\min}, R_{\max})$$
Strict clearance guarantee: $R_{\text{fence}} \le d - 1.0\text{ m}$ is verified. If this invariant cannot be satisfied, the station is rejected from the demo.

---

## 2. Ingestion: How to Add New Stations

To add stations to the demo pool:
1. Ensure the station has approved status in the database (`status = 'APPROVED'`).
2. Populate the spatial column:
   ```sql
   UPDATE "Station"
   SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
   WHERE geom IS NULL;
   ```
3. Ensure the station has at least one charger defined in `"Charger"` with `stationId`.
4. Call `GET /api/demo/bootstrap?lat={lat}&lng={lng}&limit=3`.
   - The backend will automatically fetch road geometry from Overpass/OSRM, compute the clearance circle and gate, build 3 approach routes from 200–500m out, and cache the result in Redis with key `demo:boot:{lat}:{lng}:{limit}`.

---

## 3. How to Self-Host OSRM Routing

The demo uses OSRM for car approach routes. By default, it uses the public demo server (`https://router.project-osrm.org`) with fallback coordinate generation and in-memory Redis caching.

To self-host OSRM for high-throughput production usage:

1. **Download OSM Data** (e.g., India or Maharashtra extract from Geofabrik):
   ```bash
   wget https://download.geofabrik.de/asia/india/western-zone-latest.osm.pbf
   ```

2. **Extract & Prepare OSRM Graph** with Docker:
   ```bash
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/western-zone-latest.osm.pbf
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/western-zone-latest.osrm
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/western-zone-latest.osrm
   ```

3. **Run the OSRM Routing Daemon**:
   ```bash
   docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/western-zone-latest.osrm
   ```

4. **Update Environment Variables**:
   In `.env` and `apps/api/.env`:
   ```env
   OSRM_BASE_URL="http://localhost:5000"
   ```

---

## 4. 15-Rule Traceability Matrix

Every requirement specified in `tools.md` is cross-referenced with its implementation and verification proof:

| # | Requirement | Implemented in | Proven by | Status |
|---|---|---|---|---|
| **0** | Stations render in milliseconds (DB/Redis, efficient render) | `tiles.routes.ts`, `tile-store.ts`, `PinLayer.tsx` | Benchmark in `docs/map-perf.md` (3 ms warm response, 275 B payload) | ✅ VERIFIED |
| **1** | Fence never hits a road; shrinks on contact | `geofence.ts` (`computeGeofence`), `demo.routes.ts` | Clearance assertion: $R \le \text{clearance} - 7$; Preset 11 | ✅ VERIFIED |
| **2** | Two queues: Charging queue and Waiting queue | `engine.ts` (`chargingQ`, `waitingQ`) | Vitest tests 2 and 3; UI stats display | ✅ VERIFIED |
| **3** | Cars follow real roads to the station | `routes.ts` (OSRM pool), `engine.ts` (`offsetLeft`) | OSRM polyline sampling; Left-hand traffic lane offset | ✅ VERIFIED |
| **4** | Charging cars vs stay-only cars (2 kinds) | `types.ts` (`CarKind`), `engine.ts` (`chargerShare`) | Unit test 4; Preset 10 (Visitors only) | ✅ VERIFIED |
| **5** | Cars never overlap (roads, gate, inside, bays) | `engine.ts` (`safeGap`, `hardSep`, spatial hash grid) | Unit test 2 asserts $\min(\text{dist}) \ge 3.0\text{ m}$ continuously | ✅ VERIFIED |
| **6** | Stations rendered in the demo | `demo-canvas.ts`, `DemoPanel.tsx` | Canvas 2D overlay; Station cards in panel | ✅ VERIFIED |
| **7** | Stations initially empty | `engine.ts` constructor (`nextArrivalAt` delayed), `reset()` | Unit test 1 (`starts empty`) | ✅ VERIFIED |
| **8** | Car enters fence: if charger free, joins Charging queue | `engine.ts` (`onEnterFence` → `joinCharging`) | Unit tests 2 and 3; Preset 2 | ✅ VERIFIED |
| **9** | Charging queue cap = number of online chargers | `engine.ts` free-charger-only entry | Unit test 2 asserts `chargingQ.length <= chargers.length` | ✅ VERIFIED |
| **10** | If all chargers full, car joins Waiting queue | `engine.ts` (`onEnterFence` else-branch) | Unit test 3 (`overflow goes to the waiting queue`) | ✅ VERIFIED |
| **11** | Unclaimed charger offer classified as "Other jobs" | `engine.ts` (`discardOtherJobs` + grace timer) | Unit test 4 (`visitor offered free charger`); Preset 5 | ✅ VERIFIED |
| **12** | Waiting time and number waiting exposed | `estimate.ts` (`estimateWaits`), `DemoPanel.tsx` | Station card UI shows estimated minutes + queue length | ✅ VERIFIED |
| **13** | Tired car leaves and removed from Waiting queue | `engine.ts` (`stationLogic` reneging timer) | Unit test 5 (`impatient car leaves`); Preset 6 | ✅ VERIFIED |
| **14** | All scenarios covered (rush hour, faults, balk) | `DemoPanel.tsx` presets 1–11, `toggleFault`, `rushHour` | Scenario walkthrough in `docs/map-demo-qa.md` | ✅ VERIFIED |
| **15** | Simulated demo clearly labelled on screen | `DriverMap.tsx`, `DemoPanel.tsx` | Top-centre pulsing badge + panel badge | ✅ VERIFIED |
