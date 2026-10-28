import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  createStationSchema,
  updateStationSchema,
  stationsQuerySchema,
  nearbyStationsQuerySchema,
  stationIdParamSchema,
  alongRouteSchema,
  pinsQuerySchema,
} from "@evspark/shared";
import {
  listStations,
  getNearbyStations,
  getStationsAlongRoute,
  getStationPhotos,
  getStationReviews,
  getStation,
  createStation,
  updateStation,
  deleteStation,
} from "../controllers/stations.controller";
import { getPins, getStationLive, getLiveStats } from "../controllers/pins.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Fast vector map pins endpoint (must precede /:id)
router.get("/pins", validate({ query: pinsQuerySchema }), getPins);
router.get("/live-stats", getLiveStats);

// 1. Nearby & Along-route endpoints (must precede /:id)
router.get("/nearby", validate({ query: nearbyStationsQuerySchema }), getNearbyStations);
router.post("/along-route", validate({ body: alongRouteSchema }), getStationsAlongRoute);

// 2. Photos, Reviews & Live availability by ID (before general /:id)
router.get("/:id/live", validate({ params: stationIdParamSchema }), getStationLive);
router.get("/:id/photos", validate({ params: stationIdParamSchema }), getStationPhotos);
router.get("/:id/reviews", validate({ params: stationIdParamSchema }), getStationReviews);

// 3. Main list / bbox endpoint
router.get("/", validate({ query: stationsQuerySchema }), listStations);

// 4. Station details by ID
router.get("/:id", validate({ params: stationIdParamSchema }), getStation);

// 4. Mutating actions (guarded)
router.post(
  "/",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  validate({ body: createStationSchema }),
  createStation
);
router.patch(
  "/:id",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  validate({ params: stationIdParamSchema, body: updateStationSchema }),
  updateStation
);
router.delete(
  "/:id",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  validate({ params: stationIdParamSchema }),
  deleteStation
);

export default router;