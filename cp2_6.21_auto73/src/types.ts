/**
 * types.ts - 全局类型定义与常量模块
 * 
 * 职责：
 *  - 定义所有模块共用的数据接口（Point/Unit/Tower/Bullet/Particle/GameState等）
 *  - 定义格子类型枚举（CellType）和路径算法节点（PathNode）
 *  - 导出全局常量：网格尺寸(GRID_COLS/GRID_ROWS/CELL_SIZE)
 *  - 导出颜色常量(COLORS)，确保各模块配色一致
 * 
 * 本文件不包含任何逻辑实现，仅作为各模块间的"契约"存在
 * 所有模块均从此文件导入需要的类型和常量，避免循环依赖
 */

export interface Point {
  x: number;
  y: number;
}

export interface GridCell {
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
}

export type CellType = 'empty' | 'obstacle' | 'path' | 'start' | 'end' | 'tower';

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export interface Unit {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  isDead: boolean;
  reachedEnd: boolean;
  hitFlashTime: number;
  colorTween: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  targetId: number;
  targetX: number;
  targetY: number;
  hasTarget: boolean;
  speed: number;
  damage: number;
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  color: string;
}

export interface Tower {
  id: number;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  range: number;
  damage: number;
  fireRate: number;
  lastFireTime: number;
  level: number;
  isSelected: boolean;
  fadeOutTime: number;
  isRemoving: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  isRunning: boolean;
  isGameOver: boolean;
  wave: number;
  score: number;
  lives: number;
  enemiesRemaining: number;
  waveInProgress: boolean;
}

export const GRID_COLS = 15;
export const GRID_ROWS = 10;
export const CELL_SIZE = 60;
export const CANVAS_WIDTH = GRID_COLS * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE;

export const COLORS = {
  background: '#111827',
  gridLine: '#1F2937',
  obstacle: '#4B5563',
  path: '#3B82F680',
  pathHighlight: '#60A5FA',
  start: '#10B981',
  end: '#EF4444',
  towerOuter: '#374151',
  towerInner: '#60A5FA',
  towerRange: '#93C5FD33',
  towerRangeSelected: '#93C5FD55',
  towerUpgraded: '#F59E0B',
  unit: '#DC2626',
  unitHealthBg: '#E5E7EB',
  unitHealthGreen: '#10B981',
  unitHealthRed: '#EF4444',
  bullet: '#FBBF24',
  text: '#D1D5DB',
  textLight: '#F9FAFB',
  textMuted: '#9CA3AF',
  score: '#34D399'
};
