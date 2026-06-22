export type ShipType = 'fighter' | 'frigate' | 'command';
export type FormationType = 'triangle' | 'wedge' | 'column';
export type Team = 'player' | 'enemy';

export interface ShipStats {
  speed: number;
  maxHealth: number;
  damage: number;
  attackRange: number;
  attackSpeed: number;
  size: number;
}

export interface ShipConfig {
  type: ShipType;
  team: Team;
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionPair {
  a: string;
  b: string;
}

export interface AttackEffect {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
  team: Team;
  type: 'laser' | 'projectile';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  team: Team | 'system';
}

export interface BattleStats {
  totalHealth: number;
  aliveUnits: number;
  dps: number;
}

export interface GameStats {
  player: BattleStats;
  enemy: BattleStats;
  startTime: number;
  playerKills: number;
  enemyKills: number;
}

export const SHIP_STATS: Record<ShipType, ShipStats> = {
  fighter: { speed: 4, maxHealth: 50, damage: 10, attackRange: 150, attackSpeed: 0.5, size: 12 },
  frigate: { speed: 2.5, maxHealth: 150, damage: 25, attackRange: 200, attackSpeed: 1, size: 18 },
  command: { speed: 1.5, maxHealth: 300, damage: 40, attackRange: 250, attackSpeed: 1.5, size: 24 }
};

export const SHIP_NAMES: Record<ShipType, string> = {
  fighter: '战斗机',
  frigate: '护卫舰',
  command: '指挥舰'
};

export const FORMATION_NAMES: Record<FormationType, string> = {
  triangle: '三角形',
  wedge: '雁形',
  column: '纵队'
};
