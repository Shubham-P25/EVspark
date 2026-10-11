import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import {
  calculateFuelRecommendations,
  haversineKm,
  estimateDriveMinutes,
} from "@evspark/shared";
import { AppError } from "../middleware/errorHandler.js";
import { findNearbyStations } from "../repositories/stations.repo.js";
import { getForecast } from "../services/forecast.service.js";

export async function recommendStations(req: Request, res: Response) {
  const { lat, lng, connector, batteryPct, vehicleModelId, radiusKm = 15 } = req.body;

  if (lat === undefined || lng === undefined) {
    throw new AppError(400, "BAD_REQUEST", "lat and lng are required");
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const radiusKmNum = Math.min(Number(radiusKm) || 15, 100);
  const radiusM = radiusKmNum * 1000;

  // 1. Spatial search: find nearby approved stations (max 30)
  const nearbyStations = await findNearbyStations({
    lat: latNum,
    lng: lngNum,
    radiusM,
    limit: 30,
    connector: connector && connector !== "All" ? connector : undefined,
  });

  if (nearbyStations.length === 0) {
    return res.json({
      recommendations: [],
      meta: {
        driverLocation: { lat: latNum, lng: lngNum },
        radiusKm: radiusKmNum,
        foundCount: 0,
      },
    });
  }

  const stationIds = nearbyStations.map((s) => s.id);

  // 2. Fetch charger & queue aggregates in two grouped queries
  const [chargers, queueCounts] = await Promise.all([
    prisma.charger.findMany({
      where: { stationId: { in: stationIds } },
      select: {
        id: true,
        stationId: true,
        label: true,
        connectorType: true,
        powerKw: true,
        status: true,
      },
    }),
    prisma.queueEntry.groupBy({
      by: ["stationId"],
      where: { stationId: { in: stationIds }, status: "waiting" },
      _count: { id: true },
    }),
  ]);

  const queueMap = new Map<string, number>();
  for (const q of queueCounts) {
    queueMap.set(q.stationId, q._count.id);
  }

  const chargerMap = new Map<string, any[]>();
  for (const c of chargers) {
    if (!chargerMap.has(c.stationId)) chargerMap.set(c.stationId, []);
    chargerMap.get(c.stationId)!.push(c);
  }

  // 3. Assemble stations with forecast wait at arrival time
  const enriched = await Promise.all(
    nearbyStations.map(async (st) => {
      const stChargers = chargerMap.get(st.id) || [];
      const queueLen = queueMap.get(st.id) || 0;
      const dist = haversineKm(latNum, lngNum, st.lat, st.lng);
      const driveMin = estimateDriveMinutes(dist);
      const arrivalTs = new Date(Date.now() + driveMin * 60 * 1000);

      // Estimate current wait
      const busyCount = stChargers.filter((c: any) => c.status === "BUSY").length;
      const totalCount = stChargers.length || 1;
      const currentWaitEst = queueLen * 15 + (busyCount === totalCount ? 10 : 0);

      // ML forecast at arrival time (falls back gracefully)
      const forecast = await getForecast(st.id, arrivalTs, currentWaitEst);

      return {
        id: st.id,
        name: st.name,
        operatorName: st.operatorName,
        lat: st.lat,
        lng: st.lng,
        city: st.city,
        pricePerKwh: st.pricePerKwh,
        status: st.status,
        chargers: stChargers,
        queueEntries: Array(queueLen).fill({ status: "waiting" }),
        predictedWaitMinutes: forecast.predictedWaitMin,
        forecastSource: forecast.source,
      };
    })
  );

  // 4. Score and rank using @evspark/shared
  const scored = calculateFuelRecommendations(enriched, {
    lat: latNum,
    lng: lngNum,
    connector: connector && connector !== "All" ? connector : undefined,
    maxRangeKm: radiusKmNum,
  });

  const top5 = scored.slice(0, 5);
  const mappedTop5 = top5.map((r: any) => ({
    ...r,
    stationId: r.station?.id || r.id,
    score: r.fuelScore,
    waitTimeMin: r.predictedWaitAtEta,
  }));

  res.json({
    recommended: mappedTop5[0] || null,
    recommendations: mappedTop5,
    rankedCandidates: mappedTop5,
    meta: {
      driverLocation: { lat: latNum, lng: lngNum },
      connectorPreference: connector || "All",
      batteryPct: batteryPct ?? 50,
      vehicleModelId: vehicleModelId || null,
      radiusKm: radiusKmNum,
      searchedStationCount: nearbyStations.length,
    },
  });
}
