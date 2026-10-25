export type ScenarioId = 'quiet_hour' | 'rush_hour' | 'one_charger_faulted' | 'station_down' | 'long_queue';

export interface Scenario {
  id: ScenarioId;
  label: string;
  note: string;
  arrivalsPerHour: number;
  stayOnlyShare: number;
  passByShare: number;
  patienceMinS: number;
  patienceMaxS: number;
  faultAtS?: number;
  heartbeatLostAtS?: number;
}

export const DEMO_SCENARIOS: Record<ScenarioId, Scenario> = {
  quiet_hour: {
    id: 'quiet_hour', label: 'Quiet hour', note: 'A few cars, chargers mostly free',
    arrivalsPerHour: 8, stayOnlyShare: 0.1, passByShare: 0.25, patienceMinS: 600, patienceMaxS: 1500,
  },
  rush_hour: {
    id: 'rush_hour', label: 'Rush hour', note: 'Chargers fill, a queue builds',
    arrivalsPerHour: 45, stayOnlyShare: 0.15, passByShare: 0.2, patienceMinS: 480, patienceMaxS: 1500,
  },
  one_charger_faulted: {
    id: 'one_charger_faulted', label: 'One charger faults', note: 'Rush hour, first charger fails after 30 s',
    arrivalsPerHour: 40, stayOnlyShare: 0.15, passByShare: 0.2, patienceMinS: 480, patienceMaxS: 1500, faultAtS: 30,
  },
  station_down: {
    id: 'station_down', label: 'Station offline', note: 'Heartbeat is lost after 30 s',
    arrivalsPerHour: 25, stayOnlyShare: 0.1, passByShare: 0.2, patienceMinS: 480, patienceMaxS: 1500, heartbeatLostAtS: 30,
  },
  long_queue: {
    id: 'long_queue', label: 'Long queue', note: 'Demand above capacity, drivers give up',
    arrivalsPerHour: 70, stayOnlyShare: 0.1, passByShare: 0.1, patienceMinS: 240, patienceMaxS: 700,
  },
};
