import { create } from 'zustand';
import type { Filters, LatLng } from './types';

export type DriverMapState = {
  selectedId: string | null;
  hoverId: string | null;
  panelOpen: boolean;
  sheetSnap: 'peek' | 'half' | 'full';
  filters: Filters;
  sort: 'closest' | 'wait' | 'price' | 'power';
  tab: 'all' | 'free' | 'saved';
  favourites: Set<string>;
  compare: string[];
  user: (LatLng & { heading?: number }) | null;
  routeTo: string | null;
  mapType: 'roadmap' | 'satellite';
  showHeat: boolean;
  mapInstance: google.maps.Map | null;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setFilters: (f: Partial<Filters>) => void;
  setSort: (s: DriverMapState['sort']) => void;
  setTab: (t: DriverMapState['tab']) => void;
  setPanelOpen: (open: boolean) => void;
  setSheetSnap: (snap: DriverMapState['sheetSnap']) => void;
  setMapType: (t: DriverMapState['mapType']) => void;
  setShowHeat: (h: boolean) => void;
  setMapInstance: (m: google.maps.Map | null) => void;
  toggleFav: (id: string) => void;
  toggleCompare: (id: string) => void;
  setUser: (u: DriverMapState['user']) => void;
  startRoute: (id: string | null) => void;
};

export const useDriverMap = create<DriverMapState>((set, get) => ({
  selectedId: null,
  hoverId: null,
  panelOpen: true,
  sheetSnap: 'peek',
  filters: {
    freeNow: false,
    fast: false,
    connectors: [],
    maxPrice: null,
    favOnly: false,
    open24h: false,
  },
  sort: 'closest',
  tab: 'all',
  favourites: new Set<string>(),
  compare: [],
  user: null,
  routeTo: null,
  mapType: 'roadmap',
  showHeat: false,
  mapInstance: null,
  select: (id) => set({ selectedId: id, sheetSnap: id ? 'half' : 'peek' }),
  hover: (id) => set({ hoverId: id }),
  setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
  setSort: (sort) => set({ sort }),
  setTab: (tab) => set({ tab }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setSheetSnap: (sheetSnap) => set({ sheetSnap }),
  setMapType: (mapType) => set({ mapType }),
  setShowHeat: (showHeat) => set({ showHeat }),
  setMapInstance: (mapInstance) => set({ mapInstance }),
  toggleFav: (id) => {
    const s = new Set(get().favourites);
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
    }
    set({ favourites: s });
  },
  toggleCompare: (id) => {
    const c = get().compare;
    set({
      compare: c.includes(id)
        ? c.filter((x) => x !== id)
        : c.length < 3
          ? [...c, id]
          : c,
    });
  },
  setUser: (user) => set({ user }),
  startRoute: (routeTo) => set({ routeTo }),
}));
