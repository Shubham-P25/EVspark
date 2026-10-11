import { z } from "zod";

export const createChargerSchema = z.object({
  stationId: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(50),
  connectorType: z.string().trim().min(1).max(50),
  powerKw: z.coerce.number().min(1).max(500),
  status: z.enum(["FREE", "BUSY", "MAINTENANCE", "FAULTED", "OFFLINE"]).optional().default("FREE"),
  ocppId: z.string().max(100).optional(),
}).strip();

export const updateChargerSchema = createChargerSchema.partial().strip();
