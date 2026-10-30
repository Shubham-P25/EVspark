import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { callQueueSchema } from "@evspark/shared";
import {
  joinQueue,
  getStationQueue,
  callQueueEntry,
  removeQueueEntry,
  restoreQueueEntry,
} from "../controllers/queue.controller";

const router = Router();
const operatorOnly = [requireAuth, requireRole("OPERATOR", "ADMIN")];

router.post("/join", joinQueue);
router.get("/station/:stationId", getStationQueue);

// Operator actions (ownership is verified inside each controller)
router.post("/:id/call", ...operatorOnly, validate({ body: callQueueSchema }), callQueueEntry);
router.post("/:id/restore", ...operatorOnly, restoreQueueEntry);
router.delete("/:id", ...operatorOnly, removeQueueEntry);

export default router;
