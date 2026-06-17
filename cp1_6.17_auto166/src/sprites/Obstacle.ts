import Phaser from 'phaser';

export type ObstacleType = 'spike' | 'platform' | 'star' | 'speedBoost' | 'shield' | 'enemy' | 'finishFlag' | 'warning';

export interface ObstacleConfig {
  type: ObstacleType;
  x: number;
  y: number;
}

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  public obstacleType: ObstacleType;
  private baseVelocityY: number = 0;
  private platformRange: number = 100;
  private platformOriginX: number = 0;
  private platformSpeed: number = 30;
  private platformDirection: number = 1;
  private isActive_: boolean = false;
  private warningBlinkTimer: number = 0;
  public warningTarget: Obstacle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, type: ObstacleType) {
    super(scene, x, y, Obstacle.getTextureKey(type));
    this.obstacleType = type;
    this.platformOriginX = x;

    if (!scene.textures.exists(Obstacle.getTextureKey(type))) {
      Obstacle.createTexture(scene, type);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.configureBody();
  }

  private static getTextureKey(type: ObstacleType): string {
    return `obstacle_${type}`;
  }

  private static createTexture(scene: Phaser.Scene, type: ObstacleType): void {
    const key = Obstacle.getTextureKey(type);
    if (scene.textures.exists(key)) return;

    const g = scene.add.graphics();
    g.clear();

    switch (type) {
      case 'spike':
        g.fillStyle(0xe74c3c, 1);
        g.fillTriangle(10, 0, 0, 20, 20, 20);
        g.lineStyle(2, 0xc0392b, 1);
        g.strokeTriangle(10, 0, 0, 20, 20, 20);
        g.generateTexture(key, 20, 20);
        break;
      case 'platform':
        g.fillStyle(0x3498db, 1);
        g.fillRoundedRect(0, 0, 60, 20, 4);
        g.lineStyle(2, 0x2980b9, 1);
        g.strokeRoundedRect(0, 0, 60, 20, 4);
        g.generateTexture(key, 60, 20);
        break;
      case 'star':
        g.fillStyle(0xffd700, 1);
        g.fillCircle(8, 8, 8);
        g.lineStyle(2, 0xffa500, 1);
        g.strokeCircle(8, 8, 8);
        g.fillStyle(0xffd700, 1);
        for (let i = 0; i < 5; i++) {
          const angle = (i * 72 - 90) * Math.PI / 180;
          const px = 8 + Math.cos(angle) * 6;
          const py = 8 + Math.sin(angle) * 6;
          g.fillCircle(px, py, 2);
        }
        g.generateTexture(key, 16, 16);
        break;
      case 'speedBoost':
        g.fillStyle(0xffd700, 1);
        g.fillRoundedRect(2, 2, 12, 12, 2);
        g.fillStyle(0xffffff, 1);
        g.beginPath();
        g.moveTo(8, 3);
        g.lineTo(5, 9);
        g.lineTo(8, 9);
        g.lineTo(6, 13);
        g.lineTo(11, 7);
        g.lineTo(8, 7);
        g.lineTo(10, 3);
        g.closePath();
        g.fillPath();
        g.generateTexture(key, 16, 16);
        break;
      case 'shield':
        g.fillStyle(0x3498db, 1);
        g.beginPath();
        g.moveTo(8, 2);
        g.lineTo(14, 5);
        g.lineTo(14, 9);
        g.lineTo(8, 14);
        g.lineTo(2, 9);
        g.lineTo(2, 5);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokePath();
        g.generateTexture(key, 16, 16);
        break;
      case 'enemy':
        g.fillStyle(0x8e44ad, 1);
        g.fillRect(2, 4, 12, 10);
        g.fillStyle(0xffffff, 1);
        g.fillRect(4, 7, 3, 3);
        g.fillRect(9, 7, 3, 3);
        g.fillStyle(0x000000, 1);
        g.fillRect(5, 8, 1, 1);
        g.fillRect(10, 8, 1, 1);
        g.fillStyle(0x8e44ad, 1);
        g.fillRect(3, 2, 2, 3);
        g.fillRect(11, 2, 2, 3);
        g.generateTexture(key, 16, 16);
        break;
      case 'finishFlag':
        g.fillStyle(0x8b4513, 1);
        g.fillRect(0, 0, 3, 30);
        g.fillStyle(0x27ae60, 1);
        g.beginPath();
        g.moveTo(3, 2);
        g.lineTo(97, 10);
        g.lineTo(3, 18);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0x1e8449, 1);
        g.strokePath();
        g.generateTexture(key, 100, 30);
        break;
      case 'warning':
        g.lineStyle(2, 0xe74c3c, 0.7);
        g.strokeRect(0, 0, 20, 20);
        g.generateTexture(key, 20, 20);
        break;
    }

    g.destroy();
  }

  private configureBody(): void {
    switch (this.obstacleType) {
      case 'spike':
        this.body.setSize(18, 16, true);
        this.body.setOffset(1, 4);
        break;
      case 'platform':
        this.body.setSize(60, 18, true);
        this.body.setOffset(0, 1);
        break;
      case 'star':
      case 'speedBoost':
      case 'shield':
        this.body.setSize(12, 12, true);
        this.body.setOffset(2, 2);
        break;
      case 'enemy':
        this.body.setSize(12, 12, true);
        this.body.setOffset(2, 3);
        break;
      case 'finishFlag':
        this.body.setSize(100, 30, true);
        break;
      case 'warning':
        this.body.setSize(0, 0);
        break;
    }
  }

  public activate(config: ObstacleConfig): void {
    this.obstacleType = config.type;
    this.setTexture(Obstacle.getTextureKey(config.type));
    this.setPosition(config.x, config.y);
    this.platformOriginX = config.x;
    this.platformDirection = 1;
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.isActive_ = true;
    this.warningBlinkTimer = 0;

    if (config.type === 'warning') {
      this.setAlpha(0.7);
    } else {
      this.setAlpha(1);
    }
  }

  public deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.isActive_ = false;
    this.warningTarget = null;
    this.setVelocity(0, 0);
  }

  public isPoolActive(): boolean {
    return this.isActive_;
  }

  public setScrollVelocity(vy: number): void {
    this.baseVelocityY = vy;
    if (this.obstacleType !== 'platform') {
      this.setVelocityY(vy);
    } else {
      this.setVelocityY(vy);
    }
  }

  public update(time: number, delta: number): void {
    if (!this.isActive_) return;

    if (this.obstacleType === 'platform') {
      const offsetX = this.x - this.platformOriginX;
      if (offsetX > this.platformRange) {
        this.platformDirection = -1;
      } else if (offsetX < -this.platformRange) {
        this.platformDirection = 1;
      }
      this.setVelocityX(this.platformSpeed * this.platformDirection);
      this.setVelocityY(this.baseVelocityY);
    } else if (this.obstacleType === 'warning') {
      this.warningBlinkTimer += delta;
      const blink = Math.sin(this.warningBlinkTimer / 250 * Math.PI) > 0;
      this.setAlpha(blink ? 0.8 : 0.3);
    } else if (this.obstacleType === 'star' || this.obstacleType === 'speedBoost' || this.obstacleType === 'shield') {
      const bob = Math.sin(time / 200) * 2;
      this.y += bob * delta / 1000 * 60;
    }
  }
}

