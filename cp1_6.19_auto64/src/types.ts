export type ElementType = 'terrain' | 'building' | 'tree';

export interface SceneElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number; z: number };
  height: number;
  color?: string;
}

export interface SunAngle {
  azimuth: number;
  altitude: number;
}

export interface LineOfSightResult {
  visible: boolean;
  occluders: Array<{
    id: string;
    type: ElementType;
    position: { x: number; y: number; z: number };
  }>;
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export type WeatherMode = 'sunny' | 'sunset';

export type ToolMode = 'select' | 'place' | 'lineOfSight';

export interface WeatherColors {
  ambient: string;
  directional: string;
  shadow: string;
  background: string;
}
