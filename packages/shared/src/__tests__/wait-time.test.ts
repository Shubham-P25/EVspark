import test from 'node:test';
import assert from 'node:assert';
import { computeWaitTime, computeBlendedWait } from '../wait-time';
import { haversineKm, estimateDriveMinutes } from '../geo';
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
  assert.strictEqual(res.waitMinutes, 0);
  assert.strictEqual(res.markerColor, 'green');
  assert.strictEqual(res.availableChargers, 1);
  assert.strictEqual(res.components.hardware, 0);
  assert.strictEqual(res.components.queue, 0);
  assert.strictEqual(res.components.geofence, 0);
});

test('computeBlendedWait blends base wait and ML forecast 60/40', () => {
  const chargers = [
    { id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 20 },
  ];
  // Base wait: hardware = 20, queue = 0 -> baseWait = 20
  // forecastWaitMin: 10
  // blended = 20 * 0.6 + 10 * 0.4 = 12 + 4 = 16
  const res = computeBlendedWait({
    chargerStates: chargers,
    explicitQueueLength: 0,
    geofenceVehicleCount: 2,
    forecastWaitMin: 10,
    targetConnector: 'CCS2',
    avgSessionDuration: 30,
  });
  // With 2 geofence vehicles and 0 explicit queue, geofence excess = 2 * 0.5 = 1 vehicle
  // queueWait = 1 * 30 / 1 = 30
  // baseWait = 20 + 30 = 50
  // blended = 50 * 0.6 + 10 * 0.4 = 30 + 4 = 34
  assert.strictEqual(res.waitMinutes, 34);
  assert.strictEqual(res.confidence, 'high');
  assert.strictEqual(res.markerColor, 'red');
  assert.strictEqual(res.components.hardware, 20);
  assert.strictEqual(res.components.queue, 0);
  assert.strictEqual(res.components.geofence, 30);
  assert.strictEqual(res.components.forecast, 10);
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
  assert.ok(res.components.hardware > 0);
  assert.strictEqual(res.components.queue, 30);
  assert.strictEqual(res.components.geofence, 0); // 1 geofence == 1 explicit queue, excess is 0
  assert.strictEqual(res.confidence, 'medium');
});

test('computeWaitTime returns 0 wait and green marker when free charger exists and no queue', () => {
  const chargers: ChargerInfo[] = [
    { id: '1', connectorType: 'CCS2', powerKw: 60, status: 'FREE' },
    { id: '2', connectorType: 'CCS2', powerKw: 60, status: 'BUSY' },
  ];
  const res = computeWaitTime({ chargers, queueLength: 0, targetConnector: 'CCS2' });
  assert.strictEqual(res.waitMinutes, 0);
  assert.strictEqual(res.markerColor, 'green');
  assert.strictEqual(res.availableChargers, 1);
  assert.strictEqual(res.isOverloaded, false);
});

test('computeWaitTime assigns yellow marker for wait between 5 and 15 mins', () => {
  const chargers: ChargerInfo[] = [
    { id: '1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 10 },
  ];
  const res = computeWaitTime({ chargers, queueLength: 0, targetConnector: 'CCS2' });
  assert.strictEqual(res.waitMinutes, 10);
  assert.strictEqual(res.markerColor, 'yellow');
});

test('computeWaitTime flags overload and red marker when queue >= 3 with no free chargers', () => {
  const chargers: ChargerInfo[] = [
    { id: '1', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 20 },
    { id: '2', connectorType: 'CCS2', powerKw: 60, status: 'BUSY', currentSessionMinutesRemaining: 25 },
  ];
  const res = computeWaitTime({ chargers, queueLength: 3, targetConnector: 'CCS2', defaultAvgSessionMinutes: 30 });
  assert.strictEqual(res.markerColor, 'red');
  assert.strictEqual(res.isOverloaded, true);
});

test('haversineKm calculates valid distances in Maharashtra', () => {
  // Mumbai BKC to Viviana Mall Thane ~ 20km
  const dist = haversineKm(19.0657, 72.8687, 19.2094, 72.9714);
  assert.ok(dist > 15 && dist < 25, `Distance was ${dist}`);
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

  assert.strictEqual(recs.length, 2);
  assert.strictEqual(recs[0].station.id, 'st-near');
  assert.ok(recs[0].fuelScore < recs[1].fuelScore);
});

test('computeWaitTime handles edge case of 0 chargers gracefully', () => {
  const res = computeWaitTime({ chargers: [], queueLength: 5, targetConnector: 'CCS2' });
  assert.strictEqual(res.availableChargers, 0);
  assert.strictEqual(res.totalCompatibleChargers, 0);
  assert.strictEqual(res.markerColor, 'red');
});

test('computeBlendedWait clamps negative wait values to 0', () => {
  const res = computeBlendedWait({
    chargerStates: [{ id: 'c1', connectorType: 'CCS2', powerKw: 60, status: 'FREE' }],
    explicitQueueLength: 0,
    forecastWaitMin: -5,
  });
  assert.strictEqual(res.waitMinutes, 0);
  assert.strictEqual(res.markerColor, 'green');
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
  assert.ok(res.waitMinutes > 100);
  assert.strictEqual(res.markerColor, 'red');
  assert.strictEqual(res.isOverloaded, true);
});

