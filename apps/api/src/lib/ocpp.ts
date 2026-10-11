import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import prisma from "./prisma";
import { emitChargerUpdate, emitOverloadAlert, emitStationDelta, emitQueuePromoted, emitSessionUpdate } from "./socket";
import { delStationCache } from "./redis";
import logger from "./logger";

export function initOcppWs(httpServer: HttpServer) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024, // 64 KB max payload size
  });

  httpServer.on("upgrade", async (request, socket, head) => {
    const url = request.url || "";
    if (url.startsWith("/ocpp/1.6/")) {
      const parts = url.split("/");
      const rawIdWithQuery = parts[3] || "";
      const [chargePointId, queryStr] = rawIdWithQuery.split("?");

      if (!chargePointId) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
        socket.destroy();
        return;
      }

      // 1. Optional shared secret check
      const expectedSecret = process.env.OCPP_SHARED_SECRET;
      if (expectedSecret) {
        const authHeader = request.headers["authorization"] || "";
        const queryParams = new URLSearchParams(queryStr || "");
        const querySecret = queryParams.get("secret") || queryParams.get("token") || "";
        const secProtocol = request.headers["sec-websocket-protocol"] || "";

        const providedSecret =
          authHeader.replace(/^(Bearer|Basic)\s+/i, "") ||
          querySecret ||
          secProtocol;

        if (providedSecret !== expectedSecret) {
          logger.warn({ chargePointId }, "[OCPP 1.6J] Rejected connection: invalid shared secret");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      // 2. Reject connection for unknown chargePointId (must exist in Charger)
      try {
        const charger = await prisma.charger.findFirst({
          where: {
            OR: [{ ocppId: chargePointId }, { label: chargePointId }, { id: chargePointId }],
          },
        });

        if (!charger) {
          logger.warn({ chargePointId }, "[OCPP 1.6J] Rejected connection: unknown chargePointId");
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          socket.destroy();
          return;
        }
      } catch (err) {
        logger.error({ err }, "[OCPP 1.6J] Database lookup failed on upgrade");
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, chargePointId);
      });
    }
  });

  wss.on("connection", (ws: WebSocket, request: any, chargePointId: string) => {
    logger.info(`[OCPP 1.6J] Charge point connected: ${chargePointId}`);

    ws.on("message", async (rawMessage) => {
      try {
        const frame = JSON.parse(rawMessage.toString());
        // OCPP-J message format: [MessageTypeId, UniqueId, Action, Payload]
        if (!Array.isArray(frame) || frame[0] !== 2) return;

        const [, messageId, action, payload] = frame;

        switch (action) {
          case "BootNotification": {
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
            const ocppStatus = payload.status;
            let dbStatus: "FREE" | "BUSY" | "FAULTED" | "MAINTENANCE" = "FREE";
            if (ocppStatus === "Occupied" || ocppStatus === "Charging") dbStatus = "BUSY";
            else if (ocppStatus === "Faulted") dbStatus = "FAULTED";
            else if (ocppStatus === "Unavailable") dbStatus = "MAINTENANCE";

            const charger = await prisma.charger.findFirst({
              where: {
                OR: [{ ocppId: chargePointId }, { label: chargePointId }, { id: chargePointId }],
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
              await delStationCache(charger.stationId);
              emitStationDelta(charger.stationId, { chargerId: charger.id, status: dbStatus });

              if (dbStatus === "FAULTED") {
                emitOverloadAlert({
                  stationId: charger.stationId,
                  message: `Charger ${charger.label || charger.id} faulted at ${charger.station.name}`,
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
                OR: [{ ocppId: chargePointId }, { label: chargePointId }, { id: chargePointId }],
              },
              include: { station: true },
            });

            const transactionId = Number(payload.transactionId) || Math.floor(Date.now() / 1000);

            if (charger) {
              const now = new Date();

              // Check for waiting queue entry for this station and connector
              const waitingQueue = await prisma.queueEntry.findFirst({
                where: {
                  stationId: charger.stationId,
                  connector: charger.connectorType,
                  status: "waiting",
                },
                orderBy: { joinedTs: "asc" },
              });

              let queueWaitMin: number | null = null;
              if (waitingQueue) {
                queueWaitMin = Math.max(0, (now.getTime() - waitingQueue.joinedTs.getTime()) / 60000);
                await prisma.queueEntry.update({
                  where: { id: waitingQueue.id },
                  data: { status: "charging" },
                });
              }

              await prisma.charger.update({
                where: { id: charger.id },
                data: { status: "BUSY" },
              });

              const durationMin = Number(payload.durationMin) || Number(payload.plannedDurationMin) || 30;
              const estimatedEndTs = new Date(now.getTime() + durationMin * 60000);
              const socStart = payload.socStart ?? payload.meterStart ?? 25;

              const sessionRecord = await prisma.session.create({
                data: {
                  stationId: charger.stationId,
                  chargerId: charger.id,
                  startTs: now,
                  estimatedEndTs,
                  source: payload.source || "twin",
                  socStart,
                  queueWaitMin,
                  ocppTxId: transactionId,
                },
              });

              emitChargerUpdate({
                ...charger,
                status: "BUSY",
                lat: charger.station?.lat,
                lng: charger.station?.lng,
                activeSession: {
                  startTs: now,
                  estimatedEndTs,
                  socStart,
                  socNow: socStart,
                },
              });
              emitSessionUpdate({
                stationId: charger.stationId,
                operatorUserId: charger.station?.operatorUserId,
                session: sessionRecord,
              });
              await delStationCache(charger.stationId);
              emitStationDelta(charger.stationId, { chargerId: charger.id, status: "BUSY" });
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
            // payload: { connectorId, transactionId, meterValue: [ { timestamp, sampledValue: [...] } ] }
            let sampledKwh: number | undefined;
            let sampledSoc: number | undefined;

            if (Array.isArray(payload.meterValue)) {
              for (const entry of payload.meterValue) {
                if (Array.isArray(entry.sampledValue)) {
                  for (const sample of entry.sampledValue) {
                    const val = parseFloat(sample.value);
                    if (!isNaN(val)) {
                      const measurand = sample.measurand || "";
                      const unit = sample.unit || "";
                      if (measurand.includes("Energy") || unit === "kWh" || unit === "Wh") {
                        sampledKwh = unit === "Wh" ? val / 1000 : val;
                      } else if (measurand.includes("SoC") || unit === "Percent") {
                        sampledSoc = val;
                      }
                    }
                  }
                }
              }
            }

            if (sampledKwh !== undefined || sampledSoc !== undefined) {
              const session = payload.transactionId
                ? await prisma.session.findFirst({
                    where: { ocppTxId: Number(payload.transactionId) },
                  })
                : await prisma.session.findFirst({
                    where: {
                      charger: {
                        OR: [{ ocppId: chargePointId }, { label: chargePointId }, { id: chargePointId }],
                      },
                      endTs: null,
                    },
                    orderBy: { startTs: "desc" },
                  });

              if (session) {
                await prisma.session.update({
                  where: { id: session.id },
                  data: {
                    ...(sampledKwh !== undefined ? { energyKwh: sampledKwh } : {}),
                    ...(sampledSoc !== undefined ? { socEnd: sampledSoc } : {}),
                  },
                });
              }
            }

            ws.send(JSON.stringify([3, messageId, {}]));
            break;
          }

          case "StopTransaction": {
            const charger = await prisma.charger.findFirst({
              where: {
                OR: [{ ocppId: chargePointId }, { label: chargePointId }],
              },
              include: { station: true },
            });

            if (charger) {
              const now = payload.timestamp ? new Date(payload.timestamp) : new Date();

              const session = payload.transactionId
                ? await prisma.session.findFirst({
                    where: { ocppTxId: Number(payload.transactionId) },
                  })
                : await prisma.session.findFirst({
                    where: {
                      chargerId: charger.id,
                      endTs: null,
                    },
                    orderBy: { startTs: "desc" },
                  });

              if (session) {
                const meterStop = typeof payload.meterStop === "number" ? payload.meterStop : 0;
                let energyKwh = session.energyKwh;
                if (!energyKwh || energyKwh === 0) {
                  if (meterStop > (session.socStart || 0)) {
                    energyKwh = (meterStop - (session.socStart || 0)) / (meterStop > 1000 ? 1000 : 1);
                  } else {
                    energyKwh = 18.5; // fallback realistic charge
                  }
                }
                const price = charger.station?.pricePerKwh ?? 15;
                const amountInr = Math.round(energyKwh * price * 100) / 100;

                await prisma.session.update({
                  where: { id: session.id },
                  data: {
                    endTs: now,
                    socEnd: payload.socEnd ?? 85,
                    energyKwh,
                    amountInr,
                  },
                });
              }

              await prisma.charger.update({
                where: { id: charger.id },
                data: { status: "FREE" },
              });

              emitChargerUpdate({
                ...charger,
                status: "FREE",
                lat: charger.station?.lat,
                lng: charger.station?.lng,
                activeSession: null,
              });
              emitSessionUpdate({
                stationId: charger.stationId,
                operatorUserId: charger.station?.operatorUserId,
                session: { id: session?.id, status: "COMPLETED", endTs: now },
              });

              // Promote next in queue if any waiting
              const nextInQueue = await prisma.queueEntry.findFirst({
                where: {
                  stationId: charger.stationId,
                  connector: charger.connectorType,
                  status: "waiting",
                },
                orderBy: { joinedTs: "asc" },
              });

              if (nextInQueue) {
                logger.info(
                  { queueEntryId: nextInQueue.id, chargerId: charger.id },
                  "[OCPP] Promoting next waiting vehicle in queue"
                );
                emitQueuePromoted({
                  stationId: charger.stationId,
                  queueEntryId: nextInQueue.id,
                  vehicleRef: nextInQueue.vehicleRef,
                  chargerId: charger.id,
                });
              }

              await delStationCache(charger.stationId);
              emitStationDelta(charger.stationId, { chargerId: charger.id, status: "FREE" });
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
        logger.error({ err }, "[OCPP WS] Error handling frame");
      }
    });

    ws.on("close", () => {
      logger.info(`[OCPP 1.6J] Charge point disconnected: ${chargePointId}`);
    });
  });

  return wss;
}
