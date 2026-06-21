export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Player {
  x: number;
  y: number;
  baseSpeed = 300;
  radius = 12;
  isSlowed = false;
  slowTimer = 0;
  isBlinking = false;
  blinkTimer = 0;
  blinkCount = 0;
  blinkVisible = true;
  invincible = false;
  invincibleTimer = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, keys: Set<string>, canvasWidth: number, canvasHeight: number, speedMultiplier: number) {
    let dx = 0;
    let dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    let speed = this.baseSpeed * speedMultiplier;
    if (this.isSlowed) {
      speed *= 0.5;
    }

    this.x += dx * speed * dt;
    this.y += dy * speed * dt;

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

    if (this.isSlowed) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.isSlowed = false;
        this.slowTimer = 0;
      }
    }

    if (this.isBlinking) {
      this.blinkTimer += dt;
      if (this.blinkTimer >= 0.2) {
        this.blinkTimer = 0;
        this.blinkCount++;
        this.blinkVisible = !this.blinkVisible;
        if (this.blinkCount >= 6) {
          this.isBlinking = false;
          this.blinkVisible = true;
          this.blinkCount = 0;
        }
      }
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
  }

  onCollision() {
    if (this.invincible) return false;
    this.isSlowed = true;
    this.slowTimer = 1.0;
    this.isBlinking = true;
    this.blinkTimer = 0;
    this.blinkCount = 0;
    this.blinkVisible = false;
    this.invincible = true;
    this.invincibleTimer = 1.6;
    return true;
  }

  generateTrailParticles(): Particle[] {
    const particles: Particle[] = [];
    const count = Math.random() > 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.2;
      const spd = 20 + Math.random() * 60;
      const t = Math.random();
      const r = Math.floor(0xFF * (1 - t) + 0x33 * t);
      const g = Math.floor(0x33 * (1 - t) + 0xFF * t);
      const b = Math.floor(0x66 * (1 - t) + 0xFF * t);
      particles.push({
        x: this.x + (Math.random() - 0.5) * 10,
        y: this.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 5 + Math.random() * 5,
        color: `rgb(${r},${g},${b})`,
        life: 0.5,
        maxLife: 0.5
      });
    }
    return particles;
  }

  reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.isSlowed = false;
    this.slowTimer = 0;
    this.isBlinking = false;
    this.blinkTimer = 0;
    this.blinkCount = 0;
    this.blinkVisible = true;
    this.invincible = false;
    this.invincibleTimer = 0;
  }
}
