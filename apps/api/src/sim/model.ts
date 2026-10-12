// apps/api/src/sim/model.ts
// Pure simulation helpers. No database access in this file.

export type StationKind = "highway" | "mall" | "office" | "residential" | "hub";

export interface SimVehicle {
  name: string;
  batteryKwh: number;
  maxDcKw: number;
  maxAcKw: number;
}

// Approximate specs of common Indian EVs (good enough for simulation).
export const VEHICLES: SimVehicle[] = [
  { name: "Tata Nexon EV", batteryKwh: 30, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "Tata Tiago EV", batteryKwh: 24, maxDcKw: 25, maxAcKw: 3.3 },
  { name: "Tata Punch EV", batteryKwh: 35, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "Tata Curvv EV", batteryKwh: 45, maxDcKw: 70, maxAcKw: 7.2 },
  { name: "MG ZS EV", batteryKwh: 50, maxDcKw: 76, maxAcKw: 7.4 },
  { name: "Mahindra XUV400", batteryKwh: 39, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "Hyundai Kona Electric", batteryKwh: 39, maxDcKw: 50, maxAcKw: 7.2 },
  { name: "BYD Atto 3", batteryKwh: 60, maxDcKw: 80, maxAcKw: 7 },
  { name: "MG Windsor EV", batteryKwh: 38, maxDcKw: 45, maxAcKw: 7.4 },
];
const VEHICLE_WEIGHTS = [28, 12, 16, 8, 10, 9, 2, 5, 10];

// Demand curve per station kind. Index = hour of day (IST), value 0..1.
const CURVES: Record<StationKind, number[]> = {
  office:      [0.03,0.02,0.02,0.02,0.03,0.05, 0.12,0.35,0.7,0.9,0.8,0.6, 0.55,0.6,0.55,0.45,0.35,0.3, 0.2,0.12,0.08,0.06,0.04,0.03],
  mall:        [0.03,0.02,0.02,0.02,0.02,0.03, 0.05,0.08,0.12,0.2,0.35,0.55, 0.7,0.75,0.7,0.65,0.7,0.8, 0.95,1.0,0.85,0.6,0.3,0.1],
  highway:     [0.15,0.12,0.1,0.1,0.15,0.3, 0.5,0.7,0.8,0.75,0.7,0.75, 0.8,0.7,0.65,0.7,0.8,0.9, 0.85,0.7,0.5,0.35,0.25,0.18],
  residential: [0.25,0.2,0.15,0.1,0.1,0.1, 0.15,0.2,0.2,0.15,0.1,0.1, 0.1,0.1,0.1,0.15,0.25,0.5, 0.8,1.0,0.95,0.8,0.55,0.4],
  hub:         [0.08,0.06,0.05,0.05,0.07,0.15, 0.3,0.55,0.75,0.8,0.7,0.65, 0.7,0.7,0.65,0.6,0.7,0.85, 0.95,0.9,0.7,0.45,0.25,0.12],
};

const WEEKEND_FACTOR: Record<StationKind, number> = {
  office: 0.35,
  mall: 1.25,
  highway: 1.2,
  residential: 1.1,
  hub: 1.0,
};

// Arrivals per charger per hour at the busiest hour (curve value 1.0).
const PEAK_ARRIVALS_PER_CHARGER_HOUR = 1.4;

// ---------- random helpers ----------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randNormal(rng: () => number, mean: number, sd: number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function poisson(rng: () => number, lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L && k < 200);
  return k - 1;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- time helpers (IST = UTC+5:30) ----------
export function istParts(d: Date): { hour: number; dow: number; key: string } {
  const x = new Date(d.getTime() + 5.5 * 3600 * 1000);
  return { hour: x.getUTCHours(), dow: x.getUTCDay(), key: x.toISOString().slice(0, 10) };
}

