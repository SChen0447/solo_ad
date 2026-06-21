type RenderCallback = (deltaTime: number) => void;

class RenderLoop {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private callbacks: Map<string, RenderCallback> = new Map();
  private isRunning: boolean = false;
  private callbackIdCounter: number = 0;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  addCallback(callback: RenderCallback): string {
    const id = `callback_${this.callbackIdCounter++}`;
    this.callbacks.set(id, callback);
    return id;
  }

  removeCallback(id: string): void {
    this.callbacks.delete(id);
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.callbacks.forEach((callback) => {
      try {
        callback(deltaTime);
      } catch (error) {
        console.error('Render callback error:', error);
      }
    });

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  getIsRunning(): boolean {
    return this.isRunning;
  }

  clearAllCallbacks(): void {
    this.callbacks.clear();
  }
}

export const renderLoop = new RenderLoop();

export default renderLoop;
