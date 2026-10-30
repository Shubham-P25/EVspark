import { Router } from "express";
import {
  getMe,
  syncMe,
  updateRole,
  getMyProfile,
  updateOnboarding,
  signPhotoUpload,
  updatePlaces,
  getMySessions,
  getMyStats,
} from "../controllers/me.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import { onboardingSchema } from "@evspark/shared";
import { saveDraft, completeOnboarding } from "../controllers/onboarding.controller.js";

const router = Router();

router.get("/", requireAuth, getMe);
router.post("/sync", requireAuth, syncMe);
router.post("/role", requireAuth, updateRole);
router.put("/onboarding/draft", requireAuth, saveDraft);
router.post("/onboarding/complete", requireAuth, completeOnboarding);

router.get("/profile", requireAuth, getMyProfile);
router.put("/onboarding", requireAuth, validate({ body: onboardingSchema }), updateOnboarding);
router.put("/places", requireAuth, updatePlaces);
router.post("/uploads/sign", requireAuth, writeLimiter, signPhotoUpload);
router.get("/sessions", requireAuth, getMySessions);
router.get("/stats", requireAuth, getMyStats);

export default router;
