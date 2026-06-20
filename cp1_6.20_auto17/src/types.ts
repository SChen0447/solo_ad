// ============================================================
// 文件间调用关系与数据流向：
//
// main.ts (游戏主类)
//   ├──> mapGrid.ts (地图网格)         ← 提供网格信息、障碍物数据
//   ├──> pathFinder.ts (路径规划)       ← 接收障碍物/权重 → 返回路径
//   ├──> decisionTree.ts (决策树)       ← 接收炮塔布局 → 返回路径权重
//   ├──> towerManager.ts (炮塔管理)     ← 接收网格信息 → 返回炮塔数据
//   ├──> enemyManager.ts (敌人管理)     ← 接收路径点 → 返回敌人位置
//   ├──> renderer.ts (渲染模块)         ← 接收所有数据 → 绘制到Canvas
//   └──> eventHandler.ts (事件模块)     ← 接收用户输入 → 传递游戏指令
//
// 数据流向：
// 用户操作 → eventHandler → main → towerManager (放置/升级炮塔)
//                                    ↓
//                           mapGrid (更新障碍物)
//                                    ↓
//                           decisionTree (分析薄弱区)
//                                    ↓
//                           pathFinder (A*计算新路径)
//                                    ↓
//                           enemyManager (敌人移动)
//                                    ↓
//                           renderer (渲染画面)
// ============================================================

export type TowerType = 'arrow' | 'magic' | 'cannon';

export type EnemyType = 'normal' | 'fast' | 'heavy';

export interface Position {
  x: number;
  y: number;
}

export interface GridPos {
  gx: number;
  gy: number;
}

export interface TowerConfig {
  name: string;
  cost: number;
  damage: number[];
  range: number[];
  attackSpeed: number[];
  color: string;
  projectileColor: string;
  aoeRadius?: number;
}

export interface Tower {
  id: number;
  type: TowerType;
  gridPos: GridPos;
  pixelPos: Position;
  level: number;
  cooldown: number;
  targetId: number | null;
  totalCost: number;
}

export interface EnemyConfig {
  name: string;
  hp: number;
  speed: number;
  armor: number;
  reward: number;
  damage: number;
  color: string;
  size: number;
  preferDense: boolean;
}

export interface Enemy {
  id: number;
  type: EnemyType;
  pos: Position;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  reward: number;
  damage: number;
  pathIndex: number;
  path: Position[];
  slowTimer: number;
  alive: boolean;
}

export interface Projectile {
  id: number;
  fromPos: Position;
  toPos: Position;
  progress: number;
  damage: number;
  color: string;
  targetId: number;
  type: TowerType;
  aoeRadius: number;
}

export interface Particle {
  id: number;
  pos: Position;
  velocity: Position;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RippleEffect {
  id: number;
  pos: Position;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export interface WaveEnemy {
  type: EnemyType;
  count: number;
  interval: number;
}

export interface WaveConfig {
  enemies: WaveEnemy[];
}

export interface PathWeightMap {
  [key: string]: number;
}

export interface GameState {
  wave: number;
  hp: number;
  maxHp: number;
  gold: number;
  isWaveActive: boolean;
  isGameOver: boolean;
  selectedTowerType: TowerType | null;
  selectedTowerId: number | null;
}

export const GRID_SIZE = 40;
export const GRID_COLS = 36;
export const GRID_ROWS = 22;
export const CANVAS_WIDTH = GRID_COLS * GRID_SIZE;
export const CANVAS_HEIGHT = GRID_ROWS * GRID_SIZE;

export const START_GRID: GridPos = { gx: 0, gy: Math.floor(GRID_ROWS / 2) };
export const END_GRID: GridPos = { gx: GRID_COLS - 1, gy: Math.floor(GRID_ROWS / 2) };

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    name: '箭塔',
    cost: 50,
    damage: [15, 25, 40],
    range: [120, 140, 160],
    attackSpeed: [0.6, 0.5, 0.4],
    color: '#4ade80',
    projectileColor: '#86efac'
  },
  magic: {
    name: '魔法塔',
    cost: 100,
    damage: [30, 50, 80],
    range: [150, 170, 190],
    attackSpeed: [1.0, 0.85, 0.7],
    color: '#a855f7',
    projectileColor: '#c084fc'
  },
  cannon: {
    name: '重炮塔',
    cost: 150,
    damage: [60, 100, 160],
    range: [100, 120, 140],
    attackSpeed: [1.8, 1.5, 1.2],
    color: '#f97316',
    projectileColor: '#fdba74',
    aoeRadius: 60
  }
};

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    name: '普通',
    hp: 80,
    speed: 60,
    armor: 0,
    reward: 10,
    damage: 1,
    color: '#4ade80',
    size: 12,
    preferDense: false
  },
  fast: {
    name: '快速',
    hp: 50,
    speed: 120,
    armor: 0,
    reward: 15,
    damage: 1,
    color: '#fb923c',
    size: 10,
    preferDense: false
  },
  heavy: {
    name: '重甲',
    hp: 250,
    speed: 35,
    armor: 8,
    reward: 30,
    damage: 2,
    color: '#ef4444',
    size: 16,
    preferDense: true
  }
};

export function generateWave(waveNumber: number): WaveConfig {
  const baseCount = 5 + Math.floor(waveNumber * 1.5);
  const enemies: WaveEnemy[] = [];

  enemies.push({ type: 'normal', count: baseCount, interval: 0.8 });

  if (waveNumber >= 2) {
    enemies.push({ type: 'fast', count: Math.floor(baseCount * 0.5), interval: 0.5 });
  }

  if (waveNumber >= 3) {
    enemies.push({ type: 'heavy', count: Math.floor(waveNumber * 0.4) + 1, interval: 1.5 });
  }

  if (waveNumber >= 5) {
    enemies[0].count = Math.floor(baseCount * 1.5);
    enemies.forEach(e => e.count = Math.floor(e.count * 1.2));
  }

  return { enemies };
}

export function getUpgradeCost(tower: Tower): number {
  if (tower.level >= 3) return -1;
  return Math.floor(TOWER_CONFIGS[tower.type].cost * (0.8 + tower.level * 0.4));
}

export function getSellValue(tower: Tower): number {
  return Math.floor(tower.totalCost * 0.6);
}

export function gridToPixel(gridPos: GridPos): Position {
  return {
    x: gridPos.gx * GRID_SIZE + GRID_SIZE / 2,
    y: gridPos.gy * GRID_SIZE + GRID_SIZE / 2
  };
}

export function pixelToGrid(pixelPos: Position): GridPos {
  return {
    gx: Math.floor(pixelPos.x / GRID_SIZE),
    gy: Math.floor(pixelPos.y / GRID_SIZE)
  };
}

export function distance(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function gridKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

export function parseGridKey(key: string): GridPos {
  const [gx, gy] = key.split(',').map(Number);
  return { gx, gy };
}
