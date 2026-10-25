import { io, type Socket } from "socket.io-client";
import { queryClient } from "./query-client";
import type { PinTuple } from "@evspark/shared";

let socket: Socket | null = null;
let currentSubscribedTiles: string[] = [];
let currentToken: string | null = null;

export type DeltaCallback = (data: { stations?: any[]; pins?: PinTuple[] }) => void;
const deltaListeners = new Set<DeltaCallback>();

export function onStationsDelta(cb: DeltaCallback): () => void {
  deltaListeners.add(cb);
  return () => {
    deltaListeners.delete(cb);
  };
}

export function setSocketToken(token: string | null) {
  currentToken = token;
  if (socket) {
    socket.auth = token ? { token } : {};
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
}

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    socket = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: currentToken ? { token: currentToken } : undefined,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      if (currentSubscribedTiles.length > 0) {
        socket?.emit("subscribe:tiles", currentSubscribedTiles);
      }
    });

    socket.on("stations:delta", (data: { stations?: any[]; pins?: PinTuple[] }) => {
      // 1. Notify registered listeners (e.g. useLiveDeltas -> pin-store)
      deltaListeners.forEach((listener) => {
        try {
          listener(data);
        } catch {
          // ignore
        }
      });

      // 2. Keep individual station query fresh when station card is open
      const updatedStations = data?.stations;
      if (Array.isArray(updatedStations)) {
        for (const st of updatedStations) {
          if (st?.id) {
            queryClient.setQueryData(["station", st.id], (prev: any) => {
              return prev ? { ...prev, ...st } : prev;
            });
          }
        }
      }
    });

    socket.on("live:delta", (delta: Record<string, string>) => {
      liveDeltaListeners.forEach((listener) => {
        try {
          listener(delta);
        } catch {}
      });
    });
  }

  return socket;
}

export function subscribeTiles(tiles: string[]) {
  const s = getSocket();
  const newTiles = tiles.slice(0, 12);

  if (currentSubscribedTiles.length > 0) {
    s.emit("unsubscribe:tiles", currentSubscribedTiles);
  }

  currentSubscribedTiles = newTiles;
  if (newTiles.length > 0) {
    s.emit("subscribe:tiles", newTiles);
  }
}

export function unsubscribeTiles(tiles: string[]) {
  const s = getSocket();
  s.emit("unsubscribe:tiles", tiles);
  currentSubscribedTiles = currentSubscribedTiles.filter((t) => !tiles.includes(t));
}

export function subscribeStation(stationId: string) {
  const s = getSocket();
  s.emit("subscribe:station", stationId);
}

export function unsubscribeStation(stationId: string) {
  const s = getSocket();
  s.emit("unsubscribe:station", stationId);
}

export type LiveDeltaCallback = (delta: Record<string, string>) => void;
const liveDeltaListeners = new Set<LiveDeltaCallback>();

export function onLiveDelta(cb: LiveDeltaCallback): () => void {
  liveDeltaListeners.add(cb);
  return () => {
    liveDeltaListeners.delete(cb);
  };
}

export function mapJoin(rooms: string[]) {
  const s = getSocket();
  s.emit("map:join", rooms);
}

export function mapLeave(rooms: string[]) {
  const s = getSocket();
  s.emit("map:leave", rooms);
}

