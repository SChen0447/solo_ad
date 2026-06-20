export type GameState = 'title' | 'playing' | 'paused' | 'win' | 'lose';

export interface BeatEvent {
  time: number;
  bpm: number;
  intensity: number;
}

export interface MazeCell {
  x: number;
  z: number;
}

export interface MazeData {
  width: number;
  height: number;
  walls: MazeCell[];
  passages: MazeCell[];
  startPos: { x: number; z: number };
}

export interface PlayerState {
  position: { x: number; z: number };
  lives: number;
  radius: number;
  isHit: boolean;
  hitTimer: number;
  invincibleTimer: number;
}

export interface Obstacle {
  id: number;
  position: { x: number; z: number };
  direction: { x: number; z: number };
  speed: number;
  baseSpeed: number;
  radius: number;
  life: number;
}

export interface EnergyCore {
  id: number;
  position: { x: number; z: number };
  collected: boolean;
  pulsePhase: number;
}

export interface Particle {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  color: string;
}

export interface DustParticle {
  position: { x: number; y: number; z: number };
  baseY: number;
  phase: number;
  speed: number;
  size: number;
}

export type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export const WALL_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF'];
export const PLAYER_RADIUS = 0.5;
export const OBSTACLE_RADIUS = 0.3;
export const CORE_RADIUS = 0.35;
export const CELL_SIZE = 1;
export const WALL_HEIGHT = 1.5;
export const INITIAL_LIVES = 3;
export const PLAYER_SPEED = 4;
export const BASE_OBSTACLE_SPEED = 0.15;
export const DUST_PARTICLE_COUNT = 300;
export const MAX_PARTICLES = 500;
