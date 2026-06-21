export type BulletPattern = 'circle' | 'spiral' | 'fan' | 'wave' | 'homing' | 'split' | 'random' | 'cross';

export interface BulletConfig {
  pattern: BulletPattern;
  density: number;
  interval: number;
  speed: number;
  size: number;
  color: string;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  size: number;
  color: string;
  pattern: BulletPattern;
  angle: number;
  life: number;
  isHoming: boolean;
  splitCount: number;
  active: boolean;
}

class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Bullet[]>;

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  insert(bullet: Bullet): void {
    const key = this.getKey(bullet.x, bullet.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(bullet);
  }

  query(x: number, y: number, radius: number): Bullet[] {
    const results: Bullet[] = [];
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.grid.get(key);
        if (cell) {
          results.push(...cell);
        }
      }
    }
    return results;
  }
}

export class BulletModule {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private bullets: Bullet[] = [];
  private bulletPool: Bullet[] = [];
  private maxPoolSize: number = 200;
  private nextId: number = 0;
  private spatialHash: SpatialHash;
  private emitTimer: number = 0;
  private spiralAngle: number = 0;
  private wavePhase: number = 0;
  private crossPhase: number = 0;

  private targetConfig: BulletConfig = {
    pattern: 'circle',
    density: 20,
    interval: 0.3,
    speed: 3,
    size: 4,
    color: '#ff4444'
  };

  private currentConfig: BulletConfig = { ...this.targetConfig };

