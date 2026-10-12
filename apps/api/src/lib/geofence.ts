import { getRedis } from "./redis";

export const GEOFENCE_RADIUS_M = Number(process.env.GEOFENCE_RADIUS_M || 200);

// Number of vehicles currently heading to each station (Redis set per station).
export async function getGeofenceCounts(stationIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (stationIds.length === 0) return out;
  try {
    const client = getRedis();
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect().catch(() => {});
    }
    const counts = await Promise.all(stationIds.map((id) => client.scard(`geofence:${id}`)));
    stationIds.forEach((id, i) => out.set(id, counts[i] ?? 0));
  } catch {
    // Redis down -> behave as if nobody is incoming
  }
  return out;
}
