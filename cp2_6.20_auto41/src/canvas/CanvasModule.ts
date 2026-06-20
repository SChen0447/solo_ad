import SceneRenderer from './SceneRenderer';
import { SceneData, parseKeywords } from '../store/types';

export default class CanvasModule {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: SceneRenderer;
  private animationFrameId: number | null = null;
  private currentSceneData: SceneData | null = null;
  private fadeAlpha: number = 1.0;
  private isTransitioning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.renderer = new SceneRenderer();
  }

  renderScene(storyText: string, theme: string): void {
    const newSceneData = parseKeywords(storyText, theme);

    if (!this.currentSceneData) {
      this.currentSceneData = newSceneData;
      this.fadeAlpha = 1.0;
      this.startAnimationLoop();
      return;
    }

    this.isTransitioning = true;
    const fadeOutStart = performance.now();

    const fadeOut = (now: number) => {
      const elapsed = now - fadeOutStart;
      this.fadeAlpha = Math.max(0.0, 1.0 - elapsed / 500);
      if (elapsed < 500) {
        requestAnimationFrame(fadeOut);
      } else {
        this.fadeAlpha = 0.0;
        this.ctx.save();
        this.ctx.globalAlpha = 1.0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        this.currentSceneData = newSceneData;
        const fadeInStart = performance.now();

        const fadeIn = (now: number) => {
          const elapsed = now - fadeInStart;
          this.fadeAlpha = Math.min(1.0, elapsed / 500);
          if (elapsed < 500) {
            requestAnimationFrame(fadeIn);
          } else {
            this.fadeAlpha = 1.0;
            this.isTransitioning = false;
          }
        };

        requestAnimationFrame(fadeIn);
      }
    };

    requestAnimationFrame(fadeOut);
  }

  startAnimationLoop(): void {
    let frame = 0;
    const loop = () => {
      frame++;
      if (this.currentSceneData) {
        this.ctx.save();
        this.ctx.globalAlpha = this.fadeAlpha;
        this.renderer.renderScene(this.ctx, this.currentSceneData, frame);
        this.ctx.restore();
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  dispose(): void {
    this.stopAnimationLoop();
    this.currentSceneData = null;
    this.fadeAlpha = 1.0;
    this.isTransitioning = false;
  }
}
