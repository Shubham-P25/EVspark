import mqtt from "mqtt";
import prisma from "./prisma";
import { emitChargerUpdate, emitSessionUpdate, emitStationDelta } from "./socket";
import logger from "./logger";

export type ChargerStatus = "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";
const STATUSES = new Set(["FREE", "BUSY", "MAINTENANCE", "FAULTED", "OFFLINE"]);

const TELEMETRY_TOPIC = "evtwin/stations/+/chargers/+/telemetry";
const LEGACY_TOPIC = "evtwin/chargers/+/status";
const FEED_STATUS_TOPIC = "evtwin/feed/+/status";

interface Telemetry {
  ts: Date;
  status: ChargerStatus;
  sessionId?: string;
  powerKw?: number;
  energyKwh?: number;
  soc?: number;
  socStart?: number;
  vehicle?: string;
  startedAt?: Date;
  source: "twin" | "real";
}

const stats = { received: 0, rejected: 0, processed: 0 };

function num(v: unknown, lo: number, hi: number): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) throw new Error("number out of range");
  return v;
}

export function parseTelemetry(raw: string): Telemetry {
  const d = JSON.parse(raw);
  if (!d || typeof d !== "object") throw new Error("payload must be an object");
  if (!STATUSES.has(d.status)) throw new Error("invalid status");
  const ts = d.ts ? new Date(d.ts) : new Date();
  if (isNaN(ts.getTime())) throw new Error("invalid ts");
  const age = Date.now() - ts.getTime();
  if (age > 24 * 3600 * 1000 || age < -5 * 60 * 1000) throw new Error("ts too old or in the future");
  if (d.sessionId !== undefined && (typeof d.sessionId !== "string" || d.sessionId.length > 64)) {
    throw new Error("invalid sessionId");
  }
  if (d.status === "BUSY" && !d.sessionId) throw new Error("sessionId required while BUSY");
  let startedAt: Date | undefined;
  if (d.startedAt !== undefined) {
    startedAt = new Date(d.startedAt);
    if (isNaN(startedAt.getTime()) || startedAt.getTime() > ts.getTime() + 60_000 || ts.getTime() - startedAt.getTime() > 12 * 3600 * 1000) {
      throw new Error("invalid startedAt");
    }
  }
  return {
    startedAt,
    ts,
    status: d.status,
    sessionId: d.sessionId,
    powerKw: num(d.powerKw, 0, 400),
    energyKwh: num(d.energyKwh, 0, 300),
    soc: num(d.soc, 0, 100),
    socStart: num(d.socStart, 0, 100),
    vehicle: typeof d.vehicle === "string" ? d.vehicle.slice(0, 80) : undefined,
    source: d.source === "real" ? "real" : "twin",
  };
}

async function handleTelemetry(stationId: string, chargerId: string, t: Telemetry) {
  const charger = await prisma.charger.findUnique({
    where: { id: chargerId },
    include: { station: { select: { id: true, operatorUserId: true, pricePerKwh: true } } },
  });
  if (!charger || charger.stationId !== stationId) {
    stats.rejected++;
    logger.warn({ stationId, chargerId }, "[MQTT] unknown charger/station pair, dropped");
    return;
  }

  // ---- session lifecycle ----
  if (t.status === "BUSY" && t.sessionId) {
    const energy = t.energyKwh ?? 0;
    const session = await prisma.session.upsert({
      where: { externalId: t.sessionId },
      create: {
        externalId: t.sessionId,
        stationId,
        chargerId,
        startTs: t.startedAt ?? t.ts,
        socStart: t.socStart ?? t.soc ?? null,
        energyKwh: energy,
        amountInr: +(energy * (charger.station.pricePerKwh || 15)).toFixed(2),
        source: t.source,
      },
      update: {
        energyKwh: energy,
        amountInr: +(energy * (charger.station.pricePerKwh || 15)).toFixed(2),
      },
    });
    emitSessionUpdate({ stationId, operatorUserId: charger.station.operatorUserId, session });
  } else {
    // charger no longer BUSY -> close any open session on it
    const open = await prisma.session.findMany({
      where: { chargerId, endTs: null, externalId: { not: null } },
      select: { id: true, energyKwh: true },
    });
    for (const o of open) {
      const energy = t.energyKwh ?? o.energyKwh ?? 0;
      const closed = await prisma.session.update({
        where: { id: o.id },
        data: {
          endTs: t.ts,
          socEnd: t.soc ?? null,
          energyKwh: energy,
          amountInr: +(energy * (charger.station.pricePerKwh || 15)).toFixed(2),
        },
      });
      emitSessionUpdate({ stationId, operatorUserId: charger.station.operatorUserId, session: closed });
    }
  }

  // ---- charger status change ----
  if (charger.status !== t.status) {
    const updated = await prisma.charger.update({ where: { id: chargerId }, data: { status: t.status as any } });
    await prisma.chargerEvent.create({
      data: { chargerId, status: t.status as any, ts: t.ts, payload: JSON.stringify({ source: t.source, via: "mqtt" }) },
    });
    emitChargerUpdate(updated);
    emitStationDelta(stationId);
  }
  stats.processed++;
}

export function initMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl) {
    logger.warn("[MQTT] MQTT_BROKER_URL not set — skipping MQTT consumer");
    return;
  }

  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 2000,
  });

  client.on("connect", () => {
    logger.info("[MQTT] Connected to broker");
    client.subscribe([TELEMETRY_TOPIC, LEGACY_TOPIC, FEED_STATUS_TOPIC], { qos: 1 }, (err) => {
      if (err) logger.error({ err }, "[MQTT] Subscribe error");
    });
  });

  client.on("message", async (topic, payload) => {
    stats.received++;
    try {
      const parts = topic.split("/");
      if (parts[0] === "evtwin" && parts[1] === "feed" && parts[3] === "status") {
        logger.info({ feed: parts[2], state: payload.toString() }, "[MQTT] feed status");
        return;
      }
      if (parts.length === 6 && parts[1] === "stations" && parts[3] === "chargers" && parts[5] === "telemetry") {
        await handleTelemetry(parts[2], parts[4], parseTelemetry(payload.toString()));
        return;
      }
      if (parts.length === 4 && parts[1] === "chargers" && parts[3] === "status") {
        // legacy: status only, no session handling
        const data = JSON.parse(payload.toString());
        if (!STATUSES.has(data?.status)) throw new Error("invalid status");
        const updated = await prisma.charger.update({ where: { id: parts[2] }, data: { status: data.status } });
        emitChargerUpdate(updated);
        return;
      }
      stats.rejected++;
    } catch (err) {
      stats.rejected++;
      logger.warn({ err: (err as Error).message, topic }, "[MQTT] message rejected");
    }
  });

  client.on("error", (err) => logger.error({ err }, "[MQTT] Client error"));
  setInterval(() => logger.info(stats, "[MQTT] stats"), 60_000).unref();
  return client;
}