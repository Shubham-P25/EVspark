import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { computeGeofence } from './geofence';
import { getRoutePool } from './routes';

export const demoRouter = Router();
const Q = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(5).default(3),
});

demoRouter.get('/bootstrap', async (req, res) => {
  const q = Q.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: 'bad_query' });
  const { lat, lng, limit } = q.data;

  const cacheKey = `demo:boot:${lat.toFixed(3)}:${lng.toFixed(3)}:${limit}`;
  const hit = await redis.get(cacheKey);
  if (hit) {
    return res
      .set('Cache-Control', 'public, max-age=300')
      .json(typeof hit === 'string' ? JSON.parse(hit) : hit);
  }
  // nearest approved stations that have at least 1 charger
  const rows = await prisma.$queryRaw<{ id: string; name: string; lat: number; lng: number; chargers: number }[]>`
    SELECT s.id, s.name, ST_Y(s.geom::geometry) lat, ST_X(s.geom::geometry) lng,
           (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId"=s.id)::int chargers
    FROM "Station" s
    WHERE s.status='APPROVED' AND s.geom IS NOT NULL
      AND ST_DWithin(s.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography, 15000)
    ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}),4326)::geography
    LIMIT 12`;
  const out = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    if (r.chargers < 1) continue;
    const fence = await computeGeofence(r.id, r.lat, r.lng).catch(() => null);
    if (!fence) continue;
    const routes = await getRoutePool(r.id, fence).catch(() => []);
    if (routes.length < 3) continue;
    out.push({ id: r.id, name: r.name, lat: r.lat, lng: r.lng, chargers: Math.min(r.chargers, 8), fence, routes });
  }
  const payload = { stations: out };
  await redis.set(cacheKey, JSON.stringify(payload), { ex: 300 });
  res.set('Cache-Control', 'public, max-age=300').json(payload);
});
