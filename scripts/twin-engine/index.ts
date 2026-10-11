import dotenv from "dotenv";
import path from "path";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import prisma from "../../apps/api/src/lib/prisma";
import { getTwinConfig } from "./config";
import { computeStationArrivals } from "./arrivals";
import { sampleSimulatedVehicle, SimulatedVehicle } from "./vehicle";
import { OcppChargePointClient } from "./ocpp-client";
import { checkAndSimulateFaults } from "./faults";
import { processQueueAbandonment } from "./abandonment";
import { sampleDurationMinutes } from "./profile";
import { focusIds, nextFocusDelayMs } from "./focus";

interface ActiveChargingSession {
  stationId: string;
  chargerId: string;
  vehicle: SimulatedVehicle;
  chargePointClient: OcppChargePointClient;
  transactionId: number;
  socCurrent: number;
  socTarget: number;
  energyKwh: number;
  totalDurationMin: number;
  elapsedMin: number;
  powerKw: number;
}

const ocppClients = new Map<string, OcppChargePointClient>();
const activeSessions: ActiveChargingSession[] = [];
const nextFocusArrivalAt = new Map<string, number>();
let simMinute = 0;
let isStopping = false;

async function sendTelemetryPing(vehicleRef: string, station: { id: string; lat: number; lng: number }) {
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const twinSecret = process.env.TWIN_SECRET || "dev-twin-secret";

  try {
    await fetch(`${apiUrl}/api/telemetry/ping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-twin-key": twinSecret,
      },
      body: JSON.stringify({
        vehicleRef,
        stationId: station.id,
        lat: station.lat,
        lng: station.lng,
        intent: "heading_to",
      }),
    });
  } catch {
    // Fail-safe if API offline
  }
}

function getOrCreateOcppClient(ocppId: string, ocppBaseUrl: string): OcppChargePointClient {
  let client = ocppClients.get(ocppId);
  if (!client) {
    client = new OcppChargePointClient(ocppId, ocppBaseUrl);
    ocppClients.set(ocppId, client);
  }
  return client;
}

async function runTwinLoop() {
  console.log("⚡ Starting EVspark Digital Twin Engine...");
  const ocppBaseUrl = process.env.OCPP_URL || "ws://localhost:4000/ocpp/1.6";

  // Pre-fetch stations and chargers
  const stations = await prisma.station.findMany({
    include: { chargers: true },
  });
  console.log(`[Twin Engine] Loaded ${stations.length} stations and ${stations.reduce((a, s) => a + s.chargers.length, 0)} chargers.`);

  // Connect clients lazily or pre-connect
  console.log("[Twin Engine] Pre-connecting OCPP charge points...");
  for (const st of stations) {
    for (const ch of st.chargers) {
      const chargePointId = ch.ocppId || ch.label || ch.id;
      const client = getOrCreateOcppClient(chargePointId, ocppBaseUrl);
      client.connect().catch(() => {});
    }
  }

  // Allow connections to establish
  await new Promise((r) => setTimeout(r, 1500));

  console.log("🚀 Twin engine loop active. Running simulation ticks...");

  while (!isStopping) {
    const config = await getTwinConfig();
    if (!config.running) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    const simTime = new Date();
    simMinute++;

    // 1. Process Arrivals
    for (const st of stations) {
      let arrivalsCount = 0;
      if (focusIds.has(st.id)) {
        const nextTime = nextFocusArrivalAt.get(st.id) ?? 0;
        if (Date.now() >= nextTime) {
          arrivalsCount = 1;
          const delay = nextFocusDelayMs() / Math.max(1, config.speed);
          nextFocusArrivalAt.set(st.id, Date.now() + delay);
        }
      } else {
        arrivalsCount = computeStationArrivals(st.id, simTime, config, 1.0);
      }
      for (let a = 0; a < arrivalsCount; a++) {
        const vehicle = await sampleSimulatedVehicle();

        // Send telemetry ping
        await sendTelemetryPing(vehicle.vehicleRef, st);

        // Find available compatible charger
        const freeCharger = st.chargers.find((c) => {
          const isBusyOrFaulted = activeSessions.some((s) => s.chargerId === c.id);
          const isCompatible = vehicle.connectors.some(
            (conn) => conn.toLowerCase() === c.connectorType.toLowerCase()
          );
          return !isBusyOrFaulted && isCompatible && c.status === "FREE";
        });

        if (freeCharger) {
          const client = getOrCreateOcppClient(freeCharger.ocppId || freeCharger.label || freeCharger.id, ocppBaseUrl);
          const durationMin = sampleDurationMinutes();
          const txRes = await client.sendStartTransaction(vehicle.socStart, vehicle.vehicleRef, "twin", durationMin);
          const transactionId = txRes.transactionId || Math.floor(Date.now() / 1000);

          activeSessions.push({
            stationId: st.id,
            chargerId: freeCharger.id,
            vehicle,
            chargePointClient: client,
            transactionId,
            socCurrent: vehicle.socStart,
            socTarget: vehicle.socTarget,
            energyKwh: 0,
            totalDurationMin: durationMin,
            elapsedMin: 0,
            powerKw: freeCharger.powerKw,
          });

          console.log(`[Arrival] Vehicle ${vehicle.vehicleRef} plugged into ${freeCharger.label || freeCharger.id} at ${st.name} (target: ${vehicle.socTarget}%, ${durationMin}m)`);
        } else {
          // Add to queue
          await prisma.queueEntry.create({
            data: {
              stationId: st.id,
              vehicleRef: vehicle.vehicleRef,
              vehicleModelId: vehicle.vehicleModelId,
              connector: vehicle.connectors[0] || "CCS2",
              status: "waiting",
            },
          });
          console.log(`[Queue] Vehicle ${vehicle.vehicleRef} joined queue at ${st.name}`);
        }
      }

      // Check abandonment for busy stations
      await processQueueAbandonment(st.id, 30);
    }

    // 2. Advance Active Charging Sessions
    for (let i = activeSessions.length - 1; i >= 0; i--) {
      const s = activeSessions[i];
      s.elapsedMin += 1;

      // Energy delivered this minute = (powerKw * 1/60)
      const kwhThisMin = (s.powerKw / 60) * 0.92; // 92% efficiency
      s.energyKwh += kwhThisMin;

      // Update SoC
      const socGain = (kwhThisMin / s.vehicle.batteryKwh) * 100;
      s.socCurrent = Math.min(100, Math.round(s.socCurrent + socGain));

      // Send periodic MeterValues (every 5 sim-minutes or when complete)
      if (s.elapsedMin % 5 === 0 || s.socCurrent >= s.socTarget || s.elapsedMin >= s.totalDurationMin) {
        await s.chargePointClient.sendMeterValues(s.transactionId, Math.round(s.energyKwh * 10) / 10, s.socCurrent);
      }

      // Check if session finished
      if (s.socCurrent >= s.socTarget || s.elapsedMin >= s.totalDurationMin) {
        console.log(`[Stop] Session finished for ${s.vehicle.vehicleRef} at charger ${s.chargerId}: ${s.socCurrent}%, ${Math.round(s.energyKwh)} kWh`);
        await s.chargePointClient.sendStopTransaction(s.transactionId, Math.round(s.energyKwh * 1000), s.socCurrent);
        activeSessions.splice(i, 1);
      }
    }

    // 3. Check Faults
    const allChargersList = stations.flatMap((s) =>
      s.chargers.map((c) => ({
        id: c.id,
        client: getOrCreateOcppClient(c.ocppId || c.label || c.id, ocppBaseUrl),
        status: c.status,
      }))
    );
    checkAndSimulateFaults(allChargersList, simMinute, 1.0);

    // Periodic summary log every 10 ticks
    if (simMinute % 10 === 0) {
      console.log(`[Twin Engine] Sim Minute ${simMinute} | Active Charging: ${activeSessions.length} | Speed: ${config.speed}x`);
    }

    // Tick delay based on speed multiplier (e.g. 10x -> 60s / 10 = 6s)
    const tickDelayMs = Math.max(200, Math.floor(60000 / config.speed));
    await new Promise((r) => setTimeout(r, tickDelayMs));
  }

  // Graceful shutdown
  console.log("[Twin Engine] Shutting down...");
  for (const client of ocppClients.values()) {
    client.disconnect();
  }
}

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT, stopping twin engine...");
  isStopping = true;
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM, stopping twin engine...");
  isStopping = true;
});

if (process.argv[1]?.includes("twin-engine")) {
  runTwinLoop()
    .catch((err) => {
      console.error("[Twin Engine] Fatal error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
