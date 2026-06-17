export type GameMode = 'menu' | 'single' | 'dual' | 'countdown' | 'playing' | 'gameover';

export type Difficulty = 'easy' | 'hard';

export type AIState = 'patrol' | 'attack' | 'dodge';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, vx: number, vy: number, radius: number, color: string, life: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }

  update(deltaTime: number): boolean {
    this.x += this.vx * deltaTime / 16.67;
    this.y += this.vy * deltaTime / 16.67;
    this.life -= deltaTime;
    return this.life > 0;
  }
}

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  ownerId: number;
  life: number;

  constructor(x: number, y: number, vx: number, vy: number, ownerId: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 3;
    this.color = '#ffeb3b';
    this.ownerId = ownerId;
    this.life = 3000;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): boolean {
    this.x += this.vx * deltaTime / 16.67;
    this.y += this.vy * deltaTime / 16.67;
    this.life -= deltaTime;
    
    if (this.x < -10 || this.x > canvasWidth + 10 || this.y < -10 || this.y > canvasHeight + 10) {
      return false;
    }
    
    return this.life > 0;
  }
}

export class Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  speed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 2 + 0.5;
    this.brightness = Math.random() * 0.6 + 0.4;
    this.speed = Math.random() * 1 + 0.5;
  }

  update(deltaTime: number, canvasHeight: number): void {
    this.y += this.speed * deltaTime / 16.67;
    if (this.y > canvasHeight) {
      this.y = -5;
      this.x = Math.random() * 900;
    }
  }
}

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  countdown: number;
  winner: number | null;
  finalScore: number[];
}

export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 5;
export const PLAYER_SHOOT_COOLDOWN = 250;
export const BULLET_SPEED = 10;
export const WIN_SCORE = 50;
export const HIT_SCORE = 10;
export const MAX_DELTA_TIME = 50;
export const STAR_COUNT = 120;
export const EXPLOSION_PARTICLES = 8;
export const PARTICLE_LIFETIME = 400;
export const ENGINE_PARTICLE_COUNT = 3;

export const AI_REACTION_DELAY: Record<Difficulty, number> = { easy: 300, hard: 100 };
export const AI_HIT_RATE: Record<Difficulty, number> = { easy: 0.4, hard: 0.7 };
export const AI_ATTACK_RANGE = 200;
export const AI_DODGE_RANGE = 80;

export const COLORS = {
  primary: '#00e5ff',
  secondary: '#ffeb3b',
  accent: '#ff5722',
  bulletGlow: '#ff9800',
  backgroundTop: '#0a0a2e',
  backgroundBottom: '#000011',
  buttonBg: '#1a1a3e',
  buttonHover: '#2a2a5e',
  white: '#ffffff'
};
