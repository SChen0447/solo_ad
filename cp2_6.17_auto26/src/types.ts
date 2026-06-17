export type MaterialType = 'wood' | 'iron' | 'glass' | 'explosive' | 'launcher';

export interface BlockData {
  id: string;
  material: MaterialType;
  x: number;
  y: number;
  width: number;
  height: number;
  energy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'debris' | 'spark' | 'shard' | 'droplet' | 'explosion';
  shape: 'circle' | 'polygon';
  points?: number[][];
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

export interface SimulationStats {
  totalCollisions: number;
  maxTransferDistance: number;
  energyLossRate: number;
  destroyedCount: number;
}

export interface MaterialConfig {
  color: string;
  strokeColor: string;
  iconColor: string;
  weight: number;
  restitution: number;
  friction: number;
  density: number;
  label: string;
  width: number;
  height: number;
}
