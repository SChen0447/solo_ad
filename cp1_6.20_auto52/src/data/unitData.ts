export enum UnitType {
  Infantry = 'infantry',
  Cavalry = 'cavalry',
  Archer = 'archer',
}

export enum Owner {
  Player = 'player',
  AI = 'ai',
}

export enum Terrain {
  Plain = 'plain',
  Mountain = 'mountain',
}

export interface UnitStats {
  type: UnitType;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  moveCost: number;
}

export interface Unit extends UnitStats {
  id: string;
  owner: Owner;
  x: number;
  y: number;
  alive: boolean;
}

export const UNIT_DEFINITIONS: Record<UnitType, Omit<UnitStats, 'hp' | 'maxHp'>> = {
  [UnitType.Infantry]: {
    type: UnitType.Infantry,
    name: '步兵',
    emoji: '⚔️',
    attack: 4,
    defense: 3,
    moveCost: 1,
  },
  [UnitType.Cavalry]: {
    type: UnitType.Cavalry,
    name: '骑兵',
    emoji: '🐴',
    attack: 5,
    defense: 2,
    moveCost: 1,
  },
  [UnitType.Archer]: {
    type: UnitType.Archer,
    name: '弓箭手',
    emoji: '🏹',
    attack: 3,
    defense: 2,
    moveCost: 1,
  },
};

export const BASE_HP = 10;

export const COUNTER_CHART: Record<UnitType, UnitType> = {
  [UnitType.Cavalry]: UnitType.Archer,
  [UnitType.Archer]: UnitType.Infantry,
  [UnitType.Infantry]: UnitType.Cavalry,
};

export const COUNTER_BONUS = 2;
export const MOUNTAIN_DEFENSE_BONUS = 1;

export const MAP_SIZE = 12;
export const CELL_SIZE = 50;

export const MOUNTAIN_POSITIONS: [number, number][] = [
  [2, 2], [3, 2], [2, 3],
  [8, 2], [9, 2], [9, 3],
  [5, 5], [6, 5], [5, 6], [6, 6],
  [2, 8], [3, 8], [2, 9],
  [8, 8], [9, 8], [9, 9],
];

export function createUnit(type: UnitType, owner: Owner, x: number, y: number, index: number): Unit {
  const def = UNIT_DEFINITIONS[type];
  return {
    id: `${owner}_${type}_${index}`,
    owner,
    x,
    y,
    alive: true,
    type: def.type,
    name: def.name,
    emoji: def.emoji,
    hp: BASE_HP,
    maxHp: BASE_HP,
    attack: def.attack,
    defense: def.defense,
    moveCost: def.moveCost,
  };
}

export function getTerrainAt(x: number, y: number): Terrain {
  return MOUNTAIN_POSITIONS.some(([mx, my]) => mx === x && my === y)
    ? Terrain.Mountain
    : Terrain.Plain;
}
