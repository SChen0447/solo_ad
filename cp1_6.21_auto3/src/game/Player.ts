import Phaser from 'phaser';
import { InputState } from '../input/InputHandler';

export interface PlayerStats {
  maxShield: number;
  shieldDamageReduction: number;
  weaponDamage: number;
  fireRate: number;
  hasTurret: boolean;
  turretCount: number;
  turretDamage: number;
  turretFireRate: number;
  speed: number;
}

export type PlayerHitCallback = (damage: number) => void;
export type PlayerShootCallback = (x: number, y: number, angle: number, damage: number) => void;

export class Player {
  private scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Container;
  private shipSprite!: Phaser.GameObjects.Graphics;
  private engineParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  public x: number;
  public y: number;
  private width: number = 50;
  private height: number = 60;

  public stats: PlayerStats;

  private shield: number;
  private lastFireTime: number = 0;
  private lastTurretFireTime: number = 0;

  private hitCallbacks: PlayerHitCallback[] = [];
  private shootCallbacks: PlayerShootCallback[] = [];

  private isEmergency: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.stats = {
      maxShield: 100,
      shieldDamageReduction: 0,
      weaponDamage: 10,
      fireRate: 300,
      hasTurret: false,
      turretCount: 0,
      turretDamage: 5,
      turretFireRate: 800,
      speed: 300,
    };

    this.shield = this.stats.maxShield;
    this.sprite = scene.add.container(x, y);
    this.createShipSprite();
    this.createEngineParticles();
  }

  private createShipSprite(): void {
    const graphics = this.scene.add.graphics();
    this.shipSprite = graphics;

    graphics.fillStyle(0x00d4ff, 1);
    graphics.beginPath();
    graphics.moveTo(0, -30);
    graphics.lineTo(-20, 20);
    graphics.lineTo(-8, 15);
    graphics.lineTo(-8, 25);
    graphics.lineTo(8, 25);
    graphics.lineTo(8, 15);
    graphics.lineTo(20, 20);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(0xffffff, 0.8);
    graphics.beginPath();
    for (let i = 0; i <= 360; i += 10) {
      const rad = Phaser.Math.DegToRad(i);
      const px = Math.cos(rad) * 8;
      const py = Math.sin(rad) * 12 - 5;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(0x0088ff, 0.6);
    graphics.beginPath();
    graphics.moveTo(-6, 20);
    graphics.lineTo(0, 35);
    graphics.lineTo(6, 20);
    graphics.closePath();
    graphics.fillPath();

    this.sprite.add(graphics);
  }

  private createEngineParticles(): void {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 100 },
      angle: { min: 80, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 400,
      quantity: 2,
      frequency: 50,
      tint: 0x00d4ff,
    });

    this.sprite.add(particles);
    particles.setPosition(0, 25);
    this.engineParticles = particles;
  }

  public update(delta: number, input: InputState): void {
    const moveSpeed = this.stats.speed * (delta / 1000);
    this.x += input.direction.x * moveSpeed;
    this.y += input.direction.y * moveSpeed;

    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    this.x = Phaser.Math.Clamp(this.x, 30, gameWidth - 30);
    this.y = Phaser.Math.Clamp(this.y, 30, gameHeight - 30);

    this.sprite.setPosition(this.x, this.y);

    const isMoving = input.direction.x !== 0 || input.direction.y !== 0;
    if (this.engineParticles) {
      if (isMoving) {
        this.engineParticles.start();
      } else {
        this.engineParticles.stop();
      }
    }

    if (input.isShooting) {
      this.tryShoot(input.mouseX, input.mouseY);
    }
  }

  private tryShoot(targetX: number, targetY: number): void {
    const now = this.scene.time.now;
    if (now - this.lastFireTime < this.stats.fireRate) return;

    this.lastFireTime = now;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.shootCallbacks.forEach((cb) => cb(this.x, this.y - 30, angle, this.stats.weaponDamage));
  }

  public turretShoot(targetX: number, targetY: number): void {
    const now = this.scene.time.now;
    if (now - this.lastTurretFireTime < this.stats.turretFireRate) return;
    if (!this.stats.hasTurret) return;

    this.lastTurretFireTime = now;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.shootCallbacks.forEach((cb) =>
      cb(this.x, this.y, angle, this.stats.turretDamage)
    );
  }

  public takeDamage(damage: number): void {
    const actualDamage = damage * (1 - this.stats.shieldDamageReduction);
    this.shield -= actualDamage;

    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
    });

    this.hitCallbacks.forEach((cb) => cb(actualDamage));

    if (this.shield <= 30 && !this.isEmergency) {
      this.isEmergency = true;
    } else if (this.shield > 30 && this.isEmergency) {
      this.isEmergency = false;
    }
  }

  public getShield(): number {
    return Math.max(0, this.shield);
  }

  public getShieldPercent(): number {
    return Math.max(0, this.shield / this.stats.maxShield);
  }

  public isDead(): boolean {
    return this.shield <= 0;
  }

  public isInEmergency(): boolean {
    return this.shield <= 30 && this.shield > 0;
  }

  public onHit(callback: PlayerHitCallback): void {
    this.hitCallbacks.push(callback);
  }

  public onShoot(callback: PlayerShootCallback): void {
    this.shootCallbacks.push(callback);
  }

  public applyShieldUpgrade(level: number): void {
    this.stats.maxShield = 100 + level * 40;
    this.stats.shieldDamageReduction = level * 0.1;
    if (this.shield > this.stats.maxShield) {
      this.shield = this.stats.maxShield;
    }
  }

  public applyWeaponUpgrade(level: number): void {
    this.stats.weaponDamage = 10 + level * 8;
    this.stats.fireRate = Math.max(100, 300 - level * 40);
  }

  public applyTurretUpgrade(level: number): void {
    this.stats.hasTurret = level > 0;
    this.stats.turretCount = level;
    this.stats.turretDamage = 5 + level * 4;
    this.stats.turretFireRate = Math.max(300, 800 - level * 150);
  }

  public heal(amount: number): void {
    this.shield = Math.min(this.stats.maxShield, this.shield + amount);
  }

  public reset(): void {
    this.shield = this.stats.maxShield;
    this.x = this.scene.scale.width / 2;
    this.y = this.scene.scale.height / 2;
    this.sprite.setPosition(this.x, this.y);
    this.isEmergency = false;
    this.sprite.setAlpha(1);
  }

  public getBounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, 25);
  }

  public destroy(): void {
    this.sprite.destroy();
    this.hitCallbacks = [];
    this.shootCallbacks = [];
  }
}
