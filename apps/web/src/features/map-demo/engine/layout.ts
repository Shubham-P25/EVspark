import { norm, sub } from './geometry';
import type { Slot, Vec } from './types';

export const LANE = 2.0, SIDE = 6.5, SPACING = 4.6;

export function buildLayout(center: Vec, gate: Vec, R: number, wantChargers: number) {
  const eu = norm(sub(center, gate));
  const ev = { x: -eu.y, y: eu.x };
  const w = (u: number, v: number): Vec => ({ x: center.x + eu.x * u + ev.x * v, y: center.y + eu.y * u + ev.y * v });
  const usable = R - 2.5;
  const cands: { u: number; v: number }[] = [];
  for (let u = -usable + 1.5; u <= usable; u += SPACING) {
    for (const v of [-SIDE, SIDE]) {
      if (Math.hypot(u, v) <= usable) cands.push({ u, v });
    }
  }
  if (cands.length === 0) {
    const s = Math.max(2, usable * 0.5);
    cands.push({ u: 0, v: -s });
    cands.push({ u: 0, v: s });
  }
  cands.sort((a, b) => Math.hypot(a.u, a.v) - Math.hypot(b.u, b.v));
  const fit = Math.max(1, Math.min(wantChargers, Math.max(1, cands.length - 2), cands.length));
  const mk = (c: { u: number; v: number }, kind: Slot['kind'], i: number): Slot =>
    ({ id: `${kind}${i}`, kind, u: c.u, v: c.v, pos: w(c.u, c.v), occupant: null, chargerIdx: kind === 'BAY' ? i : undefined });
  const bays = cands.slice(0, fit).map((c, i) => mk(c, 'BAY', i));
  const park = cands.slice(fit).map((c, i) => mk(c, 'PARK', i)).sort((a, b) => a.u - b.u).slice(0, 14);
  return { w, eu, ev, bays, park, fit: bays.length };
}
