import mqtt from "mqtt";
import prisma from "./prisma";
import { getIO } from "./socket";
import logger from "./logger";

export type ChargerStatus = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";

const TOPIC = "evtwin/chargers/+/status";

export function initMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    logger.warn("[MQTT] MQTT_BROKER_URL not set — skipping MQTT consumer");
    return;
  }

  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  client.on("connect", () => {
    logger.info("[MQTT] Connected to broker");
    client.subscribe(TOPIC, (err) => {
      if (err) logger.error({ err }, "[MQTT] Subscribe error");
    });
  });

  client.on("message", async (topic, payload) => {
    try {
      const chargerId = topic.split("/")[2];
      const data = JSON.parse(payload.toString()) as { status?: ChargerStatus };
      if (!chargerId || !data.status) return;

      const updated = await prisma.charger.update({
        where: { id: chargerId },
        data: { status: data.status as any },
      });

      getIO().emit("charger:update", updated);
    } catch (err) {
      logger.error({ err }, "[MQTT] Failed to process message");
    }
  });

  client.on("error", (err) => {
    logger.error({ err }, "[MQTT] Client error");
  });

  return client;
}