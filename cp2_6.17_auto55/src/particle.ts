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

export interface Boundary {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
  public colorFlashTimer: number = 0;
  public active: boolean = false;

  private static readonly BOUNCE_ELASTICITY = 0.7;

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
    this.colorFlashTimer = 0;
    this.active = true;
  }

  public update(dt: number, force: PhysicsForce): void {
    if (!this.active) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    if (this.colorFlashTimer > 0) {
      this.colorFlashTimer -= dt;
      if (this.colorFlashTimer < 0) {
        this.colorFlashTimer = 0;
      }
    }

    let ax = force.ax;
    let ay = force.ay;

    if (force.type === 'vortex' && force.centerX !== undefined && force.centerY !== undefined) {
      const dx = this.x - force.centerX;
      const dy = this.y - force.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
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

  public handleBoundaryCollision(boundary: Boundary): boolean {
    if (!this.active) return false;

    let collided = false;
    const radius = this.size / 2;

    if (this.x - radius < boundary.left) {
      this.x = boundary.left + radius;
      this.vx = -this.vx * Particle.BOUNCE_ELASTICITY;
      collided = true;
    } else if (this.x + radius > boundary.right) {
      this.x = boundary.right - radius;
      this.vx = -this.vx * Particle.BOUNCE_ELASTICITY;
      collided = true;
    }

    if (this.y - radius < boundary.top) {
      this.y = boundary.top + radius;
      this.vy = -this.vy * Particle.BOUNCE_ELASTICITY;
      collided = true;
    } else if (this.y + radius > boundary.bottom) {
      this.y = boundary.bottom - radius;
      this.vy = -this.vy * Particle.BOUNCE_ELASTICITY;
      collided = true;
    }

    if (collided) {
      this.colorFlashTimer = 0.1;
    }

    return collided;
  }

  public getCurrentColor(): RGB {
    if (this.colorFlashTimer > 0) {
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
}
