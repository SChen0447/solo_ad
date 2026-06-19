export enum ShipType {
  DESTROYER = 'destroyer',
  CRUISER = 'cruiser',
  BATTLESHIP = 'battleship'
}

export enum Side {
  PLAYER = 'player',
  ENEMY = 'enemy'
}

export enum Formation {
  ARROW = 'arrow',
  LINE = 'line',
  CIRCLE = 'circle'
}

export interface Position {
  x: number;
  y: number;
}

export interface Ship {
  id: number;
  type: ShipType;
  side: Side;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  rotation: number;
  targetRotation: number;
  health: number;
  maxHealth: number;
  fireRate: number;
  lastFireTime: number;
  isSinking: boolean;
  sinkStartTime: number;
  formationOffset: Position;
  transitionStartX: number;
  transitionStartY: number;
  transitionStartTime: number;
  isTransitioning: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ownerSide: Side;
  isFocusFire: boolean;
  trail: Position[];
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
  type: 'wake' | 'explosion';
}

export interface GameState {
  currentFormation: Formation;
  isFocusFire: boolean;
  focusFireEndTime: number;
  targetShipId: number | null;
  sinkCount: number;
  gameStartTime: number;
  playerShips: Ship[];
  enemyShips: Ship[];
  projectiles: Projectile[];
  particles: Particle[];
  fleetCenterX: number;
  fleetCenterY: number;
  fleetTargetX: number;
  fleetTargetY: number;
  shatterAnimationTime: number;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const SHIP_SPEED = 80;
export const FIRE_RANGE = 150;
export const NORMAL_FIRE_RATE = 2000;
export const FOCUS_FIRE_RATE = 1000;
export const FOCUS_FIRE_DURATION = 5000;
export const FORMATION_TRANSITION_TIME = 300;
export const EXPLOSION_DURATION = 300;
export const WAKE_PARTICLE_LIFE = 1000;
export const SHIP_SINK_DURATION = 500;
export const SHATTER_ANIMATION_DURATION = 400;
export const PROJECTILE_SPEED = 250;
export const PROJECTILE_DAMAGE = 25;

export const SHIP_COLORS: Record<ShipType, string> = {
  [ShipType.DESTROYER]: '#ffd700',
  [ShipType.CRUISER]: '#4169e1',
  [ShipType.BATTLESHIP]: '#dc143c'
};

export const SHIP_SIZES: Record<ShipType, { width: number; height: number; radius: number }> = {
  [ShipType.DESTROYER]: { width: 20, height: 24, radius: 12 },
  [ShipType.CRUISER]: { width: 24, height: 28, radius: 14 },
  [ShipType.BATTLESHIP]: { width: 28, height: 32, radius: 16 }
};

export const SHIP_HEALTH: Record<ShipType, number> = {
  [ShipType.DESTROYER]: 80,
  [ShipType.CRUISER]: 120,
  [ShipType.BATTLESHIP]: 160
};

export const FORMATION_NAMES: Record<Formation, string> = {
  [Formation.ARROW]: '箭形',
  [Formation.LINE]: '线形',
  [Formation.CIRCLE]: '圆形'
};
