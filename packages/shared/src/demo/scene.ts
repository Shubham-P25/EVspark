import { fromLocal } from './geo-local';
import { buildFence, type Road, type RoadClass } from './fence';
import { Path } from './path';
import { StationSim, type SimConfig } from './station-sim';
import type { Connector, LatLng } from './types';

export const ORIGIN: LatLng = { lat: 19.0657, lng: 72.8687 };
const P = (x: number, y: number) => fromLocal(ORIGIN, x, y);

export interface SceneOptions {
  roadX?: number;
  roadClass?: RoadClass;
  chargers?: Array<[Connector, number]>;
  routes?: 1 | 2;
  roads?: Road[];
  config?: Partial<SimConfig>;
}

export function sceneRoads(roadX = 70, cls: RoadClass = 'tertiary'): Road[] {
  return [{ cls, pts: [P(roadX, -1500), P(roadX, 1500)] }];
}

export function makeScene(o: SceneOptions = {}) {
  const roadX = o.roadX ?? 70;
  const chargers = (o.chargers ?? [['CCS2', 22], ['CCS2', 22]]).map(([connector, powerKw], i) => ({
    id: `ch${i + 1}`,
    connector,
    powerKw,
  }));
  const roads = o.roads ?? sceneRoads(roadX, o.roadClass);
  const fence = buildFence(ORIGIN, roads, { chargerCount: chargers.length });
  const routes = [new Path([P(roadX, -1200), P(roadX, 0), P(0, 0)])];
  if (o.routes === 2) routes.push(new Path([P(roadX, 1200), P(roadX, 0), P(0, 0)]));

  const cfg: SimConfig = {
    stationId: 'scene',
    seed: 7,
    chargers,
    routes,
    bypass: new Path([P(roadX + 3, -1500), P(roadX + 3, 300)]),
    fence,
    waitCapacity: 8,
    dwellS: 0,
    arrivalsPerHour: 0,
    stayOnlyShare: 0,
    passByShare: 0,
    lingerShare: 0,
    patienceMinS: 1e9,
    patienceMaxS: 1e9,
    serviceTimeS: () => 600,
    ...o.config,
  };
  return { sim: new StationSim(cfg), cfg, roads, fence };
}
