import { create } from "zustand";

export type MapPanel =
  | "none"
  | "detail"
  | "directions"
  | "filter"
  | "booking"
  | "vehicle"
  | "favorites"
  | "bookings"
  | "history"
  | "eco"
  | "settings";

export type PinFilter = "ALL" | "AVAILABLE" | "FAST_DC" | string;

export interface MapUiState {
  selectedId: string | null;
  panel: MapPanel;
  filter: PinFilter;
  demoOpen: boolean;
  mapType: "roadmap" | "satellite";
  showTraffic: boolean;

  setSelectedId: (id: string | null) => void;
  setPanel: (panel: MapPanel) => void;
  setFilter: (filter: PinFilter) => void;
  setDemoOpen: (open: boolean) => void;
  toggleDemoOpen: () => void;
  setMapType: (type: "roadmap" | "satellite") => void;
  setShowTraffic: (show: boolean) => void;
  toggleTraffic: () => void;
  resetUi: () => void;
}

export const useMapUiStore = create<MapUiState>((set) => ({
  selectedId: null,
  panel: "none",
  filter: "ALL",
  demoOpen: false,
  mapType: "roadmap",
  showTraffic: false,

  setSelectedId: (id: string | null) =>
    set((state) => {
      // Opening a station sets panel to detail unless closed
      if (id && state.panel === "none") {
        return { selectedId: id, panel: "detail" };
      }
      if (!id && state.panel === "detail") {
        return { selectedId: null, panel: "none" };
      }
      return { selectedId: id };
    }),

  setPanel: (panel: MapPanel) =>
    set((state) => {
      if (panel === "none") {
        return { panel: "none", selectedId: null };
      }
      return { panel };
    }),

  setFilter: (filter: PinFilter) => set({ filter }),
  setDemoOpen: (demoOpen: boolean) => set({ demoOpen }),
  toggleDemoOpen: () => set((state) => ({ demoOpen: !state.demoOpen })),
  setMapType: (mapType: "roadmap" | "satellite") => set({ mapType }),
  setShowTraffic: (showTraffic: boolean) => set({ showTraffic }),
  toggleTraffic: () => set((state) => ({ showTraffic: !state.showTraffic })),

  resetUi: () =>
    set({
      selectedId: null,
      panel: "none",
      filter: "ALL",
      demoOpen: false,
    }),
}));
