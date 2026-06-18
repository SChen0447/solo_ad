import { create } from 'zustand';

export interface AppState {
  selectedStars: string[];
  simulationEnabled: boolean;
  highlightedLayer: string | null;
  highlightedStarId: string | null;
  comparePanelOpen: boolean;
  sortBy: 'temperature' | 'density' | null;
  sortOrder: 'asc' | 'desc';
  rotationSpeed: number;

  toggleStar: (id: string) => void;
  setSimulationEnabled: (v: boolean) => void;
  setHighlightedLayer: (starId: string | null, layerName: string | null) => void;
  setComparePanelOpen: (v: boolean) => void;
  setSortBy: (field: 'temperature' | 'density') => void;
  setRotationSpeed: (v: number) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedStars: ['yellow-dwarf', 'blue-giant'],
  simulationEnabled: false,
  highlightedLayer: null,
  highlightedStarId: null,
  comparePanelOpen: true,
  sortBy: null,
  sortOrder: 'asc',
  rotationSpeed: 1.0,

  toggleStar: (id) =>
    set((state) => {
      const list = state.selectedStars;
      if (list.includes(id)) {
        return { selectedStars: list.filter((s) => s !== id) };
      }
      if (list.length >= 3) {
        return { selectedStars: [...list.slice(1), id] };
      }
      return { selectedStars: [...list, id] };
    }),

  setSimulationEnabled: (v) => set({ simulationEnabled: v }),

  setHighlightedLayer: (starId, layerName) =>
    set({ highlightedStarId: starId, highlightedLayer: layerName }),

  setComparePanelOpen: (v) => set({ comparePanelOpen: v }),

  setSortBy: (field) =>
    set((state) => {
      if (state.sortBy === field) {
        return { sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { sortBy: field, sortOrder: 'asc' };
    }),

  setRotationSpeed: (v) => set({ rotationSpeed: v }),
}));
