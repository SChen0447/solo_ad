import { SceneManager } from './SceneManager';
import { BuildingRenderer } from './BuildingRenderer';

export class AnimationLoop {
  private sceneManager: SceneManager;
  private buildingRenderer: BuildingRenderer;
  private animationId: number | null = null;
  private isRunning: boolean = false;

  constructor(sceneManager: SceneManager, buildingRenderer: BuildingRenderer) {
    this.sceneManager = sceneManager;
    this.buildingRenderer = buildingRenderer;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    this.buildingRenderer.updateLabelPosition();

    this.sceneManager.render();
  };

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
