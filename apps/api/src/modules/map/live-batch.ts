import type { Server } from 'socket.io';
import prisma from '../../lib/prisma';
import { publishLive, tileOf, TILE_Z } from './tiles.routes';

const roomOf = (lat: number, lng: number) => { const { x, y } = tileOf(lat, lng); return `tile:${TILE_Z}:${x}:${y}`; };
const pending = new Map<string, Map<string, string>>(); // room -> stationId -> packed

export const queueLive = (lat: number, lng: number, stationId: string, packed: string) => {
  const r = roomOf(lat, lng);
  (pending.get(r) ?? pending.set(r, new Map()).get(r)!).set(stationId, packed);
};

export async function updateStationLive(stationId: string) {
  try {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        chargers: true,
        queueEntries: { where: { status: 'waiting' } },
      },
    });
    if (!station) return;
    const total = station.chargers.length;
    const free = station.chargers.filter((c) => c.status === 'FREE').length;
    const busy = station.chargers.filter((c) => c.status === 'BUSY').length;
    let status = 3; // 0=free 1=busy 2=offline 3=unknown
    if (total === 0) status = 3;
    else if (free > 0) status = 0;
    else if (busy > 0) status = 1;
    else status = 2;

    const waitMin = station.queueEntries.length * 15;
    const packed = `${status}|${free}|${total}|${waitMin}`;

    await publishLive(stationId, status, free, total, waitMin);
    queueLive(station.lat, station.lng, stationId, packed);
  } catch {
    // Fail-safe
  }
}

export function startLiveBatcher(io: Server) {
  io.on('connection', (sock) => {
    sock.on('map:join', (rooms: unknown) => {
      if (!Array.isArray(rooms)) return;
      for (const r of rooms.slice(0, 12)) if (typeof r === 'string' && /^tile:11:\d+:\d+$/.test(r)) void sock.join(r);
    });
    sock.on('map:leave', (rooms: unknown) => {
      if (!Array.isArray(rooms)) return;
      for (const r of rooms.slice(0, 12)) if (typeof r === 'string') void sock.leave(r);
    });
  });
  setInterval(() => {
    for (const [room, m] of pending) io.to(room).emit('live:delta', Object.fromEntries(m));
    pending.clear();
  }, 1000).unref();
}
