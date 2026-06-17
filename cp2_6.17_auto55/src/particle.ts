export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PhysicsForce {
  ax: number;
  ay: number;
  type: 'gravity' | 'wind' | 'vortex';
  centerX?: number;
  centerY?: number;
}

export class Particle {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public life: number = 0;
  public maxLife: number = 1;
  public size: number = 4;
  public startColor: RGB = { r: 255, g: 107, b: 107 };
  public endColor: RGB = { r: 255, g: 255, b: 255 };
  public isFlashing: boolean = false;
  public flashTimer: number = 0;
  public active: boolean = false;

  public reset(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    startColor: RGB,
    endColor: RGB
  ): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.maxLife = maxLife;
    this.life = maxLife;
    this.size = size;
    this.startColor = startColor;
    this.endColor = endColor;
    this.isFlashing = false;
    this.flashTimer = 0;
    this.active = true;
  }

  public update(dt: number, force: PhysicsForce): void {
    if (!this.active) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    if (this.isFlashing) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
      }
    }

    let ax = force.ax;
    let ay = force.ay;

    if (force.type === 'vortex' && force.centerX !== undefined && force.centerY !== undefined) {
      const dx = this.x - force.centerX;
      const dy = this.y - force.centerY;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq) + 0.001;
      const angularSpeed = 2.5;
      const tangentX = -dy / dist;
      const tangentY = dx / dist;
      const centripetalFactor = 80;
      ax = tangentX * angularSpeed * 100 - (dx / dist) * centripetalFactor;
      ay = tangentY * angularSpeed * 100 - (dy / dist) * centripetalFactor;
    }

    this.vx += ax * dt;
    this.vy += ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  public getCurrentColor(): RGB {
    if (this.isFlashing) {
      return { r: 255, g: 255, b: 255 };
    }
    const t = 1 - this.life / this.maxLife;
    return {
      r: Math.round(this.startColor.r + (this.endColor.r - this.startColor.r) * t),
      g: Math.round(this.startColor.g + (this.endColor.g - this.startColor.g) * t),
      b: Math.round(this.startColor.b + (this.endColor.b - this.startColor.b) * t)
    };
  }

  public getAlpha(): number {
    const t = this.life / this.maxLife;
    return Math.max(0, Math.min(1, t));
  }

  public triggerFlash(duration: number = 0.1): void {
    this.isFlashing = true;
    this.flashTimer = duration;
  }
}
