import { Poolable } from './objectPool';

export class EnemyBullet implements Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  active: boolean;
  color: string;
  trail: { x: number; y: number }[];
  trailLength: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 5;
    this.damage = 10;
    this.active = false;
    this.color = '#ff4466';
    this.trail = [];
    this.trailLength = 5;
  }

  reset(): void {
    this.trail = [];
  }

  update(dt: number): void {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  isOffScreen(width: number, height: number): boolean {
    return this.x < -20 || this.x > width + 20 || this.y < -20 || this.y > height + 20;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const alpha = (1 - i / this.trail.length) * 0.4;
      const size = this.radius * (1 - i / this.trail.length * 0.5);
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 60, 100, ${alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export enum EnemyType {
  SCOUT = 'scout',
  BOMBER = 'bomber',
  ELITE = 'elite'
}

export abstract class Enemy implements Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  scoreValue: number;
  coinValue: number;
  active: boolean;
  type: EnemyType;
  angle: number;
  fireTimer: number;
  fireRate: number;
  hitFlash: number;
  rotationSpeed: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 20;
    this.health = 30;
    this.maxHealth = 30;
    this.damage = 15;
    this.speed = 100;
    this.scoreValue = 10;
    this.coinValue = 5;
    this.active = false;
    this.type = EnemyType.SCOUT;
    this.angle = 0;
    this.fireTimer = 0;
    this.fireRate = 2;
    this.hitFlash = 0;
    this.rotationSpeed = 0;
  }

  reset(): void {
    this.hitFlash = 0;
  }

  abstract update(dt: number, playerX: number, playerY: number, canvasWidth: number, canvasHeight: number): void;

  abstract tryShoot(): boolean;

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.hitFlash = 0.1;
    return this.health <= 0;
  }

  isOffScreen(width: number, height: number): boolean {
    return this.x < -100 || this.x > width + 100 || this.y < -100 || this.y > height + 100;
  }

  abstract draw(ctx: CanvasRenderingContext2D): void;
}

export class Scout extends Enemy {
  private zigzagTimer: number;
  private zigzagPhase: number;

  constructor() {
    super();
    this.type = EnemyType.SCOUT;
    this.radius = 16;
    this.health = 25;
    this.maxHealth = 25;
    this.speed = 180;
    this.damage = 10;
    this.scoreValue = 15;
    this.coinValue = 8;
    this.fireRate = 1.5;
    this.zigzagTimer = 0;
    this.zigzagPhase = 0;
  }

  reset(): void {
    super.reset();
    this.zigzagTimer = 0;
    this.zigzagPhase = Math.random() * Math.PI * 2;
  }

  update(dt: number, playerX: number, playerY: number, canvasWidth: number, canvasHeight: number): void {
    this.zigzagTimer += dt;
    this.zigzagPhase += dt * 3;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 180) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    } else {
      this.vx = -(dx / dist) * this.speed * 0.5;
      this.vy = -(dy / dist) * this.speed * 0.5;
    }

    const perpX = -dy / dist;
    const perpY = dx / dist;
    const zigzag = Math.sin(this.zigzagPhase) * this.speed * 0.5;
    this.vx += perpX * zigzag;
    this.vy += perpY * zigzag;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.angle = Math.atan2(dy, dx);

    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }
  }

  tryShoot(): boolean {
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flashColor = this.hitFlash > 0 ? '#ffffff' : '#ff6677';

    ctx.fillStyle = flashColor;
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8a1a2a';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -6);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const barWidth = 30;
    const barHeight = 4;
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = 'rgba(40, 10, 20, 0.8)';
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 12, barWidth, barHeight);
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 4;
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 12, barWidth * healthPercent, barHeight);
    ctx.shadowBlur = 0;
  }
}

export class Bomber extends Enemy {
  private targetY: number;
  private movePhase: number;

  constructor() {
    super();
    this.type = EnemyType.BOMBER;
    this.radius = 28;
    this.health = 80;
    this.maxHealth = 80;
    this.speed = 70;
    this.damage = 25;
    this.scoreValue = 30;
    this.coinValue = 18;
    this.fireRate = 2.5;
    this.targetY = 0;
    this.movePhase = 0;
  }

  reset(): void {
    super.reset();
    this.movePhase = Math.random() * Math.PI * 2;
  }

  setTargetY(y: number): void {
    this.targetY = y;
  }

  update(dt: number, playerX: number, playerY: number, canvasWidth: number, canvasHeight: number): void {
    this.movePhase += dt * 1.5;

    if (this.y < this.targetY - 10) {
      this.vy = this.speed;
    } else if (this.y > this.targetY + 10) {
      this.vy = -this.speed;
    } else {
      this.vy = Math.sin(this.movePhase) * this.speed * 0.3;
    }

    const dx = playerX - this.x;
    this.vx = Math.sign(dx) * this.speed * 0.2;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 50) this.x = 50;
    if (this.x > canvasWidth - 50) this.x = canvasWidth - 50;

