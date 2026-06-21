export class PerfMonitor {
  private fpsDisplay: HTMLElement;
  private frames = 0;
  private lastTime = 0;
  private fps = 60;
  private lowFpsThreshold = 45;
  private updateInterval = 1000;

  constructor() {
    this.fpsDisplay = document.getElementById('fps-display') as HTMLElement;
    this.lastTime = performance.now();
  }

  public tick(): void {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= this.updateInterval) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.lastTime = now;
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    this.fpsDisplay.textContent = `${this.fps} FPS`;
    
    if (this.fps < this.lowFpsThreshold) {
      this.fpsDisplay.classList.add('low');
    } else {
      this.fpsDisplay.classList.remove('low');
    }
  }

  public getFPS(): number {
    return this.fps;
  }

  public isLowFPS(): boolean {
    return this.fps < this.lowFpsThreshold;
  }
}
