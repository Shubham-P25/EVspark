import { z } from "zod";

export const createBookingSchema = z.object({
  stationId: z.string().min(1).max(100),
  chargerId: z.string().max(100).optional(),
  startTs: z.string().datetime({ offset: true }).or(z.string()).optional(),
  endTs: z.string().datetime({ offset: true }).or(z.string()).optional(),
}).strip();
