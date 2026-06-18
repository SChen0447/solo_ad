import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FISH_COUNT,
  JELLYFISH_COUNT,
  TURTLE_COUNT,
  FISH_RADIUS,
  JELLYFISH_RADIUS,
  TURTLE_RADIUS,
  BG_COLOR_TOP,
  BG_COLOR_BOTTOM,
  GlobalParams,
} from './config.js';
import { Environment } from './environment.js';
import { Fish, Jellyfish, Turtle } from './entities.js';
import { UI } from './ui.js';

class OceanSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private env: Environment;
  private fishes: Fish[] = [];
  private jellyfishes: Jellyfish[] = [];
  private turtles: Turtle[] = [];
  private ui: UI;
  private params: GlobalParams;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFps: number = 60;
  private time: number = 0;
  private bgGradient: CanvasGradient;
  private animFrameId: number = 0;
  private maxSpeedEMA: number = 1;
  private maxTurnRateEMA: number = 0.1;
  private readonly EMA_WINDOW: number = 300;
  private readonly EMA_ALPHA: number = 2 / (300 + 1);

  constructor() {
    this.canvas = document.getElementById('ocean') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.env = new Environment();

    this.params = {
      fishSeparation: FISH_COUNT > 0 ? 35 : 35,
      fishMaxSpeed: 3,
      jellyfishDensity: JELLYFISH_COUNT,
      turtleCount: TURTLE_COUNT,
    };

    this.ui = new UI((p) => this.onParamsChanged(p));

    this.bgGradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    this.bgGradient.addColorStop(0, BG_COLOR_TOP);
    this.bgGradient.addColorStop(1, BG_COLOR_BOTTOM);

    this.spawnEntities();
    this.setupEvents();
    this.loop(0);
  }

  private spawnEntities(): void {
    this.fishes = [];
    for (let i = 0; i < FISH_COUNT; i++) {
      const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
      this.fishes.push(new Fish(x, y));
    }

    this.jellyfishes = [];
    for (let i = 0; i < this.params.jellyfishDensity; i++) {
      const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
      this.jellyfishes.push(new Jellyfish(x, y));
    }

    this.turtles = [];
    for (let i = 0; i < this.params.turtleCount; i++) {
      const x = 100 + Math.random() * (CANVAS_WIDTH - 200);
      const y = 100 + Math.random() * (CANVAS_HEIGHT - 200);
      this.turtles.push(new Turtle(x, y));
    }
  }

  private onParamsChanged(params: GlobalParams): void {
    const oldJellyCount = this.params.jellyfishDensity;
    const oldTurtleCount = this.params.turtleCount;

    this.params = { ...params };

    if (params.jellyfishDensity !== oldJellyCount) {
      while (this.jellyfishes.length < params.jellyfishDensity) {
        const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
        const y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
        this.jellyfishes.push(new Jellyfish(x, y));
      }
      while (this.jellyfishes.length > params.jellyfishDensity) {
        this.jellyfishes.pop();
      }
    }

    if (params.turtleCount !== oldTurtleCount) {
      while (this.turtles.length < params.turtleCount) {
        const x = 100 + Math.random() * (CANVAS_WIDTH - 200);
        const y = 100 + Math.random() * (CANVAS_HEIGHT - 200);
        this.turtles.push(new Turtle(x, y));
      }
      while (this.turtles.length > params.turtleCount) {
        this.turtles.pop();
      }
    }
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (this.ui.handleMouseDown(mx, my)) return;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (this.ui.handleMouseMove(mx, my)) return;

      let found = false;
      for (const t of this.turtles) {
        if (!t || typeof t !== 'object' || !t.pos) continue;
        const dx = mx - t.pos.x;
        const dy = my - t.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < TURTLE_RADIUS * 1.5) {
          const patrol = (typeof t.getPatrolProgress === 'function') ? t.getPatrolProgress() : 'N/A';
          const lastCatch = (typeof t.getTimeSinceLastCatch === 'function') ? t.getTimeSinceLastCatch() : 'N/A';
          const catches = typeof t.catchCount === 'number' ? t.catchCount : 0;
          const details: string[] = [];
          details.push(`捕获: ${catches}条鱼`);
          details.push(`巡逻: ${patrol}`);
          details.push(`上次捕食: ${lastCatch}`);
          this.ui.setTooltipDetails(mx, my, '海龟', details);
          found = true;
          break;
        }
      }
      if (!found) {
        for (const f of this.fishes) {
          if (!f || !f.alive || typeof f !== 'object' || !f.pos) continue;
          const dx = mx - f.pos.x;
          const dy = my - f.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < FISH_RADIUS * 2) {
            const speedVal = (typeof f.getSpeed === 'function') ? f.getSpeed() : NaN;
            const speed = isFinite(speedVal) ? speedVal.toFixed(2) : '0.00';
            const neighborsVal = (typeof f.getNearestNeighborCount === 'function') ? f.getNearestNeighborCount(this.fishes) : 0;
            const neighbors = isFinite(neighborsVal) ? neighborsVal : 0;
            const details: string[] = [];
            details.push(`速度: ${speed}px/帧`);
            details.push(`邻居: ${neighbors}只`);
            this.ui.setTooltipDetails(mx, my, '小鱼', details);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        for (const j of this.jellyfishes) {
          if (!j || typeof j !== 'object' || !j.pos) continue;
          const dx = mx - j.pos.x;
          const dy = my - j.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < JELLYFISH_RADIUS * 1.5) {
            const pulseVal = (typeof j.getPulsePhasePercent === 'function') ? j.getPulsePhasePercent() : NaN;
            const pulse = isFinite(pulseVal) ? Math.round(pulseVal) : 0;
            const depthVal = (typeof j.getDepth === 'function') ? j.getDepth() : NaN;
            const depth = isFinite(depthVal) ? Math.round(depthVal) : 0;
            const details: string[] = [];
            details.push(`脉动: ${pulse}%`);
            details.push(`深度: ${depth}px`);
            this.ui.setTooltipDetails(mx, my, '水母', details);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        this.ui.hideTooltip();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.ui.handleMouseUp();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.ui.handleMouseUp();
      this.ui.hideTooltip();
    });
  }

  private loop = (timestamp: number): void => {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.time = timestamp;

    this.update();
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    const params = this.ui.getParams();

    for (const fish of this.fishes) {
      fish.update(this.fishes, this.turtles, this.env, params);
    }

    for (const jelly of this.jellyfishes) {
      jelly.update(this.env);
    }

    for (const turtle of this.turtles) {
      turtle.update(this.fishes, this.env);
    }

    this.fishes = this.fishes.filter(f => f.alive);

    const fishAlive = this.fishes.length;
    const jellyCount = this.jellyfishes.length;
    let totalCatches = 0;
    for (const t of this.turtles) {
      totalCatches += t.catchCount;
    }

    const ecoActivity = this.calculateEcoActivity();

    this.ui.updateStats(this.currentFps, fishAlive, jellyCount, totalCatches, ecoActivity);
    this.ui.update();
  }

  private calculateEcoActivity(): number {
    let totalSpeed = 0;
    let totalTurnRate = 0;
    let count = 0;

    for (const fish of this.fishes) {
      if (!fish.alive) continue;
      totalSpeed += fish.getSpeed();
      totalTurnRate += fish.getTurnRate();
      count++;
    }
    for (const jelly of this.jellyfishes) {
      totalSpeed += jelly.getSpeed() * 2;
      totalTurnRate += jelly.getTurnRate();
      count++;
    }
    for (const turtle of this.turtles) {
      totalSpeed += turtle.getSpeed() * 1.5;
      totalTurnRate += turtle.getTurnRate();
      count++;
    }

    if (count === 0) return 0;

    const avgSpeed = totalSpeed / count;
    const avgTurnRate = totalTurnRate / count;

    const speedScore = Math.min(100, (avgSpeed / 4) * 100);
    const turnScore = Math.min(100, (avgTurnRate / 0.5) * 100);

    const activity = (speedScore * 0.5 + turnScore * 0.5);
    return Math.max(0, Math.min(100, activity));
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = this.bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderLightRays(ctx);

    this.env.render(ctx, this.time);

    this.renderTurtlePatrolPaths(ctx);

    for (const jelly of this.jellyfishes) {
      jelly.render(ctx);
    }

    for (const fish of this.fishes) {
      fish.render(ctx);
    }

    for (const turtle of this.turtles) {
      turtle.render(ctx);
    }

    this.ui.render(ctx);
  }

  private renderTurtlePatrolPaths(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const t of this.turtles) {
      const points = t.patrolPoints;
      if (points.length < 2) continue;

      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[0].x, points[0].y);
      ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const isActive = i === t.currentPatrolIndex;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? 'rgba(46, 204, 113, 0.6)' : 'rgba(46, 204, 113, 0.25)';
        ctx.fill();
        if (isActive) {
          ctx.strokeStyle = 'rgba(46, 204, 113, 0.8)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private renderLightRays(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const numRays = 5;
    for (let i = 0; i < numRays; i++) {
      const x = 100 + i * 180 + Math.sin(this.time * 0.0003 + i) * 30;
      const topWidth = 20 + Math.sin(this.time * 0.0005 + i * 2) * 8;
      const bottomWidth = 60 + Math.sin(this.time * 0.0004 + i) * 15;
      const alpha = 0.03 + Math.sin(this.time * 0.0006 + i * 1.5) * 0.01;

      ctx.beginPath();
      ctx.moveTo(x - topWidth, 0);
      ctx.lineTo(x + topWidth, 0);
      ctx.lineTo(x + bottomWidth, CANVAS_HEIGHT);
      ctx.lineTo(x - bottomWidth, CANVAS_HEIGHT);
      ctx.closePath();

      const grad = ctx.createLinearGradient(x, 0, x, CANVAS_HEIGHT);
      grad.addColorStop(0, `rgba(100, 200, 255, ${alpha})`);
      grad.addColorStop(0.5, `rgba(100, 200, 255, ${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(100, 200, 255, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new OceanSimulation();
});
