import { z } from "zod";

export type PinColor = "green" | "orange" | "red" | "grey";
export type LiveSource = "google" | "twin" | "none";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  free: number;
  usable: number;
  total: number;
  maxKw: number;
  color: PinColor;
  source: LiveSource;
  updatedAt: number; // epoch ms
}

export function pinState(free: number, usable: number): PinColor {
  if (usable <= 0) return "grey";
  if (free <= 0) return "red";
  if (free >= usable) return "green";
  return "orange";
}

// Compact wire format: [id, lat, lng, free, usable, total, maxKw, source(0|1|2), updatedAtSec]
export type PinTuple = [
  id: string,
  lat: number,
  lng: number,
  free: number,
  usable: number,
  total: number,
  maxKw: number,
  source: 0 | 1 | 2,
  updatedAtSec: number
];

const SOURCE_NUM_TO_NAME: Record<0 | 1 | 2, LiveSource> = {
  0: "google",
  1: "twin",
  2: "none",
};

const SOURCE_NAME_TO_NUM: Record<LiveSource, 0 | 1 | 2> = {
  google: 0,
  twin: 1,
  none: 2,
};

export function tupleToPin(t: PinTuple): Pin {
  const [id, lat, lng, free, usable, total, maxKw, sourceNum, updatedAtSec] = t;
  const source = SOURCE_NUM_TO_NAME[sourceNum] ?? "none";
  return {
    id,
    lat,
    lng,
    free,
    usable,
    total,
    maxKw,
    color: pinState(free, usable),
    source,
    updatedAt: updatedAtSec * 1000,
  };
}

export function pinToTuple(p: Pin): PinTuple {
  return [
    p.id,
    p.lat,
    p.lng,
    p.free,
    p.usable,
    p.total,
    p.maxKw,
    SOURCE_NAME_TO_NUM[p.source] ?? 2,
    Math.floor(p.updatedAt / 1000),
  ];
}

export const PIN_HEX: Record<PinColor, string> = {
  green: "#1E8E3E",
  orange: "#E8710A",
  red: "#D93025",
  grey: "#80868B",
};

export const pinsQuerySchema = z.object({
  z: z.coerce.number().int().min(10).max(14),
  x: z.coerce.number().int().min(0),
  y: z.coerce.number().int().min(0),
  connector: z.string().optional(),
});

export type PinsQuery = z.infer<typeof pinsQuerySchema>;
