import type { SessionDTO } from "./types";
type Need = Pick<SessionDTO, "batteryKwh" | "socStart" | "socTarget">;
export const needKwh = (s: Need) => (s.batteryKwh * (s.socTarget - s.socStart)) / 100;
export function progressOf(s: SessionDTO, now: number): number {
  if (s.status === "COMPLETED") return 1;
  if (s.status !== "CHARGING" || !s.startedAt || !s.plannedDurationMs) return 0;
  return Math.max(0, Math.min(1, (now - Date.parse(s.startedAt)) / s.plannedDurationMs));
}
export const liveKwh = (s: SessionDTO, now: number) => (s.status === "COMPLETED" ? s.energyKwh : needKwh(s) * progressOf(s, now));
export const liveAmount = (s: SessionDTO, now: number) => (s.status === "COMPLETED" ? s.amount : liveKwh(s, now) * s.pricePerKwh);
export const socNow = (s: SessionDTO, now: number) => s.socStart + (s.socTarget - s.socStart) * progressOf(s, now);
export const etaMs = (s: SessionDTO, now: number) =>
  s.status === "CHARGING" && s.startedAt && s.plannedDurationMs ? Math.max(0, Date.parse(s.startedAt) + s.plannedDurationMs - now) : 0;
export function fmtDuration(ms: number) {
  const t = Math.max(0, Math.round(ms / 1000)); const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
export const inr = (n: number, d = 0) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
export const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`;
};