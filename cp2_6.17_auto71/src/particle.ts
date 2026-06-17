export type PhysicsSceneType = 'gravity' | 'wind' | 'vortex';

export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  maxSize: number;
  startColor: string;
  endColor: string;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16)
  };
};

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public size: number;
  public maxSize: number;
  public startColor: { r: number; g: number; b: number };
  public endColor: { r: number; g: number; b: number };
  public currentColor: { r: number; g: number; b: number; a: number };
  public alive: boolean;
  public flashTime: number;
  public sceneType: PhysicsSceneType;

  constructor(config: ParticleConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.life = config.life;
    this.maxLife = config.maxLife;
    this.size = config.size;
    this.maxSize = config.maxSize;
    this.startColor = hexToRgb(config.startColor);
    this.endColor = hexToRgb(config.endColor);
    this.currentColor = { ...this.startColor, a: 1 };
    this.alive = true;
    this.flashTime = 0;
    this.sceneType = 'gravity';
  }

  public setScene(type: PhysicsSceneType): void {
    this.sceneType = type;
  }

  public flash(): void {
    this.flashTime = 0.1;
  }

  public update(
    dt: number,
    canvasWidth: number,
    canvasHeight: number,
    wallThickness: number,
    restitution: number
  ): void {
    const lifeRatio = this.life / this.maxLife;

    if (this.flashTime > 0) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) {
        this.flashTime = 0;
      }
    }

    switch (this.sceneType) {
      case 'gravity':
        this.vy += 300 * dt;
        break;
      case 'wind':
        this.vx += 100 * dt;
        this.vy += 50 * dt;
        break;
      case 'vortex': {
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        const dx = this.x - cx;
        const dy = this.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const angle = Math.atan2(dy, dx);
        const tangentForce = 80;
        const inwardForce = 60;
        this.vx += -Math.sin(angle) * tangentForce * dt * 10;
        this.vy += Math.cos(angle) * tangentForce * dt * 10;
        this.vx += (-dx / dist) * inwardForce * dt;
        this.vy += (-dy / dist) * inwardForce * dt;
        this.vx *= 0.995;
        this.vy *= 0.995;
        break;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const leftBound = wallThickness;
    const rightBound = canvasWidth - wallThickness;
    const topBound = wallThickness;
    const bottomBound = canvasHeight - wallThickness;

    if (this.x - this.size < leftBound) {
      this.x = leftBound + this.size;
      this.vx = -this.vx * restitution;
      this.flash();
    } else if (this.x + this.size > rightBound) {
      this.x = rightBound - this.size;
      this.vx = -this.vx * restitution;
      this.flash();
    }

    if (this.y - this.size < topBound) {
      this.y = topBound + this.size;
      this.vy = -this.vy * restitution;
      this.flash();
    } else if (this.y + this.size > bottomBound) {
      this.y = bottomBound - this.size;
      this.vy = -this.vy * restitution;
      this.flash();
    }

    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }

    this.size = this.maxSize * lifeRatio;

    if (this.flashTime > 0) {
      this.currentColor = { r: 255, g: 255, b: 255, a: lifeRatio };
    } else {
      const t = 1 - lifeRatio;
      this.currentColor = {
        r: Math.round(this.startColor.r + (this.endColor.r - this.startColor.r) * t),
        g: Math.round(this.startColor.g + (this.endColor.g - this.startColor.g) * t),
        b: Math.round(this.startColor.b + (this.endColor.b - this.startColor.b) * t),
        a: lifeRatio
      };
    }
  }

  public resolveCollision(other: Particle, restitution: number): void {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.size + other.size;

    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) / 2;
      this.x -= nx * overlap;
      this.y -= ny * overlap;
      other.x += nx * overlap;
      other.y += ny * overlap;

      const randomAngle = Math.random() * Math.PI * 2;
      const speed1 = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * restitution;
      const speed2 = Math.sqrt(other.vx * other.vx + other.vy * other.vy) * restitution;

      this.vx = Math.cos(randomAngle) * speed1;
      this.vy = Math.sin(randomAngle) * speed1;
      other.vx = Math.cos(randomAngle + Math.PI) * speed2;
      other.vy = Math.sin(randomAngle + Math.PI) * speed2;

      this.flash();
      other.flash();
    }
  }
}
