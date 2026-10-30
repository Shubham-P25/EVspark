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
    const now = performance.now();

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

      // --- Draw Public Road & Bypass Corridor (70m away, strictly clear of the fence) ---
      const roadNorth = P({ x: 70, y: 160 });
      const roadSouth = P({ x: 70, y: -160 });
      const bypassNorth = P({ x: 77, y: 160 });
      const bypassSouth = P({ x: 77, y: -160 });
      const drivewayTurn = P({ x: 58, y: 0 });
      const drivewayEntry = P({ x: 70, y: 0 });

      if (roadNorth && roadSouth) {
        g.save();
        // Public Road Pavement (Asphalt)
        g.beginPath();
        g.moveTo(roadNorth.x, roadNorth.y);
        g.lineTo(roadSouth.x, roadSouth.y);
        g.lineWidth = Math.max(34, 7.5 * ppm);
        g.strokeStyle = '#1E293B';
        g.stroke();

        // White Road Outer Shoulder Lines
        g.beginPath();
        g.moveTo(roadNorth.x - 16, roadNorth.y);
        g.lineTo(roadSouth.x - 16, roadSouth.y);
        g.moveTo(roadNorth.x + 16, roadNorth.y);
        g.lineTo(roadSouth.x + 16, roadSouth.y);
        g.lineWidth = 1.5;
        g.strokeStyle = '#94A3B8';
        g.stroke();

        // Yellow Dashed Center Divider
        g.beginPath();
        g.moveTo(roadNorth.x, roadNorth.y);
        g.lineTo(roadSouth.x, roadSouth.y);
        g.setLineDash([12, 10]);
        g.lineWidth = 2;
        g.strokeStyle = '#FBBF24';
        g.stroke();
        g.setLineDash([]);

        // Public Road Floating Label
        g.font = 'bold 10px system-ui, sans-serif';
        const rtw = g.measureText('🛣️ PUBLIC ROAD (32m BUFFER TO FENCE)').width + 16;
        g.fillStyle = 'rgba(15, 23, 42, 0.9)';
        g.beginPath();
        drawRoundedRect(g, roadNorth.x - rtw / 2, roadNorth.y - 28, rtw, 20, 5);
        g.fill();
        g.strokeStyle = '#475569';
        g.lineWidth = 1;
        g.stroke();
        g.fillStyle = '#E2E8F0';
        g.textAlign = 'center';
        g.fillText('🛣️ PUBLIC ROAD (32m BUFFER TO FENCE)', roadNorth.x, roadNorth.y - 14);

        // Bypass Path (Outside Fence)
        if (bypassNorth && bypassSouth) {
          g.beginPath();
          g.moveTo(bypassNorth.x, bypassNorth.y);
          g.lineTo(bypassSouth.x, bypassSouth.y);
          g.lineWidth = Math.max(22, 5 * ppm);
          g.strokeStyle = 'rgba(30, 41, 59, 0.7)';
          g.stroke();
        }
        g.restore();
      }

      // --- Private Access Driveway (Leading from Public Road to Gate) ---
      if (drivewayEntry && drivewayTurn && gt) {
        g.save();
        g.beginPath();
        g.moveTo(drivewayEntry.x, drivewayEntry.y);
        g.lineTo(drivewayTurn.x, drivewayTurn.y);
        g.lineTo(gt.x, gt.y);
        g.lineWidth = Math.max(34, 7 * ppm);
        g.strokeStyle = '#0F172A';
        g.stroke();

        // Directional White Center Guide
        g.beginPath();
        g.moveTo(drivewayEntry.x, drivewayEntry.y);
        g.lineTo(drivewayTurn.x, drivewayTurn.y);
        g.lineTo(gt.x, gt.y);
        g.setLineDash([8, 8]);
        g.lineWidth = 2;
        g.strokeStyle = '#E2E8F0';
        g.stroke();
        g.setLineDash([]);

        // Driveway Entrance Label
        g.font = 'bold 9px system-ui';
        g.fillStyle = '#10B981';
        g.textAlign = 'center';
        g.fillText('EV ACCESS DRIVEWAY ➔', (drivewayEntry.x + drivewayTurn.x) / 2, drivewayTurn.y - 18);
        g.restore();
      }

      // --- Ground Tarmac Apron (Station Circular Flooring) ---
      g.save();
      g.beginPath();
      g.arc(c.x, c.y, r + 16, 0, Math.PI * 2);
      g.fillStyle = '#0F172A'; // Obsidian dark asphalt
      g.fill();
      g.strokeStyle = '#334155';
      g.lineWidth = 4;
      g.stroke();

      // Inner apron border ring
      g.beginPath();
      g.arc(c.x, c.y, r + 14, 0, Math.PI * 2);
      g.strokeStyle = '#1E293B';
      g.lineWidth = 2;
      g.stroke();
      g.restore();

      // --- Geofence Boundary (AI Telemetry Zone) with Animated Pulsing Dashes ---
      g.save();
      const dashOffset = -(now * 0.02) % 20;
      g.beginPath();
      g.arc(c.x, c.y, r, 0, Math.PI * 2);
      g.fillStyle = 'rgba(37, 99, 235, 0.06)';
      g.fill();
      g.setLineDash([12, 8]);
      g.lineDashOffset = dashOffset;
      g.strokeStyle = '#3B82F6';
      g.lineWidth = 3;
      g.stroke();
      g.setLineDash([]);

      // Subtle radial glow
      const fenceGlow = g.createRadialGradient(c.x, c.y, r - 8, c.x, c.y, r + 8);
      fenceGlow.addColorStop(0, 'rgba(59, 130, 246, 0)');
      fenceGlow.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
      fenceGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      g.fillStyle = fenceGlow;
      g.beginPath();
      g.arc(c.x, c.y, r + 8, 0, Math.PI * 2);
      g.fill();
      g.restore();

      // Geofence Pill Badge
      const fenceBadge = `⚡ GEOFENCE ${Math.round(L.R)}m (TELEMETRY ZONE - AWAY FROM ROAD)`;
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
        g.save();
        // Booth building
        g.fillStyle = '#1E293B';
        g.strokeStyle = '#64748B';
        g.lineWidth = 2;
        g.beginPath();
        drawRoundedRect(g, gt.x - 12, gt.y - 12, 24, 24, 4);
        g.fill();
        g.stroke();

        // Green beacon indicator
        g.fillStyle = '#10B981';
        g.beginPath();
        g.arc(gt.x, gt.y, 4, 0, Math.PI * 2);
        g.fill();

        g.font = 'bold 9px system-ui';
        g.fillStyle = '#10B981';
        g.textAlign = 'center';
        g.fillText('GATE', gt.x, gt.y - 16);
        g.restore();
      }

      // --- Parking Slots (Waiting & Visitor Spots) ---
      const parkW = Math.max(36, 6.5 * ppm);
      const parkH = Math.max(48, 8.8 * ppm);
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
          g.fillStyle = '#94A3B8';
          g.textAlign = 'center';
          g.fillText('PARK', q.x, q.y + 3);
          g.restore();
        }
      }

      // --- 3 Big, Realistic EV Charger Bays ---
      const bayW = Math.max(48, 8.5 * ppm);
      const bayH = Math.max(58, 10.5 * ppm);

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
        const pedW = bayW * 0.65;
        const pedH = 12;
        g.fillStyle = '#020617';
        g.strokeStyle = '#94A3B8';
        g.lineWidth = 1.5;
        g.beginPath();
        drawRoundedRect(g, q.x - pedW / 2, q.y - bayH / 2 - pedH + 2, pedW, pedH, 3);
        g.fill();
        g.stroke();

        // Pedestal Screen LED & Power Text
        g.fillStyle = ch.state === 'FAULT' ? '#EF4444' : '#10B981';
        g.beginPath();
        g.arc(q.x - pedW / 2 + 6, q.y - bayH / 2 - pedH / 2 + 1, 2.5, 0, Math.PI * 2);
        g.fill();

        g.font = 'bold 7px system-ui';
        g.fillStyle = '#E2E8F0';
        g.textAlign = 'center';
        g.fillText('150 kW DC', q.x + 4, q.y - bayH / 2 - pedH / 2 + 3);

        // Bay Number & Label (C1, C2, C3)
        g.font = 'bold 12px system-ui';
        g.fillStyle = '#FFFFFF';
        g.textAlign = 'center';
        g.fillText(`C${i + 1}`, q.x, q.y - 4);

        g.font = 'bold 8px system-ui';
        g.fillStyle = bayStroke;
        g.fillText(statusText, q.x, q.y + 11);
        g.restore();
      });

      // --- Floating Live Station Metric HUD Badge ---
      const lbl = `⚡ ${sv.chargingQ}/${sv.chargingCap} ACTIVE  |  ⏳ ${sv.waiting} IN QUEUE  |  ⏱️ ~${sv.nextWaitMin ?? 0}m WAIT  |  🟢 CLEARANCE: ${sv.clearanceM}m`;
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

    // 2. Draw EV Cars with Full Animation Suite
    const len = Math.max(54, 9.8 * ppm);
    const wid = Math.max(26, 4.8 * ppm);

    for (const car of snap.cars) {
      const p = P({ x: car.x, y: car.y });
      if (!p) continue;

      let fill = '#475569';
      let strokeColor = '#94A3B8';
      let tagText = '🚗 APPROACH';
      let tagColor = '#94A3B8';

      const isCharging = car.q === 'CHARGING' || car.phase === 'CHARGING';
      const isWaiting = car.q === 'WAITING' || car.phase === 'STANDBY_ROAD';
      const isVisitor = car.kind === 'STAYER';
      const isMoving = Math.abs(car.speed) > 0.5;

      if (isVisitor) {
        fill = '#4F46E5';
        strokeColor = '#818CF8';
        tagText = '🅿️ VISITOR';
        tagColor = '#A5B4FC';
      } else if (isCharging) {
        fill = '#059669';
        strokeColor = '#34D399';
        const pct = Math.min(99, Math.round(25 + car.chargeProgress * 74));
        tagText = `⚡ CHARGING ${pct}%`;
        tagColor = '#34D399';
      } else if (isWaiting) {
        fill = '#D97706';
        strokeColor = '#FBBF24';
        tagText = '⏳ IN QUEUE';
        tagColor = '#FDE68A';
      }

      // --- Pulsing Electric Energy Aura & Cable for Charging Cars ---
      if (isCharging) {
        g.save();
        const pulse = (Math.sin(now * 0.006) + 1) / 2; // 0 to 1
        g.beginPath();
        g.arc(p.x, p.y, len * 0.65 + pulse * 6, 0, Math.PI * 2);
        g.fillStyle = `rgba(16, 185, 129, ${0.15 + pulse * 0.15})`;
        g.fill();
        g.strokeStyle = '#34D399';
        g.lineWidth = 1.5;
        g.setLineDash([4, 4]);
        g.stroke();
        g.setLineDash([]);

        // Animated neon green charging cable connecting bay pedestal to car port
        const L = this.eng.layoutFor(car.stationId);
        if (L && car.chargerIdx !== null && L.bays[car.chargerIdx]) {
          const bayPos = P(L.bays[car.chargerIdx]);
          if (bayPos) {
            g.beginPath();
            g.moveTo(bayPos.x, bayPos.y - 18);
            // Curved cable
            const midX = (bayPos.x + p.x) / 2;
            const midY = (bayPos.y + p.y) / 2 + 10;
            g.quadraticCurveTo(midX, midY, p.x, p.y);
            g.strokeStyle = '#10B981';
            g.lineWidth = 3;
            g.stroke();

            // Cable glow
            g.strokeStyle = 'rgba(52, 211, 153, 0.4)';
            g.lineWidth = 6;
            g.stroke();
          }
        }
        g.restore();
      }

      // --- Soft Amber Breathing Halo for Queued Cars ---
      if (isWaiting) {
        g.save();
        const amberPulse = (Math.sin(now * 0.005) + 1) / 2;
        g.beginPath();
        g.arc(p.x, p.y, len * 0.6 + amberPulse * 5, 0, Math.PI * 2);
        g.fillStyle = `rgba(245, 158, 11, ${0.12 + amberPulse * 0.12})`;
        g.fill();
        g.restore();
      }

      // --- Vehicle Body & Geometry ---
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

      // Alloy rim centers
      g.fillStyle = '#94A3B8';
      g.fillRect(len * 0.26, -wid / 2 - wheelW / 2 + 1, wheelL * 0.4, 2);
      g.fillRect(len * 0.26, wid / 2 + wheelW / 2 - 3, wheelL * 0.4, 2);
      g.fillRect(-len * 0.34, -wid / 2 - wheelW / 2 + 1, wheelL * 0.4, 2);
      g.fillRect(-len * 0.34, wid / 2 + wheelW / 2 - 3, wheelL * 0.4, 2);

      // --- Sleek EV Car Body ---
      g.fillStyle = fill;
      g.strokeStyle = strokeColor;
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
      const beamGrad = g.createLinearGradient(len / 2, 0, len / 2 + 26, 0);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
      g.fillStyle = beamGrad;
      g.beginPath();
      g.moveTo(len / 2, -wid / 2);
      g.lineTo(len / 2 + 28, -wid * 0.9);
      g.lineTo(len / 2 + 28, wid * 0.9);
      g.lineTo(len / 2, wid / 2);
      g.closePath();
      g.fill();

      // --- Animated Amber Turn Signals (Blinkers) ---
      const isTurning = car.phase === 'INSIDE_MOVE' || car.phase === 'LEAVING';
      const blinkerOn = Math.sin(now * 0.012) > 0;
      if (isTurning && blinkerOn) {
        g.fillStyle = '#F59E0B';
        // Left blinkers
        g.beginPath();
        g.arc(len / 2 - 2, -wid / 2 + 2, 3, 0, Math.PI * 2);
        g.arc(-len / 2 + 2, -wid / 2 + 2, 3, 0, Math.PI * 2);
        g.fill();
      }

      // --- Rear LED Brake Lights ---
      // Parked or decelerating cars light up brake lights brightly
      const isBraking = !isMoving || car.phase === 'PARKED' || isCharging || isWaiting;
      g.fillStyle = isBraking ? '#EF4444' : '#991B1B';
      g.fillRect(-len / 2, -wid / 2 + 2, 3, wid - 4);

      if (isBraking) {
        // Red brake glow
        g.fillStyle = 'rgba(239, 68, 68, 0.4)';
        g.fillRect(-len / 2 - 6, -wid / 2, 6, wid);
      }

      // --- Charging Port Indicator ---
      if (isCharging) {
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
      drawRoundedRect(g, p.x - tw / 2, p.y - wid / 2 - 18, tw, 15, 4);
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
