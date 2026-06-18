import { create } from 'zustand';
import type { Vector3 } from '@/utils/mathUtils';

export type BuildingColorType = 'cool' | 'warm' | 'neutral';

export interface BuildingData {
  id: string;
  name: string;
  position: Vector3;
  width: number;
  depth: number;
  height: number;
  colorType: BuildingColorType;
  color: string;
}

export interface SolarAnalysisResult {
  totalSunMinutes: number;
  totalShadowMinutes: number;
  hourlyShadowMinutes: number[];
  hourlySunMinutes: number[];
  longestShadowArea: Vector3[];
}

interface AppState {
  time: number;
  dayOfYear: number;
  selectedBuildingId: string | null;
  buildings: BuildingData[];
  analysisResults: Record<string, SolarAnalysisResult>;

  setTime: (time: number) => void;
  setDayOfYear: (day: number) => void;
  setSelectedBuildingId: (id: string | null) => void;
  setAnalysisResult: (buildingId: string, result: SolarAnalysisResult) => void;
  getSelectedBuilding: () => BuildingData | undefined;
}

const COOL_COLORS = ['#4a6fa5', '#5d7fb8', '#3d5c8a'];
const WARM_COLORS = ['#d4a373', '#e3b688', '#c49260'];
const NEUTRAL_COLORS = ['#8d99ae', '#9aabb8', '#7a8896'];

function generateBuildings(): BuildingData[] {
  const buildings: BuildingData[] = [];
  const colorTypes: BuildingColorType[] = ['cool', 'cool', 'warm', 'warm', 'neutral', 'neutral'];
  const configs = [
    { name: 'A栋-12层', pos: { x: -30, y: 0, z: -20 }, w: 15, d: 12, h: 36 },
    { name: 'B栋-20层', pos: { x: 10, y: 0, z: -25 }, w: 18, d: 15, h: 60 },
    { name: 'C栋-8层', pos: { x: 35, y: 0, z: 10 }, w: 12, d: 10, h: 24 },
    { name: 'D栋-15层', pos: { x: -25, y: 0, z: 20 }, w: 14, d: 14, h: 45 },
    { name: 'E栋-25层', pos: { x: 5, y: 0, z: 15 }, w: 20, d: 18, h: 75 },
    { name: 'F栋-10层', pos: { x: -10, y: 0, z: -35 }, w: 16, d: 12, h: 30 },
  ];

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    const colorType = colorTypes[i];
    let color: string;

    if (colorType === 'cool') {
      color = COOL_COLORS[i % COOL_COLORS.length];
    } else if (colorType === 'warm') {
      color = WARM_COLORS[i % WARM_COLORS.length];
    } else {
      color = NEUTRAL_COLORS[i % NEUTRAL_COLORS.length];
    }

    buildings.push({
      id: `building-${i}`,
      name: cfg.name,
      position: cfg.pos,
      width: cfg.w,
      depth: cfg.d,
      height: cfg.h,
      colorType,
      color,
    });
  }

  return buildings;
}

export const useStore = create<AppState>((set, get) => ({
  time: 12,
  dayOfYear: 172,
  selectedBuildingId: null,
  buildings: generateBuildings(),
  analysisResults: {},

  setTime: (time) => set({ time }),
  setDayOfYear: (dayOfYear) => set({ dayOfYear }),
  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
  setAnalysisResult: (buildingId, result) =>
    set((state) => ({
      analysisResults: {
        ...state.analysisResults,
        [buildingId]: result,
      },
    })),
  getSelectedBuilding: () => {
    const state = get();
    return state.buildings.find((b) => b.id === state.selectedBuildingId);
  },
}));
