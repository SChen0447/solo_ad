export enum CellType {
  Empty = 'empty',
  Normal = 'normal',
  Accelerator = 'accelerator',
  Decelerator = 'decelerator',
  Bouncer = 'bouncer',
  Portal = 'portal',
  MovingPlatform = 'moving_platform',
  Start = 'start',
  Goal = 'goal',
  Wall = 'wall'
}

export interface CellColor {
  fill: string;
  border: string;
  glow: string;
}

export const CELL_COLORS: Record<CellType, CellColor> = {
  [CellType.Empty]: { fill: 'transparent', border: 'rgba(255,255,255,0.05)', glow: 'transparent' },
  [CellType.Normal]: { fill: 'rgba(100, 255, 218, 0.08)', border: 'rgba(100, 255, 218, 0.3)', glow: '#64ffda' },
  [CellType.Accelerator]: { fill: 'rgba(100, 150, 255, 0.25)', border: 'rgba(100, 180, 255, 0.6)', glow: '#4a9eff' },
  [CellType.Decelerator]: { fill: 'rgba(255, 80, 100, 0.25)', border: 'rgba(255, 100, 120, 0.6)', glow: '#ff5064' },
  [CellType.Bouncer]: { fill: 'rgba(255, 160, 60, 0.3)', border: 'rgba(255, 180, 80, 0.7)', glow: '#ffa03c' },
  [CellType.Portal]: { fill: 'rgba(184, 41, 240, 0.3)', border: 'rgba(200, 80, 255, 0.7)', glow: '#b829f0' },
  [CellType.MovingPlatform]: { fill: 'rgba(180, 180, 200, 0.3)', border: 'rgba(200, 200, 220, 0.6)', glow: '#b4b4c8' },
  [CellType.Start]: { fill: 'rgba(100, 255, 218, 0.4)', border: 'rgba(100, 255, 218, 0.9)', glow: '#64ffda' },
  [CellType.Goal]: { fill: 'rgba(255, 215, 0, 0.4)', border: 'rgba(255, 215, 0, 0.9)', glow: '#ffd700' },
  [CellType.Wall]: { fill: 'rgba(80, 80, 100, 0.9)', border: 'rgba(100, 100, 120, 1)', glow: '#646478' }
};

export const CELL_NAMES: Record<CellType, string> = {
  [CellType.Empty]: '空地',
  [CellType.Normal]: '普通地面',
  [CellType.Accelerator]: '加速跑道',
  [CellType.Decelerator]: '减速带',
  [CellType.Bouncer]: '弹跳板',
  [CellType.Portal]: '传送门',
  [CellType.MovingPlatform]: '移动平台',
  [CellType.Start]: '起始点',
  [CellType.Goal]: '终点',
  [CellType.Wall]: '墙壁'
};

export const CELL_DESCRIPTIONS: Record<CellType, string> = {
  [CellType.Empty]: '小球无法停留',
  [CellType.Normal]: '标准地面格子',
  [CellType.Accelerator]: '蓝色 - 给小球施加额外加速度（1.5x/2x/3x）',
  [CellType.Decelerator]: '红色 - 对小球产生阻力，降低速度',
  [CellType.Bouncer]: '橙色 - 将小球弹起，可调节弹跳高度',
  [CellType.Portal]: '紫色 - 成对出现，将小球传送到配对位置',
  [CellType.MovingPlatform]: '灰色 - 沿固定路径推动小球移动',
  [CellType.Start]: '小球出发位置',
  [CellType.Goal]: '到达即通关',
  [CellType.Wall]: '不可通过的障碍物'
};

export interface Cell {
  type: CellType;
  intensity: number;
  portalPairId?: string;
  platformPath?: { x: number; y: number }[];
  platformSpeed?: number;
}

export interface CellPosition {
  col: number;
  row: number;
}

export interface LevelData {
  cols: number;
  rows: number;
  cellSize: number;
  grid: (Cell | null)[][];
  gravity: number;
  friction: number;
  minSteps: number;
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  isAirborne: boolean;
  bounceCount: number;
  teleporting: boolean;
  teleportProgress: number;
  teleportFrom?: { x: number; y: number };
  teleportTo?: { x: number; y: number };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface FadeOutCell {
  col: number;
  row: number;
  scale: number;
  alpha: number;
  type: CellType;
}

export type EditorMode = 'place' | 'delete';
export type GameMode = 'editor' | 'testing';
