import { CellScene } from './scene/CellScene';
import { CellController } from './control/CellController';

class App {
  private scene: CellScene;
  private controller: CellController;
  private frameId: number = 0;
  private fpsCounter: { frames: number; lastTime: number; display: number } = {
    frames: 0,
    lastTime: performance.now(),
    display: 0
  };

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new CellScene(container);
    this.controller = new CellController(this.scene, container);

    this.hideLoading();

    this.startLoop();

    console.log('[Cell3D] 初始化完成');
    console.log('[Cell3D] 三角形数量:', this.scene.getTriangleCount());
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('fade-out');
        setTimeout(() => {
          loading.style.display = 'none';
        }, 500);
      }, 400);
    }
  }

  private startLoop(): void {
    const loop = () => {
      this.frameId = requestAnimationFrame(loop);

      this.scene.update();
      this.controller.update();
      this.scene.render();

      this.fpsCounter.frames++;
      const now = performance.now();
      if (now - this.fpsCounter.lastTime >= 1000) {
        this.fpsCounter.display = this.fpsCounter.frames;
        this.fpsCounter.frames = 0;
        this.fpsCounter.lastTime = now;
      }
    };

    loop();
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.scene.dispose();
  }
}

let app: App | null = null;

function bootstrap(): void {
  if (app) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      app = new App();
    });
  } else {
    app = new App();
  }
}

if (typeof window !== 'undefined') {
  (window as any).cellApp = {
    start: bootstrap,
    getApp: () => app
  };
  bootstrap();
}

export { App, bootstrap };
export default App;
