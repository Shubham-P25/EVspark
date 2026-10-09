import mqtt from "mqtt";
import prisma from "./prisma";
import { getIO } from "./socket";

export type ChargerStatus = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";

const TOPIC = "evtwin/chargers/+/status";

export function initMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.warn("[MQTT] MQTT_BROKER_URL not set — skipping MQTT consumer");
    return;
  }

  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  client.on("connect", () => {
    console.log("[MQTT] Connected to broker");
    client.subscribe(TOPIC, (err) => {
      if (err) console.error("[MQTT] Subscribe error:", err);
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
      console.error("[MQTT] Failed to process message:", err);
    }
  });

  client.on("error", (err) => {
    console.error("[MQTT] Client error:", err);
  });

  return client;
}