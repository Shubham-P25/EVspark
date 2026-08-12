import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createChargerSchema, updateChargerSchema } from "../validators/chargers.schema";
import {
  listChargers,
  getCharger,
  createCharger,
  updateCharger,
  deleteCharger,
} from "../controllers/chargers.controller";

const router = Router();

router.get("/", asyncHandler(listChargers));
router.get("/:id", asyncHandler(getCharger));
router.post("/", validate(createChargerSchema), asyncHandler(createCharger));
router.patch("/:id", validate(updateChargerSchema), asyncHandler(updateCharger));
router.delete("/:id", asyncHandler(deleteCharger));

export default router;