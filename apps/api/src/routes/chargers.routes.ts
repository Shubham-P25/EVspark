import { Router } from "express";
import { validate } from "../middleware/validate";
import { createChargerSchema, updateChargerSchema } from "@evspark/shared";
import {
  listChargers,
  getCharger,
  createCharger,
  updateCharger,
  deleteCharger,
} from "../controllers/chargers.controller";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", listChargers);
router.get("/:id", getCharger);
router.post(
  "/",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  validate({ body: createChargerSchema }),
  createCharger
);
router.patch(
  "/:id",
  requireAuth,
  requireRole("OPERATOR", "ADMIN"),
  validate({ body: updateChargerSchema }),
  updateCharger
);
router.delete("/:id", requireAuth, requireRole("OPERATOR", "ADMIN"), deleteCharger);

export default router;