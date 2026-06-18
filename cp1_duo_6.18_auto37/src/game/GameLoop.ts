import { useGameStore } from '../state/gameStore';

const LOW_FPS_THRESHOLD = 45;
const FPS_SAMPLE_INTERVAL = 0.5;

export class GameLoop {
  private fpsAccum = 0;
  private fpsFrames = 0;
  private fpsDisplay = 60;
  private fpsTimer = 0;

  updateFps(dt: number): void {
    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= FPS_SAMPLE_INTERVAL) {
      this.fpsDisplay = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
      console.log(`FPS: ${this.fpsDisplay}`);
    }

    const store = useGameStore.getState();
    this.fpsAccum += dt;
    const lowFps = this.fpsDisplay < LOW_FPS_THRESHOLD && this.fpsAccum > 2;
    store.setLowFps(lowFps);
  }

  getFps(): number {
    return this.fpsDisplay;
  }
}
