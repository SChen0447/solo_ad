import {
  ENEMY_CONFIGS,
  EnemyType,
  EnemyConfig,
  PATH_POINTS,
  gridToPixel
} from './config';

export class Enemy {
  private type: EnemyType;
  private config: EnemyConfig;
  private health: number;
  private maxHealth: number;
  private pathIndex: number;
  private x: number;
  private y: number;
  private alive: boolean;
  private reachedEnd: boolean;
  private slowMultiplier: number;
  private slowEndTime: number;
  private hitFlash: number;

  constructor(type: EnemyType) {
    this.type = type;
    this.config = ENEMY_CONFIGS[type];
    this.health = this.config.health;
    this.maxHealth = this.config.health;
    this.pathIndex = 0;
    this.alive = true;
    this.reachedEnd = false;
    this.slowMultiplier = 1;
    this.slowEndTime = 0;
    this.hitFlash = 0;

    const start = gridToPixel(PATH_POINTS[0].x, PATH_POINTS[0].y);
    this.x = start.x;
    this.y = start.y;
  }

  getX(): number { return this.x; }
  getY(): number { return this.y; }
  getType(): EnemyType { return this.type; }
  getHealth(): number { return this.health; }
  getMaxHealth(): number { return this.maxHealth; }
  getScore(): number { return this.config.score; }
  isAlive(): boolean { return this.alive; }
  hasReachedEnd(): boolean { return this.reachedEnd; }
  getSize(): number { return this.config.size; }

  takeDamage(damage: number, currentTime: number): void {
    if (!this.alive) return;
    this.health -= damage;
    this.hitFlash = currentTime;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  applySlow(percent: number, duration: number, currentTime: number): void {
    const newMultiplier = 1 - percent;
    if (newMultiplier < this.slowMultiplier) {
      this.slowMultiplier = newMultiplier;
    }
    this.slowEndTime = Math.max(this.slowEndTime, currentTime + duration * 1000);
  }

  update(currentTime: number): void {
    if (!this.alive || this.reachedEnd) return;

    if (currentTime > this.slowEndTime) {
      this.slowMultiplier = 1;
    }

    if (this.pathIndex >= PATH_POINTS.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      return;
    }

    const target = gridToPixel(
      PATH_POINTS[this.pathIndex + 1].x,
      PATH_POINTS[this.pathIndex + 1].y
    );

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = this.config.speed * this.slowMultiplier;

    if (dist <= speed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
    if (!this.alive && !this.reachedEnd) return;

    const size = this.config.size;
    let color = this.config.color;

    if (currentTime - this.hitFlash < 100) {
      color = '#ffffff';
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();

    if (this.slowMultiplier < 1) {
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, size + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const barWidth = 20;
    const barHeight = 3;
    const barY = this.y - size - 6;

    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

    const healthPercent = this.health / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#66ff66' : healthPercent > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }
}
