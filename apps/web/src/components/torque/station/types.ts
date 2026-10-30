export type ChargerStatus = "AVAILABLE" | "CHARGING" | "MAINTENANCE" | "OFFLINE";
export type SessionStatus = "QUEUED" | "CHARGING" | "COMPLETED" | "CANCELLED";
export interface ChargerDTO { id: string; label: string; connector: string; powerKw: number; pricePerKwh: number; status: ChargerStatus; }
export interface SessionDTO {
  id: string; chargerId: string | null; vehicleLabel: string; plate: string; batteryKwh: number;
  socStart: number; socTarget: number; powerKw: number; pricePerKwh: number; status: SessionStatus;
  source: "WALKIN" | "APP" | "DEMO"; queuedAt: string; startedAt: string | null; endedAt: string | null;
  plannedDurationMs: number | null; energyKwh: number; amount: number;
}
export interface ActivityDTO { id: string; kind: string; message: string; createdAt: string; tone: "ok" | "info" | "warn" | "bad"; }
export interface StatsDTO { sessionsToday: number; avgWaitMin: number; hourlyRevenue: number[]; }
export interface StationSnapshot {
  station: { id: string; name: string; address: string; isDemo: boolean; open24h: boolean };
  chargers: ChargerDTO[]; sessions: SessionDTO[]; stats: StatsDTO; activity: ActivityDTO[]; serverTime: string;
}