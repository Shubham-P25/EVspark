import { z } from "zod";

export const createReviewSchema = z.object({
  stationId: z.string().min(1).max(100),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
}).strip();
