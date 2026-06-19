export type ShipType = 'frigate' | 'destroyer' | 'cruiser';
export type Faction = 'player' | 'enemy';
export type GamePhase = 'deploy' | 'battle' | 'replay' | 'result';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Ship {
  id: string;
  type: ShipType;
  name: string;
  faction: Faction;
  hp: number;
  maxHp: number;
  attack: number;
  range: number;
  position: HexCoord | null;
  isAlive: boolean;
}

export interface ShipConfig {
  type: ShipType;
  name: string;
  hp: number;
  attack: number;
  range: number;
}

export interface AttackEvent {
  id: string;
  round: number;
  attackerId: string;
  attackerName: string;
  attackerFaction: Faction;
  targetId: string;
  targetName: string;
  damage: number;
  isKill: boolean;
  timestamp: number;
}

export interface RoundResult {
  round: number;
  events: AttackEvent[];
  playerFleet: Ship[];
  enemyFleet: Ship[];
  isGameOver: boolean;
  winner: Faction | null;
}

export interface AnimationState {
  type: 'projectile' | 'damage' | 'explosion' | 'target-highlight';
  shipId: string;
  targetId?: string;
  from?: HexCoord;
  to?: HexCoord;
  progress: number;
  startTime: number;
  duration: number;
  damage?: number;
}

export const SHIP_CONFIGS: Record<ShipType, ShipConfig> = {
  frigate: {
    type: 'frigate',
    name: '护卫舰',
    hp: 30,
    attack: 8,
    range: 2
  },
  destroyer: {
    type: 'destroyer',
    name: '驱逐舰',
    hp: 50,
    attack: 15,
    range: 3
  },
  cruiser: {
    type: 'cruiser',
    name: '巡洋舰',
    hp: 80,
    attack: 25,
    range: 4
  }
};

export const GRID_SIZE = 8;
export const MAX_LOG_ENTRIES = 30;
