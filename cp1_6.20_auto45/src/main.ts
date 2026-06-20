import { StarMap } from './starMap';
import { FleetControl } from './fleetControl';
import { InvasionSystem } from './invasionSystem';
import { UIPanel } from './uiPanel';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starMap!: StarMap;
  private fleetControl!: FleetControl;
  private invasionSystem!: InvasionSystem;
  private uiPanel!: UIPanel;
  private lastTime = 0;
  private frameCount = 0;
  private fpsTime = 0;
  private fps = 0;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('找不到Canvas元素');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.init();
    requestAnimationFrame(this.loop.bind(this));
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.starMap) {
      this.starMap.resize(this.canvas.width, this.canvas.height);
    }
    if (this.uiPanel) {
      this.uiPanel.resize();
    }
  }

  private init(): void {
    this.starMap = new StarMap(this.canvas);
    this.fleetControl = new FleetControl(this.canvas, this.starMap);
    this.invasionSystem = new InvasionSystem(this.canvas, this.starMap, this.fleetControl);
    this.uiPanel = new UIPanel(this.canvas, this.starMap, this.fleetControl, this.invasionSystem);
  }

  private loop(timestamp: number): void {
    if (this.lastTime === 0) this.lastTime = timestamp;
    const deltaTime = Math.min(50, timestamp - this.lastTime);
    this.lastTime = timestamp;

    this.frameCount++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(deltaTime: number): void {
    this.starMap.update(deltaTime);
    this.fleetControl.update(deltaTime);
    this.invasionSystem.update(deltaTime);

    const totalActive = this.fleetControl.ships.length + this.invasionSystem.bullets.length + this.invasionSystem.debris.length;
    if (totalActive > 300) {
      // 限制已在各模块中处理
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.starMap.render();
    this.fleetControl.render();
    this.invasionSystem.render();
    this.uiPanel.render();

    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    this.ctx.font = '11px "Courier New", monospace';
    this.ctx.fillText(`FPS: ${this.fps}`, this.canvas.width - 60, this.canvas.height - 70);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
