import { Router } from "express";
import { validate } from "../middleware/validate";
import { createUserSchema, updateUserSchema } from "@evspark/shared";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/users.controller";

const router = Router();

router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", validate({ body: createUserSchema }), createUser);
router.patch("/:id", validate({ body: updateUserSchema }), updateUser);
router.delete("/:id", deleteUser);

export default router;