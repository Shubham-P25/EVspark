import { between, createRng, pick, type Rng } from './rng';
import { Path } from './path';
import { fromLocal, metres } from './geo-local';
import { forecourtCapacity, insideFence, type Fence } from './fence';
import type {
  CarIntent,
  Connector,
  DemoCar,
  DemoCharger,
  DisplayState,
  LatLng,
  LeaveReason,
  SimEvent,
  SimKpis,
  StationSnapshot,
} from './types';

export const MIN_GAP_M = 8;
export const PARK_GAP_M = 5;
const ROAD_SPEED = 8;
const HOP_SPEED = 3;
const AVG_SESSION_S = 1500;
const STEP_S = 0.25;
const EVENT_CAP = 300;

export interface SimConfig {
  stationId: string;
  seed: number;
  chargers: Array<{ id: string; connector: Connector; powerKw: number }>;
  routes: Path[];
  bypass?: Path;
  fence: Fence;
  waitCapacity: number;
  dwellS: number;
  arrivalsPerHour: number;
  stayOnlyShare: number;
  passByShare: number;
  lingerShare?: number;
  patienceMinS: number;
  patienceMaxS: number;
  singleLane?: boolean;
  open?: boolean;
  carConnectors?: Connector[];
  serviceTimeS?: (rng: Rng) => number;
}

interface Route {
  path: Path;
  entryDist: number;
}

const MODELS = ['Nexon EV', 'XUV400', 'ZS EV', 'Atto 3', 'Punch.ev', 'Ioniq 5'];

export class StationSim {
  t = 0;
  open: boolean;
  heartbeatOk = true;
  readonly chargers: DemoCharger[];
  readonly events: SimEvent[] = [];
  readonly fence: Fence;
  readonly waitCapacity: number;

  private rng: Rng;
  private cars = new Map<string, DemoCar>();
  private queue: string[] = [];
  private slots: Array<string | null>;
  private routes: Route[];
  private bypass: Path | null;
  private freedConnectors = new Set<Connector>();
  private serial = 0;
  private busySeconds = 0;
  private capacitySeconds = 0;
  private totalWaitS = 0;
  private served = 0;
  private counts = { arrivals: 0, completed: 0, balked: 0, reneged: 0, discarded: 0, passed: 0, removed: 0 };

  constructor(readonly cfg: SimConfig) {
    this.rng = createRng(cfg.seed);
    this.fence = cfg.fence;
    this.open = cfg.open ?? true;
    this.waitCapacity = Math.min(cfg.waitCapacity, forecourtCapacity(cfg.fence, PARK_GAP_M));
    this.slots = new Array(this.waitCapacity).fill(null);
    this.chargers = cfg.chargers.map((c) => ({
      ...c,
      state: 'FREE',
      carId: null,
      endsAt: null,
      ratedEnd: null,
      blocked: false,
    }));
    this.routes = cfg.routes.map((path) => ({ path, entryDist: this.findEntry(path) }));
    this.bypass = cfg.bypass ?? null;
  }

  // ---- public control ----------------------------------------------------

  advance(seconds: number) {
    // clamp so a hidden tab returning after minutes cannot teleport cars (case T3)
    let left = Math.min(seconds, 30);
    while (left > 1e-9) {
      const dt = Math.min(STEP_S, left);
      this.step(dt);
      left -= dt;
    }
  }

