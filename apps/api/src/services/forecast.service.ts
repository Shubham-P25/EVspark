import prisma from "../lib/prisma.js";
import { cacheGet, cacheSet } from "../lib/redis.js";
import logger from "../lib/logger.js";

export interface ForecastResult {
  predictedWaitMin: number;
  confidence: number;
  modelVersion: string;
  source: "model" | "fallback" | "fallback-curve";
}

const persistedBuckets = new Set<string>();

export async function getForecast(
  stationId: string,
  atTs: Date = new Date(),
  fallbackCurrentWait: number = 0
): Promise<ForecastResult> {
  const yyyyMMddHH = atTs.toISOString().slice(0, 13).replace(/[-T]/g, "");
  const cacheKey = `forecast:${stationId}:${yyyyMMddHH}`;

  // 1. Check Redis cache
  const cached = await cacheGet<ForecastResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const horizonMin = Math.max(Math.round((atTs.getTime() - Date.now()) / (60 * 1000)), 15);

  let result: ForecastResult | null = null;

  // 2. Call ML Service with 1.5s timeout and 1 retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(`${mlUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: stationId,
          current_wait: fallbackCurrentWait,
          target_ts: atTs.toISOString(),
          horizon_min: horizonMin,
        }),
        signal: AbortSignal.timeout(1500),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        result = {
          predictedWaitMin: Number(data.predicted_wait_min ?? fallbackCurrentWait),
          confidence: Number(data.confidence ?? 0.8),
          modelVersion: String(data.model_version ?? "LightGBM-Hybrid-v1"),
          source: (data.source as any) || "model",
        };
        break;
      }
    } catch (err) {
      if (attempt === 2) {
        logger.warn({ err, stationId, attempt }, "ML forecast call failed, using fallback");
      }
    }
  }

  // 3. Fallback on failure
  if (!result) {
    result = {
      predictedWaitMin: fallbackCurrentWait,
      confidence: 0.5,
      modelVersion: "fallback-curve-v1",
      source: "fallback",
    };
  }

  // 4. Cache in Redis (1 hour TTL)
  await cacheSet(cacheKey, result, 3600);

  // 5. Persist to DB at most once per station per hour bucket
  const bucketKey = `${stationId}:${yyyyMMddHH}`;
  if (!persistedBuckets.has(bucketKey)) {
    persistedBuckets.add(bucketKey);
    // Persist asynchronously without blocking
    prisma.forecast
      .create({
        data: {
          stationId,
          madeAt: new Date(),
          horizonMin,
          predictedWait: result.predictedWaitMin,
        },
      })
      .catch((err) => {
        logger.warn({ err, stationId }, "Failed to persist forecast to database");
      });
  }

  return result;
}
