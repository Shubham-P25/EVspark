import { z } from "zod";

// Base coordinate validations
export const latSchema = z.coerce.number().min(-90).max(90);
export const lngSchema = z.coerce.number().min(-180).max(180);
export const radiusMSchema = z.coerce.number().min(1).max(50000);
export const limitSchema = z.coerce.number().int().min(1).max(200);

export const createStationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  operatorName: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100).optional().default("Maharashtra"),
  lat: latSchema,
  lng: lngSchema,
  pricePerKwh: z.coerce.number().min(0).max(1000).default(15.0),
  amenities: z.string().max(255).optional(),
  chargers: z
    .array(
      z.object({
        label: z.string().trim().max(50),
        connectorType: z.string().trim().max(50),
        powerKw: z.coerce.number().min(1).max(500),
      })
    )
    .optional(),
}).strip();

export const updateStationSchema = createStationSchema.partial().strip();

export const stationsQuerySchema = z.object({
  bbox: z.string().max(100).optional(),
  zoom: z.coerce.number().min(0).max(22).optional(),
  connector: z.string().max(50).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  city: z.string().max(100).optional(),
  minKw: z.coerce.number().min(0).max(500).optional(),
  maxPrice: z.coerce.number().min(0).max(1000).optional(),
  lat: latSchema.optional(),
  lng: lngSchema.optional(),
  radiusKm: z.coerce.number().min(0.1).max(500).optional(),
  limit: limitSchema.optional().default(200),
}).strip();

export const nearbyStationsQuerySchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  radius: radiusMSchema.optional().default(15000),
  radiusM: radiusMSchema.optional(),
  connector: z.string().max(50).optional(),
  limit: limitSchema.optional().default(30),
}).strip();

export const stationIdParamSchema = z.object({
  id: z.string().min(1).max(100),
}).strip();
