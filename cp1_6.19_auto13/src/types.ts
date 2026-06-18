export interface EnvironmentParams {
  light: number;
  moisture: number;
  temperature: number;
}

export interface Leaf {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
}

export interface Branch {
  id: string;
  level: number;
  startX: number;
  startY: number;
  length: number;
  targetLength: number;
  angle: number;
  targetAngle: number;
  thickness: number;
  leaves: Leaf[];
  children: Branch[];
  parentId: string | null;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  createdAt: number;
}

export interface PlantState {
  trunk: Branch;
  allBranches: Branch[];
  allLeaves: Leaf[];
  growthRate: number;
  totalBranches: number;
  leafColor: { r: number; g: number; b: number };
  fps: number;
}

export interface AppStore extends EnvironmentParams {
  obstacles: Obstacle[];
  isAddingObstacle: boolean;
  setLight: (value: number) => void;
  setMoisture: (value: number) => void;
  setTemperature: (value: number) => void;
  addObstacle: (obstacle: Obstacle) => void;
  setIsAddingObstacle: (value: boolean) => void;
  updateObstacleOpacity: (id: string, opacity: number) => void;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GROUND_HEIGHT = 20;
export const COLOR_LIGHT_YELLOW = { r: 200, g: 230, b: 201 };
export const COLOR_DARK_GREEN = { r: 46, g: 125, b: 50 };
export const COLOR_TRUNK_BROWN = '#8B4513';
export const COLOR_GROUND = '#8B4513';
export const COLOR_SKY_TOP = '#87CEEB';
export const COLOR_SKY_BOTTOM = '#98FB98';
