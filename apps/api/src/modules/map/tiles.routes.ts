import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import prisma from '../../lib/prisma';
import { redis } from '../../lib/redis';

export const TILE_Z = 11; // ~19 km tiles at India latitudes; fixed on purpose (cache-friendly)
export const mapRouter = Router();

const Params = z.object({
  z: z.coerce.number().int().min(11).max(11),
  x: z.coerce.number().int().min(0).max(2 ** 11 - 1),
  y: z.coerce.number().int().min(0).max(2 ** 11 - 1),
});

type StaticTile = { v: 1; n: number; ids: string[]; lat: number[]; lng: number[]; tot: number[] };

export const tileBBox = (z: number, x: number, y: number) => {
  const n = 2 ** z;
  const lon = (xx: number) => (xx / n) * 360 - 180;
  const lat = (yy: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * yy) / n))) * 180) / Math.PI;
  return { w: lon(x), e: lon(x + 1), n: lat(y), s: lat(y + 1) };
};

export const tileOf = (lat: number, lng: number, z = TILE_Z) => {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x, y };
};

async function buildStaticTile(z: number, x: number, y: number): Promise<StaticTile> {
  const b = tileBBox(z, x, y);
  const rows = await prisma.$queryRaw<{ id: string; lat: number; lng: number; tot: number }[]>`
    SELECT s.id,
           ST_Y(s.geom::geometry) AS lat,
           ST_X(s.geom::geometry) AS lng,
           (SELECT COUNT(*) FROM "Charger" c WHERE c."stationId" = s.id)::int AS tot
    FROM "Station" s
    WHERE s.geom && ST_MakeEnvelope(${b.w}, ${b.s}, ${b.e}, ${b.n}, 4326)::geography
      AND s.status = 'APPROVED'
    ORDER BY s.id`;
  return {
    v: 1,
    n: rows.length,
    ids: rows.map((r) => r.id),
    lat: rows.map((r) => Math.round(r.lat * 1e5)),
    lng: rows.map((r) => Math.round(r.lng * 1e5)),
    tot: rows.map((r) => r.tot),
  };
}

const asString = (v: unknown): string | null =>
  v == null ? null : typeof v === 'string' ? v : JSON.stringify(v);

export async function getStaticTileJson(z: number, x: number, y: number): Promise<{ json: string; ver: string }> {
  const ver = String((await redis.get('st:ver')) ?? '0');
  const key = `st:tile:${ver}:${z}:${x}:${y}`;
  let json = asString(await redis.get(key));
  if (!json) {
    json = JSON.stringify(await buildStaticTile(z, x, y));
    await redis.set(key, json, { ex: 6 * 3600 });
  }
  return { json, ver };
}

/** Call this whenever a station is created / approved / moved / deleted. */
export const bumpStationVersion = () => redis.incr('st:ver');

mapRouter.get('/stations/tiles/:z/:x/:y', async (req: Request, res: Response) => {
  const p = Params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'bad_tile' });
  const { z, x, y } = p.data;
  const { json, ver } = await getStaticTileJson(z, x, y);
  const etag = `W/"${ver}-${createHash('sha1').update(json).digest('base64url').slice(0, 12)}"`;
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res
    .set({
      ETag: etag,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=21600, stale-while-revalidate=86400',
    })
    .send(json);
});

// ---- live layer: aligned by index with the static tile's ids ----
const micro = new Map<string, { at: number; body: string }>(); // 2 s in-process shield for Redis
mapRouter.get('/stations/tiles/:z/:x/:y/live', async (req: Request, res: Response) => {
  const p = Params.safeParse(req.params);
  if (!p.success) return res.status(400).json({ error: 'bad_tile' });
  const { z, x, y } = p.data;
  const mk = `${z}/${x}/${y}`;
  const hit = micro.get(mk);
  const now = Date.now();
  let body = hit && now - hit.at < 2000 ? hit.body : null;
  if (!body) {
    const { json } = await getStaticTileJson(z, x, y);
    const ids = (JSON.parse(json) as StaticTile).ids;
    const raw = ids.length ? ((await redis.hmget('live:stations', ...ids)) as Record<string, unknown> | null) : null;
    const st: number[] = [], free: number[] = [], wait: number[] = [];
    for (const id of ids) {
      const packed = raw && raw[id] != null ? String(raw[id]) : '3|0|0|0'; // 3 = unknown
      const [s, f, , w] = packed.split('|').map(Number);
      st.push(s ?? 3); free.push(f ?? 0); wait.push(w ?? 0);
    }
    body = JSON.stringify({ v: 1, t: now, st, free, wait });
    micro.set(mk, { at: now, body });
    if (micro.size > 500) micro.delete(micro.keys().next().value as string);
  }
  res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' }).send(body);
});

/** Called by whatever updates charger state (OCPP handler / twin engine). packed = "status|free|total|waitMin"; status 0=free 1=busy 2=offline 3=unknown */
export const publishLive = (stationId: string, status: number, free: number, total: number, waitMin: number) =>
  redis.hset('live:stations', { [stationId]: `${status}|${free}|${total}|${waitMin}` });
