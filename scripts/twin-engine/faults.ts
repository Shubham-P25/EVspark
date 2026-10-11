import { OcppChargePointClient } from "./ocpp-client";

interface ActiveFault {
  chargerId: string;
  client: OcppChargePointClient;
  clearsAtSimMinute: number;
}

const activeFaults = new Map<string, ActiveFault>();

export function checkAndSimulateFaults(
  chargers: Array<{ id: string; client: OcppChargePointClient; status: string }>,
  currentSimMinute: number,
  deltaSimMinutes: number
): void {
  // 1. Check auto-clearing faults
  for (const [chargerId, fault] of activeFaults.entries()) {
    if (currentSimMinute >= fault.clearsAtSimMinute) {
      console.log(`[Faults] Auto-clearing fault for charger ${chargerId} at minute ${currentSimMinute}`);
      fault.client.sendStatusNotification("Available").catch(() => {});
      activeFaults.delete(chargerId);
    }
  }

  // 2. Probabilistic fault occurrence:
  // 0.5% probability per hour = 0.005 / 60 per minute
  const faultProbabilityPerMinute = (0.005 / 60) * deltaSimMinutes;

  for (const c of chargers) {
    if (activeFaults.has(c.id)) continue;
    if (Math.random() < faultProbabilityPerMinute) {
      const durationMinutes = Math.floor(15 + Math.random() * 31); // 15–45 sim-minutes
      const clearsAt = currentSimMinute + durationMinutes;
      console.log(`[Faults] Fault triggered on charger ${c.id}, duration: ${durationMinutes}m (until min ${clearsAt})`);
      c.client.sendStatusNotification("Faulted").catch(() => {});
      activeFaults.set(c.id, {
        chargerId: c.id,
        client: c.client,
        clearsAtSimMinute: clearsAt,
      });
    }
  }
}
