import type { PhysicsWorld, Rope, Cloth, Particle, Vec2 } from './types';

const COLORS = {
  rope: 'rgba(56, 189, 248, 0.8)',
  clothPoint: '#ffffff',
  clothLine: 'rgba(255, 255, 255, 0.3)',
  tensionLow: '#22c55e',
  tensionHigh: '#ef4444',
  bgStart: '#0f172a',
  bgEnd: '#1e293b',
  panelBg: '#2d3748',
  attachHint: 'rgba(56, 189, 248, 0.6)',
  createPreview: 'rgba(56, 189, 248, 0.4)',
};

function lerpColor(color1: string, color2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));

  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);

  return `rgb(${r}, ${g}, ${b})`;
}

function getTensionColor(tension: number): string {
  const normalizedTension = Math.min(tension / 0.5, 1);
  return lerpColor(COLORS.tensionLow, COLORS.tensionHigh, normalizedTension);
}

export interface RendererState {
  hoveredParticle: Particle | null;
  createStart: Vec2 | null;
  createEnd: Vec2 | null;
  isCreatingCloth: boolean;
  attachHintPos: Vec2 | null;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(world: PhysicsWorld, state: RendererState): void {
    this.clear();
    this.drawBackground();
    this.drawCloths(world.cloths);
    this.drawRopes(world.ropes);
    this.drawCreatePreview(state);
    this.drawAttachHint(state);
    this.drawHoveredParticle(state);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.bgStart);
    gradient.addColorStop(1, COLORS.bgEnd);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawRopes(ropes: Rope[]): void {
    for (const rope of ropes) {
      this.drawRope(rope);
    }
  }

  private drawRope(rope: Rope): void {
    if (rope.particles.length < 2) return;

    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.rope;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(rope.particles[0].pos.x, rope.particles[0].pos.y);

    for (let i = 1; i < rope.particles.length; i++) {
      ctx.lineTo(rope.particles[i].pos.x, rope.particles[i].pos.y);
    }

    ctx.stroke();

    for (const particle of rope.particles) {
      ctx.beginPath();
      ctx.arc(particle.pos.x, particle.pos.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.fill();
    }
  }

  private drawCloths(cloths: Cloth[]): void {
    for (const cloth of cloths) {
      this.drawCloth(cloth);
    }
  }

  private drawCloth(cloth: Cloth): void {
    const ctx = this.ctx;

    for (let r = 0; r < cloth.rows - 1; r++) {
      for (let c = 0; c < cloth.cols - 1; c++) {
        const p1 = cloth.particles[r][c];
        const p2 = cloth.particles[r][c + 1];
        const p3 = cloth.particles[r + 1][c + 1];
        const p4 = cloth.particles[r + 1][c];

        const avgTension =
          (p1.tension + p2.tension + p3.tension + p4.tension) / 4;
        const fillColor = getTensionColor(avgTension);

        ctx.fillStyle = fillColor + '33';
        ctx.beginPath();
        ctx.moveTo(p1.pos.x, p1.pos.y);
        ctx.lineTo(p2.pos.x, p2.pos.y);
        ctx.lineTo(p3.pos.x, p3.pos.y);
        ctx.lineTo(p4.pos.x, p4.pos.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = COLORS.clothLine;
    ctx.lineWidth = 1;

    for (const constraint of cloth.constraints) {
      if (constraint.isDiagonal) continue;
      ctx.beginPath();
      ctx.moveTo(constraint.p1.pos.x, constraint.p1.pos.y);
      ctx.lineTo(constraint.p2.pos.x, constraint.p2.pos.y);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.clothPoint;
    for (const row of cloth.particles) {
      for (const particle of row) {
        ctx.beginPath();
        ctx.arc(particle.pos.x, particle.pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCreatePreview(state: RendererState): void {
    if (!state.createStart || !state.createEnd) return;

    const ctx = this.ctx;

    if (state.isCreatingCloth) {
      const x = Math.min(state.createStart.x, state.createEnd.x);
      const y = Math.min(state.createStart.y, state.createEnd.y);
      const w = Math.abs(state.createEnd.x - state.createStart.x);
      const h = Math.abs(state.createEnd.y - state.createStart.y);

      ctx.strokeStyle = COLORS.createPreview;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      const cols = 10;
      const rows = 10;
      const dx = w / (cols - 1);
      const dy = h / (rows - 1);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = x + c * dx;
          const py = y + r * dy;

          if (c < cols - 1) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(x + (c + 1) * dx, py);
            ctx.stroke();
          }

          if (r < rows - 1) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, y + (r + 1) * dy);
            ctx.stroke();
          }
        }
      }
    } else {
      ctx.strokeStyle = COLORS.createPreview;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(state.createStart.x, state.createStart.y);
      ctx.lineTo(state.createEnd.x, state.createEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.createPreview;
      ctx.beginPath();
      ctx.arc(state.createStart.x, state.createStart.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(state.createEnd.x, state.createEnd.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAttachHint(state: RendererState): void {
    if (!state.attachHintPos) return;

    const ctx = this.ctx;
    const pulseSize = 15 + Math.sin(Date.now() / 200) * 3;

    ctx.strokeStyle = COLORS.attachHint;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.attachHintPos.x, state.attachHintPos.y, pulseSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.beginPath();
    ctx.arc(state.attachHintPos.x, state.attachHintPos.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHoveredParticle(state: RendererState): void {
    if (!state.hoveredParticle) return;

    const ctx = this.ctx;
    const particle = state.hoveredParticle;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(particle.pos.x, particle.pos.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}
