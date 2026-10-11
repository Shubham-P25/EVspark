import cron from "node-cron";
import logger from "../lib/logger.js";
import { runHourlyRollup } from "./hourlyRollup.js";
import { runRetentionCleanup } from "./retentionCleanup.js";
import { runForecastEvaluation } from "./forecastEvaluation.js";
import { runForecastRefresh } from "./forecastRefresh.js";

export function initScheduler(): void {
  const driver = process.env.QUEUE_DRIVER || "cron";
  logger.info({ driver }, "Initializing background jobs scheduler");

  if (driver === "cron") {
    // 1. Hourly Rollup at minute 5 of every hour
    cron.schedule("5 * * * *", async () => {
      try {
        await runHourlyRollup();
      } catch (err) {
        logger.error({ err }, "Cron error in hourlyRollup");
      }
    });

    // 2. Retention cleanup once a day at 03:00
    cron.schedule("0 3 * * *", async () => {
      try {
        await runRetentionCleanup();
      } catch (err) {
        logger.error({ err }, "Cron error in retentionCleanup");
      }
    });

    // 3. Forecast evaluation every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
      try {
        await runForecastEvaluation();
      } catch (err) {
        logger.error({ err }, "Cron error in forecastEvaluation");
      }
    });

    // 4. Forecast refresh every 30 minutes
    cron.schedule("*/30 * * * *", async () => {
      try {
        await runForecastRefresh();
      } catch (err) {
        logger.error({ err }, "Cron error in forecastRefresh");
      }
    });

    logger.info("Scheduled cron jobs: hourlyRollup, retentionCleanup, forecastEvaluation, forecastRefresh");
  } else {
    logger.info("Queue driver is bullmq; repeatable jobs managed via BullMQ.");
  }
}
