export type EnemyType = 'infantry' | 'cavalry' | 'siege';
export type TowerType = 'archer' | 'catapult' | 'magic';

export interface Point {
  x: number;
  y: number;
}

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  damage: number;
  reward: number;
  color: string;
  size: number;
}

export interface TowerConfig {
  type: TowerType;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  color: string;
  splash?: number;
  slow?: number;
  slowDuration?: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  infantry: {
    type: 'infantry',
    hp: 100,
    speed: 0.5,
    damage: 10,
    reward: 15,
    color: '#8B4513',
    size: 18
  },
  cavalry: {
    type: 'cavalry',
    hp: 60,
    speed: 1.2,
    damage: 8,
    reward: 20,
    color: '#4A4A4A',
    size: 22
  },
  siege: {
    type: 'siege',
    hp: 500,
    speed: 0.2,
    damage: 50,
    reward: 80,
    color: '#654321',
    size: 35
  }
};

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  archer: {
    type: 'archer',
    cost: 100,
    damage: 15,
    range: 280,
    fireRate: 600,
    projectileSpeed: 8,
    color: '#228B22'
  },
  catapult: {
    type: 'catapult',
    cost: 200,
    damage: 40,
    range: 320,
    fireRate: 2000,
    projectileSpeed: 4,
    color: '#8B4513',
    splash: 60
  },
  magic: {
    type: 'magic',
    cost: 350,
    damage: 60,
    range: 260,
    fireRate: 1200,
    projectileSpeed: 6,
    color: '#9932CC',
    slow: 0.5,
    slowDuration: 2000
  }
};
