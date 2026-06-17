import { TowerType, TOWER_CONFIGS, Point } from '../config';
import { Enemy } from './Enemy';

export interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetEnemy: Enemy | null;
  speed: number;
  damage: number;
  type: TowerType;
  splash?: number;
  slow?: number;
  slowDuration?: number;
  trail: Point[];
  dead: boolean;
}

export interface TowerSlot {
  x: number;
  y: number;
  tower: Tower | null;
}

export class Tower {
  x: number;
  y: number;
  type: TowerType;
  level: number;
  maxLevel: number;
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  color: string;
  splash?: number;
  slow?: number;
  slowDuration?: number;
  lastFireTime: number;
  target: Enemy | null;
  angle: number;
  totalCost: number;
  fireAnim: number;

  constructor(x: number, y: number, type: TowerType) {
    const config = TOWER_CONFIGS[type];
    this.x = x;
    this.y = y;
    this.type = type;
    this.level = 1;
    this.maxLevel = 3;
    this.damage = config.damage;
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.projectileSpeed = config.projectileSpeed;
    this.color = config.color;
    this.splash = config.splash;
    this.slow = config.slow;
    this.slowDuration = config.slowDuration;
    this.lastFireTime = 0;
    this.target = null;
    this.angle = 0;
    this.totalCost = config.cost;
    this.fireAnim = 0;
  }

  getUpgradeCost(): number {
    if (this.level >= this.maxLevel) return 0;
    return Math.floor(TOWER_CONFIGS[this.type].cost * 0.75 * this.level);
  }

  upgrade(): boolean {
    if (this.level >= this.maxLevel) return false;
    const cost = this.getUpgradeCost();
    this.level++;
    this.damage = Math.floor(this.damage * 1.3);
    this.range = Math.floor(this.range * 1.1);
    this.fireRate = Math.floor(this.fireRate * 0.9);
    this.totalCost += cost;
    return true;
  }

  update(dt: number, enemies: Enemy[], currentTime: number): Projectile | null {
    if (this.fireAnim > 0) {
      this.fireAnim -= dt;
    }

    if (this.target && (this.target.dead || this.target.reachedWall || this.distanceTo(this.target) > this.range)) {
      this.target = null;
    }

    if (!this.target) {
      this.target = this.findTarget(enemies);
    }

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      this.angle = Math.atan2(dy, dx);

      if (currentTime - this.lastFireTime >= this.fireRate) {
        this.lastFireTime = currentTime;
        this.fireAnim = 200;
        return this.createProjectile(this.target);
      }
    }

    return null;
  }

  private findTarget(enemies: Enemy[]): Enemy | null {
    let closest: Enemy | null = null;
    let closestProgress = -1;

    for (const enemy of enemies) {
      if (enemy.dead || enemy.reachedWall) continue;
      if (this.distanceTo(enemy) <= this.range) {
        const progress = enemy.pathIndex + (1 - this.distanceTo(enemy) / this.range);
        if (progress > closestProgress) {
          closestProgress = progress;
          closest = enemy;
        }
      }
    }

    return closest;
  }

  private distanceTo(enemy: Enemy): number {
    const dx = enemy.x - this.x;
    const dy = enemy.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createProjectile(target: Enemy): Projectile {
    return {
      x: this.x,
      y: this.y - 15,
      targetX: target.x,
      targetY: target.y,
      targetEnemy: target,
      speed: this.projectileSpeed,
      damage: this.damage,
      type: this.type,
      splash: this.splash,
      slow: this.slow,
      slowDuration: this.slowDuration,
      trail: [],
      dead: false
    };
  }

  draw(ctx: CanvasRenderingContext2D, isHovered: boolean, isSelected: boolean): void {
    ctx.save();

    if (isSelected) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (isHovered || isSelected) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 15;
    }

    if (this.type === 'archer') {
      this.drawArcher(ctx);
    } else if (this.type === 'catapult') {
      this.drawCatapult(ctx);
    } else {
      this.drawMagicTower(ctx);
    }

    this.drawLevelBadge(ctx);
    ctx.restore();
  }

  private drawArcher(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(this.x - 18, this.y - 5, 36, 25);

    ctx.fillStyle = '#A0826D';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(this.x - 18 + i * 10, this.y - 12, 8, 10);
    }

    ctx.save();
    ctx.translate(this.x, this.y - 5);
    ctx.rotate(this.angle);
    const recoil = this.fireAnim > 0 ? -3 : 0;
    ctx.strokeStyle = '#5C4033';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(15 + recoil, 0, 12, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.stroke();
    ctx.strokeStyle = '#DEB887';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15 + recoil, -10);
    ctx.lineTo(15 + recoil, 10);
    ctx.stroke();
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(3 + recoil, -1, 14, 2);
    ctx.restore();
  }

  private drawCatapult(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#654321';
    ctx.fillRect(this.x - 22, this.y, 44, 18);

    ctx.fillStyle = '#3D2914';
    ctx.beginPath();
    ctx.arc(this.x - 15, this.y + 20, 7, 0, Math.PI * 2);
    ctx.arc(this.x + 15, this.y + 20, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    const armAngle = this.fireAnim > 0 ? -0.3 : this.angle * 0.3 - 0.8;
    ctx.rotate(armAngle);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-3, -30, 6, 35);
    ctx.fillStyle = '#2F1810';
    ctx.beginPath();
    ctx.arc(0, -32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMagicTower(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#4A3728';
    ctx.beginPath();
    ctx.moveTo(this.x - 18, this.y + 20);
    ctx.lineTo(this.x - 14, this.y - 25);
    ctx.lineTo(this.x + 14, this.y - 25);
    ctx.lineTo(this.x + 18, this.y + 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9932CC';
    ctx.beginPath();
    ctx.moveTo(this.x - 16, this.y - 25);
    ctx.lineTo(this.x, this.y - 45);
    ctx.lineTo(this.x + 16, this.y - 25);
    ctx.closePath();
    ctx.fill();

    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    ctx.shadowColor = '#9932CC';
    ctx.shadowBlur = 15 * pulse;
    ctx.fillStyle = `rgba(186, 85, 211, ${pulse})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(this.x, this.y - 10);
    ctx.rotate(this.angle);
    ctx.strokeStyle = `rgba(200, 150, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.restore();
  }

  private drawLevelBadge(ctx: CanvasRenderingContext2D): void {
    const badgeX = this.x + 15;
    const badgeY = this.y - 25;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#5C4033';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.level.toString(), badgeX, badgeY);
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - (this.y - 5);
    return dx * dx + dy * dy <= 30 * 30;
  }
}
