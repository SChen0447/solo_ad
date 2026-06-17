export interface EnvironmentParams {
  light: number;
  rain: number;
  wind: number;
  temp: number;
}

export type TreeType = 'pine' | 'oak' | 'sakura';
export type AnimalType = 'rabbit' | 'squirrel' | 'butterfly';

export interface EcoEntity {
  id: string;
  position: { x: number; y: number; z: number };
  type: string;
  currentState: {
    health: number;
    growth: number;
    saturation: number;
  };
  targetState: {
    health: number;
    growth: number;
    saturation: number;
  };
}

export interface TreeEntity extends EcoEntity {
  type: TreeType;
  canopyScale: number;
  targetCanopyScale: number;
  baseYRotation: number;
  windOffset: number;
}

export interface GrassBladeData {
  baseHeight: number;
  currentHeight: number;
  targetHeight: number;
  x: number;
  z: number;
  rotation: number;
}

export interface AnimalEntity extends EcoEntity {
  type: AnimalType;
  velocity: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  activityLevel: number;
  targetActivityLevel: number;
  moveTimer: number;
  hopHeight: number;
  climbOffset: number;
  baseTreeId?: string;
}

export interface EcosystemMetrics {
  healthIndex: number;
  biodiversity: number;
  growthActivity: number;
  humidity: number;
  treeCount: number;
}

export const DEFAULT_ENVIRONMENT: EnvironmentParams = {
  light: 60,
  rain: 50,
  wind: 20,
  temp: 22
};

export const TREE_COLORS: Record<TreeType, { canopy: string; healthy: string; stressed: string }> = {
  pine: { canopy: '#2E7D32', healthy: '#1B5E20', stressed: '#8D6E63' },
  oak: { canopy: '#388E3C', healthy: '#2E7D32', stressed: '#A1887F' },
  sakura: { canopy: '#F48FB1', healthy: '#F06292', stressed: '#BCAAA4' }
};

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
