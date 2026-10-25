import { test, expect } from 'vitest';
import {
  pinState,
  tupleToPin,
  pinToTuple,
  PIN_HEX,
  pinsQuerySchema,
  type Pin,
} from '../pins';
import { tileToBbox, latLngToTile } from '../geo';

test('pinState: 0 usable returns grey', () => {
  expect(pinState(0, 0)).toBe('grey');
  expect(pinState(-1, 0)).toBe('grey');
});

test('pinState: 1 charger free returns green', () => {
  expect(pinState(1, 1)).toBe('green');
});

test('pinState: 1 charger busy returns red', () => {
  expect(pinState(0, 1)).toBe('red');
});

test('pinState: 4 chargers with 0/2/4 free', () => {
  expect(pinState(0, 4)).toBe('red');
  expect(pinState(2, 4)).toBe('orange');
  expect(pinState(4, 4)).toBe('green');
});

test('pinToTuple and tupleToPin round trip', () => {
  const originalPin: Pin = {
    id: 'station-123',
    lat: 19.2183,
    lng: 72.9781,
    free: 2,
    usable: 4,
    total: 5,
    maxKw: 60,
    color: 'orange',
    source: 'google',
    updatedAt: 1729000000000,
  };

  const tuple = pinToTuple(originalPin);
  expect(tuple).toEqual([
    'station-123',
    19.2183,
    72.9781,
    2,
    4,
    5,
    60,
    0, // google = 0
    1729000000,
  ]);

  const reconstructedPin = tupleToPin(tuple);
  expect(reconstructedPin).toEqual(originalPin);
});

test('PIN_HEX has all 4 valid color entries', () => {
  expect(PIN_HEX.green).toBe('#1E8E3E');
  expect(PIN_HEX.orange).toBe('#E8710A');
  expect(PIN_HEX.red).toBe('#D93025');
  expect(PIN_HEX.grey).toBe('#80868B');
});

test('pinsQuerySchema validates z between 10 and 14', () => {
  const valid = pinsQuerySchema.safeParse({ z: '12', x: '2930', y: '1892', connector: 'CCS2' });
  expect(valid.success).toBe(true);
  if (valid.success) {
    expect(valid.data.z).toBe(12);
    expect(valid.data.x).toBe(2930);
    expect(valid.data.y).toBe(1892);
    expect(valid.data.connector).toBe('CCS2');
  }

  const lowZ = pinsQuerySchema.safeParse({ z: 9, x: 100, y: 100 });
  expect(lowZ.success).toBe(false);

  const highZ = pinsQuerySchema.safeParse({ z: 15, x: 100, y: 100 });
  expect(highZ.success).toBe(false);
});

test('tileToBbox returns valid coordinates and round-trips with latLngToTile', () => {
  const z = 12;
  const x = 2930;
  const y = 1892;
  const [west, south, east, north] = tileToBbox(z, x, y);

  expect(west < east).toBe(true);
  expect(south < north).toBe(true);

  // Center point
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const tile = latLngToTile(centerLat, centerLng, z);
  expect(tile.x).toBe(x);
  expect(tile.y).toBe(y);
});
