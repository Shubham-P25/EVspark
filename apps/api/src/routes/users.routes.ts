import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema } from "../validators/users.schema";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/users.controller";

const router = Router();

router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(getUser));
router.post("/", validate(createUserSchema), asyncHandler(createUser));
router.patch("/:id", validate(updateUserSchema), asyncHandler(updateUser));
router.delete("/:id", asyncHandler(deleteUser));

export default router;