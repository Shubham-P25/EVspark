import { z } from "zod";
import { latSchema, lngSchema } from "./stations.schema";

export const recommendSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  connector: z.string().max(50).optional().default("All"),
  batteryPct: z.coerce.number().min(0).max(100).optional(),
  vehicleModelId: z.string().max(100).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional().default(15),
}).strip();
