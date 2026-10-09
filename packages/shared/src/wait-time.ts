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

export function computeWaitTime({
  chargers,
  queueLength,
  targetConnector,
  defaultAvgSessionMinutes = 30,
}: WaitTimeInput): WaitTimeResult {
  // 1. Filter compatible chargers (same connector if specified, and not faulted/maintenance/offline)
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
      markerColor: 'red',
      isOverloaded: false,
    };
  }

  // 2. Free compatible charger exists and no queue -> 0 wait
  if (availableCount > 0 && queueLength === 0) {
    return {
      waitMinutes: 0,
      availableChargers: availableCount,
      totalCompatibleChargers: compatible.length,
      markerColor: 'green',
      isOverloaded: false,
    };
  }

  // 3. Simulated/estimated remaining times for currently occupied chargers
  // Initialize available time heap/array for each compatible charger
  const chargerReadyTimes: number[] = compatible.map((c) => {
    if (c.status === 'FREE') return 0;
    return typeof c.currentSessionMinutesRemaining === 'number'
      ? Math.max(0, c.currentSessionMinutesRemaining)
      : Math.floor(defaultAvgSessionMinutes * 0.5); // mid-session estimate
  });

  // 4. Greedily simulate queue drain
  // Each person in front takes the charger that becomes free earliest
  for (let i = 0; i < queueLength; i++) {
    // Find min ready time
    let minIdx = 0;
    for (let j = 1; j < chargerReadyTimes.length; j++) {
      if (chargerReadyTimes[j] < chargerReadyTimes[minIdx]) {
        minIdx = j;
      }
    }
    // That charger finishes, and the queued car charges for avg session length
    chargerReadyTimes[minIdx] += defaultAvgSessionMinutes;
  }

  // Driver's turn begins when the earliest charger becomes free
  const driverTurnWait = Math.min(...chargerReadyTimes);
  const roundedWait = Math.round(driverTurnWait);

  // 5. Marker Color Rule (Codemap Section 6):
  // green: wait <= 5 min
  // yellow: 5 < wait <= 15 min
  // red: wait > 15 min, or all compatible chargers busy and queue >= 3
  let markerColor: 'green' | 'yellow' | 'red' = 'green';
  if (roundedWait > 15 || (availableCount === 0 && queueLength >= 3)) {
    markerColor = 'red';
  } else if (roundedWait > 5) {
    markerColor = 'yellow';
  }

  // Overload Alert:
  const isOverloaded = roundedWait > 20 || (availableCount === 0 && queueLength >= 3);

  return {
    waitMinutes: roundedWait,
    availableChargers: availableCount,
    totalCompatibleChargers: compatible.length,
    markerColor,
    isOverloaded,
  };
}
