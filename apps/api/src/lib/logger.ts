import pino from "pino";
import { pinoHttp } from "pino-http";
import crypto from "crypto";

const isDev = process.env.NODE_ENV !== "production";
const logLevel = process.env.LOG_LEVEL || (isDev ? "debug" : "info");

export const logger = pino({
  level: logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "password",
      "token",
    ],
    remove: true,
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"] as string;
    const id = existing || crypto.randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});

export default logger;
