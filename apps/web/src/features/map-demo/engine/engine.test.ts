import { describe, it, expect } from 'vitest';
import { DemoEngine } from './engine';
import type { StationInput } from './types';

const input = (chargers = 3, R = 30): StationInput => {
  const o = { lat: 19.2, lng: 72.97 };
  const m = 1 / 111320;
  const route: [number, number][] = [];
  for (let d = 400; d >= 40; d -= 20) route.push([o.lat - d * m, o.lng]); // approaching from the south
  return {
    id: 's1',
    name: 'Test Station',
    lat: o.lat,
    lng: o.lng,
    chargers,
    fence: { center: o, radiusM: R, gate: { lat: o.lat - 40 * m, lng: o.lng }, clearanceM: 40, centerShifted: false },
    routes: [route],
  };
};

const run = (e: DemoEngine, sec: number) => {
  for (let i = 0; i < sec * 10; i++) e.step(0.1);
};
const view = (e: DemoEngine) => e.stationView(e.stations[0]);

describe('demo engine', () => {
  it('starts empty', () => {
    const e = new DemoEngine([input()]);
    expect(e.cars.size).toBe(0);
    expect(view(e).chargingQ).toBe(0);
    expect(view(e).waiting).toBe(0);
  });

  it('charging queue never exceeds chargers; cars never overlap', () => {
    const e = new DemoEngine([input(3)], { arrivalMeanS: 5, chargerShare: 1 });
    let minD = Infinity;
    for (let i = 0; i < 20 * 60 * 10; i++) {
      e.step(0.1);
      const cs = [...e.cars.values()];
      for (let a = 0; a < cs.length; a++) {
        for (let b = a + 1; b < cs.length; b++) {
          minD = Math.min(minD, Math.hypot(cs[a].pos.x - cs[b].pos.x, cs[a].pos.y - cs[b].pos.y));
        }
      }
      expect(view(e).chargingQ).toBeLessThanOrEqual(3);
    }
    expect(minD).toBeGreaterThanOrEqual(3.0);
  });

  it('overflow goes to the waiting queue', () => {
    const e = new DemoEngine([input(2)], { arrivalMeanS: 1000 });
    for (let i = 0; i < 4; i++) {
      e.forceSpawn('s1', 'CHARGER');
      run(e, 6);
    }
    run(e, 40);
    expect(view(e).chargingQ).toBe(2);
    expect(view(e).waiting).toBeGreaterThanOrEqual(1);
  });

  it('a visitor offered a free charger is discarded as OTHER_JOBS', () => {
    const e = new DemoEngine([input(1)], { arrivalMeanS: 1000 });
    e.forceSpawn('s1', 'CHARGER');
    run(e, 8);
    e.forceSpawn('s1', 'STAYER');
    run(e, 25); // stayer waits behind the charger car
    expect(view(e).waiting).toBe(1);
    run(e, 120); // charger frees, stayer is offered, never plugs in
    expect(view(e).stats.otherJobs).toBe(1);
    expect(view(e).waiting).toBe(0);
    expect(view(e).chargingQ).toBe(0);
  });

  it('impatient car leaves and is removed from the waiting queue', () => {
    const e = new DemoEngine([input(1)], { arrivalMeanS: 1000, patienceS: [10, 10], chargeS: [500, 500] });
    e.forceSpawn('s1', 'CHARGER');
    run(e, 8);
    e.forceSpawn('s1', 'CHARGER');
    run(e, 20);
    expect(view(e).stats.reneged).toBe(1);
    expect(view(e).waiting).toBe(0);
  });

  it('balks when there is no parking space', () => {
    const e = new DemoEngine([input(1, 12)], { arrivalMeanS: 1000, chargeS: [900, 900], patienceS: [900, 900] });
    for (let i = 0; i < 12; i++) {
      e.forceSpawn('s1', 'CHARGER');
      run(e, 5);
    }
    run(e, 30);
    expect(view(e).stats.balked).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic for the same seed', () => {
    const a = new DemoEngine([input()], { seed: 3 });
    const b = new DemoEngine([input()], { seed: 3 });
    run(a, 300);
    run(b, 300);
    expect(JSON.stringify(a.snapshot())).toBe(JSON.stringify(b.snapshot()));
  });
});
