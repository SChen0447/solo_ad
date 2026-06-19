export type CellType = 0 | 1 | 2;

export type EnemyType = 'normal' | 'fast' | 'heavy';

export interface WaveEnemy {
  type: EnemyType;
  count: number;
  interval: number;
}

export interface Wave {
  enemies: WaveEnemy[];
  delay: number;
}

export interface TowerConfig {
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  color: number;
  barrelColor: number;
  projectileColor: number;
  projectileSize: number;
}

export interface EnemyConfig {
  name: string;
  hp: number;
  speed: number;
  reward: number;
  color: number;
  size: number;
}

export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const CELL_SIZE = 80;
export const MAP_WIDTH = GRID_COLS * CELL_SIZE;
export const MAP_HEIGHT = GRID_ROWS * CELL_SIZE;
export const MAP_OFFSET_X = 240;
export const MAP_OFFSET_Y = 100;

export const GRID: CellType[][] = [
  [0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0],
  [1, 1, 1, 1, 1, 1, 2, 0, 0, 2, 0, 0],
  [0, 2, 0, 0, 2, 1, 0, 0, 2, 0, 0, 2],
  [0, 0, 2, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  [2, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1],
  [0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 1],
  [2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 1],
  [0, 2, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1]
];

export const PATH_POINTS: { x: number; y: number }[] = [
  { x: 0, y: 1 },
  { x: 5, y: 1 },
  { x: 5, y: 3 },
  { x: 11, y: 3 },
  { x: 11, y: 7 }
];

export const TOWER_CONFIGS: Record<string, TowerConfig> = {
  arrow: {
    name: '箭塔',
    cost: 50,
    damage: 15,
    range: 180,
    fireRate: 600,
    projectileSpeed: 600,
    color: 0x8B4513,
    barrelColor: 0x4A2511,
    projectileColor: 0xC0C0C0,
    projectileSize: 6
  },
  cannon: {
    name: '炮塔',
    cost: 120,
    damage: 60,
    range: 150,
    fireRate: 1500,
    projectileSpeed: 350,
    color: 0x5D4037,
    barrelColor: 0x3E2723,
    projectileColor: 0x212121,
    projectileSize: 10
  },
  magic: {
    name: '魔法塔',
    cost: 90,
    damage: 35,
    range: 200,
    fireRate: 900,
    projectileSpeed: 450,
    color: 0x4A148C,
    barrelColor: 0x7B1FA2,
    projectileColor: 0xE040FB,
    projectileSize: 8
  }
};

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    name: '普通兵',
    hp: 100,
    speed: 50,
    reward: 15,
    color: 0x66BB6A,
    size: 18
  },
  fast: {
    name: '快速兵',
    hp: 60,
    speed: 100,
    reward: 20,
    color: 0x29B6F6,
    size: 14
  },
  heavy: {
    name: '重甲兵',
    hp: 350,
    speed: 30,
    reward: 40,
    color: 0x78909C,
    size: 24
  }
};

export const WAVES: Wave[] = [
  {
    delay: 3000,
    enemies: [
      { type: 'normal', count: 5, interval: 1200 }
    ]
  },
  {
    delay: 8000,
    enemies: [
      { type: 'normal', count: 6, interval: 1000 },
      { type: 'fast', count: 3, interval: 800 }
    ]
  },
  {
    delay: 10000,
    enemies: [
      { type: 'fast', count: 8, interval: 700 },
      { type: 'normal', count: 5, interval: 1000 }
    ]
  },
  {
    delay: 12000,
    enemies: [
      { type: 'heavy', count: 2, interval: 2500 },
      { type: 'normal', count: 8, interval: 900 }
    ]
  },
  {
    delay: 15000,
    enemies: [
      { type: 'fast', count: 10, interval: 600 },
      { type: 'heavy', count: 3, interval: 2000 },
      { type: 'normal', count: 10, interval: 800 }
    ]
  },
  {
    delay: 18000,
    enemies: [
      { type: 'heavy', count: 5, interval: 1800 },
      { type: 'fast', count: 12, interval: 500 },
      { type: 'normal', count: 12, interval: 700 }
    ]
  }
];

export const INITIAL_GOLD = 250;
export const INITIAL_LIVES = 20;

export function gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: MAP_OFFSET_X + gridX * CELL_SIZE + CELL_SIZE / 2,
    y: MAP_OFFSET_Y + gridY * CELL_SIZE + CELL_SIZE / 2
  };
}

export function pixelToGrid(px: number, py: number): { x: number; y: number } {
  return {
    x: Math.floor((px - MAP_OFFSET_X) / CELL_SIZE),
    y: Math.floor((py - MAP_OFFSET_Y) / CELL_SIZE)
  };
}
