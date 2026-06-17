import { create } from 'zustand';
import { SceneParams, BuildingData, OcclusionResult, PresetFile } from '../types';
import { defaultScene } from '../data/defaultScene';

interface SceneState {
  sceneParams: SceneParams;
  buildings: BuildingData[];
  selectedBuildingId: string | null;
  occlusionResults: OcclusionResult[];
  isLoadingPreset: boolean;
  loadingProgress: number;
  rebuildTrigger: number;

  setSceneParams: (params: Partial<SceneParams>) => void;
  setBuildings: (buildings: BuildingData[]) => void;
  updateBuilding: (id: string, updates: Partial<BuildingData>) => void;
  setSelectedBuilding: (id: string | null) => void;
  setOcclusionResults: (results: OcclusionResult[]) => void;
  loadPreset: (preset: PresetFile) => void;
  triggerRebuild: () => void;
  resetScene: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  sceneParams: defaultScene.sceneParams,
  buildings: defaultScene.buildings,
  selectedBuildingId: null,
  occlusionResults: [],
  isLoadingPreset: false,
  loadingProgress: 0,
  rebuildTrigger: 0,

  setSceneParams: (params) =>
    set((state) => ({
      sceneParams: { ...state.sceneParams, ...params }
    })),

  setBuildings: (buildings) =>
    set(() => ({
      buildings
    })),

  updateBuilding: (id, updates) =>
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      )
    })),

  setSelectedBuilding: (id) =>
    set(() => ({
      selectedBuildingId: id,
      occlusionResults: id ? get().occlusionResults : []
    })),

  setOcclusionResults: (results) =>
    set(() => ({
      occlusionResults: results
    })),

  loadPreset: (preset) => {
    set({ isLoadingPreset: true, loadingProgress: 0 });
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        set({
          sceneParams: preset.sceneParams,
          buildings: preset.buildings,
          isLoadingPreset: false,
          loadingProgress: 100,
          selectedBuildingId: null,
          occlusionResults: [],
          rebuildTrigger: get().rebuildTrigger + 1
        });
        setTimeout(() => set({ loadingProgress: 0 }), 500);
      } else {
        set({ loadingProgress: progress });
      }
    }, 50);
  },

  triggerRebuild: () =>
    set((state) => ({
      rebuildTrigger: state.rebuildTrigger + 1
    })),

  resetScene: () =>
    set(() => ({
      sceneParams: defaultScene.sceneParams,
      buildings: defaultScene.buildings,
      selectedBuildingId: null,
      occlusionResults: [],
      rebuildTrigger: get().rebuildTrigger + 1
    }))
}));
