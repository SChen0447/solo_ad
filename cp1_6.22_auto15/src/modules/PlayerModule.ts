export interface KeyBinding {
  up: string;
  down: string;
  left: string;
  right: string;
  action: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class PlayerModule {
  private scene: Phaser.Scene;
  private playerGraphics: Phaser.GameObjects.Graphics;
  private particleGraphics: Phaser.GameObjects.Graphics;
  private keyBinding: KeyBinding;
  private keys: Map<string, Phaser.Input.Keyboard.Key> = new Map();

  private _x: number = 400;
  private _y: number = 500;
  private _alive: boolean = true;
  private _speed: number = 200;
  private _collisionCount: number = 0;
  private _survivalTime: number = 0;
  private _size: number = 20;

  private particles: Particle[] = [];
  private flashTimer: number = 0;
  private invulnerableTimer: number = 0;
  private isFlashActive: boolean = false;

  private readonly CANVAS_WIDTH: number = 800;
  private readonly CANVAS_HEIGHT: number = 600;
  private readonly PLAYER_RADIUS: number = 10;
  private readonly INVULNERABLE_DURATION: number = 1;

  constructor(scene: Phaser.Scene, binding: KeyBinding) {
    this.scene = scene;
    this.keyBinding = binding;
    this.playerGraphics = scene.add.graphics();
    this.particleGraphics = scene.add.graphics();
    this.setupInput();
  }

  private setupInput(): void {
    const bindingKeys = [
      this.keyBinding.up,
      this.keyBinding.down,
      this.keyBinding.left,
      this.keyBinding.right,
      this.keyBinding.action
    ];

    for (const key of bindingKeys) {
      const keyObj = this.scene.input.keyboard?.addKey(key);
      if (keyObj) {
        this.keys.set(key, keyObj);
      }
    }
  }

  setKeyBinding(binding: KeyBinding): void {
    for (const key of this.keys.values()) {
      this.scene.input.keyboard?.removeKey(key);
    }
    this.keys.clear();
    this.keyBinding = binding;
    this.setupInput();
  }

  get position(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  get alive(): boolean {
    return this._alive;
  }

  get collisionCount(): number {
    return this._collisionCount;
  }

  get survivalTime(): number {
    return this._survivalTime;
  }

  get isFlashing(): boolean {
    return this.isFlashActive;
  }

  get size(): number {
    return this._size;
  }

  get radius(): number {
    return this.PLAYER_RADIUS;
  }

  setPosition(x: number, y: number): void {
    this._x = Phaser.Math.Clamp(x, this.PLAYER_RADIUS, this.CANVAS_WIDTH - this.PLAYER_RADIUS);
    this._y = Phaser.Math.Clamp(y, this.PLAYER_RADIUS, this.CANVAS_HEIGHT - this.PLAYER_RADIUS);
  }

  incrementCollision(): void {
    this._collisionCount++;
    this.invulnerableTimer = this.INVULNERABLE_DURATION;
    this.flashTimer = 0.1;
    this.isFlashActive = true;
  }

  triggerExplosion(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 3
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    this.particleGraphics.clear();
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const color = Phaser.Display.Color.GetColor(
        Math.floor(255),
        Math.floor(221 * alpha),
        Math.floor(68 * alpha)
      );
      this.particleGraphics.fillStyle(color, alpha);
      this.particleGraphics.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }

  private renderPlayer(): void {
    this.playerGraphics.clear();

    const alpha = this.invulnerableTimer > 0 ? (Math.floor(Date.now() / 100) % 2 === 0 ? 0.5 : 1) : 1;

    this.playerGraphics.fillStyle(0xffffff, alpha);
    this.playerGraphics.beginPath();
    this.playerGraphics.moveTo(this._x, this._y - this.PLAYER_RADIUS);
    this.playerGraphics.lineTo(this._x - this.PLAYER_RADIUS * 0.8, this._y + this.PLAYER_RADIUS * 0.8);
    this.playerGraphics.lineTo(this._x + this.PLAYER_RADIUS * 0.8, this._y + this.PLAYER_RADIUS * 0.8);
    this.playerGraphics.closePath();
    this.playerGraphics.fillPath();

    this.playerGraphics.lineStyle(2, 0x00d2ff, alpha * 0.8);
    this.playerGraphics.beginPath();
    this.playerGraphics.moveTo(this._x, this._y - this.PLAYER_RADIUS);
    this.playerGraphics.lineTo(this._x - this.PLAYER_RADIUS * 0.8, this._y + this.PLAYER_RADIUS * 0.8);
    this.playerGraphics.lineTo(this._x + this.PLAYER_RADIUS * 0.8, this._y + this.PLAYER_RADIUS * 0.8);
    this.playerGraphics.closePath();
    this.playerGraphics.strokePath();
  }

  private isKeyDown(action: keyof KeyBinding): boolean {
    const key = this.keys.get(this.keyBinding[action]);
    return key?.isDown ?? false;
  }

  isActionKeyJustDown(): boolean {
    const key = this.keys.get(this.keyBinding.action);
    return Phaser.Input.Keyboard.JustDown(key!);
  }

  update(deltaTime: number): void {
    this._survivalTime += deltaTime;

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.isFlashActive = false;
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= deltaTime;
    }

    let dx = 0;
    let dy = 0;

    if (this.isKeyDown('up')) dy -= 1;
    if (this.isKeyDown('down')) dy += 1;
    if (this.isKeyDown('left')) dx -= 1;
    if (this.isKeyDown('right')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    this._x += dx * this._speed * deltaTime;
    this._y += dy * this._speed * deltaTime;

    this._x = Phaser.Math.Clamp(this._x, this.PLAYER_RADIUS, this.CANVAS_WIDTH - this.PLAYER_RADIUS);
    this._y = Phaser.Math.Clamp(this._y, this.PLAYER_RADIUS, this.CANVAS_HEIGHT - this.PLAYER_RADIUS);

    this.updateParticles(deltaTime);
    this.renderPlayer();
    this.renderParticles();
  }

  isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  reset(): void {
    this._x = 400;
    this._y = 500;
    this._alive = true;
    this._collisionCount = 0;
    this._survivalTime = 0;
    this.particles = [];
    this.flashTimer = 0;
    this.invulnerableTimer = 0;
    this.isFlashActive = false;
  }

  destroy(): void {
    this.playerGraphics.destroy();
    this.particleGraphics.destroy();
  }
}
