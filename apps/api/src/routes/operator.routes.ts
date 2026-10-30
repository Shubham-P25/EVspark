import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createStationSchema,
  updatePricingSchema,
  operatorChargerStatusSchema,
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
  getTorqueStationSnapshot,
  addOperatorSession,
  advanceOperatorSession,
  undoOperatorSession,
  patchOperatorCharger,
} from "../controllers/operator.controller.js";
import { createStation } from "../controllers/stations.controller.js";

const router = Router();

// Torque Operator Panel endpoints
router.get("/station", getTorqueStationSnapshot);
router.post("/sessions", addOperatorSession);
router.post("/sessions/:id/advance", advanceOperatorSession);
router.post("/sessions/:id/step", advanceOperatorSession);
router.post("/sessions/:id/undo", undoOperatorSession);
router.patch("/chargers/:id", patchOperatorCharger);

// Existing endpoints
router.get("/stations", getOperatorStations);
router.get("/stations/:id/live", getOperatorStationLive);
router.post("/stations", validate({ body: createStationSchema }), createStation);
router.patch("/stations/:id/pricing", validate({ body: updatePricingSchema }), updatePricing);
router.patch("/chargers/:id/status", validate({ body: operatorChargerStatusSchema }), updateChargerStatus);
router.get("/analytics/revenue", getRevenueAnalytics);
router.get("/analytics/heatmap", getHeatmapAnalytics);
router.get("/analytics/breakdown", getBreakdownAnalytics);
router.get("/analytics/sessions", getLiveSessions);
router.get("/analytics/chargers", getLiveSessions);
router.post("/reviews/:id/reply", validate({ body: replyReviewSchema }), replyToReview);

export default router;