  private readonly colorPalette: string[] = [
    '#ff4444', '#ff8844', '#ffdd44', '#88ff44', '#44ff88',
    '#44ffdd', '#4488ff', '#8844ff', '#ff44dd', '#ffffff'
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.spatialHash = new SpatialHash(50);
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.bulletPool.push({
        id: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        size: 0,
        color: '#ff4444',
        pattern: 'circle',
        angle: 0,
        life: 0,
        isHoming: false,
        splitCount: 0,
        active: false
      });
    }
  }

  private acquireBullet(): Bullet | null {
    const bullet = this.bulletPool.find(b => !b.active);
    if (bullet) {
      bullet.active = true;
      bullet.id = this.nextId++;
      this.bullets.push(bullet);
      return bullet;
    }
    return null;
  }

  private releaseBullet(bullet: Bullet): void {
    bullet.active = false;
    const index = this.bullets.indexOf(bullet);
    if (index > -1) {
      this.bullets.splice(index, 1);
    }
  }

  setPattern(config: Partial<BulletConfig>): void {
    this.targetConfig = { ...this.targetConfig, ...config };
  }

  getBullets(): Bullet[] {
    return this.bullets.filter(b => b.active);
  }

  getColorPalette(): string[] {
    return this.colorPalette;
  }

  getCurrentConfig(): BulletConfig {
    return { ...this.currentConfig };
  }

  private lerp(current: number, target: number, t: number): number {
    return current + (target - current) * Math.min(t * 2, 1);
  }

  private updateConfig(deltaTime: number): void {
    const t = deltaTime;
    this.currentConfig.density = this.lerp(this.currentConfig.density, this.targetConfig.density, t);
    this.currentConfig.interval = this.lerp(this.currentConfig.interval, this.targetConfig.interval, t);
    this.currentConfig.speed = this.lerp(this.currentConfig.speed, this.targetConfig.speed, t);
    this.currentConfig.size = this.lerp(this.currentConfig.size, this.targetConfig.size, t);
    if (this.currentConfig.pattern !== this.targetConfig.pattern) {
      this.currentConfig.pattern = this.targetConfig.pattern;
    }
    if (this.currentConfig.color !== this.targetConfig.color) {
      this.currentConfig.color = this.targetConfig.color;
    }
  }

  private emitBullets(): void {
    const { pattern, density, speed, size, color } = this.currentConfig;
    const centerX = 400;
    const centerY = 300;
    const bulletSpeed = speed * 60;

    switch (pattern) {
      case 'circle':
        this.emitCircle(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'spiral':
        this.emitSpiral(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'fan':
        this.emitFan(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'wave':
        this.emitWave(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'homing':
        this.emitHoming(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'split':
        this.emitSplit(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'random':
        this.emitRandom(centerX, centerY, density, bulletSpeed, size, color);
        break;
      case 'cross':
        this.emitCross(centerX, centerY, density, bulletSpeed, size, color);
        break;
    }
  }

  private emitCircle(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    for (let i = 0; i < Math.floor(count); i++) {
      const angle = (i / Math.floor(count)) * Math.PI * 2;
      this.createBullet(cx, cy, angle, speed, size, color, 'circle');
    }
  }

  private emitSpiral(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    for (let i = 0; i < Math.floor(count / 3); i++) {
      const angle = this.spiralAngle + (i * Math.PI * 2 / 3);
      this.createBullet(cx, cy, angle, speed, size, color, 'spiral');
    }
    this.spiralAngle += 0.2;
  }

  private emitFan(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    const spreadAngle = Math.PI * 0.6;
    const startAngle = -Math.PI / 2 - spreadAngle / 2;
    const numBullets = Math.floor(count / 2);
    for (let i = 0; i < numBullets; i++) {
      const angle = startAngle + (i / (numBullets - 1 || 1)) * spreadAngle;
      this.createBullet(cx, cy, angle, speed, size, color, 'fan');
    }
  }

  private emitWave(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    const numBullets = Math.floor(count / 2);
    for (let i = 0; i < numBullets; i++) {
      const baseAngle = -Math.PI / 2;
      const waveOffset = Math.sin(this.wavePhase + i * 0.3) * 0.5;
      const angle = baseAngle + waveOffset;
      this.createBullet(cx, cy, angle, speed, size, color, 'wave');
    }
    this.wavePhase += 0.2;
  }

  private emitHoming(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    for (let i = 0; i < Math.floor(count / 4); i++) {
      const angle = Math.random() * Math.PI * 2;
      this.createBullet(cx, cy, angle, speed * 0.7, size, color, 'homing', true);
    }
  }

  private emitSplit(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    for (let i = 0; i < Math.floor(count / 3); i++) {
      const angle = (i / Math.floor(count / 3 || 1)) * Math.PI * 2;
      this.createBullet(cx, cy, angle, speed, size, color, 'split', false, 1);
    }
  }

  private emitRandom(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const angle = Math.random() * Math.PI * 2;
      const randomSpeed = speed * (0.5 + Math.random() * 0.5);
      this.createBullet(cx, cy, angle, randomSpeed, size, color, 'random');
    }
  }

  private emitCross(cx: number, cy: number, count: number, speed: number, size: number, color: string): void {
    const numBullets = Math.floor(count / 4);
    const offset = this.crossPhase % (Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const baseAngle = i * Math.PI / 2 + offset;
      for (let j = 0; j < numBullets; j++) {
        const spreadAngle = baseAngle + (j - numBullets / 2) * 0.1;
        this.createBullet(cx, cy, spreadAngle, speed, size, color, 'cross');
      }
    }
    this.crossPhase += 0.1;
  }

  private createBullet(
    x: number,
    y: number,
    angle: number,
    speed: number,
    size: number,
    color: string,
    pattern: BulletPattern,
    isHoming: boolean = false,
    splitCount: number = 0
  ): void {
    const bullet = this.acquireBullet();
    if (!bullet) return;

    bullet.x = x;
    bullet.y = y;
    bullet.vx = Math.cos(angle) * speed;
    bullet.vy = Math.sin(angle) * speed;
    bullet.speed = speed;
    bullet.size = size;
    bullet.color = color;
    bullet.pattern = pattern;
    bullet.angle = angle;
    bullet.life = 5;
    bullet.isHoming = isHoming;
    bullet.splitCount = splitCount;
  }

  private splitBullet(bullet: Bullet): void {
    if (bullet.splitCount <= 0) return;
    const numSplit = 5;
    for (let i = 0; i < numSplit; i++) {
      const angle = bullet.angle + (i - numSplit / 2) * 0.3;
      this.createBullet(
        bullet.x,
        bullet.y,
        angle,
        bullet.speed * 0.8,
        bullet.size * 0.7,
        bullet.color,
        'split',
        false,
        0
      );
    }
  }

  update(deltaTime: number, playerX: number, playerY: number): void {
    this.updateConfig(deltaTime);

    this.emitTimer += deltaTime;
    if (this.emitTimer >= this.currentConfig.interval) {
      this.emitTimer = 0;
      this.emitBullets();
    }

    this.spatialHash.clear();

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      if (!bullet.active) continue;

      if (bullet.isHoming) {
        const dx = playerX - bullet.x;
        const dy = playerY - bullet.y;
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - bullet.angle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        bullet.angle += normalizedDiff * 0.02;
        bullet.vx = Math.cos(bullet.angle) * bullet.speed;
        bullet.vy = Math.sin(bullet.angle) * bullet.speed;
      }

      if (bullet.pattern === 'wave') {
        bullet.vx += Math.sin(bullet.life * 10) * 0.5;
      }

      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;
      bullet.life -= deltaTime;

      if (bullet.life <= 3 && bullet.splitCount > 0) {
        this.splitBullet(bullet);
        bullet.splitCount = 0;
      }

      const padding = 50;
      if (
        bullet.x < -padding ||
        bullet.x > 800 + padding ||
        bullet.y < -padding ||
        bullet.y > 600 + padding ||
        bullet.life <= 0
      ) {
        this.releaseBullet(bullet);
        continue;
      }

      this.spatialHash.insert(bullet);
    }

    this.render();
  }

  private render(): void {
    this.graphics.clear();

    const activeBullets = this.getBullets();
    for (const bullet of activeBullets) {
      this.graphics.fillStyle(Phaser.Display.Color.HexStringToColor(bullet.color).color);
      this.graphics.beginPath();
      this.graphics.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
      this.graphics.fillPath();

      if (bullet.color === '#ff4444') {
        this.graphics.lineStyle(1, 0xff6666, 0.5);
        this.graphics.beginPath();
        this.graphics.arc(bullet.x, bullet.y, bullet.size + 2, 0, Math.PI * 2);
        this.graphics.strokePath();
      }
    }
  }

  checkCollision(x: number, y: number, radius: number): Bullet | null {
    const nearbyBullets = this.spatialHash.query(x, y, radius);
    for (const bullet of nearbyBullets) {
      if (!bullet.active) continue;
      const dx = bullet.x - x;
      const dy = bullet.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + bullet.size) {
        return bullet;
      }
    }
    return null;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
