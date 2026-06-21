import Phaser from 'phaser';

export type BulletOwner = 'player' | 'enemy';

export interface BulletConfig {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  owner: BulletOwner;
  color?: number;
  size?: number;
}

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  public owner: BulletOwner = 'player';
  public damage: number = 10;
  public baseSpeed: number = 400;
  public isActive: boolean = false;
  private trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(4);
    this.setDepth(50);
  }

  public fire(config: BulletConfig): void {
    this.setPosition(config.x, config.y);
    this.setActive(true);
    this.setVisible(true);
    this.enableBody(true, config.x, config.y, true, true);

    this.owner = config.owner;
    this.damage = config.damage;
    this.baseSpeed = config.speed;
    this.isActive = true;

    const color = config.color ?? (config.owner === 'player' ? 0x4a90d9 : 0xff1744);
    this.createVisual(config.size ?? 8, color);

    const radians = Phaser.Math.DegToRad(config.angle);
    const vx = Math.cos(radians) * this.baseSpeed;
    const vy = Math.sin(radians) * this.baseSpeed;
    this.setVelocity(vx, vy);
    this.rotation = radians;
  }

  private createVisual(size: number, color: number): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillCircle(size / 2, size / 2, size / 2);
    gfx.lineStyle(2, 0xffffff, 0.6);
    gfx.strokeCircle(size / 2, size / 2, size / 2);
    gfx.generateTexture('bullet_' + this.owner + '_' + color, size, size);
    gfx.destroy();

    this.setTexture('bullet_' + this.owner + '_' + color);
  }

  public applyBulletTimeSlowdown(factor: number): void {
    if (this.owner === 'enemy') {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.velocity.scale(factor);
      }
    }
  }

  public resetBulletTimeSpeed(): void {
    if (this.owner === 'enemy' && this.isActive) {
      const radians = this.rotation;
      const vx = Math.cos(radians) * this.baseSpeed;
      const vy = Math.sin(radians) * this.baseSpeed;
      this.setVelocity(vx, vy);
    }
  }

  public deactivate(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.disableBody(true, true);
    this.setVelocity(0, 0);
    if (this.trailParticles) {
      this.trailParticles.stop();
    }
  }

  public update(time: number, delta: number): void {
    if (!this.isActive) return;

    const { width, height } = this.scene.scale;
    const margin = 50;
    if (
      this.x < -margin || this.x > width + margin ||
      this.y < -margin || this.y > height + margin
    ) {
      this.deactivate();
    }
  }
}

export class BulletPool {
  private scene: Phaser.Scene;
  private pool: Bullet[] = [];
  private maxSize: number = 200;

  constructor(scene: Phaser.Scene, preallocate: number = 100) {
    this.scene = scene;
    for (let i = 0; i < preallocate; i++) {
      this.createBullet();
    }
  }

  private createBullet(): Bullet {
    const bullet = new Bullet(this.scene, -1000, -1000);
    bullet.deactivate();
    this.pool.push(bullet);
    return bullet;
  }

  public spawn(config: BulletConfig): Bullet | null {
    let bullet = this.pool.find(b => !b.isActive);
    if (!bullet) {
      if (this.pool.length >= this.maxSize) {
        return null;
      }
      bullet = this.createBullet();
    }
    bullet.fire(config);
    return bullet;
  }

  public getActiveBullets(): Bullet[] {
    return this.pool.filter(b => b.isActive);
  }

  public applyBulletTime(factor: number): void {
    this.pool.forEach(b => {
      if (b.isActive) {
        b.applyBulletTimeSlowdown(factor);
      }
    });
  }

  public resetBulletTime(): void {
    this.pool.forEach(b => {
      if (b.isActive) {
        b.resetBulletTimeSpeed();
      }
    });
  }

  public update(time: number, delta: number): void {
    this.pool.forEach(b => b.update(time, delta));
  }

  public clear(): void {
    this.pool.forEach(b => b.deactivate());
  }
}
