import { metres } from './geo-local';
import { insideFence } from './fence';
import { MIN_GAP_M, PARK_GAP_M, type StationSim } from './station-sim';

export function checkInvariants(sim: StationSim): string[] {
  const bad: string[] = [];
  const { cars, chargers, queue, counts } = sim.inspect();

  const working = chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY').length;
  const busy = chargers.filter((c) => c.state === 'BUSY');
  if (busy.length > working) bad.push('charging cars exceed working chargers');

  for (const ch of busy) {
    const car = cars.find((c) => c.id === ch.carId);
    if (!car || car.chargerId !== ch.id) bad.push(`charger ${ch.id} and its car disagree`);
    else if (car.connector !== ch.connector) bad.push(`car ${car.id} on incompatible charger ${ch.id}`);
  }

  const seen = new Set<string>();
  for (const id of [...queue, ...chargers.map((c) => c.carId).filter((x): x is string => !!x)]) {
    if (seen.has(id)) bad.push(`car ${id} is in two places`);
    seen.add(id);
  }

  const inLane = cars.filter((c) => c.phase === 'travelling');
  for (let i = 0; i < inLane.length; i++) {
    for (let j = i + 1; j < inLane.length; j++) {
      if (inLane[i].routeIdx === inLane[j].routeIdx && Math.abs(inLane[i].dist - inLane[j].dist) < MIN_GAP_M * 0.99) {
        bad.push(`cars ${inLane[i].id} and ${inLane[j].id} overlap on the road`);
      }
    }
  }
  const still = cars.filter((c) => c.phase === 'parked' || c.phase === 'charging');
  for (let i = 0; i < still.length; i++) {
    for (let j = i + 1; j < still.length; j++) {
      if (metres(still[i].pos, still[j].pos) < PARK_GAP_M * 0.99) bad.push(`cars ${still[i].id} and ${still[j].id} overlap in the forecourt`);
    }
  }

  for (const car of cars) {
    if (car.intent === 'pass_by' && insideFence(sim.fence, car.pos)) bad.push(`pass-by car ${car.id} is inside the fence`);
  }

  const w = sim.waitByPosition();
  for (let i = 0; i < w.length; i++) {
    if (w[i] < 0) bad.push('negative wait');
    if (i > 0 && w[i] + 1e-6 < w[i - 1]) bad.push('wait decreases with queue position');
  }

  // after dispatch no free charger may sit idle while a compatible charging car is parked
  for (const ch of chargers) {
    if (ch.state !== 'FREE') continue;
    const idleFor = cars.find((c) => c.phase === 'parked' && c.intent === 'charge' && c.connector === ch.connector);
    if (idleFor) bad.push(`charger ${ch.id} idle while ${idleFor.id} waits`);
  }

  if (counts.arrivals !== cars.length + counts.removed) {
    bad.push(`conservation broken: arrivals ${counts.arrivals} != active ${cars.length} + removed ${counts.removed}`);
  }
  return bad;
}
