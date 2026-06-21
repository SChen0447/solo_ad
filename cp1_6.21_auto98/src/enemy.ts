import Phaser from 'phaser';
import { BulletPool, Bullet } from './bullet';

export type EnemyType = 'normal' | 'elite';

export interface EnemyConfig {
  type: EnemyType;
  x: number;
  y: number;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public enemyType: EnemyType = 'normal';
  public health: number = 50;
  public maxHealth: number = 50;
  public isActive: boolean = false;
  public damage: number = 10;

  private moveSpeed: number = 90;
  private baseMoveSpeed: number = 90;
  private fireInterval: number = 1.5;
  private fireTimer: number = 0;
  private bulletSpeed: number = 280;
  private scoreValue: number = 100;

  private enemyContainer: Phaser.GameObjects.Container;
  private enemyVisual: Phaser.GameObjects.Graphics;
  private enemyGlow: Phaser.GameObjects.Graphics;
  private shadowSprite: Phaser.GameObjects.Ellipse;
  private healthBar: Phaser.GameObjects.Graphics;

  private shieldVisual: Phaser.GameObjects.Graphics | null = null;
  private shieldHealth: number = 100;
  private shieldMaxHealth: number = 100;
  private shieldAngle: number = 0;
  private shieldReduction: number = 0.75;
  private backDamageMultiplier: number = 2;

  private bulletPool: BulletPool;
  private playerRef: { x: number; y: number } | null = null;
  private burstBulletCount: number = 3;
  private burstSpread: number = 30;

