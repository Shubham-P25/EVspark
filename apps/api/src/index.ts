import "./instrument";
import { Sentry } from "./instrument";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";

import routes from "./routes";
import { errorHandler, AppError } from "./middleware/errorHandler";
import { initSocket } from "./lib/socket";
import { initOcppWs } from "./lib/ocpp";
import { initMqtt } from "./lib/mqtt";
import prisma from "./lib/prisma";
import { checkRedisHealth } from "./lib/redis";
import { httpLogger, logger } from "./lib/logger";
import { globalLimiter, expensiveLimiter, writeLimiter } from "./middleware/rateLimiter";
import { assertProductionEnv } from "./lib/env";

assertProductionEnv();

export const app = express();
const httpServer = createServer(app);

// 1. Trust proxy configuration (for Render, Cloudflare, etc.)
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
}

// 2. Security hardening & parsing
app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(httpLogger);

// 3. CORS allow-list from WEB_ORIGIN
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(new AppError(403, "CORS_FORBIDDEN", `Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "100kb" }));

// 4. Rate Limiting
app.use(globalLimiter);

// Rate limiter for write requests
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// Rate limiter for expensive endpoints
app.use(["/api/recommend", "/api/journeys/plan"], expensiveLimiter);

// 5. Health & Readiness checks
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/healthz", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/readyz", async (_req, res) => {
  let dbStatus = "down";
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : "Database check failed";
  }

  const redisHealth = await checkRedisHealth();
  const isReady = dbStatus === "ok" && redisHealth.status === "ok";
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    status: isReady ? "ready" : "degraded",
    components: {
      db: { status: dbStatus, error: dbError },
      redis: redisHealth,
    },
    timestamp: new Date().toISOString(),
  });
});

// 6. API Routes
app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

import { initScheduler } from "./jobs/scheduler";

// 7. Initialize Socket.io, OCPP 1.6J WebSocket, scheduler, and optional MQTT
if (process.env.NODE_ENV !== "test") {
  initSocket(httpServer);
  initOcppWs(httpServer);
  if (process.env.ENABLE_MQTT === "true") {
    initMqtt();
  }
  initScheduler();

  const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
  httpServer.listen(PORT, () => {
    logger.info(`⚡ EVspark API listening on port ${PORT}`);
    logger.info(`🔌 OCPP 1.6J WebSocket listening on ws://localhost:${PORT}/ocpp/1.6/:chargePointId`);
  });
}