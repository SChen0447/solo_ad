import { Particle, Boundary } from './particle';
import { PhysicsScene, WARNING_THRESHOLD } from './emitter';

export interface RenderStats {
  fps: number;
  particleCount: number;
  warningActive: boolean;
}

export interface RenderOptions {
  showCollision: boolean;
}

const WALL_THICKNESS = 8;
const WALL_COLOR = '#555';
const PARTICLE_ELASTICITY = 0.5;
const BLINK_PERIOD = 0.5;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  private blinkTimer: number = 0;
  private blinkVisible: boolean = true;

  private options: RenderOptions = {
    showCollision: false
  };

  private scene: PhysicsScene = 'gravity';
  private gradientCache: Map<string, CanvasGradient> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gradientCache.clear();
  }

  public setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public setScene(scene: PhysicsScene): void {
    this.scene = scene;
  }

  public getBoundary(): Boundary {
    return {
      left: WALL_THICKNESS,
      right: this.width - WALL_THICKNESS,
      top: WALL_THICKNESS,
      bottom: this.height - WALL_THICKNESS
    };
  }

  public render(particles: Particle[], dt: number): RenderStats {
    this.updateFPS(dt);
    this.updateBlink(dt);

    this.clearCanvas();
    this.drawBackground();
    this.drawWalls();
    this.drawSceneIndicator();

    if (this.options.showCollision) {
      this.handleParticleCollisions(particles);
    }

    const boundary = this.getBoundary();
    for (const p of particles) {
      if (p.active) {
        p.handleBoundaryCollision(boundary);
        this.drawParticle(p);
      }
    }

    const activeCount = particles.filter(p => p.active).length;
    const warningActive = activeCount > WARNING_THRESHOLD;

    this.drawStats(activeCount, warningActive);

    return {
      fps: this.fps,
      particleCount: activeCount,
      warningActive
    };
  }

  private updateFPS(dt: number): void {
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  private updateBlink(dt: number): void {
    this.blinkTimer += dt;
    if (this.blinkTimer >= BLINK_PERIOD) {
      this.blinkTimer = 0;
      this.blinkVisible = !this.blinkVisible;
    }
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#2a2a3a');
    gradient.addColorStop(1, '#0f0f1a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawWalls(): void {
    this.ctx.fillStyle = WALL_COLOR;
    this.ctx.fillRect(0, 0, this.width, WALL_THICKNESS);
    this.ctx.fillRect(0, this.height - WALL_THICKNESS, this.width, WALL_THICKNESS);
    this.ctx.fillRect(0, 0, WALL_THICKNESS, this.height);
    this.ctx.fillRect(this.width - WALL_THICKNESS, 0, WALL_THICKNESS, this.height);
  }

  private drawSceneIndicator(): void {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#ff6b6b';
    ctx.fillStyle = '#ff6b6b';
    ctx.lineWidth = 2;

    switch (this.scene) {
      case 'gravity':
        this.drawGravityArrows();
        break;
      case 'wind':
        this.drawWindArrows();
        break;
      case 'vortex':
        this.drawVortexIndicator(centerX, centerY);
        break;
    }

    ctx.restore();
  }

  private drawGravityArrows(): void {
    const ctx = this.ctx;
    const spacing = 80;
    const arrowLength = 30;

    for (let x = spacing; x < this.width - spacing; x += spacing) {
      for (let y = spacing; y < this.height - spacing; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + arrowLength);
        ctx.lineTo(x - 5, y + arrowLength - 5);
        ctx.moveTo(x, y + arrowLength);
        ctx.lineTo(x + 5, y + arrowLength - 5);
        ctx.stroke();
      }
    }
  }

  private drawWindArrows(): void {
    const ctx = this.ctx;
    const spacing = 80;
    const arrowLength = 30;

    for (let x = spacing; x < this.width - spacing; x += spacing) {
      for (let y = spacing; y < this.height - spacing; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + arrowLength, y);
        ctx.lineTo(x + arrowLength - 5, y - 5);
        ctx.moveTo(x + arrowLength, y);
        ctx.lineTo(x + arrowLength - 5, y + 5);
        ctx.stroke();
      }
    }
  }

  private drawVortexIndicator(cx: number, cy: number): void {
    const ctx = this.ctx;
    const radius = Math.min(this.width, this.height) * 0.3;

    for (let r = radius * 0.3; r <= radius; r += radius * 0.3) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 1.8);
      ctx.stroke();

      const endAngle = Math.PI * 1.8;
      const arrowX = cx + r * Math.cos(endAngle);
      const arrowY = cy + r * Math.sin(endAngle);
      const tangentAngle = endAngle + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - 8 * Math.cos(tangentAngle - 0.5),
        arrowY - 8 * Math.sin(tangentAngle - 0.5)
      );
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - 8 * Math.cos(tangentAngle + 0.5),
        arrowY - 8 * Math.sin(tangentAngle + 0.5)
      );
      ctx.stroke();
    }
  }

  private handleParticleCollisions(particles: Particle[]): void {
    const activeParticles = particles.filter(p => p.active);
    const cellSize = 40;
    const grid: Map<string, Particle[]> = new Map();

    for (const p of activeParticles) {
      const cellX = Math.floor(p.x / cellSize);
      const cellY = Math.floor(p.y / cellSize);
      const key = `${cellX},${cellY}`;
      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(p);
    }

    const checked = new Set<string>();

    for (const p of activeParticles) {
      const cellX = Math.floor(p.x / cellSize);
      const cellY = Math.floor(p.y / cellSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cellX + dx},${cellY + dy}`;
          const cell = grid.get(key);
          if (!cell) continue;

          for (const other of cell) {
            if (p === other) continue;
            const pairKey = p.x < other.x || (p.x === other.x && p.y < other.y)
              ? `${p}-${other}`
              : `${other}-${p}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);

            this.resolveCollision(p, other);
          }
        }
      }
    }
  }

  private resolveCollision(p1: Particle, p2: Particle): void {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;
    const minDist = (p1.size + p2.size) / 2;

    if (distSq < minDist * minDist && distSq > 0.001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      const dvx = p1.vx - p2.vx;
      const dvy = p1.vy - p2.vy;
      const dvn = dvx * nx + dvy * ny;

      if (dvn > 0) return;

      const restitution = PARTICLE_ELASTICITY;
      const impulse = -(1 + restitution) * dvn / 2;

      const randomAngle = Math.random() * Math.PI * 2;
      const randomFactor = 0.3;
      const rx = Math.cos(randomAngle) * randomFactor;
      const ry = Math.sin(randomAngle) * randomFactor;

      p1.vx += (impulse * nx + rx * impulse);
      p1.vy += (impulse * ny + ry * impulse);
      p2.vx -= (impulse * nx - rx * impulse);
      p2.vy -= (impulse * ny - ry * impulse);

      const overlap = minDist - dist;
      p1.x -= (overlap / 2) * nx;
      p1.y -= (overlap / 2) * ny;
      p2.x += (overlap / 2) * nx;
      p2.y += (overlap / 2) * ny;
    }
  }

  private drawParticle(particle: Particle): void {
    const color = particle.getCurrentColor();
    const alpha = particle.getAlpha();
    const size = particle.size;

    const gradientKey = `${color.r},${color.g},${color.b},${size}`;
    let gradient = this.gradientCache.get(gradientKey);

    if (!gradient) {
      gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, size / 2
      );
      gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${alpha})`);
      gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
      this.gradientCache.set(gradientKey, gradient);
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawStats(particleCount: number, warningActive: boolean): void {
    const ctx = this.ctx;
    const padding = 12;
    const fontSize = 14;

    ctx.save();
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    let textColor = '#ffffff';
    if (warningActive && this.blinkVisible) {
      textColor = '#ff4444';
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const textWidth = 120;
    const textHeight = fontSize * 2 + 10;
    ctx.fillRect(
      this.width - padding - textWidth - 8,
      padding - 4,
      textWidth + 8,
      textHeight + 8
    );

    ctx.fillStyle = textColor;
    ctx.fillText(`FPS: ${this.fps}`, this.width - padding - 4, padding);
    ctx.fillText(`Particles: ${particleCount}`, this.width - padding - 4, padding + fontSize + 4);

    ctx.restore();
  }
}
