import { Redis, RedisOptions } from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const options: RedisOptions = {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        return Math.min(times * 100, 2000);
      },
    };

    if (redisUrl.startsWith("rediss://")) {
      options.tls = {
        rejectUnauthorized: false,
      };
    }

    redisClient = new Redis(redisUrl, options);

    redisClient.on("error", () => {
      // Redis errors caught to prevent unhandled rejections
    });
  }

  return redisClient;
}

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect().catch(() => {});
    }
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  try {
    const client = getRedis();
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect().catch(() => {});
    }
    const serialized = JSON.stringify(value);
    await client.set(key, serialized, "EX", ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

export async function delStationCache(stationId: string): Promise<void> {
  try {
    const client = getRedis();
    if (client.status === "ready" || client.status === "connecting") {
      await client.del(`station:${stationId}`, `waittime:${stationId}`);
    }
  } catch {
    // Fail-safe
  }
}

export async function checkRedisHealth(): Promise<{ status: "ok" | "down"; latencyMs?: number; error?: string }> {
  try {
    const client = getRedis();
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect().catch(() => {});
    }
    const start = Date.now();
    const pong = await client.ping();
    if (pong === "PONG") {
      return { status: "ok", latencyMs: Date.now() - start };
    }
    return { status: "down", error: "Unexpected response from Redis" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Redis connection failed";
    return { status: "down", error: message };
  }
}
