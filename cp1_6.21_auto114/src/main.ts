import { ElementManager } from './ElementManager';
import { Renderer } from './Renderer';
import { UIOverlay } from './UIOverlay';
import { ElementType, ELEMENT_INFO, GRID_WIDTH, GRID_HEIGHT } from './type';

class SandboxGame {
  private canvas: HTMLCanvasElement;
  private elementManager: ElementManager;
  private renderer: Renderer;
  private uiOverlay: UIOverlay;
  private selectedElement: ElementType = ElementType.SAND;
  private isMouseDown: boolean = false;
  private isRightMouseDown: boolean = false;
  private lastTime: number = 0;
  private fpsUpdateTime: number = 0;
  private frameCount: number = 0;
  private currentFPS: number = 60;
  private cursorPos: { x: number; y: number } | null = null;
  private animationId: number | null = null;

  constructor() {
    this.canvas = this.createCanvas();
    this.elementManager = new ElementManager();
    this.renderer = new Renderer(this.canvas);
    this.uiOverlay = new UIOverlay((type) => this.handleElementSelect(type));

    this.setupEventListeners();
    this.startGameLoop();
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = 'sandbox-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.cursor = 'crosshair';
    canvas.style.zIndex = '1';
    document.body.appendChild(canvas);
    return canvas;
  }

  private handleElementSelect(type: ElementType): void {
    if (type === ElementType.EMPTY) {
      this.elementManager.clearGrid();
    } else {
      this.selectedElement = type;
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    if (e.button === 0) {
      this.isMouseDown = true;
      this.placeElement(e.clientX, e.clientY);
    } else if (e.button === 2) {
      this.isRightMouseDown = true;
      this.removeElement(e.clientX, e.clientY);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
      this.cursorPos = pos;
    } else {
      this.cursorPos = null;
    }

    if (this.isMouseDown) {
      this.placeElement(e.clientX, e.clientY);
    } else if (this.isRightMouseDown) {
      this.removeElement(e.clientX, e.clientY);
    }
  }

  private handleMouseUp(): void {
    this.isMouseDown = false;
    this.isRightMouseDown = false;
  }

  private placeElement(screenX: number, screenY: number): void {
    const pos = this.renderer.screenToGrid(screenX, screenY);
    if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
      this.elementManager.setElement(pos.x, pos.y, this.selectedElement);
    }
  }

  private removeElement(screenX: number, screenY: number): void {
    const pos = this.renderer.screenToGrid(screenX, screenY);
    if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
      this.elementManager.setElement(pos.x, pos.y, ElementType.EMPTY);
    }
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      if (this.lastTime === 0) {
        this.lastTime = timestamp;
      }

      const deltaTime = Math.min(timestamp - this.lastTime, 50);
      this.lastTime = timestamp;

      this.update(deltaTime);
      this.render(deltaTime);

      this.frameCount++;
      if (timestamp - this.fpsUpdateTime >= 1000) {
        this.currentFPS = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = timestamp;
        this.uiOverlay.updateFPS(this.currentFPS);
        this.uiOverlay.updateCounts(this.elementManager.getElementCounts());
      }

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    const updateStart = performance.now();
    this.elementManager.update(deltaTime);
    const updateTime = performance.now() - updateStart;

    if (updateTime > 8) {
      console.warn(`Grid update took ${updateTime.toFixed(2)}ms (target: <=8ms)`);
    }
  }

  private render(deltaTime: number): void {
    const renderStart = performance.now();

    const grid = this.elementManager.getGrid();
    const ripples = this.elementManager.getRipples();
    const particles = this.elementManager.getParticles();

    this.renderer.render(grid, ripples, particles, deltaTime);

    if (this.cursorPos) {
      const info = ELEMENT_INFO[this.selectedElement];
      this.renderer.drawCursor(this.cursorPos.x, this.cursorPos.y, info.color);
    }

    const renderTime = performance.now() - renderStart;

    if (renderTime > 4) {
      console.warn(`Render took ${renderTime.toFixed(2)}ms (target: <=4ms)`);
    }
  }

  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.uiOverlay.destroy();
    this.canvas.remove();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SandboxGame();
});
