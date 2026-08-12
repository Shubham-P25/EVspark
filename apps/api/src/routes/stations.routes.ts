import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createStationSchema, updateStationSchema } from "../validators/stations.schema";
import {
  listStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
} from "../controllers/stations.controller";

const router = Router();

router.get("/", asyncHandler(listStations));
router.get("/:id", asyncHandler(getStation));
router.post("/", validate(createStationSchema), asyncHandler(createStation));
router.patch("/:id", validate(updateStationSchema), asyncHandler(updateStation));
router.delete("/:id", asyncHandler(deleteStation));

export default router;