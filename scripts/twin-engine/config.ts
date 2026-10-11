import "dotenv/config";
import prisma from "../../apps/api/src/lib/prisma";

export interface TwinConfig {
  speed: number;
  surgeStations: string[];
  seed: number;
  arrivalsPerMin: number;
  running: boolean;
  surgeMultiplier: number;
}

let cachedConfig: TwinConfig = {
  speed: 10,
  surgeStations: [],
  seed: 42,
  arrivalsPerMin: 0.5,
  running: true,
  surgeMultiplier: 2.0,
};

let lastFetch = 0;

export async function getTwinConfig(): Promise<TwinConfig> {
  const now = Date.now();
  if (now - lastFetch < 30000 && lastFetch > 0) {
    return cachedConfig;
  }

  try {
    const dbConfig = await prisma.simConfig.findFirst({
      where: { id: "default" },
    });

    if (dbConfig) {
      cachedConfig = {
        speed: dbConfig.speed || 10,
        surgeStations: dbConfig.surgeStations ? dbConfig.surgeStations.split(",").map((s) => s.trim()).filter(Boolean) : [],
        seed: dbConfig.seed || 42,
        arrivalsPerMin: dbConfig.arrivalsPerMin || 0.5,
        running: dbConfig.running !== false,
        surgeMultiplier: dbConfig.surgeMultiplier || 2.0,
      };
    } else {
      await prisma.simConfig.create({
        data: {
          id: "default",
          speed: cachedConfig.speed,
          surgeStations: cachedConfig.surgeStations.join(","),
          seed: cachedConfig.seed,
          arrivalsPerMin: cachedConfig.arrivalsPerMin,
          running: cachedConfig.running,
          surgeMultiplier: cachedConfig.surgeMultiplier,
        },
      });
    }
  } catch (err) {
    // If DB read fails, keep using cachedConfig
    console.warn("[Twin Config] Failed to read SimConfig from DB, using cached values:", (err as Error).message);
  }

  lastFetch = now;
  return cachedConfig;
}
