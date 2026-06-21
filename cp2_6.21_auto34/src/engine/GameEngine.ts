import type { GameElement, GameState, AABB } from '../types';
import { getElementAABB, aabbIntersect, resolveCollision, clamp } from '../utils/helpers';

export type FrameCallback = (state: GameState) => void;

export class GameEngine {
  private elements: GameElement[] = [];
  private isRunning = false;
  private isPaused = false;
  private score = 0;
  private fps = 0;
  private selectedElementId: string | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private onFrameCallback: FrameCallback | null = null;
  private canvasWidth = 800;
  private canvasHeight = 600;
  private scriptContexts: Map<string, any> = new Map();

  constructor() {}

  setElements(elements: GameElement[]): void {
    this.elements = elements.map((el) => ({
      ...el,
      physics: { ...el.physics }
    }));
  }

  getElements(): GameElement[] {
    return this.elements;
  }

  setSelectedElementId(id: string | null): void {
    this.selectedElementId = id;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  onFrame(callback: FrameCallback): void {
    this.onFrameCallback = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.scriptContexts.clear();
    this.elements.forEach((el) => {
      this.scriptContexts.set(el.id, { t: 0 });
    });
    this.loop();
  }

  pause(): void {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    this.emitState();
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.emitState();
  }

  getScore(): number {
    return this.score;
  }

  setScore(s: number): void {
    this.score = s;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  updateElement(id: string, props: Partial<GameElement>): void {
    const idx = this.elements.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.elements[idx] = { ...this.elements[idx], ...props };
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (!this.isPaused) {
      this.step(delta);
    }

    this.emitState();
  };

  private step(delta: number): void {
    const dt = delta * 60;

    for (const el of this.elements) {
      const ctx = this.scriptContexts.get(el.id) || { t: 0 };
      ctx.t += delta;
      this.scriptContexts.set(el.id, ctx);

      if (el.physics.enabled && !el.physics.isStatic) {
        el.physics.vy += el.physics.gravity * dt;
        el.physics.vx *= 1 - el.physics.friction * dt;
        el.x += el.physics.vx * dt;
        el.y += el.physics.vy * dt;
      }

      if (el.script && el.script.trim()) {
        try {
          const fn = new Function(
            'element',
            'ctx',
            'engine',
            'delta',
            `'use strict';\n${el.script}`
          );
          const engineApi = {
            addScore: (n: number) => (this.score += n),
            setScore: (n: number) => (this.score = n),
            getScore: () => this.score,
            getElement: (id: string) => this.elements.find((e) => e.id === id),
            getAllElements: () => this.elements,
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight
          };
          fn(el, ctx, engineApi, delta);
        } catch (e) {
          // silent script error
        }
      }
    }

    for (let i = 0; i < this.elements.length; i++) {
      for (let j = i + 1; j < this.elements.length; j++) {
        const a = this.elements[i];
        const b = this.elements[j];
        if (!a.physics.enabled || !b.physics.enabled) continue;
        if (a.physics.isStatic && b.physics.isStatic) continue;

        if (aabbIntersect(getElementAABB(a), getElementAABB(b))) {
          const { dx, dy } = resolveCollision(a, b);

          if (!a.physics.isStatic) {
            a.x -= dx * 2;
            a.y -= dy * 2;
            if (dx !== 0) {
              a.physics.vx = -a.physics.vx * a.physics.bounciness;
            }
            if (dy !== 0) {
              a.physics.vy = -a.physics.vy * a.physics.bounciness;
            }
          }
          if (!b.physics.isStatic) {
            b.x += dx * 2;
            b.y += dy * 2;
            if (dx !== 0) {
              b.physics.vx = -b.physics.vx * b.physics.bounciness;
            }
            if (dy !== 0) {
              b.physics.vy = -b.physics.vy * b.physics.bounciness;
            }
          }
        }
      }
    }

    for (const el of this.elements) {
      if (!el.physics.enabled || el.physics.isStatic) continue;
      const box = getElementAABB(el);
      if (box.minX < 0) {
        el.x += -box.minX;
        el.physics.vx = -el.physics.vx * el.physics.bounciness;
      }
      if (box.maxX > this.canvasWidth) {
        el.x -= box.maxX - this.canvasWidth;
        el.physics.vx = -el.physics.vx * el.physics.bounciness;
      }
      if (box.minY < 0) {
        el.y += -box.minY;
        el.physics.vy = -el.physics.vy * el.physics.bounciness;
      }
      if (box.maxY > this.canvasHeight) {
        el.y -= box.maxY - this.canvasHeight;
        el.physics.vy = -el.physics.vy * el.physics.bounciness;
      }
    }
  }

  private emitState(): void {
    if (this.onFrameCallback) {
      this.onFrameCallback({
        elements: this.elements.map((el) => ({
          ...el,
          physics: { ...el.physics }
        })),
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        score: this.score,
        fps: this.fps,
        selectedElementId: this.selectedElementId
      });
    }
  }
}
