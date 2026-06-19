export interface Collectible {
  x: number;
  y: number;
  collected: boolean;
  animTimer: number;
  originalX: number;
  originalY: number;
}

export interface GoalFlag {
  x: number;
  y: number;
  activated: boolean;
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TILE = 32;

const LEVEL_MAP: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export class Level {
  tileMap: number[][];
  tileCols: number;
  tileRows: number;
  tile = TILE;
  collectibles: Collectible[] = [];
  goal: GoalFlag;
  spikeRects: Rect[] = [];
  platformRects: Rect[] = [];
  worldWidth: number;
  worldHeight: number;
  spikeFlashTimer = 0;

  constructor() {
    this.tileMap = LEVEL_MAP;
    this.tileRows = this.tileMap.length;
    this.tileCols = this.tileMap[0].length;
    this.worldWidth = this.tileCols * TILE;
    this.worldHeight = this.tileRows * TILE;

    for (let r = 0; r < this.tileRows; r++) {
      for (let c = 0; c < this.tileCols; c++) {
        const t = this.tileMap[r][c];
        if (t === 1) {
          this.platformRects.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE });
        }
      }
    }

    this.goal = {
      x: 21 * TILE,
      y: 15 * TILE - 48,
      activated: false,
      particles: [],
    };

    this.initCollectibles();
    this.initSpikes();
  }

  private initCollectibles(): void {
    const positions = [
      { x: 3 * TILE, y: 19 * TILE - 20 },
      { x: 10 * TILE, y: 16 * TILE - 20 },
      { x: 14 * TILE, y: 19 * TILE - 20 },
      { x: 20 * TILE, y: 17 * TILE - 20 },
      { x: 25 * TILE, y: 19 * TILE - 20 },
    ];
    this.collectibles = positions.map((p) => ({
      x: p.x,
      y: p.y,
      collected: false,
      animTimer: 0,
      originalX: p.x,
      originalY: p.y,
    }));
  }

  private initSpikes(): void {
    this.spikeRects = [
      { x: 15 * TILE, y: 20 * TILE - 16, w: TILE, h: 16 },
      { x: 23 * TILE, y: 20 * TILE - 16, w: TILE, h: 16 },
    ];
    this.tileMap[20][15] = 2;
    this.tileMap[20][23] = 2;
  }

  resetCollectibles(): void {
    for (const c of this.collectibles) {
      c.collected = false;
      c.animTimer = 0;
      c.x = c.originalX;
      c.y = c.originalY;
    }
    this.goal.activated = false;
    this.goal.particles = [];
  }

  update(now: number): void {
    this.spikeFlashTimer = now;
    for (const c of this.collectibles) {
      if (!c.collected) {
        c.animTimer += 0.05;
        c.y = c.originalY + Math.sin(c.animTimer) * 4;
      } else if (c.animTimer < 1) {
        c.animTimer += 0.05;
      }
    }

    if (this.goal.activated) {
      if (Math.random() < 0.3) {
        this.goal.particles.push({
          x: this.goal.x + 8,
          y: this.goal.y + 24,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3 - 1,
          life: 60,
          maxLife: 60,
        });
      }
    }

    for (let i = this.goal.particles.length - 1; i >= 0; i--) {
      const p = this.goal.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) this.goal.particles.splice(i, 1);
    }
  }

  checkCollectible(px: number, py: number, pw: number, ph: number): number {
    let count = 0;
    for (const c of this.collectibles) {
      if (!c.collected && this.aabb(px, py, pw, ph, c.x, c.y, 16, 16)) {
        c.collected = true;
        c.animTimer = 0;
        count++;
      }
    }
    return count;
  }

  allCollected(): boolean {
    return this.collectibles.every((c) => c.collected);
  }

  checkGoal(px: number, py: number, pw: number, ph: number): boolean {
    return this.aabb(px, py, pw, ph, this.goal.x, this.goal.y, 16, 48);
  }

  checkSpikes(px: number, py: number, pw: number, ph: number): boolean {
    for (const s of this.spikeRects) {
      if (this.aabb(px, py, pw, ph, s.x, s.y, s.w, s.h)) return true;
    }
    return false;
  }

  resolveCollisionX(px: number, py: number, pw: number, ph: number, vx: number): number {
    let newX = px + vx;
    for (const rect of this.platformRects) {
      if (!this.aabb(newX, py, pw, ph, rect.x, rect.y, rect.w, rect.h)) continue;
      if (vx > 0) newX = rect.x - pw;
      else if (vx < 0) newX = rect.x + rect.w;
    }
    return newX;
  }

  resolveCollisionY(px: number, py: number, pw: number, ph: number, vy: number): { y: number; onGround: boolean; hitCeiling: boolean } {
    let newY = py + vy;
    let onGround = false;
    let hitCeiling = false;
    for (const rect of this.platformRects) {
      if (!this.aabb(px, newY, pw, ph, rect.x, rect.y, rect.w, rect.h)) continue;
      if (vy > 0) {
        newY = rect.y - ph;
        onGround = true;
      } else if (vy < 0) {
        newY = rect.y + rect.h;
        hitCeiling = true;
      }
    }
    return { y: newY, onGround, hitCeiling };
  }

  isOutOfBounds(px: number, py: number): boolean {
    return py > this.worldHeight + 100 || px < -100 || px > this.worldWidth + 100;
  }

  private aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, now: number): void {
    this.drawPlatforms(ctx, camX, camY);
    this.drawSpikes(ctx, camX, camY, now);
    this.drawCollectibles(ctx, camX, camY);
    this.drawGoal(ctx, camX, camY, now);
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const rect of this.platformRects) {
      const sx = rect.x - camX;
      const sy = rect.y - camY;
      if (sx + rect.w < 0 || sx > ctx.canvas.width || sy + rect.h < 0 || sy > ctx.canvas.height) continue;

      ctx.fillStyle = '#4a5568';
      ctx.fillRect(sx, sy, rect.w, rect.h);

      ctx.strokeStyle = '#5a6a80';
      ctx.lineWidth = 0.5;
      const halfTile = TILE / 2;
      for (let gx = 0; gx < TILE; gx += halfTile) {
        for (let gy = 0; gy < TILE; gy += halfTile) {
          const offset = (Math.floor(gy / halfTile) % 2) * halfTile;
          ctx.strokeRect(sx + gx + offset, sy + gy, halfTile, halfTile);
        }
      }

      ctx.fillStyle = '#5a6a80';
      ctx.fillRect(sx, sy, rect.w, 2);
    }
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, camX: number, camY: number, now: number): void {
    const flash = Math.sin(now * 0.008) * 0.3 + 0.7;
    for (const rect of this.spikeRects) {
      const sx = rect.x - camX;
      const sy = rect.y - camY;

      ctx.save();
      ctx.globalAlpha = 0.3 + flash * 0.7;
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.moveTo(sx, sy + rect.h);
      ctx.lineTo(sx + rect.w / 2, sy);
      ctx.lineTo(sx + rect.w, sy + rect.h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      if (flash > 0.85) {
        ctx.save();
        ctx.globalAlpha = (flash - 0.85) * 4;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(sx - 2, sy + rect.h + 2);
        ctx.lineTo(sx + rect.w / 2, sy - 4);
        ctx.lineTo(sx + rect.w + 2, sy + rect.h + 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawCollectibles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const c of this.collectibles) {
      if (c.collected && c.animTimer >= 1) continue;

      const sx = c.x - camX;
      const sy = c.y - camY;

      ctx.save();

      if (c.collected) {
        const t = c.animTimer;
        ctx.globalAlpha = 1 - t;
        const scale = 1 - t;
        ctx.translate(sx + 8, sy + 8);
        ctx.rotate(t * Math.PI * 4);
        ctx.scale(scale, scale);
        ctx.translate(-8, -8);
      } else {
        ctx.translate(sx + 8, sy + 8);
        ctx.rotate(Math.sin(c.animTimer * 0.5) * 0.2);
        ctx.translate(-8, -8);
      }

      this.drawStar(ctx, 0, 0, 5, 8, 4, '#00e5ff', '#0091ea');
      ctx.restore();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outer: number, inner: number, fill: string, stroke: string): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + 8 + Math.cos(angle) * r;
      const y = cy + 8 + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = fill;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }

  private drawGoal(ctx: CanvasRenderingContext2D, camX: number, camY: number, now: number): void {
    const sx = this.goal.x - camX;
    const sy = this.goal.y - camY;

    ctx.fillStyle = '#666';
    ctx.fillRect(sx + 6, sy, 4, 48);

    const flagColor = this.goal.activated ? '#ffd700' : '#888';
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(sx + 10, sy);
    ctx.lineTo(sx + 30, sy + 10);
    ctx.lineTo(sx + 10, sy + 20);
    ctx.closePath();
    ctx.fill();

    if (this.goal.activated) {
      ctx.save();
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15 + Math.sin(now * 0.01) * 5;
      ctx.fill();
      ctx.restore();

      for (const p of this.goal.particles) {
        const px = p.x - camX;
        const py = p.y - camY;
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
