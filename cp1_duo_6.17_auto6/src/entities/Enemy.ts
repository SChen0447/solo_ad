import Phaser from 'phaser';

export type EnemyType = 'normal' | 'fast' | 'boss';

export interface EnemyConfig {
  type: EnemyType;
  health: number;
  speed: number;
  reward: number;
  color: number;
  size: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    type: 'normal',
    health: 100,
    speed: 60,
    reward: 15,
    color: 0x4ade80,
    size: 24
  },
  fast: {
    type: 'fast',
    health: 50,
    speed: 120,
    reward: 10,
    color: 0xfbbf24,
    size: 18
  },
  boss: {
    type: 'boss',
    health: 500,
    speed: 45,
    reward: 30,
    color: 0xef4444,
    size: 36
  }
};

export class Enemy extends Phaser.GameObjects.Container {
  public type: EnemyType;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public reward: number;
  public isDead: boolean = false;
  public reachedEnd: boolean = false;
  public pendingDestroy: boolean = false;

  private path: Phaser.Curves.Path;
  private pathProgress: number = 0;
  private velocity: Phaser.Math.Vector2;
  private slowEffect: number = 0;
  private slowTimer: number = 0;

  private sprite: Phaser.GameObjects.Rectangle;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBar: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: EnemyType,
    path: Phaser.Curves.Path
  ) {
    super(scene, x, y);
    this.type = type;
    this.path = path;
    this.velocity = new Phaser.Math.Vector2();

    const config = ENEMY_CONFIGS[type];
    this.maxHealth = config.health;
    this.health = config.health;
    this.speed = config.speed;
    this.reward = config.reward;

    this.sprite = scene.add.rectangle(0, 0, config.size, config.size, config.color);
    this.sprite.setStrokeStyle(2, 0xffffff);
    this.add(this.sprite);

    this.healthBarBg = scene.add.rectangle(0, -config.size / 2 - 10, config.size + 8, 6, 0x333333);
    this.healthBar = scene.add.rectangle(0, -config.size / 2 - 10, config.size + 8, 6, 0x22c55e);
    this.add(this.healthBarBg);
    this.add(this.healthBar);

    this.setSize(config.size, config.size);
    scene.add.existing(this);

    const startPoint = path.getStartPoint();
    this.setPosition(startPoint.x, startPoint.y);
  }

  update(time: number, delta: number): void {
    if (this.isDead || this.reachedEnd || this.pendingDestroy) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowEffect = 0;
      }
    }

    const currentSpeed = this.speed * (1 - this.slowEffect);
    const moveDistance = currentSpeed * (delta / 1000);

    const pathLength = this.path.getLength();
    this.pathProgress += moveDistance;

    if (this.pathProgress >= pathLength) {
      this.reachedEnd = true;
      return;
    }

    const t = this.pathProgress / pathLength;
    const point = this.path.getPoint(t);
    this.setPosition(point.x, point.y);

    const tangent = this.path.getTangent(t);
    this.velocity.set(tangent.x * currentSpeed, tangent.y * currentSpeed);
  }

  takeDamage(damage: number): void {
    if (this.isDead || this.pendingDestroy) return;

    this.health -= damage;
    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  applySlow(slowAmount: number, duration: number): void {
    if (this.isDead || this.pendingDestroy) return;

    if (slowAmount > this.slowEffect) {
      this.slowEffect = slowAmount;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  private updateHealthBar(): void {
    const healthPercent = Math.max(0, this.health / this.maxHealth);
    this.healthBar.width = (this.healthBarBg.width) * healthPercent;
    this.healthBar.x = -this.healthBarBg.width / 2 + (this.healthBar.width) / 2;

    if (healthPercent > 0.5) {
      this.healthBar.setFillStyle(0x22c55e);
    } else if (healthPercent > 0.25) {
      this.healthBar.setFillStyle(0xeab308);
    } else {
      this.healthBar.setFillStyle(0xef4444);
    }
  }

  private die(): void {
    if (this.isDead || this.pendingDestroy) return;

    this.isDead = true;
    this.pendingDestroy = true;
    this.setActive(false);
    this.velocity.set(0, 0);

    this.scene.tweens.add({
      targets: this,
      scale: 0.3,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (this.scene && this.active) {
          this.removeFromDisplayList();
          this.destroy();
        }
      }
    });
  }

  forceDestroy(): void {
    if (!this.pendingDestroy && !this.isDead) {
      this.isDead = true;
    }
    this.pendingDestroy = true;
    this.setActive(false);
    if (this.scene) {
      this.removeFromDisplayList();
      this.destroy();
    }
  }

  getReward(): number {
    return this.reward;
  }

  getVelocity(): Phaser.Math.Vector2 {
    return this.velocity;
  }
}
