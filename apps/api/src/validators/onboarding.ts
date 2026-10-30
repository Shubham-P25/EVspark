import { z } from "zod";

export const CONNECTORS = ["CCS2", "TYPE2", "CHADEMO", "GBT", "BHARAT_AC001", "BHARAT_DC001"] as const;
export const CONNECTOR_LABEL: Record<(typeof CONNECTORS)[number], string> = {
  CCS2: "CCS2 (DC fast)", TYPE2: "Type 2 (AC)", CHADEMO: "CHAdeMO", GBT: "GB/T", BHARAT_AC001: "Bharat AC-001", BHARAT_DC001: "Bharat DC-001",
};
export const CITIES = ["Mumbai", "Navi Mumbai", "Thane", "Pune", "Delhi NCR", "Bengaluru", "Hyderabad", "Chennai", "Other"] as const;
export const AMENITIES = ["Restroom", "Cafe", "Wi-Fi", "Covered parking", "24x7 security", "Lounge", "EV mechanic"] as const;
export const HABITS = ["Home", "Office", "Public fast chargers", "Highway trips"] as const;

const connector = z.enum(CONNECTORS);
const phoneRe = /^(\+91)?[6-9]\d{9}$/;
const phoneOpt = z.string().trim().refine((v) => v === "" || phoneRe.test(v), "Enter a valid 10-digit mobile number");
const phoneReq = z.string().trim().regex(phoneRe, "Enter a valid 10-digit mobile number");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const driverStep1 = z.object({
  displayName: z.string().trim().min(2, "Tell us what to call you").max(60),
  phone: phoneOpt,
  city: z.enum(CITIES, { message: "Pick your city" }),
});
export const driverStep2 = z.object({
  vehicle: z.object({
    make: z.string().trim().min(2, "Required").max(40),
    model: z.string().trim().min(1, "Required").max(40),
    batteryKwh: z.number().min(5, "Min 5 kWh").max(200, "Max 200 kWh"),
    connector,
    maxDcKw: z.number().min(3).max(350),
    plate: z.string().trim().regex(/^[A-Za-z0-9 -]{6,14}$/, "e.g. MH 02 AB 1234"),
  }),
});
export const driverStep3 = z.object({
  prefs: z.object({
    maxPricePerKwh: z.number().min(5).max(60),
    habits: z.array(z.string()).max(4),
    notifyWait: z.boolean(),
    notifyOffers: z.boolean(),
  }),
});
export const driverSchema = z.object({ ...driverStep1.shape, ...driverStep2.shape, ...driverStep3.shape });

export const operatorStep1 = z.object({
  displayName: z.string().trim().min(2, "Tell us what to call you").max(60),
  businessName: z.string().trim().min(2, "Business name is required").max(80),
  phone: phoneReq,
  gstin: z.string().trim().refine((v) => v === "" || /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v.toUpperCase()), "Invalid GSTIN"),
});
export const operatorStep2 = z.object({
  station: z.object({
    name: z.string().trim().min(3, "Station name is required").max(80),
    address: z.string().trim().min(8, "Add the full address").max(200),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    open24h: z.boolean(),
    opensAt: hhmm,
    closesAt: hhmm,
    amenities: z.array(z.string()).max(10),
  }),
});
export const operatorStep3 = z.object({
  chargers: z.array(z.object({
    connector,
    powerKw: z.number().min(3, "Min 3 kW").max(400),
    pricePerKwh: z.number().min(1, "Min ₹1").max(100),
    count: z.number().int().min(1).max(12),
  })).min(1, "Add at least one charger type").max(6)
    .refine((a) => a.reduce((s, c) => s + c.count, 0) <= 24, "A station can have at most 24 chargers"),
});
export const operatorSchema = z.object({ ...operatorStep1.shape, ...operatorStep2.shape, ...operatorStep3.shape });

export type DriverData = z.infer<typeof driverSchema>;
export type OperatorData = z.infer<typeof operatorSchema>;

