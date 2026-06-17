import { Particle, PhysicsSceneType } from './particle';

export const WALL_THICKNESS = 8;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public getWidth(): number {
    return this.canvas.getBoundingClientRect().width;
  }

  public getHeight(): number {
    return this.canvas.getBoundingClientRect().height;
  }

  public clear(): void {
    const w = this.getWidth();
    const h = this.getHeight();
    const gradient = this.ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2a2a3a');
    gradient.addColorStop(1, '#0f0f1a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);
  }

  public drawWalls(): void {
    const w = this.getWidth();
    const h = this.getHeight();
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(0, 0, w, WALL_THICKNESS);
    this.ctx.fillRect(0, h - WALL_THICKNESS, w, WALL_THICKNESS);
    this.ctx.fillRect(0, 0, WALL_THICKNESS, h);
    this.ctx.fillRect(w - WALL_THICKNESS, 0, WALL_THICKNESS, h);
  }

  public drawSceneIndicator(sceneType: PhysicsSceneType): void {
    const w = this.getWidth();
    const h = this.getHeight();
    this.ctx.save();
    this.ctx.globalAlpha = 0.35;

    switch (sceneType) {
      case 'gravity':
        this.drawGravityArrows(w, h);
        break;
      case 'wind':
        this.drawWindArrows(w, h);
        break;
      case 'vortex':
        this.drawVortexIndicator(w, h);
        break;
    }

    this.ctx.restore();
  }

  private drawGravityArrows(w: number, h: number): void {
    this.ctx.strokeStyle = '#ff6b6b';
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.lineWidth = 2;

    const cols = 5;
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = WALL_THICKNESS + 30 + c * ((w - WALL_THICKNESS * 2 - 60) / (cols - 1));
        const y = WALL_THICKNESS + 30 + r * ((h - WALL_THICKNESS * 2 - 60) / (rows - 1));
        this.drawArrow(x, y, x, y + 24, 8);
      }
    }
  }

  private drawWindArrows(w: number, h: number): void {
    this.ctx.strokeStyle = '#4ecdc4';
    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.lineWidth = 2;

    const rows = 6;
    for (let r = 0; r < rows; r++) {
      const y = WALL_THICKNESS + 40 + r * ((h - WALL_THICKNESS * 2 - 80) / (rows - 1));
      for (let x = WALL_THICKNESS + 30; x < w - WALL_THICKNESS - 30; x += 60) {
        this.drawArrow(x, y, x + 24, y, 8);
      }
    }
  }

  private drawVortexIndicator(w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.strokeStyle = '#a78bfa';
    this.ctx.fillStyle = '#a78bfa';
    this.ctx.lineWidth = 2;

    for (let radius = 50; radius <= Math.min(w, h) / 2 - WALL_THICKNESS - 20; radius += 60) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 1.6);
      this.ctx.stroke();

      const angle = Math.PI * 1.6;
      const ax = cx + Math.cos(angle) * radius;
      const ay = cy + Math.sin(angle) * radius;
      const headAngle = angle + Math.PI / 2 + 0.3;
      const headLen = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(ax, ay);
      this.ctx.lineTo(ax - Math.cos(headAngle) * headLen, ay - Math.sin(headAngle) * headLen);
      this.ctx.lineTo(ax - Math.cos(headAngle - 0.6) * headLen * 0.6, ay - Math.sin(headAngle - 0.6) * headLen * 0.6);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawArrow(x1: number, y1: number, x2: number, y2: number, headLen: number): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }

  public drawParticles(particles: Particle[]): void {
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      this.drawParticle(p);
    }
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawParticle(p: Particle): void {
    const { r, g, b, a } = p.currentColor;
    const size = Math.max(0.5, p.size);
    const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${a})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public render(particles: Particle[], sceneType: PhysicsSceneType): void {
    this.clear();
    this.drawSceneIndicator(sceneType);
    this.drawWalls();
    this.drawParticles(particles);
  }
}
