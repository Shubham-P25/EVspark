import { getRedis } from "../lib/redis.js";
import logger from "../lib/logger.js";

export async function withRedisLock(
  lockKey: string,
  ttlSeconds: number,
  task: () => Promise<void>
): Promise<boolean> {
  let client;
  let acquired = false;

  try {
    client = getRedis();
    if (client.status === "ready") {
      const res = await client.set(lockKey, "locked", "EX", ttlSeconds, "NX");
      if (res !== "OK") {
        logger.info({ lockKey }, "Job lock held by another process; skipping execution.");
        return false;
      }
      acquired = true;
    }
  } catch (err) {
    logger.warn({ err }, "Could not acquire Redis lock; proceeding in fallback standalone mode.");
  }

  try {
    await task();
    return true;
  } finally {
    if (acquired && client) {
      try {
        await client.del(lockKey);
      } catch {
        // Safe to ignore
      }
    }
  }
}
