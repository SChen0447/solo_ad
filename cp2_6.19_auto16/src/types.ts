export type BuildingType = 'office' | 'residential' | 'tower';

export interface BuildingData {
  id: string;
  type: BuildingType;
  position: { x: number; z: number };
  height: number;
  rotation: number;
  width: number;
  depth: number;
}

export interface SunPosition {
  azimuth: number;
  elevation: number;
}

export interface LightParams {
  position: { x: number; y: number; z: number };
  intensity: number;
  color: number;
  direction: { x: number; y: number; z: number };
}

export interface ShadowResult {
  buildingId: string;
  shadowRate: number;
}

export interface MarkedTime {
  id: number;
  date: string;
  hour: number;
  color: string;
}

export const BUILDING_PRESETS: Record<BuildingType, { width: number; depth: number; defaultHeight: number; name: string }> = {
  office: { width: 40, depth: 30, defaultHeight: 60, name: '矩形办公楼' },
  residential: { width: 50, depth: 40, defaultHeight: 40, name: 'L形住宅楼' },
  tower: { width: 25, depth: 25, defaultHeight: 120, name: '锥形塔楼' }
};

export const MAX_BUILDINGS = 8;
export const LATITUDE = 39.9;
