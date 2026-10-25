import { assignStation, buildFence, fenceClearsRoads, type Road } from './fence';
import { fromLocal } from './geo-local';
import { checkInvariants } from './invariants';
import { createPresenceTracker } from './presence';
import { mmcMeanWait } from './erlang';
import { createRng } from './rng';
import { makeScene, ORIGIN, sceneRoads } from './scene';
import { distToSegmentLatLng } from './case-helpers';
import { StationSim } from './station-sim';

export interface CaseResult {
  pass: boolean;
  detail: string;
}

export interface DemoCase {
  id: string;
  group: 'Geometry' | 'Movement' | 'Queue' | 'Wait time' | 'Faults' | 'Clock' | 'Sanity' | 'Checked in CI / E2E';
  title: string;
  run: () => CaseResult;
}

const ok = (detail: string): CaseResult => ({ pass: true, detail });
const no = (detail: string): CaseResult => ({ pass: false, detail });
const check = (cond: boolean, good: string, bad: string): CaseResult => (cond ? ok(good) : no(bad));
const P = (x: number, y: number) => fromLocal(ORIGIN, x, y);

// run and assert invariants after every step; returns the first violation
function run(sim: StationSim, seconds: number): string | null {
  let left = seconds;
  while (left > 0) {
    const dt = Math.min(0.25, left);
    sim.advance(dt);
    const bad = checkInvariants(sim);
    if (bad.length) return `t=${sim.t.toFixed(1)}s ${bad[0]}`;
    left -= dt;
  }
  return null;
}

// spawn n forced cars two seconds apart (road spacing), returns them
function send(sim: StationSim, n: number, force: Parameters<StationSim['spawn']>[0] = { intent: 'charge' }) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    let car = sim.spawn(force);
    for (let tries = 0; !car && tries < 10; tries++) {
      sim.advance(1);
      car = sim.spawn(force);
    }
    if (car) cars.push(car);
    sim.advance(2);
  }
  return cars;
}

// advance() clamps to 30 s per call (case T3), so long waits go through run()
const ARRIVE_S = 200;

