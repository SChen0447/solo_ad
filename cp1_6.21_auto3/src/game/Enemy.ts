import Phaser from 'phaser';

export type EnemyType = 'asteroid' | 'ship';

export type EnemyDestroyedCallback = (enemy: Enemy, killed: boolean) => void;
export type EnemyShootCallback = (x: number, y: number, angle: number, damage: number) => void;

export abstract class Enemy {
  protected scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Container;
  public type: EnemyType;
  public x: number;
  public y: number;
  protected vx: number = 0;
  protected vy: number = 0;
  public health: number;
  public maxHealth: number;
  public damage: number;
  public score: number;
  public energyDrop: number;
  public radius: number;

  protected destroyedCallbacks: EnemyDestroyedCallback[] = [];
  protected shootCallbacks: EnemyShootCallback[] = [];
  protected isDead: boolean = false;

  constructor(
    scene: Phaser.Scene,
    type: EnemyType,
    x: number,
    y: number,
    health: number,
    damage: number,
    score: number,
    energyDrop: number,
    radius: number
  ) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.damage = damage;
    this.score = score;
    this.energyDrop = energyDrop;
    this.radius = radius;

    this.sprite = scene.add.container(x, y);
  }

  public abstract update(delta: number, playerX: number, playerY: number): void;

  public takeDamage(damage: number): boolean {
    if (this.isDead) return false;

    this.health -= damage;

    this.sprite.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
    });

    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  protected die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.destroyedCallbacks.forEach((cb) => cb(this, true));
  }

  public onDestroyed(callback: EnemyDestroyedCallback): void {
    this.destroyedCallbacks.push(callback);
  }

  public onShoot(callback: EnemyShootCallback): void {
    this.shootCallbacks.push(callback);
  }

  public getBounds(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, this.radius);
  }

  public isAlive(): boolean {
    return !this.isDead;
  }

  public destroy(): void {
    if (!this.isDead) {
      this.destroyedCallbacks.forEach((cb) => cb(this, false));
    }
    this.sprite.destroy();
    this.destroyedCallbacks = [];
    this.shootCallbacks = [];
  }
}

export class Asteroid extends Enemy {
  private rotationSpeed: number;
  private size: 'large' | 'medium' | 'small';

  constructor(scene: Phaser.Scene, x: number, y: number, size: 'large' | 'medium' | 'small' = 'large') {
    let health: number;
    let radius: number;
    let speed: number;
    let score: number;
    let energyDrop: number;

    switch (size) {
      case 'large':
        health = 60;
        radius = 35;
        speed = 40;
        score = 50;
        energyDrop = 5;
        break;
      case 'medium':
        health = 30;
        radius = 22;
        speed = 70;
        score = 30;
        energyDrop = 3;
        break;
      case 'small':
        health = 15;
        radius = 12;
        speed = 100;
        score = 15;
        energyDrop = 1;
        break;
    }

    super(scene, 'asteroid', x, y, health, 15, score, energyDrop, radius);
    this.size = size;
    this.rotationSpeed = (Math.random() - 0.5) * 2;

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.createSprite();
  }

  private createSprite(): void {
    const graphics = this.scene.add.graphics();

    const colors = [0x8b4513, 0x654321, 0x5c4033];
    const color = Phaser.Utils.Array.GetRandom(colors);

    graphics.fillStyle(color, 1);
    graphics.beginPath();

    const points = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = this.radius * (0.8 + Math.random() * 0.4);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(0x000000, 0.3);
    for (let i = 0; i < 3; i++) {
      const cx = (Math.random() - 0.5) * this.radius;
      const cy = (Math.random() - 0.5) * this.radius;
      const cr = this.radius * 0.15;
      graphics.beginPath();
      graphics.arc(cx, cy, cr, 0, Math.PI * 2);
      graphics.fillPath();
    }

    this.sprite.add(graphics);
  }

