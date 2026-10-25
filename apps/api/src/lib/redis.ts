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

// In-memory fallback cache when Redis server is offline
const memoryStore = new Map<string, { val: string; exp?: number }>();
const memoryHash = new Map<string, Map<string, string>>();

export const redis = {
  async get(key: string): Promise<string | null> {
    try {
      const client = getRedis();
      if (client.status === "ready") {
        return await client.get(key);
      }
    } catch {
      // fallback below
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.exp && Date.now() > item.exp) {
      memoryStore.delete(key);
      return null;
    }
    return item.val;
  },

  async set(key: string, value: string, opts?: { ex?: number } | "EX"): Promise<void> {
    const exSec = typeof opts === "object" && opts?.ex ? opts.ex : undefined;
    try {
      const client = getRedis();
      if (client.status === "ready") {
        if (exSec) {
          await client.set(key, value, "EX", exSec);
        } else {
          await client.set(key, value);
        }
        return;
      }
    } catch {
      // fallback below
    }
    memoryStore.set(key, { val: value, exp: exSec ? Date.now() + exSec * 1000 : undefined });
  },

  async incr(key: string): Promise<number> {
    try {
      const client = getRedis();
      if (client.status === "ready") {
        return await client.incr(key);
      }
    } catch {
      // fallback below
    }
    const cur = Number(memoryStore.get(key)?.val ?? "0") + 1;
    memoryStore.set(key, { val: String(cur) });
    return cur;
  },

  async hset(key: string, data: Record<string, string>): Promise<number> {
    try {
      const client = getRedis();
      if (client.status === "ready") {
        return await client.hset(key, data);
      }
    } catch {
      // fallback below
    }
    let h = memoryHash.get(key);
    if (!h) {
      h = new Map();
      memoryHash.set(key, h);
    }
    for (const [k, v] of Object.entries(data)) {
      h.set(k, v);
    }
    return Object.keys(data).length;
  },

  async hmget(key: string, ...fields: string[]): Promise<Record<string, unknown>> {
    try {
      const client = getRedis();
      if (client.status === "ready") {
        const arr = await client.hmget(key, ...fields);
        const res: Record<string, unknown> = {};
        fields.forEach((f, idx) => {
          res[f] = arr[idx];
        });
        return res;
      }
    } catch {
      // fallback below
    }
    const h = memoryHash.get(key);
    const res: Record<string, unknown> = {};
    for (const f of fields) {
      res[f] = h?.get(f) ?? null;
    }
    return res;
  },
};

