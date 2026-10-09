import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./lib/socket";
import { initOcppWs } from "./lib/ocpp";
import { initMqtt } from "./lib/mqtt";
import prisma from "./lib/prisma";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

// Health & Readiness checks (Section 5 / 10)
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/healthz", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/readyz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", db: "connected", timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: "not ready", error: err.message });
  }
});

// API Routes
app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

// Initialize Socket.io and OCPP 1.6J WebSocket
initSocket(httpServer);
initOcppWs(httpServer);
initMqtt();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`⚡ EVspark API listening on port ${PORT}`);
  console.log(`🔌 OCPP 1.6J WebSocket listening on ws://localhost:${PORT}/ocpp/1.6/:chargePointId`);
});