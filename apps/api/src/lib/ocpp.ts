import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import prisma from "./prisma";
import { emitChargerUpdate, emitStationUpdate, emitOverloadAlert } from "./socket";

export function initOcppWs(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    if (url.startsWith("/ocpp/1.6/")) {
      const parts = url.split("/");
      const chargePointId = parts[3]?.split("?")[0];
      if (chargePointId) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request, chargePointId);
        });
      } else {
        socket.destroy();
      }
    }
  });

  wss.on("connection", (ws: WebSocket, request: any, chargePointId: string) => {
    console.log(`[OCPP 1.6J] Charge point connected: ${chargePointId}`);

    ws.on("message", async (rawMessage) => {
      try {
        const frame = JSON.parse(rawMessage.toString());
        // OCPP-J message format: [MessageTypeId, UniqueId, Action, Payload]
        // MessageTypeId 2 = Call
        if (!Array.isArray(frame) || frame[0] !== 2) return;

        const [, messageId, action, payload] = frame;

        switch (action) {
          case "BootNotification": {
            // Respond with Accepted
            const response = [
              3,
              messageId,
              {
                status: "Accepted",
                currentTime: new Date().toISOString(),
                interval: 30,
              },
            ];
            ws.send(JSON.stringify(response));
            break;
          }

          case "StatusNotification": {
            const ocppStatus = payload.status; // "Available", "Occupied", "Faulted", "Unavailable"
            let dbStatus: "FREE" | "BUSY" | "FAULTED" | "MAINTENANCE" = "FREE";
            if (ocppStatus === "Occupied" || ocppStatus === "Charging") dbStatus = "BUSY";
            else if (ocppStatus === "Faulted") dbStatus = "FAULTED";
            else if (ocppStatus === "Unavailable") dbStatus = "MAINTENANCE";

            // Find charger by ocppId or label
            const charger = await prisma.charger.findFirst({
              where: {
                OR: [{ ocppId: chargePointId }, { label: chargePointId }],
              },
              include: { station: true },
            });

            if (charger) {
              const updated = await prisma.charger.update({
                where: { id: charger.id },
                data: { status: dbStatus },
              });

              await prisma.chargerEvent.create({
                data: {
                  chargerId: charger.id,
                  status: dbStatus,
                  payload: JSON.stringify(payload),
                },
              });

              emitChargerUpdate(updated);

              if (dbStatus === "FAULTED") {
                emitOverloadAlert({
                  stationId: charger.stationId,
                  message: `Charger ${charger.label} faulted at ${charger.station.name}`,
                  severity: "warning",
                });
              }
            }

            ws.send(JSON.stringify([3, messageId, {}]));
            break;
          }

          case "StartTransaction": {
            const charger = await prisma.charger.findFirst({
              where: {
                OR: [{ ocppId: chargePointId }, { label: chargePointId }],
              },
            });

            const transactionId = Math.floor(Date.now() / 1000);

            if (charger) {
              await prisma.charger.update({
                where: { id: charger.id },
                data: { status: "BUSY" },
              });

              await prisma.session.create({
                data: {
                  stationId: charger.stationId,
                  chargerId: charger.id,
                  startTs: new Date(),
                  source: "sim",
                  socStart: payload.socStart ?? 25,
                },
              });

              emitChargerUpdate({ ...charger, status: "BUSY" });
            }

            ws.send(
              JSON.stringify([
                3,
                messageId,
                { transactionId, idTagInfo: { status: "Accepted" } },
              ])
            );
            break;
          }

          case "MeterValues": {
            ws.send(JSON.stringify([3, messageId, {}]));
            break;
          }

          case "StopTransaction": {
            const charger = await prisma.charger.findFirst({
              where: {
                OR: [{ ocppId: chargePointId }, { label: chargePointId }],
              },
            });

            if (charger) {
              await prisma.charger.update({
                where: { id: charger.id },
                data: { status: "FREE" },
              });
              emitChargerUpdate({ ...charger, status: "FREE" });
            }

            ws.send(
              JSON.stringify([
                3,
                messageId,
                { idTagInfo: { status: "Accepted" } },
              ])
            );
            break;
          }

          default: {
            ws.send(JSON.stringify([3, messageId, {}]));
          }
        }
      } catch (err) {
        console.error("[OCPP WS] Error handling frame:", err);
      }
    });

    ws.on("close", () => {
      console.log(`[OCPP 1.6J] Charge point disconnected: ${chargePointId}`);
    });
  });

  return wss;
}
