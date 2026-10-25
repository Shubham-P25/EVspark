export type Connector = 'CCS2' | 'CHAdeMO' | 'Type2' | 'GBT';
export type CarIntent = 'charge' | 'stay_only' | 'pass_by';
export type CarPhase = 'travelling' | 'entering' | 'parked' | 'charging' | 'leaving' | 'gone';
export type LeaveReason =
  | 'finished'
  | 'other_jobs'
  | 'reneged'
  | 'balked'
  | 'passed'
  | 'interrupted_left';
export type ChargerState = 'FREE' | 'BUSY' | 'FAULTED' | 'OFFLINE';
export type DisplayState = 'free' | 'busy' | 'offline' | 'closed' | 'unknown';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DemoCharger {
  id: string;
  connector: Connector;
  powerKw: number;
  state: ChargerState;
  carId: string | null;
  endsAt: number | null;
  ratedEnd: number | null;
  blocked: boolean;
}

export interface DemoCar {
  id: string;
  plate: string;
  connector: Connector;
  intent: CarIntent;
  phase: CarPhase;
  routeIdx: number;
  dist: number;
  pos: LatLng;
  target: LatLng | null;
  slot: number | null;
  chargerId: string | null;
  enteredFenceAt: number | null;
  parkedAt: number | null;
  patienceS: number;
  needKwh: number;
  maxKw: number;
  lingerS: number;
  leaveReason: LeaveReason | null;
}

export interface SimEvent {
  t: number;
  type:
    | 'spawn'
    | 'enter_fence'
    | 'park'
    | 'charge_start'
    | 'charge_end'
    | 'discard_other_jobs'
    | 'renege'
    | 'balk'
    | 'pass'
    | 'fault'
    | 'recover'
    | 'interrupt'
    | 'heartbeat_lost'
    | 'heartbeat_ok';
  carId?: string;
  chargerId?: string;
  text: string;
}

export interface StationSnapshot {
  stationId: string;
  t: number;
  display: DisplayState;
  waitMinutes: number | null;
  waitingCount: number;
  chargingCount: number;
  workingChargers: number;
  totalChargers: number;
  waitByPosition: number[];
  geofenceReliable: boolean;
  overloaded: boolean;
}

export interface SimKpis {
  arrivals: number;
  completed: number;
  balked: number;
  reneged: number;
  discardedOtherJobs: number;
  passed: number;
  utilisation: number;
  avgWaitS: number;
  throughputPerHour: number;
}
