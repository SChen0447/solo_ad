import {
  TOWER_CONFIGS,
  TowerType,
  TowerConfig,
  UPGRADE_DAMAGE_MULTIPLIER,
  UPGRADE_FIRERATE_MULTIPLIER,
  UPGRADE_COST_MULTIPLIER,
  MAX_TOWER_LEVEL,
  SELL_RETURN_RATIO,
  gridToPixel
} from './config';
import type { Enemy } from './Enemy';

export interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  color: string;
  splashRadius?: number;
  slowPercent?: number;
  slowDuration?: number;
  targetEnemy?: Enemy;
}

export class Tower {
  private gridX: number;
  private gridY: number;
  private type: TowerType;
  private level: number;
  private damage: number;
  private fireRate: number;
  private range: number;
  private lastFireTime: number;
  private totalCost: number;
  private config: TowerConfig;
  private x: number;
  private y: number;
  private target: Enemy | null;
  private animationScale: number;

  constructor(gridX: number, gridY: number, type: TowerType) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.type = type;
    this.level = 1;
    this.config = TOWER_CONFIGS[type];
    this.damage = this.config.damage;
    this.fireRate = this.config.fireRate;
    this.range = this.config.range;
    this.lastFireTime = 0;
    this.totalCost = this.config.cost;
    this.animationScale = 0;
    this.target = null;

    const pos = gridToPixel(gridX, gridY);
    this.x = pos.x;
    this.y = pos.y;
  }

  getGridX(): number { return this.gridX; }
  getGridY(): number { return this.gridY; }
  getType(): TowerType { return this.type; }
  getLevel(): number { return this.level; }
  getDamage(): number { return this.damage; }
  getFireRate(): number { return this.fireRate; }
  getRange(): number { return this.range; }
  getConfig(): TowerConfig { return this.config; }
  getName(): string { return this.config.name; }
  getTotalCost(): number { return this.totalCost; }
  getX(): number { return this.x; }
  getY(): number { return this.y; }
  getAnimationScale(): number { return this.animationScale; }
  getTarget(): Enemy | null { return this.target; }

  canUpgrade(): boolean {
    return this.level < MAX_TOWER_LEVEL;
  }

  getUpgradeCost(): number {
    if (!this.canUpgrade()) return 0;
    return Math.floor(this.config.cost * Math.pow(UPGRADE_COST_MULTIPLIER, this.level));
  }

  upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    const cost = this.getUpgradeCost();
    this.level++;
    this.damage = Math.floor(this.damage * UPGRADE_DAMAGE_MULTIPLIER);
    this.fireRate = this.fireRate * UPGRADE_FIRERATE_MULTIPLIER;
    this.totalCost += cost;
    this.animationScale = 1;
    return true;
  }

  getSellValue(): number {
    return Math.floor(this.totalCost * SELL_RETURN_RATIO);
  }

  findTarget(enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dx = enemy.getX() - this.x;
      const dy = enemy.getY() - this.y;
      const distSq = dx * dx + dy * dy;
      const rangeSq = this.range * this.range;

      if (distSq <= rangeSq && distSq < closestDist) {
        closest = enemy;
        closestDist = distSq;
      }
    }

    return closest;
  }

  update(currentTime: number, enemies: Enemy[], projectiles: Projectile[]): void {
    this.animationScale = Math.max(0, this.animationScale - 0.05);

    const fireInterval = 1000 / this.fireRate;
    const target = this.findTarget(enemies);
    this.target = target;

    if (target && currentTime - this.lastFireTime >= fireInterval) {
      this.lastFireTime = currentTime;
      this.fire(target, projectiles);
    }
  }

  private fire(target: Enemy, projectiles: Projectile[]): void {
    const projectile: Projectile = {
      x: this.x,
      y: this.y,
      targetX: target.getX(),
      targetY: target.getY(),
      speed: 8,
      damage: this.damage,
      color: this.config.color,
      splashRadius: this.config.splashRadius,
      slowPercent: this.config.slowPercent,
      slowDuration: this.config.slowDuration,
      targetEnemy: target
    };
    projectiles.push(projectile);
  }

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean): void {
    const size = this.config.size;
    const scale = 1 + this.animationScale * 0.3;
    const halfSize = (size / 2) * scale;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (isSelected) {
      ctx.strokeStyle = '#f0c040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.range, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.config.color;

    switch (this.config.shape) {
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -halfSize);
        ctx.lineTo(halfSize, halfSize);
        ctx.lineTo(-halfSize, halfSize);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(-halfSize, -halfSize, size * scale, size * scale);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -halfSize);
        ctx.lineTo(halfSize, 0);
        ctx.lineTo(0, halfSize);
        ctx.lineTo(-halfSize, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }

    if (this.level > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Consolas';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.level.toString(), 0, 0);
    }

    ctx.restore();
  }
}
