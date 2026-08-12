import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createReviewSchema } from "../validators/reviews.schema";
import { listReviews, createReview, deleteReview } from "../controllers/reviews.controller";

const router = Router();

router.get("/", asyncHandler(listReviews));
router.post("/", validate(createReviewSchema), asyncHandler(createReview));
router.delete("/:id", asyncHandler(deleteReview));

export default router;