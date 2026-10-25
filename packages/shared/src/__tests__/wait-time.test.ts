import { test, expect } from 'vitest';
import { computeWaitTime, computeBlendedWait } from '../wait-time';
import { haversineKm } from '../geo';
import { calculateFuelRecommendations } from '../scoring';
import type { ChargerInfo } from '../types';

test('computeBlendedWait handles zero queue with free chargers', () => {
  const chargers = [
    { id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'FREE' },
    { id: 'c2', connectorType: 'CCS2', powerKw: 60, status: 'BUSY' },
  ];
  const res = computeBlendedWait({
    chargerStates: chargers,
    explicitQueueLength: 0,
    geofenceVehicleCount: 0,
    targetConnector: 'CCS2',
  });
  expect(res.waitMinutes).toBe(0);
  expect(res.markerColor).toBe('green');
  expect(res.availableChargers).toBe(1);
  expect(res.components.hardware).toBe(0);
  expect(res.components.queue).toBe(0);
  expect(res.components.geofence).toBe(0);
});

test('computeBlendedWait blends base wait and ML forecast 60/40', () => {
  const chargers = [
    { id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 20 },
  ];
  const res = computeBlendedWait({
    chargerStates: chargers,
    explicitQueueLength: 0,
    geofenceVehicleCount: 2,
    forecastWaitMin: 10,
    targetConnector: 'CCS2',
    avgSessionDuration: 30,
  });
  expect(res.waitMinutes).toBe(34);
  expect(res.confidence).toBe('high');
  expect(res.markerColor).toBe('red');
  expect(res.components.hardware).toBe(20);
  expect(res.components.queue).toBe(0);
  expect(res.components.geofence).toBe(30);
  expect(res.components.forecast).toBe(10);
});

test('computeBlendedWait incorporates activeSessions remaining charge', () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60000);
  const chargers = [
    { id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY' },
  ];
  const sessions = [
    { chargerId: 'c1', startTs: tenMinutesAgo, socStart: 25 },
  ];
  const res = computeBlendedWait({
    chargerStates: chargers,
    activeSessions: sessions,
    explicitQueueLength: 1,
    geofenceVehicleCount: 1,
    targetConnector: 'CCS2',
    avgSessionDuration: 30,
  });
  expect(res.components.hardware > 0).toBe(true);
  expect(res.components.queue).toBe(30);
  expect(res.components.geofence).toBe(0);
  expect(res.confidence).toBe('medium');
});

test('computeWaitTime returns 0 wait and green marker when free charger exists and no queue', () => {
  const chargers: ChargerInfo[] = [
    { id: '1', connectorType: 'CCS2', powerKw: 60, status: 'FREE' },
    { id: '2', connectorType: 'CCS2', powerKw: 60, status: 'BUSY' },
  ];
  const res = computeWaitTime({ chargers, queueLength: 0, targetConnector: 'CCS2' });
  expect(res.waitMinutes).toBe(0);
  expect(res.markerColor).toBe('green');
  expect(res.availableChargers).toBe(1);
  expect(res.isOverloaded).toBe(false);
});

test('computeWaitTime assigns yellow marker for wait between 5 and 15 mins', () => {
  const chargers: ChargerInfo[] = [
    { id: '1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 10 },
  ];
  const res = computeWaitTime({ chargers, queueLength: 0, targetConnector: 'CCS2' });
  expect(res.waitMinutes).toBe(10);
  expect(res.markerColor).toBe('yellow');
});

test('computeWaitTime flags overload and red marker when queue >= 3 with no free chargers', () => {
  const chargers: ChargerInfo[] = [
    { id: '1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 20 },
    { id: '2', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 25 },
  ];
  const res = computeWaitTime({ chargers, queueLength: 3, targetConnector: 'CCS2', defaultAvgSessionMinutes: 30 });
  expect(res.markerColor).toBe('red');
  expect(res.isOverloaded).toBe(true);
});

test('haversineKm calculates valid distances in Maharashtra', () => {
  const dist = haversineKm(19.0657, 72.8687, 19.2094, 72.9714);
  expect(dist > 15 && dist < 25).toBe(true);
});

test('calculateFuelRecommendations ranks best station first', () => {
  const stations = [
    {
      id: 'st-far',
      name: 'Far Station',
      operatorName: 'Tata Power',
      lat: 18.5,
      lng: 73.8,
      pricePerKwh: 22,
      ratingAvg: 4.0,
      status: 'APPROVED',
      chargers: [{ id: '1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 25 }],
    },
    {
      id: 'st-near',
      name: 'Near Station',
      operatorName: 'Tata Power',
      lat: 19.066,
      lng: 72.869,
      pricePerKwh: 18,
      ratingAvg: 4.8,
      status: 'APPROVED',
      chargers: [{ id: '2', connectorType: 'CCS2', powerKw: 120, status: 'FREE' }],
    },
  ];

  const recs = calculateFuelRecommendations(stations, {
    lat: 19.0657,
    lng: 72.8687,
    connector: 'CCS2',
  });

  expect(recs.length).toBe(2);
  expect(recs[0].station.id).toBe('st-near');
  expect(recs[0].fuelScore < recs[1].fuelScore).toBe(true);
});

test('computeWaitTime handles edge case of 0 chargers gracefully', () => {
  const res = computeWaitTime({ chargers: [], queueLength: 5, targetConnector: 'CCS2' });
  expect(res.availableChargers).toBe(0);
  expect(res.totalCompatibleChargers).toBe(0);
  expect(res.markerColor).toBe('red');
});

test('computeBlendedWait clamps negative wait values to 0', () => {
  const res = computeBlendedWait({
    chargerStates: [{ id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'FREE' }],
    explicitQueueLength: 0,
    forecastWaitMin: -5,
  });
  expect(res.waitMinutes).toBe(0);
  expect(res.markerColor).toBe('green');
});

test('computeBlendedWait handles large queue without overflow', () => {
  const chargers = [
    { id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY' },
    { id: 'c2', connectorType: 'CCS2', powerKw: 60, status: 'BUSY' },
  ];
  const res = computeBlendedWait({
    chargerStates: chargers,
    explicitQueueLength: 20,
    targetConnector: 'CCS2',
    avgSessionDuration: 30,
  });
  expect(res.waitMinutes > 100).toBe(true);
  expect(res.markerColor).toBe('red');
  expect(res.isOverloaded).toBe(true);
});