  private hitFlashTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, bulletPool: BulletPool) {
    super(scene, x, y, '');
    this.bulletPool = bulletPool;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(16);
    this.setDepth(55);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBounce(0.3, 0.3);

    this.shadowSprite = this.scene.add.ellipse(0, 0, 34, 14, 0x000000, 0.4).setDepth(53);
    this.enemyGlow = this.scene.add.graphics().setDepth(54);
    this.enemyVisual = this.scene.add.graphics().setDepth(55);
    this.healthBar = this.scene.add.graphics().setDepth(56);

    this.enemyContainer = this.scene.add.container(0, 0, [
      this.shadowSprite,
      this.enemyGlow,
      this.enemyVisual,
      this.healthBar
    ]).setDepth(55);

    this.deactivate();
  }

  public activate(config: EnemyConfig, player: { x: number; y: number }): void {
    this.enemyType = config.type;
    this.playerRef = player;
    this.setPosition(config.x, config.y);
    this.setActive(true);
    this.setVisible(true);
    this.enableBody(true, config.x, config.y, true, true);
    this.isActive = true;
    this.fireTimer = Math.random() * 0.5;

    if (config.type === 'elite') {
      this.health = 150;
      this.maxHealth = 150;
      this.moveSpeed = 70;
      this.baseMoveSpeed = 70;
      this.fireInterval = 2;
      this.damage = 15;
      this.scoreValue = 500;
      this.bulletSpeed = 260;
      this.setCircle(20);

      if (!this.shieldVisual) {
        this.shieldVisual = this.scene.add.graphics().setDepth(57);
        this.enemyContainer.add(this.shieldVisual);
      }
      this.shieldVisual.setVisible(true);
      this.shieldHealth = this.shieldMaxHealth;
      this.shieldAngle = 0;
    } else {
      this.health = 50;
      this.maxHealth = 50;
      this.moveSpeed = 90;
      this.baseMoveSpeed = 90;
      this.fireInterval = 1.5;
      this.damage = 10;
      this.scoreValue = 100;
      this.bulletSpeed = 280;
      this.setCircle(16);

      if (this.shieldVisual) {
        this.shieldVisual.setVisible(false);
      }
    }

    this.drawEnemyBody();
    this.drawHealthBar();
  }

  public getScoreValue(): number {
    return this.scoreValue;
  }

  private drawEnemyBody(): void {
    this.enemyGlow.clear();
    this.enemyVisual.clear();

    if (this.enemyType === 'elite') {
      this.enemyGlow.fillStyle(0xff9100, 0.4);
      this.enemyGlow.fillCircle(0, 0, 36);
      this.enemyGlow.fillStyle(0xffea00, 0.2);
      this.enemyGlow.fillCircle(0, 0, 28);

      this.enemyVisual.fillStyle(0x3a2a1a, 1);
      this.enemyVisual.fillCircle(0, 0, 20);

      this.enemyVisual.fillStyle(0xff9100, 1);
      this.enemyVisual.fillCircle(0, 0, 15);

      this.enemyVisual.fillStyle(0xffea00, 1);
      this.enemyVisual.fillCircle(0, -3, 8);

      this.enemyVisual.fillStyle(0xff1744, 1);
      this.enemyVisual.fillCircle(-5, -4, 2.5);
      this.enemyVisual.fillCircle(5, -4, 2.5);

      this.enemyVisual.lineStyle(3, 0xffea00, 0.9);
      this.enemyVisual.strokeCircle(0, 0, 19);
    } else {
      this.enemyGlow.fillStyle(0xff1744, 0.35);
      this.enemyGlow.fillCircle(0, 0, 28);

      this.enemyVisual.fillStyle(0x2a1a2a, 1);
      this.enemyVisual.fillCircle(0, 0, 16);

      this.enemyVisual.fillStyle(0xff1744, 1);
      this.enemyVisual.fillCircle(0, 0, 11);

      this.enemyVisual.fillStyle(0xff5252, 1);
      this.enemyVisual.fillCircle(0, -2, 6);

      this.enemyVisual.fillStyle(0xffffff, 1);
      this.enemyVisual.fillCircle(-4, -3, 1.8);
      this.enemyVisual.fillCircle(4, -3, 1.8);

      this.enemyVisual.lineStyle(2, 0xff1744, 0.8);
      this.enemyVisual.strokeCircle(0, 0, 15);
    }
  }

  private drawShield(): void {
    if (!this.shieldVisual || !this.shieldVisual.visible) return;

    this.shieldVisual.clear();

    const shieldAlpha = 0.4 + (this.shieldHealth / this.shieldMaxHealth) * 0.4;
    const radius = 30;
    const angleRad = Phaser.Math.DegToRad(this.shieldAngle);
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const rot = (x: number, y: number) => ({
      x: x * cosA - y * sinA,
      y: x * sinA + y * cosA
    });

    this.shieldVisual.fillStyle(0xffd54f, shieldAlpha * 0.3);
    this.drawHexagon(this.shieldVisual, 0, 0, radius, true, rot);

    this.shieldVisual.lineStyle(4, 0xffa726, shieldAlpha);
    this.drawHexagon(this.shieldVisual, 0, 0, radius, false, rot);

    this.shieldVisual.lineStyle(2, 0xffea00, shieldAlpha * 0.8);
    this.drawHexagon(this.shieldVisual, 0, 0, radius - 5, false, rot);

    const arrowLen = radius - 8;
    const tip = rot(0, -arrowLen);
    const left = rot(-8, -arrowLen + 12);
    const right = rot(8, -arrowLen + 12);
    this.shieldVisual.lineStyle(3, 0xff1744, shieldAlpha);
    this.shieldVisual.beginPath();
    this.shieldVisual.moveTo(tip.x, tip.y);
    this.shieldVisual.lineTo(left.x, left.y);
    this.shieldVisual.moveTo(tip.x, tip.y);
    this.shieldVisual.lineTo(right.x, right.y);
    this.shieldVisual.strokePath();
  }

  private drawHexagon(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    fill: boolean,
    rot?: (x: number, y: number) => { x: number; y: number }
  ): void {
    gfx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Phaser.Math.DegToRad(i * 60 - 90);
      let px = cx + r * Math.cos(angle);
      let py = cy + r * Math.sin(angle);
      if (rot) {
        const rp = rot(px, py);
        px = rp.x;
        py = rp.y;
      }
      if (i === 0) {
        gfx.moveTo(px, py);
      } else {
        gfx.lineTo(px, py);
      }
    }
    gfx.closePath();
    if (fill) {
      gfx.fillPath();
    } else {
      gfx.strokePath();
    }
  }

  private drawHealthBar(): void {
    this.healthBar.clear();
    const width = this.enemyType === 'elite' ? 48 : 36;
    const height = 5;
    const yOffset = this.enemyType === 'elite' ? -36 : -30;
    const pct = Math.max(0, this.health / this.maxHealth);

    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(-width / 2 - 1, yOffset - 1, width + 2, height + 2);

    this.healthBar.fillStyle(0x333333, 1);
    this.healthBar.fillRect(-width / 2, yOffset, width, height);

    const color = pct > 0.5 ? 0x00e676 : pct > 0.25 ? 0xffea00 : 0xff1744;
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(-width / 2, yOffset, width * pct, height);
  }

  public takeDamage(amount: number, sourceX: number, sourceY: number): number {
    if (!this.isActive) return 0;

    let finalDamage = amount;

    if (this.enemyType === 'elite') {
      const hitAngle = Phaser.Math.RadToDeg(
        Phaser.Math.Angle.Between(this.x, this.y, sourceX, sourceY)
      );
      const normalizedHitAngle = ((hitAngle - this.shieldAngle + 90) % 360 + 360) % 360;

      if (normalizedHitAngle >= 330 || normalizedHitAngle <= 30 ||
          (normalizedHitAngle >= 0 && normalizedHitAngle <= 60)) {
        finalDamage = amount * (1 - this.shieldReduction);
        this.shieldHealth = Math.max(0, this.shieldHealth - amount * 0.5);
      } else if (normalizedHitAngle >= 150 && normalizedHitAngle <= 210) {
        finalDamage = amount * this.backDamageMultiplier;
      }
    }

    this.health -= finalDamage;

    if (this.hitFlashTween) {
      this.hitFlashTween.stop();
    }

    const scale = this.enemyType === 'elite' ? 1.1 : 1.08;
    this.enemyVisual.setScale(scale);
    this.hitFlashTween = this.scene.tweens.add({
      targets: this.enemyVisual,
      scale: 1,
      duration: 100,
      ease: 'Back.Out'
    });

    this.drawHealthBar();

    if (this.health <= 0) {
      this.spawnDeathEffect();
      this.deactivate();
    }

    return finalDamage;
  }

  private spawnDeathEffect(): void {
    const color = this.enemyType === 'elite' ? [0xff9100, 0xffea00, 0xff1744] : [0xff1744, 0xff5252];
    const emitter = this.scene.add.particles(this.x, this.y, '__DEFAULT', {
      lifespan: 500,
      speed: { min: 50, max: 180 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: this.enemyType === 'elite' ? 25 : 15,
      blendMode: 'ADD',
      tint: color
    }).setDepth(80);

    this.scene.tweens.add({
      targets: emitter,
      quantity: 0,
      duration: 100,
      onComplete: () => {
        this.scene.time.delayedCall(600, () => emitter.destroy());
      }
    });

    this.scene.cameras.main.shake(this.enemyType === 'elite' ? 150 : 80, 0.005);
  }

  public deactivate(): void {
    this.isActive = false;
    this.setActive(false);
    this.setVisible(false);
    this.disableBody(true, true);
    this.setVelocity(0, 0);
    this.enemyContainer.setPosition(-1000, -1000);
    if (this.shieldVisual) {
      this.shieldVisual.setVisible(false);
    }
  }

  public applyBulletTimeSlowdown(factor: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body && this.isActive) {
      body.velocity.scale(factor);
    }
    this.fireTimer = this.fireTimer / factor;
  }

  public resetBulletTimeSpeed(prevVelocity: Phaser.Math.Vector2): void {
    if (this.isActive) {
      this.setVelocity(prevVelocity.x, prevVelocity.y);
    }
  }

  public update(time: number, delta: number): void {
    if (!this.isActive || !this.playerRef) return;

    const dt = delta / 1000;
    const prevVel = new Phaser.Math.Vector2(this.body!.velocity.x, this.body!.velocity.y);

    this.shieldAngle = (this.shieldAngle + 20 * dt) % 360;
    this.updateAI(dt);
    this.drawShield();

    this.enemyContainer.setPosition(this.x, this.y);

    const facingAngle = Phaser.Math.Angle.Between(this.x, this.y, this.playerRef.x, this.playerRef.y);
    this.enemyVisual.setRotation(facingAngle);
  }

  private updateAI(dt: number): void {
    if (!this.playerRef) return;

    const dx = this.playerRef.x - this.x;
    const dy = this.playerRef.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const optimalRange = this.enemyType === 'elite' ? 320 : 280;

      if (dist > optimalRange + 50) {
        this.setVelocity(nx * this.moveSpeed, ny * this.moveSpeed);
      } else if (dist < optimalRange - 50) {
        this.setVelocity(-nx * this.moveSpeed * 0.6, -ny * this.moveSpeed * 0.6);
      } else {
        const perpX = -ny;
        const perpY = nx;
        const strafe = Math.sin(this.scene.time.now * 0.002 + this.x) * 0.7;
        this.setVelocity(
          perpX * this.moveSpeed * strafe,
          perpY * this.moveSpeed * strafe
        );
      }
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && dist < 500) {
      this.fireTimer = this.fireInterval;
      this.fire();
    }
  }

  private fire(): void {
    if (!this.playerRef) return;

    const angle = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.Between(this.x, this.y, this.playerRef.x, this.playerRef.y)
    );

    if (this.enemyType === 'elite') {
      for (let i = 0; i < this.burstBulletCount; i++) {
        const offsetAngle = angle + (i - (this.burstBulletCount - 1) / 2) * this.burstSpread / (this.burstBulletCount - 1);
        this.bulletPool.spawn({
          x: this.x + Math.cos(Phaser.Math.DegToRad(angle)) * 24,
          y: this.y + Math.sin(Phaser.Math.DegToRad(angle)) * 24,
          angle: offsetAngle,
          speed: this.bulletSpeed,
          damage: this.damage,
          owner: 'enemy',
          color: 0xff9100
        });
      }
    } else {
      this.bulletPool.spawn({
        x: this.x + Math.cos(Phaser.Math.DegToRad(angle)) * 20,
        y: this.y + Math.sin(Phaser.Math.DegToRad(angle)) * 20,
        angle: angle,
        speed: this.bulletSpeed,
        damage: this.damage,
        owner: 'enemy'
      });
    }
  }

  public destroy(): void {
    if (this.hitFlashTween) {
      this.hitFlashTween.stop();
    }
    this.enemyContainer.destroy();
    super.destroy();
  }
}

