export const CELL_SIZE = 30;
export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 20;
export const CANVAS_WIDTH = GRID_WIDTH * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_HEIGHT * CELL_SIZE;

export const PLAYER_RADIUS = 8;
export const PLAYER_SPEED = 120;
export const PULSE_SPEED = 150;
export const PULSE_INITIAL_RADIUS = 8;
export const PULSE_MAX_BOUNCES = 3;
export const PULSE_BOUNCE_DECAY = 0.8;
export const PULSE_WAVE_DURATION = 1.5;
export const MAX_PULSES = 8;
export const PULSE_COOLDOWN = 0.5;

export const GUARD_SIGHT_RADIUS = 12 * CELL_SIZE;
export const GUARD_SIGHT_ANGLE = Math.PI / 2;
export const GUARD_PATROL_SPEED = 0.6 * CELL_SIZE;
export const GUARD_CHASE_SPEED = GUARD_PATROL_SPEED * 1.2;
export const GUARD_CHASE_TIMEOUT = 8;
export const GUARD_CATCH_TIMEOUT = 10;
export const GUARD_SIZE = 25;

export const TIME_LIMIT = 90;
export const COINS_PER_LEVEL = 5;

export type Vec2 = { x: number; y: number };

export type CellType = 'WALL' | 'FLOOR' | 'ENTRANCE' | 'EXIT';

export type AbilityType = 'SONIC_BOOST' | 'INVISIBILITY_CLOAK' | 'AGILITY_BOOTS';

export interface Ability {
  type: AbilityType;
  name: string;
  description: string;
  icon: string;
  used: boolean;
}

export type GameState =
  | 'MENU'
  | 'ABILITY_SELECT'
  | 'PLAYING'
  | 'LEVEL_COMPLETE'
  | 'GAME_OVER'
  | 'VICTORY';

export interface Coin {
  position: Vec2;
  collected: boolean;
  collectAnimation: number;
}

export interface GuardPath {
  points: Vec2[];
  currentIndex: number;
  progress: number;
  offset: number;
}

export type GuardState = 'PATROL' | 'ALERT' | 'CHASE' | 'SEARCHING';

export interface Guard {
  id: number;
  position: Vec2;
  angle: number;
  state: GuardState;
  path: GuardPath;
  alertTimer: number;
  chaseTimer: number;
  catchTimer: number;
  lastPositions: Vec2[];
  blinkCount: number;
}

export interface PulseWave {
  timestamp: number;
  position: Vec2;
  radius: number;
  alpha: number;
  id: number;
}

export interface Pulse {
  id: number;
  origin: Vec2;
  position: Vec2;
  direction: Vec2;
  radius: number;
  speed: number;
  intensity: number;
  bouncesRemaining: number;
  waves: PulseWave[];
  alive: boolean;
  maxRadius: number;
}

export interface Level {
  id: number;
  grid: CellType[][];
  entrance: Vec2;
  exit: Vec2;
  guardPaths: Vec2[][];
  coinPositions: Vec2[];
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pulse: boolean;
  ability: boolean;
}
