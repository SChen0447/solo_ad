import { TileType, TileMatrix, GRID_SIZE, TILE_SIZE, PLAYER_SIZE, PLAYER_SPEED } from './types';

interface Footprint {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startTime: number;
  duration: number;
  size: number;
}

interface CollisionEffect {
  startTime: number;
  duration: number;
}

export class PlayerSimulator {
  private ctx: CanvasRenderingContext2D;
  private matrix: TileMatrix;
  private playerX: number = 0;
  private playerY: number = 0;
  private keys: Set<string> = new Set();
  private isActive: boolean = false;
  private footprints: Footprint[] = [];
  private waterParticles: WaterParticle[] = [];
  private collisionEffect: CollisionEffect | null = null;
  private lastFootprintTime: number = 0;
  private wasOnWater: boolean = false;
  private animationId: number | null = null;
  private shakeOffset: { x: number; y: number } = { x: 0, y: 0 };
  private onStop?: () => void;

  constructor(canvas: HTMLCanvasElement, matrix: TileMatrix) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.matrix = JSON.parse(JSON.stringify(matrix));
  }

  setMatrix(matrix: TileMatrix): void {
    this.matrix = JSON.parse(JSON.stringify(matrix));
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.playerX = TILE_SIZE / 2;
    this.playerY = TILE_SIZE / 2;
    this.footprints = [];
    this.waterParticles = [];
    this.collisionEffect = null;
    this.wasOnWater = this.isOnWaterTile(this.playerX, this.playerY);
    this.bindEvents();
    this.animate();
  }

  stop(): void {
    this.isActive = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.unbindEvents();
    if (this.onStop) this.onStop();
  }

  setOnStop(callback: () => void): void {
    this.onStop = callback;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private unbindEvents(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault();
      this.keys.add(e.key.toLowerCase());
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault();
      this.keys.delete(e.key.toLowerCase());
    }
  };

  private animate = (): void => {
    if (!this.isActive) return;
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(): void {
    if (!this.isActive) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.has('w')) dy -= 1;
    if (this.keys.has('s')) dy += 1;
    if (this.keys.has('a')) dx -= 1;
    if (this.keys.has('d')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invSqrt2 = 1 / Math.sqrt(2);
      dx *= invSqrt2;
      dy *= invSqrt2;
    }

    dx *= PLAYER_SPEED;
    dy *= PLAYER_SPEED;

    const newX = this.playerX + dx;
    const newY = this.playerY + dy;

    const radius = PLAYER_SIZE / 2;
    let collided = false;

    if (this.canMoveTo(newX, this.playerY, radius)) {
      this.playerX = newX;
    } else {
      collided = true;
    }

    if (this.canMoveTo(this.playerX, newY, radius)) {
      this.playerY = newY;
    } else {
      collided = true;
    }

    if (collided) {
      if (!this.collisionEffect || performance.now() - this.collisionEffect.startTime > this.collisionEffect.duration) {
        this.collisionEffect = {
          startTime: performance.now(),
          duration: 300
        };
      }
    }

    this.shakeOffset = this.updateShake();

    const onWood = this.isOnWoodTile(this.playerX, this.playerY);
    const now = performance.now();
    if (onWood && (dx !== 0 || dy !== 0) && now - this.lastFootprintTime > 150) {
      this.footprints.push({
        x: this.playerX,
        y: this.playerY,
        startTime: now,
        duration: 600
      });
      this.lastFootprintTime = now;
    }

    const isOnWater = this.isOnWaterTile(this.playerX, this.playerY);
    if (!this.wasOnWater && isOnWater && (dx !== 0 || dy !== 0)) {
      this.spawnWaterParticles(this.playerX, this.playerY);
    }
    this.wasOnWater = isOnWater;

    this.footprints = this.footprints.filter((f) => now - f.startTime < f.duration);

    this.updateWaterParticles();
  }

  private updateShake(): { x: number; y: number } {
    if (!this.collisionEffect) return { x: 0, y: 0 };
    const elapsed = performance.now() - this.collisionEffect.startTime;
    if (elapsed >= this.collisionEffect.duration) return { x: 0, y: 0 };

    const intensity = 3 * (1 - elapsed / this.collisionEffect.duration);
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2
    };
  }

  private canMoveTo(px: number, py: number, radius: number): boolean {
    const checkPoints = [
      { x: px - radius + 2, y: py - radius + 2 },
      { x: px + radius - 2, y: py - radius + 2 },
      { x: px - radius + 2, y: py + radius - 2 },
      { x: px + radius - 2, y: py + radius - 2 },
      { x: px, y: py - radius + 1 },
      { x: px, y: py + radius - 1 },
      { x: px - radius + 1, y: py },
      { x: px + radius - 1, y: py }
    ];

    for (const point of checkPoints) {
      const gridX = Math.floor(point.x / TILE_SIZE);
      const gridY = Math.floor(point.y / TILE_SIZE);

      if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
        return false;
      }

      const tile = this.matrix[gridY][gridX];
      if (tile === TileType.Wall || tile === TileType.Water) {
        return false;
      }
    }

    return true;
  }

  private isOnWoodTile(px: number, py: number): boolean {
    const gridX = Math.floor(px / TILE_SIZE);
    const gridY = Math.floor(py / TILE_SIZE);
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return false;
    return this.matrix[gridY][gridX] === TileType.WoodFloor;
  }

  private isOnWaterTile(px: number, py: number): boolean {
    const gridX = Math.floor(px / TILE_SIZE);
    const gridY = Math.floor(py / TILE_SIZE);
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return false;
    return this.matrix[gridY][gridX] === TileType.Water;
  }

  private spawnWaterParticles(px: number, py: number): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      this.waterParticles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        startTime: performance.now(),
        duration: 800 + Math.random() * 400,
        size: 2 + Math.random() * 3
      });
    }
  }

  private updateWaterParticles(): void {
    const now = performance.now();
    this.waterParticles = this.waterParticles.filter((p) => {
      const elapsed = now - p.startTime;
      if (elapsed >= p.duration) return false;

      p.vy += 0.05;
      p.x += p.vx;
      p.y += p.vy;

      return true;
    });
  }

  render(): void {
    if (!this.isActive) return;

    const ctx = this.ctx;
    const now = performance.now();

    this.renderFootprints(ctx, now);
    this.renderWaterParticles(ctx, now);
    this.renderPlayer(ctx, now);
  }

  private renderFootprints(ctx: CanvasRenderingContext2D, now: number): void {
    for (const fp of this.footprints) {
      const elapsed = now - fp.startTime;
      const progress = elapsed / fp.duration;
      const alpha = (1 - progress) * 0.4;
      const scale = 1 + progress * 1.5;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, (PLAYER_SIZE / 2) * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderWaterParticles(ctx: CanvasRenderingContext2D, now: number): void {
    for (const p of this.waterParticles) {
      const elapsed = now - p.startTime;
      const progress = elapsed / p.duration;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(100, 180, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, now: number): void {
    const radius = PLAYER_SIZE / 2;
    const px = this.playerX + this.shakeOffset.x;
    const py = this.playerY + this.shakeOffset.y;

    let isColliding = false;
    let collisionProgress = 0;
    if (this.collisionEffect) {
      const elapsed = now - this.collisionEffect.startTime;
      if (elapsed < this.collisionEffect.duration) {
        isColliding = true;
        collisionProgress = elapsed / this.collisionEffect.duration;
      }
    }

    const glowRadius = radius + 6;
    const gradient = ctx.createRadialGradient(px, py, radius * 0.5, px, py, glowRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    let bodyColor = '#4a90d9';
    if (isColliding) {
      const flash = Math.sin(collisionProgress * Math.PI * 8) > 0;
      bodyColor = flash ? '#ff4444' : '#4a90d9';
    }

    ctx.save();
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(px - radius * 0.3, py - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getPlayerPosition(): { x: number; y: number } {
    return { x: this.playerX, y: this.playerY };
  }
}
