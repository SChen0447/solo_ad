import {
  Unit,
  Terrain,
  MAP_SIZE,
  CELL_SIZE,
  getTerrainAt,
} from '../data/unitData';

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
  duration: number;
}

interface DeathAnimation {
  x: number;
  y: number;
  emoji: string;
  startTime: number;
  duration: number;
  particles: Array<{
    dx: number;
    dy: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
  }>;
}

interface BounceAnimation {
  x: number;
  y: number;
  emoji: string;
  startTime: number;
  duration: number;
  unitId: string;
}

interface FlipAnimation {
  startTime: number;
  duration: number;
}

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private floatingTexts: FloatingText[] = [];
  private deathAnimations: DeathAnimation[] = [];
  private bounceAnimations: BounceAnimation[] = [];
  private flipAnimation: FlipAnimation | null = null;
  private selectedCell: { x: number; y: number } | null = null;
  private hoveredCell: { x: number; y: number } | null = null;
  private deployGhost: { emoji: string; x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const size = MAP_SIZE * CELL_SIZE;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    this.ctx = canvas.getContext('2d')!;
  }

  getCanvasSize(): number {
    return MAP_SIZE * CELL_SIZE;
  }

  setSelectedCell(cell: { x: number; y: number } | null): void {
    this.selectedCell = cell;
  }

  setHoveredCell(cell: { x: number; y: number } | null): void {
    this.hoveredCell = cell;
  }

  setDeployGhost(emoji: string | null, x: number, y: number): void {
    this.deployGhost = emoji ? { emoji, x, y } : null;
  }

  addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x: x * CELL_SIZE + CELL_SIZE / 2,
      y: y * CELL_SIZE + CELL_SIZE / 2,
      text,
      color,
      startTime: performance.now(),
      duration: 500,
    });
  }

  addDeathAnimation(unit: Unit): void {
    const particles: DeathAnimation['particles'] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      particles.push({
        dx: 0,
        dy: 0,
        vx: Math.cos(angle) * (1.5 + Math.random() * 2),
        vy: Math.sin(angle) * (1.5 + Math.random() * 2),
        alpha: 1,
        size: 3 + Math.random() * 3,
      });
    }
    this.deathAnimations.push({
      x: unit.x * CELL_SIZE + CELL_SIZE / 2,
      y: unit.y * CELL_SIZE + CELL_SIZE / 2,
      emoji: unit.emoji,
      startTime: performance.now(),
      duration: 400,
      particles,
    });
  }

  addBounceAnimation(unit: Unit): void {
    this.bounceAnimations.push({
      x: unit.x,
      y: unit.y,
      emoji: unit.emoji,
      startTime: performance.now(),
      duration: 300,
      unitId: unit.id,
    });
  }

  startFlipAnimation(): void {
    this.flipAnimation = {
      startTime: performance.now(),
      duration: 500,
    };
  }

  cellFromPixel(px: number, py: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((px - rect.left) / CELL_SIZE);
    const y = Math.floor((py - rect.top) / CELL_SIZE);
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return null;
    return { x, y };
  }

  render(units: Unit[], now: number, isDeployPhase: boolean, deployingUnits: Unit[]): void {
    const ctx = this.ctx;

    if (this.flipAnimation) {
      const elapsed = now - this.flipAnimation.startTime;
      const progress = Math.min(1, elapsed / this.flipAnimation.duration);
      const angle = progress * Math.PI;
      const scale = Math.abs(Math.cos(angle));

      ctx.save();
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, 1);
      ctx.translate(-cx, -cy);

      this.drawScene(ctx, units, now, isDeployPhase, deployingUnits);

      ctx.restore();

      if (progress >= 1) {
        this.flipAnimation = null;
      }
    } else {
      this.drawScene(ctx, units, now, isDeployPhase, deployingUnits);
    }
  }

  private drawScene(
    ctx: CanvasRenderingContext2D,
    units: Unit[],
    now: number,
    isDeployPhase: boolean,
    deployingUnits: Unit[]
  ): void {
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawTerrain(ctx);
    this.drawGrid(ctx);
    this.drawSelection(ctx);
    this.drawUnits(ctx, units, now, isDeployPhase);
    this.drawDeployingUnits(ctx, deployingUnits, now);
    this.drawDeployGhost(ctx);
    this.drawFloatingTexts(ctx, now);
    this.drawDeathAnimations(ctx, now);
    this.drawBounceAnimations(ctx, units, now);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const terrain = getTerrainAt(x, y);
        if (terrain === Terrain.Mountain) {
          ctx.fillStyle = '#6b4226';
        } else {
          ctx.fillStyle = '#8fbc6b';
        }
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= MAP_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, MAP_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(MAP_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
  }

  private drawSelection(ctx: CanvasRenderingContext2D): void {
    if (this.selectedCell) {
      const { x, y } = this.selectedCell;
      ctx.save();
      ctx.translate(
        x * CELL_SIZE + CELL_SIZE / 2,
        y * CELL_SIZE + CELL_SIZE / 2
      );
      ctx.scale(1.1, 1.1);
      ctx.translate(
        -(x * CELL_SIZE + CELL_SIZE / 2),
        -(y * CELL_SIZE + CELL_SIZE / 2)
      );
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        x * CELL_SIZE + 2,
        y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
      ctx.restore();
    }

    if (this.hoveredCell && !this.selectedCell) {
      const { x, y } = this.hoveredCell;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x * CELL_SIZE + 1,
        y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    }
  }

  private drawUnits(
    ctx: CanvasRenderingContext2D,
    units: Unit[],
    now: number,
    isDeployPhase: boolean
  ): void {
    for (const unit of units) {
      if (!unit.alive) continue;

      const px = unit.x * CELL_SIZE;
      const py = unit.y * CELL_SIZE;

      ctx.save();

      if (isDeployPhase && unit.owner === 'player') {
        ctx.globalAlpha = 0.6;
      }

      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit.emoji, px + CELL_SIZE / 2, py + CELL_SIZE / 2 - 3);

      const hpRatio = unit.hp / unit.maxHp;
      const barW = CELL_SIZE - 8;
      const barH = 4;
      const barX = px + 4;
      const barY = py + CELL_SIZE - 8;

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(barX, barY, barW, barH);

      let barColor: string;
      if (hpRatio > 0.6) barColor = '#4caf50';
      else if (hpRatio > 0.3) barColor = '#ff9800';
      else barColor = '#f44336';

      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.restore();
    }
  }

  private drawDeployingUnits(
    ctx: CanvasRenderingContext2D,
    deployingUnits: Unit[],
    now: number
  ): void {
    for (const unit of deployingUnits) {
      if (unit.x < 0 || unit.y < 0) continue;
      const px = unit.x * CELL_SIZE;
      const py = unit.y * CELL_SIZE;

      ctx.save();
      ctx.globalAlpha = 0.5;

      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(unit.emoji, px + CELL_SIZE / 2, py + CELL_SIZE / 2);

      ctx.restore();
    }
  }

  private drawDeployGhost(ctx: CanvasRenderingContext2D): void {
    if (!this.deployGhost) return;
    const { emoji, x, y } = this.deployGhost;
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    ctx.restore();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, now: number): void {
    this.floatingTexts = this.floatingTexts.filter(ft => {
      const elapsed = now - ft.startTime;
      if (elapsed > ft.duration) return false;

      const progress = elapsed / ft.duration;
      const alpha = 1 - progress;
      const offsetY = -30 * progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ft.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeText(ft.text, ft.x, ft.y + offsetY);
      ctx.fillText(ft.text, ft.x, ft.y + offsetY);
      ctx.restore();

      return true;
    });
  }

  private drawDeathAnimations(ctx: CanvasRenderingContext2D, now: number): void {
    this.deathAnimations = this.deathAnimations.filter(da => {
      const elapsed = now - da.startTime;
      if (elapsed > da.duration) return false;

      const progress = elapsed / da.duration;

      for (const p of da.particles) {
        p.dx += p.vx;
        p.dy += p.vy;
        p.alpha = 1 - progress;
      }

      for (const p of da.particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#c9a96e';
        ctx.beginPath();
        ctx.arc(da.x + p.dx, da.y + p.dy, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (progress < 0.5) {
        ctx.save();
        ctx.globalAlpha = 1 - progress * 2;
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(da.emoji, da.x, da.y);
        ctx.restore();
      }

      return true;
    });
  }

  private drawBounceAnimations(
    ctx: CanvasRenderingContext2D,
    units: Unit[],
    now: number
  ): void {
    this.bounceAnimations = this.bounceAnimations.filter(ba => {
      const elapsed = now - ba.startTime;
      if (elapsed > ba.duration) return false;

      const progress = elapsed / ba.duration;
      const bounceY = -15 * Math.sin(progress * Math.PI);

      const px = ba.x * CELL_SIZE + CELL_SIZE / 2;
      const py = ba.y * CELL_SIZE + CELL_SIZE / 2 + bounceY;

      ctx.save();
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ba.emoji, px, py);
      ctx.restore();

      return true;
    });
  }
}
