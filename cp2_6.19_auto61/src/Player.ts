export type PlayerState = 'running' | 'jumping' | 'sliding';

export type PlayerData = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  state: PlayerState;
  runFrame: number;
  jumpProgress: number;
  slideProgress: number;
  isInvincible: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
};

export class Player {
  private x: number = 150;
  private baseY: number = 0;
  private width: number = 40;
  private height: number = 60;
  private state: PlayerState = 'running';
  private runFrame: number = 0;
  private runTimer: number = 0;
  private runFrameDuration: number = 0.08;

  private jumpDuration: number = 0.6;
  private jumpTimer: number = 0;
  private jumpHeight: number = 150;

  private slideDuration: number = 0.4;
  private slideTimer: number = 0;
  private slideHeightRatio: number = 1 / 3;

  private particles: Particle[] = [];
  private maxParticles: number = 50;
  private particleTimer: number = 0;

  constructor(groundY: number = 0) {
    this.baseY = groundY;
  }

  public setGroundY(groundY: number): void {
    this.baseY = groundY;
    if (this.state === 'running') {
      this.y = groundY;
    }
  }

  public setMaxParticles(count: number): void {
    this.maxParticles = count;
  }

  public update(dt: number, gameSpeed: number): void {
    this.runTimer += dt;
    const speedMultiplier = 1 + (gameSpeed - 300) / 600;
    const adjustedFrameDuration = this.runFrameDuration / Math.max(0.5, speedMultiplier);

    if (this.runTimer >= adjustedFrameDuration) {
      this.runTimer = 0;
      this.runFrame = (this.runFrame + 1) % 4;
    }

    if (this.state === 'jumping') {
      this.jumpTimer += dt;
      if (this.jumpTimer >= this.jumpDuration) {
        this.state = 'running';
        this.jumpTimer = 0;
        this.y = this.baseY;
      }
    }

    if (this.state === 'sliding') {
      this.slideTimer += dt;
      if (this.slideTimer >= this.slideDuration) {
        this.state = 'running';
        this.slideTimer = 0;
      }

      this.particleTimer += dt;
      if (this.particleTimer >= 0.02 && this.particles.length < this.maxParticles) {
        this.particleTimer = 0;
        this.spawnSlideParticle();
      }
    }

    this.updateParticles(dt);
  }

  private spawnSlideParticle(): void {
    const particle: Particle = {
      x: this.x + this.width * 0.3 + Math.random() * this.width * 0.4,
      y: this.baseY - 2,
      vx: -2 - Math.random() * 3,
      vy: -Math.random() * 2,
      life: 0.4,
      maxLife: 0.4,
      size: 3 + Math.random() * 4,
      alpha: 0.8
    };
    this.particles.push(particle);
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 20 * dt;
      p.life -= dt;
      p.alpha = (p.life / p.maxLife) * 0.8;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public jump(): boolean {
    if (this.state !== 'running') return false;
    this.state = 'jumping';
    this.jumpTimer = 0;
    return true;
  }

  public slide(): boolean {
    if (this.state !== 'running') return false;
    this.state = 'sliding';
    this.slideTimer = 0;
    this.particles = [];
    return true;
  }

  public getState(): PlayerState {
    return this.state;
  }

  public getData(): PlayerData {
    const currentHeight = this.getCurrentHeight();
    const currentY = this.getCurrentY();

    return {
      x: this.x,
      y: currentY,
      width: this.width,
      height: currentHeight,
      rotation: this.getRotation(),
      state: this.state,
      runFrame: this.runFrame,
      jumpProgress: this.state === 'jumping' ? this.jumpTimer / this.jumpDuration : 0,
      slideProgress: this.state === 'sliding' ? this.slideTimer / this.slideDuration : 0,
      isInvincible: false
    };
  }

  private getCurrentHeight(): number {
    if (this.state === 'sliding') {
      const t = this.easeOutQuad(this.slideTimer / this.slideDuration);
      return this.height * (1 - (1 - this.slideHeightRatio) * t);
    }
    return this.height;
  }

  private getCurrentY(): number {
    if (this.state === 'jumping') {
      const t = this.jumpTimer / this.jumpDuration;
      const jumpOffset = this.easeOutQuad(1 - Math.abs(2 * t - 1)) * this.jumpHeight;
      return this.baseY - jumpOffset;
    }
    return this.baseY;
  }

  private getRotation(): number {
    if (this.state === 'jumping') {
      const t = this.jumpTimer / this.jumpDuration;
      return Math.PI * 2 * t;
    }
    return 0;
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getHitbox(): { x: number; y: number; width: number; height: number } {
    const h = this.getCurrentHeight();
    const y = this.getCurrentY() - h;
    return {
      x: this.x,
      y: y,
      width: this.width,
      height: h
    };
  }

  public reset(): void {
    this.state = 'running';
    this.jumpTimer = 0;
    this.slideTimer = 0;
    this.runFrame = 0;
    this.y = this.baseY;
    this.particles = [];
  }
}
