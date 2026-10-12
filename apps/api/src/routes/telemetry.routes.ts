import { Router } from "express";
import { authenticateTelemetry, pingTelemetry, getGhosts } from "../controllers/telemetry.controller";
import { validate } from "../middleware/validate";
import { vehiclePingSchema } from "@evspark/shared";

const router = Router();

router.post("/ping", authenticateTelemetry, validate({ body: vehiclePingSchema }), pingTelemetry);
router.get("/ghosts", getGhosts);

export default router;

