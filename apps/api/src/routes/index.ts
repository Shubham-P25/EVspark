import { Router } from "express";
import stationsRouter from "./stations.routes";
import chargersRouter from "./chargers.routes";
import usersRouter from "./users.routes";
import favoritesRouter from "./favorites.routes";
import reviewsRouter from "./reviews.routes";
import operatorRouter from "./operator.routes";
import adminRouter from "./admin.routes";
import meRouter from "./me.routes";
import telemetryRouter from "./telemetry.routes";
import { recommendStations } from "../controllers/recommend.controller";
import { planJourney } from "../controllers/journey.controller";
import { listVehicleModels } from "../controllers/vehicles.controller";
import { getPublicStats } from "../controllers/stations.controller";
import { listBookings, createBooking, cancelBooking } from "../controllers/bookings.controller";
import { createIssue } from "../controllers/issues.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  recommendSchema,
  journeyPlanSchema,
  createBookingSchema,
  createIssueSchema,
} from "@evspark/shared";

import queueRouter from "./queue.routes";
import { mapRouter } from "../modules/map/tiles.routes";
import { demoRouter } from "../modules/demo/demo.routes";
import { demoLimiter } from "../middleware/rateLimiter";

const router = Router();

// Public / Service endpoints
router.use(mapRouter);
router.use("/demo", demoLimiter, demoRouter);
router.use("/stations", stationsRouter);
router.use("/chargers", chargersRouter);
router.use("/telemetry", telemetryRouter);
router.use("/queue", queueRouter);
router.get("/vehicles", listVehicleModels);
router.get("/public/stats", getPublicStats);
router.post("/recommend", validate({ body: recommendSchema }), recommendStations);
router.post("/journeys/plan", validate({ body: journeyPlanSchema }), planJourney);

// Authenticated user endpoints
router.use("/me", requireAuth, meRouter);
router.use("/favorites", requireAuth, favoritesRouter);
router.use("/favourites", requireAuth, favoritesRouter);
router.use("/users", requireAuth, usersRouter);
router.use("/reviews", reviewsRouter);

router.get("/bookings", requireAuth, listBookings);
router.post("/bookings", requireAuth, validate({ body: createBookingSchema }), createBooking);
router.delete("/bookings/:id", requireAuth, cancelBooking);

router.post("/issues", requireAuth, validate({ body: createIssueSchema }), createIssue);

// Operator & Admin guarded endpoints
router.use("/operator", requireAuth, requireRole("OPERATOR", "ADMIN"), operatorRouter);
router.use("/admin", requireAuth, requireRole("ADMIN"), adminRouter);

export default router;