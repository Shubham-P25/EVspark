import type { DemoEngine } from '../engine/engine';
import type { MapAdapter } from './map-adapter';

export type ColorMode = 'system' | 'truth';

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
    const ppm = 1 / mPerPx(c0.lat, z);
    const P = (v: { x: number; y: number } | undefined | null) => {
      if (!v || typeof v.x !== 'number' || typeof v.y !== 'number') return null;
      const ll = this.eng.proj.toLatLng(v);
      return this.a.toPx(ll.lat, ll.lng);
    };
    const snap = this.eng.snapshot();

    // 1. Draw Stations, Ground Infrastructure & Charger Bays
    for (const sv of snap.stations) {
      const L = this.eng.layoutFor(sv.id);
      if (!L || !L.center) continue;
      const c = P(L.center);
      if (!c) continue;

      const r = L.R * ppm;
      const gt = P(L.gate);

      // --- Ground Tarmac Apron (Realistic Station Flooring) ---
      g.save();
      g.beginPath();
      g.arc(c.x, c.y, r + 14, 0, Math.PI * 2);
      g.fillStyle = '#0F172A'; // Obsidian dark asphalt
      g.fill();
      g.strokeStyle = '#1E293B';
      g.lineWidth = 4;
      g.stroke();

      // Access road corridor connecting to the gate
      if (gt) {
        g.beginPath();
        g.moveTo(c.x, c.y);
        g.lineTo(gt.x, gt.y);
        g.lineWidth = Math.max(32, 6.5 * ppm);
        g.strokeStyle = '#0F172A';
        g.stroke();

        // White dashed road centerline
        g.beginPath();
        g.moveTo(c.x, c.y);
        g.lineTo(gt.x, gt.y);
        g.setLineDash([8, 8]);
        g.lineWidth = 2;
        g.strokeStyle = '#E2E8F0';
        g.stroke();
        g.setLineDash([]);
      }
      g.restore();

      // --- Geofence Boundary (AI Telemetry Zone) ---
      g.beginPath();
      g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(37, 99, 235, 0.07)';
      g.fill();
      g.setLineDash([10, 8]);
      g.strokeStyle = '#3B82F6';
      g.lineWidth = 3;
      g.stroke();
      g.setLineDash([]);

      // Geofence Pill Badge
      const fenceBadge = `⚡ GEOFENCE ${Math.round(L.R)}m (TELEMETRY ZONE)`;
      g.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const fbw = g.measureText(fenceBadge).width + 20;
      g.fillStyle = '#1E40AF';
      g.beginPath();
      drawRoundedRect(g, c.x - fbw / 2, c.y + r + 10, fbw, 22, 6);
      g.fill();
      g.fillStyle = '#FFFFFF';
      g.textAlign = 'center';
      g.fillText(fenceBadge, c.x, c.y + r + 25);

      // --- Gate Barrier & Entrance Booth ---
      if (gt) {
        g.beginPath();
        g.arc(gt.x, gt.y, Math.max(8, 3.5 * ppm), 0, Math.PI * 2);
        g.fillStyle = '#334155';
        g.fill();
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 2.5;
        g.stroke();

        g.font = 'bold 9px system-ui';
        g.fillStyle = '#10B981';
        g.textAlign = 'center';
        g.fillText('GATE', gt.x, gt.y - 12);
      }

      // --- Parking Slots (Waiting & Visitor Spots) ---
      const parkW = Math.max(34, 6.2 * ppm);
      const parkH = Math.max(46, 8.5 * ppm);
      for (const p of L.park) {
        if (!p) continue;
        const q = P(p);
        if (q) {
          g.save();
          g.fillStyle = 'rgba(30, 41, 59, 0.9)';
          g.strokeStyle = '#475569';
          g.lineWidth = 2;
          g.beginPath();
          drawRoundedRect(g, q.x - parkW / 2, q.y - parkH / 2, parkW, parkH, 4);
          g.fill();
          g.stroke();

          // Painted parking guidelines
          g.strokeStyle = '#94A3B8';
          g.lineWidth = 1.5;
          g.setLineDash([4, 4]);
          g.strokeRect(q.x - parkW / 2 + 2, q.y - parkH / 2 + 2, parkW - 4, parkH - 4);
          g.setLineDash([]);

          g.font = 'bold 9px system-ui';
          g.fillStyle = '#64748B';
          g.textAlign = 'center';
          g.fillText('PARK', q.x, q.y + 3);
          g.restore();
        }
      }

      // --- 3 Big, Realistic EV Charger Bays ---
      const bayW = Math.max(44, 8 * ppm);
      const bayH = Math.max(54, 9.8 * ppm);

      sv.chargers.forEach((ch, i) => {
        const bay = L.bays ? L.bays[i] : undefined;
        if (!bay) return;
        const q = P(bay);
        if (!q) return;

        g.save();
        // Bay Floor Base
        let bayBg = '#064E3B'; // Dark emerald
        let bayStroke = '#10B981';
        let statusText = 'FREE';

        if (ch.state === 'CHARGING') {
          bayBg = '#065F46';
          bayStroke = '#34D399';
          statusText = 'CHARGING';
        } else if (ch.state === 'RESERVED') {
          bayBg = '#78350F';
          bayStroke = '#FBBF24';
          statusText = 'RESERVED';
        } else if (ch.state === 'FAULT') {
          bayBg = '#7F1D1D';
          bayStroke = '#F87171';
          statusText = 'OFFLINE';
        }

        g.fillStyle = bayBg;
        g.strokeStyle = bayStroke;
        g.lineWidth = 2.5;
        g.beginPath();
        drawRoundedRect(g, q.x - bayW / 2, q.y - bayH / 2, bayW, bayH, 6);
        g.fill();
        g.stroke();

        // Charging progress fill animation
        if (ch.progress > 0) {
          g.fillStyle = 'rgba(52, 211, 153, 0.45)';
          const progH = (bayH - 8) * ch.progress;
          g.beginPath();
          drawRoundedRect(g, q.x - bayW / 2 + 4, q.y + bayH / 2 - 4 - progH, bayW - 8, progH, 4);
          g.fill();
        }

        // Hardware DC Fast Charger Pedestal
        const pedW = bayW * 0.6;
        const pedH = 10;
        g.fillStyle = '#020617';
        g.strokeStyle = '#94A3B8';
        g.lineWidth = 1.5;
        g.beginPath();
        drawRoundedRect(g, q.x - pedW / 2, q.y - bayH / 2 - pedH + 2, pedW, pedH, 3);
        g.fill();
        g.stroke();

        // Pedestal Screen LED
        g.fillStyle = ch.state === 'FAULT' ? '#EF4444' : '#10B981';
        g.beginPath();
        g.arc(q.x, q.y - bayH / 2 - pedH / 2 + 1, 2.5, 0, Math.PI * 2);
        g.fill();

        // Bay Number & Label (C1, C2, C3)
        g.font = 'bold 11px system-ui';
        g.fillStyle = '#FFFFFF';
        g.textAlign = 'center';
        g.fillText(`C${i + 1}`, q.x, q.y - 4);

        g.font = 'bold 8px system-ui';
        g.fillStyle = bayStroke;
        g.fillText(statusText, q.x, q.y + 10);
        g.restore();
      });

      // --- Floating Live Station Metric HUD Badge ---
      const lbl = `⚡ ${sv.chargingQ}/${sv.chargingCap} ACTIVE  |  ⏳ ${sv.waiting} IN QUEUE  |  ⏱️ ~${sv.nextWaitMin ?? 0}m WAIT`;
      g.font = 'bold 13px system-ui, -apple-system, sans-serif';
      const tw = g.measureText(lbl).width + 32;
      g.save();
      g.fillStyle = 'rgba(15, 23, 42, 0.95)';
      g.strokeStyle = '#38BDF8';
      g.lineWidth = 1.5;
      g.beginPath();
      drawRoundedRect(g, c.x - tw / 2, c.y - r - 48, tw, 32, 10);
      g.fill();
      g.stroke();

      g.fillStyle = '#F8FAFC';
      g.textAlign = 'center';
      g.fillText(lbl, c.x, c.y - r - 27);
      g.restore();
    }

    // 2. Draw Big, Detailed EV Cars
    const len = Math.max(52, 9.5 * ppm);
    const wid = Math.max(26, 4.6 * ppm);

    for (const car of snap.cars) {
      const p = P({ x: car.x, y: car.y });
      if (!p) continue;

      // Color scheme:
      // Active Charging = Rich Electric Green (#10B981)
      // Waiting in Queue = Vibrant Golden Amber (#F59E0B)
      // Non-charging visitor = Sleek Indigo (#6366F1)
      // Driving approach = Modern Silver Slate (#475569)
      let fill = '#475569';
      let tagText = '🚗 APPROACH';
      let tagColor = '#94A3B8';

      if (car.kind === 'STAYER') {
        fill = '#6366F1';
        tagText = '🅿️ VISITOR';
        tagColor = '#818CF8';
      } else if (car.q === 'CHARGING' || car.phase === 'CHARGING') {
        fill = '#10B981';
        tagText = '⚡ CHARGING';
        tagColor = '#34D399';
      } else if (car.q === 'WAITING' || car.phase === 'STANDBY_ROAD') {
        fill = '#F59E0B';
        tagText = '⏳ IN QUEUE';
        tagColor = '#FBBF24';
      }

      g.save();
      g.translate(p.x, p.y);
      g.rotate(-car.h);

      // --- 4 Rubber Wheels with Rims ---
      const wheelL = len * 0.22;
      const wheelW = wid * 0.22;
      g.fillStyle = '#020617';
      // Front left & right
      g.fillRect(len * 0.22, -wid / 2 - wheelW + 1, wheelL, wheelW);
      g.fillRect(len * 0.22, wid / 2 - 1, wheelL, wheelW);
      // Rear left & right
      g.fillRect(-len * 0.38, -wid / 2 - wheelW + 1, wheelL, wheelW);
      g.fillRect(-len * 0.38, wid / 2 - 1, wheelL, wheelW);

      // --- Sleek Car Body ---
      g.fillStyle = fill;
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 2;
      g.beginPath();
      drawRoundedRect(g, -len / 2, -wid / 2, len, wid, Math.min(8, wid / 2));
      g.fill();
      g.stroke();

      // Panoramic Tinted Glass Roof & Windshield
      g.fillStyle = '#0B1329';
      drawRoundedRect(g, -len * 0.18, -wid * 0.36, len * 0.5, wid * 0.72, 3);
      g.fill();

      // Front Hood Line Accent
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(len * 0.35, -wid * 0.28);
      g.lineTo(len * 0.35, wid * 0.28);
      g.stroke();

      // --- Front Luminous Headlights & Light Cones ---
      g.fillStyle = '#FEF08A';
      g.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 4);
      g.fillRect(len / 2 - 2, wid / 2 - 6, 3, 4);

      // Soft Headlight Beam
      const beamGrad = g.createLinearGradient(len / 2, 0, len / 2 + 22, 0);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
      g.fillStyle = beamGrad;
      g.beginPath();
      g.moveTo(len / 2, -wid / 2);
      g.lineTo(len / 2 + 24, -wid * 0.85);
      g.lineTo(len / 2 + 24, wid * 0.85);
      g.lineTo(len / 2, wid / 2);
      g.closePath();
      g.fill();

      // --- Rear LED Red Lightbar ---
      g.fillStyle = '#EF4444';
      g.fillRect(-len / 2, -wid / 2 + 2, 3, wid - 4);

      // --- Charging Port & Pulsing Cable ---
      if (car.phase === 'CHARGING') {
        g.beginPath();
        g.arc(len * 0.15, -wid / 2, 4, 0, Math.PI * 2);
        g.fillStyle = '#22C55E';
        g.fill();
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 1.5;
        g.stroke();
      }

      g.restore();

      // --- Overhead Floating Car Badge ---
      g.save();
      g.font = 'bold 9px system-ui';
      const tw = g.measureText(tagText).width + 12;
      g.fillStyle = 'rgba(15, 23, 42, 0.9)';
      g.beginPath();
      drawRoundedRect(g, p.x - tw / 2, p.y - wid / 2 - 18, tw, 14, 4);
      g.fill();
      g.strokeStyle = tagColor;
      g.lineWidth = 1;
      g.stroke();

      g.fillStyle = tagColor;
      g.textAlign = 'center';
      g.fillText(tagText, p.x, p.y - wid / 2 - 7);
      g.restore();
    }
  }
}
