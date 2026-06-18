export type ElementType = 'fire' | 'ice' | 'lightning';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Position;
  health: number;
  maxHealth: number;
  currentForm: ElementType;
  formLevels: Record<ElementType, number>;
  fragments: Record<ElementType, number>;
  formCooldown: number;
  formCooldownMax: number;
  skillCooldown: number;
  skillCooldownMax: number;
  auraRotation: number;
  facingAngle: number;
}

export interface Fireball {
  id: number;
  position: Position;
  velocity: Velocity;
  radius: number;
  damage: number;
  range: number;
  traveled: number;
}

export interface IceWall {
  id: number;
  position: Position;
  width: number;
  height: number;
  duration: number;
  maxDuration: number;
  angle: number;
}

export interface Lightning {
  id: number;
  start: Position;
  end: Position;
  segments: Position[];
  duration: number;
  maxDuration: number;
  damage: number;
}

export interface Explosion {
  id: number;
  position: Position;
  radius: number;
  maxRadius: number;
  duration: number;
  maxDuration: number;
}

export interface EnemyState {
  id: number;
  position: Position;
  element: ElementType;
  color: string;
  frozen: boolean;
  frozenTimer: number;
  flashing: boolean;
  flashTimer: number;
  flashCount: number;
  active: boolean;
  wobbleTimer: number;
  wobbleInterval: number;
  wobbleOffset: number;
  wobblePhase: number;
  speedBoostTimer: number;
  speedBoostCooldown: number;
  isSpeedBoosted: boolean;
}

export interface Fragment {
  id: number;
  position: Position;
  element: ElementType;
  color: string;
  collected: boolean;
}

export interface GameState {
  player: PlayerState;
  enemies: EnemyState[];
  fragments: Fragment[];
  fireballs: Fireball[];
  iceWalls: IceWall[];
  lightnings: Lightning[];
  explosions: Explosion[];
  score: number;
  kills: number;
  gameTime: number;
  enemySpawnTimer: number;
  nextSpawnTime: number;
  maxEnemies: number;
  keys: Set<string>;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  screenWidth: number;
  screenHeight: number;
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff4500',
  ice: '#00bfff',
  lightning: '#ffff00'
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  ice: '冰',
  lightning: '雷'
};

export const RANDOM_COLORS: string[] = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
  '#00b894', '#e17055', '#74b9ff', '#55efc4'
];
