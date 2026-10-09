import { Router } from "express";
import {
  getOperatorStations,
  updatePricing,
  updateChargerStatus,
  getRevenueAnalytics,
  getHeatmapAnalytics,
  getLiveSessions,
  replyToReview,
} from "../controllers/operator.controller";
import { createStation } from "../controllers/stations.controller";

const router = Router();

router.get("/stations", getOperatorStations);
router.post("/stations", createStation);
router.patch("/stations/:id/pricing", updatePricing);
router.patch("/chargers/:id/status", updateChargerStatus);
router.get("/analytics/revenue", getRevenueAnalytics);
router.get("/analytics/heatmap", getHeatmapAnalytics);
router.get("/analytics/sessions", getLiveSessions);
router.get("/analytics/chargers", getLiveSessions);
router.post("/reviews/:id/reply", replyToReview);

export default router;
