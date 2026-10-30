import { create } from 'zustand';
import { DEMO_CASES, ORIGIN, type DemoCase, type CaseResult } from '@evspark/shared';
import { DemoEngine } from '../engine/engine';
import { DemoCanvas, type ColorMode } from '../renderer/demo-canvas';
import { googleAdapter, type MapAdapter } from '../renderer/map-adapter';
import type { EngineEvent } from '../engine/types';
import { DEMO_STANDALONE_STATION } from '../engine/demo-station';

export type DemoState = 'idle' | 'loading' | 'running' | 'error';

export interface CaseStatus {
  status: 'idle' | 'running' | 'passed' | 'failed';
  detail: string;
  durationMs?: number;
}

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

  // 68 Official Demo Cases Suite
  allCases: DemoCase[];
  caseResults: Record<string, CaseStatus>;
  runningAllCases: boolean;
  runningCaseId: string | null;
  activeFilterGroup: string;
  searchQuery: string;

  // Actions
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

  // Test Runner Actions
  runDemoCase: (caseId: string) => Promise<void>;
  runAllDemoCases: () => Promise<void>;
  setFilterGroup: (group: string) => void;
  setSearchQuery: (query: string) => void;
  resetCaseResults: () => void;
}

let rafId: number | null = null;
let lastTime = 0;
let rushTimer: NodeJS.Timeout | null = null;

const initialCaseResults: Record<string, CaseStatus> = Object.fromEntries(
  DEMO_CASES.map((c) => [
    c.id,
    { status: 'idle', detail: 'Ready to run verification' },
  ])
);

export const useMapDemo = create<MapDemoStore>((set, get) => ({
  state: 'idle',
  error: null,
  speed: 1,
  paused: false,
  arrivalMeanS: 14,
  chargerShare: 0.65,
  colorMode: 'system',
  currentPreset: 'empty',
  stations: [],
  log: [],
  engine: null,
  adapter: null,
  canvas: null,

  allCases: DEMO_CASES,
  caseResults: initialCaseResults,
  runningAllCases: false,
  runningCaseId: null,
  activeFilterGroup: 'All',
  searchQuery: '',

  start: async (map: google.maps.Map) => {
    const cur = get();
    if (cur.state === 'running' || cur.state === 'loading') return;

    set({ state: 'loading', error: null });

    try {
      // 1. Position the demo station away from public road clutter
      // Station center is at ORIGIN (19.0657, 72.8687) in open BKC grounds
      // Gate is at x=38m; public road corridor is 70m away East (32m clearance buffer)
      if (map && typeof map.panTo === 'function') {
        map.panTo({ lat: ORIGIN.lat, lng: ORIGIN.lng });
        map.setZoom(19); // Zoom 19 ensures station is prominent, huge and crystal clear
      }

      const adapter = googleAdapter(map);
      const engine = new DemoEngine([DEMO_STANDALONE_STATION], {
        speed: cur.speed,
        arrivalMeanS: cur.arrivalMeanS,
        chargerShare: cur.chargerShare,
        chargeS: [14, 20], // Fast 14-20s charging for live visual feedback
        stayS: [18, 28],
      });

      const canvas = new DemoCanvas(adapter, engine);
      canvas.mode = cur.colorMode;

      engine.on((event) => {
        set((s) => ({
          log: [event, ...s.log].slice(0, 60),
        }));
      });

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

        if (now - lastSnapUpdate > 180) {
          lastSnapUpdate = now;
          const snap = engine.snapshot();
          set({ stations: snap.stations });
        }

        rafId = requestAnimationFrame(loop);
      };

      set({
        state: 'running',
        engine,
        adapter,
        canvas,
        stations: engine.snapshot().stations,
      });

      rafId = requestAnimationFrame(loop);
    } catch (err) {
      set({
        state: 'error',
        error: err instanceof Error ? err.message : 'Failed to launch demo simulation',
      });
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
      adapter: null,
      canvas: null,
      stations: [],
      log: [],
      runningCaseId: null,
      runningAllCases: false,
    });
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

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
        current.engine.setConfig({ arrivalMeanS: 14 });
        set({ arrivalMeanS: 14 });
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
        engine.setConfig({ arrivalMeanS: 14, chargerShare: 0.65 });
        break;

      case 'free_charger':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        engine.forceSpawn(st0, 'CHARGER');
        break;

      case 'fill_chargers':
        engine.reset();
        engine.setConfig({ arrivalMeanS: 1000 });
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (get().state === 'running') engine.forceSpawn(st0, 'CHARGER');
          }, i * 1800);
        }
        break;

      default:
        break;
    }

    set({ stations: engine.snapshot().stations });
  },

  // --- Official 68 Demo Cases Execution ---
  runDemoCase: async (caseId: string) => {
    const target = DEMO_CASES.find((c) => c.id === caseId);
    if (!target) return;

    set({
      runningCaseId: caseId,
      caseResults: {
        ...get().caseResults,
        [caseId]: { status: 'running', detail: 'Executing verification...' },
      },
    });

    // Run test deterministically
    const t0 = performance.now();
    try {
      const res = target.run();
      const durationMs = Math.round(performance.now() - t0);

      // Trigger visual action on the canvas for dynamic visual feedback
      const { engine, state } = get();
      if (state === 'running' && engine && engine.stations.length > 0) {
        const st0 = engine.stations[0].id;
        if (target.group === 'Movement' || target.group === 'Queue') {
          engine.forceSpawn(st0, 'CHARGER', 45);
        } else if (target.group === 'Faults') {
          engine.toggleFault(st0, 0);
          setTimeout(() => {
            if (get().state === 'running') engine.toggleFault(st0, 0);
          }, 2500);
        }
      }

      set({
        runningCaseId: null,
        caseResults: {
          ...get().caseResults,
          [caseId]: {
            status: res.pass ? 'passed' : 'failed',
            detail: res.detail,
            durationMs,
          },
        },
      });
    } catch (err) {
      set({
        runningCaseId: null,
        caseResults: {
          ...get().caseResults,
          [caseId]: {
            status: 'failed',
            detail: err instanceof Error ? err.message : 'Unknown execution error',
          },
        },
      });
    }
  },

  runAllDemoCases: async () => {
    if (get().runningAllCases) return;
    set({ runningAllCases: true });

    const results = { ...get().caseResults };

    for (let i = 0; i < DEMO_CASES.length; i++) {
      const c = DEMO_CASES[i];
      set({ runningCaseId: c.id });

      const t0 = performance.now();
      try {
        const res = c.run();
        const durationMs = Math.round(performance.now() - t0);
        results[c.id] = {
          status: res.pass ? 'passed' : 'failed',
          detail: res.detail,
          durationMs,
        };
      } catch (err) {
        results[c.id] = {
          status: 'failed',
          detail: err instanceof Error ? err.message : 'Error executing case',
        };
      }

      set({ caseResults: { ...results } });
      // Brief yield so the UI progress bar smoothly updates
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 12));
      }
    }

    set({ runningAllCases: false, runningCaseId: null });
  },

  setFilterGroup: (group) => set({ activeFilterGroup: group }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  resetCaseResults: () => {
    set({ caseResults: initialCaseResults, runningCaseId: null, runningAllCases: false });
  },
}));
