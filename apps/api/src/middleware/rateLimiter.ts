import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { Request, Response, NextFunction } from "express";
import { getRedis } from "../lib/redis.js";
import logger from "../lib/logger.js";

function rateLimitHandler(message: string) {
  return (req: Request, res: Response, _next: NextFunction, options: any) => {
    const requestId = (req.headers["x-request-id"] as string) || (res.getHeader("x-request-id") as string) || undefined;
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.setHeader("Retry-After", retryAfter.toString());
    res.status(429).json({
      error: {
        code: "TOO_MANY_REQUESTS",
        message,
        requestId,
        retryAfter,
      },
    });
  };
}

function createAdaptiveLimiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) {
  const inMemory = rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { keyGeneratorIpFallback: false },
    keyGenerator: options.keyGenerator,
    skip: options.skip,
    handler: rateLimitHandler(options.message),
  });

  let redisLimiter: any = null;

  return (req: Request, res: Response, next: NextFunction) => {
    if (options.skip && options.skip(req)) {
      return next();
    }

    let client;
    try {
      client = getRedis();
    } catch {
      // Redis not configured
    }

    if (client && client.status === "ready") {
      if (!redisLimiter) {
        try {
          redisLimiter = rateLimit({
            windowMs: options.windowMs,
            limit: options.limit,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: options.keyGenerator,
            skip: options.skip,
            store: new RedisStore({
              sendCommand: (...args: string[]) => client.call(args[0], ...args.slice(1)) as any,
            }),
            handler: rateLimitHandler(options.message),
          });
        } catch (err) {
          logger.warn({ err }, "Redis rate limiter initialization failed, using in-memory");
        }
      }

      if (redisLimiter) {
        return redisLimiter(req, res, (err?: any) => {
          if (err) {
            logger.warn({ err }, "Redis rate limit check failed, failing open to in-memory");
            return inMemory(req, res, next);
          }
          next();
        });
      }
    }

    return inMemory(req, res, next);
  };
}

export const globalLimiter = createAdaptiveLimiter({
  windowMs: 60 * 1000,
  limit: 300,
  message: "Global rate limit exceeded (300 requests/minute).",
  skip: (req) => !!process.env.TWIN_SECRET && req.headers["x-twin-key"] === process.env.TWIN_SECRET,
});

export const writeLimiter = createAdaptiveLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req: Request) => req.user?.id || req.ip || "unknown",
  message: "Write rate limit exceeded (60 requests/minute).",
});

export const expensiveLimiter = createAdaptiveLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  message: "Too many recommendation/journey calculations (30 requests/minute).",
});
