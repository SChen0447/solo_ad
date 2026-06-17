import { MAX_DELTA_TIME } from './types';

export class GameLoop {
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private animationId: number | null = null;
  private isRunning: boolean = false;
  
  private updateCallbacks: Array<(deltaTime: number) => void> = [];
  private renderCallbacks: Array<(ctx: CanvasRenderingContext2D) => void> = [];
  
  private ctx: CanvasRenderingContext2D;
  
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }
  
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.loop(this.lastTime);
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  addUpdateCallback(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.push(callback);
  }
  
  addRenderCallback(callback: (ctx: CanvasRenderingContext2D) => void): void {
    this.renderCallbacks.push(callback);
  }
  
  getFps(): number {
    return this.currentFps;
  }
  
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;
    
    const deltaTime = this.calculateDeltaTime(currentTime);
    this.updateFps(deltaTime);
    
    for (const callback of this.updateCallbacks) {
      callback(deltaTime);
    }
    
    for (const callback of this.renderCallbacks) {
      callback(this.ctx);
    }
    
    this.lastTime = currentTime;
    this.animationId = requestAnimationFrame(this.loop);
  };
  
  private calculateDeltaTime(currentTime: number): number {
    let deltaTime = currentTime - this.lastTime;
    if (deltaTime > MAX_DELTA_TIME) {
      deltaTime = MAX_DELTA_TIME;
    }
    return deltaTime;
  }
  
  private updateFps(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;
    
    if (this.fpsTime >= 1000) {
      this.currentFps = Math.round(this.frameCount * 1000 / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }
}
