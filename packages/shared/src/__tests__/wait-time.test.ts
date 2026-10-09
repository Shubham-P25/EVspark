import test from 'node:test';
import assert from 'node:assert';
import { computeWaitTime } from '../wait-time';
import { haversineKm, estimateDriveMinutes } from '../geo';
import { calculateFuelRecommendations } from '../scoring';
import type { ChargerInfo } from '../types';

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
