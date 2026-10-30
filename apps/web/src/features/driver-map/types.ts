export type LatLng = { lat: number; lng: number };
export type StationStatus = 'free' | 'busy' | 'full' | 'offline';
export type ChargerState = 'free' | 'charging' | 'reserved' | 'offline';
export type Connector = 'CCS2' | 'Type2' | 'CHAdeMO' | 'GBT';

export type Charger = {
  id: string;
  label: string;
  connector: Connector;
  powerKw: number;
  pricePerKwh: number;
  state: ChargerState;
  progressPct: number | null;
  minutesLeft: number | null;
};

export type Station = LatLng & {
  id: string;
  name: string;
  address: string;
  operator: string;
  status: StationStatus;
  freeChargers: number;
  totalChargers: number;
  waitMin: number | null; // null when a charger is free
  queueAhead: number;
  distanceKm?: number;
  driveMin?: number;
  rating: number | null;
  ratingCount: number;
  open24h: boolean;
  minPrice: number;
  maxPowerKw: number;
  connectors: Connector[];
  photoUrl?: string;
  geofence: { radiusM: number };
  updatedAt: string; // ISO
};

export type StationDetail = Station & {
  chargers: Charger[];
  forecast: number[]; // next 60 min, 12 points (predicted wait, min)
  confidence: 'high' | 'medium' | 'low';
  amenities: string[];
  photos: string[];
  hours: string;
};

export type DemoCar = {
  id: string;
  lat: number;
  lng: number;
  heading: number;
  targetStationId: string | null;
  mode: 'driving' | 'queueing' | 'charging';
};

export type Filters = {
  freeNow: boolean;
  fast: boolean;
  connectors: Connector[];
  maxPrice: number | null;
  favOnly: boolean;
  open24h: boolean;
};

export type AlertItem = {
  id: string;
  type: 'charger_freed' | 'wait_increased' | 'geofence' | 'station_offline' | 'favourite_free';
  stationId: string;
  title: string;
  body: string;
  at: string;
};

export type RouteResult = {
  path: LatLng[];
  distanceKm: number;
  etaMin: number;
  waitOnArrivalMin: number | null;
  matchScore: number;
};

