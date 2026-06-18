import type {
  Shape,
  AnimationTrack,
  ShapeState,
  EasingType,
  AnimationType,
} from './types';

export function interpolate(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (easing === 'linear') return clamped;
  return clamped < 0.5
    ? 2 * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

function getStartValue(shape: Shape, type: AnimationType): number {
  switch (type) {
    case 'translate':
      return shape.initialX;
    case 'rotate':
      return shape.initialRotation;
    case 'scale':
      return shape.initialScale;
  }
}

export function computeShapeStateAtTime(
  shape: Shape,
  tracks: AnimationTrack[],
  time: number
): ShapeState {
  const state: ShapeState = {
    x: shape.initialX,
    y: shape.initialY,
    rotation: shape.initialRotation,
    scale: shape.initialScale,
  };

  const shapeTracks = tracks.filter((t) => t.shapeId === shape.id && t.isActive);
  for (const track of shapeTracks) {
    if (time < track.startTime) continue;
    const localT = Math.min(1, (time - track.startTime) / track.duration);
    const progress = interpolate(localT, track.easing);
    const startVal = getStartValue(shape, track.type);
    const delta = track.endValue - startVal;
    const value = startVal + delta * progress;

    switch (track.type) {
      case 'translate':
        state.x = value;
        state.y = shape.initialY + delta * progress;
        break;
      case 'rotate':
        state.rotation = value;
        break;
      case 'scale':
        state.scale = value;
        break;
    }
  }

  return state;
}

export function computeAllStatesAtTime(
  shapes: Shape[],
  tracks: AnimationTrack[],
  time: number
): Record<string, ShapeState> {
  const result: Record<string, ShapeState> = {};
  for (const shape of shapes) {
    result[shape.id] = computeShapeStateAtTime(shape, tracks, time);
  }
  return result;
}

export interface AnimationLoopOptions {
  onTick: (time: number) => void;
  onStop?: () => void;
}

export class AnimationLoop {
  private rafId: number | null = null;
  private lastTime: number = 0;
  private currentTime: number = 0;
  private duration: number = 10;
  private speed: number = 1;
  private isRunning: boolean = false;
  private options: AnimationLoopOptions;

  constructor(options: AnimationLoopOptions) {
    this.options = options;
  }

  setDuration(d: number) {
    this.duration = d;
    if (this.currentTime > d) this.currentTime = d;
  }

  setSpeed(s: number) {
    this.speed = s;
  }

  setCurrentTime(t: number) {
    this.currentTime = Math.max(0, Math.min(this.duration, t));
    this.options.onTick(this.currentTime);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  pause() {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  reset() {
    this.pause();
    this.currentTime = 0;
    this.options.onTick(0);
  }

  private loop = () => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.currentTime += dt * this.speed;

    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.options.onTick(this.currentTime);
      this.pause();
      this.options.onStop?.();
      return;
    }

    this.options.onTick(this.currentTime);
    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy() {
    this.pause();
  }
}

export function getTotalDuration(tracks: AnimationTrack[]): number {
  if (tracks.length === 0) return 10;
  const maxEnd = Math.max(...tracks.map((t) => t.startTime + t.duration));
  return Math.max(5, Math.ceil(maxEnd + 1));
}