  spawn(force: Partial<{ intent: CarIntent; connector: Connector; routeIdx: number }> = {}): DemoCar | null {
    const r = this.rng();
    const intent: CarIntent =
      force.intent ??
      (this.bypass && r < this.cfg.passByShare
        ? 'pass_by'
        : r < this.cfg.passByShare + this.cfg.stayOnlyShare
          ? 'stay_only'
          : 'charge');
    const connectors = this.cfg.carConnectors ?? [...new Set(this.chargers.map((c) => c.connector))];
    const connector = force.connector ?? pick(this.rng, connectors);
    const routeIdx = intent === 'pass_by' ? -1 : (force.routeIdx ?? Math.floor(this.rng() * this.routes.length));
    const path = routeIdx === -1 ? this.bypass : this.routes[routeIdx]?.path;
    if (!path) return null;
    // no room on the road yet: the car cannot enter
    for (const other of this.cars.values()) {
      if (other.phase === 'travelling' && other.routeIdx === routeIdx && other.dist < MIN_GAP_M) return null;
    }

    const id = `c${++this.serial}`;
    const rto = pick(this.rng, ['01', '02', '03', '04', '43', '46']);
    const car: DemoCar = {
      id,
      plate: `MH ${rto} ${String.fromCharCode(65 + Math.floor(this.rng() * 26))}${String.fromCharCode(65 + Math.floor(this.rng() * 26))} ${1000 + Math.floor(this.rng() * 9000)}`,
      connector,
      intent,
      phase: 'travelling',
      routeIdx,
      dist: 0,
      pos: path.at(0),
      target: null,
      slot: null,
      chargerId: null,
      enteredFenceAt: null,
      parkedAt: null,
      patienceS: between(this.rng, this.cfg.patienceMinS, this.cfg.patienceMaxS),
      needKwh: between(this.rng, 8, 34),
      maxKw: pick(this.rng, [22, 50, 60, 100]),
      lingerS: this.rng() < (this.cfg.lingerShare ?? 0.06) ? between(this.rng, 60, 240) : 0,
      leaveReason: null,
    };
    this.cars.set(id, car);
    this.counts.arrivals++;
    this.log('spawn', `${car.plate} ${pick(this.rng, MODELS)} (${intent}) starts toward station`, id);
    return car;
  }

  faultCharger(id: string) {
    const ch = this.chargers.find((c) => c.id === id);
    if (!ch || ch.state === 'FAULTED') return;
    const carId = ch.carId;
    ch.state = 'FAULTED';
    ch.carId = null;
    ch.endsAt = null;
    ch.ratedEnd = null;
    ch.blocked = false;
    this.log('fault', `Charger ${id} faulted`, carId ?? undefined, id);
    if (!carId) return;
    const car = this.cars.get(carId);
    if (!car) return;
    car.chargerId = null;
    const slot = this.slots.indexOf(null);
    if (slot === -1) {
      this.leave(car, 'interrupted_left');
      return;
    }
    // part of the energy was already delivered
    car.needKwh = Math.max(2, car.needKwh * 0.6);
    car.slot = slot;
    this.slots[slot] = car.id;
    car.phase = 'entering';
    car.target = this.slotPos(slot);
    this.queue.unshift(car.id);
    this.log('interrupt', `${car.plate} interrupted, back to the head of the queue`, car.id, id);
  }

  recoverCharger(id: string) {
    const ch = this.chargers.find((c) => c.id === id);
    if (!ch || ch.state !== 'FAULTED') return;
    ch.state = 'FREE';
    this.freedConnectors.add(ch.connector);
    this.log('recover', `Charger ${id} recovered`, undefined, id);
  }

  setHeartbeat(ok: boolean) {
    if (ok === this.heartbeatOk) return;
    this.heartbeatOk = ok;
    this.log(ok ? 'heartbeat_ok' : 'heartbeat_lost', ok ? 'Station heartbeat restored' : 'Station heartbeat lost');
  }

  // ---- read side ---------------------------------------------------------

  inspect() {
    return {
      t: this.t,
      cars: [...this.cars.values()],
      chargers: this.chargers,
      queue: [...this.queue],
      slots: [...this.slots],
      counts: { ...this.counts },
      routes: this.routes,
    };
  }

