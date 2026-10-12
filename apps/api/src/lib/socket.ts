import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import logger from "./logger.js";
import { getRedis } from "./redis.js";
import { verifyAndAttachUser } from "../middleware/auth.js";
import prisma from "./prisma.js";
import { computeWaitTime, latLngToTile } from "@evspark/shared";
import { getGeofenceCounts } from "./geofence.js";

let io: SocketIOServer | undefined;
const pendingDeltas = new Map<string, any>();
let flushTimer: NodeJS.Timeout | null = null;
let redisSubInitialized = false;

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

export function initSocket(httpServer: HttpServer) {
  const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    maxHttpBufferSize: 16 * 1024, // 16 KB max payload
  });

  // Optional Redis Adapter for multi-instance scaling
  if (process.env.SOCKET_REDIS_ADAPTER === "true") {
    try {
      const pubClient = getRedis();
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info("[Socket.io] Redis adapter configured");
    } catch (err) {
      logger.warn({ err }, "[Socket.io] Failed to configure Redis adapter, running in-memory");
    }
  }

  // Socket authentication middleware (optional token)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token && typeof token === "string") {
      try {
        const user = await verifyAndAttachUser(token);
        socket.data.user = user;
      } catch (err) {
        logger.warn({ err }, "[Socket.io] Optional auth handshake failed, continuing anonymously");
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    const subscribedTiles = new Set<string>();

    // Subscribe to map tiles (max 12 tiles)
    socket.on("subscribe:tiles", (tiles: string[]) => {
      if (!Array.isArray(tiles)) return;
      const validTiles = tiles.slice(0, 12);
      for (const tile of validTiles) {
        if (typeof tile === "string" && tile.startsWith("tile:")) {
          socket.join(tile);
          subscribedTiles.add(tile);
        }
      }
    });

    socket.on("unsubscribe:tiles", (tiles: string[]) => {
      if (!Array.isArray(tiles)) return;
      for (const tile of tiles) {
        socket.leave(tile);
        subscribedTiles.delete(tile);
      }
    });

    // Subscribe to station detail
    socket.on("subscribe:station", (stationId: string) => {
      if (typeof stationId === "string") {
        socket.join(`station:${stationId}`);
      }
    });

    socket.on("unsubscribe:station", (stationId: string) => {
      if (typeof stationId === "string") {
        socket.leave(`station:${stationId}`);
      }
    });

    // Operator & Admin rooms
    socket.on("join:operator", (userId: string) => {
      const user = socket.data.user;
      if (user && (user.role === "ADMIN" || (user.role === "OPERATOR" && user.id === userId))) {
        socket.join(`operator:${userId}`);
      }
    });

    socket.on("join:admin", () => {
      const user = socket.data.user;
      if (user && user.role === "ADMIN") {
        socket.join("admin");
      }
    });

    socket.on("disconnect", () => {
      subscribedTiles.clear();
    });
  });

  initRedisPubSub();
  startFlushTimer();

  return io;
}

function initRedisPubSub() {
  if (redisSubInitialized) return;
  redisSubInitialized = true;
  try {
    const client = getRedis();
    if (client.status === "ready") {
      const subClient = client.duplicate();
      subClient.subscribe("evspark:events", (err) => {
        if (err) logger.warn({ err }, "Failed to subscribe to evspark:events");
      });

      subClient.on("message", (channel, message) => {
        if (channel === "evspark:events") {
          try {
            const data = JSON.parse(message);
            if (data.type === "charger:update") {
              enqueueDelta(data.payload);
            }
          } catch (err) {
            logger.warn({ err }, "Failed to parse evspark:events payload");
          }
        }
      });
    }
  } catch (err) {
    logger.warn({ err }, "Redis pub/sub unavailable, using in-memory delta queue");
  }
}

function enqueueDelta(update: any) {
  if (!update || !update.stationId) return;
  pendingDeltas.set(update.stationId, update);
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(async () => {
    await flushDeltas();
  }, 1000);
  flushTimer.unref();
}

