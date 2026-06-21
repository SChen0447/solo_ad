export type TileType = 'wall' | 'floor' | 'door' | 'trap';

export interface Tile {
  type: TileType;
  visited: boolean;
  visible: boolean;
  hasChest?: boolean;
  chestOpened?: boolean;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Position {
  x: number;
  y: number;
}

export type ItemType = 'healthPotion' | 'fireScroll' | 'key';

export interface Item {
  type: ItemType;
  name: string;
  description: string;
  count: number;
}

export type EnemyType = 'goblin' | 'skeleton' | 'orc';

export interface EnemyData {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  roomIndex: number;
  aiState: 'patrol' | 'chase';
  patrolDirection: Position;
  lastDirChange: number;
  isHit: boolean;
  hitTime: number;
  isDying: boolean;
  deathTime: number;
  dead: boolean;
}

export interface DropItem {
  x: number;
  y: number;
  item: Item;
  time: number;
}

export type GameState = 'start' | 'playing' | 'gameover';

export interface MapData {
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface TrapEffect {
  x: number;
  y: number;
  time: number;
}

export interface FogReveal {
  x: number;
  y: number;
  radius: number;
  startTime: number;
  duration: number;
}
