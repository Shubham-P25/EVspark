import prisma from "../../apps/api/src/lib/prisma";

export async function processQueueAbandonment(stationId: string, currentWaitMin: number): Promise<void> {
  // If queue length > 3 and wait > 25 min, 30% probability of driver abandoning queue
  if (currentWaitMin <= 25) return;

  const waitingEntries = await prisma.queueEntry.findMany({
    where: { stationId, status: "waiting" },
    orderBy: { joinedTs: "asc" },
  });

  if (waitingEntries.length > 3) {
    // 30% probability of the last vehicle abandoning
    if (Math.random() < 0.3) {
      const entryToAbandon = waitingEntries[waitingEntries.length - 1];
      console.log(`[Abandonment] Driver ${entryToAbandon.vehicleRef} abandoned queue at station ${stationId} (wait: ${currentWaitMin}m, queue: ${waitingEntries.length})`);
      await prisma.queueEntry.update({
        where: { id: entryToAbandon.id },
        data: { status: "abandoned" },
      });
    }
  }
}
