export class GameLoop {
  private running = false;
  private paused = false;
  private lastTime = 0;
  private fps = 60;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private animationId = 0;
  private updateFn: ((dt: number) => void) | null = null;
  private renderFn: ((fps: number, paused: boolean) => void) | null = null;

  start(
    updateFn: (dt: number) => void,
    renderFn: (fps: number, paused: boolean) => void
  ): void {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsAccumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  isPaused(): boolean {
    return this.paused;
  }

  togglePaused(): boolean {
    this.paused = !this.paused;
    if (!this.paused) {
      this.lastTime = performance.now();
    }
    return this.paused;
  }

  getFPS(): number {
    return this.paused ? 0 : this.fps;
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    if (this.paused) {
      this.lastTime = timestamp;
      if (this.renderFn) this.renderFn(0, true);
      this.animationId = requestAnimationFrame(this.loop);
      return;
    }

    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) dt = 0.001;

    this.frameCount++;
    this.fpsAccumulator += dt;
    if (this.fpsAccumulator >= 0.5) {
      this.fps = this.frameCount / this.fpsAccumulator;
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    if (this.updateFn) this.updateFn(dt);
    if (this.renderFn) this.renderFn(this.fps, false);

    this.animationId = requestAnimationFrame(this.loop);
  };
}
