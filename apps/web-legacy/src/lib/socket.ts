import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "./auth-store";

let socket: Socket | null = null;
let currentSubscribedTiles: string[] = [];

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const token = useAuthStore.getState().token;

    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: token ? { token } : undefined,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[Socket.io] Connected to EVspark realtime hub:", socket?.id);
      // Re-subscribe to current tiles if reconnected
      if (currentSubscribedTiles.length > 0) {
        socket?.emit("subscribe:tiles", currentSubscribedTiles);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.io] Disconnected:", reason);
    });
  }

  return socket;
}

export function subscribeTiles(tiles: string[]) {
  const s = getSocket();
  const newTiles = tiles.slice(0, 12);

  // Unsubscribe old if changed
  if (currentSubscribedTiles.length > 0) {
    s.emit("unsubscribe:tiles", currentSubscribedTiles);
  }

  currentSubscribedTiles = newTiles;
  if (newTiles.length > 0) {
    s.emit("subscribe:tiles", newTiles);
  }
}

export function subscribeStation(stationId: string) {
  const s = getSocket();
  s.emit("subscribe:station", stationId);
}

export function unsubscribeStation(stationId: string) {
  const s = getSocket();
  s.emit("unsubscribe:station", stationId);
}