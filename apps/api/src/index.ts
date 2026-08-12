import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { initSocket } from "./lib/socket";
import { initMqtt } from "./lib/mqtt";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

initSocket(httpServer);
initMqtt();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});