export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  id: string;
  pos: Vec2;
  prevPos: Vec2;
  mass: number;
  pinned: boolean;
  tension: number;
}

export interface SpringConstraint {
  id: string;
  p1: Particle;
  p2: Particle;
  restLength: number;
  stiffness: number;
  damping: number;
  isDiagonal?: boolean;
}

export interface Rope {
  id: string;
  particles: Particle[];
  constraints: SpringConstraint[];
  isAttachedToCloth: boolean;
  attachedClothId?: string;
  attachedParticleId?: string;
}

export interface Cloth {
  id: string;
  particles: Particle[][];
  constraints: SpringConstraint[];
  cols: number;
  rows: number;
  spacing: number;
}

export interface PhysicsWorldConfig {
  gravity: number;
  airResistance: number;
  stiffness: number;
  damping: number;
  attachmentThreshold: number;
}

export interface PhysicsWorld {
  ropes: Rope[];
  cloths: Cloth[];
  config: PhysicsWorldConfig;
  allParticles: Particle[];
  allConstraints: SpringConstraint[];
}

export type InteractionMode = 'none' | 'create-rope' | 'create-cloth' | 'drag-particle';

export interface DragState {
  isDragging: boolean;
  particle: Particle | null;
  startPos: Vec2;
  mousePos: Vec2;
}

export interface ControlPanelState {
  gravity: number;
  airResistance: number;
  stiffness: number;
}
