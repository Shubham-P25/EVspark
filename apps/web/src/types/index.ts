export type ConnectorType = "Type2" | "CCS2" | "CHAdeMO";
export type ChargerStatus = "free" | "busy" | "maintenance";
export type StationStatus = "green" | "yellow" | "red";
export type UserRole = "driver" | "operator" | "admin";

export interface Charger {
  id: string;
  label: string;
  connectorType: ConnectorType;
  powerKw: number;
  status: ChargerStatus;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  operatorName: string;
  chargers: Charger[];
  queueLength: number;
  predictedWaitMin: number;
  pricePerKwh: number;
  rating: number;
  reviewCount: number;
  amenities: { restroom: boolean; food: boolean; wifi: boolean; parking: boolean };
  status: StationStatus;
  operatingHours: string;
  updatedAt: string;
}

export interface RecommendedStation extends Station {
  distanceKm: number;
  driveTimeMin: number;
  score: number;
}

export interface AnalyticsData {
  dailySessions: { date: string; count: number; revenue: number }[];
  hourlyPeak: { hour: number; avgQueue: number }[];
  totalRevenue: number;
  totalSessions: number;
  avgRating: number;
}

export interface ApprovalItem {
  id: string;
  stationName: string;
  operatorName: string;
  address: string;
  lat: number;
  lng: number;
  chargerCount: number;
  connectorTypes: ConnectorType[];
  pricePerKwh: number;
  submittedAt: string;
  photoUrl?: string;
}

export interface NetworkStats {
  totalStations: number;
  activeStations: number;
  totalSessions: number;
  networkRevenue: number;
  avgUtilization: number;
  modelAccuracy: number;
}