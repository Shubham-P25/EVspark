export type ConnectorType = 'CCS2' | 'Type2' | 'CHAdeMO' | 'Ather Grid' | 'Ola Hypercharger' | 'Bharat AC001';

export type ChargerStatus = 'FREE' | 'BUSY' | 'MAINTENANCE' | 'FAULTED' | 'OFFLINE';

export type StationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ChargerInfo {
  id: string;
  label?: string | null;
  connectorType: string;
  powerKw: number;
  status: ChargerStatus;
  currentSessionMinutesRemaining?: number;
}

export interface StationWithWait {
  id: string;
  name: string;
  operatorName: string;
  lat: number;
  lng: number;
  address?: string | null;
  city?: string | null;
  pricePerKwh: number;
  ratingAvg?: number | null;
  status: StationStatus;
  chargers: ChargerInfo[];
  queueLength: number;
  currentWaitMinutes: number;
  predictedWaitMinutes: number;
  markerColor: 'green' | 'yellow' | 'red';
  isOverloaded: boolean;
  distanceKm?: number;
  etaMinutes?: number;
  fuelScore?: number;
}
