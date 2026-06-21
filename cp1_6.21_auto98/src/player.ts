import Phaser from 'phaser';
import { BulletPool } from './bullet';

export interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  score: number;
  isGameOver: boolean;
  bulletTimeActive: boolean;
  bulletTimeRemaining: number;
  bulletTimeMaxDuration: number;
  isDashing: boolean;
  isInvincible: boolean;
}

export enum PlayerStatus {
  IDLE = 'idle',
  MOVING = 'moving',
  DASH_WINDUP = 'dash_windup',
  DASHING = 'dashing',
  SHOOTING = 'shooting'
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  public health: number = 100;
  public maxHealth: number = 100;
  public stamina: number = 100;
  public maxStamina: number = 100;
  public score: number = 0;
  public isGameOver: boolean = false;

  public bulletTimeActive: boolean = false;
  public bulletTimeRemaining: number = 0;
  public bulletTimeMaxDuration: number = 3;
  public bulletTimeCooldown: number = 0;
  public bulletTimeCooldownMax: number = 10;

  public status: PlayerStatus = PlayerStatus.IDLE;

  private moveSpeed: number = 280;
  private baseMoveSpeed: number = 280;
  private dashSpeed: number = 650;
  private dashWindupDuration: number = 0.2;
  private dashDuration: number = 0.35;
  private dashInvincibilityDuration: number = 0.3;
  private dashCooldown: number = 2;
  private dashTimer: number = 0;
  private dashCooldownTimer: number = 0;
  private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  private staminaRecoveryRate: number = 15;
  private dashStaminaCost: number = 30;
  private specialStaminaCost: number = 15;
  private lowStaminaThreshold: number = 20;
  private minDashStamina: number = 5;

  private shootInterval: number = 0.18;
  private shootTimer: number = 0;
  private bulletSpeed: number = 520;
  private bulletDamage: number = 25;

  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private mouseWorld: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

  private bulletPool: BulletPool;
  private playerContainer!: Phaser.GameObjects.Container;
  private playerVisual!: Phaser.GameObjects.Graphics;
  private playerGlow!: Phaser.GameObjects.Graphics;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private weaponSprite!: Phaser.GameObjects.Graphics;

