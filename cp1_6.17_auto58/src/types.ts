export const TILE = {
  EMPTY: 0,
  WALL: 1,
  DOOR: 2,
  VENT: 3,
  START: 4,
  GOAL: 5,
} as const;

export const FLOOR = {
  STONE: 0,
  CARPET: 1,
} as const;

export const AI_STATE = {
  PATROL: 'patrol',
  CHASE: 'chase',
  ALERT: 'alert',
} as const;

export type AIState = typeof AI_STATE[keyof typeof AI_STATE];

export interface Vec2 {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  zone: number;
  cx: number;
  cy: number;
}

export interface Door {
  x: number;
  y: number;
  open: boolean;
  animProgress: number;
}

export interface Vent {
  x: number;
  y: number;
}

export interface MapData {
  size: number;
  grid: number[][];
  floorType: number[][];
  rooms: Room[];
  doors: Door[];
  vents: Vent[];
  start: Vec2 | null;
  goal: Vec2 | null;
}

export interface AIAgent {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  state: AIState;
  patrolPoints: Vec2[];
  patrolIndex: number;
  path: Vec2[];
  target: Vec2 | null;
  alertTimer: number;
  showAlert: number;
  facing: number;
}

export interface Player {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  health: number;
  stamina: number;
  exposure: number;
  facing: number;
  velocity: Vec2;
}

export interface AudioSource {
  id: string;
  type: 'footstep' | 'door' | 'vent';
  x: number;
  y: number;
  floorType?: number;
  state?: AIState;
  volume: number;
  timestamp: number;
}

export interface GameState {
  map: MapData | null;
  player: Player;
  ais: AIAgent[];
  explored: boolean[][];
  lastKnownAIPositions: Map<number, Vec2>;
  audioSources: AudioSource[];
  isAlertActive: boolean;
  alertPulse: number;
  nearestDoor: Door | null;
  gameTime: number;
  running: boolean;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
}
