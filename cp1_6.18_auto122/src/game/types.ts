export interface Position {
  x: number;
  y: number;
}

export type TowerType = 'laser' | 'rocket' | 'electromagnetic';
export type EnemyType = 'scout' | 'heavy' | 'elite';
export type GameState = 'menu' | 'preparing' | 'playing' | 'paused' | 'victory' | 'defeat';
export type ProjectileType = 'laser' | 'rocket' | 'electromagnetic';

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  color: string;
  projectileType: ProjectileType;
  description: string;
}

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  health: number;
  speed: number;
  reward: number;
  damage: number;
  color: string;
  hasShield?: boolean;
  shieldHealth?: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  position: Position;
  gridX: number;
  gridY: number;
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFireTime: number;
  targetId: string | null;
  angle: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  path: Position[];
  reward: number;
  damage: number;
  hasShield: boolean;
  shieldHealth: number;
  maxShieldHealth: number;
}

export interface Projectile {
  id: string;
  type: ProjectileType;
  position: Position;
  targetId: string;
  targetPosition: Position;
  damage: number;
  speed: number;
  color: string;
  isActive: boolean;
}

export interface Particle {
  id: string;
  position: Position;
  velocity: Position;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface GameStats {
  totalKills: number;
  maxCombo: number;
  currentCombo: number;
  totalGoldEarned: number;
  totalDamageDealt: number;
  comboTimer: number;
}

export interface WaveConfig {
  waveNumber: number;
  enemyCount: number;
  enemyTypes: EnemyType[];
  spawnInterval: number;
}

export interface GridCell {
  x: number;
  y: number;
  isOccupied: boolean;
  isPath: boolean;
}

export interface FloatingText {
  id: string;
  text: string;
  position: Position;
  color: string;
  life: number;
  maxLife: number;
  velocity: Position;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  laser: {
    type: 'laser',
    name: '激光炮',
    cost: 100,
    damage: 25,
    range: 150,
    fireRate: 500,
    color: '#4fc3f7',
    projectileType: 'laser',
    description: '高射速单体攻击',
  },
  rocket: {
    type: 'rocket',
    name: '火箭炮',
    cost: 200,
    damage: 60,
    range: 120,
    fireRate: 1500,
    color: '#ff7043',
    projectileType: 'rocket',
    description: '范围爆炸伤害',
  },
  electromagnetic: {
    type: 'electromagnetic',
    name: '电磁炮',
    cost: 350,
    damage: 40,
    range: 100,
    fireRate: 800,
    color: '#7c4dff',
    projectileType: 'electromagnetic',
    description: '连锁电弧伤害',
  },
};

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  scout: {
    type: 'scout',
    name: '侦查兵',
    health: 80,
    speed: 1.8,
    reward: 15,
    damage: 1,
    color: '#66bb6a',
  },
  heavy: {
    type: 'heavy',
    name: '重甲兵',
    health: 250,
    speed: 0.8,
    reward: 35,
    damage: 2,
    color: '#8d6e63',
  },
  elite: {
    type: 'elite',
    name: '精英兵',
    health: 180,
    speed: 1.2,
    reward: 50,
    damage: 1,
    color: '#ab47bc',
    hasShield: true,
    shieldHealth: 100,
  },
};

export const CELL_SIZE = 50;
export const GRID_COLS = 16;
export const GRID_ROWS = 10;
export const MAX_WAVES = 15;
export const PREP_TIME = 30;
export const INITIAL_GOLD = 300;
export const INITIAL_LIVES = 20;
export const MAX_PARTICLES = 30;
export const MAX_ENEMIES = 40;
export const COMBO_TIMEOUT = 2000;
