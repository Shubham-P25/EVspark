import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  role: z.enum(["DRIVER", "OPERATOR", "ADMIN"]).optional(),
});

export const updateUserSchema = createUserSchema.partial();