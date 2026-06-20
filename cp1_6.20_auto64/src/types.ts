export type CellType = 'path' | 'empty' | 'obstacle' | 'tower_base';

export type TowerType = 'cannon' | 'laser' | 'ice';

export type MinionType = 'normal' | 'fast' | 'heavy';

export type PlayerSide = 'defender' | 'attacker' | 'spectator';

export interface MapData {
  id: string;
  name: string;
  grid: CellType[][];
  towers: TowerConfig[];
  path: { x: number; y: number }[];
  createdAt: number;
}

export interface TowerConfig {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  level: number;
}

export interface TowerStats {
  range: number;
  damage: number;
  fireRate: number;
  cost: number;
  upgradeCost: number;
}

export interface MinionData {
  id: string;
  type: MinionType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  slowEffect: number;
  pathIndex: number;
}

export interface GameState {
  roomId: string;
  defenderId: string;
  attackerId: string;
  defenderGold: number;
  attackerCrystals: number;
  minions: MinionData[];
  towers: TowerConfig[];
  projectiles: ProjectileData[];
  round: number;
  gameOver: boolean;
  winner: PlayerSide | null;
}

export interface ProjectileData {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  targetId: string;
  progress: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface Room {
  id: string;
  name: string;
  mapId: string;
  defenderId: string | null;
  attackerId: string | null;
  spectators: string[];
  status: 'waiting' | 'playing' | 'finished';
}

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  roomId: string;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  cannon: { range: 5, damage: 50, fireRate: 1, cost: 100, upgradeCost: 150 },
  laser: { range: 7, damage: 20, fireRate: 10, cost: 120, upgradeCost: 180 },
  ice: { range: 4, damage: 10, fireRate: 2, cost: 80, upgradeCost: 120 }
};

export const MINION_STATS = {
  normal: { hp: 100, speed: 1, cost: 20 },
  fast: { hp: 60, speed: 2, cost: 35 },
  heavy: { hp: 300, speed: 0.5, cost: 60 }
};

export const CELL_COLORS: Record<CellType, string> = {
  path: '#3a3a3a',
  empty: '#f0ead6',
  obstacle: '#2d4a2d',
  tower_base: '#c7956b'
};
