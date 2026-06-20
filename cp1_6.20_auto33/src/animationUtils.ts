export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number): [number, number, number] {
  return [
    lerp(r1, r2, t),
    lerp(g1, g2, t),
    lerp(b1, b2, t)
  ];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface TweenOptions {
  duration: number;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
  easing?: (t: number) => number;
}

export class TweenManager {
  private tweens: Array<{
    startTime: number;
    duration: number;
    onUpdate: (progress: number) => void;
    onComplete?: () => void;
    easing: (t: number) => number;
    completed: boolean;
  }> = [];

  add(options: TweenOptions): void {
    this.tweens.push({
      startTime: performance.now(),
      duration: options.duration,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      easing: options.easing || easeInOutCubic,
      completed: false
    });
  }

  update(): void {
    const now = performance.now();
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tween = this.tweens[i];
      const elapsed = now - tween.startTime;
      const progress = Math.min(elapsed / tween.duration, 1);
      const easedProgress = tween.easing(progress);
      tween.onUpdate(easedProgress);
      if (progress >= 1 && !tween.completed) {
        tween.completed = true;
        if (tween.onComplete) {
          tween.onComplete();
        }
        this.tweens.splice(i, 1);
      }
    }
  }
}

export class SmoothValue {
  private current: number;
  private target: number;
  private smoothing: number;

  constructor(initial: number, smoothing: number = 0.1) {
    this.current = initial;
    this.target = initial;
    this.smoothing = smoothing;
  }

  setTarget(value: number): void {
    this.target = value;
  }

  update(): number {
    this.current = lerp(this.current, this.target, this.smoothing);
    return this.current;
  }

  getCurrent(): number {
    return this.current;
  }

  getTarget(): number {
    return this.target;
  }

  setSmoothing(smoothing: number): void {
    this.smoothing = smoothing;
  }
}

export class SmoothColor {
  private r: SmoothValue;
  private g: SmoothValue;
  private b: SmoothValue;

  constructor(r: number, g: number, b: number, smoothing: number = 0.1) {
    this.r = new SmoothValue(r, smoothing);
    this.g = new SmoothValue(g, smoothing);
    this.b = new SmoothValue(b, smoothing);
  }

  setTarget(r: number, g: number, b: number): void {
    this.r.setTarget(r);
    this.g.setTarget(g);
    this.b.setTarget(b);
  }

  update(): [number, number, number] {
    return [
      this.r.update(),
      this.g.update(),
      this.b.update()
    ];
  }

  getCurrent(): [number, number, number] {
    return [this.r.getCurrent(), this.g.getCurrent(), this.b.getCurrent()];
  }

  setSmoothing(smoothing: number): void {
    this.r.setSmoothing(smoothing);
    this.g.setSmoothing(smoothing);
    this.b.setSmoothing(smoothing);
  }
}