export function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function flushDeltas() {
  if (!io || pendingDeltas.size === 0) return;

  const stationIds = Array.from(pendingDeltas.keys());
  pendingDeltas.clear();

  try {
    const stations = await prisma.station.findMany({
      where: { id: { in: stationIds } },
      select: {
        id: true,
        lat: true,
        lng: true,
        operatorUserId: true,
        chargers: {
          select: { id: true, status: true, connectorType: true, powerKw: true },
        },
        queueEntries: {
          where: { status: "waiting" },
          select: { id: true },
        },
      },
    });

    const geoCounts = await getGeofenceCounts(stationIds);
    const changedSummaries: any[] = [];

    for (const st of stations) {
      const waitInfo = computeWaitTime({
        chargers: st.chargers as any,
        queueLength: st.queueEntries.length,
        geofenceVehicleCount: geoCounts.get(st.id) ?? 0,
      });

      const summary = {
        id: st.id,
        markerColor: waitInfo.markerColor,
        waitMinutes: waitInfo.waitMinutes,
        availableChargers: waitInfo.availableChargers,
        totalChargers: st.chargers.length,
        isOverloaded: waitInfo.isOverloaded,
        incomingVehicles: geoCounts.get(st.id) ?? 0,
      };

      changedSummaries.push(summary);

      // 1. Emit to station detail room
      io.to(`station:${st.id}`).emit("stations:delta", { stations: [summary] });

      // 2. Emit to operator room if operator assigned
      if (st.operatorUserId) {
        io.to(`operator:${st.operatorUserId}`).emit("stations:delta", { stations: [summary] });
      }

      // 3. Emit to tile rooms covering this station (zooms 10 through 14)
      for (let z = 10; z <= 14; z++) {
        const tile = latLngToTile(st.lat, st.lng, z);
        const tileRoom = `tile:${z}:${tile.x}:${tile.y}`;
        io.to(tileRoom).emit("stations:delta", { stations: [summary] });
      }
    }

    // 4. Emit batch to admin room
    io.to("admin").emit("stations:delta", { stations: changedSummaries });
  } catch (err) {
    logger.warn({ err }, "Error flushing stations deltas");
  }
}

export function publishChargerUpdate(update: any) {
  enqueueDelta(update);

  try {
    const client = getRedis();
    if (client.status === "ready") {
      client.publish("evspark:events", JSON.stringify({ type: "charger:update", payload: update })).catch(() => {});
    }
  } catch {
    // Fail safe
  }
}

export function emitChargerUpdate(charger: any) {
  publishChargerUpdate(charger);
  if (!io) return;
  const payload = {
    chargerId: charger.id,
    stationId: charger.stationId,
    status: charger.status,
    activeSession: charger.activeSession || null,
  };
  io.to(`station:${charger.stationId}`).emit("charger:update", payload);
  if (charger.operatorUserId) {
    io.to(`operator:${charger.operatorUserId}`).emit("charger:update", payload);
  }
  if (charger.lat && charger.lng) {
    for (let z = 10; z <= 14; z++) {
      const tile = latLngToTile(charger.lat, charger.lng, z);
      io.to(`tile:${z}:${tile.x}:${tile.y}`).emit("charger:update", payload);
    }
  }
}

export function emitStationUpdate(stationId: string, payload: any) {
  if (!io) return;
  io.to(`station:${stationId}`).emit("station:update", payload);
}

export function emitOverloadAlert(alert: { stationId: string; message: string; severity?: string }) {
  if (!io) return;
  io.to(`station:${alert.stationId}`).emit("station:overload", alert);
  io.to("admin").emit("station:overload", alert);
}

export function emitBookingUpdate(booking: any) {
  if (!io) return;
  if (booking.driverUserId) {
    io.to(`operator:${booking.station?.operatorUserId}`).emit("booking:update", booking);
  }
  if (booking.stationId) {
    io.to(`station:${booking.stationId}`).emit("booking:update", booking);
  }
  io.to("admin").emit("booking:update", booking);
}

export function emitStationDelta(stationId: string, partialUpdate?: any) {
  pendingDeltas.set(stationId, { stationId, ...(partialUpdate || {}) });
  if (io && partialUpdate) {
    io.to(`station:${stationId}`).emit("station:delta", { stationId, ...partialUpdate });
  }
}

export function emitQueuePromoted(payload: { stationId: string; queueEntryId: string; vehicleRef?: string; chargerId?: string }) {
  if (!io) return;
  io.to(`station:${payload.stationId}`).emit("queue:promoted", payload);
  io.to("admin").emit("queue:promoted", payload);
}

export function emitSessionUpdate(payload: { stationId: string; operatorUserId?: string | null; session: any }) {
  if (!io) return;
  io.to(`station:${payload.stationId}`).emit("session:update", payload);
  if (payload.operatorUserId) {
    io.to(`operator:${payload.operatorUserId}`).emit("session:update", payload);
  }
  io.to("admin").emit("session:update", payload);
}