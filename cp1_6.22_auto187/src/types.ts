export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export enum GamePhase {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ROOM_TRANSITION = 'room_transition',
  GAME_OVER = 'game_over',
  LEVEL_COMPLETE = 'level_complete'
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  DOOR = 2,
  TRAP = 3,
  CHEST = 4,
  SPAWN = 5
}

export enum RoomType {
  COMBAT = 'combat',
  TREASURE = 'treasure',
  REST = 'rest',
  START = 'start',
  BOSS = 'boss'
}

export enum EnemyType {
  SENTINEL = 'sentinel',
  SPIDER = 'spider',
  SPIDER_LING = 'spider_ling'
}

export enum ItemType {
  ATTACK_BOOST = 'attack_boost',
  SPEED_BOOST = 'speed_boost',
  HEAL = 'heal'
}

export enum Rating {
  S = 'S',
  A = 'A',
  B = 'B',
  C = 'C'
}

export interface Player {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  attack: number;
  speed: number;
  isStunned: boolean;
  stunEndTime: number;
  facing: 'up' | 'down' | 'left' | 'right';
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Position;
  health: number;
  maxHealth: number;
  attack: number;
  speed: number;
  isFlashing: boolean;
  flashColor: string;
  flashEndTime: number;
  attackWarning: boolean;
  attackWarningEndTime: number;
  moveDirection: Position;
  beatsSinceLastAttack: number;
}

export interface Item {
  id: string;
  type: ItemType;
  position: Position;
  isPickedUp: boolean;
  pickupAnimationProgress: number;
}

export interface Room {
  id: string;
  type: RoomType;
  grid: number[][];
  enemies: Enemy[];
  items: Item[];
  doors: Position[];
  isCleared: boolean;
  position: Position;
}

export interface DungeonMap {
  rooms: Room[][];
  currentRoom: Position;
  layoutSize: Size;
}

export interface BeatEvent {
  beatIndex: number;
  timestamp: number;
  bpm: number;
  isPerfect: boolean;
}

export interface InputEvent {
  key: string;
  timestamp: number;
  type: 'move' | 'attack';
}

export interface AttackResult {
  targetId: string;
  damage: number;
  isPerfect: boolean;
  isKilled: boolean;
}

export interface DamageEvent {
  targetId: string;
  damage: number;
  source: 'player' | 'enemy' | 'trap' | 'rhythm_miss';
  position: Position;
}

export interface GameStats {
  score: number;
  kills: number;
  perfectHits: number;
  totalHits: number;
  levelStartTime: number;
  currentLevel: number;
  rating: Rating;
}

export interface BeatData {
  bpm: number;
  beatTimes: number[];
  duration: number;
}

export type BeatCallback = (event: BeatEvent) => void;
export type DamageCallback = (event: DamageEvent) => void;
export type EnemyDeathCallback = (enemy: Enemy) => void;
export type RoomClearedCallback = (room: Room) => void;

export interface RenderCommand {
  type: 'map' | 'entity' | 'ui' | 'effect';
  data: unknown;
}

export const TILE_SIZE = 48;
export const MAP_WIDTH = 720;
export const MAP_HEIGHT = 600;
export const GRID_WIDTH = Math.floor(MAP_WIDTH / TILE_SIZE);
export const GRID_HEIGHT = Math.floor(MAP_HEIGHT / TILE_SIZE);
export const PERFECT_WINDOW = 150;
export const MISS_PENALTY_TIME = 200;
export const STUN_DURATION = 500;
export const RHYTHM_MISS_DAMAGE_PERCENT = 0.05;
export const PERFECT_DAMAGE_BONUS = 1.5;