export class EnemyPool {
  private scene: Phaser.Scene;
  private pool: Enemy[] = [];
  private maxSize: number = 60;
  private bulletPool: BulletPool;
  private spawnTimer: number = 0;
  private spawnInterval: number = 2.5;
  private eliteSpawnChance: number = 0.2;
  private maxActiveEnemies: number = 40;

  constructor(scene: Phaser.Scene, bulletPool: BulletPool, preallocate: number = 40) {
    this.scene = scene;
    this.bulletPool = bulletPool;
    for (let i = 0; i < preallocate; i++) {
      this.createEnemy();
    }
  }

  private createEnemy(): Enemy {
    const enemy = new Enemy(this.scene, -1000, -1000, this.bulletPool);
    this.pool.push(enemy);
    return enemy;
  }

  public spawn(config: EnemyConfig, player: { x: number; y: number }): Enemy | null {
    if (this.getActiveCount() >= this.maxActiveEnemies) return null;

    let enemy = this.pool.find(e => !e.isActive);
    if (!enemy) {
      if (this.pool.length >= this.maxSize) return null;
      enemy = this.createEnemy();
    }
    enemy.activate(config, player);
    return enemy;
  }

  public getActiveEnemies(): Enemy[] {
    return this.pool.filter(e => e.isActive);
  }

