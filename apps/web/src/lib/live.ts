export type ChargerStatus = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";

export interface ActiveSession {
  startTs: string;
  estimatedEndTs: string;
  socStart?: number | null;
  socNow?: number | null;
  kwNow?: number | null;
  energyKwh?: number | null;
  amountInr?: number | null;
  vehicleModel?: string | null;
  regMasked?: string | null;
}

export interface LiveCharger {
  id: string;
  label?: string | null;
  connectorType: string;
  powerKw: number;
  status: ChargerStatus;
  activeSession?: ActiveSession | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function remainingSec(c: LiveCharger, nowMs: number): number | null {
  if (!c.activeSession?.estimatedEndTs) return null;
  return Math.max(0, Math.round((Date.parse(c.activeSession.estimatedEndTs) - nowMs) / 1000));
}

export type StationWait =
  | { kind: "free" }
  | { kind: "wait"; seconds: number; queue: number }
  | { kind: "unavailable" };

/** "-" when any usable charger is free; otherwise time until the earliest charger frees. */
export function stationWait(chargers: LiveCharger[], queueLength: number, nowMs: number): StationWait {
  const usable = chargers.filter((c) => c.status === "FREE" || c.status === "BUSY");
  if (usable.length === 0) return { kind: "unavailable" };
  if (usable.some((c) => c.status === "FREE")) return { kind: "free" };
  const rem = usable
    .map((c) => remainingSec(c, nowMs))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  if (rem.length === 0) return { kind: "unavailable" };
  return { kind: "wait", seconds: rem[0], queue: queueLength };
}

/** Smooth SoC between server updates: from socNow at updatedAtMs linearly to 100% at estimatedEndTs. */
export function liveSoc(s: ActiveSession, updatedAtMs: number, nowMs: number): number {
  const base = s.socNow ?? s.socStart ?? 0;
  if (!s.estimatedEndTs) return base;
  const end = Date.parse(s.estimatedEndTs);
  const span = end - updatedAtMs;
  if (span <= 0) return 100;
  return clamp(base + (100 - base) * ((nowMs - updatedAtMs) / span), 0, 100);
}

/** kWh delivered so far, extrapolated from the last server value and current power. */
export function liveEnergyKwh(s: ActiveSession, updatedAtMs: number, nowMs: number): number {
  const base = s.energyKwh ?? 0;
  const kw = s.kwNow ?? 0;
  return base + (kw * Math.max(0, nowMs - updatedAtMs)) / 3_600_000;
}

/** Revenue that keeps rising every second: completed + active sessions extrapolated. */
export function liveRevenue(
  completedInr: number,
  sessions: ActiveSession[],
  tariff: number,
  updatedAtMs: number,
  nowMs: number
) {
  const active = sessions.reduce((sum, s) => sum + liveEnergyKwh(s, updatedAtMs, nowMs) * tariff, 0);
  return completedInr + active;
}
