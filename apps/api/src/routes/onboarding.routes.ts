import { Router } from "express";
import { saveDraft, completeOnboarding } from "../controllers/onboarding.controller.js";

const router = Router();

router.put("/draft", saveDraft);
router.post("/complete", completeOnboarding);

export default router;

