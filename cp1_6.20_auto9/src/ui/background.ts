import { Poem, MoodColors } from "../core/poemData";

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speedX: number;
  speedY: number;
  baseX: number;
  driftPhase: number;
}

function hexToRGB(hex: string): RGB {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function parseMoodColors(colors: string[]): RGB[] {
  return colors.map(hexToRGB);
}

export class BackgroundRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private running: boolean = false;
  private currentColors: RGB[];
  private targetColors: RGB[];
  private displayColors: RGB[];
  private transitionProgress: number = 1;
  private particles: Particle[] = [];
  private time: number = 0;
  private lastTimestamp: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const initial = parseMoodColors(MoodColors["婉约"]);
    this.currentColors = initial.map((c) => ({ ...c }));
    this.targetColors = initial.map((c) => ({ ...c }));
    this.displayColors = initial.map((c) => ({ ...c }));
    this.initParticles();
  }

  setMood(mood: Poem["mood"]): void {
    this.currentColors = this.displayColors.map((c) => ({ ...c }));
    this.targetColors = parseMoodColors(MoodColors[mood]);
    if (this.targetColors.length < this.currentColors.length) {
      for (let i = this.targetColors.length; i < this.currentColors.length; i++) {
        this.targetColors.push({ ...this.currentColors[i] });
      }
    } else if (this.currentColors.length < this.targetColors.length) {
      for (let i = this.currentColors.length; i < this.targetColors.length; i++) {
        this.currentColors.push({ ...this.targetColors[i] });
        this.displayColors.push({ ...this.targetColors[i] });
      }
    }
    this.transitionProgress = 0;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  destroy(): void {
    this.stop();
    this.particles = [];
  }

  private animate(timestamp: number): void {
    if (!this.running) return;
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.time += dt;
    this.resize();
    this.updateTransition(dt);
    this.updateParticles(dt);
    this.draw();
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private updateTransition(dt: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt);
      const t = this.easeInOutCubic(this.transitionProgress);
      for (let i = 0; i < this.displayColors.length; i++) {
        this.displayColors[i] = lerpColor(this.currentColors[i], this.targetColors[i], t);
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private initParticles(): void {
    const count = 65;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const w = this.canvas.width || 800;
    const h = this.canvas.height || 600;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      baseX: Math.random() * w,
      radius: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.35,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -(0.2 + Math.random() * 0.5),
      driftPhase: Math.random() * Math.PI * 2,
    };
  }

  private updateParticles(dt: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const p of this.particles) {
      p.driftPhase += dt * 0.5;
      p.x += (p.speedX + Math.sin(p.driftPhase) * 0.3) * dt * 60;
      p.y += p.speedY * dt * 60;
      if (p.y + p.radius < 0) {
        p.y = h + p.radius;
        p.x = Math.random() * w;
        p.baseX = p.x;
      }
      if (p.x < -p.radius) p.x = w + p.radius;
      if (p.x > w + p.radius) p.x = -p.radius;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);
    this.drawGradient(w, h);
    this.drawParticles();
  }

  private drawGradient(w: number, h: number): void {
    const ctx = this.ctx;
    const colors = this.displayColors;
    if (colors.length === 0) return;

    const waveOffset = Math.sin(this.time * 0.3) * w * 0.1;
    const cx = w * 0.5 + waveOffset;
    const cy = h * 0.4 + Math.cos(this.time * 0.2) * h * 0.05;
    const maxDim = Math.max(w, h);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);

    for (let i = 0; i < colors.length; i++) {
      const stop = i / (colors.length - 1);
      const c = colors[i];
      gradient.addColorStop(stop, `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.fill();
    }
  }
}
