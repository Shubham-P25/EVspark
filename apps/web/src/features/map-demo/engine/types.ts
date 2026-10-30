export type Vec = { x: number; y: number }; // metres; x = east, y = north
export type CarKind = 'CHARGER' | 'STAYER';
export type Phase = 'APPROACH' | 'INSIDE_MOVE' | 'PARKED' | 'CHARGING' | 'LEAVING' | 'STANDBY_ROAD';
export type QueueName = 'NONE' | 'CHARGING' | 'WAITING';
export type Tag = 'NONE' | 'SERVED' | 'OTHER_JOBS' | 'RENEGED' | 'BALKED' | 'LEFT_AFTER_STAY' | 'TIMEOUT';

export interface Path { pts: Vec[]; cum: number[]; len: number }
export interface Slot { id: string; kind: 'BAY' | 'PARK'; u: number; v: number; pos: Vec; occupant: number | null; chargerIdx?: number }
export interface Charger { idx: number; online: boolean; pendingOffline: boolean; holder: number | null; chargingSince: number | null }

export interface Car {
  id: number; kind: CarKind; stationId: string;
  phase: Phase; q: QueueName; tag: Tag; inside: boolean;
  path: Path; s: number; speed: number; pos: Vec; heading: number;
  next: Path | null; nextPhase: Phase | null;
  slot: Slot | null; route: Vec[];
  chargeS: number; patienceS: number; stayS: number; graceS: number;
  tSpawn: number; tEnter: number | null; tWaitStart: number | null; tOffer: number | null; tParked: number | null; heldS: number;
}

export interface StationInput {
  id: string; name: string; lat: number; lng: number; chargers: number;
  fence: { center: { lat: number; lng: number }; radiusM: number; gate: { lat: number; lng: number }; clearanceM: number; centerShifted: boolean };
  routes: [number, number][][]; // [lat,lng][]
}

export interface EngineConfig {
  seed: number; speed: number; // speed multiplier 1,2,5,10
  arrivalMeanS: number; chargerShare: number; // share of cars that really charge
  chargeS: [number, number]; stayS: [number, number]; patienceS: [number, number];
  offerGraceS: number;
  roadV: number; insideV: number; accel: number; brake: number;
  safeGap: number; hardSep: number; lookahead: number; laneOffsetRoad: number;
  maxCarsPerStation: number; holdTimeoutS: number;
  demoMinPerSimS: number; // UI conversion: demo minutes per simulated second
}

export type EventType =
  | 'SPAWN' | 'FENCE_ENTER' | 'CHARGING_Q_JOIN' | 'WAITING_Q_JOIN' | 'OFFERED' | 'PLUG_IN'
  | 'OTHER_JOBS' | 'RENEGED' | 'BALKED' | 'CHARGE_DONE' | 'LEFT_AFTER_STAY' | 'FAULT' | 'RESTORED' | 'TIMEOUT'
  | 'STANDBY_ROAD' | 'STANDBY_ADVANCE' | 'VISITOR_PARKED';
export interface EngineEvent { t: number; type: EventType; stationId: string; carId?: number; msg: string }

export interface StationStats {
  spawned: number; entered: number; plugged: number; served: number; otherJobs: number;
  reneged: number; balked: number; leftAfterStay: number; waitSum: number; waitN: number; maxWaiting: number;
}
