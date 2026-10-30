import { ORIGIN, fromLocal } from '@evspark/shared';
import type { StationInput } from './types';

// The dedicated standalone demo station is located in an open exhibition ground (BKC Mumbai),
// completely away from public street clutter.
// Public road runs North-South at x = +70m east.
// Fence radius is 38m. The fence clearance to the road is 32m (never touches any road).
const gatePos = fromLocal(ORIGIN, 38, 0);

const southAccessRoad: [number, number][] = [
  [fromLocal(ORIGIN, 70, -140).lat, fromLocal(ORIGIN, 70, -140).lng],
  [fromLocal(ORIGIN, 70, -35).lat, fromLocal(ORIGIN, 70, -35).lng],
  [fromLocal(ORIGIN, 58, 0).lat, fromLocal(ORIGIN, 58, 0).lng],
  [gatePos.lat, gatePos.lng],
];

const northAccessRoad: [number, number][] = [
  [fromLocal(ORIGIN, 70, 140).lat, fromLocal(ORIGIN, 70, 140).lng],
  [fromLocal(ORIGIN, 70, 35).lat, fromLocal(ORIGIN, 70, 35).lng],
  [fromLocal(ORIGIN, 58, 0).lat, fromLocal(ORIGIN, 58, 0).lng],
  [gatePos.lat, gatePos.lng],
];

export const DEMO_STANDALONE_STATION: StationInput = {
  id: 'evspark-hub-standalone-demo',
  name: 'EVspark Standalone Demo Hub (3-Bay DC Fast)',
  lat: ORIGIN.lat,
  lng: ORIGIN.lng,
  chargers: 3,
  fence: {
    center: { lat: ORIGIN.lat, lng: ORIGIN.lng },
    radiusM: 38,
    gate: { lat: gatePos.lat, lng: gatePos.lng },
    clearanceM: 32,
    centerShifted: false,
  },
  routes: [southAccessRoad, northAccessRoad],
};

export const DEMO_ROAD_COORDINATES = {
  publicRoad: [
    fromLocal(ORIGIN, 70, -180),
    fromLocal(ORIGIN, 70, 180),
  ],
  bypassRoad: [
    fromLocal(ORIGIN, 76, -180),
    fromLocal(ORIGIN, 76, 180),
  ],
  accessDriveway: [
    fromLocal(ORIGIN, 70, 0),
    fromLocal(ORIGIN, 58, 0),
    gatePos,
  ],
};

