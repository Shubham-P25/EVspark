import { z } from "zod";

export const phoneRegex = /^[6-9]\d{9}$/;
export const vehicleRegNoRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
export const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const driverOnboardingSchema = z.object({
  role: z.literal("DRIVER"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(60),
  phone: z.string().regex(phoneRegex, "Please enter a valid 10-digit Indian phone number"),
  city: z.string().min(1, "City is required"),
  vehicleModelId: z.string().min(1, "Vehicle selection is required"),
  vehicleRegNo: z
    .string()
    .transform((val) => val.toUpperCase().replace(/\s+/g, ""))
    .pipe(z.string().regex(vehicleRegNoRegex, "Invalid vehicle registration number format (e.g. MH12AB1234)")),
  batteryPct: z.number().min(0).max(100).default(50),
  connectors: z.array(z.string()).min(1, "At least one connector type is required"),
  preferredCharging: z.enum(["AC", "DC", "EITHER"]).default("EITHER"),
  homeLat: z.number(),
  homeLng: z.number(),
  homeLabel: z.string().min(1, "Home address label is required"),
  workLat: z.number().optional().nullable(),
  workLng: z.number().optional().nullable(),
  workLabel: z.string().optional().nullable(),
  maxWaitMin: z.number().int().min(0).max(360).optional().nullable(),
  minKw: z.number().min(0).optional().nullable(),
  notifications: z.boolean().optional().default(true),
});

export const operatorChargerInputSchema = z.object({
  label: z.string().optional(),
  connectorType: z.string().min(1, "Connector type required"),
  powerKw: z.number().positive("Power must be positive"),
});

export const operatorOnboardingSchema = z.object({
  role: z.literal("OPERATOR"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact person name must be at least 2 characters"),
  phone: z.string().regex(phoneRegex, "Please enter a valid 10-digit Indian phone number"),
  gstin: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || gstinRegex.test(val), "Invalid GSTIN format"),
  stationName: z.string().min(2, "Station name must be at least 2 characters"),
  address: z.string().min(5, "Full address is required"),
  lat: z.number(),
  lng: z.number(),
  city: z.string().min(1, "City is required"),
  photoUrl: z.string().url().optional().nullable(),
  chargers: z.array(operatorChargerInputSchema).min(1, "At least one charger is required"),
  pricePerKwh: z.number().positive("Tariff must be positive"),
  hours: z.string().default("24/7"),
  amenities: z.array(z.string()).optional().default([]),
});

export const onboardingSchema = z.discriminatedUnion("role", [
  driverOnboardingSchema,
  operatorOnboardingSchema,
]);

export type DriverOnboardingInput = z.infer<typeof driverOnboardingSchema>;
export type OperatorOnboardingInput = z.infer<typeof operatorOnboardingSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
