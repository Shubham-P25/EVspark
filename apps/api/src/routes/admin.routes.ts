import { Router } from "express";
import { validate } from "../middleware/validate";
import { approveStationSchema, simConfigSchema } from "@evspark/shared";
import {
  getPendingStations,
  approveStation,
  getAdminOverview,
  getAdminUsers,
  getAdminIssues,
  getSimConfig,
  updateSimConfig,
  injectEmergencyFault,
  getForecastEvaluation,
} from "../controllers/admin.controller";

const router = Router();

router.get("/stations/pending", getPendingStations);
router.patch("/stations/:id/approval", validate({ body: approveStationSchema }), approveStation);
router.get("/overview", getAdminOverview);
router.get("/users", getAdminUsers);
router.get("/operators", getAdminUsers);
router.get("/issues", getAdminIssues);
router.get("/sim-config", getSimConfig);
router.patch("/sim-config", validate({ body: simConfigSchema }), updateSimConfig);
router.post("/sim", validate({ body: simConfigSchema }), updateSimConfig);
router.post("/inject-fault", injectEmergencyFault);
router.get("/forecast-eval", getForecastEvaluation);

export default router;
