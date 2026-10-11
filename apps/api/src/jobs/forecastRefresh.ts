import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { withRedisLock } from "./lock.js";
import { getForecast } from "../services/forecast.service.js";

export async function runForecastRefresh(): Promise<void> {
  await withRedisLock("job:forecastRefresh", 300, async () => {
    logger.info("Starting forecast refresh job...");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find stations with recent activity in last 24h
    const activeSessions = await prisma.session.findMany({
      where: { startTs: { gte: oneDayAgo } },
      select: { stationId: true },
      distinct: ["stationId"],
      take: 50,
    });

    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    let refreshedCount = 0;

    for (const s of activeSessions) {
      try {
        await getForecast(s.stationId, nextHour, 0);
        refreshedCount++;
      } catch (err) {
        logger.warn({ err, stationId: s.stationId }, "Failed to prefetch forecast");
      }
    }

    logger.info({ refreshedCount }, "Forecast refresh job completed.");
  });
}