  // etaS: wait for a driver who arrives etaS seconds from now (recommendation uses the wait at arrival, not now)
  waitFor(connector?: Connector, etaS = 0): { display: DisplayState; seconds: number | null } {
    if (!this.open) return { display: 'closed', seconds: null };
    if (!this.heartbeatOk) return { display: 'unknown', seconds: null };
    const working = this.chargers.filter(
      (c) => (c.state === 'FREE' || c.state === 'BUSY') && (!connector || c.connector === connector)
    );
    if (working.length === 0) return { display: 'offline', seconds: null };
    const waiting = this.countedWaiting();
    if (working.some((c) => c.state === 'FREE') && waiting.length === 0) return { display: 'free', seconds: 0 };

    const now = this.t + etaS;
    const free = working.map((c) => ({ c, at: c.state === 'FREE' ? now : this.t + this.remaining(c) }));
    for (const car of waiting) {
      const options = free.filter((f) => f.c.connector === car.connector);
      if (options.length === 0) continue;
      const next = options.reduce((a, b) => (a.at <= b.at ? a : b));
      next.at += AVG_SESSION_S;
    }
    const earliest = Math.min(...free.map((f) => f.at));
    if (etaS > 0 && earliest <= now && waiting.length === 0) return { display: 'free', seconds: 0 };
    return { display: 'busy', seconds: Math.max(0, earliest - now) };
  }

  // expected start delay of each counted waiter, ignoring connectors; never decreases with position
  waitByPosition(): number[] {
    const working = this.chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY');
    if (working.length === 0) return [];
    const at = working.map((c) => (c.state === 'FREE' ? this.t : this.t + this.remaining(c)));
    return this.countedWaiting().map(() => {
      let k = 0;
      for (let i = 1; i < at.length; i++) if (at[i] < at[k]) k = i;
      const start = at[k];
      at[k] += AVG_SESSION_S;
      return Math.max(0, start - this.t);
    });
  }

  countedWaiting(): DemoCar[] {
    return this.queue
      .map((id) => this.cars.get(id))
      .filter(
        (c): c is DemoCar =>
          !!c && c.phase === 'parked' && this.t - (c.enteredFenceAt ?? this.t) >= this.cfg.dwellS
      );
  }

  snapshot(): StationSnapshot {
    const w = this.waitFor();
    return {
      stationId: this.cfg.stationId,
      t: this.t,
      display: w.display,
      waitMinutes: w.seconds == null ? null : Math.ceil(w.seconds / 60),
      waitingCount: this.countedWaiting().length,
      chargingCount: this.chargers.filter((c) => c.state === 'BUSY').length,
      workingChargers: this.chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY').length,
      totalChargers: this.chargers.length,
      waitByPosition: this.waitByPosition(),
      geofenceReliable: this.fence.status === 'ok',
      overloaded: this.countedWaiting().length > 2 * Math.max(1, this.chargers.filter((c) => c.state !== 'FAULTED').length) || (w.seconds ?? 0) >= 45 * 60,
    };
  }

  kpis(): SimKpis {
    return {
      arrivals: this.counts.arrivals,
      completed: this.counts.completed,
      balked: this.counts.balked,
      reneged: this.counts.reneged,
      discardedOtherJobs: this.counts.discarded,
      passed: this.counts.passed,
      utilisation: this.capacitySeconds ? this.busySeconds / this.capacitySeconds : 0,
      avgWaitS: this.served ? this.totalWaitS / this.served : 0,
      throughputPerHour: this.t > 0 ? (this.counts.completed / this.t) * 3600 : 0,
    };
  }

  chargerPos(ch: DemoCharger): LatLng {
    const i = this.chargers.indexOf(ch);
    const n = this.chargers.length;
    const radius = n < 2 ? 2 : PARK_GAP_M / (2 * Math.sin(Math.PI / n));
    const a = (i / n) * Math.PI * 2;
    return fromLocal(this.fence.centre, Math.cos(a) * radius, Math.sin(a) * radius);
  }

  slotPos(i: number): LatLng {
    const radius = this.fence.minRadius * 0.7;
    const a = (i / Math.max(1, this.waitCapacity)) * Math.PI * 2 + Math.PI / 8;
    return fromLocal(this.fence.centre, Math.cos(a) * radius, Math.sin(a) * radius);
  }

