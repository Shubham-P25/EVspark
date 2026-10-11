import { getHourlyWeight } from "./profile";
import { TwinConfig } from "./config";

function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

export function computeStationArrivals(
  stationId: string,
  now: Date,
  config: TwinConfig,
  intervalMinutes: number = 1.0
): number {
  if (!config.running) return 0;

  const baseRate = config.arrivalsPerMin;
  const hourlyWeight = getHourlyWeight(now);
  const isSurge = config.surgeStations.includes(stationId);
  const surgeFactor = isSurge ? config.surgeMultiplier : 1.0;

  // Arrival rate per minute
  const lambda = baseRate * hourlyWeight * surgeFactor * (intervalMinutes / 50.0); // distributed across stations
  return samplePoisson(lambda);
}
