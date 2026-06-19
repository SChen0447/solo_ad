import { v4 as uuidv4 } from 'uuid';

export type Direction = 'up' | 'down' | 'left' | 'right';

export type TileType = 'floor' | 'wall' | 'chest' | 'enemy' | 'player' | 'item';

export type ItemType = 'weapon' | 'armor';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  attack: number;
  defense: number;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface RoomPosition {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  visited: boolean;
  enemies: Enemy[];
  hasChest: boolean;
  chestOpened: boolean;
  items: Item[];
  walls: boolean[][];
}

export interface Player {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  inventory: Item[];
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  roomX: number;
  roomY: number;
  tileX: number;
  tileY: number;
  direction: Direction;
}

export type GameState = 'exploring' | 'battle' | 'victory' | 'gameover';

export interface BattleState {
  active: boolean;
  enemy: Enemy | null;
  playerTurn: boolean;
  log: string[];
  animation: BattleAnimation | null;
}

export interface BattleAnimation {
  type: 'playerAttack' | 'enemyAttack' | 'damageNumber';
  duration: number;
  elapsed: number;
  damage: number;
  target: 'player' | 'enemy';
}

export const ROOM_SIZE = 10;
export const GRID_SIZE = 10;
export const MAX_INVENTORY = 6;

export function createId(): string {
  return uuidv4();
}