  public getActiveCount(): number {
    let count = 0;
    for (const e of this.pool) {
      if (e.isActive) count++;
    }
    return count;
  }

  public updateSpawning(dt: number, player: { x: number; y: number }): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      const active = this.getActiveCount();
      if (active < this.maxActiveEnemies) {
        const difficulty = Math.min(1, active / this.maxActiveEnemies);
        this.spawnInterval = Math.max(0.8, 2.5 - difficulty * 1.5);
        this.eliteSpawnChance = 0.15 + difficulty * 0.25;

        const { width, height } = this.scene.scale;
        const margin = 60;
        const side = Phaser.Math.Between(0, 3);
        let sx = 0, sy = 0;

        switch (side) {
          case 0: sx = Phaser.Math.Between(margin, width - margin); sy = -margin; break;
          case 1: sx = width + margin; sy = Phaser.Math.Between(margin, height - margin); break;
          case 2: sx = Phaser.Math.Between(margin, width - margin); sy = height + margin; break;
          case 3: sx = -margin; sy = Phaser.Math.Between(margin, height - margin); break;
        }

        const isElite = Math.random() < this.eliteSpawnChance;
        this.spawn({ type: isElite ? 'elite' : 'normal', x: sx, y: sy }, player);
      }
    }
  }

  public applyBulletTime(factor: number): void {
    this.pool.forEach(e => {
      if (e.isActive) {
        e.applyBulletTimeSlowdown(factor);
      }
    });
  }

  public update(time: number, delta: number, player: { x: number; y: number }): void {
    const dt = delta / 1000;
    this.updateSpawning(dt, player);
    this.pool.forEach(e => e.update(time, delta));
  }

  public clear(): void {
    this.pool.forEach(e => e.deactivate());
    this.spawnTimer = 0;
  }
}
