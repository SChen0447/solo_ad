import { SoftBody, type ShapeType, type Vec2 } from './softbody';
import { RectObstacle, CircleObstacle, type Obstacle } from './obstacle';
import { Controls } from './controls';
import { PerfMonitor } from './perfmonitor';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private heatmapCanvas: HTMLCanvasElement;
  private heatmapCtx: CanvasRenderingContext2D;
  private deformationDisplay: HTMLElement;
  private softBody!: SoftBody;
  private obstacles: Obstacle[] = [];
  private controls!: Controls;
  private perfMonitor!: PerfMonitor;
  
  private width = 0;
  private height = 0;
  private lastTime = 0;
  private animationId = 0;

  private isMouseDown = false;
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.heatmapCanvas = document.getElementById('heatmap-canvas') as HTMLCanvasElement;
    this.heatmapCtx = this.heatmapCanvas.getContext('2d')!;
    this.deformationDisplay = document.querySelector('#deformation-rate span') as HTMLElement;

    this.resize();
    this.setupScene();
    this.setupControls();
    this.bindEvents();
    this.perfMonitor = new PerfMonitor();

    this.lastTime = performance.now();
    this.loop();
  }

  private resize(): void {
    const container = document.getElementById('canvas-container')!;
    const rect = container.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  private setupScene(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    const params = {
      stiffness: 1.0,
      damping: 0.5,
      pressure: 1.0,
      gravity: { x: 0, y: 100 } as Vec2
    };

    this.softBody = new SoftBody(centerX, centerY, 'circle', 40, params);

    const rectY = this.height / 3;
    this.obstacles.push(new RectObstacle(centerX, rectY, 150, 20, '#4488ff'));

    const circleX = centerX + 80;
    const circleY = centerY + 60;
    this.obstacles.push(new CircleObstacle(circleX, circleY, 25, '#ff4444'));
  }

  private setupControls(): void {
    const initialParams = {
      shape: 'circle' as ShapeType,
      stiffness: 1.0,
      damping: 0.5,
      pressure: 1.0,
      gravity: { x: 0, y: 100 } as Vec2,
      performanceMode: false
    };

    const callbacks = {
      onShapeChange: (shape: ShapeType) => {
        this.softBody.setShape(shape);
      },
      onStiffnessChange: (value: number) => {
        this.softBody.params.stiffness = value;
      },
      onDampingChange: (value: number) => {
        this.softBody.params.damping = value;
      },
      onPressureChange: (value: number) => {
        this.softBody.params.pressure = value;
      },
      onGravityChange: (gravity: Vec2) => {
        this.softBody.params.gravity = gravity;
      },
      onPerformanceModeChange: (enabled: boolean) => {
        this.softBody.setPerformanceMode(enabled);
      }
    };

    this.controls = new Controls(callbacks, initialParams);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.updateObstaclePositions();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.isMouseDown = true;
      this.softBody.handleMouseDown(this.mouseX, this.mouseY);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      
      if (this.isMouseDown) {
        this.softBody.handleMouseMove(this.mouseX, this.mouseY);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      this.softBody.handleMouseUp();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      this.softBody.handleMouseUp();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
      this.isMouseDown = true;
      this.softBody.handleMouseDown(this.mouseX, this.mouseY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
      
      if (this.isMouseDown) {
        this.softBody.handleMouseMove(this.mouseX, this.mouseY);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.isMouseDown = false;
      this.softBody.handleMouseUp();
    });
  }

  private updateObstaclePositions(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.softBody.centerX = centerX;
    this.softBody.centerY = centerY;

    const rectY = this.height / 3;
    (this.obstacles[0] as RectObstacle).x = centerX;
    (this.obstacles[0] as RectObstacle).y = rectY;

    const circleX = centerX + 80;
    const circleY = centerY + 60;
    (this.obstacles[1] as CircleObstacle).x = circleX;
    (this.obstacles[1] as CircleObstacle).y = circleY;
  }

  private loop(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.05) dt = 0.05;

    this.update(dt);
    this.render();

    this.perfMonitor.tick();

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.controls.update(dt);

    this.softBody.update(dt);

    for (const obstacle of this.obstacles) {
      const collided = obstacle.checkCollisionWithSoftBody(this.softBody);
      if (collided) {
        this.handleCollision(obstacle);
      }
    }

    this.handleBoundaryCollision();

    const deformation = this.softBody.getDeformationRate();
    this.deformationDisplay.textContent = `${deformation.toFixed(1)}%`;

    this.softBody.drawHeatmap(this.heatmapCtx, this.heatmapCanvas.width, this.heatmapCanvas.height);
  }

  private handleCollision(_obstacle: Obstacle): void {
    let shockwaveX = 0;
    let shockwaveY = 0;
    let count = 0;

    for (const mass of this.softBody.masses) {
      const dx = mass.x - mass.oldX;
      const dy = mass.y - mass.oldY;
      const speed = Math.sqrt(dx * dx + dy * dy);
      
      if (speed > 0.5) {
        shockwaveX += mass.x;
        shockwaveY += mass.y;
        count++;
      }
    }

    if (count > 0) {
      shockwaveX /= count;
      shockwaveY /= count;
      this.softBody.addShockwave(shockwaveX, shockwaveY, 60);
    }
  }

  private handleBoundaryCollision(): void {
    const pressure = this.softBody.params.pressure;
    const margin = 3 + pressure * 5;

    for (const mass of this.softBody.masses) {
      if (mass.pinned) continue;

      if (mass.x < margin) {
        mass.x = margin;
        if (mass.oldX < mass.x) {
          mass.oldX = mass.x - (mass.x - mass.oldX) * 0.3;
        }
      }
      if (mass.x > this.width - margin) {
        mass.x = this.width - margin;
        if (mass.oldX > mass.x) {
          mass.oldX = mass.x + (mass.oldX - mass.x) * 0.3;
        }
      }
      if (mass.y < margin) {
        mass.y = margin;
        if (mass.oldY < mass.y) {
          mass.oldY = mass.y - (mass.y - mass.oldY) * 0.3;
        }
      }
      if (mass.y > this.height - margin) {
        mass.y = this.height - margin;
        if (mass.oldY > mass.y) {
          mass.oldY = mass.y + (mass.oldY - mass.y) * 0.3;
        }
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#1a2332');
    gradient.addColorStop(1, '#2a3b4c');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const obstacle of this.obstacles) {
      obstacle.draw(this.ctx);
    }

    this.softBody.draw(this.ctx);
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
