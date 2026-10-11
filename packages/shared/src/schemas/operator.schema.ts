import { z } from "zod";

export const updatePricingSchema = z.object({
  pricePerKwh: z.coerce.number().min(0).max(1000),
}).strip();

export const updateChargerStatusSchema = z.object({
  status: z.enum(["FREE", "BUSY", "MAINTENANCE", "FAULTED", "OFFLINE"]),
}).strip();

export const replyReviewSchema = z.object({
  reply: z.string().trim().min(1).max(1000),
}).strip();
