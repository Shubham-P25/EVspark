import "dotenv/config";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = process.env.API_URL || "http://localhost:4000";
const SIM_SPEED = Number(process.env.SIM_SPEED || 10);
const TICK_INTERVAL_MS = 2500; // 2.5s tick

console.log(`🔌 EVspark Twin Engine starting...`);
console.log(`Target API: ${API_URL}`);
console.log(`Simulation Speed Factor: ${SIM_SPEED}x`);

const socket = io(API_URL, {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log(`✓ Twin Engine connected to API Socket.io: ${socket.id}`);
  socket.emit("join:admin");
});

socket.on("disconnect", () => {
  console.warn("⚠️ Twin Engine disconnected from Socket.io");
});

let isRunning = false;

async function runTwinTick() {
  if (isRunning) return;
  isRunning = true;

  try {
    // 1. Fetch current stations and chargers
    const { data: stations } = await axios.get(`${API_URL}/api/stations`);
    if (!stations || stations.length === 0) {
      console.log("No stations found to simulate.");
      isRunning = false;
      return;
    }

    // Pick 1-2 random stations to simulate activity
    const randomStation = stations[Math.floor(Math.random() * stations.length)];
    if (!randomStation.chargers || randomStation.chargers.length === 0) {
      isRunning = false;
      return;
    }

    const randomCharger = randomStation.chargers[Math.floor(Math.random() * randomStation.chargers.length)];

    // State transition logic
    let nextStatus = randomCharger.status;
    const roll = Math.random();

    if (randomCharger.status === "FREE") {
      // 65% chance to start charging session
      if (roll < 0.65) {
        nextStatus = "BUSY";
      }
    } else if (randomCharger.status === "BUSY") {
      // 55% chance session completes
      if (roll < 0.55) {
        nextStatus = "FREE";
      } else if (roll > 0.96) {
        // 4% chance transient fault
        nextStatus = "MAINTENANCE";
      }
    } else if (randomCharger.status === "MAINTENANCE") {
      // 70% chance repaired
      if (roll < 0.70) {
        nextStatus = "FREE";
      }
    }

    if (nextStatus !== randomCharger.status) {
      console.log(`⚡ [Twin Tick] Charger ${randomCharger.label || randomCharger.id} @ ${randomStation.name}: ${randomCharger.status} → ${nextStatus}`);

      await axios.patch(`${API_URL}/api/operator/chargers/${randomCharger.id}/status`, {
        status: nextStatus,
      });
    }
  } catch (err) {
    console.error(`[Twin Engine Error]:`, err.message);
  } finally {
    isRunning = false;
  }
}

// Start simulation loop
setInterval(runTwinTick, TICK_INTERVAL_MS);

console.log(`🚀 Twin engine running ticks every ${TICK_INTERVAL_MS / 1000}s`);