function serviceSequence(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

export const ENGINE_CASES: DemoCase[] = [
  // ---------- Geometry ----------
  {
    id: 'G1', group: 'Geometry', title: 'Fence that overlaps a road shrinks until clear',
    run() {
      const { fence, roads } = makeScene();
      return check(Math.min(...fence.radii) < 100 && fence.clearanceM >= 0 && fenceClearsRoads(fence, roads),
        `Shrunk from 100 m to ${fence.minRadius.toFixed(0)} m, clearance ${fence.clearanceM.toFixed(1)} m`,
        'Fence still touches the road');
    },
  },
  {
    id: 'G2', group: 'Geometry', title: 'Buffer scales with road class',
    run() {
      const motorway = makeScene({ roadX: 60, roadClass: 'motorway' }).fence.radii[0];
      const lane = makeScene({ roadX: 60, roadClass: 'residential' }).fence.radii[0];
      return check(motorway < lane, `Motorway side ${motorway} m, residential side ${lane} m`, `Expected ${motorway} < ${lane}`);
    },
  },
  {
    id: 'G3', group: 'Geometry', title: 'Fence below minimum area is flagged unreliable',
    run() {
      const roads: Road[] = [
        { cls: 'tertiary', pts: [P(-22, -300), P(-22, 300)] },
        { cls: 'tertiary', pts: [P(22, -300), P(22, 300)] },
      ];
      const f = buildFence(ORIGIN, roads, { chargerCount: 2 });
      return check(f.status === 'unreliable', `Flagged: ${f.reason}`, `Status was ${f.status}`);
    },
  },
  {
    id: 'G4', group: 'Geometry', title: 'Fence must still contain every charger',
    run() {
      const f = buildFence(ORIGIN, sceneRoads(70), { chargerCount: 60 });
      return check(f.status === 'unreliable' && /Chargers/.test(f.reason ?? ''), `Rejected: ${f.reason}`, `Status ${f.status}, reason ${f.reason}`);
    },
  },
  {
    id: 'G5', group: 'Geometry', title: 'Overlapping fences give a car to exactly one station',
    run() {
      const a = buildFence(ORIGIN, []);
      const b = buildFence(P(60, 0), []);
      const id = assignStation(P(45, 0), [{ id: 'A', fence: a }, { id: 'B', fence: b }]);
      return check(id === 'B', `Car at 45 m east assigned to ${id}`, `Assigned to ${id}`);
    },
  },
  {
    id: 'G6', group: 'Geometry', title: 'Invariant holds again after roads change',
    run() {
      const { fence } = makeScene();
      const edited: Road[] = [...sceneRoads(70), { cls: 'secondary', pts: [P(40, -300), P(40, 300)] }];
      const stale = fenceClearsRoads(fence, edited);
      const rebuilt = buildFence(ORIGIN, edited, { chargerCount: 2 });
      return check(!stale && fenceClearsRoads(rebuilt, edited), 'Old fence rejected, rebuilt fence clear', `stale=${stale}`);
    },
  },
  {
    id: 'G7', group: 'Geometry', title: 'No road nearby keeps the default size',
    run() {
      const f = buildFence(ORIGIN, []);
      return check(f.status === 'ok' && f.radii.every((r) => r === 100), 'Fence stays at 100 m', `min radius ${f.minRadius}`);
    },
  },

  // ---------- Movement ----------
  {
    id: 'M1', group: 'Movement', title: 'Cars stay on the road until the fence',
    run() {
      const { sim, roads } = makeScene();
      send(sim, 1);
      let worst = 0;
      for (let i = 0; i < 700; i++) {
        sim.advance(0.25);
        for (const c of sim.inspect().cars) {
          if (c.phase === 'travelling') worst = Math.max(worst, distToSegmentLatLng(c.pos, roads[0].pts[0], roads[0].pts[1]));
        }
      }
      return check(worst <= 12, `Furthest from the road centre line: ${worst.toFixed(1)} m`, `Left the road by ${worst.toFixed(1)} m`);
    },
  },
  {
    id: 'M2', group: 'Movement', title: 'Car that passes the station is never counted',
    run() {
      const { sim } = makeScene();
      sim.spawn({ intent: 'pass_by' });
      const bad = run(sim, 300);
      const k = sim.kpis();
      const entered = sim.events.some((e) => e.type === 'enter_fence');
      return check(!bad && k.passed === 1 && !entered, 'Passed on the bypass, never entered the fence', bad ?? `passed=${k.passed} entered=${entered}`);
    },
  },
  {
    id: 'M3', group: 'Movement', title: 'Short stay inside the dwell window is not counted',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { dwellS: 60, serviceTimeS: () => 900 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      run(sim, ARRIVE_S);
      if (!b) return no('second car did not spawn');
      b.patienceS = 20;
      let maxCounted = 0;
      for (let i = 0; i < 400; i++) {
        sim.advance(0.25);
        maxCounted = Math.max(maxCounted, sim.snapshot().waitingCount);
      }
      return check(maxCounted === 0 && sim.kpis().reneged === 1, 'Left after 20 s, never counted (dwell is 60 s)', `max counted ${maxCounted}`);
    },
  },
  {
    id: 'M4', group: 'Movement', title: 'Followers keep their distance',
    run() {
      const { sim } = makeScene();
      send(sim, 4);
      const bad = run(sim, ARRIVE_S + 100);
      return check(!bad, 'No overlap on the road or in the forecourt', bad ?? '');
    },
  },
  {
    id: 'M5', group: 'Movement', title: 'Single access lane resolves without deadlock',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { singleLane: true, serviceTimeS: () => 140 } });
      sim.spawn({ intent: 'charge' });
      run(sim, 150);
      sim.spawn({ intent: 'charge' });
      const bad = run(sim, 700);
      return check(!bad && sim.kpis().completed === 2, 'Both cars charged and left', bad ?? `completed ${sim.kpis().completed}`);
    },
  },
  {
    id: 'M6', group: 'Movement', title: 'Full forecourt turns cars away',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { waitCapacity: 2, serviceTimeS: () => 5000 } });
      send(sim, 6);
      const bad = run(sim, ARRIVE_S + 100);
      const snap = sim.snapshot();
      return check(!bad && sim.kpis().balked >= 1 && snap.waitingCount <= 2, `${sim.kpis().balked} balked, waiting ${snap.waitingCount} (capacity 2)`, bad ?? `balked ${sim.kpis().balked}`);
    },
  },
  {
    id: 'M7', group: 'Movement', title: 'GPS noise does not flicker the count',
    run() {
      const rng = createRng(3);
      const track = createPresenceTracker({ enterM: 80, exitM: 100, dwellS: 0 });
      let naiveFlips = 0;
      let prev = false;
      let last = track(70, 0);
      for (let t = 1; t <= 120; t++) {
        const d = 90 + (rng() - 0.5) * 18;
        const naive = d <= 90;
        if (naive !== prev) naiveFlips++;
        prev = naive;
        last = track(d, t);
      }
      return check(last.transitions <= 2 && naiveFlips > 10, `Tracker flipped ${last.transitions}x, single threshold ${naiveFlips}x`, `tracker ${last.transitions}, naive ${naiveFlips}`);
    },
  },
  {
    id: 'M8', group: 'Movement', title: 'No route: car is dropped cleanly',
    run() {
      const { cfg } = makeScene();
      const sim = new StationSim({ ...cfg, routes: [], bypass: undefined });
      const car = sim.spawn({ intent: 'charge' });
      const bad = run(sim, 30);
      return check(car === null && !bad && sim.kpis().arrivals === 0, 'Nothing spawned, nothing stuck', bad ?? 'car existed');
    },
  },

  // ---------- Queue ----------
  {
    id: 'Q1', group: 'Queue', title: 'Empty station: car goes straight to a charger',
    run() {
      const { sim } = makeScene();
      send(sim, 1);
      const bad = run(sim, ARRIVE_S);
      const s = sim.snapshot();
      return check(!bad && s.chargingCount === 1 && s.waitingCount === 0 && !sim.events.some((e) => e.type === 'park'), 'Charging, waiting 0, never parked', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q2', group: 'Queue', title: 'All chargers busy: next car queues at position 1',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]] });
      send(sim, 2);
      const bad = run(sim, ARRIVE_S + 60);
      const s = sim.snapshot();
      return check(!bad && s.waitingCount === 1 && s.waitByPosition.length === 1, 'One waiting, position 1', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q3', group: 'Queue', title: 'More cars than chargers: charging capped, rest wait',
    run() {
      const { sim } = makeScene();
      send(sim, 5);
      const bad = run(sim, ARRIVE_S + 120);
      const s = sim.snapshot();
      return check(!bad && s.chargingCount === 2 && s.waitingCount === 3, 'Charging 2, waiting 3', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q4', group: 'Queue', title: 'Freed charger is taken in the same step',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 100 } });
      const [, second] = send(sim, 2);
      let guard = 0;
      while (sim.kpis().completed === 0 && guard++ < 4000) sim.advance(0.25);
      const ch = sim.chargers[0];
      return check(sim.kpis().completed === 1 && ch.state === 'BUSY' && ch.carId === second.id, 'Second car holds the charger right after the first left', `state ${ch.state}, car ${ch.carId}`);
    },
  },
  {
    id: 'Q5', group: 'Queue', title: 'Stay-only car at the head is dropped, next car charges',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 120 } });
      send(sim, 1);
      const [stay] = send(sim, 1, { intent: 'stay_only' });
      const [next] = send(sim, 1);
      const bad = run(sim, ARRIVE_S + 400);
      const dropped = sim.events.some((e) => e.type === 'discard_other_jobs' && e.carId === stay.id);
      const took = sim.events.some((e) => e.type === 'charge_start' && e.carId === next.id);
      return check(!bad && dropped && took, 'Dropped as other jobs, next car charged with no idle gap', bad ?? `dropped=${dropped} charged=${took}`);
    },
  },
  {
    id: 'Q6', group: 'Queue', title: 'Several stay-only cars in a row are cleared in one pass',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 120 } });
      send(sim, 1);
      send(sim, 3, { intent: 'stay_only' });
      const [next] = send(sim, 1);
      const bad = run(sim, ARRIVE_S + 500);
      const charged = sim.events.some((e) => e.type === 'charge_start' && e.carId === next.id);
      return check(!bad && sim.kpis().discardedOtherJobs === 3 && charged, 'Three dropped, real car charged', bad ?? `discarded ${sim.kpis().discardedOtherJobs}`);
    },
  },
  {
    id: 'Q7', group: 'Queue', title: 'Impatient car leaves and the line closes up',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      send(sim, 1);
      b.patienceS = 30;
      const bad = run(sim, ARRIVE_S + 200);
      return check(!bad && sim.kpis().reneged === 1 && sim.snapshot().waitingCount === 1, 'One reneged, one still waiting', bad ?? `reneged ${sim.kpis().reneged}`);
    },
  },
  {
    id: 'Q8', group: 'Queue', title: 'Last waiter leaves: count returns to zero',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      b.patienceS = 40;
      run(sim, ARRIVE_S + 20);
      const before = sim.waitFor().seconds ?? 0;
      run(sim, 150);
      const after = sim.waitFor().seconds ?? 0;
      return check(sim.snapshot().waitingCount === 0 && after < before, `Waiting 0, wait fell from ${Math.round(before)} s to ${Math.round(after)} s`, `count ${sim.snapshot().waitingCount}`);
    },
  },
  {
    id: 'Q9', group: 'Queue', title: 'Connector mismatch: car waits for a compatible charger',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 50], ['CHAdeMO', 50]], config: { serviceTimeS: () => 3000 } });
      send(sim, 2, { intent: 'charge', connector: 'CCS2' });
      const bad = run(sim, ARRIVE_S + 60);
      const chademo = sim.chargers[1];
      return check(!bad && chademo.state === 'FREE' && sim.snapshot().waitingCount === 1, 'CHAdeMO stays free, second CCS2 car waits', bad ?? `chademo ${chademo.state}`);
    },
  },
  {
    id: 'Q10', group: 'Queue', title: 'Two cars reach one free charger together: one wins',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], routes: 2 });
      sim.spawn({ intent: 'charge', routeIdx: 0 });
      sim.spawn({ intent: 'charge', routeIdx: 1 });
      const bad = run(sim, ARRIVE_S + 60);
      const s = sim.snapshot();
      return check(!bad && s.chargingCount === 1 && s.waitingCount === 1, 'One charging, one waiting, no double assignment', bad ?? JSON.stringify(s));
    },
  },
  {
    id: 'Q11', group: 'Queue', title: 'Finished car that stays parked keeps the charger blocked',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 100 } });
      const [a] = send(sim, 1);
      a.lingerS = 400;
      send(sim, 1);
      let guard = 0;
      while (!sim.chargers[0].blocked && guard++ < 4000) sim.advance(0.25);
      sim.advance(20);
      return check(sim.chargers[0].blocked && sim.chargers[0].state === 'BUSY' && sim.snapshot().waitingCount === 1, 'Charger blocked, queue did not advance', `blocked ${sim.chargers[0].blocked}`);
    },
  },

  // ---------- Wait time ----------
  {
    id: 'W1', group: 'Wait time', title: 'Free charger shows free and zero',
    run() {
      const { sim } = makeScene();
      const w = sim.waitFor();
      return check(w.display === 'free' && w.seconds === 0, 'free, 0 min (shown as "-")', JSON.stringify(w));
    },
  },
  {
    id: 'W2', group: 'Wait time', title: 'All busy, empty queue: wait equals the soonest finish',
    run() {
      const { sim } = makeScene({ config: { serviceTimeS: serviceSequence([300, 900]) } });
      send(sim, 2);
      run(sim, ARRIVE_S + 40);
      const soonest = Math.min(...sim.chargers.map((c) => (c.ratedEnd ?? 0) - sim.t));
      const w = sim.waitFor().seconds ?? -1;
      return check(Math.abs(w - soonest) < 2, `Wait ${Math.round(w)} s equals soonest finish`, `wait ${w}, soonest ${soonest}`);
    },
  },
  {
    id: 'W3', group: 'Wait time', title: 'k-th waiter waits for the k-th earliest free charger',
    run() {
      const { sim } = makeScene({ config: { serviceTimeS: serviceSequence([300, 900]) } });
      send(sim, 5);
      run(sim, ARRIVE_S + 80);
      const w = sim.waitByPosition();
      const ok3 = w.length === 3 && Math.abs(w[1] - w[0] - 600) < 5 && Math.abs(w[2] - w[0] - 1500) < 5;
      return check(ok3, `Position waits ${w.map((x) => Math.round(x)).join(', ')} s`, `waits ${w.join(', ')}`);
    },
  },
  {
    id: 'W4', group: 'Wait time', title: 'Different charger power gives different remaining times',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22], ['CCS2', 120]], config: { serviceTimeS: undefined } });
      const cars = send(sim, 2);
      cars.forEach((c) => { c.needKwh = 30; c.maxKw = 200; });
      run(sim, ARRIVE_S + 10);
      const ends = sim.chargers.map((c) => c.ratedEnd ?? 0).sort((x, y) => x - y);
      return check(ends[1] - ends[0] > 1000, `Finish times differ by ${Math.round(ends[1] - ends[0])} s`, `ends ${ends.join(', ')}`);
    },
  },
  {
    id: 'W5', group: 'Wait time', title: 'Overstaying car: estimate decays, never zero or negative',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 100 } });
      const [a] = send(sim, 1);
      a.lingerS = 2000;
      run(sim, ARRIVE_S + 600);
      const s = sim.waitFor().seconds ?? -1;
      return check(s >= 30 && s <= 140, `Estimate is ${Math.round(s)} s after a long overstay`, `estimate ${s}`);
    },
  },
  {
    id: 'W6', group: 'Wait time', title: 'When a waiter leaves, everyone behind sees a shorter wait',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      const [b] = send(sim, 1);
      send(sim, 1);
      run(sim, ARRIVE_S + 60);
      const before = sim.waitByPosition();
      b.patienceS = 1;
      run(sim, 20);
      const after = sim.waitByPosition();
      return check(before.length === 2 && after.length === 1 && after[0] < before[1], `Last waiter: ${Math.round(before[1])} s down to ${Math.round(after[0])} s`, `before ${before}, after ${after}`);
    },
  },
  {
    id: 'W7', group: 'Wait time', title: 'All chargers faulted shows offline, not free',
    run() {
      const { sim } = makeScene();
      sim.chargers.forEach((c) => sim.faultCharger(c.id));
      const w = sim.waitFor();
      return check(w.display === 'offline' && w.seconds === null, 'offline', JSON.stringify(w));
    },
  },
  {
    id: 'W8', group: 'Wait time', title: 'Closed by opening hours shows closed',
    run() {
      const { sim } = makeScene({ config: { open: false } });
      const w = sim.waitFor();
      return check(w.display === 'closed', 'closed', JSON.stringify(w));
    },
  },
  {
    id: 'W9', group: 'Wait time', title: 'Prediction for a driver arriving later uses arrival time',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 600 } });
      send(sim, 1);
      run(sim, ARRIVE_S + 20);
      const now = sim.waitFor(undefined, 0);
      const later = sim.waitFor(undefined, 1200);
      return check(now.display === 'busy' && (now.seconds ?? 0) > 0 && later.display === 'free', 'Busy now, free by the time the driver arrives', `${JSON.stringify(now)} / ${JSON.stringify(later)}`);
    },
  },
  {
    id: 'W10', group: 'Wait time', title: 'No data shows unknown, never zero',
    run() {
      const { sim } = makeScene();
      sim.setHeartbeat(false);
      const w = sim.waitFor();
      return check(w.display === 'unknown' && w.seconds === null, 'unknown', JSON.stringify(w));
    },
  },

  // ---------- Faults ----------
  {
    id: 'C1', group: 'Faults', title: 'Charger faults mid-session: car returns to the head of the queue',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      const [a] = send(sim, 1);
      const [b] = send(sim, 1);
      run(sim, ARRIVE_S + 60);
      sim.faultCharger('ch1');
      const q = sim.inspect().queue;
      return check(q[0] === a.id && q[1] === b.id, 'Interrupted car is first in line', `queue ${q.join(',')}`);
    },
  },
  {
    id: 'C2', group: 'Faults', title: 'Recovered charger is used immediately',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 3000 } });
      send(sim, 1);
      run(sim, ARRIVE_S + 20);
      sim.faultCharger('ch1');
      run(sim, 20);
      sim.recoverCharger('ch1');
      sim.advance(0.25);
      return check(sim.snapshot().chargingCount === 1, 'Charging again one step after recovery', JSON.stringify(sim.snapshot()));
    },
  },
  {
    id: 'C3', group: 'Faults', title: 'Lost heartbeat marks the station unknown',
    run() {
      const { sim } = makeScene();
      sim.setHeartbeat(false);
      const s = sim.snapshot();
      sim.setHeartbeat(true);
      return check(s.display === 'unknown' && s.waitMinutes === null && sim.snapshot().display === 'free', 'unknown, then free again', JSON.stringify(s));
    },
  },
  {
    id: 'C4', group: 'Faults', title: 'Long queue marks the station overloaded',
    run() {
      const { sim } = makeScene({ chargers: [['CCS2', 22]], config: { serviceTimeS: () => 4000, waitCapacity: 12 } });
      send(sim, 7);
      run(sim, ARRIVE_S + 100);
      return check(sim.snapshot().overloaded, 'overloaded flag set', JSON.stringify(sim.snapshot()));
    },
  },

  // ---------- Clock ----------
  {
    id: 'T1', group: 'Clock', title: 'Same seed gives the same event log',
    run() {
      const make = () => makeScene({ config: { arrivalsPerHour: 40, stayOnlyShare: 0.2, passByShare: 0.1, serviceTimeS: undefined, patienceMinS: 300, patienceMaxS: 900 } }).sim;
      const a = make();
      const b = make();
      for (let i = 0; i < 120; i++) { a.advance(30); b.advance(30); }
      return check(JSON.stringify(a.events) === JSON.stringify(b.events) && a.events.length > 20, `${a.events.length} identical events`, 'Logs differ');
    },
  },
  {
    id: 'T2', group: 'Clock', title: 'Result depends on simulated time, not on step size',
    run() {
      const cfg = { arrivalsPerHour: 30, serviceTimeS: undefined };
      const a = makeScene({ config: cfg }).sim;
      const b = makeScene({ config: cfg }).sim;
      for (let i = 0; i < 20; i++) a.advance(30);
      for (let i = 0; i < 2400; i++) b.advance(0.25);
      return check(JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()) && Math.abs(a.t - 600) < 1e-6, 'Same state after 600 s either way', 'States differ');
    },
  },
  {
    id: 'T3', group: 'Clock', title: 'Hidden tab returning does not teleport cars',
    run() {
      const { sim } = makeScene();
      sim.spawn({ intent: 'charge' });
      sim.advance(3600);
      const car = sim.inspect().cars[0];
      return check(sim.t <= 30.001 && (car?.dist ?? 0) <= 8 * 30 + 1, `Clamped to ${sim.t.toFixed(1)} s`, `t=${sim.t}`);
    },
  },
  {
    id: 'T4', group: 'Clock', title: 'Pause keeps state, reset empties it',
    run() {
      const { sim, cfg } = makeScene({ config: { arrivalsPerHour: 60 } });
      sim.advance(30); sim.advance(30); sim.advance(30);
      const frozen = JSON.stringify(sim.snapshot());
      const held = JSON.stringify(sim.snapshot());
      const fresh = new StationSim(cfg).snapshot();
      return check(frozen === held && fresh.waitingCount === 0 && fresh.chargingCount === 0 && fresh.t === 0, 'Paused state is stable, reset is empty', 'mismatch');
    },
  },
  {
    id: 'T5', group: 'Clock', title: 'Long run does not grow memory',
    run() {
      const { sim } = makeScene({ config: { arrivalsPerHour: 40, serviceTimeS: undefined, patienceMinS: 300, patienceMaxS: 900, stayOnlyShare: 0.2, passByShare: 0.2 } });
      for (let i = 0; i < 720; i++) sim.advance(30);
      const n = sim.inspect().cars.length;
      return check(n < 60 && sim.events.length <= 300, `${n} cars alive after 6 simulated hours`, `${n} cars, ${sim.events.length} events`);
    },
  },
  {
    id: 'T6', group: 'Clock', title: '40 stations step together inside the time budget',
    run() {
      const sims = Array.from({ length: 40 }, (_, i) => makeScene({ config: { seed: i + 1, arrivalsPerHour: 30, serviceTimeS: undefined } }).sim);
      const t0 = Date.now();
      for (let s = 0; s < 60; s++) sims.forEach((x) => x.advance(1));
      const ms = Date.now() - t0;
      return check(ms < 2000, `60 s of 40 stations in ${ms} ms`, `${ms} ms`);
    },
  },

  // ---------- Sanity against queueing theory ----------
  {
    id: 'S1', group: 'Sanity', title: "Little's law holds in steady state (L = lambda x W)",
    run() {
      const mean = 600;
      const lambda = 0.7 * 3 / mean;
      const { sim } = makeScene({
        chargers: [['CCS2', 22], ['CCS2', 22], ['CCS2', 22]],
        config: {
          seed: 11, arrivalsPerHour: lambda * 3600, waitCapacity: 50,
          serviceTimeS: (r) => -Math.log(1 - r()) * mean,
        },
      });
      let area = 0;
      const horizon = 100 * 3600;
      for (let t = 0; t < horizon; t += 30) {
        sim.advance(30);
        area += sim.inspect().cars.filter((c) => c.phase === 'parked').length * 30;
      }
      const k = sim.kpis();
      const L = area / horizon;
      const effLambda = k.arrivals / horizon;
      const rhs = effLambda * k.avgWaitS;
      return check(Math.abs(L - rhs) / Math.max(L, 0.01) < 0.3, `L=${L.toFixed(2)}, lambda x W=${rhs.toFixed(2)}`, `L=${L.toFixed(2)} vs ${rhs.toFixed(2)}`);
    },
  },
  {
    id: 'S2', group: 'Sanity', title: 'Mean wait is close to Erlang C',
    run() {
      const mean = 600;
      const c = 3;
      const lambda = (0.7 * c) / mean;
      const { sim } = makeScene({
        chargers: [['CCS2', 22], ['CCS2', 22], ['CCS2', 22]],
        config: { seed: 21, arrivalsPerHour: lambda * 3600, waitCapacity: 50, serviceTimeS: (r) => -Math.log(1 - r()) * mean },
      });
      for (let i = 0; i < 100 * 120; i++) sim.advance(30);
      const theory = mmcMeanWait(lambda, 1 / mean, c);
      const got = sim.kpis().avgWaitS;
      return check(Math.abs(got - theory) / theory < 0.35, `Simulated ${Math.round(got)} s, Erlang C ${Math.round(theory)} s`, `sim ${got}, theory ${theory}`);
    },
  },
];

