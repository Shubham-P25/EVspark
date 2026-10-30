import { z } from "zod";

export const phoneRegex = /^[6-9]\d{9}$/;
export const vehicleRegNoRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
export const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const pincodeRegex = /^[1-9][0-9]{5}$/;

export const LANGUAGES = ["en", "hi", "mr"] as const;
export const VEHICLE_OWNERSHIP = ["OWNED", "FLEET", "RENTAL"] as const;
export const CHARGE_TIMES = ["MORNING", "AFTERNOON", "EVENING", "NIGHT"] as const;
export const NOTIFY_CHANNELS = ["PUSH", "EMAIL", "SMS"] as const;
export const DRIVER_AMENITIES = ["WiFi", "Cafe", "Restroom", "Parking", "Food Court", "Mall", "Lounge", "24x7 Staff"] as const;
export const BUSINESS_TYPES = ["INDIVIDUAL", "COMPANY", "MALL_OR_HOTEL", "FUEL_STATION", "FLEET_OPERATOR"] as const;
export const PAYMENT_METHODS = ["UPI", "CARD", "APP_WALLET", "CASH"] as const;
export const INTEGRATIONS = ["OCPP", "MANUAL", "PLANNING"] as const;
export const ACCESS_TYPES = ["PUBLIC", "CUSTOMERS_ONLY", "RESTRICTED"] as const;

export const driverOnboardingSchema = z.object({
  role: z.literal("DRIVER"),
  // About
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(60),
  phone: z.string().regex(phoneRegex, "Please enter a valid 10-digit Indian phone number"),
  city: z.string().min(1, "City is required"),
  language: z.enum(LANGUAGES).default("en"),
  // Vehicle
  vehicleModelId: z.string().min(1, "Vehicle selection is required"),
  vehicleRegNo: z
    .string()
    .transform((val) => val.toUpperCase().replace(/\s+/g, ""))
    .pipe(z.string().regex(vehicleRegNoRegex, "Invalid vehicle registration number format (e.g. MH12AB1234)")),
  vehicleOwnership: z.enum(VEHICLE_OWNERSHIP).default("OWNED"),
  batteryPct: z.number().min(0).max(100).default(50),
  connectors: z.array(z.string()).min(1, "At least one connector type is required"),
  // Habits
  preferredCharging: z.enum(["AC", "DC", "EITHER"]).default("EITHER"),
  hasHomeCharger: z.boolean().default(false),
  dailyKm: z.number().int().min(0).max(1000).optional().nullable(),
  maxWaitMin: z.number().int().min(0).max(360).optional().nullable(),
  minKw: z.number().min(0).optional().nullable(),
  maxPriceKwh: z.number().min(0).max(1000).optional().nullable(),
  preferredTimes: z.array(z.enum(CHARGE_TIMES)).default([]),
  amenityPrefs: z.array(z.string()).default([]),
  // Places
  homeLat: z.number(),
  homeLng: z.number(),
  homeLabel: z.string().min(1, "Home address label is required"),
  workLat: z.number().optional().nullable(),
  workLng: z.number().optional().nullable(),
  workLabel: z.string().optional().nullable(),
  // Alerts
  notifications: z.boolean().optional().default(true),
  notifyChannels: z.array(z.enum(NOTIFY_CHANNELS)).default(["PUSH"]),
  acceptTerms: z.literal(true, { error: "You must accept the terms to continue" }),
});

export const operatorChargerInputSchema = z.object({
  label: z.string().trim().max(50).optional(),
  connectorType: z.string().min(1, "Connector type required"),
  powerKw: z.number().positive("Power must be positive").max(500),
});

export const operatorOnboardingSchema = z.object({
  role: z.literal("OPERATOR"),
  // Business
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(80),
  businessType: z.enum(BUSINESS_TYPES).default("COMPANY"),
  contactName: z.string().trim().min(2, "Contact person name must be at least 2 characters").max(60),
  phone: z.string().regex(phoneRegex, "Please enter a valid 10-digit Indian phone number"),
  supportEmail: z.string().email("Enter a valid support email").optional().nullable(),
  gstin: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || gstinRegex.test(val), "Invalid GSTIN format"),
  // Station
  stationName: z.string().trim().min(2, "Station name must be at least 2 characters").max(80),
  description: z.string().trim().max(280).optional().nullable(),
  address: z.string().trim().min(5, "Full address is required").max(200),
  landmark: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().regex(pincodeRegex, "Enter a valid 6-digit PIN code"),
  lat: z.number(),
  lng: z.number(),
  city: z.string().min(1, "City is required"),
  photoUrl: z.string().url().optional().nullable(),
  parkingSlots: z.number().int().min(0).max(500).optional().nullable(),
  accessType: z.enum(ACCESS_TYPES).default("PUBLIC"),
  // Chargers
  chargers: z.array(operatorChargerInputSchema).min(1, "At least one charger is required").max(24, "Maximum 24 chargers at onboarding"),
  // Pricing
  pricePerKwh: z.number().positive("Tariff must be positive").max(1000),
  idleFeePerMin: z.number().min(0).max(100).optional().nullable(),
  hours: z.string().min(3).max(40).default("24/7"),
  amenities: z.array(z.string()).optional().default([]),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).default(["UPI"]),
  // Integration
  integration: z.enum(INTEGRATIONS).default("MANUAL"),
  acceptTerms: z.literal(true, { error: "You must accept the terms to continue" }),
});

export const onboardingSchema = z.discriminatedUnion("role", [
  driverOnboardingSchema,
  operatorOnboardingSchema,
]);

export type DriverOnboardingInput = z.infer<typeof driverOnboardingSchema>;
export type OperatorOnboardingInput = z.infer<typeof operatorOnboardingSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
