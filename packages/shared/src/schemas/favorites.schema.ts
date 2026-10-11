import { z } from "zod";

export const createFavoriteSchema = z.object({
  stationId: z.string().min(1).max(100),
}).strip();
