import type {
  Particle,
  PolygonObstacle,
  Vector2,
} from "./physics";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TRAIL_LENGTH } from "./physics";

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

  drawParticle(particle: Particle): void {
    const ctx = this.ctx;
    const { position, radius, color, trail } = particle;

    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      const alpha = (0.8 * (TRAIL_LENGTH - i)) / TRAIL_LENGTH;
      const trailRadius = radius * (1 - i / TRAIL_LENGTH * 0.5);
      ctx.beginPath();
      ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(color, alpha * 0.5);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(position.x - radius * 0.3, position.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
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

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
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

    for (const particle of state.particles) {
      this.drawParticle(particle);
    }

    this.drawParticleCount(state.particles.length);
  }
}
