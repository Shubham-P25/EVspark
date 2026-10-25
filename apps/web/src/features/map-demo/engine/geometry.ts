import type { Path, Vec } from './types';

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Vec): Vec => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; };
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function makePath(pts: Vec[]): Path {
  const p = pts.length >= 2 ? pts : [pts[0], { x: pts[0].x + 0.01, y: pts[0].y }];
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + dist(p[i - 1], p[i]));
  return { pts: p, cum, len: cum[cum.length - 1] };
}

export function sample(path: Path, s: number, prevHeading = 0): { pos: Vec; heading: number } {
  const c = clamp(s, 0, path.len);
  let lo = 0, hi = path.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path.cum[m] <= c) lo = m; else hi = m; }
  const a = path.pts[lo], b = path.pts[Math.min(lo + 1, path.pts.length - 1)];
  const seg = path.cum[Math.min(lo + 1, path.pts.length - 1)] - path.cum[lo];
  const t = seg > 1e-9 ? (c - path.cum[lo]) / seg : 0;
  const heading = seg > 1e-9 ? Math.atan2(b.y - a.y, b.x - a.x) : prevHeading;
  return { pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, heading };
}

/** Offset a polyline to the LEFT of its travel direction by d metres (left-hand traffic lane). */
export function offsetLeft(pts: Vec[], d: number): Vec[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / L) * d, y: p.y + (dx / L) * d };
  });
}

export function truncate(pts: Vec[], maxLen: number): Vec[] {
  const out: Vec[] = [pts[0]]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= maxLen) { const t = (maxLen - acc) / d; out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t }); return out; }
    acc += d; out.push(pts[i]);
  }
  return out;
}

export function makeProjector(origin: { lat: number; lng: number }) {
  const R = 6378137, k = Math.cos((origin.lat * Math.PI) / 180);
  return {
    toWorld: (lat: number, lng: number): Vec => ({ x: ((lng - origin.lng) * Math.PI / 180) * R * k, y: ((lat - origin.lat) * Math.PI / 180) * R }),
    toLatLng: (v: Vec) => ({ lat: origin.lat + (v.y / R) * 180 / Math.PI, lng: origin.lng + (v.x / (R * k)) * 180 / Math.PI }),
  };
}
