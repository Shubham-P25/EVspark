import { Router } from "express";
import { joinQueue, getStationQueue } from "../controllers/queue.controller";

const router = Router();

router.post("/join", joinQueue);
router.get("/station/:stationId", getStationQueue);

export default router;
