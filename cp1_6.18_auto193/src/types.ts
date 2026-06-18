export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  id: string;
  landmarks: HandLandmark[];
  timestamp: number;
}

export type DrumType = 'kick' | 'snare' | 'tom' | 'hihat' | 'crash';

export type DrumShape = 'circle' | 'ellipse' | 'rect';

export interface DrumZone {
  id: DrumType;
  name: string;
  shape: DrumShape;
  x: number;
  y: number;
  width: number;
  height: number;
  gradient: string[];
  strokeColor: string;
  hasMetalRing?: boolean;
  hasRayTexture?: boolean;
}

export type VelocityLevel = '弱' | '中' | '强';

export interface HitRecord {
  id: string;
  drumId: DrumType;
  drumName: string;
  timestamp: number;
  velocity: VelocityLevel;
  velocityValue: number;
  hitX: number;
  hitY: number;
}

export interface DrumState {
  isHit: boolean;
  hitTime: number;
  rippleStartRadius: number;
  brightness: number;
}

export interface RippleAnimation {
  id: string;
  drumId: DrumType;
  x: number;
  y: number;
  startTime: number;
  startRadius: number;
  maxRadius: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  opacity: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export type EventType = 'handData' | 'drumHit' | 'handLost';

export interface HandDataEvent {
  type: 'handData';
  data: HandData[];
}

export interface DrumHitEvent {
  type: 'drumHit';
  data: {
    drumId: DrumType;
    velocity: number;
    hitX: number;
    hitY: number;
    timestamp: number;
  };
}

export type AppEvent = HandDataEvent | DrumHitEvent;

export type EventCallback = (event: AppEvent) => void;

export interface AudioDeviceState {
  initialized: boolean;
  muted: boolean;
}

export interface GestureState {
  isInitializing: boolean;
  isInitialized: boolean;
  error: string | null;
}
