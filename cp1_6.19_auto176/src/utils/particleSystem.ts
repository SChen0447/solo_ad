export interface Particle {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  speed: number;
  sinOffset: number;
  sinAmplitude: number;
  colorIndex: number;
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): ColorRGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function lerpColor(a: ColorRGB, b: ColorRGB, t: number): ColorRGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

const PARTICLES_PER_COLOR = 40;

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number = 0;
  private currentColors: string[] = [];
  private targetColors: string[] = [];
  private displayColors: ColorRGB[] = [];
  private transitionProgress: number = 1;
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx!.scale(dpr, dpr);
    this.redistributeParticles();
  }

  setColors(colors: string[]): void {
    if (this.currentColors.length === 0) {
      this.currentColors = [...colors];
      this.targetColors = [...colors];
      this.displayColors = colors.map(hexToRgb);
      this.createParticles(colors.length);
    } else {
      this.targetColors = [...colors];
      this.transitionProgress = 0;
    }
  }

  private createParticles(colorCount: number): void {
    this.particles = [];
    for (let ci = 0; ci < colorCount; ci++) {
      for (let i = 0; i < PARTICLES_PER_COLOR; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          size: 2 + Math.random() * 3,
          baseOpacity: 0.1 + Math.random() * 0.3,
          opacity: 0.1 + Math.random() * 0.3,
          speed: 0.2 + Math.random() * 0.5,
          sinOffset: Math.random() * Math.PI * 2,
          sinAmplitude: 10 + Math.random() * 20,
          colorIndex: ci,
        });
      }
    }
  }

  private redistributeParticles(): void {
    for (const p of this.particles) {
      if (p.x > this.width) p.x = Math.random() * this.width;
      if (p.y > this.height) p.y = Math.random() * this.height;
    }
  }

  start(): void {
    this.stop();
    this.loop();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private loop = (): void => {
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    this.time += 0.016;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 0.02);
      const oldColors = this.currentColors.map(hexToRgb);
      const newColors = this.targetColors.map(hexToRgb);
      const maxLen = Math.max(oldColors.length, newColors.length);
      this.displayColors = [];
      for (let i = 0; i < maxLen; i++) {
        const old = i < oldColors.length ? oldColors[i] : oldColors[oldColors.length - 1];
        const nw = i < newColors.length ? newColors[i] : newColors[newColors.length - 1];
        this.displayColors.push(lerpColor(old, nw, this.transitionProgress));
      }
      if (this.transitionProgress >= 1) {
        this.currentColors = [...this.targetColors];
        this.displayColors = this.currentColors.map(hexToRgb);
        if (this.particles.length !== this.targetColors.length * PARTICLES_PER_COLOR) {
          this.createParticles(this.targetColors.length);
        }
      }
    }

    for (const p of this.particles) {
      p.y -= p.speed;
      p.x += Math.sin(this.time * 0.8 + p.sinOffset) * p.sinAmplitude * 0.01;
      p.opacity = p.baseOpacity + Math.sin(this.time * 1.5 + p.sinOffset) * 0.1;

      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
      if (p.x < -20) p.x = this.width + 20;
      if (p.x > this.width + 20) p.x = -20;
    }
  }

  private render(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      const ci = Math.min(p.colorIndex, this.displayColors.length - 1);
      const color = this.displayColors[ci] || { r: 128, g: 128, b: 128 };
      const alpha = Math.max(0, Math.min(1, p.opacity));

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
      this.ctx.fill();
    }
  }

  destroy(): void {
    this.stop();
    this.particles = [];
    this.canvas = null;
    this.ctx = null;
  }
}
