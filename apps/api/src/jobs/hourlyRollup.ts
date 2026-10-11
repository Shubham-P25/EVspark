import prisma from "../lib/prisma.js";
import logger from "../lib/logger.js";
import { withRedisLock } from "./lock.js";

export async function runHourlyRollup(targetDate?: Date): Promise<void> {
  await withRedisLock("job:hourlyRollup", 300, async () => {
    const now = targetDate || new Date();
    // Default to preceding hour
    const startHour = new Date(now);
    startHour.setMinutes(0, 0, 0);
    startHour.setHours(startHour.getHours() - 1);

    const endHour = new Date(startHour.getTime() + 60 * 60 * 1000);

    logger.info({ startHour, endHour }, "Starting hourly rollup job...");

    const stations = await prisma.station.findMany({
      select: { id: true, pricePerKwh: true, chargers: { select: { id: true } } },
    });

    let rollupCount = 0;

    for (const st of stations) {
      // 1. Sessions completed or running in this hour
      const sessions = await prisma.session.findMany({
        where: {
          stationId: st.id,
          startTs: { gte: startHour, lt: endHour },
        },
      });

      const sessionCount = sessions.length;
      const energyKwh = sessions.reduce((acc, s) => acc + (s.energyKwh || 0), 0);
      const revenueInr = energyKwh * (st.pricePerKwh || 15);

      // 2. Average queue wait time in minutes
      const sessionsWithWait = sessions.filter((s) => s.queueWaitMin != null);
      const totalWaitMin = sessionsWithWait.reduce((acc, s) => acc + (s.queueWaitMin || 0), 0);
      const avgWaitMin = sessionsWithWait.length > 0 ? +(totalWaitMin / sessionsWithWait.length).toFixed(1) : 0;

      // 3. Charger occupancy percentage
      const totalChargers = Math.max(st.chargers.length, 1);
      const chargerCapacityMinutes = totalChargers * 60;
      const sessionDurationMinutes = sessions.reduce((acc, s) => {
        const end = s.endTs || endHour;
        return acc + Math.min(60, Math.max(0, (end.getTime() - s.startTs.getTime()) / (60 * 1000)));
      }, 0);

      const occupancyPct = Math.min(100, +((sessionDurationMinutes / chargerCapacityMinutes) * 100).toFixed(1));

      // 4. Upsert StationMetricHourly
      await prisma.stationMetricHourly.upsert({
        where: {
          stationId_hourTs: {
            stationId: st.id,
            hourTs: startHour,
          },
        },
        create: {
          stationId: st.id,
          hourTs: startHour,
          sessions: sessionCount,
          energyKwh: +energyKwh.toFixed(2),
          revenueInr: +revenueInr.toFixed(2),
          avgWaitMin,
          occupancyPct,
        },
        update: {
          sessions: sessionCount,
          energyKwh: +energyKwh.toFixed(2),
          revenueInr: +revenueInr.toFixed(2),
          avgWaitMin,
          occupancyPct,
        },
      });

      rollupCount++;
    }

    logger.info({ rollupCount }, "Hourly rollup job completed successfully.");
  });
}