export class ObstaclePool {
  private pool: Obstacle[] = [];
  private scene: Phaser.Scene;
  private initialSize: number = 30;

  constructor(scene: Phaser.Scene, initialSize: number = 30) {
    this.scene = scene;
    this.initialSize = initialSize;
    this.prePopulate();
  }

  private prePopulate(): void {
    const types: ObstacleType[] = ['spike', 'platform', 'star', 'speedBoost', 'shield', 'enemy', 'warning'];
    for (let i = 0; i < this.initialSize; i++) {
      const type = types[i % types.length];
      const obj = new Obstacle(this.scene, -1000, -1000, type);
      obj.deactivate();
      this.pool.push(obj);
    }
  }

  public acquire(config: ObstacleConfig): Obstacle {
    let obj = this.pool.find(o => !o.isPoolActive() && o.obstacleType === config.type);

    if (!obj) {
      obj = new Obstacle(this.scene, config.x, config.y, config.type);
      obj.deactivate();
      this.pool.push(obj);
    }

    obj.activate(config);
    return obj;
  }

  public release(obj: Obstacle): void {
    if (obj && this.pool.includes(obj)) {
      obj.deactivate();
    }
  }

  public getActive(): Obstacle[] {
    return this.pool.filter(o => o.isPoolActive());
  }

  public clearAll(): void {
    this.pool.forEach(o => o.deactivate());
  }

  public setScrollVelocityForAll(vy: number): void {
    this.pool.forEach(o => {
      if (o.isPoolActive()) {
        o.setScrollVelocity(vy);
      }
    });
  }

  public updateAll(time: number, delta: number): void {
    this.pool.forEach(o => {
      if (o.isPoolActive()) {
        o.update(time, delta);
      }
    });
  }
}
