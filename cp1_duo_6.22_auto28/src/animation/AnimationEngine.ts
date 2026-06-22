import type { SceneManager } from '../renderer/SceneManager.js';
import type { TimelineController } from './TimelineController.js';
import type { PlateData } from '../data/platesData.js';

export class AnimationEngine {
  private sceneManager: SceneManager;
  private timelineController: TimelineController;
  private platesData: PlateData[];
  private lastUpdateTime: number = 0;
  private targetFrameInterval: number = 1000 / 40;
  private animationId: number = 0;

  constructor(
    sceneManager: SceneManager,
    timelineController: TimelineController,
    platesData: PlateData[]
  ) {
    this.sceneManager = sceneManager;
    this.timelineController = timelineController;
    this.platesData = platesData;

    this.timelineController.onTimeUpdate((time) => {
      this.onTimeUpdate(time);
    });
  }

  private onTimeUpdate(time: number): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < this.targetFrameInterval) {
      return;
    }
    this.lastUpdateTime = now;

    this.sceneManager.updatePlates(this.platesData, time);
  }

  start(): void {
    this.sceneManager.updatePlates(this.platesData, this.timelineController.getCurrentTime());
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
