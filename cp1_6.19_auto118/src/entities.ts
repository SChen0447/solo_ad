import type { CoralColor } from './config';

export interface Vec2 {
  x: number;
  y: number;
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export type EntityType =
  | 'player'
  | 'coral'
  | 'submarine'
  | 'shipwreck'
  | 'treasure'
  | 'oxygenBubble'
  | 'plankton'
  | 'particle'
  | 'floatText';

export interface PlayerObject extends BaseEntity {
  type: 'player';
  vx: number;
  vy: number;
  oxygen: number;
  angle: number;
}

export interface CoralReef extends BaseEntity {
  type: 'coral';
  color: CoralColor;
  baseSize: number;
  wavePhase: number;
}

export interface Wreck extends BaseEntity {
  type: 'submarine' | 'shipwreck';
  rotation: number;
  wavePhase: number;
}

export interface TreasureChest extends BaseEntity {
  type: 'treasure';
  isOpen: boolean;
  openingProgress: number;
  openStartTime: number;
}

export interface OxygenBubble extends BaseEntity {
  type: 'oxygenBubble';
  vy: number;
  pulsePhase: number;
}

export interface PlanktonGroup extends BaseEntity {
  type: 'plankton';
  particles: Array<{
    offsetX: number;
    offsetY: number;
    phase: number;
    size: number;
  }>;
}

export interface Particle extends BaseEntity {
  type: 'particle';
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface FloatText extends BaseEntity {
  type: 'floatText';
  text: string;
  color: string;
  life: number;
  maxLife: number;
  startY: number;
}

export type GameEntity =
  | PlayerObject
  | CoralReef
  | Wreck
  | TreasureChest
  | OxygenBubble
  | PlanktonGroup
  | Particle
  | FloatText;

export interface GameState {
  isRunning: boolean;
  isGameOver: boolean;
  coins: number;
  explorePercent: number;
  elapsedTime: number;
  exploredCells: Set<string>;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  interactPressed: boolean;
  joystickActive: boolean;
  joystickX: number;
  joystickY: number;
}
