import { io, type Socket } from "socket.io-client";
import { queryClient } from "./query-client";

let socket: Socket | null = null;
let currentSubscribedTiles: string[] = [];
let currentToken: string | null = null;

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
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

    socket.on("stations:delta", (data: { stations?: any[] }) => {
      const updatedStations = data?.stations;
      if (!Array.isArray(updatedStations) || updatedStations.length === 0) return;

      const updateMap = new Map(updatedStations.map((s) => [s.id, s]));

      queryClient.setQueriesData({ queryKey: ["stations"] }, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData)) {
          return oldData.map((station: any) => {
            const updated = updateMap.get(station.id);
            return updated ? { ...station, ...updated } : station;
          });
        }
        return oldData;
      });

      for (const st of updatedStations) {
        queryClient.setQueryData(["station", st.id], (prev: any) => {
          return prev ? { ...prev, ...st } : prev;
        });
      }
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
