import mqtt from "mqtt";
import type { ChargerStatus } from "@prisma/client";
import prisma from "./prisma";
import { getIO } from "./socket";

// Contract with scripts/mqtt-simulator (Phase 3):
// evtwin/chargers/<chargerId>/status  →  { "status": "FREE" | "BUSY" | "MAINTENANCE" }
const TOPIC = "evtwin/chargers/+/status";

export function initMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    console.warn("MQTT_BROKER_URL not set — skipping MQTT consumer");
    return;
  }

  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  });

  client.on("connect", () => {
    console.log("MQTT connected");
    client.subscribe(TOPIC, (err) => {
      if (err) console.error("MQTT subscribe error:", err);
    });
  });

  client.on("message", async (topic, payload) => {
    try {
      const chargerId = topic.split("/")[2];
      const data = JSON.parse(payload.toString()) as { status?: ChargerStatus };
      if (!chargerId || !data.status) return;

      const updated = await prisma.charger.update({
        where: { id: chargerId },
        data: { status: data.status },
      });

      getIO().emit("charger:update", updated);
    } catch (err) {
      console.error("Failed to process MQTT message:", err);
    }
  });

  client.on("error", (err) => {
    console.error("MQTT client error:", err);
  });

  return client;
}