export type PlayerId = string;
export type UnitId = string;
export type HexCoord = { q: number; r: number };

export type UnitType = 'base' | 'miner' | 'tower';
export type MineState = 'idle' | 'traveling_to_mine' | 'mining' | 'returning';

export interface Player {
  id: PlayerId;
  name: string;
  gold: number;
  color: string;
}

export interface Base {
  id: UnitId;
  playerId: PlayerId;
  position: HexCoord;
  level: number;
  hp: number;
  maxHp: number;
}

export interface Miner {
  id: UnitId;
  playerId: PlayerId;
  position: HexCoord;
  targetMineId: UnitId | null;
  state: MineState;
  carryingGold: number;
  hp: number;
  maxHp: number;
}

export interface Tower {
  id: UnitId;
  playerId: PlayerId;
  position: HexCoord;
  hp: number;
  maxHp: number;
  damage: number;
  lastAttackTime: number;
}

export interface GoldMine {
  id: UnitId;
  position: HexCoord;
  ownerId: PlayerId | null;
  occupationStart: number | null;
  goldPerSecond: number;
}

export interface Projectile {
  id: UnitId;
  from: HexCoord;
  to: HexCoord;
  damage: number;
  targetId: UnitId;
  targetPlayerId: PlayerId;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'combat' | 'build' | 'victory';
}

export interface GameState {
  roomId: string;
  players: Record<PlayerId, Player>;
  bases: Record<UnitId, Base>;
  miners: Record<UnitId, Miner>;
  towers: Record<UnitId, Tower>;
  mines: Record<UnitId, GoldMine>;
  projectiles: Record<UnitId, Projectile>;
  logs: LogEntry[];
  status: 'waiting' | 'playing' | 'finished';
  winner: PlayerId | null;
  gridSize: number;
  lastUpdate: number;
}

export const COSTS = {
  BASE_UPGRADE: 200,
  MINER: 150,
  TOWER: 100,
};

export const STATS = {
  BASE_HP: 500,
  MINER_HP: 50,
  TOWER_HP: 150,
  TOWER_DAMAGE: 50,
  TOWER_RANGE: 2,
  TOWER_ATTACK_INTERVAL: 1000,
  MINER_CARRY_CAPACITY: 5,
  MINE_GOLD_PER_SECOND: 10,
  MINING_TIME: 2000,
  MINER_SPEED: 0.002,
  OCCUPATION_TIME: 30000,
};
