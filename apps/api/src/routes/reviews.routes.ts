import { Router } from "express";
import { validate } from "../middleware/validate";
import { createReviewSchema } from "@evspark/shared";
import { listReviews, createReview, deleteReview } from "../controllers/reviews.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", listReviews);
router.post("/", requireAuth, validate(createReviewSchema), createReview);
router.delete("/:id", requireAuth, deleteReview);

export default router;