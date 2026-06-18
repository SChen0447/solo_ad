import { create } from 'zustand';
import type { Building, BuildingShape, DisplayMode } from '../modules/windSimulator';

interface AppState {
  buildings: Building[];
  selectedBuildingId: string | null;
  displayMode: DisplayMode;
  isSimulating: boolean;
  buildingHeight: number;
  buildingRotation: number;
  buildingShapeType: BuildingShape['type'];
  buildingWidth: number;
  buildingDepth: number;
  fps: number;
  particleCount: number;
  avgWindDirection: number;
  isPanelCollapsed: boolean;

  addBuilding: (x: number, z: number) => void;
  selectBuilding: (id: string | null) => void;
  updateSelectedBuilding: (updates: Partial<Building>) => void;
  deleteSelectedBuilding: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  setIsSimulating: (v: boolean) => void;
  setBuildingHeight: (h: number) => void;
  setBuildingRotation: (r: number) => void;
  setBuildingShapeType: (t: BuildingShape['type']) => void;
  setBuildingWidth: (w: number) => void;
  setBuildingDepth: (d: number) => void;
  setFps: (v: number) => void;
  setParticleCount: (v: number) => void;
  setAvgWindDirection: (v: number) => void;
  togglePanel: () => void;
}

let buildingIdCounter = 0;

export const useAppStore = create<AppState>((set, get) => ({
  buildings: [],
  selectedBuildingId: null,
  displayMode: 'particles',
  isSimulating: false,
  buildingHeight: 5,
  buildingRotation: 0,
  buildingShapeType: 'rect',
  buildingWidth: 4,
  buildingDepth: 4,
  fps: 0,
  particleCount: 0,
  avgWindDirection: 0,
  isPanelCollapsed: false,

  addBuilding: (x: number, z: number) => {
    const state = get();
    const shape: BuildingShape = {
      type: state.buildingShapeType,
      width: state.buildingWidth,
      depth: state.buildingDepth
    };
    const newBuilding: Building = {
      id: `bld-${++buildingIdCounter}`,
      x,
      z,
      height: state.buildingHeight,
      rotation: state.buildingRotation,
      shape
    };
    set({ buildings: [...state.buildings, newBuilding], selectedBuildingId: newBuilding.id });
  },

  selectBuilding: (id: string | null) => {
    set({ selectedBuildingId: id });
  },

  updateSelectedBuilding: (updates: Partial<Building>) => {
    const state = get();
    if (!state.selectedBuildingId) return;
    set({
      buildings: state.buildings.map((b) =>
        b.id === state.selectedBuildingId ? { ...b, ...updates } : b
      )
    });
  },

  deleteSelectedBuilding: () => {
    const state = get();
    if (!state.selectedBuildingId) return;
    set({
      buildings: state.buildings.filter((b) => b.id !== state.selectedBuildingId),
      selectedBuildingId: null
    });
  },

  setDisplayMode: (mode: DisplayMode) => set({ displayMode: mode }),
  setIsSimulating: (v: boolean) => set({ isSimulating: v }),
  setBuildingHeight: (h: number) => {
    const state = get();
    if (state.selectedBuildingId) {
      state.updateSelectedBuilding({ height: h });
    }
    set({ buildingHeight: h });
  },
  setBuildingRotation: (r: number) => {
    const state = get();
    if (state.selectedBuildingId) {
      state.updateSelectedBuilding({ rotation: (r * Math.PI) / 180 });
    }
    set({ buildingRotation: r });
  },
  setBuildingShapeType: (t: BuildingShape['type']) => {
    const state = get();
    if (state.selectedBuildingId) {
      state.updateSelectedBuilding({ shape: { ...state.buildings.find(b => b.id === state.selectedBuildingId)!.shape, type: t } });
    }
    set({ buildingShapeType: t });
  },
  setBuildingWidth: (w: number) => {
    const state = get();
    if (state.selectedBuildingId) {
      state.updateSelectedBuilding({ shape: { ...state.buildings.find(b => b.id === state.selectedBuildingId)!.shape, width: w } });
    }
    set({ buildingWidth: w });
  },
  setBuildingDepth: (d: number) => {
    const state = get();
    if (state.selectedBuildingId) {
      state.updateSelectedBuilding({ shape: { ...state.buildings.find(b => b.id === state.selectedBuildingId)!.shape, depth: d } });
    }
    set({ buildingDepth: d });
  },

  setFps: (v: number) => set({ fps: v }),
  setParticleCount: (v: number) => set({ particleCount: v }),
  setAvgWindDirection: (v: number) => set({ avgWindDirection: v }),
  togglePanel: () => set((s) => ({ isPanelCollapsed: !s.isPanelCollapsed }))
}));