  private dashTrailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private hitFlashTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, bulletPool: BulletPool) {
    super(scene, x, y, '');
    this.bulletPool = bulletPool;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(16);
    this.setDepth(60);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBounce(0.2, 0.2);

    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,SPACE,R') as { [key: string]: Phaser.Input.Keyboard.Key };

    this.createPlayerVisual();
    this.setupInput();
    this.createDashTrail();
  }

  private createPlayerVisual(): void {
    this.shadowSprite = this.scene.add.ellipse(0, 0, 36, 16, 0x000000, 0.45)
      .setDepth(58);

    this.playerVisual = this.scene.add.graphics();
    this.playerGlow = this.scene.add.graphics();
    this.weaponSprite = this.scene.add.graphics();

    this.drawPlayerBody();

    this.playerContainer = this.scene.add.container(0, 0, [
      this.shadowSprite,
      this.playerGlow,
      this.playerVisual,
      this.weaponSprite
    ]).setDepth(60);
  }

  private drawPlayerBody(): void {
    this.playerGlow.clear();
    this.playerVisual.clear();
    this.weaponSprite.clear();

    this.playerGlow.fillStyle(0x7c4dff, 0.35);
    this.playerGlow.fillCircle(0, 0, 28);
    this.playerGlow.fillStyle(0x4a90d9, 0.25);
    this.playerGlow.fillCircle(0, 0, 22);

    this.playerVisual.fillStyle(0x2a2a4a, 1);
    this.playerVisual.fillCircle(0, 0, 16);

    this.playerVisual.fillStyle(0x4a90d9, 1);
    this.playerVisual.fillCircle(0, 0, 12);

    this.playerVisual.fillStyle(0x7c4dff, 1);
    this.playerVisual.fillCircle(0, -2, 7);

    this.playerVisual.lineStyle(2, 0xffffff, 0.8);
    this.playerVisual.strokeCircle(0, 0, 15);

    this.weaponSprite.fillStyle(0x1a1a2e, 1);
    this.weaponSprite.fillRect(10, -3, 18, 6);
    this.weaponSprite.fillStyle(0x4a90d9, 1);
    this.weaponSprite.fillRect(22, -2, 8, 4);
    this.weaponSprite.lineStyle(1, 0x7c4dff, 0.8);
    this.weaponSprite.strokeRect(10, -3, 18, 6);
  }

  private setupInput(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseWorld.set(pointer.x, pointer.y);
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (pointer.leftButtonDown()) {
        this.tryShoot(true);
      }
      if (pointer.rightButtonDown()) {
        this.tryDash();
      }
    });

    this.scene.input.keyboard!.on('keydown-SPACE', () => {
      if (this.isGameOver) return;
      this.tryActivateBulletTime();
    });
  }

  private createDashTrail(): void {
    this.dashTrailEmitter = this.scene.add.particles(0, 0, '__DEFAULT', {
      lifespan: 250,
      speed: { min: 0, max: 20 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      tint: [0x4a90d9, 0x7c4dff]
    }).setDepth(59);
  }

  public addScore(points: number): void {
    this.score += points;
  }

  public takeDamage(damage: number): void {
    if (this.status === PlayerStatus.DASHING && this.dashTimer < this.dashInvincibilityDuration) {
      return;
    }
    if (this.isGameOver) return;

    this.health = Math.max(0, this.health - damage);

    if (this.hitFlashTween) {
      this.hitFlashTween.stop();
    }

    this.playerVisual.clear();
    this.playerVisual.fillStyle(0xff1744, 1);
    this.playerVisual.fillCircle(0, 0, 18);
    this.playerVisual.fillStyle(0x4a90d9, 1);
    this.playerVisual.fillCircle(0, 0, 12);

    this.hitFlashTween = this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.4, to: 1 },
      duration: 120,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.drawPlayerBody();
      }
    });

    if (this.health <= 0) {
      this.isGameOver = true;
      this.status = PlayerStatus.IDLE;
      this.setVelocity(0, 0);
    }
  }

  private tryShoot(force: boolean = false): void {
    if (this.isGameOver) return;
    if (this.status === PlayerStatus.DASH_WINDUP || this.status === PlayerStatus.DASHING) return;
    if (this.shootTimer > 0 && !force) return;

    const interval = this.bulletTimeActive ? this.shootInterval * 1.2 : this.shootInterval;
    this.shootTimer = interval;

    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, this.mouseWorld.x, this.mouseWorld.y)
    );

    this.bulletPool.spawn({
      x: this.x + Math.cos(Phaser.Math.DegToRad(angle)) * 26,
      y: this.y + Math.sin(Phaser.Math.DegToRad(angle)) * 26,
      angle: angle,
      speed: this.bulletSpeed,
      damage: this.bulletDamage,
      owner: 'player'
    });

    this.scene.cameras.main.shake(20, 0.003);
  }

  private tryDash(): boolean {
    if (this.isGameOver) return false;
    if (this.dashCooldownTimer > 0) return false;
    if (this.stamina < this.minDashStamina) return false;
    if (this.status === PlayerStatus.DASH_WINDUP || this.status === PlayerStatus.DASHING) return false;

    let dx = 0, dy = 0;
    if (this.keys['W'].isDown) dy -= 1;
    if (this.keys['S'].isDown) dy += 1;
    if (this.keys['A'].isDown) dx -= 1;
    if (this.keys['D'].isDown) dx += 1;

    if (dx === 0 && dy === 0) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.mouseWorld.x, this.mouseWorld.y);
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    this.dashDirection.set(dx / len, dy / len);

    this.stamina = Math.max(0, this.stamina - this.dashStaminaCost);
    this.status = PlayerStatus.DASH_WINDUP;
    this.dashTimer = 0;
    this.dashCooldownTimer = this.dashCooldown;
    return true;
  }

  private tryActivateBulletTime(): boolean {
    if (this.bulletTimeActive) return false;
    if (this.bulletTimeCooldown > 0) return false;

    this.bulletTimeActive = true;
    this.bulletTimeRemaining = this.bulletTimeMaxDuration;
    return true;
  }

  public getState(): PlayerState {
    return {
      x: this.x,
      y: this.y,
      health: this.health,
      maxHealth: this.maxHealth,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      score: this.score,
      isGameOver: this.isGameOver,
      bulletTimeActive: this.bulletTimeActive,
      bulletTimeRemaining: this.bulletTimeRemaining,
      bulletTimeMaxDuration: this.bulletTimeMaxDuration,
      isDashing: this.status === PlayerStatus.DASHING,
      isInvincible: this.status === PlayerStatus.DASHING && this.dashTimer < this.dashInvincibilityDuration
    };
  }

  public update(time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;

    this.updateBulletTime(dt);
    this.updateStamina(dt);
    this.updateShooting(dt);
    this.updateDash(dt);
    this.updateMovement(dt);
    this.updateVisual();

    this.playerContainer.setPosition(this.x, this.y);
  }

  private updateBulletTime(dt: number): void {
    if (this.bulletTimeCooldown > 0) {
      this.bulletTimeCooldown = Math.max(0, this.bulletTimeCooldown - dt);
    }

    if (this.bulletTimeActive) {
      this.bulletTimeRemaining = Math.max(0, this.bulletTimeRemaining - dt);
      if (this.bulletTimeRemaining <= 0) {
        this.bulletTimeActive = false;
        this.bulletTimeCooldown = this.bulletTimeCooldownMax;
      }
    }
  }

  private updateStamina(dt: number): void {
    if (!this.bulletTimeActive) {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecoveryRate * dt);
    }
  }

  private updateShooting(dt: number): void {
    if (this.shootTimer > 0) {
      this.shootTimer = Math.max(0, this.shootTimer - dt);
    }

    if (this.scene.input.activePointer.leftButtonDown()) {
      this.tryShoot(false);
    }
  }

  private updateDash(dt: number): void {
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    }

    if (this.status === PlayerStatus.DASH_WINDUP) {
      this.dashTimer += dt;
      if (this.dashTimer >= this.dashWindupDuration) {
        this.status = PlayerStatus.DASHING;
        this.dashTimer = 0;
      }
      return;
    }

    if (this.status === PlayerStatus.DASHING) {
      this.dashTimer += dt;

      if (this.dashTrailEmitter) {
        this.dashTrailEmitter.emitParticleAt(this.x, this.y, 2);
      }

      if (this.dashTimer >= this.dashDuration) {
        this.status = PlayerStatus.IDLE;
        this.dashTimer = 0;
      }
    }
  }

  private updateMovement(dt: number): void {
    if (this.status === PlayerStatus.DASH_WINDUP) {
      this.setVelocity(0, 0);
      return;
    }

    if (this.status === PlayerStatus.DASHING) {
      const factor = this.bulletTimeActive ? 1 : 1;
      this.setVelocity(
        this.dashDirection.x * this.dashSpeed * factor,
        this.dashDirection.y * this.dashSpeed * factor
      );
      return;
    }

    let dx = 0, dy = 0;
    if (this.keys['W'].isDown) dy -= 1;
    if (this.keys['S'].isDown) dy += 1;
    if (this.keys['A'].isDown) dx -= 1;
    if (this.keys['D'].isDown) dx += 1;

    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      let speed = this.baseMoveSpeed;
      if (this.stamina < this.lowStaminaThreshold) {
        speed *= 0.8;
      }

      this.setVelocity(dx * speed, dy * speed);
      this.status = PlayerStatus.MOVING;
    } else {
      this.setVelocity(
        this.body!.velocity.x * 0.85,
        this.body!.velocity.y * 0.85
      );
      if (this.status === PlayerStatus.MOVING) {
        this.status = PlayerStatus.IDLE;
      }
    }
  }

  private updateVisual(): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.mouseWorld.x, this.mouseWorld.y);
    this.weaponSprite.setRotation(angle);
    this.playerContainer.setRotation(0);

    if (this.status === PlayerStatus.DASH_WINDUP) {
      const pct = this.dashTimer / this.dashWindupDuration;
      this.playerVisual.setScale(1 - pct * 0.15, 1 + pct * 0.1);
    } else if (this.status === PlayerStatus.DASHING) {
      this.playerVisual.setScale(1.15, 0.9);
    } else {
      this.playerVisual.setScale(1, 1);
    }
  }

  public reset(x: number, y: number): void {
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.score = 0;
    this.isGameOver = false;
    this.bulletTimeActive = false;
    this.bulletTimeRemaining = 0;
    this.bulletTimeCooldown = 0;
    this.status = PlayerStatus.IDLE;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.shootTimer = 0;
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.drawPlayerBody();
    this.playerVisual.setScale(1, 1);
  }

  public destroy(): void {
    if (this.dashTrailEmitter) {
      this.dashTrailEmitter.destroy();
    }
    if (this.hitFlashTween) {
      this.hitFlashTween.stop();
    }
    this.playerContainer.destroy();
    super.destroy();
  }
}
