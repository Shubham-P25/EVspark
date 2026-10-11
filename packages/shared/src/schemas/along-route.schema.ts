import { z } from "zod";

export const alongRouteSchema = z.object({
  polyline: z.string().min(2).max(100_000),
  radiusM: z.coerce.number().min(100).max(5000).optional().default(2000),
  connector: z.string().max(50).optional(),
  minKw: z.coerce.number().min(0).max(500).optional(),
  limit: z.coerce.number().int().min(1).max(40).optional().default(25),
}).strip();

export type AlongRouteInput = z.infer<typeof alongRouteSchema>;
