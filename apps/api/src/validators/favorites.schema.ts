import { z } from "zod";

export const createFavoriteSchema = z.object({
  userId: z.string().min(1),
  stationId: z.string().min(1),
});