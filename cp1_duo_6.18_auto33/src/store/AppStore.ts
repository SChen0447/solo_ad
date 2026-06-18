import { create } from 'zustand';

export interface BuildingData {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  height: number;
  type: 'box' | 'l-shape' | 'arch';
  dimensions: { width: number; depth: number };
}

export interface SunlightAnalysisResult {
  totalMinutes: number;
  longestShadowArea: number;
  hourlyData: { hour: number; isSunlit: boolean }[];
}

export interface AppState {
  hour: number;
  minute: number;
  month: number;
  day: number;
  selectedBuildingId: string | null;
  buildings: BuildingData[];
  analysisResult: SunlightAnalysisResult | null;
  setTime: (hour: number, minute: number) => void;
  setDate: (month: number, day: number) => void;
  setSelectedBuilding: (id: string | null) => void;
  setAnalysisResult: (result: SunlightAnalysisResult | null) => void;
  resetCamera: () => void;
  cameraResetTrigger: number;
}

const initialBuildings: BuildingData[] = [
  {
    id: 'building-1',
    name: '中央大厦',
    color: '#b0bec5',
    position: [0, 0, 0],
    height: 50,
    type: 'box',
    dimensions: { width: 25, depth: 25 }
  },
  {
    id: 'building-2',
    name: 'L型商务楼',
    color: '#90a4ae',
    position: [-55, 0, -30],
    height: 35,
    type: 'l-shape',
    dimensions: { width: 35, depth: 30 }
  },
  {
    id: 'building-3',
    name: '米白公寓',
    color: '#f5f5dc',
    position: [50, 0, -40],
    height: 22,
    type: 'box',
    dimensions: { width: 20, depth: 28 }
  },
  {
    id: 'building-4',
    name: '蓝绿艺术馆',
    color: '#80cbc4',
    position: [-40, 0, 45],
    height: 18,
    type: 'arch',
    dimensions: { width: 30, depth: 22 }
  },
  {
    id: 'building-5',
    name: '橙色综合楼',
    color: '#ffcc80',
    position: [45, 0, 50],
    height: 42,
    type: 'box',
    dimensions: { width: 22, depth: 32 }
  },
  {
    id: 'building-6',
    name: '拱形会展中心',
    color: '#a1887f',
    position: [0, 0, 65],
    height: 28,
    type: 'arch',
    dimensions: { width: 40, depth: 25 }
  }
];

export const useAppStore = create<AppState>((set) => ({
  hour: 12,
  minute: 0,
  month: 6,
  day: 15,
  selectedBuildingId: null,
  buildings: initialBuildings,
  analysisResult: null,
  cameraResetTrigger: 0,
  setTime: (hour, minute) => set({ hour, minute }),
  setDate: (month, day) => set({ month, day }),
  setSelectedBuilding: (id) => set({ selectedBuildingId: id }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  resetCamera: () => set((state) => ({ cameraResetTrigger: state.cameraResetTrigger + 1 }))
}));
