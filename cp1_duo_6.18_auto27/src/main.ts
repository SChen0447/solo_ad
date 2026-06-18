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
        const dx = mx - t.pos.x;
        const dy = my - t.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < TURTLE_RADIUS * 1.5) {
          this.ui.setTooltip(mx, my, '海龟', `捕获: ${t.catchCount}条鱼`);
          found = true;
          break;
        }
      }
      if (!found) {
        for (const f of this.fishes) {
          if (!f.alive) continue;
          const dx = mx - f.pos.x;
          const dy = my - f.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < FISH_RADIUS * 2) {
            this.ui.setTooltip(mx, my, '小鱼', '鱼群成员');
            found = true;
            break;
          }
        }
      }
      if (!found) {
        for (const j of this.jellyfishes) {
          const dx = mx - j.pos.x;
          const dy = my - j.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < JELLYFISH_RADIUS * 1.5) {
            this.ui.setTooltip(mx, my, '水母', '飘流中');
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
    this.ui.updateStats(this.currentFps, fishAlive, jellyCount, totalCatches);
    this.ui.update();
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = this.bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderLightRays(ctx);

    this.env.render(ctx, this.time);

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