// ---------- station helpers ----------
export function inferStationKind(s: { id: string; name: string; amenities?: string | null }): StationKind {
  const n = s.name.toLowerCase();
  if (/mall|plaza|centre|center|city ?center|market|inorbit|phoenix/.test(n)) return "mall";
  if (/highway|expressway|toll|fuel|petrol|bpcl|hpcl|indian ?oil|shell|jio-?bp|dhaba|nh ?\d/.test(n)) return "highway";
  if (/tech|park|office|corporate|bkc|business|it ?park|campus/.test(n)) return "office";
  if (/apartment|society|residen|housing|heights|towers/.test(n)) return "residential";
  const pick: StationKind[] = ["mall", "office", "highway", "hub", "hub"];
  return pick[hashString(s.id) % pick.length];
}

// 0.6 .. 1.29 — some stations are simply more popular than others.
export function popularity(stationId: string): number {
  return 0.6 + (hashString(stationId) % 70) / 100;
}

export function isDcCharger(c: { powerKw: number }): boolean {
  return c.powerKw >= 20;
}

export function expectedArrivals(
  kind: StationKind,
  chargerCount: number,
  hour: number,
  dow: number,
  pop: number
): number {
  const weekend = dow === 0 || dow === 6;
  const w = weekend ? WEEKEND_FACTOR[kind] : 1;
  return CURVES[kind][hour] * w * chargerCount * PEAK_ARRIVALS_PER_CHARGER_HOUR * pop;
}

// ---------- vehicle + charging ----------
export function pickVehicle(rng: () => number): SimVehicle {
  const total = VEHICLE_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < VEHICLES.length; i++) {
    r -= VEHICLE_WEIGHTS[i];
    if (r <= 0) return VEHICLES[i];
  }
  return VEHICLES[0];
}

// Power (kW) delivered at a given state of charge. Flat until 80%, then tapers.
export function chargePowerKw(chargerKw: number, vehicle: SimVehicle, dc: boolean, soc: number): number {
  const vehMax = dc ? vehicle.maxDcKw : vehicle.maxAcKw;
  const cap = Math.max(1, Math.min(chargerKw, vehMax > 0 ? vehMax : chargerKw));
  let f = 1;
  if (soc < 10) f = 0.85 + soc * 0.015;
  else if (soc > 80) f = Math.max(0.2, 1 - ((soc - 80) / 20) * 0.8);
  return cap * f;
}

export interface SimulatedSession {
  socStart: number;
  socEnd: number;
  durationMin: number;
  energyKwh: number; // energy billed (grid side)
  avgKw: number;
}

export function simulateSession(
  rng: () => number,
  charger: { powerKw: number },
  vehicle: SimVehicle
): SimulatedSession {
  const dc = isDcCharger(charger);
  const socStart = clamp(randNormal(rng, 28, 14), 5, 70);
  const target = dc
    ? clamp(randNormal(rng, 80, 6), socStart + 10, 95)
    : clamp(randNormal(rng, 92, 6), socStart + 10, 100);

  let soc = socStart;
  let minutes = 0;
  let gridKwh = 0;
  while (soc < target && minutes < 720) {
    const p = chargePowerKw(charger.powerKw, vehicle, dc, soc);
    const stepKwh = p / 60; // one minute
    gridKwh += stepKwh;
    soc += ((stepKwh * 0.94) / vehicle.batteryKwh) * 100; // 94% efficiency into battery
    minutes++;
  }
  const durationMin = Math.max(minutes, 5);
  return {
    socStart: +socStart.toFixed(1),
    socEnd: +Math.min(soc, 100).toFixed(1),
    durationMin,
    energyKwh: +gridKwh.toFixed(2),
    avgKw: +((gridKwh / durationMin) * 60).toFixed(1),
  };
}

export function sampleSocRange(rng: () => number, charger: { powerKw: number }): { socStart: number; target: number } {
  const dc = isDcCharger(charger);
  const socStart = clamp(randNormal(rng, 28, 14), 5, 70);
  const target = dc
    ? clamp(randNormal(rng, 80, 6), socStart + 10, 95)
    : clamp(randNormal(rng, 92, 6), socStart + 10, 100);
  return { socStart, target };
}

