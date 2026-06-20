import { ParticleType, PARTICLE_CONFIGS } from './particleTypes';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  life: number;
  maxLife: number;
  size: number;
  isStatic: boolean;
  color: string;
  glowColor: string;
  phase: number;
  settled: boolean;
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Particle[]>;

  constructor(cellSize: number = 20) {
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

  insert(particle: Particle): void {
    const key = this.getKey(particle.x, particle.y);
    let bucket = this.grid.get(key);
    if (!bucket) {
      bucket = [];
      this.grid.set(key, bucket);
    }
    bucket.push(particle);
  }

  query(x: number, y: number, radius: number): Particle[] {
    const result: Particle[] = [];
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        const bucket = this.grid.get(key);
        if (bucket) {
          for (const p of bucket) {
            const dx = p.x - x;
            const dy = p.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
              result.push(p);
            }
          }
        }
      }
    }
    return result;
  }

  queryNearby(particle: Particle, radius: number): Particle[] {
    return this.query(particle.x, particle.y, radius).filter(p => p.id !== particle.id);
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private spatialHash: SpatialHash;
  private nextId: number = 0;
  private width: number;
  private height: number;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private maxParticles: number = 3000;
  private steamParticles: Particle[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.spatialHash = new SpatialHash(25);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  spawnParticle(worldX: number, worldY: number, type: ParticleType, vx: number = 0, vy: number = 0): void {
    if (this.particles.length >= this.maxParticles) return;

    const config = PARTICLE_CONFIGS[type];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5;

    const particle: Particle = {
      id: this.nextId++,
      x: worldX,
      y: worldY,
      vx: vx + Math.cos(angle) * speed,
      vy: vy + Math.sin(angle) * speed,
      type,
      life: config.lifeTime,
      maxLife: config.lifeTime,
      size: config.size,
      isStatic: config.isStatic,
      color: config.color,
      glowColor: config.glowColor,
      phase: Math.random() * Math.PI * 2,
      settled: false
    };

    this.particles.push(particle);
  }

  spawnBurst(worldX: number, worldY: number, type: ParticleType, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      this.spawnParticle(worldX, worldY, type, Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  clear(): void {
    this.particles = [];
    this.steamParticles = [];
    this.nextId = 0;
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 1 / 30);
    const timeScale = dt * 60;

    this.spatialHash.clear();
    for (const p of this.particles) {
      this.spatialHash.insert(p);
    }

    const toRemove: number[] = [];
    const newParticles: Particle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const config = PARTICLE_CONFIGS[p.type];

      if (p.life > 0) {
        p.life -= timeScale;
        if (p.life <= 0) {
          toRemove.push(i);
          continue;
        }
      }

      if (p.isStatic && p.settled) {
        p.phase += 0.02 * timeScale;
        continue;
      }

      p.vy += config.gravity * timeScale;
      p.vx *= Math.pow(config.friction, timeScale);
      p.vy *= Math.pow(config.friction, timeScale);

      const maxSpeed = 15;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.phase += 0.05 * timeScale;

      if (p.x < 0) {
        p.x = 0;
        p.vx = Math.abs(p.vx) * 0.3;
      }
      if (p.x > this.width) {
        p.x = this.width;
        p.vx = -Math.abs(p.vx) * 0.3;
      }
      if (p.y < 0) {
        p.y = 0;
        p.vy = Math.abs(p.vy) * 0.3;
      }
      if (p.y > this.height) {
        p.y = this.height;
        p.vy = -Math.abs(p.vy) * 0.3;
        if (p.type === ParticleType.EARTH) {
          p.settled = true;
          p.vx = 0;
          p.vy = 0;
        }
      }

      this.handleCollisions(p, newParticles, timeScale);
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }

    for (const p of newParticles) {
      if (this.particles.length < this.maxParticles) {
        this.particles.push(p);
      }
    }

    this.updateSteam(timeScale);
  }

  private handleCollisions(p: Particle, newParticles: Particle[], timeScale: number): void {
    const nearby = this.spatialHash.queryNearby(p, 15);

    for (const other of nearby) {
      if (p.id === other.id) continue;

      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (p.size + other.size) / 2;

      if (dist < minDist && dist > 0) {
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        if (!p.isStatic) {
          p.x -= nx * overlap;
          p.y -= ny * overlap;
        }
        if (!other.isStatic) {
          other.x += nx * overlap;
          other.y += ny * overlap;
        }

        this.handleParticleInteraction(p, other, newParticles, timeScale);

        if (!p.isStatic && !other.isStatic) {
          const dvx = p.vx - other.vx;
          const dvy = p.vy - other.vy;
          const dvDotN = dvx * nx + dvy * ny;

          if (dvDotN > 0) {
            const p1Mass = PARTICLE_CONFIGS[p.type].density;
            const p2Mass = PARTICLE_CONFIGS[other.type].density;
            const totalMass = p1Mass + p2Mass;
            const impulse = (2 * dvDotN) / totalMass;

            p.vx -= impulse * p2Mass * nx * 0.5;
            p.vy -= impulse * p2Mass * ny * 0.5;
            other.vx += impulse * p1Mass * nx * 0.5;
            other.vy += impulse * p1Mass * ny * 0.5;
          }
        }
      }
    }

    if (p.type === ParticleType.MAGIC) {
      this.applyMagicAttraction(p, nearby, timeScale);
    }

    if (p.type === ParticleType.PLANT) {
      this.tryPlantGrowth(p, nearby, newParticles, timeScale);
    }

    if (p.type === ParticleType.FIRE) {
      this.tryFireSpread(p, nearby, newParticles, timeScale);
    }
  }

  private handleParticleInteraction(p: Particle, other: Particle, newParticles: Particle[], timeScale: number): void {
    if ((p.type === ParticleType.FIRE && other.type === ParticleType.WATER) ||
        (p.type === ParticleType.WATER && other.type === ParticleType.FIRE)) {
      const fireParticle = p.type === ParticleType.FIRE ? p : other;
      const waterParticle = p.type === ParticleType.WATER ? p : other;

      fireParticle.life -= 5 * timeScale;
      waterParticle.life -= 3 * timeScale;

      if (Math.random() < 0.3) {
        this.createSteamParticle((p.x + other.x) / 2, (p.y + other.y) / 2);
      }
    }

    if (p.type === ParticleType.EARTH && other.type === ParticleType.WATER) {
      if (Math.random() < 0.002 * timeScale) {
        this.createPlantParticle(other.x, other.y, newParticles);
        other.life -= 20;
      }
    }
    if (other.type === ParticleType.EARTH && p.type === ParticleType.WATER) {
      if (Math.random() < 0.002 * timeScale) {
        this.createPlantParticle(p.x, p.y, newParticles);
        p.life -= 20;
      }
    }
  }

  private applyMagicAttraction(p: Particle, nearby: Particle[], timeScale: number): void {
    const attractRadius = 80;
    const attractForce = 0.08;

    for (const other of nearby) {
      if (other.type === ParticleType.MAGIC) continue;

      const dx = p.x - other.x;
      const dy = p.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < attractRadius && dist > 5) {
        const force = attractForce * (1 - dist / attractRadius) * timeScale;
        if (!other.isStatic) {
          other.vx += (dx / dist) * force;
          other.vy += (dy / dist) * force;
        }
      }
    }
  }

  private tryPlantGrowth(p: Particle, nearby: Particle[], newParticles: Particle[], timeScale: number): void {
    if (!p.settled) {
      let onEarth = false;
      for (const other of nearby) {
        if (other.type === ParticleType.EARTH) {
          const dx = other.x - p.x;
          const dy = other.y - p.y;
          if (Math.abs(dx) < 8 && dy > -5 && dy < 15) {
            onEarth = true;
            break;
          }
        }
      }
      if (onEarth) {
        p.settled = true;
        p.isStatic = true;
        p.vx = 0;
        p.vy = 0;
      }
    }

    if (p.settled && Math.random() < 0.003 * timeScale) {
      const spreadX = p.x + (Math.random() - 0.5) * 20;
      const spreadY = p.y + (Math.random() - 0.5) * 20;

      let canGrow = false;
      for (const other of nearby) {
        if (other.type === ParticleType.EARTH) {
          const dx = other.x - spreadX;
          const dy = other.y - spreadY;
          if (Math.abs(dx) < 10 && Math.abs(dy) < 15) {
            canGrow = true;
            break;
          }
        }
      }

      if (canGrow) {
        this.createPlantParticle(spreadX, spreadY - 5, newParticles);
      }
    }
  }

  private tryFireSpread(_p: Particle, nearby: Particle[], _newParticles: Particle[], timeScale: number): void {
    if (Math.random() < 0.01 * timeScale) {
      for (const other of nearby) {
        if (other.type === ParticleType.PLANT) {
          if (Math.random() < 0.1 * timeScale) {
            other.type = ParticleType.FIRE;
            other.color = PARTICLE_CONFIGS[ParticleType.FIRE].color;
            other.glowColor = PARTICLE_CONFIGS[ParticleType.FIRE].glowColor;
            other.life = 80;
            other.maxLife = 80;
            other.isStatic = false;
            other.settled = false;
            other.vy = -1;
            break;
          }
        }
      }
    }
  }

  private createPlantParticle(x: number, y: number, newParticles: Particle[]): void {
    const config = PARTICLE_CONFIGS[ParticleType.PLANT];
    newParticles.push({
      id: this.nextId++,
      x,
      y,
      vx: 0,
      vy: 0,
      type: ParticleType.PLANT,
      life: -1,
      maxLife: -1,
      size: config.size,
      isStatic: true,
      color: config.color,
      glowColor: config.glowColor,
      phase: Math.random() * Math.PI * 2,
      settled: true
    });
  }

  private createSteamParticle(x: number, y: number): void {
    if (this.steamParticles.length > 200) return;

    this.steamParticles.push({
      id: this.nextId++,
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random(),
      type: ParticleType.WATER,
      life: 60,
      maxLife: 60,
      size: 6,
      isStatic: false,
      color: 'rgba(200, 200, 200, 0.6)',
      glowColor: 'rgba(200, 200, 200, 0.2)',
      phase: 0,
      settled: false
    });
  }

  private updateSteam(timeScale: number): void {
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.life -= timeScale;
      if (p.life <= 0) {
        this.steamParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * timeScale;
      p.y += p.vy * timeScale;
      p.vx *= 0.99;
      p.vy *= 0.98;
      p.size += 0.05 * timeScale;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-this.offsetX, -this.offsetY);

    for (const p of this.steamParticles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 200, 200, ${alpha * 0.3})`;
      ctx.fill();
    }

    for (const p of this.particles) {
      this.renderParticle(ctx, p);
    }

    ctx.restore();
  }

  private renderParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    let alpha = 1;

    if (p.life > 0) {
      alpha = Math.min(1, p.life / Math.min(30, p.maxLife));
      if (p.life < 20) {
        alpha = p.life / 20;
      }
    }

    if (p.type === ParticleType.MAGIC) {
      const flicker = 0.7 + Math.sin(p.phase * 3) * 0.3;
      alpha *= flicker;
    }

    if (p.type === ParticleType.FIRE) {
      const flicker = 0.85 + Math.sin(p.phase * 5 + Math.random() * 0.5) * 0.15;
      alpha *= flicker;
    }

    const glowSize = p.size * 2.5;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(0.4, p.glowColor);
    gradient.addColorStop(1, 'transparent');

    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}
