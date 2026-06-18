export interface Particle {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
  mass: number;
  tension: number;
}

export interface SpringConstraint {
  p1: number;
  p2: number;
  restLength: number;
  stiffness: number;
  type: 'structural' | 'shear' | 'bend';
}

export interface Rope {
  id: string;
  particles: Particle[];
  constraints: SpringConstraint[];
}

export interface Cloth {
  id: string;
  particles: Particle[];
  constraints: SpringConstraint[];
  gridSize: number;
  width: number;
  height: number;
}

export interface Attachment {
  ropeId: string;
  ropeParticleIndex: number;
  clothId: string;
  clothParticleIndex: number;
}

export interface PhysicsWorld {
  ropes: Rope[];
  cloths: Cloth[];
  attachments: Attachment[];
  gravity: number;
  airResistance: number;
  elasticity: number;
  damping: number;
}

export interface PhysicsParams {
  gravity: number;
  airResistance: number;
  elasticity: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CreateMode = 'none' | 'rope-first' | 'cloth-dragging';

export interface DraggedInfo {
  particle: Particle;
  parent: Rope | Cloth;
  parentType: 'rope' | 'cloth';
  parentId: string;
  particleIndex: number;
  offsetX: number;
  offsetY: number;
}

export const PARTICLE_SPACING = 10;
export const DAMPING = 0.98;
export const ATTACHMENT_THRESHOLD = 30;
export const CONSTRAINT_ITERATIONS = 8;
export const CLOTH_GRID_SIZE = 10;
