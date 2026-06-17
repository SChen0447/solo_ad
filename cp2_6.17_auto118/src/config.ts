export const GRID_SIZE = 10;
export const CELL_SIZE = 60;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

export const COLORS = {
  BACKGROUND: '#1e1e2e',
  HUD_PANEL: '#2d2d44',
  GRID_LINE: '#444',
  EMPTY_CELL: '#fff',
  PATH: '#aaa',
  OBSTACLE: '#555',
  BUILDABLE: '#00ff0044',
  UNBUILDABLE: '#ff000044',
  ARROW_TOWER: '#00cc00',
  CANNON_TOWER: '#cc0000',
  MAGIC_TOWER: '#0066ff',
  START_BTN: '#28a745',
  START_BTN_HOVER: '#1e7e34'
};

export type TowerType = 'arrow' | 'cannon' | 'magic';

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: number;
  fireRate: number;
  damage: number;
  range: number;
  color: string;
  splashRadius?: number;
  slowPercent?: number;
  slowDuration?: number;
  size: number;
  shape: 'triangle' | 'square' | 'diamond';
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    type: 'arrow',
    name: '箭塔',
    cost: 50,
    fireRate: 1,
    damage: 20,
    range: 150,
    color: '#00cc00',
    size: 10,
    shape: 'triangle'
  },
  cannon: {
    type: 'cannon',
    name: '炮塔',
    cost: 80,
    fireRate: 0.5,
    damage: 50,
    range: 120,
    color: '#cc0000',
    splashRadius: 30,
    size: 8,
    shape: 'square'
  },
  magic: {
    type: 'magic',
    name: '魔法塔',
    cost: 120,
    fireRate: 0.3,
    damage: 40,
    range: 200,
    color: '#0066ff',
    slowPercent: 0.3,
    slowDuration: 2,
    size: 12,
    shape: 'diamond'
  }
};

export const UPGRADE_DAMAGE_MULTIPLIER = 1.2;
export const UPGRADE_FIRERATE_MULTIPLIER = 1.1;
export const UPGRADE_COST_MULTIPLIER = 0.8;
export const MAX_TOWER_LEVEL = 3;
export const SELL_RETURN_RATIO = 0.5;

export type EnemyType = 'normal' | 'fast' | 'heavy' | 'boss';

export interface EnemyConfig {
  type: EnemyType;
  color: string;
  speed: number;
  health: number;
  score: number;
  size: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    type: 'normal',
    color: '#ff4444',
    speed: 2,
    health: 100,
    score: 10,
    size: 4
  },
  fast: {
    type: 'fast',
    color: '#ffdd00',
    speed: 3.5,
    health: 60,
    score: 15,
    size: 4
  },
  heavy: {
    type: 'heavy',
    color: '#aa44ff',
    speed: 1,
    health: 300,
    score: 25,
    size: 4
  },
  boss: {
    type: 'boss',
    color: '#000000',
    speed: 1.5,
    health: 1000,
    score: 100,
    size: 6
  }
};

export const INITIAL_RESOURCES = 100;
export const INITIAL_LIVES = 20;
export const TOTAL_WAVES = 10;
export const WAVE_INTERVAL_MS = 10000;
export const ENEMY_SPAWN_INTERVAL_MS = 600;

export function generateWave(waveNumber: number): EnemyType[] {
  const enemies: EnemyType[] = [];
  const baseCount = 5 + Math.floor(waveNumber * 1.5);
  const count = Math.min(baseCount, 15);

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    if (waveNumber >= 3 && rand < 0.15) {
      enemies.push('heavy');
    } else if (waveNumber >= 2 && rand < 0.35) {
      enemies.push('fast');
    } else {
      enemies.push('normal');
    }
  }

  if (waveNumber % 3 === 0 && waveNumber > 0) {
    enemies.push('boss');
  }

  return enemies;
}

export type CellType = 'empty' | 'path' | 'obstacle' | 'tower' | 'start' | 'end';

export const MAP_LAYOUT: CellType[][] = [
  ['start', 'path', 'empty', 'empty', 'obstacle', 'empty', 'empty', 'empty', 'empty', 'empty'],
  ['empty', 'path', 'empty', 'obstacle', 'empty', 'empty', 'empty', 'obstacle', 'empty', 'empty'],
  ['empty', 'path', 'path', 'path', 'path', 'empty', 'empty', 'empty', 'empty', 'empty'],
  ['empty', 'empty', 'empty', 'obstacle', 'path', 'empty', 'obstacle', 'empty', 'empty', 'empty'],
  ['empty', 'obstacle', 'empty', 'empty', 'path', 'path', 'path', 'path', 'empty', 'empty'],
  ['empty', 'empty', 'empty', 'empty', 'empty', 'obstacle', 'empty', 'path', 'empty', 'empty'],
  ['empty', 'empty', 'obstacle', 'empty', 'empty', 'empty', 'empty', 'path', 'empty', 'obstacle'],
  ['empty', 'empty', 'empty', 'empty', 'obstacle', 'empty', 'empty', 'path', 'path', 'path'],
  ['empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'obstacle', 'empty', 'empty', 'path'],
  ['empty', 'obstacle', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'end']
];

export const PATH_POINTS: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 3, y: 2 },
  { x: 4, y: 2 },
  { x: 4, y: 3 },
  { x: 4, y: 4 },
  { x: 5, y: 4 },
  { x: 6, y: 4 },
  { x: 7, y: 4 },
  { x: 7, y: 5 },
  { x: 7, y: 6 },
  { x: 7, y: 7 },
  { x: 8, y: 7 },
  { x: 9, y: 7 },
  { x: 9, y: 8 },
  { x: 9, y: 9 }
];

export function gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: gridX * CELL_SIZE + CELL_SIZE / 2,
    y: gridY * CELL_SIZE + CELL_SIZE / 2
  };
}

export function pixelToGrid(pixelX: number, pixelY: number): { x: number; y: number } {
  return {
    x: Math.floor(pixelX / CELL_SIZE),
    y: Math.floor(pixelY / CELL_SIZE)
  };
}
