import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

let io: SocketIOServer | undefined;

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // allow web origins
      methods: ["GET", "POST", "PATCH", "DELETE"]
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Connected: ${socket.id}`);

    // Join rooms
    socket.on("join:station", (stationId: string) => {
      socket.join(`station:${stationId}`);
    });

    socket.on("join:operator", (userId: string) => {
      socket.join(`operator:${userId}`);
    });

    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on("join:admin", () => {
      socket.join("admin");
    });

    socket.on("disconnect", () => {
      // client disconnected
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

export function emitChargerUpdate(charger: any) {
  if (!io) return;
  io.emit("charger:update", charger);
  if (charger.stationId) {
    io.to(`station:${charger.stationId}`).emit("charger:update", charger);
  }
}

export function emitStationUpdate(stationId: string, payload: any) {
  if (!io) return;
  io.emit("station:update", payload);
  io.to(`station:${stationId}`).emit("station:update", payload);
}

export function emitOverloadAlert(payload: { stationId: string; message: string; severity: string }) {
  if (!io) return;
  io.emit("alert:overload", payload);
  io.to(`station:${payload.stationId}`).emit("alert:overload", payload);
  io.to("admin").emit("alert:overload", payload);
}

export function emitBookingUpdate(booking: any) {
  if (!io) return;
  io.emit("booking:update", booking);
  if (booking.stationId) {
    io.to(`station:${booking.stationId}`).emit("booking:update", booking);
  }
  if (booking.driverUserId) {
    io.to(`user:${booking.driverUserId}`).emit("booking:update", booking);
  }
}