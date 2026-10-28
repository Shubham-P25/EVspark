import prisma from "../lib/prisma";

export interface PinRow {
  id: string;
  lat: number;
  lng: number;
  free: bigint | number;
  usable: bigint | number;
  total: bigint | number;
  max_kw: number;
  has_ocpp: boolean | null;
  google_place_id: string | null;
}

export async function findPinsInBbox(
  west: number,
  south: number,
  east: number,
  north: number,
  connector?: string
): Promise<PinRow[]> {
  if (connector) {
    return prisma.$queryRaw<PinRow[]>`
      SELECT s.id, s.lat, s.lng, s."googlePlaceId" AS google_place_id,
             COUNT(c.id) FILTER (WHERE c."status" = 'FREE')           AS free,
             COUNT(c.id) FILTER (WHERE c."status" IN ('FREE','BUSY')) AS usable,
             COUNT(c.id)                                               AS total,
             COALESCE(MAX(c."powerKw"), 0)::float                      AS max_kw,
             BOOL_OR(c."ocppId" IS NOT NULL)                           AS has_ocpp
      FROM "Station" s
      LEFT JOIN "Charger" c ON c."stationId" = s.id AND c."connectorType" = ${connector}
      WHERE s.status = 'APPROVED'
        AND s.location && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)::geography
      GROUP BY s.id
      HAVING COUNT(c.id) > 0
      LIMIT 400;
    `;
  }

  return prisma.$queryRaw<PinRow[]>`
    SELECT s.id, s.lat, s.lng, s."googlePlaceId" AS google_place_id,
           COUNT(c.id) FILTER (WHERE c."status" = 'FREE')           AS free,
           COUNT(c.id) FILTER (WHERE c."status" IN ('FREE','BUSY')) AS usable,
           COUNT(c.id)                                               AS total,
           COALESCE(MAX(c."powerKw"), 0)::float                      AS max_kw,
           BOOL_OR(c."ocppId" IS NOT NULL)                           AS has_ocpp
    FROM "Station" s
    LEFT JOIN "Charger" c ON c."stationId" = s.id
    WHERE s.status = 'APPROVED'
      AND s.location && ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)::geography
    GROUP BY s.id
    LIMIT 400;
  `;
}
