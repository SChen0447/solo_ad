export type Grid = number[][];

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  direction: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  inertiaTime: number;
}

export interface FragmentState {
  id: number;
  x: number;
  y: number;
  rotation: number;
  rotationSpeed: number;
  collected: boolean;
  scale: number;
  disappearing: boolean;
  disappearTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface CollisionResult {
  wallHit: boolean;
  collectedFragment: FragmentState | null;
}

export interface GameState {
  grid: Grid;
  player: PlayerState;
  fragments: FragmentState[];
  particles: Particle[];
  level: number;
  collectedCount: number;
  totalFragments: number;
  elapsedTime: number;
  fps: number;
  resetAnimation: number;
  exitOpen: boolean;
  startPosition: Position;
  endPosition: Position;
  cellSize: number;
  mazeOffsetX: number;
  mazeOffsetY: number;
}

export const COLORS = {
  BACKGROUND: '#0f172a',
  WALL: '#1a365d',
  GRID_LINE: '#e2e8f0',
  PLAYER_CENTER: '#ffffff',
  PLAYER_EDGE: 'rgba(255, 255, 255, 0)',
  FRAGMENT: '#fbbf24',
  FRAGMENT_GLOW: 'rgba(251, 191, 36, 0.5)',
  PROGRESS_START: '#1a365d',
  PROGRESS_END: '#fbbf24',
  UI_TEXT: '#e2e8f0',
  FPS_TEXT: '#38b2ac',
  BUTTON_BG: '#2d3748',
  BUTTON_HOVER: '#4a5568',
} as const;

export const CONFIG = {
  MAZE_SIZE: 10,
  CELL_SIZE: 50,
  PLAYER_SPEED: 200,
  INERTIA_TIME: 0.15,
  PLAYER_RADIUS: 20,
  LIGHT_RADIUS: 60,
  FRAGMENT_SIZE: 16,
  FRAGMENT_ROTATION_SPEED: 4 * Math.PI,
  PARTICLE_RADIUS: 2,
  PARTICLE_LIFE: 0.8,
  PARTICLE_MAX_COUNT: 60,
  COLLECT_ANIMATION_TIME: 0.3,
  FRAGMENT_COLLECT_DISTANCE: 20,
  TOTAL_FRAGMENTS: 8,
} as const;
