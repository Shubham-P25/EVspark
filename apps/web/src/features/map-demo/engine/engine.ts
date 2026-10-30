import { clamp, dist, dot, makePath, makeProjector, offsetLeft, sample, sub, truncate } from './geometry';
import { buildLayout, LANE } from './layout';
import { estimateWaits, intentRatio } from './estimate';
import type { Car, CarKind, Charger, EngineConfig, EngineEvent, Path, Phase, Slot, StationInput, StationStats, Tag, Vec } from './types';

export const DEFAULT_CONFIG: EngineConfig = {
  seed: 7, speed: 1, arrivalMeanS: 16, chargerShare: 0.65,
  chargeS: [50, 110], stayS: [45, 110], patienceS: [35, 80], offerGraceS: 12,
  roadV: 12, insideV: 5, accel: 3.5, brake: 9,
  safeGap: 5, hardSep: 3.2, lookahead: 14, laneOffsetRoad: 1.8,
  maxCarsPerStation: 40, holdTimeoutS: 40, demoMinPerSimS: 1 / 3,
};

interface StationSim {
  id: string; name: string; center: Vec; R: number; gate: Vec; input: StationInput;
  w: (u: number, v: number) => Vec;
  chargers: Charger[]; bays: Slot[]; park: Slot[];
  chargingQ: number[]; waitingQ: number[];
  routes: Vec[][]; nextArrivalAt: number; stats: StationStats; avgChargeS: number;
}

const zeroStats = (): StationStats => ({ spawned: 0, entered: 0, plugged: 0, served: 0, otherJobs: 0, reneged: 0, balked: 0, leftAfterStay: 0, waitSum: 0, waitN: 0, maxWaiting: 0 });

export class DemoEngine {
  t = 0;
  cfg: EngineConfig;
  readonly cars = new Map<number, Car>();
  readonly stations: StationSim[] = [];
  readonly log: EngineEvent[] = [];
  guardHolds = 0;
  private nextId = 1;
  private seed: number;
  private listeners = new Set<(e: EngineEvent) => void>();
  readonly proj;

