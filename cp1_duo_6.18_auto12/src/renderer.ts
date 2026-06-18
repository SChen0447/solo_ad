import type {
  Particle,
  PolygonObstacle,
  Vector2,
} from "./physics";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TRAIL_LENGTH,
  SPAWN_DURATION,
  HIGH_LOAD_THRESHOLD,
  TRAIL_LENGTH_HIGH_LOAD,
} from "./physics";

export interface RenderState {
  particles: Particle[];
  obstacles: PolygonObstacle[];
  currentDrawing: Vector2[] | null;
  selectedObstacleId: number | null;
  isDrawingMode: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawObstacle(obstacle: PolygonObstacle): void {
    const { vertices, isSelected } = obstacle;
    if (vertices.length < 2) return;

    const ctx = this.ctx;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = "#88888844";
    ctx.fill();

    ctx.strokeStyle = isSelected ? "#ff4444" : "#666666";
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
  }

  drawCurrentDrawing(vertices: Vector2[]): void {
    if (vertices.length < 1) return;

    const ctx = this.ctx;

    if (vertices.length > 1) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.strokeStyle = "#666666";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const v of vertices) {
      ctx.beginPath();
      ctx.arc(v.x, v.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#666666";
      ctx.fill();
    }
  }

  drawParticleTrail(particle: Particle): void {
    const ctx = this.ctx;
    const { trail, color, radius } = particle;
    if (trail.length < 2) return;

    const { r, g, b } = this.hexToRgb(color);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 0; i < trail.length - 1; i++) {
      const from = trail[i];
      const to = trail[i + 1];

      const progress = (i + 1) / trail.length;
      const alpha = progress;
      const lineRadius = radius * progress * 0.8;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = lineRadius * 2;
      ctx.stroke();
    }

    const lastTrail = trail[trail.length - 1];
    const progress = 1;
    const alpha = progress;
    ctx.beginPath();
    ctx.moveTo(lastTrail.x, lastTrail.y);
    ctx.lineTo(particle.position.x, particle.position.y);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.lineWidth = radius * 2 * 0.8;
    ctx.stroke();
  }

  drawParticle(particle: Particle, particleCount: number): void {
    const ctx = this.ctx;
    const { position, radius, color, age } = particle;

    this.drawParticleTrail(particle);

    const spawnProgress = Math.min(age / SPAWN_DURATION, 1);
    const eased = 1 - Math.pow(1 - spawnProgress, 3);
    const displayRadius = radius * eased;

    if (displayRadius < 0.5) return;

    if (spawnProgress < 1) {
      const glowRadius = radius * (1 + (1 - spawnProgress) * 2);
      const { r, g, b } = this.hexToRgb(color);
      const gradient = ctx.createRadialGradient(
        position.x, position.y, displayRadius * 0.5,
        position.x, position.y, glowRadius
      );
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.beginPath();
      ctx.arc(position.x, position.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(position.x, position.y, displayRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(
      position.x - displayRadius * 0.3,
      position.y - displayRadius * 0.3,
      displayRadius * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fill();
  }

  drawParticleCount(count: number): void {
    const ctx = this.ctx;
    const text = `粒子: ${count}`;
    const fontSize = 16;

    ctx.font = `${fontSize}px Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const padding = 8;
    const x = CANVAS_WIDTH - textWidth - padding * 2 - 10;
    const y = 10;
    const width = textWidth + padding * 2;
    const height = fontSize + padding;

    ctx.fillStyle = "rgba(102, 102, 102, 0.3)";
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    ctx.fillText(text, x + padding, y + padding / 2);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  render(state: RenderState): void {
    this.clear();

    for (const obstacle of state.obstacles) {
      this.drawObstacle(obstacle);
    }

    if (state.currentDrawing && state.currentDrawing.length > 0) {
      this.drawCurrentDrawing(state.currentDrawing);
    }

    const particleCount = state.particles.length;
    for (const particle of state.particles) {
      this.drawParticle(particle, particleCount);
    }

    this.drawParticleCount(particleCount);
  }
}
