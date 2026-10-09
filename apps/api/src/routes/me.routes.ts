import { Router } from "express";
import { getMySessions, getMyStats } from "../controllers/me.controller";

const router = Router();

router.get("/sessions", getMySessions);
router.get("/stats", getMyStats);

export default router;
