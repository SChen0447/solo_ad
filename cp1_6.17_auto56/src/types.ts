export interface BuildingData {
  id: number;
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

export interface GridResponse {
  buildings: BuildingData[];
  gridSize: number;
  spacing: number;
}

export interface LayerResponse {
  layer: 'energy' | 'traffic' | 'green';
  values: Record<string, number>;
  minValue: number;
  maxValue: number;
}

export interface LayerState {
  enabled: boolean;
  opacity: number;
  radius: number;
  data: LayerResponse | null;
}

export interface BuildingValues {
  energy: number;
  traffic: number;
  green: number;
}

export interface AppState {
  energy: LayerState;
  traffic: LayerState;
  green: LayerState;
  gridData: GridResponse | null;
  selectedBuilding: number | null;
  buildingValues: Record<number, BuildingValues>;
}

export type LayerType = 'energy' | 'traffic' | 'green';

export const LAYER_COLORS: Record<LayerType, { r: number; g: number; b: number }> = {
  energy: { r: 1.0, g: 0.4, b: 0.4 },
  traffic: { r: 1.0, g: 0.85, b: 0.24 },
  green: { r: 0.42, g: 0.8, b: 0.47 }
};
