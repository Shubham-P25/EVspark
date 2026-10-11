import { z } from "zod";
import { latSchema, lngSchema } from "./stations.schema";

const waypointSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
});

export const journeyPlanSchema = z.object({
  origin: waypointSchema.optional(),
  from: waypointSchema.optional(),
  destination: waypointSchema.optional(),
  to: waypointSchema.optional(),
  batteryPct: z.coerce.number().min(0).max(100).optional().default(80),
  rangeKm: z.coerce.number().min(50).max(1000).optional().default(300),
  vehicleModelId: z.string().max(100).optional(),
}).refine(data => (data.origin || data.from) && (data.destination || data.to), {
  message: "Either origin/from and destination/to must be provided",
});

