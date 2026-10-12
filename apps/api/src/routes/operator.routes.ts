import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  createStationSchema,
  updatePricingSchema,
  updateChargerStatusSchema,
  replyReviewSchema,
} from "@evspark/shared";
import {
  getOperatorStations,
  updatePricing,
  updateChargerStatus,
  getRevenueAnalytics,
  getHeatmapAnalytics,
  getBreakdownAnalytics,
  getLiveSessions,
  replyToReview,
  getOperatorStationLive,
} from "../controllers/operator.controller";
import { createStation } from "../controllers/stations.controller";

const router = Router();

router.get("/stations", getOperatorStations);
router.get("/stations/:id/live", getOperatorStationLive);
router.post("/stations", validate({ body: createStationSchema }), createStation);
router.patch("/stations/:id/pricing", validate({ body: updatePricingSchema }), updatePricing);
router.patch("/chargers/:id/status", validate({ body: updateChargerStatusSchema }), updateChargerStatus);
router.get("/analytics/revenue", getRevenueAnalytics);
router.get("/analytics/heatmap", getHeatmapAnalytics);
router.get("/analytics/breakdown", getBreakdownAnalytics);
router.get("/analytics/sessions", getLiveSessions);
router.get("/analytics/chargers", getLiveSessions);
router.post("/reviews/:id/reply", validate({ body: replyReviewSchema }), replyToReview);

export default router;
