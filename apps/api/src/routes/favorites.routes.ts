import { Router } from "express";
import { validate } from "../middleware/validate";
import { createFavoriteSchema } from "@evspark/shared";
import {
  listFavorites,
  createFavorite,
  deleteFavorite,
} from "../controllers/favorites.controller";

const router = Router();

router.get("/", listFavorites);
router.post("/", validate({ body: createFavoriteSchema }), createFavorite);
router.delete("/:id", deleteFavorite);

export default router;