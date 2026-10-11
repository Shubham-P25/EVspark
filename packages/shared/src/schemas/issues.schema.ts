import { z } from "zod";

export const createIssueSchema = z.object({
  stationId: z.string().min(1).max(100),
  chargerId: z.string().max(100).optional(),
  type: z.string().max(50).optional().default("other"),
  text: z.string().trim().min(1).max(1000),
}).strip();
