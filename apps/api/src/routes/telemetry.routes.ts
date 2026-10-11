import { Router } from "express";
import { authenticateTelemetry, pingTelemetry } from "../controllers/telemetry.controller";
import { validate } from "../middleware/validate";
import { vehiclePingSchema } from "@evspark/shared";

const router = Router();

router.post("/ping", authenticateTelemetry, validate({ body: vehiclePingSchema }), pingTelemetry);

export default router;
