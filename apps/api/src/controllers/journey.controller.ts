import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { haversineKm, computeWaitTime, estimateDriveMinutes } from "@evspark/shared";
import { AppError } from "../middleware/errorHandler";

export async function planJourney(req: Request, res: Response) {
  const from = req.body.from || req.body.origin;
  const to = req.body.to || req.body.destination;
  const rangeKm = req.body.rangeKm || 300;

  if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) {
    throw new AppError(400, "BAD_REQUEST", "from and to coordinates are required");
  }

  const totalDistanceKm = +haversineKm(from.lat, from.lng, to.lat, to.lng).toFixed(1);
  const totalDriveMin = estimateDriveMinutes(totalDistanceKm);

  // Fetch candidate stations
  const stations = await prisma.station.findMany({
    where: { status: "APPROVED" },
    include: {
      chargers: true,
      queueEntries: { where: { status: "waiting" } },
    },
  });

  const stops: any[] = [];
  const effectiveRange = Number(rangeKm) * 0.8; // buffer for safety

  // If journey exceeds range or driver wants an optimized stop
  if (totalDistanceKm > effectiveRange || totalDistanceKm > 80) {
    // Filter stations within reasonable detour from route corridor
    const corridorStations = stations.filter((st) => {
      const dFrom = haversineKm(from.lat, from.lng, st.lat, st.lng);
      const dTo = haversineKm(st.lat, st.lng, to.lat, to.lng);
      const detour = dFrom + dTo - totalDistanceKm;
      return detour < 30; // max 30 km corridor deviation
    });

    // Score each stop by power (fast DC), low wait, minimal detour
    corridorStations.sort((a, b) => {
      const waitA = computeWaitTime({ chargers: a.chargers as any, queueLength: a.queueEntries.length });
      const waitB = computeWaitTime({ chargers: b.chargers as any, queueLength: b.queueEntries.length });
      const maxKwA = Math.max(...a.chargers.map((c) => c.powerKw), 0);
      const maxKwB = Math.max(...b.chargers.map((c) => c.powerKw), 0);
      return waitA.waitMinutes - waitB.waitMinutes + (maxKwB - maxKwA) * 0.1;
    });

    if (corridorStations[0]) {
      const st = corridorStations[0];
      const wait = computeWaitTime({ chargers: st.chargers as any, queueLength: st.queueEntries.length });
      stops.push({
        station: {
          id: st.id,
          name: st.name,
          operatorName: st.operatorName,
          lat: st.lat,
          lng: st.lng,
          address: st.address,
          pricePerKwh: st.pricePerKwh,
          chargers: st.chargers,
        },
        recommendedStopDurationMin: 25,
        energyToAddKwh: 35,
        waitMinutes: wait.waitMinutes,
        detourKm: +(haversineKm(from.lat, from.lng, st.lat, st.lng) + haversineKm(st.lat, st.lng, to.lat, to.lng) - totalDistanceKm).toFixed(1),
      });
    }
  }

  res.json({
    summary: {
      totalDistanceKm,
      estimatedDriveMin: totalDriveMin,
      stopsCount: stops.length,
      from,
      to,
    },
    stops,
    routePolyline: [
      [from.lat, from.lng],
      ...(stops.map((s) => [s.station.lat, s.station.lng])),
      [to.lat, to.lng],
    ],
  });
}
