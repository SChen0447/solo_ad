export interface BuildingData {
  id: string;
  name: string;
  shape: 'box' | 'lShape' | 'arch';
  position: [number, number, number];
  dimensions: { width: number; depth: number; height: number };
  color: string;
}

export interface SunlightResult {
  totalMinutes: number;
  longestShadowArea: number;
  timeline: { hour: number; isSunlit: boolean }[];
}

export interface AppState {
  time: number;
  month: number;
  day: number;
  selectedBuildingId: string | null;
  sunlightResult: SunlightResult | null;
  setTime: (time: number) => void;
  setDate: (month: number, day: number) => void;
  selectBuilding: (id: string | null) => void;
  setSunlightResult: (result: SunlightResult | null) => void;
}
