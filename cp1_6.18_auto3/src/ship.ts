import type { Planet, Ore, Asteroid, Enemy, EnemyBullet } from './planet';
import { ORE_TYPES } from './planet';

export interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
  angle: number;
}

export interface HitResult {
  hitPlanet?: Planet;
  hitOre?: Ore;
  hitAsteroid?: Asteroid;
  hitEnemy?: Enemy;
}

export class Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  radius: number = 16;
  speed: number = 260;
  acceleration: number = 900;
  friction: number = 0.96;
  lasers: Laser[] = [];
  private shootCooldown: number = 0;
  private readonly SHOOT_DELAY: number = 0.18;
  private width: number;
  private height: number;

  invincibleTime: number = 0;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.x = Math.min(this.x, width - this.radius);
    this.y = Math.min(this.y, height - this.radius);
  }

  update(
    dt: number,
    keys: Record<string, boolean>,
    fuelAvailable: boolean,
    onTrail: (x: number, y: number, angle: number) => void
  ): void {
    if (this.invincibleTime > 0) this.invincibleTime -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    let ax = 0;
    let ay = 0;

    if (fuelAvailable) {
      if (keys['KeyW']) ay -= 1;
      if (keys['KeyS']) ay += 1;
      if (keys['KeyA']) ax -= 1;
      if (keys['KeyD']) ax += 1;
    }

    const mag = Math.sqrt(ax * ax + ay * ay);
    if (mag > 0) {
      ax /= mag;
      ay /= mag;
      this.vx += ax * this.acceleration * dt;
      this.vy += ay * this.acceleration * dt;
      this.angle = Math.atan2(ay, ax);
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.speed) {
      this.vx = (this.vx / speed) * this.speed;
      this.vy = (this.vy / speed) * this.speed;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = Math.max(this.radius, Math.min(this.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(this.height - this.radius, this.y));

    if (mag > 0 && Math.random() < 0.8) {
      onTrail(this.x, this.y, this.angle);
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.life -= dt;
      if (l.life <= 0 || l.x < -50 || l.x > this.width + 50 || l.y < -50 || l.y > this.height + 50) {
        this.lasers.splice(i, 1);
      }
    }
  }

  shoot(): void {
    if (this.shootCooldown > 0) return;
    this.shootCooldown = this.SHOOT_DELAY;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const speed = 650;

    this.lasers.push({
      x: this.x + cosA * (this.radius + 4),
      y: this.y + sinA * (this.radius + 4),
      vx: cosA * speed + this.vx * 0.5,
      vy: sinA * speed + this.vy * 0.5,
      life: 1.2,
      maxLife: 1.2,
      length: 28,
      angle: this.angle,
    });
  }

  checkLaserHits(
    planets: Planet[],
    asteroids: Asteroid[],
    enemies: Enemy[]
  ): { laser: Laser; result: HitResult }[] {
    const results: { laser: Laser; result: HitResult }[] = [];
    const toRemove = new Set<number>();

    for (let li = 0; li < this.lasers.length; li++) {
      const l = this.lasers[li];
      if (toRemove.has(li)) continue;

      for (const p of planets) {
        for (const ore of p.ores) {
          if (ore.collected) continue;
          const ox = p.x + Math.cos(ore.angle + p.rotation) * ore.orbitRadius;
          const oy = p.y + Math.sin(ore.angle + p.rotation) * ore.orbitRadius;
          const dx = l.x - ox;
          const dy = l.y - oy;
          if (dx * dx + dy * dy < (ore.size + 5) * (ore.size + 5)) {
            toRemove.add(li);
            results.push({ laser: l, result: { hitPlanet: p, hitOre: ore } });
            break;
          }
        }
        if (toRemove.has(li)) break;
      }
      if (toRemove.has(li)) continue;

      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        const dx = l.x - a.x;
        const dy = l.y - a.y;
        if (dx * dx + dy * dy < a.radius * a.radius) {
          toRemove.add(li);
          results.push({ laser: l, result: { hitAsteroid: a } });
          break;
        }
      }
      if (toRemove.has(li)) continue;

      for (const e of enemies) {
        const dx = l.x - e.x;
        const dy = l.y - e.y;
        if (dx * dx + dy * dy < e.radius * e.radius) {
          toRemove.add(li);
          results.push({ laser: l, result: { hitEnemy: e } });
          break;
        }
      }
    }

    const sorted = Array.from(toRemove).sort((a, b) => b - a);
    for (const idx of sorted) this.lasers.splice(idx, 1);

    return results;
  }

  checkCollisions(
    planets: Planet[],
    asteroids: Asteroid[],
    enemies: Enemy[],
    enemyBullets: EnemyBullet[]
  ): { hitPlanet?: Planet; hitAsteroid?: Asteroid; hitEnemy?: Enemy; hitBullet?: EnemyBullet } | null {
    if (this.invincibleTime > 0) return null;

    for (const a of asteroids) {
      const dx = this.x - a.x;
      const dy = this.y - a.y;
      const r = this.radius + a.radius * 0.8;
      if (dx * dx + dy * dy < r * r) return { hitAsteroid: a };
    }

    for (const e of enemies) {
      const dx = this.x - e.x;
      const dy = this.y - e.y;
      const r = this.radius + e.radius;
      if (dx * dx + dy * dy < r * r) return { hitEnemy: e };
    }

    for (let bi = enemyBullets.length - 1; bi >= 0; bi--) {
      const b = enemyBullets[bi];
      const dx = this.x - b.x;
      const dy = this.y - b.y;
      const r = this.radius + b.radius;
      if (dx * dx + dy * dy < r * r) {
        enemyBullets.splice(bi, 1);
        return { hitBullet: b };
      }
    }

    for (const p of planets) {
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const r = this.radius + p.radius;
      if (dx * dx + dy * dy < r * r) return { hitPlanet: p };
    }

    return null;
  }

  setInvincible(seconds: number): void {
    this.invincibleTime = seconds;
  }

  bounce(dx: number, dy: number): void {
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const bounceStrength = 280;
    this.vx = nx * bounceStrength;
    this.vy = ny * bounceStrength;
  }

  damage(damage: number = 1): number {
    this.setInvincible(1.5);
    return damage;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flash = this.invincibleTime > 0 && Math.floor(Date.now() / 80) % 2 === 0;
    if (!flash) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#42a5f5';

      ctx.fillStyle = '#1e88e5';
      ctx.strokeStyle = '#90caf9';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(this.radius + 4, 0);
      ctx.lineTo(-this.radius * 0.5, -this.radius * 0.95);
      ctx.lineTo(-this.radius * 0.2, 0);
      ctx.lineTo(-this.radius * 0.5, this.radius * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 10;
      ctx.shadowColor = '#e3f2fd';
      ctx.fillStyle = '#e3f2fd';
      ctx.beginPath();
      ctx.ellipse(this.radius * 0.15, 0, this.radius * 0.35, this.radius * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      const cosA = 1;
      const sinA = 0;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff9800';
      ctx.fillStyle = '#ffb74d';
      ctx.beginPath();
      ctx.moveTo(-this.radius * 0.45, -this.radius * 0.4);
      ctx.lineTo(-this.radius * 0.75 - Math.random() * 6, 0);
      ctx.lineTo(-this.radius * 0.45, this.radius * 0.4);
      ctx.closePath();
      ctx.fill();

      void cosA;
      void sinA;
    }

    ctx.restore();

    for (const l of this.lasers) {
      const alpha = l.life / l.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00e676';

      const tipX = l.x;
      const tipY = l.y;
      const tailX = l.x - Math.cos(l.angle) * l.length;
      const tailY = l.y - Math.sin(l.angle) * l.length;

      const gradient = ctx.createLinearGradient(tipX, tipY, tailX, tailY);
      gradient.addColorStop(0, '#b9f6ca');
      gradient.addColorStop(0.5, '#00e676');
      gradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

export { ORE_TYPES };
