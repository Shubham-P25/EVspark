import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { withRedisLock } from "./lock.js";

export async function runRetentionCleanup(): Promise<void> {
  await withRedisLock("job:retentionCleanup", 300, async () => {
    logger.info("Starting retention cleanup job...");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // 1. Delete ChargerEvent older than 7 days if hourly rollup exists
    const eventsToDelete = await prisma.chargerEvent.findMany({
      where: {
        ts: { lt: sevenDaysAgo },
      },
      select: { id: true, ts: true, charger: { select: { stationId: true } } },
      take: 1000,
    });

    let deletedEvents = 0;
    for (const evt of eventsToDelete) {
      const hourTs = new Date(evt.ts);
      hourTs.setMinutes(0, 0, 0);

      const hasRollup = await prisma.stationMetricHourly.findUnique({
        where: {
          stationId_hourTs: {
            stationId: evt.charger.stationId,
            hourTs,
          },
        },
      });

      if (hasRollup) {
        await prisma.chargerEvent.delete({ where: { id: evt.id } });
        deletedEvents++;
      }
    }

    // 2. Delete Session older than 90 days if hourly rollup exists
    const sessionsToDelete = await prisma.session.findMany({
      where: {
        startTs: { lt: ninetyDaysAgo },
      },
      select: { id: true, stationId: true, startTs: true },
      take: 500,
    });

    let deletedSessions = 0;
    for (const s of sessionsToDelete) {
      const hourTs = new Date(s.startTs);
      hourTs.setMinutes(0, 0, 0);

      const hasRollup = await prisma.stationMetricHourly.findUnique({
        where: {
          stationId_hourTs: {
            stationId: s.stationId,
            hourTs,
          },
        },
      });

      if (hasRollup) {
        await prisma.session.delete({ where: { id: s.id } });
        deletedSessions++;
      }
    }

    logger.info({ deletedEvents, deletedSessions }, "Retention cleanup job completed.");
  });
}