  // ---- stepping ----------------------------------------------------------

  private step(dt: number) {
    this.t += dt;
    this.freedConnectors.clear();

    const lambda = this.cfg.arrivalsPerHour / 3600;
    if (this.open && this.rng() < 1 - Math.exp(-lambda * dt)) this.spawn();

    this.moveTravelling(dt);
    this.moveLeaving(dt);
    this.moveHops(dt);
    this.updateParked();
    this.updateCharging();
    this.dispatch();
    this.discardStayOnly();

    const working = this.chargers.filter((c) => c.state === 'FREE' || c.state === 'BUSY').length;
    this.capacitySeconds += working * dt;
    this.busySeconds += this.chargers.filter((c) => c.state === 'BUSY').length * dt;
  }

  private findEntry(path: Path): number {
    for (let d = 0; d <= path.length; d += 1) {
      if (insideFence(this.fence, path.at(d))) return d;
    }
    return Math.max(0, path.length - 1);
  }

  private routeOf(car: DemoCar): Route | null {
    return car.routeIdx >= 0 ? this.routes[car.routeIdx] : null;
  }

  private gatePos(r: Route): LatLng {
    return r.path.at(r.entryDist);
  }

  private moveTravelling(dt: number) {
    const lanes = new Map<number, DemoCar[]>();
    for (const car of this.cars.values()) {
      if (car.phase !== 'travelling') continue;
      const lane = lanes.get(car.routeIdx) ?? [];
      lane.push(car);
      lanes.set(car.routeIdx, lane);
    }
    for (const [routeIdx, lane] of lanes) {
      lane.sort((a, b) => b.dist - a.dist);
      const route = routeIdx >= 0 ? this.routes[routeIdx] : null;
      const path = route ? route.path : this.bypass!;
      lane.forEach((car, i) => {
        let limit = i === 0 ? Infinity : lane[i - 1].dist - MIN_GAP_M;
        if (route) {
          limit = Math.min(limit, route.entryDist);
          if (this.cfg.singleLane) {
            const bay = route.entryDist - 40;
            if (this.hasLeavingOn(routeIdx) && car.dist < bay) limit = Math.min(limit, bay);
          }
        }
        car.dist = Math.max(car.dist, Math.min(car.dist + ROAD_SPEED * dt, limit));
        car.pos = path.at(car.dist);

        if (!route) {
          if (car.dist >= path.length - 0.5) {
            this.counts.passed++;
            this.log('pass', `${car.plate} drove past the station`, car.id);
            this.remove(car);
          }
        } else if (car.dist >= route.entryDist - 0.01 && !this.gateBusy(route)) {
          this.arrive(car, route);
        }
      });
    }
  }

  private gateBusy(route: Route): boolean {
    const gate = this.gatePos(route);
    for (const c of this.cars.values()) {
      if ((c.phase === 'entering' || (c.phase === 'leaving' && c.target)) && metres(c.pos, gate) < 6) return true;
    }
    return false;
  }

  private hasLeavingOn(routeIdx: number): boolean {
    for (const c of this.cars.values()) if (c.phase === 'leaving' && c.routeIdx === routeIdx) return true;
    return false;
  }

  private arrive(car: DemoCar, route: Route) {
    car.enteredFenceAt = this.t;
    this.log('enter_fence', `${car.plate} entered the fence`, car.id);
    const freeCharger = this.chargers.find((c) => c.state === 'FREE' && c.connector === car.connector);
    const someoneWaiting = this.slots.some((s) => s !== null);

    if (car.intent === 'charge' && freeCharger && !someoneWaiting) {
      this.startCharging(car, freeCharger);
      return;
    }
    const slot = this.slots.indexOf(null);
    if (slot === -1) {
      this.counts.balked++;
      this.log('balk', `${car.plate} found the forecourt full and turned away`, car.id);
      car.dist = route.entryDist;
      this.leave(car, 'balked', false);
      return;
    }
    car.slot = slot;
    this.slots[slot] = car.id;
    car.phase = 'entering';
    car.target = this.slotPos(slot);
    this.queue.push(car.id);
  }

