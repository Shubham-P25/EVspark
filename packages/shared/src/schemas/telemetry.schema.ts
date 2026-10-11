import { z } from "zod";

export const vehiclePingSchema = z.object({
  vehicleRef: z.string().min(1, "Vehicle reference is required"),
  stationId: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  intent: z.enum(["heading_to", "idle", "charging"]),
});

export type VehiclePingInput = z.infer<typeof vehiclePingSchema>;
