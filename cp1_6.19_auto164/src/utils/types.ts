export interface ParticleData {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  color: string;
  mass: number;
  radius: number;
}

export interface PhysicsConfig {
  gravity: number;
  friction: number;
  restitution: number;
}

export interface EmitConfig {
  rate: number;
  radius: number;
}

export interface SandboxConfig {
  width: number;
  height: number;
  depth: number;
}
