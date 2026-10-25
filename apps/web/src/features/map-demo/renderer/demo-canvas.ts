import type { DemoEngine } from '../engine/engine';
import type { MapAdapter } from './map-adapter';

export type ColorMode = 'system' | 'truth'; // system = what the platform sees; truth = real intent (teaching mode)

const mPerPx = (lat: number, z: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export class DemoCanvas {
  private cv = document.createElement('canvas');
  private ctx = this.cv.getContext('2d')!;
  mode: ColorMode = 'system';

  constructor(private a: MapAdapter, private eng: DemoEngine) {
    Object.assign(this.cv.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '5',
    });
    a.container().appendChild(this.cv);
  }

  dispose() {
    this.cv.remove();
  }

  draw() {
    const el = this.a.container();
    const dpr = window.devicePixelRatio || 1;
    const W = el.clientWidth;
    const H = el.clientHeight;

    if (this.cv.width !== W * dpr || this.cv.height !== H * dpr) {
      this.cv.width = W * dpr;
      this.cv.height = H * dpr;
    }

    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    const c0 = this.a.center();
    const z = this.a.zoom();
    const ppm = 1 / mPerPx(c0.lat, z); // pixels per metre
    const P = (v: { x: number; y: number }) => {
      const ll = this.eng.proj.toLatLng(v);
      return this.a.toPx(ll.lat, ll.lng);
    };
    const snap = this.eng.snapshot();

    // 1. Draw station fences, bays, and parking
    for (const sv of snap.stations) {
      const L = this.eng.layoutFor(sv.id);
      const c = P(L.center);
      if (!c) continue;

      const r = L.R * ppm;
      // Fence circle
      g.beginPath();
      g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(37,99,235,0.08)';
      g.fill();
      g.setLineDash([6, 5]);
      g.strokeStyle = '#2563eb';
      g.lineWidth = 2;
      g.stroke();
      g.setLineDash([]);

      // Fence label
      g.font = '500 10px system-ui';
      g.fillStyle = '#2563eb';
      g.textAlign = 'center';
      g.fillText(`Fence ${Math.round(L.R)}m`, c.x, c.y + r + 13);

      // Gate dot
      const gt = P(L.gate);
      if (gt) {
        g.beginPath();
        g.arc(gt.x, gt.y, Math.max(3, 1.5 * ppm), 0, Math.PI * 2);
        g.fillStyle = '#64748b';
        g.fill();
      }

      // Parking slots
      const sq = Math.max(4, 3.4 * ppm);
      for (const p of L.park) {
        const q = P(p);
        if (q) {
          g.strokeStyle = '#cbd5e1';
          g.lineWidth = 1;
          g.strokeRect(q.x - sq / 2, q.y - sq / 2, sq, sq);
        }
      }

      // Charger bays
      sv.chargers.forEach((ch, i) => {
        const q = P(L.bays[i]);
        if (!q) return;
        g.fillStyle =
          ch.state === 'FREE'
            ? '#bbf7d0'
            : ch.state === 'CHARGING'
            ? '#93c5fd'
            : ch.state === 'RESERVED'
            ? '#fde68a'
            : '#fecaca';
        g.fillRect(q.x - sq / 2, q.y - sq / 2, sq, sq);
        if (ch.progress > 0) {
          g.fillStyle = '#2563eb';
          g.fillRect(q.x - sq / 2, q.y + sq / 2 - sq * ch.progress, sq, sq * ch.progress);
        }
      });

      // Floating station badge
      const lbl = `⚡ ${sv.chargingQ}/${sv.chargingCap}  ⏳ ${sv.waiting}  ~${sv.nextWaitMin ?? '–'} min`;
      g.font = '600 12px system-ui';
      const tw = g.measureText(lbl).width + 16;
      g.fillStyle = 'rgba(255,255,255,0.96)';
      g.strokeStyle = '#cbd5e1';
      g.lineWidth = 1;
      g.beginPath();
      drawRoundedRect(g, c.x - tw / 2, c.y - r - 32, tw, 24, 8);
      g.fill();
      g.stroke();

      g.fillStyle = '#0f172a';
      g.textAlign = 'center';
      g.fillText(lbl, c.x, c.y - r - 16);
    }

    // 2. Draw vehicles
    const len = Math.max(7, 4.4 * ppm);
    const wid = Math.max(4, 1.9 * ppm);

    for (const car of snap.cars) {
      const p = P({ x: car.x, y: car.y });
      if (!p) continue;

      const fill =
        this.mode === 'truth'
          ? car.kind === 'CHARGER'
            ? '#16a34a'
            : '#7c3aed'
          : car.q === 'CHARGING'
          ? '#16a34a'
          : car.q === 'WAITING'
          ? '#f59e0b'
          : '#64748b';

      g.save();
      g.translate(p.x, p.y);
      g.rotate(-car.h); // canvas y is inverted compared to cartesian north

      g.fillStyle = fill;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.2;
      g.beginPath();
      drawRoundedRect(g, -len / 2, -wid / 2, len, wid, Math.min(3, wid / 2));
      g.fill();
      g.stroke();

      // Tag outline highlight for special events
      if (car.tag === 'OTHER_JOBS' || car.tag === 'RENEGED' || car.tag === 'BALKED') {
        g.strokeStyle = car.tag === 'OTHER_JOBS' ? '#7c3aed' : '#dc2626';
        g.lineWidth = 2;
        g.strokeRect(-len / 2 - 2, -wid / 2 - 2, len + 4, wid + 4);
      }
      g.restore();
    }
  }
}
