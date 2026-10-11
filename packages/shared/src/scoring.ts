import { haversineKm, estimateDriveMinutes } from './geo';
import { computeWaitTime } from './wait-time';
import type { StationWithWait } from './types';

export interface RecommendRequest {
  lat: number;
  lng: number;
  connector?: string;
  socNow?: number;
  targetSoc?: number;
  maxRangeKm?: number;
  weights?: {
    w1?: number; // drive time weight
    w2?: number; // predicted wait weight
    w3?: number; // price penalty weight
    w4?: number; // rating deficit weight
  };
}

export interface RecommendationResult {
  station: StationWithWait;
  fuelScore: number;
  driveMinutes: number;
  distanceKm: number;
  predictedWaitAtEta: number;
  reason: string;
}

export function calculateFuelRecommendations(
  stations: any[],
  req: RecommendRequest
): RecommendationResult[] {
  const w1 = req.weights?.w1 ?? 1.0;
  const w2 = req.weights?.w2 ?? 1.2;
  const w3 = req.weights?.w3 ?? 0.3;
  const w4 = req.weights?.w4 ?? 0.5;

  const results: RecommendationResult[] = [];

  for (const st of stations) {
    const distanceKm = haversineKm(req.lat, req.lng, st.lat, st.lng);
    if (req.maxRangeKm && distanceKm > req.maxRangeKm) {
      continue; // outside range
    }

    const driveMin = estimateDriveMinutes(distanceKm);
    const waitInfo = computeWaitTime({
      chargers: st.chargers || [],
      queueLength: st.queueEntries?.length || 0,
      targetConnector: req.connector,
    });

    if (waitInfo.totalCompatibleChargers === 0) {
      continue; // No compatible working chargers
    }

    // Deprioritize overloaded stations
    const overloadPenalty = waitInfo.isOverloaded ? 50 : 0;

    // Predicted wait at ETA: blends current wait with arrival travel time
    const predictedWaitAtEta = Math.max(0, waitInfo.waitMinutes - Math.floor(driveMin * 0.4));
    const pricePenalty = Math.max(0, (st.pricePerKwh ?? 18) - 15);
    const ratingDeficit = Math.max(0, 5 - (st.ratingAvg ?? 4.0));

    const fuelScore = +(
      w1 * driveMin +
      w2 * predictedWaitAtEta +
      w3 * pricePenalty +
      w4 * ratingDeficit +
      overloadPenalty
    ).toFixed(2);

    const stationWithWait: StationWithWait = {
      id: st.id,
      name: st.name,
      operatorName: st.operatorName,
      lat: st.lat,
      lng: st.lng,
      address: st.address,
      city: st.city,
      pricePerKwh: st.pricePerKwh,
      ratingAvg: st.ratingAvg,
      status: st.status,
      chargers: st.chargers || [],
      queueLength: st.queueEntries?.length || 0,
      currentWaitMinutes: waitInfo.waitMinutes,
      predictedWaitMinutes: predictedWaitAtEta,
      markerColor: waitInfo.markerColor,
      isOverloaded: waitInfo.isOverloaded,
      distanceKm: +distanceKm.toFixed(1),
      etaMinutes: driveMin,
      fuelScore,
    };

    const reason = `${predictedWaitAtEta === 0 ? 'No wait' : `${predictedWaitAtEta}m wait`}, ${distanceKm.toFixed(1)} km away (${driveMin}m drive)`;

    results.push({
      station: stationWithWait,
      fuelScore,
      driveMinutes: driveMin,
      distanceKm: +distanceKm.toFixed(1),
      predictedWaitAtEta,
      reason,
    });
  }

  // Rank by fuelScore (lower is better)
  results.sort((a, b) => a.fuelScore - b.fuelScore);

  return results.slice(0, 5);
}

export function rankStationsByFuel(
  stations: any[],
  req: { lat: number; lng: number; connector?: string }
) {
  const w1 = 1.0;
  const w2 = 1.2;
  const w3 = 0.3;
  const w4 = 0.5;

  const list = stations.map((st) => {
    const dist = haversineKm(req.lat, req.lng, st.lat, st.lng);
    const driveMin = estimateDriveMinutes(dist);
    const wait = computeWaitTime({
      chargers: st.chargers || [],
      queueLength: st.queueEntries?.length || 0,
      targetConnector: req.connector,
    });

    const predWaitAtEta = Math.max(0, wait.waitMinutes - Math.floor(driveMin * 0.4));
    const pricePen = Math.max(0, (st.pricePerKwh ?? 18) - 15);
    const ratingDef = Math.max(0, 5 - (st.ratingAvg ?? 4.0));
    const overloadPen = wait.isOverloaded ? 50 : 0;

    const fuelScore = +(w1 * driveMin + w2 * predWaitAtEta + w3 * pricePen + w4 * ratingDef + overloadPen).toFixed(2);

    return {
      station: {
        ...st,
        distanceKm: +dist.toFixed(1),
        etaMinutes: driveMin,
        waitMinutes: wait.waitMinutes,
        predictedWaitMinutes: predWaitAtEta,
        markerColor: wait.markerColor,
        isOverloaded: wait.isOverloaded,
        availableChargers: wait.availableChargers,
        totalChargers: (st.chargers || []).length,
      },
      fuelScore,
      driveMinutes: driveMin,
      distanceKm: +dist.toFixed(1),
      predictedWaitAtEta: predWaitAtEta,
      reason: `${predWaitAtEta === 0 ? "No wait" : `${predWaitAtEta}m wait`}, ${dist.toFixed(1)} km away (${driveMin}m drive)`,
    };
  });

  list.sort((a, b) => a.fuelScore - b.fuelScore);
  return list;
}