  private moveHops(dt: number) {
    for (const car of this.cars.values()) {
      if (!car.target || car.phase === 'leaving') continue;
      const left = metres(car.pos, car.target);
      const move = HOP_SPEED * dt;
      if (left <= move) {
        car.pos = car.target;
        car.target = null;
        if (car.chargerId) {
          car.phase = 'charging';
          this.log('charge_start', `${car.plate} plugged in`, car.id, car.chargerId);
        } else {
          car.phase = 'parked';
          car.parkedAt = this.t;
          this.log('park', `${car.plate} is waiting in slot ${(car.slot ?? 0) + 1}`, car.id);
        }
      } else {
        const f = move / left;
        car.pos = {
          lat: car.pos.lat + (car.target.lat - car.pos.lat) * f,
          lng: car.pos.lng + (car.target.lng - car.pos.lng) * f,
        };
      }
    }
  }

  private moveLeaving(dt: number) {
    const lanes = new Map<number, DemoCar[]>();
    for (const car of this.cars.values()) {
      if (car.phase !== 'leaving') continue;
      if (car.target) {
        const left = metres(car.pos, car.target);
        const move = HOP_SPEED * dt;
        if (left <= move) {
          car.pos = car.target;
          car.target = null;
        } else {
          const f = move / left;
          car.pos = {
            lat: car.pos.lat + (car.target.lat - car.pos.lat) * f,
            lng: car.pos.lng + (car.target.lng - car.pos.lng) * f,
          };
        }
        continue;
      }
      const lane = lanes.get(car.routeIdx) ?? [];
      lane.push(car);
      lanes.set(car.routeIdx, lane);
    }
    for (const [routeIdx, lane] of lanes) {
      const route = this.routes[routeIdx];
      if (!route) continue;
      lane.sort((a, b) => a.dist - b.dist);
      lane.forEach((car, i) => {
        if (this.cfg.singleLane && this.arrivingInZone(routeIdx, route)) return;
        const limit = i === 0 ? 0 : lane[i - 1].dist + MIN_GAP_M;
        car.dist = Math.min(car.dist, Math.max(car.dist - ROAD_SPEED * dt, limit));
        car.pos = route.path.at(car.dist);
        if (car.dist <= 0.5) this.remove(car);
      });
    }
  }

  private arrivingInZone(routeIdx: number, route: Route): boolean {
    const bay = route.entryDist - 40;
    for (const c of this.cars.values()) {
      if (c.phase === 'travelling' && c.routeIdx === routeIdx && c.dist > bay) return true;
    }
    return false;
  }

  private updateParked() {
    for (const id of [...this.queue]) {
      const car = this.cars.get(id);
      if (!car || car.phase !== 'parked' || car.parkedAt == null) continue;
      const patience = car.intent === 'stay_only' ? car.patienceS * 2 : car.patienceS;
      if (this.t - car.parkedAt <= patience) continue;
      if (car.intent === 'stay_only') {
        this.counts.discarded++;
        this.log('renege', `${car.plate} left after stopping (not charging)`, car.id);
        this.leave(car, 'other_jobs');
      } else {
        this.counts.reneged++;
        this.log('renege', `${car.plate} gave up waiting`, car.id);
        this.leave(car, 'reneged');
      }
    }
  }

