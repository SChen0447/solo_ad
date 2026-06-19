export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  id: string;
  position: Vec2;
  previousPosition: Vec2;
  velocity: Vec2;
  mass: number;
  pinned: boolean;
  trail: Vec2[];
}

export interface Spring {
  id: string;
  p1: string;
  p2: string;
  restLength: number;
  stiffness: number;
  type: 'structural' | 'shear' | 'bend';
  tension: number;
}

export interface CollisionBall {
  id: string;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  color: string;
}

export interface Shockwave {
  id: string;
  position: Vec2;
  radius: number;
  maxRadius: number;
  duration: number;
  startTime: number;
}

export interface PhysicsConfig {
  gravity: number;
  stiffness: number;
  damping: number;
  groundY: number;
  worldWidth: number;
  worldHeight: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 9.8,
  stiffness: 50,
  damping: 0.98,
  groundY: 0,
  worldWidth: 800,
  worldHeight: 600,
};
