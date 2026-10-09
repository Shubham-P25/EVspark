import { Router } from "express";
import {
  getPendingStations,
  approveStation,
  getAdminOverview,
  getAdminUsers,
  getAdminIssues,
  updateSimConfig,
} from "../controllers/admin.controller";

const router = Router();

router.get("/stations/pending", getPendingStations);
router.patch("/stations/:id/approval", approveStation);
router.get("/overview", getAdminOverview);
router.get("/users", getAdminUsers);
router.get("/operators", getAdminUsers);
router.get("/issues", getAdminIssues);
router.post("/sim", updateSimConfig);

export default router;