    this.angle = Math.atan2(playerY - this.y, playerX - this.x);

    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }
  }

  tryShoot(): boolean {
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      return true;
    }
    return false;
  }

  getBulletCount(): number {
    return 3;
  }

  getSpread(): number {
    return 0.3;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flashColor = this.hitFlash > 0 ? '#ffffff' : '#cc4455';

    ctx.fillStyle = flashColor;
    ctx.shadowColor = '#aa2244';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(10, -18);
    ctx.lineTo(-20, -22);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-20, 22);
    ctx.lineTo(10, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#5a1a2a';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(2, -12);
    ctx.lineTo(-12, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 14);
    ctx.lineTo(2, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ff8833';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff4455';
    ctx.shadowBlur = 4;
    ctx.fillRect(-16, -20, 8, 8);
    ctx.fillRect(-16, 12, 8, 8);

    ctx.restore();

    const barWidth = 50;
    const barHeight = 5;
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = 'rgba(40, 10, 20, 0.8)';
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 14, barWidth, barHeight);
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 4;
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 14, barWidth * healthPercent, barHeight);
    ctx.shadowBlur = 0;
  }
}

export class Elite extends Enemy {
  private orbitAngle: number;
  private orbitRadius: number;
  private orbitSpeed: number;
  private dashTimer: number;
  private isDashing: boolean;
  private dashDuration: number;

  constructor() {
    super();
    this.type = EnemyType.ELITE;
    this.radius = 24;
    this.health = 120;
    this.maxHealth = 120;
    this.speed = 140;
    this.damage = 20;
    this.scoreValue = 50;
    this.coinValue = 35;
    this.fireRate = 0.8;
    this.orbitAngle = 0;
    this.orbitRadius = 250;
    this.orbitSpeed = 0.8;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.4;
  }

  reset(): void {
    super.reset();
    this.dashTimer = 0;
    this.isDashing = false;
    this.orbitAngle = Math.random() * Math.PI * 2;
  }

  update(dt: number, playerX: number, playerY: number, canvasWidth: number, canvasHeight: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.dashTimer -= dt;

    if (this.isDashing) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
      }
    } else if (this.dashTimer <= 0 && dist > 150 && dist < 350) {
      this.isDashing = true;
      this.dashDuration = 0.4;
      this.dashTimer = 3 + Math.random() * 2;
    }

    if (this.isDashing) {
      this.vx = (dx / dist) * this.speed * 2.5;
      this.vy = (dy / dist) * this.speed * 2.5;
    } else {
      this.orbitAngle += this.orbitSpeed * dt;

      const targetX = playerX + Math.cos(this.orbitAngle) * this.orbitRadius;
      const targetY = playerY + Math.sin(this.orbitAngle) * this.orbitRadius;

      const tdx = targetX - this.x;
      const tdy = targetY - this.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);

      if (tdist > 5) {
        this.vx = (tdx / tdist) * this.speed;
        this.vy = (tdy / tdist) * this.speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 30) { this.x = 30; this.vx = Math.abs(this.vx); }
    if (this.x > canvasWidth - 30) { this.x = canvasWidth - 30; this.vx = -Math.abs(this.vx); }
    if (this.y < 30) { this.y = 30; this.vy = Math.abs(this.vy); }
    if (this.y > canvasHeight - 30) { this.y = canvasHeight - 30; this.vy = -Math.abs(this.vy); }

    this.angle = Math.atan2(dy, dx);

    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }
  }

  tryShoot(): boolean {
    if (this.fireTimer <= 0 && !this.isDashing) {
      this.fireTimer = this.fireRate;
      return true;
    }
    return false;
  }

  getBulletCount(): number {
    return 2;
  }

  getSpread(): number {
    return 0.15;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flashColor = this.hitFlash > 0 ? '#ffffff' : '#aa66ff';

    ctx.fillStyle = flashColor;
    ctx.shadowColor = '#8844dd';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.lineTo(10, -14);
    ctx.lineTo(-10, -18);
    ctx.lineTo(-18, -10);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-18, 10);
    ctx.lineTo(-10, 18);
    ctx.lineTo(10, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3a1a5a';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(4, -10);
    ctx.lineTo(-6, -12);
    ctx.lineTo(-12, -6);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-12, 6);
    ctx.lineTo(-6, 12);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.isDashing ? '#ff00ff' : '#dd88ff';
    ctx.shadowColor = this.isDashing ? '#ff00ff' : '#aa44dd';
    ctx.shadowBlur = this.isDashing ? 16 : 8;
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff44ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(-14, -16, 6, 6);
    ctx.fillRect(-14, 10, 6, 6);

    ctx.restore();

    const barWidth = 48;
    const barHeight = 5;
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = 'rgba(60, 20, 80, 0.8)';
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 14, barWidth, barHeight);
    ctx.fillStyle = '#cc66ff';
    ctx.shadowColor = '#aa44dd';
    ctx.shadowBlur = 4;
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 14, barWidth * healthPercent, barHeight);
    ctx.shadowBlur = 0;
  }
}
