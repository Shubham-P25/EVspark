import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  createStationSchema,
  updateStationSchema,
  stationsQuerySchema,
  nearbyStationsQuerySchema,
  stationIdParamSchema,
  alongRouteSchema,
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
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// 1. Nearby & Along-route endpoints (must precede /:id)
router.get("/nearby", validate({ query: nearbyStationsQuerySchema }), getNearbyStations);
router.post("/along-route", validate({ body: alongRouteSchema }), getStationsAlongRoute);

// 2. Photos & Reviews by ID (before general /:id)
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