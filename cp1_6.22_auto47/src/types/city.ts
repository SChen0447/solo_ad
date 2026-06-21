export enum LandClass {
  COMMERCIAL = 'commercial',
  RESIDENTIAL = 'residential',
  INDUSTRIAL = 'industrial',
  GREENBELT = 'greenbelt',
  ROAD = 'road',
}

export const LAND_CLASS_COLORS: Record<LandClass, string> = {
  [LandClass.COMMERCIAL]: '#e74c3c',
  [LandClass.RESIDENTIAL]: '#3498db',
  [LandClass.INDUSTRIAL]: '#27ae60',
  [LandClass.GREENBELT]: '#9b59b6',
  [LandClass.ROAD]: '#2c3e50',
};

export interface Building {
  id: string;
  gridX: number;
  gridZ: number;
  height: number;
  landClass: LandClass;
  color: string;
  originalColor: string;
  highlightTime: number;
  windowLights: WindowLight[];
}

export interface WindowLight {
  face: number;
  u: number;
  v: number;
  size: number;
}

export interface CityData {
  width: number;
  height: number;
  heightMap: number[][];
  classMap: LandClass[][];
  buildings: Building[];
}

export interface GlobalParams {
  density: number;
  baseSize: number;
  roadWidth: number;
}

export type LightMode = 'sunset' | 'night';

export interface SelectionState {
  selectedIds: Set<string>;
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
}
