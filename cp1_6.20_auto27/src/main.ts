import { ParticleSystem } from './particleSystem';
import { StarField } from './starField';
import { InteractionManager } from './interaction';
import { UIPanel } from './ui';
import { ParticleType } from './particleTypes';

class Game {
  private particleCanvas: HTMLCanvasElement;
  private particleCtx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private starField: StarField;
  private interactionManager: InteractionManager;
  private uiPanel: UIPanel;
  private lastTime: number = 0;
  private fpsTime: number = 0;
  private frameCount: number = 0;
  private currentFPS: number = 60;
  private animationId: number = 0;
  private running: boolean = false;

  constructor() {
    const particleCanvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    const threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    if (!particleCanvas || !threeCanvas) {
      throw new Error('Canvas elements not found');
    }

    this.particleCanvas = particleCanvas;

    const ctx = particleCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D context not available');
    }
    this.particleCtx = ctx;

    this.resizeCanvases();

    this.particleSystem = new ParticleSystem(
      window.innerWidth,
      window.innerHeight
    );

    this.starField = new StarField(threeCanvas);

    this.interactionManager = new InteractionManager(
      particleCanvas,
      this.particleSystem,
      this.starField
    );

    this.uiPanel = new UIPanel();

    this.bindEvents();
    this.updateUI();
  }

  private resizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;

    this.particleCanvas.width = window.innerWidth * dpr;
    this.particleCanvas.height = window.innerHeight * dpr;
    this.particleCanvas.style.width = `${window.innerWidth}px`;
    this.particleCanvas.style.height = `${window.innerHeight}px`;
    this.particleCtx.scale(dpr, dpr);

    if (this.particleSystem) {
      this.particleSystem.resize(window.innerWidth, window.innerHeight);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvases();
    });

    this.interactionManager.setOnTypeChange((type: ParticleType) => {
      this.uiPanel.updateParticleType(type);
    });
  }

  private updateUI(): void {
    this.uiPanel.updateParticleCount(this.particleSystem.getParticleCount());
    this.uiPanel.updateFPS(this.currentFPS);
  }

  private update = (time: number): void => {
    if (!this.running) return;

    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    this.frameCount++;
    if (time - this.fpsTime >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = time;
      this.updateUI();
    }

    this.interactionManager.update();

    this.starField.update(deltaTime);

    this.particleSystem.update(deltaTime);

    this.particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.particleSystem.render(this.particleCtx);

    if (this.particleSystem.getParticleCount() % 10 === 0) {
      this.uiPanel.updateParticleCount(this.particleSystem.getParticleCount());
    }

    this.animationId = requestAnimationFrame(this.update);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.fpsTime = performance.now();
    this.frameCount = 0;
    this.animationId = requestAnimationFrame(this.update);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  dispose(): void {
    this.stop();
    this.interactionManager.dispose();
    this.starField.dispose();
    this.uiPanel.dispose();
  }
}

let game: Game | null = null;

function init(): void {
  try {
    game = new Game();
    game.start();
    console.log('魔法粒子沙盒已启动！');
    console.log('按键: 1-火 2-水 3-土 4-植物 5-魔法');
    console.log('操作: 左键释放粒子 · 右键平移视角 · C清空');
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { Game };
