export interface ChargerInfo {
  id: string;
  label?: string | null;
  connectorType: string;
  powerKw: number;
  status: 'FREE' | 'BUSY' | 'MAINTENANCE' | 'FAULTED' | 'OFFLINE';
  currentSessionMinutesRemaining?: number;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateDriveMinutes(distanceKm: number, avgSpeedKmh = 35): number {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export function computeWaitTime({
  chargers,
  queueLength = 0,
  targetConnector,
  defaultAvgSessionMinutes = 30,
}: {
  chargers: ChargerInfo[];
  queueLength?: number;
  targetConnector?: string;
  defaultAvgSessionMinutes?: number;
}) {
  const compatible = chargers.filter((c) => {
    const isWorking = c.status !== 'MAINTENANCE' && c.status !== 'FAULTED' && c.status !== 'OFFLINE';
    const isConnectorMatch = !targetConnector || c.connectorType.toLowerCase() === targetConnector.toLowerCase();
    return isWorking && isConnectorMatch;
  });

  const availableCount = compatible.filter((c) => c.status === 'FREE').length;

  if (compatible.length === 0) {
    return {
      waitMinutes: 999,
      availableChargers: 0,
      totalCompatibleChargers: 0,
      markerColor: 'red' as const,
      isOverloaded: false,
    };
  }

  if (availableCount > 0 && queueLength === 0) {
    return {
      waitMinutes: 0,
      availableChargers: availableCount,
      totalCompatibleChargers: compatible.length,
      markerColor: 'green' as const,
      isOverloaded: false,
    };
  }

  const chargerReadyTimes: number[] = compatible.map((c) => {
    if (c.status === 'FREE') return 0;
    return typeof c.currentSessionMinutesRemaining === 'number'
      ? Math.max(0, c.currentSessionMinutesRemaining)
      : Math.floor(defaultAvgSessionMinutes * 0.5);
  });

  for (let i = 0; i < queueLength; i++) {
    let minIdx = 0;
    for (let j = 1; j < chargerReadyTimes.length; j++) {
      if ((chargerReadyTimes[j] ?? 0) < (chargerReadyTimes[minIdx] ?? 0)) {
        minIdx = j;
      }
    }
    chargerReadyTimes[minIdx] = (chargerReadyTimes[minIdx] ?? 0) + defaultAvgSessionMinutes;
  }

  const driverTurnWait = Math.min(...chargerReadyTimes);
  const roundedWait = Math.round(driverTurnWait);

  let markerColor: 'green' | 'yellow' | 'red' = 'green';
  if (roundedWait > 15 || (availableCount === 0 && queueLength >= 3)) {
    markerColor = 'red';
  } else if (roundedWait > 5) {
    markerColor = 'yellow';
  }

  const isOverloaded = roundedWait > 20 || (availableCount === 0 && queueLength >= 3);

  return {
    waitMinutes: roundedWait,
    availableChargers: availableCount,
    totalCompatibleChargers: compatible.length,
    markerColor,
    isOverloaded,
  };
}

export function rankStationsByFuel(stations: any[], req: { lat: number; lng: number; connector?: string }) {
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
