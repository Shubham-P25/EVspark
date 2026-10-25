import type { LatLng } from './types';
import { metres } from './geo-local';

export class Path {
  readonly cum: number[];

  constructor(readonly pts: LatLng[]) {
    if (pts.length < 2) throw new Error('Path needs at least two points');
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + metres(pts[i - 1], pts[i]));
    }
  }

  get length(): number {
    return this.cum[this.cum.length - 1];
  }

  at(d: number): LatLng {
    const dist = Math.max(0, Math.min(this.length, d));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < dist) i++;
    const seg = this.cum[i] - this.cum[i - 1] || 1;
    const t = (dist - this.cum[i - 1]) / seg;
    const a = this.pts[i - 1];
    const b = this.pts[i];
    return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
  }
}
