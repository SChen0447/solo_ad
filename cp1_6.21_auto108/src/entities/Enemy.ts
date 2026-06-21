import Phaser from 'phaser';

export class Enemy {
  public scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public maxHp: number;
  public hp: number;
  public speed: number;
  public path: { x: number; y: number }[];
  public pathIndex: number = 0;
  public alive: boolean = true;
  public reachedEnd: boolean = false;
  public slowFactor: number = 1;
  public slowTimer: number = 0;
  private circle: Phaser.GameObjects.Arc;
  private hpBar: Phaser.GameObjects.Graphics;
  private hitFlashTimer: number = 0;
  private baseRadius: number = 8;
  private baseColor: number;

  constructor(
    scene: Phaser.Scene,
    path: { x: number; y: number }[],
    hp: number,
    speed: number,
    index: number,
    total: number
  ) {
    this.scene = scene;
    this.maxHp = hp;
    this.hp = hp;
    this.speed = speed;
    this.path = path;

    const t = index / Math.max(total - 1, 1);
    const r = 0xff;
    const g = Math.floor(0x40 + t * (0xa0 - 0x40));
    const b = Math.floor(t * 0x20);
    this.baseColor = (r << 16) | (g << 8) | b;

    const startX = path[0].x;
    const startY = path[0].y;

    this.container = scene.add.container(startX, startY);

    this.circle = scene.add.arc(0, 0, this.baseRadius, undefined, undefined, false, this.baseColor, 1);
    this.circle.setStrokeStyle(1.5, 0xffffff, 0.4);
    this.container.add(this.circle);

    this.hpBar = scene.add.graphics();
    this.container.add(this.hpBar);
    this.drawHpBar();
  }

  private drawHpBar(): void {
    this.hpBar.clear();
    const barWidth = this.baseRadius * 2.5;
    const barHeight = 3;
    const barY = -this.baseRadius - 6;

    this.hpBar.fillStyle(0x333333, 0.8);
    this.hpBar.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    const hpRatio = this.hp / this.maxHp;
    const barColor = hpRatio > 0.5 ? 0x00e676 : hpRatio > 0.25 ? 0xffc107 : 0xff5252;
    this.hpBar.fillStyle(barColor, 1);
    this.hpBar.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  takeDamage(damage: number): void {
    if (!this.alive) return;
    this.hp -= damage;
    this.hitFlashTimer = 120;
    this.drawHpBar();

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.drawHpBar();
    }
  }

  applySlow(factor: number, duration: number): void {
    this.slowFactor = factor;
    this.slowTimer = duration;
  }

  update(delta: number): void {
    if (!this.alive || this.reachedEnd) return;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= delta;
      this.circle.setFillStyle(0xff0000, 1);
    } else {
      this.circle.setFillStyle(this.baseColor, 1);
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowFactor = 1;
      }
    }

    if (this.pathIndex >= this.path.length - 1) {
      this.reachedEnd = true;
      return;
    }

    const target = this.path[this.pathIndex + 1];
    const dx = target.x - this.container.x;
    const dy = target.y - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const effectiveSpeed = this.speed * this.slowFactor;
    const moveAmount = effectiveSpeed * (delta / 1000);

    if (dist <= moveAmount) {
      this.container.x = target.x;
      this.container.y = target.y;
      this.pathIndex++;
    } else {
      this.container.x += (dx / dist) * moveAmount;
      this.container.y += (dy / dist) * moveAmount;
    }
  }

  getWorldX(): number {
    return this.container.x;
  }

  getWorldY(): number {
    return this.container.y;
  }

  isOffPath(): boolean {
    return this.reachedEnd || !this.alive;
  }

  destroy(): void {
    this.container.destroy();
  }
}
