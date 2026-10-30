'use client';

import { useQuery } from '@tanstack/react-query';
import { useDriverMap } from '../store';
import type { Station, Connector, StationStatus } from '../types';

// Fallback Mumbai charging hubs (ensures seamless UI even when offline / cold)
const MOCK_MUMBAI_STATIONS: Station[] = [
  {
    id: 'st-bandra-hub',
    name: 'Jio World Drive EV Hub',
    address: 'BKC, Bandra Kurla Complex, Mumbai',
    operator: 'Jio-bp pulse',
    lat: 19.0664,
    lng: 72.8683,
    status: 'free',
    freeChargers: 4,
    totalChargers: 6,
    waitMin: null,
    queueAhead: 0,
    distanceKm: 1.4,
    driveMin: 5,
    rating: 4.8,
    ratingCount: 320,
    open24h: true,
    minPrice: 17,
    maxPowerKw: 120,
    connectors: ['CCS2', 'Type2'],
    geofence: { radiusM: 100 },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'st-worli-sea',
    name: 'Worli Sea Face Fast Supercharger',
    address: 'Worli Sea Face Road, Mumbai',
    operator: 'Tata Power EZ Charge',
    lat: 19.0068,
    lng: 72.8152,
    status: 'free',
    freeChargers: 2,
    totalChargers: 4,
    waitMin: null,
    queueAhead: 0,
    distanceKm: 4.8,
    driveMin: 12,
    rating: 4.6,
    ratingCount: 194,
    open24h: true,
    minPrice: 16,
    maxPowerKw: 60,
    connectors: ['CCS2', 'CHAdeMO'],
    geofence: { radiusM: 120 },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'st-andheri-metro',
    name: 'Andheri West Metro Station Charger',
    address: 'Link Road, Andheri West, Mumbai',
    operator: 'Statiq Power',
    lat: 19.1205,
    lng: 72.8335,
    status: 'busy',
    freeChargers: 1,
    totalChargers: 4,
    waitMin: 6,
    queueAhead: 1,
    distanceKm: 7.2,
    driveMin: 18,
    rating: 4.4,
    ratingCount: 112,
    open24h: true,
    minPrice: 15,
    maxPowerKw: 60,
    connectors: ['CCS2', 'Type2'],
    geofence: { radiusM: 90 },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'st-powai-lake',
    name: 'Hiranandani Tech Park Hub',
    address: 'Central Ave, Hiranandani Gardens, Powai',
    operator: 'ChargeZone',
    lat: 19.1176,
    lng: 72.906,
    status: 'full',
    freeChargers: 0,
    totalChargers: 4,
    waitMin: 14,
    queueAhead: 2,
    distanceKm: 8.9,
    driveMin: 22,
    rating: 4.7,
    ratingCount: 245,
    open24h: true,
    minPrice: 18,
    maxPowerKw: 150,
    connectors: ['CCS2', 'Type2', 'CHAdeMO'],
    geofence: { radiusM: 100 },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'st-nariman-point',
    name: 'CR2 Mall Nariman Point Hub',
    address: 'Barrister Rajni Patel Marg, Nariman Point',
    operator: 'Fortum Charge & Drive',
    lat: 18.9288,
    lng: 72.8228,
    status: 'free',
    freeChargers: 3,
    totalChargers: 4,
    waitMin: null,
    queueAhead: 0,
    distanceKm: 12.1,
    driveMin: 28,
    rating: 4.5,
    ratingCount: 88,
    open24h: false,
    minPrice: 19,
    maxPowerKw: 50,
    connectors: ['CCS2'],
    geofence: { radiusM: 80 },
    updatedAt: new Date().toISOString(),
  },
];

