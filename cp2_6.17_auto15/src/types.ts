export type GameState = 'menu' | 'carSelect' | 'trackSelect' | 'racing' | 'garage' | 'raceEnd';

export type CarModel = 'redLightning' | 'blueGale' | 'greenHawk';
export type TrackType = 'circuit' | 'mountain' | 'snow';
export type SpoilerType = 'normal' | 'turbo' | 'rocket';
export type TireType = 'road' | 'drift' | 'rain';

export interface Car {
  x: number;
  y: number;
  angle: number;
  tiltAngle: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  steeringSpeed: number;
  maxSteerAngle: number;
  currentSteerAngle: number;
  grip: number;
  friction: number;
  width: number;
  height: number;
  color: string;
  baseColor: string;
  model: CarModel;
  spoiler: SpoilerType;
  tire: TireType;
  isDrifting: boolean;
  driftTime: number;
  boostTimer: number;
  boostMultiplier: number;
  warningTimer: number;
  slideInertiaTimer: number;
  driftTiltAtEnd: number;
  isColliding: boolean;
  flashTimer: number;
  flashPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface Track {
  type: TrackType;
  length: number;
  width: number;
  segments: TrackSegment[];
  bgColor: string;
  frictionMultiplier: number;
  checkpoints: number[];
}

export interface TrackSegment {
  start: number;
  end: number;
  type: 'straight' | 'curve' | 'uphill' | 'downhill';
  radius?: number;
  direction?: 1 | -1;
}

export interface CarStats {
  topSpeed: number;
  acceleration: number;
  handling: number;
  grip: number;
}

export interface PlayerProfile {
  selectedCar: CarModel;
  carColor: string;
  spoiler: SpoilerType;
  tire: TireType;
  bestLapTime: Record<TrackType, number | null>;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shift: boolean;
}

export interface RaceResult {
  lapTime: number;
  maxSpeed: number;
  perfectDriftCount: number;
}

export interface BackgroundElement {
  x: number;
  y: number;
  type: 'mountain' | 'tree' | 'cloud';
  width: number;
  height: number;
  color: string;
}

export interface UIButton {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  action: string;
  pressed: boolean;
  pressTimer: number;
  visible: boolean;
}
