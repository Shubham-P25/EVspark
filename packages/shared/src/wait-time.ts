import type { ChargerInfo, ChargerStatus } from './types';

export interface WaitTimeInput {
  chargers: ChargerInfo[];
  queueLength: number;
  targetConnector?: string;
  defaultAvgSessionMinutes?: number;
}

export interface WaitTimeResult {
  waitMinutes: number;
  availableChargers: number;
  totalCompatibleChargers: number;
  markerColor: 'green' | 'yellow' | 'red';
  isOverloaded: boolean;
}

export interface ActiveSessionInfo {
  chargerId?: string;
  startTs: Date | string;
  socStart?: number | null;
}

export interface BlendedWaitInput {
  chargerStates: Array<{
    id?: string;
    status: ChargerStatus | string;
    powerKw: number;
    connectorType: string;
    currentSessionMinutesRemaining?: number;
  }>;
  activeSessions?: ActiveSessionInfo[];
  explicitQueueLength: number;
  geofenceVehicleCount?: number;
  forecastWaitMin?: number | null;
  targetConnector?: string;
  avgSessionDuration?: number;
}

export interface BlendedWaitResult {
  waitMinutes: number;
  markerColor: 'green' | 'yellow' | 'red';
  confidence: 'high' | 'medium' | 'low';
  isOverloaded: boolean;
  availableChargers: number;
  totalCompatibleChargers: number;
  components: {
    hardware: number;
    queue: number;
    geofence: number;
    forecast?: number;
  };
}

export function computeRemainingChargeTimes(
  chargers: BlendedWaitInput['chargerStates'],
  sessions: ActiveSessionInfo[] = [],
  targetConnector?: string,
  avgSessionDuration: number = 30
): { hardwareWait: number; compatibleCount: number; availableCount: number } {
  const compatible = chargers.filter((c) => {
    const isWorking = c.status !== 'MAINTENANCE' && c.status !== 'FAULTED' && c.status !== 'OFFLINE';
    const isConnectorMatch = !targetConnector || c.connectorType.toLowerCase() === targetConnector.toLowerCase();
    return isWorking && isConnectorMatch;
  });

  if (compatible.length === 0) {
    return { hardwareWait: 999, compatibleCount: 0, availableCount: 0 };
  }

  const freeChargers = compatible.filter((c) => c.status === 'FREE');
  if (freeChargers.length > 0) {
    return { hardwareWait: 0, compatibleCount: compatible.length, availableCount: freeChargers.length };
  }

  const remainingTimes: number[] = compatible.map((c) => {
    if (typeof c.currentSessionMinutesRemaining === 'number') {
      return Math.max(0, c.currentSessionMinutesRemaining);
    }

    const session = c.id
      ? sessions.find((s) => s.chargerId === c.id)
      : sessions[0];

    if (session) {
      const now = Date.now();
      const start = new Date(session.startTs).getTime();
      const elapsedMin = Math.max(0, (now - start) / 60000);
      const socStart = session.socStart ?? 25;
      const targetDeltaSoc = Math.max(10, 80 - socStart);
      const estimatedTotalMin = Math.max(10, (targetDeltaSoc / 55) * avgSessionDuration);
      return Math.max(5, Math.round(estimatedTotalMin - elapsedMin));
    }

    return Math.floor(avgSessionDuration * 0.5);
  });

  const hardwareWait = Math.min(...remainingTimes);
  return { hardwareWait, compatibleCount: compatible.length, availableCount: 0 };
}

export function computeBlendedWait({
  chargerStates,
  activeSessions = [],
  explicitQueueLength,
  geofenceVehicleCount = 0,
  forecastWaitMin,
  targetConnector,
  avgSessionDuration = 30,
}: BlendedWaitInput): BlendedWaitResult {
  const { hardwareWait, compatibleCount, availableCount } = computeRemainingChargeTimes(
    chargerStates,
    activeSessions,
    targetConnector,
    avgSessionDuration
  );

  if (compatibleCount === 0) {
    return {
      waitMinutes: 999,
      markerColor: 'red',
      confidence: 'low',
      isOverloaded: true,
      availableChargers: 0,
      totalCompatibleChargers: 0,
      components: {
        hardware: 999,
        queue: 0,
        geofence: 0,
        ...(forecastWaitMin != null ? { forecast: forecastWaitMin } : {}),
      },
    };
  }

  const effectiveCapacity = Math.max(1, availableCount > 0 ? availableCount : compatibleCount);
  const geofenceExcess = Math.max(0, (geofenceVehicleCount || 0) - explicitQueueLength);
  const geofenceWeighted = geofenceExcess * 0.5;

  const queueWait = ((explicitQueueLength + geofenceWeighted) * avgSessionDuration) / effectiveCapacity;
  const hardwareComponent = availableCount > 0 && explicitQueueLength === 0 && geofenceVehicleCount === 0 ? 0 : hardwareWait;
  const baseWait = hardwareComponent + queueWait;

  let blendedWait: number;
  if (typeof forecastWaitMin === 'number' && !isNaN(forecastWaitMin)) {
    blendedWait = baseWait * 0.6 + forecastWaitMin * 0.4;
  } else {
    blendedWait = baseWait;
  }

  const roundedWait = Math.max(0, Math.round(blendedWait));

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (forecastWaitMin != null && geofenceVehicleCount > 0) {
    confidence = 'high';
  } else if (forecastWaitMin != null || geofenceVehicleCount > 0) {
    confidence = 'medium';
  }

  const totalWaiting = explicitQueueLength + geofenceVehicleCount;
  let markerColor: 'green' | 'yellow' | 'red' = 'green';
  if (roundedWait > 15 || (availableCount === 0 && totalWaiting >= 3)) {
    markerColor = 'red';
  } else if (roundedWait > 5) {
    markerColor = 'yellow';
  }

  const isOverloaded = roundedWait > 20 || (availableCount === 0 && totalWaiting >= 3);

  return {
    waitMinutes: roundedWait,
    markerColor,
    confidence,
    isOverloaded,
    availableChargers: availableCount,
    totalCompatibleChargers: compatibleCount,
    components: {
      hardware: Math.round(hardwareComponent * 10) / 10,
      queue: Math.round(((explicitQueueLength * avgSessionDuration) / effectiveCapacity) * 10) / 10,
      geofence: Math.round(((geofenceWeighted * avgSessionDuration) / effectiveCapacity) * 10) / 10,
      ...(forecastWaitMin != null ? { forecast: Math.round(forecastWaitMin * 10) / 10 } : {}),
    },
  };
}

export function computeWaitTime({
  chargers,
  queueLength,
  targetConnector,
  defaultAvgSessionMinutes = 30,
}: WaitTimeInput): WaitTimeResult {
  const blended = computeBlendedWait({
    chargerStates: chargers,
    explicitQueueLength: queueLength,
    targetConnector,
    avgSessionDuration: defaultAvgSessionMinutes,
  });

  return {
    waitMinutes: blended.waitMinutes,
    availableChargers: blended.availableChargers,
    totalCompatibleChargers: blended.totalCompatibleChargers,
    markerColor: blended.markerColor,
    isOverloaded: blended.isOverloaded,
  };
}