function normalizeStation(raw: any): Station {
  const chargers = Array.isArray(raw.chargers) ? raw.chargers : [];
  const rawConnectors: string[] = Array.isArray(raw.connectors)
    ? raw.connectors
    : chargers.map((c: any) => c.connectorType || c.connector).filter(Boolean);

  const parsedConnectors: Connector[] = rawConnectors.map((c: string) => {
    const upper = String(c).toUpperCase();
    if (upper.includes('CCS')) return 'CCS2';
    if (upper.includes('TYPE2') || upper.includes('TYPE 2') || upper.includes('TYPE_2')) return 'Type2';
    if (upper.includes('CHADEMO')) return 'CHAdeMO';
    if (upper.includes('GBT') || upper.includes('GB/T')) return 'GBT';
    return 'CCS2';
  });

  const connectors: Connector[] = parsedConnectors.length > 0 ? Array.from(new Set(parsedConnectors)) : ['CCS2'];

  const freeCount = raw.freeChargers ?? raw.availableChargers ?? raw.availableSlots ?? 0;
  const totalCount = raw.totalChargers ?? raw.totalSlots ?? (chargers.length || 2);
  const waitMinutes = raw.waitMin ?? raw.waitMinutes ?? raw.predictedWaitMinutes ?? null;

  let status: StationStatus = 'free';
  if (raw.status === 'offline' || raw.status === 'FAULTED') {
    status = 'offline';
  } else if (freeCount > 0) {
    status = 'free';
  } else if (raw.isOverloaded || (waitMinutes != null && waitMinutes > 15)) {
    status = 'full';
  } else {
    status = 'busy';
  }

  return {
    id: String(raw.id),
    name: raw.name || 'Charging Station',
    address: raw.address || raw.city || 'Mumbai, Maharashtra',
    operator: raw.operator || raw.operatorName || 'EVspark Network',
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    status,
    freeChargers: Number(freeCount),
    totalChargers: Number(totalCount),
    waitMin: freeCount > 0 ? null : waitMinutes,
    queueAhead: Number(raw.queueAhead ?? raw.incomingVehicles ?? 0),
    distanceKm: raw.distanceKm != null ? Number(raw.distanceKm) : undefined,
    driveMin: raw.driveMin != null ? Number(raw.driveMin) : (raw.distanceKm ? Math.round(Number(raw.distanceKm) * 2.5) : undefined),
    rating: raw.rating != null ? Number(raw.rating) : 4.5,
    ratingCount: Number(raw.ratingCount ?? 42),
    open24h: raw.open24h ?? true,
    minPrice: Number(raw.minPrice ?? raw.pricePerKwh ?? 16),
    maxPowerKw: Number(raw.maxPowerKw ?? raw.powerKw ?? 60),
    connectors,
    photoUrl: raw.photoUrl,
    geofence: raw.geofence ?? { radiusM: raw.geofenceRadiusM ?? 100 },
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function useStations(bounds: google.maps.LatLngBoundsLiteral | null) {
  const filters = useDriverMap((s) => s.filters);
  const favs = useDriverMap((s) => s.favourites);
  const key = bounds
    ? [bounds.west, bounds.south, bounds.east, bounds.north]
        .map((n) => n.toFixed(2))
        .join(',')
    : 'default';

  const q = useQuery({
    queryKey: ['stations', key],
    staleTime: 4000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<Station[]> => {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/stations${bounds ? `?bbox=${key}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map(normalizeStation);
          }
        }
      } catch {
        // Fallback to local stations
      }
      return MOCK_MUMBAI_STATIONS;
    },
  });

  const rawStations = q.data ?? MOCK_MUMBAI_STATIONS;

  const stations = rawStations.filter((s) => {
    if (filters.freeNow && s.status !== 'free') return false;
    if (filters.fast && (s.maxPowerKw ?? 0) < 50) return false;
    if (filters.open24h && !s.open24h) return false;
    if (filters.favOnly && !favs.has(s.id)) return false;
    if (filters.maxPrice != null && (s.minPrice ?? 0) > filters.maxPrice) return false;
    if (
      filters.connectors.length > 0 &&
      !filters.connectors.some((c) => (s.connectors ?? []).includes(c))
    ) {
      return false;
    }
    return true;
  });

  return { stations, isLoading: q.isLoading };
}
