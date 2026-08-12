import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createFavoriteSchema } from "../validators/favorites.schema";
import { listFavorites, createFavorite, deleteFavorite } from "../controllers/favorites.controller";

const router = Router();

router.get("/", asyncHandler(listFavorites));
router.post("/", validate(createFavoriteSchema), asyncHandler(createFavorite));
router.delete("/:id", asyncHandler(deleteFavorite));

export default router;