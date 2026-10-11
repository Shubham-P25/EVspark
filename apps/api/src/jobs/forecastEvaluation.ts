import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { withRedisLock } from "./lock.js";

export async function runForecastEvaluation(): Promise<void> {
  await withRedisLock("job:forecastEvaluation", 300, async () => {
    logger.info("Starting forecast evaluation job...");

    const now = new Date();

    // Find forecasts whose horizon has passed and actualWait is not yet set
    const forecasts = await prisma.forecast.findMany({
      where: {
        actualWait: null,
      },
      take: 200,
    });

    let evaluatedCount = 0;

    for (const f of forecasts) {
      const horizonDate = new Date(f.madeAt.getTime() + f.horizonMin * 60 * 1000);
      if (horizonDate <= now) {
        // Calculate actual queue wait recorded around the horizon time
        const windowStart = new Date(horizonDate.getTime() - 15 * 60 * 1000);
        const windowEnd = new Date(horizonDate.getTime() + 15 * 60 * 1000);

        const sessions = await prisma.session.findMany({
          where: {
            stationId: f.stationId,
            startTs: { gte: windowStart, lte: windowEnd },
            queueWaitMin: { not: null },
          },
        });

        let actualWait = 0;
        if (sessions.length > 0) {
          const totalWait = sessions.reduce((acc, s) => acc + (s.queueWaitMin || 0), 0);
          actualWait = +(totalWait / sessions.length).toFixed(1);
        }

        await prisma.forecast.update({
          where: { id: f.id },
          data: { actualWait },
        });

        evaluatedCount++;
      }
    }

    logger.info({ evaluatedCount }, "Forecast evaluation job completed.");
  });
}
