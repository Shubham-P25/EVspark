import { z } from "zod";

export const createStationSchema = z.object({
  name: z.string().min(1),
  operatorName: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  pricePerKwh: z.number().positive(),
});

export const updateStationSchema = createStationSchema.partial().extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});