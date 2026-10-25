import { create } from 'zustand';
import { DemoEngine } from '../engine/engine';
import { DemoCanvas, type ColorMode } from '../renderer/demo-canvas';
import { googleAdapter, type MapAdapter } from '../renderer/map-adapter';
import type { EngineEvent, StationInput } from '../engine/types';

export type DemoState = 'idle' | 'loading' | 'running' | 'error';

type BootstrapStation = StationInput;

export interface MapDemoStore {
  state: DemoState;
  error: string | null;
  speed: 1 | 2 | 5 | 10;
  paused: boolean;
  arrivalMeanS: number;
  chargerShare: number;
  colorMode: ColorMode;
  currentPreset: string;
  stations: ReturnType<DemoEngine['stationView']>[];
  log: EngineEvent[];
  engine: DemoEngine | null;
  adapter: (MapAdapter & { dispose(): void }) | null;
  canvas: DemoCanvas | null;

  start: (map: google.maps.Map) => Promise<void>;
  stop: () => void;
  togglePause: () => void;
  setSpeed: (speed: 1 | 2 | 5 | 10) => void;
  setArrivalMeanS: (meanS: number) => void;
  setChargerShare: (share: number) => void;
  setColorMode: (mode: ColorMode) => void;
  reset: () => void;
  forceSpawn: (kind: 'CHARGER' | 'STAYER', stationId?: string) => void;
  toggleFault: (stationId: string, idx: number) => void;
  rushHour: () => void;
  runPreset: (presetKey: string) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
let rafId: number | null = null;
let lastTime = 0;
let rushTimer: NodeJS.Timeout | null = null;

export const useMapDemo = create<MapDemoStore>((set, get) => ({
  state: 'idle',
  error: null,
  speed: 1,
  paused: false,
  arrivalMeanS: 16,
  chargerShare: 0.65,
  colorMode: 'system',
  currentPreset: 'empty',
  stations: [],
  log: [],
  engine: null,
  adapter: null,
  canvas: null,

  start: async (map: google.maps.Map) => {
    const cur = get();
    if (cur.state === 'running' || cur.state === 'loading') return;

    set({ state: 'loading', error: null });

    try {
      const center = map.getCenter();
      const lat = center ? center.lat() : 19.2183;
      const lng = center ? center.lng() : 72.9781;

      const res = await fetch(`${API}/api/demo/bootstrap?lat=${lat}&lng=${lng}&limit=3`);
      if (!res.ok) {
        throw new Error(`Failed to load demo stations (HTTP ${res.status})`);
      }
      const data: { stations: BootstrapStation[] } = await res.json();
      if (!data.stations || data.stations.length === 0) {
        throw new Error('No stations available for demo in this viewport');
      }

      const stationInputs: StationInput[] = data.stations;

      const adapter = googleAdapter(map);
      const engine = new DemoEngine(stationInputs, {
        speed: cur.speed,
        arrivalMeanS: cur.arrivalMeanS,
        chargerShare: cur.chargerShare,
      });

      const canvas = new DemoCanvas(adapter, engine);
      canvas.mode = cur.colorMode;

      // Subscribe to engine logs
      engine.on((event) => {
        set((s) => ({
          log: [event, ...s.log].slice(0, 50),
        }));
      });

      // Start animation loop
      lastTime = performance.now();
      let lastSnapUpdate = 0;

      const loop = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.25);
        lastTime = now;

        const s = get();
        if (s.state !== 'running') return;

        if (!s.paused) {
          engine.step(dt);
        }
        canvas.draw();

        // Throttle React state snapshot to 4Hz (every 250ms) to maintain smooth 60fps canvas
        if (now - lastSnapUpdate > 250) {
          lastSnapUpdate = now;
          const snap = engine.snapshot();
          set({ stations: snap.stations });
        }

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);

      set({
        state: 'running',
        engine,
        adapter,
        canvas,
        stations: engine.snapshot().stations,
        log: [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error starting demo';
      set({ state: 'error', error: msg });
    }
  },

  stop: () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (rushTimer) {
      clearTimeout(rushTimer);
      rushTimer = null;
    }
    const { canvas, adapter } = get();
    if (canvas) canvas.dispose();
    if (adapter) adapter.dispose();

    set({
      state: 'idle',
      engine: null,
      canvas: null,
      adapter: null,
      stations: [],
      log: [],
      paused: false,
    });
  },

  togglePause: () => {
    set((s) => ({ paused: !s.paused }));
  },

  setSpeed: (speed) => {
    const { engine } = get();
    if (engine) engine.setConfig({ speed });
    set({ speed });
  },

  setArrivalMeanS: (meanS) => {
    const { engine } = get();
    if (engine) engine.setConfig({ arrivalMeanS: meanS });
    set({ arrivalMeanS: meanS });
  },

  setChargerShare: (share) => {
    const { engine } = get();
    if (engine) engine.setConfig({ chargerShare: share });
    set({ chargerShare: share });
  },

  setColorMode: (mode) => {
    const { canvas } = get();
    if (canvas) canvas.mode = mode;
    set({ colorMode: mode });
  },

  reset: () => {
    const { engine } = get();
    if (engine) {
      engine.reset();
      set({ stations: engine.snapshot().stations, log: [] });
    }
  },

  forceSpawn: (kind, stationId) => {
    const { engine } = get();
    if (!engine || !engine.stations.length) return;
    const targetId = stationId || engine.stations[0].id;
    engine.forceSpawn(targetId, kind);
  },

  toggleFault: (stationId, idx) => {
    const { engine } = get();
    if (!engine) return;
    engine.toggleFault(stationId, idx);
    set({ stations: engine.snapshot().stations });
  },

  rushHour: () => {
    const { engine, arrivalMeanS } = get();
    if (!engine) return;
    const boosted = Math.max(3, arrivalMeanS / 3);
    engine.setConfig({ arrivalMeanS: boosted });
    set({ arrivalMeanS: boosted });

    if (rushTimer) clearTimeout(rushTimer);
    rushTimer = setTimeout(() => {
      const current = get();
      if (current.engine) {
        current.engine.setConfig({ arrivalMeanS: 16 });
        set({ arrivalMeanS: 16 });
      }
    }, 60000 / get().speed);
  },

  runPreset: (key) => {
    const { engine } = get();
    if (!engine || !engine.stations.length) return;
    const st0 = engine.stations[0].id;

    set({ currentPreset: key });

    switch (key) {
      case 'empty':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 16, chargerShare: 0.65 });
        break;

      case 'free_charger':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        engine.forceSpawn(st0, 'CHARGER');
        break;

      case 'fill_chargers':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        for (let i = 0; i < engine.stations[0].chargers.length; i++) {
          setTimeout(() => {
            if (get().state === 'running') engine.forceSpawn(st0, 'CHARGER');
          }, i * 3000);
        }
        break;

      case 'overflow':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        const cap = engine.stations[0].chargers.length;
        for (let i = 0; i < cap + 3; i++) {
          setTimeout(() => {
            if (get().state === 'running') engine.forceSpawn(st0, 'CHARGER');
          }, i * 2500);
        }
        break;

      case 'other_jobs':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        engine.forceSpawn(st0, 'CHARGER');
        setTimeout(() => {
          if (get().state === 'running') engine.forceSpawn(st0, 'STAYER');
        }, 2000);
        setTimeout(() => {
          if (get().state === 'running') engine.forceSpawn(st0, 'STAYER');
        }, 4000);
        break;

      case 'tired_waiting':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000, patienceS: [10, 10], chargeS: [300, 300] });
        engine.forceSpawn(st0, 'CHARGER');
        setTimeout(() => {
          if (get().state === 'running') engine.forceSpawn(st0, 'CHARGER');
        }, 3000);
        break;

      case 'balk':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 2, chargeS: [300, 300], patienceS: [300, 300] });
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            if (get().state === 'running') engine.forceSpawn(st0, 'CHARGER');
          }, i * 1500);
        }
        break;

      case 'charger_fault':
        engine.toggleFault(st0, 0);
        break;

      case 'rush_hour':
        get().rushHour();
        break;

      case 'visitors_only':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 8, chargerShare: 0 });
        set({ chargerShare: 0, arrivalMeanS: 8 });
        break;

      case 'shrunken_fence':
        // Highlight station with lowest clearance
        break;

      default:
        break;
    }

    set({ stations: engine.snapshot().stations });
  },
}));
