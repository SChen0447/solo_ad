import {
  Particle,
  Rope,
  Cloth,
  PhysicsWorld,
  Point,
  Rect,
  CreateMode,
  ATTACHMENT_THRESHOLD,
} from './types';

interface RenderState {
  createMode: CreateMode;
  ropeStart: Point | null;
  mousePos: Point;
  clothStart: Point | null;
  draggedParticle: Particle | null;
  attachmentCandidate: { cloth: Cloth; particleIndex: number } | null;
  isDragging: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  private readonly COLOR_ROPE = 'rgba(56, 189, 248, 0.8)';
  private readonly COLOR_CLOTH_LINE = 'rgba(255, 255, 255, 0.3)';
  private readonly COLOR_PARTICLE = '#ffffff';
  private readonly COLOR_ATTACH_HIGHLIGHT = '#fbbf24';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(world: PhysicsWorld, state: RenderState): void {
    this.clear();
    this.drawBackground();

    if (state.createMode === 'rope-first' && state.ropeStart) {
      this.drawRopePreview(state.ropeStart, state.mousePos);
    }

    if (state.createMode === 'cloth-dragging' && state.clothStart) {
      this.drawClothPreview(state.clothStart, state.mousePos);
    }

    for (const cloth of world.cloths) {
      this.drawCloth(cloth);
    }

    for (const rope of world.ropes) {
      this.drawRope(rope);
    }

    if (state.attachmentCandidate) {
      this.drawAttachmentHighlight(
        world.cloths.find(c => c.id === state.attachmentCandidate!.cloth.id)!,
        state.attachmentCandidate.particleIndex
      );
    }

    if (state.draggedParticle) {
      this.drawDraggedParticle(state.draggedParticle);
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawRope(rope: Rope): void {
    const { particles } = rope;

    this.ctx.strokeStyle = this.COLOR_ROPE;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(particles[0].x, particles[0].y);

    for (let i = 1; i < particles.length; i++) {
      this.ctx.lineTo(particles[i].x, particles[i].y);
    }
    this.ctx.stroke();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const color = this.getTensionColor(p.tension);
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawCloth(cloth: Cloth): void {
    const { particles, constraints, gridSize } = cloth;

    this.ctx.lineWidth = 1;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (col < gridSize - 1 && row < gridSize - 1) {
          const idx1 = row * gridSize + col;
          const idx2 = row * gridSize + col + 1;
          const idx3 = (row + 1) * gridSize + col + 1;
          const idx4 = (row + 1) * gridSize + col;

          const p1 = particles[idx1];
          const p2 = particles[idx2];
          const p3 = particles[idx3];
          const p4 = particles[idx4];

          const avgTension = (p1.tension + p2.tension + p3.tension + p4.tension) / 4;
          const color = this.getTensionColor(avgTension);

          this.ctx.fillStyle = color;
          this.ctx.globalAlpha = 0.6;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.lineTo(p3.x, p3.y);
          this.ctx.lineTo(p4.x, p4.y);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.globalAlpha = 1;
        }
      }
    }

    this.ctx.strokeStyle = this.COLOR_CLOTH_LINE;
    this.ctx.beginPath();

    for (const c of constraints) {
      if (c.type !== 'structural') continue;
      const p1 = particles[c.p1];
      const p2 = particles[c.p2];
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
    }
    this.ctx.stroke();

    this.ctx.fillStyle = this.COLOR_PARTICLE;
    for (const p of particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawRopePreview(start: Point, end: Point): void {
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawClothPreview(start: Point, end: Point): void {
    const rect: Rect = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  private drawAttachmentHighlight(cloth: Cloth, particleIndex: number): void {
    const p = cloth.particles[particleIndex];

    this.ctx.strokeStyle = this.COLOR_ATTACH_HIGHLIGHT;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, ATTACHMENT_THRESHOLD, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = this.COLOR_ATTACH_HIGHLIGHT;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawDraggedParticle(particle: Particle): void {
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, 10, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  getTensionColor(tension: number): string {
    const clampedTension = Math.min(Math.max(tension, 0), 0.5);
    const t = clampedTension / 0.5;

    const r1 = 34, g1 = 197, b1 = 94;
    const r2 = 239, g2 = 68, b2 = 68;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }
}