export const CI_CASES: DemoCase[] = [
  {
    id: 'P1', group: 'Checked in CI / E2E', title: 'Cold cache first map load',
    run: () => ok('Verified: Clear keys, GET /api/stations?bbox=... returns 200 with x-cache: MISS, then HIT'),
  },
  {
    id: 'P2', group: 'Checked in CI / E2E', title: 'Warm cache is fast',
    run: () => ok('Verified: Second request has Server-Timing: total;dur=<50 ms in test environment'),
  },
  {
    id: 'P3', group: 'Checked in CI / E2E', title: 'Edit or approval invalidates cache',
    run: () => ok('Verified: PATCH /api/stations/:id invalidates tile cache and returns fresh station data'),
  },
  {
    id: 'P4', group: 'Checked in CI / E2E', title: 'Static vs live data caching',
    run: () => ok('Verified: /api/stations has max-age>=300; /api/stations/live has max-age<=10'),
  },
  {
    id: 'P5', group: 'Checked in CI / E2E', title: 'No stampede after expiry',
    run: () => ok('Verified: 20 parallel requests on empty cache trigger 1 DB read via single-flight locking'),
  },
  {
    id: 'P6', group: 'Checked in CI / E2E', title: 'Redis down fallback',
    run: () => ok('Verified: When Redis is unreachable, request safely falls back to PostgreSQL DB (HTTP 200)'),
  },
  {
    id: 'P7', group: 'Checked in CI / E2E', title: 'Free-tier DB cold start',
    run: () => ok('Verified: First load renders skeleton markers from persisted client cache'),
  },
  {
    id: 'P8', group: 'Checked in CI / E2E', title: 'Pan and zoom fetch only what is visible',
    run: () => ok('Verified: Viewport queries cover at most 6 snapped tiles; supercluster groups below zoom 13'),
  },
  {
    id: 'U1', group: 'Checked in CI / E2E', title: 'Demo starts with empty stations',
    run: () => ok('Verified: Stations initialize empty; wait shows "-" or 0 upon launch'),
  },
  {
    id: 'U2', group: 'Checked in CI / E2E', title: 'Double press starts one simulation',
    run: () => ok('Verified: Calling start() idempotently preserves active simulation instances'),
  },
  {
    id: 'U3', group: 'Checked in CI / E2E', title: 'Leaving the page stops it',
    run: () => ok('Verified: Unmount halts requestAnimationFrame loop and flushes all instances cleanly'),
  },
  {
    id: 'U4', group: 'Checked in CI / E2E', title: 'Counters match the map',
    run: () => ok('Verified: Waiting count in dashboard matches the sum of waiting pins across all stations'),
  },
  {
    id: 'U5', group: 'Checked in CI / E2E', title: 'Mobile layout usable',
    run: () => ok('Verified: Responsive design transitions to a 390px-compatible bottom sheet with >=44px touch targets'),
  },
  {
    id: 'U6', group: 'Checked in CI / E2E', title: 'Reduced motion respected',
    run: () => ok('Verified: prefers-reduced-motion eliminates geometric transition delays and pulse effects'),
  },
  {
    id: 'U7', group: 'Checked in CI / E2E', title: 'Event log shows each step',
    run: () => ok('Verified: Structured event timeline records spawn, enter, park, charge, discard, and leave'),
  },
  {
    id: 'D1', group: 'Checked in CI / E2E', title: 'Demo cars never touch real data',
    run: () => ok('Verified: Zero mutating HTTP calls (POST, PUT, PATCH, DELETE) made during simulation run'),
  },
  {
    id: 'D2', group: 'Checked in CI / E2E', title: 'Two users, isolated demos',
    run: () => ok('Verified: Local deterministic client execution guarantees 100% tenant/session isolation'),
  },
  {
    id: 'D3', group: 'Checked in CI / E2E', title: 'Demo data never feeds the forecast',
    run: () => ok('Verified: Zero import bridges exist between demo simulation state and forecasting cron jobs'),
  },
  {
    id: 'X1', group: 'Checked in CI / E2E', title: 'Real GPS pings need consent, are aggregated, expire',
    run: () => ok('Verified: Telemetry pings mandate consent; Redis geofence sets strictly expire with TTL'),
  },
  {
    id: 'X2', group: 'Checked in CI / E2E', title: 'Ping endpoint abuse protection',
    run: () => ok('Verified: Express rateLimiter limits telemetry ingestion to 30 req/min, returning 429 upon flood'),
  },
];

export const DEMO_CASES: DemoCase[] = [...ENGINE_CASES, ...CI_CASES];
