import { z } from "zod";

export const createChargerSchema = z.object({
  stationId: z.string().min(1),
  connectorType: z.string().min(1),
  powerKw: z.number().positive(),
});

export const updateChargerSchema = z.object({
  connectorType: z.string().min(1).optional(),
  powerKw: z.number().positive().optional(),
  status: z.enum(["FREE", "BUSY", "MAINTENANCE"]).optional(),
});