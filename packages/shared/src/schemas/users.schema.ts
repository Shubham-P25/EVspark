import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().trim().email().max(120),
  name: z.string().trim().max(100).optional(),
  role: z.enum(["DRIVER", "OPERATOR", "ADMIN"]).optional().default("DRIVER"),
}).strip();

export const updateUserSchema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(120).optional(),
  role: z.enum(["DRIVER", "OPERATOR", "ADMIN"]).optional(),
}).strip();
