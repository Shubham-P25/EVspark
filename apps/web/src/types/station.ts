export type StationStatus = "available" | "busy" | "offline";

export interface EVStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: StationStatus;
  pricePerKwh: number;
  powerKw: number;
  connectorType: string;
  availableSlots: number;
  totalSlots: number;
  amenities: string[];
  rating: number;
  network: string;
  distanceKm?: number;
  etaMinutes?: number;
}