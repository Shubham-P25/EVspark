import prisma from "../lib/prisma";
import { Prisma } from "../generated/prisma/client";

export interface StationListRecord {
  id: string;
  name: string;
  operatorName: string;
  lat: number;
  lng: number;
  city: string | null;
  pricePerKwh: number;
  status: string;
  distanceM?: number;
  chargersCount?: {
    FREE: number;
    BUSY: number;
    MAINTENANCE: number;
    FAULTED: number;
    OFFLINE: number;
    total: number;
  };
}

export interface BboxParams {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  limit?: number;
  connector?: string;
  status?: string;
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusM?: number;
  limit?: number;
  connector?: string;
  status?: string;
}

/**
 * Attaches charger status counts per station in a single grouped query (no N+1).
 */
async function attachChargerAggregates(stations: StationListRecord[]): Promise<StationListRecord[]> {
  if (stations.length === 0) return stations;

  const stationIds = stations.map((s) => s.id);
  const aggregates = await prisma.charger.groupBy({
    by: ["stationId", "status"],
    where: { stationId: { in: stationIds } },
    _count: { id: true },
  });

  const countMap = new Map<string, Record<string, number>>();
  for (const agg of aggregates) {
    if (!countMap.has(agg.stationId)) {
      countMap.set(agg.stationId, { FREE: 0, BUSY: 0, MAINTENANCE: 0, FAULTED: 0, OFFLINE: 0, total: 0 });
    }
    const current = countMap.get(agg.stationId)!;
    current[agg.status] = (current[agg.status] || 0) + agg._count.id;
    current.total += agg._count.id;
  }

  for (const station of stations) {
    station.chargersCount = (countMap.get(station.id) as any) || {
      FREE: 0,
      BUSY: 0,
      MAINTENANCE: 0,
      FAULTED: 0,
      OFFLINE: 0,
      total: 0,
    };
  }

  return stations;
}

export async function findStationsInBbox({
  minLng,
  minLat,
  maxLng,
  maxLat,
  limit = 200,
  status = "APPROVED",
}: BboxParams): Promise<StationListRecord[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 200);

  const stations = await prisma.$queryRaw<StationListRecord[]>`
    SELECT 
      id, 
      name, 
      "operatorName", 
      lat, 
      lng, 
      city, 
      "pricePerKwh", 
      status
    FROM "Station"
    WHERE 
      status = ${status}::"StationStatus"
      AND location && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography
    LIMIT ${boundedLimit};
  `;

  return attachChargerAggregates(stations);
}

export async function findNearbyStations({
  lat,
  lng,
  radiusM = 15000,
  limit = 50,
  status = "APPROVED",
}: NearbyParams): Promise<StationListRecord[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const boundedRadius = Math.min(Math.max(radiusM, 100), 50000);

  const stations = await prisma.$queryRaw<StationListRecord[]>`
    SELECT 
      id, 
      name, 
      "operatorName", 
      lat, 
      lng, 
      city, 
      "pricePerKwh", 
      status,
      ROUND(ST_Distance(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography))::int AS "distanceM"
    FROM "Station"
    WHERE 
      status = ${status}::"StationStatus"
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${boundedRadius})
    ORDER BY location <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    LIMIT ${boundedLimit};
  `;

  return attachChargerAggregates(stations);
}
