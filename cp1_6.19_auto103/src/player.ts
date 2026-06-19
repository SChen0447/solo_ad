import { Poolable } from './objectPool';

export interface PlayerStats {
  maxHealth: number;
  maxShield: number;
  fireRate: number;
  bulletSpeed: number;
  bulletDamage: number;
  moveSpeed: number;
  nanoRegen: number;
}

export interface Weapon {
  name: string;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  spread: number;
  ammo: number;
  maxAmmo: number;
  color: string;
  glowColor: string;
}

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number;

  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  shieldRegenDelay: number;
  shieldRegenTimer: number;
  shieldRegenRate: number;

  speed: number;
  friction: number;

  weapons: Weapon[];
  currentWeapon: number;
  fireCooldown: number;

  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;

  shieldUpgradeLevel: number;
  fireRateUpgradeLevel: number;
  nanoRegenLevel: number;
  nanoRegenRate: number;
  nanoRegenTimer: number;

  invincible: number;
  hitFlash: number;

  engineParticleTimer: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = 18;

    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.shieldRegenDelay = 3;
    this.shieldRegenTimer = 0;
    this.shieldRegenRate = 10;

    this.speed = 280;
    this.friction = 0.92;

    this.weapons = [
      {
        name: '脉冲炮',
        damage: 12,
        fireRate: 0.18,
        bulletSpeed: 650,
        spread: 0.02,
        ammo: 999,
        maxAmmo: 999,
        color: '#00ddff',
        glowColor: 'rgba(0, 220, 255, 0.6)'
      },
      {
        name: '散弹枪',
        damage: 8,
        fireRate: 0.5,
        bulletSpeed: 550,
        spread: 0.25,
        ammo: 30,
        maxAmmo: 60,
        color: '#ffaa00',
        glowColor: 'rgba(255, 170, 0, 0.6)'
      }
    ];
    this.currentWeapon = 0;
    this.fireCooldown = 0;

    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;

    this.shieldUpgradeLevel = 0;
    this.fireRateUpgradeLevel = 0;
    this.nanoRegenLevel = 0;
    this.nanoRegenRate = 0;
    this.nanoRegenTimer = 0;

    this.invincible = 0;
    this.hitFlash = 0;
    this.engineParticleTimer = 0;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    let ax = 0;
    let ay = 0;

    if (this.keys.has('w') || this.keys.has('W') || this.keys.has('ArrowUp')) ay -= 1;
    if (this.keys.has('s') || this.keys.has('S') || this.keys.has('ArrowDown')) ay += 1;
    if (this.keys.has('a') || this.keys.has('A') || this.keys.has('ArrowLeft')) ax -= 1;
    if (this.keys.has('d') || this.keys.has('D') || this.keys.has('ArrowRight')) ax += 1;

    const mag = Math.sqrt(ax * ax + ay * ay);
    if (mag > 0) {
      ax /= mag;
      ay /= mag;
    }

    this.vx += ax * this.speed * dt * 3;
    this.vy += ay * this.speed * dt * 3;

    this.vx *= this.friction;
    this.vy *= this.friction;

    const speedLimit = this.speed;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > speedLimit) {
      this.vx = (this.vx / currentSpeed) * speedLimit;
      this.vy = (this.vy / currentSpeed) * speedLimit;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < this.radius) { this.x = this.radius; this.vx = 0; }
    if (this.x > canvasWidth - this.radius) { this.x = canvasWidth - this.radius; this.vx = 0; }
    if (this.y < this.radius) { this.y = this.radius; this.vy = 0; }
    if (this.y > canvasHeight - this.radius) { this.y = canvasHeight - this.radius; this.vy = 0; }

    this.angle = Math.atan2(this.mouseY - this.y, this.mouseX - this.x);

    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    if (this.shieldRegenTimer > 0) {
      this.shieldRegenTimer -= dt;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
    }

    if (this.nanoRegenLevel > 0 && this.health < this.maxHealth) {
      this.nanoRegenTimer += dt;
      if (this.nanoRegenTimer >= 1) {
        this.nanoRegenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + this.nanoRegenRate);
      }
    }

    if (this.invincible > 0) {
      this.invincible -= dt;
    }
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }

    this.engineParticleTimer += dt;
  }

  tryShoot(): boolean {
    if (this.fireCooldown > 0) return false;
    const weapon = this.weapons[this.currentWeapon];
    if (weapon.ammo <= 0 && weapon.maxAmmo !== 999) return false;

    this.fireCooldown = weapon.fireRate;
    if (weapon.maxAmmo !== 999) {
      weapon.ammo--;
    }
    return true;
  }

  getBulletCount(): number {
    const weapon = this.weapons[this.currentWeapon];
    if (weapon.name === '散弹枪') return 5;
    return 1;
  }

  getBulletSpread(): number {
    return this.weapons[this.currentWeapon].spread;
  }

  getBulletDamage(): number {
    return this.weapons[this.currentWeapon].damage;
  }

  getBulletSpeed(): number {
    return this.weapons[this.currentWeapon].bulletSpeed;
  }

  getBulletColor(): string {
    return this.weapons[this.currentWeapon].color;
  }

  getBulletGlowColor(): string {
    return this.weapons[this.currentWeapon].glowColor;
  }

  switchWeapon(index: number): void {
    if (index >= 0 && index < this.weapons.length) {
      this.currentWeapon = index;
      this.fireCooldown = 0.2;
    }
  }

  takeDamage(amount: number): boolean {
    if (this.invincible > 0) return false;

    this.shieldRegenTimer = this.shieldRegenDelay;
    this.hitFlash = 0.15;

    if (this.shield > 0) {
      if (this.shield >= amount) {
        this.shield -= amount;
        return false;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
    }

    this.health -= amount;
    this.invincible = 0.5;

    return this.health <= 0;
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addAmmo(amount: number): void {
    for (const weapon of this.weapons) {
      if (weapon.maxAmmo !== 999) {
        weapon.ammo = Math.min(weapon.maxAmmo, weapon.ammo + amount);
      }
    }
  }

  upgradeShield(): void {
    if (this.shieldUpgradeLevel >= 3) return;
    this.shieldUpgradeLevel++;
    this.maxShield += 30;
    this.shield = this.maxShield;
  }

  upgradeFireRate(): void {
    if (this.fireRateUpgradeLevel >= 3) return;
    this.fireRateUpgradeLevel++;
    for (const weapon of this.weapons) {
      weapon.fireRate *= 0.8;
    }
  }

  upgradeNanoRegen(): void {
    if (this.nanoRegenLevel >= 3) return;
    this.nanoRegenLevel++;
    this.nanoRegenRate = this.nanoRegenLevel * 2;
  }

  getShieldCost(): number {
    return 50 + this.shieldUpgradeLevel * 40;
  }

  getFireRateCost(): number {
    return 60 + this.fireRateUpgradeLevel * 50;
  }

  getNanoRegenCost(): number {
    return 70 + this.nanoRegenLevel * 55;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.shield > 0) {
      const shieldAlpha = (this.shield / this.maxShield) * 0.4 + 0.1;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${shieldAlpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const flashColor = this.hitFlash > 0 ? '#ffffff' : '#7ec8ff';

    ctx.fillStyle = flashColor;
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1a3a5a';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -8);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#00ddff';
    ctx.shadowColor = '#00ddff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    if (this.keys.has('w') || this.keys.has('W') || this.keys.has('s') || this.keys.has('S') ||
        this.keys.has('a') || this.keys.has('A') || this.keys.has('d') || this.keys.has('D')) {
      ctx.fillStyle = '#ff6600';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(-22 - Math.random() * 6, 0);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.beginPath();
      ctx.moveTo(-10, -3);
      ctx.lineTo(-16 - Math.random() * 4, 0);
      ctx.lineTo(-10, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

export class PlayerBullet implements Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  active: boolean;
  color: string;
  glowColor: string;
  trail: { x: number; y: number }[];
  trailLength: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 4;
    this.damage = 10;
    this.active = false;
    this.color = '#00ddff';
    this.glowColor = 'rgba(0, 220, 255, 0.6)';
    this.trail = [];
    this.trailLength = 6;
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
      const alpha = (1 - i / this.trail.length) * 0.5;
      const size = this.radius * (1 - i / this.trail.length * 0.6);
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 220, 255, ${alpha})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
