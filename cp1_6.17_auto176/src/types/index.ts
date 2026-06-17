export type TerrainType = 'plain' | 'forest' | 'hill' | 'river' | 'city';

export type UnitType = 'infantry' | 'tank' | 'artillery';

export type Faction = 'blue' | 'red';

export type EngagementBehavior = 'attack' | 'flank' | 'ignore';

export interface HexCoord {
  q: number;
  r: number;
}

export interface TerrainHex {
  q: number;
  r: number;
  terrain: TerrainType;
}

export interface Unit {
  id: string;
  type: UnitType;
  faction: Faction;
  q: number;
  r: number;
  hp: number;
  maxHp: number;
  attack: number;
  range: number;
  moveCost: number;
  behavior: EngagementBehavior;
  isDestroyed?: boolean;
}

export interface MovePath {
  unitId: string;
  waypoints: HexCoord[];
}

export interface AttackEvent {
  attackerId: string;
  targetId: string;
  damage: number;
  turn: number;
}

export interface TurnState {
  turn: number;
  units: Unit[];
  attacks: AttackEvent[];
  destroyedThisTurn: Unit[];
}

export interface SimulationResult {
  turns: TurnState[];
  winner: Faction | 'draw' | null;
  totalTurns: number;
}

export interface UnitStats {
  [key: string]: {
    hp: number;
    attack: number;
    range: number;
    moveCost: number;
  };
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  plain: '#C8E6C9',
  forest: '#1B5E20',
  hill: '#795548',
  river: '#1565C0',
  city: '#607D8B',
};

export const TERRAIN_MOVE_COST: Record<TerrainType, number> = {
  plain: 1,
  forest: 2,
  hill: 2,
  river: 3,
  city: 1,
};

export const UNIT_STATS: UnitStats = {
  infantry: { hp: 100, attack: 15, range: 1, moveCost: 2 },
  tank: { hp: 200, attack: 40, range: 2, moveCost: 3 },
  artillery: { hp: 80, attack: 50, range: 3, moveCost: 4 },
};

export const FACTION_COLORS: Record<Faction, string> = {
  blue: '#1565C0',
  red: '#D32F2F',
};

export const UNIT_COLORS: Record<UnitType, string> = {
  infantry: '#607D8B',
  tank: '#33691E',
  artillery: '#B71C1C',
};
