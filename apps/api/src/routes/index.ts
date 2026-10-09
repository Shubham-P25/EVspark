import { Router } from "express";
import stationsRouter from "./stations.routes";
import chargersRouter from "./chargers.routes";
import usersRouter from "./users.routes";
import favoritesRouter from "./favorites.routes";
import reviewsRouter from "./reviews.routes";
import operatorRouter from "./operator.routes";
import adminRouter from "./admin.routes";
import meRouter from "./me.routes";
import { recommendStations } from "../controllers/recommend.controller";
import { planJourney } from "../controllers/journey.controller";
import { listVehicleModels } from "../controllers/vehicles.controller";
import { listBookings, createBooking, cancelBooking } from "../controllers/bookings.controller";
import { createIssue } from "../controllers/issues.controller";

const router = Router();

// Driver & Core public endpoints
router.use("/stations", stationsRouter);
router.use("/chargers", chargersRouter);
router.use("/users", usersRouter);
router.use("/favorites", favoritesRouter);
router.use("/favourites", favoritesRouter); // alias as per codemap
router.use("/reviews", reviewsRouter);

// Fuel Recommendation
router.post("/recommend", recommendStations);

// Journey Planner A -> B with charging stops
router.post("/journeys/plan", planJourney);

// Vehicles
router.get("/vehicles", listVehicleModels);

// Bookings
router.get("/bookings", listBookings);
router.post("/bookings", createBooking);
router.delete("/bookings/:id", cancelBooking);

// Issues
router.post("/issues", createIssue);

// Personal Driver stats & sessions
router.use("/me", meRouter);

// Operator & Admin
router.use("/operator", operatorRouter);
router.use("/admin", adminRouter);

export default router;