  private updateCharging() {
    for (const ch of this.chargers) {
      if (ch.state !== 'BUSY' || ch.endsAt == null || this.t < ch.endsAt) continue;
      const car = ch.carId ? this.cars.get(ch.carId) : undefined;
      if (car && car.lingerS > 0 && !ch.blocked) {
        // finished but the driver stays parked on the charger
        ch.blocked = true;
        ch.endsAt = this.t + car.lingerS;
        car.lingerS = 0;
        this.log('charge_end', `${car.plate} finished but is still parked`, car.id, ch.id);
        continue;
      }
      ch.state = 'FREE';
      ch.carId = null;
      ch.endsAt = null;
      ch.ratedEnd = null;
      ch.blocked = false;
      this.freedConnectors.add(ch.connector);
      this.counts.completed++;
      if (car) {
        this.log('charge_end', `${car.plate} left the charger`, car.id, ch.id);
        this.leave(car, 'finished');
      }
    }
  }

  // chargers that are free take the first compatible charging car in line, same step
  private dispatch() {
    for (const ch of this.chargers) {
      if (ch.state !== 'FREE') continue;
      for (const id of this.queue) {
        const car = this.cars.get(id);
        if (!car || car.phase !== 'parked' || car.intent !== 'charge' || car.connector !== ch.connector) continue;
        this.startCharging(car, ch);
        break;
      }
    }
  }

  private discardStayOnly() {
    for (const id of [...this.queue]) {
      const car = this.cars.get(id);
      if (!car || car.phase !== 'parked' || car.intent !== 'stay_only') continue;
      if (this.t - (car.enteredFenceAt ?? this.t) < this.cfg.dwellS) continue;
      const chargerJustFreed = this.freedConnectors.has(car.connector);
      const chargerIdle = this.chargers.some((c) => c.state === 'FREE' && c.connector === car.connector);
      if (!chargerJustFreed && !chargerIdle) continue;
      this.counts.discarded++;
      this.log('discard_other_jobs', `${car.plate} dropped from the queue (other jobs)`, car.id);
      this.leave(car, 'other_jobs');
    }
  }

  private startCharging(car: DemoCar, ch: DemoCharger) {
    const kw = Math.min(ch.powerKw, car.maxKw);
    const duration = this.cfg.serviceTimeS ? this.cfg.serviceTimeS(this.rng) : ((car.needKwh / kw) * 3600) * 1.1;
    const pos = this.chargerPos(ch);
    const hop = metres(car.pos, pos) / HOP_SPEED;

    if (car.slot !== null) this.slots[car.slot] = null;
    car.slot = null;
    this.queue = this.queue.filter((id) => id !== car.id);

    ch.state = 'BUSY';
    ch.carId = car.id;
    ch.blocked = false;
    ch.endsAt = this.t + hop + duration;
    ch.ratedEnd = ch.endsAt;
    car.chargerId = ch.id;
    car.phase = 'entering';
    car.target = pos;

    this.served++;
    this.totalWaitS += car.parkedAt == null ? 0 : this.t - car.parkedAt;
  }

  private leave(car: DemoCar, reason: LeaveReason, hopToGate = true) {
    if (car.slot !== null) this.slots[car.slot] = null;
    car.slot = null;
    this.queue = this.queue.filter((id) => id !== car.id);
    car.chargerId = null;
    car.phase = 'leaving';
    car.leaveReason = reason;
    const route = this.routeOf(car);
    car.target = hopToGate && route ? this.gatePos(route) : null;
    if (route) car.dist = route.entryDist;
    if (!route) this.remove(car);
  }

  private remove(car: DemoCar) {
    car.phase = 'gone';
    this.counts.removed++;
    this.cars.delete(car.id);
  }

  // remaining time the system believes a charger needs; decays for overstayers (case W5)
  private remaining(ch: DemoCharger): number {
    if (ch.state !== 'BUSY') return 0;
    const rated = ch.ratedEnd ?? this.t;
    const rem = rated - this.t;
    if (rem > 0) return Math.max(rem, 20);
    return Math.max(30, 120 * Math.exp(rem / 300));
  }

  private log(type: SimEvent['type'], text: string, carId?: string, chargerId?: string) {
    this.events.push({ t: this.t, type, text, carId, chargerId });
    if (this.events.length > EVENT_CAP) this.events.splice(0, this.events.length - EVENT_CAP);
  }
}