  public update(delta: number): void {
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    if (this.x < -this.radius) this.x = gameWidth + this.radius;
    if (this.x > gameWidth + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = gameHeight + this.radius;
    if (this.y > gameHeight + this.radius) this.y = -this.radius;

    this.sprite.setPosition(this.x, this.y);
    this.sprite.rotation += this.rotationSpeed * dt;
  }

  public getSize(): 'large' | 'medium' | 'small' {
    return this.size;
  }

  public splitIntoPieces(): Asteroid[] {
    const pieces: Asteroid[] = [];
    let nextSize: 'medium' | 'small' | null = null;

    if (this.size === 'large') {
      nextSize = 'medium';
    } else if (this.size === 'medium') {
      nextSize = 'small';
    }

    if (nextSize) {
      const numPieces = 3;
      for (let i = 0; i < numPieces; i++) {
        const offsetAngle = (i / numPieces) * Math.PI * 2;
        const offsetX = Math.cos(offsetAngle) * 10;
        const offsetY = Math.sin(offsetAngle) * 10;
        const piece = new Asteroid(this.scene, this.x + offsetX, this.y + offsetY, nextSize);
        pieces.push(piece);
      }
    }

    return pieces;
  }
}

export class EnemyShip extends Enemy {
  private lastShootTime: number = 0;
  private shootInterval: number = 2000;
  private targetX: number = 0;
  private targetY: number = 0;
  private orbitAngle: number = 0;
  private orbitRadius: number = 200;

  constructor(scene: Phaser.Scene, x: number, y: number, wave: number = 1) {
    const health = 25 + wave * 5;
    const damage = 10 + wave * 2;
    const score = 80 + wave * 10;
    const energyDrop = 8 + wave * 2;

    super(scene, 'ship', x, y, health, damage, score, energyDrop, 20);

    this.shootInterval = Math.max(800, 2000 - wave * 100);
    this.orbitRadius = 150 + Math.random() * 150;
    this.orbitAngle = Math.random() * Math.PI * 2;

    this.createSprite();
  }

  private createSprite(): void {
    const graphics = this.scene.add.graphics();

    graphics.fillStyle(0xff6b35, 1);
    graphics.beginPath();
    graphics.moveTo(0, 20);
    graphics.lineTo(-18, -15);
    graphics.lineTo(-8, -10);
    graphics.lineTo(-8, -20);
    graphics.lineTo(8, -20);
    graphics.lineTo(8, -10);
    graphics.lineTo(18, -15);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(0xff3535, 0.9);
    graphics.beginPath();
    for (let i = 0; i <= 360; i += 10) {
      const rad = Phaser.Math.DegToRad(i);
      const px = Math.cos(rad) * 8;
      const py = Math.sin(rad) * 10;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(0xffff00, 0.8);
    graphics.beginPath();
    graphics.moveTo(-5, -18);
    graphics.lineTo(0, -28);
    graphics.lineTo(5, -18);
    graphics.closePath();
    graphics.fillPath();

    this.sprite.add(graphics);
  }

  public update(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;

    this.targetX = playerX;
    this.targetY = playerY;

    this.orbitAngle += 0.5 * dt;

    const targetOrbitX = playerX + Math.cos(this.orbitAngle) * this.orbitRadius;
    const targetOrbitY = playerY + Math.sin(this.orbitAngle) * this.orbitRadius;

    const dx = targetOrbitX - this.x;
    const dy = targetOrbitY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const speed = 120;
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    }

    this.sprite.setPosition(this.x, this.y);

    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
    this.sprite.rotation = angleToPlayer + Math.PI / 2;

    const now = this.scene.time.now;
    if (now - this.lastShootTime >= this.shootInterval) {
      this.shoot(playerX, playerY);
      this.lastShootTime = now;
    }
  }

  private shoot(playerX: number, playerY: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);

    const numBullets = 3;
    const spreadAngle = 0.2;

    for (let i = 0; i < numBullets; i++) {
      const offset = (i - (numBullets - 1) / 2) * spreadAngle;
      const bulletAngle = angle + offset;
      this.shootCallbacks.forEach((cb) =>
        cb(this.x, this.y, bulletAngle, this.damage / numBullets)
      );
    }
  }
}
