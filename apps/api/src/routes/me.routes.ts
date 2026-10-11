import { Router } from "express";
import {
  getMyProfile,
  updateOnboarding,
  updatePlaces,
  getMySessions,
  getMyStats,
} from "../controllers/me.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { onboardingSchema } from "@evspark/shared";

const router = Router();

router.get("/", (req, res) => {
  res.json(req.user);
});

router.get("/profile", requireAuth, getMyProfile);
router.put("/onboarding", requireAuth, validate({ body: onboardingSchema }), updateOnboarding);
router.put("/places", requireAuth, updatePlaces);
router.get("/sessions", requireAuth, getMySessions);
router.get("/stats", requireAuth, getMyStats);

export default router;
