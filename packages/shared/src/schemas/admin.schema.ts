import { z } from "zod";

export const approveStationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
}).strip();

export const simConfigSchema = z.object({
  speed: z.coerce.number().min(1).max(60).optional(),
  arrivalsPerMin: z.coerce.number().min(0).max(20).optional(),
  surgeMultiplier: z.coerce.number().min(1).max(5).optional(),
  running: z.boolean().optional(),
  surgeStations: z.array(z.string().max(100)).optional(),
  seed: z.coerce.number().optional(),
}).strip();