  constructor(inputs: StationInput[], cfg: Partial<EngineConfig> = {}) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.seed = this.cfg.seed;
    this.proj = makeProjector({ lat: inputs[0].fence.center.lat, lng: inputs[0].fence.center.lng });
    for (const inp of inputs) {
      const center = this.proj.toWorld(inp.fence.center.lat, inp.fence.center.lng);
      const gate = this.proj.toWorld(inp.fence.gate.lat, inp.fence.gate.lng);
      const L = buildLayout(center, gate, inp.fence.radiusM, inp.chargers);
      const routes = inp.routes.map((r) => {
        const pts = r.map(([la, ln]) => this.proj.toWorld(la, ln));
        if (dist(pts[pts.length - 1], gate) > 0.5) pts.push(gate);
        return pts;
      });
      this.stations.push({
        id: inp.id, name: inp.name, center, R: inp.fence.radiusM, gate, input: inp, w: L.w,
        chargers: Array.from({ length: L.fit }, (_, idx) => ({ idx, online: true, pendingOffline: false, holder: null, chargingSince: null })),
        bays: L.bays, park: L.park, chargingQ: [], waitingQ: [], routes,
        nextArrivalAt: Math.max(2, this.cfg.arrivalMeanS * 0.25) + this.rng() * this.cfg.arrivalMeanS, // stations start EMPTY; first car arrives later
        stats: zeroStats(), avgChargeS: (this.cfg.chargeS[0] + this.cfg.chargeS[1]) / 2,
      });
    }
  }

  // ---------- utilities ----------
  private rng(): number { let t = (this.seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  private between([a, b]: [number, number]) { return a + this.rng() * (b - a); }
  on(cb: (e: EngineEvent) => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  private emit(type: EngineEvent['type'], st: StationSim, msg: string, carId?: number) {
    const e: EngineEvent = { t: this.t, type, stationId: st.id, carId, msg };
    this.log.push(e); if (this.log.length > 300) this.log.shift();
    this.listeners.forEach((l) => l(e));
  }
  private st(id: string) { return this.stations.find((s) => s.id === id)!; }

  // ---------- public control ----------
  setConfig(p: Partial<EngineConfig>) { this.cfg = { ...this.cfg, ...p }; }
  reset() {
    this.t = 0; this.cars.clear(); this.log.length = 0; this.nextId = 1; this.seed = this.cfg.seed;
    for (const s of this.stations) {
      s.chargingQ.length = 0; s.waitingQ.length = 0; s.stats = zeroStats();
      s.nextArrivalAt = Math.max(2, this.cfg.arrivalMeanS * 0.25) + this.rng() * this.cfg.arrivalMeanS;
      s.chargers.forEach((c) => Object.assign(c, { online: true, pendingOffline: false, holder: null, chargingSince: null }));
      [...s.bays, ...s.park].forEach((x) => (x.occupant = null));
    }
  }

  step(dtReal: number) {
    let left = Math.min(dtReal, 0.25) * this.cfg.speed;
    while (left > 1e-9) { const h = Math.min(0.1, left); this.tick(h); left -= h; }
  }

  forceSpawn(stationId: string, kind: CarKind, startDistFromGate = 85) { return this.spawn(this.st(stationId), kind, startDistFromGate); }

  toggleFault(stationId: string, idx: number) {
    const st = this.st(stationId); const ch = st.chargers[idx]; if (!ch) return;
    if (!ch.online) { ch.online = true; ch.pendingOffline = false; this.emit('RESTORED', st, `Charger ${idx + 1} restored`); return; }
    const holder = ch.holder !== null ? this.cars.get(ch.holder) : undefined;
    if (!holder) { ch.online = false; this.emit('FAULT', st, `Charger ${idx + 1} fault`); return; }
    if (holder.phase !== 'CHARGING') { ch.pendingOffline = true; return; } // applies once the car resolves
    // interrupt an active session: car goes to the FRONT of the waiting queue, keeps its bay physically
    ch.online = false; ch.holder = null; ch.chargingSince = null;
    st.chargingQ = st.chargingQ.filter((i) => i !== holder.id);
    holder.q = 'WAITING'; holder.phase = 'PARKED'; holder.tWaitStart = this.t; holder.patienceS += 30; holder.tParked = this.t;
    st.waitingQ.unshift(holder.id);
    this.emit('FAULT', st, `Charger ${idx + 1} fault: car #${holder.id} back to waiting (front)`, holder.id);
  }

  // ---------- main tick ----------
  private tick(h: number) {
    this.t += h;
    for (const st of this.stations) {
      if (this.t >= st.nextArrivalAt) {
        const kind: CarKind = this.rng() < this.cfg.chargerShare ? 'CHARGER' : 'STAYER';
        if (this.spawn(st, kind)) st.nextArrivalAt = this.t + -Math.log(1 - this.rng()) * this.cfg.arrivalMeanS;
        else st.nextArrivalAt = this.t + 0.5; // spawn point busy: retry shortly (prevents overlap)
      }
    }
    this.stationLogic();
    this.moveCars(h);
  }

  // ---------- spawn ----------
  private spawn(st: StationSim, kind: CarKind, startDistFromGate?: number): Car | null {
    let n = 0; for (const c of this.cars.values()) if (c.stationId === st.id) n++;
    if (n >= this.cfg.maxCarsPerStation) return null;
    const route = st.routes[Math.floor(this.rng() * st.routes.length)];
    const entryIn = st.w(-st.R + 2, +LANE);
    const path = makePath([...offsetLeft(route, this.cfg.laneOffsetRoad), entryIn]);
    const startS = startDistFromGate !== undefined ? Math.max(0, path.len - startDistFromGate) : 0;
    const samplePt = sample(path, startS);
    const start = samplePt.pos;
    for (const o of this.cars.values()) if (dist(o.pos, start) < this.cfg.safeGap * 1.5) return null;
    const car: Car = {
      id: this.nextId++, kind, stationId: st.id, phase: 'APPROACH', q: 'NONE', tag: 'NONE', inside: false,
      path, s: startS, speed: this.cfg.roadV * 0.6, pos: start, heading: samplePt.heading, next: null, nextPhase: null,
      slot: null, route,
      chargeS: this.between(this.cfg.chargeS), patienceS: kind === 'CHARGER' ? this.between(this.cfg.patienceS) : Infinity,
      stayS: this.between(this.cfg.stayS), graceS: 0,
      tSpawn: this.t, tEnter: null, tWaitStart: null, tOffer: null, tParked: null, heldS: 0,
    };
    this.cars.set(car.id, car); st.stats.spawned++;
    this.emit('SPAWN', st, `Car #${car.id} (${kind === 'CHARGER' ? 'wants to charge' : 'just visiting'}) heading to ${st.name}`, car.id);
    return car;
  }

  // ---------- movement + collision avoidance ----------
  private moveCars(h: number) {
    const cell = 15, key = (x: number, y: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const grid = new Map<string, Car[]>();
    for (const c of this.cars.values()) { const k = key(c.pos.x, c.pos.y); const a = grid.get(k); if (a) a.push(c); else grid.set(k, [c]); }
    const near = (p: Vec) => { const out: Car[] = []; const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = grid.get(`${cx + i},${cy + j}`); if (a) out.push(...a); } return out; };

    for (const c of [...this.cars.values()]) {
      if (c.phase === 'PARKED' || c.phase === 'CHARGING') continue;
      const st = this.st(c.stationId);
      const hv = { x: Math.cos(c.heading), y: Math.sin(c.heading) };
      let gap = Infinity;
      for (const o of near(c.pos)) {
        if (o === c) continue;
        const rel = sub(o.pos, c.pos), ahead = dot(rel, hv);
        if (ahead <= 0 || ahead > this.cfg.lookahead) continue;
        if (Math.abs(rel.x * hv.y - rel.y * hv.x) > 2.2) continue; // only same-lane corridor blocks
        if (ahead < gap) gap = ahead;
      }
      const vmax = c.inside ? this.cfg.insideV : this.cfg.roadV;
      const vt = Math.min(vmax, Math.max(0, (gap - this.cfg.safeGap) * 0.9));
      c.speed += clamp(vt - c.speed, -this.cfg.brake * h, this.cfg.accel * h);
      const np = sample(c.path, c.s + c.speed * h, c.heading);
      let blocked = false;
      for (const o of near(np.pos)) {
        if (o === c) continue;
        const dNew = dist(o.pos, np.pos);
        if (dNew < this.cfg.hardSep && dNew < dist(o.pos, c.pos)) { blocked = true; break; }
      }
      if (blocked) { c.speed = 0; c.heldS += h; this.guardHolds++; }
      else { c.s += c.speed * h; c.pos = np.pos; c.heading = np.heading; c.heldS = c.speed < 0.1 ? c.heldS + h : 0; }
      if (c.heldS > this.cfg.holdTimeoutS) { this.emit('TIMEOUT', st, `Car #${c.id} gridlocked, removed`, c.id); this.removeCar(c, st, 'TIMEOUT'); continue; }
      if (!c.inside && c.phase === 'APPROACH' && dist(c.pos, st.center) <= st.R) this.onEnterFence(c, st);
      if (c.s >= c.path.len - 1e-6) this.onPathEnd(c, st);
    }
  }

  private onPathEnd(c: Car, st: StationSim) {
    if (c.next) { c.path = c.next; c.s = 0; c.phase = c.nextPhase!; c.next = null; c.nextPhase = null; return; }
    if (c.phase === 'LEAVING') return this.removeCar(c, st, c.tag);
    if (c.phase === 'INSIDE_MOVE') {
      if (c.slot?.kind === 'BAY' && c.q === 'CHARGING') this.startCharging(c, st);
      else { c.phase = 'PARKED'; c.tParked = this.t; c.speed = 0; }
    }
  }

  // ---------- paths inside the fence ----------
  private pathIn(st: StationSim, slot: Slot): Path { return makePath([st.w(-st.R + 2, LANE), st.w(slot.u, LANE), slot.pos]); }
  private pathMove(st: StationSim, c: Car, to: Slot): Path {
    const fromU = c.slot ? c.slot.u : -st.R + 2;
    const lane = to.u >= fromU ? LANE : -LANE; // travel direction decides the lane
    return makePath([c.pos, st.w(fromU, lane), st.w(to.u, lane), to.pos]);
  }
  private pathOut(st: StationSim, c: Car): Path {
    const pts: Vec[] = [c.pos];
    if (c.slot) pts.push(st.w(c.slot.u, -LANE));
    if (c.inside) pts.push(st.w(-st.R + 2, -LANE));
    const back = truncate(offsetLeft([...c.route].reverse(), this.cfg.laneOffsetRoad), 220);
    return makePath([...pts, ...back]);
  }

  // ---------- fence entry decision (the heart of the geofence logic) ----------
  private freePark(st: StationSim) { return st.park.find((s) => s.occupant === null) ?? null; }
  private freeCharger(st: StationSim) { return st.chargers.find((ch) => ch.online && !ch.pendingOffline && ch.holder === null) ?? null; }

  private onEnterFence(c: Car, st: StationSim) {
    c.inside = true; c.tEnter = this.t; st.stats.entered++;
    this.emit('FENCE_ENTER', st, `Car #${c.id} entered the geofence`, c.id);
    const ch = this.freeCharger(st);
    const park = this.freePark(st);
    if (ch && c.kind === 'CHARGER') {
      const bay = st.bays[ch.idx]; bay.occupant = c.id; c.slot = bay;
      this.joinCharging(c, st, ch, bay);
      c.next = this.pathIn(st, bay); c.nextPhase = 'INSIDE_MOVE';
    } else if (ch && c.kind === 'STAYER' && park) {
      park.occupant = c.id; c.slot = park;
      this.joinCharging(c, st, ch, st.bays[ch.idx]); // system only sees "car in fence": tentative reservation
      c.next = this.pathIn(st, park); c.nextPhase = 'INSIDE_MOVE';
    } else if (park) {
      park.occupant = c.id; c.slot = park;
      c.q = 'WAITING'; c.tWaitStart = this.t; st.waitingQ.push(c.id);
      st.stats.maxWaiting = Math.max(st.stats.maxWaiting, st.waitingQ.length);
      this.emit('WAITING_Q_JOIN', st, `Car #${c.id} joined the WAITING queue (position ${st.waitingQ.length})`, c.id);
      c.next = this.pathIn(st, park); c.nextPhase = 'INSIDE_MOVE';
    } else {
      c.tag = 'BALKED'; st.stats.balked++;
      this.emit('BALKED', st, `Car #${c.id} found no space and left`, c.id);
      this.beginLeave(c, st, 'BALKED');
    }
  }

  private joinCharging(c: Car, st: StationSim, ch: Charger, bay: Slot) {
    ch.holder = c.id; st.chargingQ.push(c.id); c.q = 'CHARGING'; c.tOffer = this.t;
    c.graceS = this.cfg.offerGraceS + (dist(c.pos, bay.pos) * 1.4) / this.cfg.insideV;
    this.emit('CHARGING_Q_JOIN', st, `Car #${c.id} joined the CHARGING queue (charger ${ch.idx + 1})`, c.id);
  }

  // ---------- per-station logic ----------
  private stationLogic() {
    for (const st of this.stations) {
      // 1) offer expired => "other jobs"
      for (const id of [...st.chargingQ]) {
        const c = this.cars.get(id)!;
        if (c.phase !== 'CHARGING' && c.tOffer !== null && this.t - c.tOffer > c.graceS) this.discardOtherJobs(c, st);
      }
      // 2) charge completion
      for (const ch of st.chargers) {
        if (ch.holder === null || ch.chargingSince === null) continue;
        const c = this.cars.get(ch.holder)!;
        if (this.t - ch.chargingSince >= c.chargeS) {
          st.avgChargeS = st.avgChargeS * 0.8 + c.chargeS * 0.2;
          st.stats.served++; c.tag = 'SERVED'; c.q = 'NONE';
          st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
          this.releaseCharger(ch, st);
          this.emit('CHARGE_DONE', st, `Car #${c.id} finished charging`, c.id);
          this.beginLeave(c, st, 'SERVED');
        }
      }
      // 3) renege (waiting chargers) + stay timers
      for (const c of [...this.cars.values()]) {
        if (c.stationId !== st.id) continue;
        if (c.q === 'WAITING' && c.kind === 'CHARGER' && c.tWaitStart !== null && this.t - c.tWaitStart > c.patienceS) {
          st.stats.reneged++; this.emit('RENEGED', st, `Car #${c.id} got tired of waiting and left`, c.id);
          this.beginLeave(c, st, 'RENEGED');
        } else if (c.kind === 'STAYER' && c.q === 'NONE' && c.phase === 'PARKED' && c.tParked !== null && this.t - c.tParked >= c.stayS) {
          st.stats.leftAfterStay++; this.emit('LEFT_AFTER_STAY', st, `Car #${c.id} (visitor) left`, c.id);
          this.beginLeave(c, st, 'LEFT_AFTER_STAY');
        }
      }
      // 4) promote head of waiting queue into every free charger
      for (const ch of st.chargers) {
        if (!(ch.online && !ch.pendingOffline && ch.holder === null) || !st.waitingQ.length) continue;
        const id = st.waitingQ.shift()!; const c = this.cars.get(id)!;
        const bay = st.bays[ch.idx];
        this.emit('OFFERED', st, `Charger ${ch.idx + 1} offered to car #${c.id}`, c.id);
        this.joinCharging(c, st, ch, bay);
        if (c.kind === 'CHARGER') {
          if (c.slot) c.slot.occupant = null;
          bay.occupant = c.id;
          c.path = this.pathMove(st, c, bay); c.s = 0; c.slot = bay; c.phase = 'INSIDE_MOVE'; c.next = null;
        } // STAYER does not move: grace timer will classify it as OTHER_JOBS
      }
    }
  }

  private releaseCharger(ch: Charger, st: StationSim) {
    ch.holder = null; ch.chargingSince = null;
    if (ch.pendingOffline) { ch.online = false; ch.pendingOffline = false; this.emit('FAULT', st, `Charger ${ch.idx + 1} fault`); }
  }

  private startCharging(c: Car, st: StationSim) {
    const ch = st.chargers[c.slot!.chargerIdx!];
    c.phase = 'CHARGING'; c.speed = 0; ch.chargingSince = this.t;
    st.stats.plugged++;
    if (c.tWaitStart !== null) { st.stats.waitSum += this.t - c.tWaitStart; st.stats.waitN++; }
    this.emit('PLUG_IN', st, `Car #${c.id} plugged in at charger ${ch.idx + 1}`, c.id);
  }

  private discardOtherJobs(c: Car, st: StationSim) {
    const ch = st.chargers.find((x) => x.holder === c.id)!;
    st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
    c.q = 'NONE'; c.tag = 'OTHER_JOBS'; st.stats.otherJobs++;
    this.releaseCharger(ch, st);
    this.emit('OTHER_JOBS', st, `Car #${c.id} did not plug in: classified OTHER JOBS and discarded from the queue`, c.id);
  }

  /** remove from queues, free slot, drive away */
  private beginLeave(c: Car, st: StationSim, tag: Tag) {
    c.tag = tag;
    st.waitingQ = st.waitingQ.filter((i) => i !== c.id);
    if (c.q === 'CHARGING') { const ch = st.chargers.find((x) => x.holder === c.id); st.chargingQ = st.chargingQ.filter((i) => i !== c.id); if (ch) this.releaseCharger(ch, st); }
    c.q = 'NONE';
    const old = c.slot; c.path = this.pathOut(st, c); c.s = 0; c.phase = 'LEAVING'; c.next = null;
    if (old) { old.occupant = null; c.slot = null; }
  }

  private removeCar(c: Car, st: StationSim, tag: Tag) {
    st.waitingQ = st.waitingQ.filter((i) => i !== c.id); st.chargingQ = st.chargingQ.filter((i) => i !== c.id);
    for (const ch of st.chargers) if (ch.holder === c.id) this.releaseCharger(ch, st);
    if (c.slot) c.slot.occupant = null;
    this.cars.delete(c.id);
    void tag;
  }

  // ---------- read model for UI / renderer ----------
  stationView(st: StationSim) {
    const freeIn = st.chargers.filter((c) => c.online).map((c) => {
      if (c.holder === null) return 0;
      const elapsed = c.chargingSince === null ? 0 : this.t - c.chargingSince;
      return Math.max(1, st.avgChargeS - elapsed);
    });
    const p = intentRatio(st.stats.plugged, st.stats.otherJobs);
    const est = estimateWaits(freeIn, st.waitingQ.length, st.avgChargeS, p);
    const toMin = (s: number | null) => (s === null || !isFinite(s) ? null : Math.round(s * this.cfg.demoMinPerSimS));
    return {
      id: st.id, name: st.name, radiusM: st.R, centerShifted: st.input.fence.centerShifted, clearanceM: st.input.fence.clearanceM,
      chargers: st.chargers.map((ch) => ({ idx: ch.idx, online: ch.online, pendingOffline: ch.pendingOffline,
        state: !ch.online ? 'FAULT' : ch.holder === null ? 'FREE' : ch.chargingSince !== null ? 'CHARGING' : 'RESERVED',
        progress: ch.chargingSince !== null && ch.holder !== null ? clamp((this.t - ch.chargingSince) / this.cars.get(ch.holder)!.chargeS, 0, 1) : 0 })),
      chargingQ: st.chargingQ.length, chargingCap: st.chargers.filter((c) => c.online).length,
      waiting: st.waitingQ.length, waitingIds: [...st.waitingQ],
      insideFenceCount: st.chargingQ.length + st.waitingQ.length + st.park.filter((p) => p.occupant !== null).length,
      standbyRoadCount: [...this.cars.values()].filter((c) => c.stationId === st.id && c.phase === 'APPROACH' && dist(c.pos, st.gate) < 60).length,
      nextWaitMin: toMin(est.nextCarWaitS) ?? 0, perPositionMin: est.perPositionS.map(toMin),
      avgWaitedMin: st.stats.waitN ? toMin(st.stats.waitSum / st.stats.waitN) : null,
      intentRatio: Math.round(p * 100), stats: { ...st.stats },
    };
  }

  snapshot() {
    return {
      t: this.t,
      cars: [...this.cars.values()].map((c) => ({
        id: c.id,
        x: c.pos.x,
        y: c.pos.y,
        h: c.heading,
        speed: c.speed,
        kind: c.kind,
        phase: c.phase,
        q: c.q,
        tag: c.tag,
        stationId: c.stationId,
        chargeProgress:
          c.phase === 'CHARGING' && c.tOffer !== null
            ? Math.min(1, Math.max(0, (this.t - c.tOffer) / c.chargeS))
            : c.phase === 'CHARGING' && c.tParked !== null
            ? Math.min(1, Math.max(0, (this.t - c.tParked) / c.chargeS))
            : 0,
        slotId: c.slot?.id ?? null,
        chargerIdx: c.slot?.chargerIdx ?? null,
      })),
      stations: this.stations.map((s) => this.stationView(s)),
    };
  }

  layoutFor(stationId: string) {
    const s = this.st(stationId);
    return { center: s.center, R: s.R, gate: s.gate, bays: s.bays.map((b) => b.pos), park: s.park.map((p) => p.pos) };
  }
}
