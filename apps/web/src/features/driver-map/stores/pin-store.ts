import { create } from "zustand";
import type { Pin } from "@evspark/shared";

export interface PinMetrics {
  renderedCount: number;
  lastFetchMs: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface PinStoreState {
  pins: Map<string, Pin>;
  version: number;
  metrics: PinMetrics;
  upsertPins: (newPins: Pin[]) => void;
  patchPins: (deltaPins: Pin[]) => void;
  clearPins: () => void;
  setRenderedCount: (count: number) => void;
  recordTileFetch: (durationMs: number, hit: boolean) => void;
}

function hasPinChanged(oldPin: Pin, newPin: Pin): boolean {
  return (
    oldPin.free !== newPin.free ||
    oldPin.usable !== newPin.usable ||
    oldPin.total !== newPin.total ||
    oldPin.maxKw !== newPin.maxKw ||
    oldPin.color !== newPin.color ||
    oldPin.source !== newPin.source ||
    oldPin.lat !== newPin.lat ||
    oldPin.lng !== newPin.lng
  );
}

export const usePinStore = create<PinStoreState>((set) => ({
  pins: new Map<string, Pin>(),
  version: 0,
  metrics: {
    renderedCount: 0,
    lastFetchMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
  },

  upsertPins: (incomingPins: Pin[]) => {
    if (!incomingPins || incomingPins.length === 0) return;

    set((state) => {
      let changed = false;
      let nextMap: Map<string, Pin> | null = null;

      for (const p of incomingPins) {
        const existing = state.pins.get(p.id);
        if (!existing || hasPinChanged(existing, p)) {
          if (!nextMap) {
            nextMap = new Map(state.pins);
          }
          nextMap.set(p.id, p);
          changed = true;
        }
      }

      if (!changed || !nextMap) {
        return state;
      }

      return {
        pins: nextMap,
        version: state.version + 1,
      };
    });
  },

  patchPins: (deltaPins: Pin[]) => {
    if (!deltaPins || deltaPins.length === 0) return;

    set((state) => {
      let changed = false;
      let nextMap: Map<string, Pin> | null = null;

      for (const p of deltaPins) {
        const existing = state.pins.get(p.id);
        if (!existing || hasPinChanged(existing, p)) {
          if (!nextMap) {
            nextMap = new Map(state.pins);
          }
          nextMap.set(p.id, { ...(existing || {}), ...p });
          changed = true;
        }
      }

      if (!changed || !nextMap) {
        return state;
      }

      return {
        pins: nextMap,
        version: state.version + 1,
      };
    });
  },

  clearPins: () => {
    set({
      pins: new Map(),
      version: 0,
    });
  },

  setRenderedCount: (renderedCount: number) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        renderedCount,
      },
    }));
  },

  recordTileFetch: (lastFetchMs: number, hit: boolean) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        lastFetchMs,
        cacheHits: state.metrics.cacheHits + (hit ? 1 : 0),
        cacheMisses: state.metrics.cacheMisses + (hit ? 0 : 1),
      },
    }));
  },
}));
