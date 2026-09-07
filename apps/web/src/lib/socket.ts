import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000", {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
}