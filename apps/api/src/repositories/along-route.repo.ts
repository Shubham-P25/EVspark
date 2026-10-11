import prisma from "../lib/prisma";

export interface AlongRouteRow {
  id: string;
  detourM: number;
  fraction: number;
  routeLengthM: number;
}

/** Stations within radiusM of an encoded polyline, ordered along the route. Needs PostGIS (already enabled). */
export async function findStationsAlongRoute(
  polyline: string,
  radiusM: number,
  limit: number
): Promise<AlongRouteRow[]> {
  const rows = await prisma.$queryRaw<{ id: string; detour_m: number; fraction: number; route_len: number }[]>`
    WITH r AS (
      SELECT ST_SetSRID(ST_LineFromEncodedPolyline(${polyline}::text), 4326) AS geom
    )
    SELECT s.id,
           ST_Distance(s.location, r.geom::geography)            AS detour_m,
           ST_LineLocatePoint(r.geom, s.location::geometry)      AS fraction,
           ST_Length(r.geom::geography)                          AS route_len
    FROM "Station" s, r
    WHERE s.status = 'APPROVED'
      AND s.location IS NOT NULL
      AND ST_DWithin(s.location, r.geom::geography, ${radiusM})
    ORDER BY fraction ASC
    LIMIT ${limit}`;

  return rows.map((x) => ({
    id: x.id,
    detourM: Number(x.detour_m),
    fraction: Number(x.fraction),
    routeLengthM: Number(x.route_len),
  }));
}
