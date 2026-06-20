import { ParticleSystem } from './particle';

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  targetRotation: number;
  energy: number;
  isBoosting: boolean;
  boostTime: number;
  boostDuration: number;
  isInvincible: boolean;
  speed: number;
  normalSpeed: number;
  boostSpeed: number;
}

export class Player {
  private state: PlayerState;
  private keys: Set<string>;
  private particleSystem: ParticleSystem;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number };
  private rotationLerpSpeed: number;
  private maxRotation: number;

  constructor(
    startX: number,
    startY: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    particleSystem: ParticleSystem
  ) {
    this.bounds = bounds;
    this.particleSystem = particleSystem;
    this.keys = new Set();
    this.rotationLerpSpeed = 5;
    this.maxRotation = 5 * Math.PI / 180;

    this.state = {
      x: startX,
      y: startY,
      width: 16,
      height: 16,
      rotation: 0,
      targetRotation: 0,
      energy: 0,
      isBoosting: false,
      boostTime: 0,
      boostDuration: 1.5,
      isInvincible: false,
      speed: 150,
      normalSpeed: 150,
      boostSpeed: 300
    };

    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());

      if (e.key === ' ' && this.state.energy >= 100 && !this.state.isBoosting) {
        this.activateBoost();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private activateBoost(): void {
    this.state.isBoosting = true;
    this.state.boostTime = this.state.boostDuration;
    this.state.isInvincible = true;
    this.state.energy = 0;
  }

  update(dt: number): void {
    const s = this.state;
    let dx = 0;
    let dy = 0;

    if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const currentSpeed = s.isBoosting ? s.boostSpeed : s.normalSpeed;
    s.x += dx * currentSpeed * dt;
    s.y += dy * currentSpeed * dt;

    s.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, s.x));
    s.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, s.y));

    s.targetRotation = dx * this.maxRotation;
    s.rotation += (s.targetRotation - s.rotation) * this.rotationLerpSpeed * dt;

    if (s.isBoosting) {
      s.boostTime -= dt;
      if (s.boostTime <= 0) {
        s.isBoosting = false;
        s.isInvincible = false;
      }
    }

    if (s.isBoosting) {
      for (let i = 0; i < 2; i++) {
        this.particleSystem.emitFlame(s.x, s.y + s.height / 2);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.state;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);

    if (s.isBoosting) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#4fc3f7';
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    }

    const gradient = ctx.createLinearGradient(0, -s.height / 2, 0, s.height / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#c0c0c0');
    gradient.addColorStop(1, '#808080');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -s.height / 2);
    ctx.lineTo(-s.width / 2, s.height / 2);
    ctx.lineTo(s.width / 2, s.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.state.x - this.state.width / 2,
      y: this.state.y - this.state.height / 2,
      width: this.state.width,
      height: this.state.height
    };
  }

  getPosition(): { x: number; y: number } {
    return { x: this.state.x, y: this.state.y };
  }

  getEnergy(): number {
    return this.state.energy;
  }

  addEnergy(amount: number): void {
    this.state.energy = Math.min(100, this.state.energy + amount);
  }

  isInvincible(): boolean {
    return this.state.isInvincible;
  }

  isBoosting(): boolean {
    return this.state.isBoosting;
  }

  reset(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
    this.state.energy = 0;
    this.state.isBoosting = false;
    this.state.boostTime = 0;
    this.state.isInvincible = false;
    this.state.rotation = 0;
    this.state.targetRotation = 0;
  }

  setBounds(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this.bounds = bounds;
  }
}
