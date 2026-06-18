export type FragmentColor = 'red' | 'blue' | 'green';

export interface Vec2 {
  x: number;
  y: number;
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
}

export interface Star {
  x: number;
  y: number;
  brightness: number;
  flickerSpeed: number;
  flickerOffset: number;
  color: string;
}

export interface DifficultyConfig {
  level: number;
  fragmentSpawnInterval: number;
  asteroidSpawnInterval: number;
  asteroidSpeed: number;
  maxFragments: number;
  maxAsteroids: number;
}

export const CANVAS_W = 400;
export const CANVAS_H = 600;
export const FRAGMENT_RADIUS = 6;
export const ASTEROID_SIZE = 15;
export const PLAYER_SIZE = 14;
export const PLAYER_SPEED = 200;
