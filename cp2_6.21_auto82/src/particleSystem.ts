import { FieldManager } from './fieldManager';
import { ObstacleConfig } from './levelLoader';

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface PulseEffect {
  x: number;
  y: number;
  elapsed: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  charge: number;
  radius: number;
  selected: boolean;
  reached: boolean;
  targetIndex: number;
  pulseEffect: PulseEffect | null;
}

export class ParticleSystem {
  particles: Particle[] = [];
  sparks: Spark[] = [];
  private k = 500;
  private maxSpeed = 300;
  private friction = 0.995;
  private fieldManager: FieldManager;
  private obstacles: ObstacleConfig[] = [];
  private performanceMode = false;

  constructor(fieldManager: FieldManager) {
    this.fieldManager = fieldManager;
  }

  initParticles(inits: { x: number; y: number; charge: number }[]): void {
    this.particles = inits.map((p, i) => ({
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      charge: p.charge,
      radius: 8,
      selected: i === 0,
      reached: false,
      targetIndex: -1,
      pulseEffect: null,
    }));
    this.sparks = [];
  }

  setObstacles(obstacles: ObstacleConfig[]): void {
    this.obstacles = obstacles;
  }

  updatePolarity(index: number): void {
    if (index >= 0 && index < this.particles.length) {
      const p = this.particles[index];
      p.charge *= -1;
      p.pulseEffect = {
        x: p.x,
        y: p.y,
        elapsed: 0,
        duration: 0.2,
      };
    }
  }

  applyForce(index: number, fx: number, fy: number): void {
    if (index >= 0 && index < this.particles.length) {
      const p = this.particles[index];
      if (!p.reached) {
        p.vx += fx;
        p.vy += fy;
      }
    }
  }

  selectNext(): void {
    const active = this.particles.filter(p => !p.reached);
    if (active.length === 0) return;
    let currentIdx = this.particles.findIndex(p => p.selected);
    this.particles.forEach(p => p.selected = false);
    let nextIdx = -1;
    for (let i = 1; i <= this.particles.length; i++) {
      const idx = (currentIdx + i) % this.particles.length;
      if (!this.particles[idx].reached) {
        nextIdx = idx;
        break;
      }
    }
    if (nextIdx >= 0) {
      this.particles[nextIdx].selected = true;
    }
  }

  getSelectedIndex(): number {
    return this.particles.findIndex(p => p.selected);
  }

  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
  }

  updateParticles(dt: number): void {
    const activeParticles = this.particles.filter(p => !p.reached);

    for (const p of activeParticles) {
      let fx = 0;
      let fy = 0;

      for (const other of activeParticles) {
        if (other === p) continue;
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < 2) continue;
        const forceMag = this.k * p.charge * other.charge / Math.max(distSq, 64);
        fx += forceMag * (dx / dist);
        fy += forceMag * (dy / dist);
      }

      const fieldForce = this.fieldManager.getForceAt(p.x, p.y, p.charge);
      fx += fieldForce.fx;
      fy += fieldForce.fy;

      p.vx += fx * dt;
      p.vy += fy * dt;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > this.maxSpeed) {
        p.vx = (p.vx / speed) * this.maxSpeed;
        p.vy = (p.vy / speed) * this.maxSpeed;
      }

      p.vx *= this.friction;
      p.vy *= this.friction;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      this.boundaryCollision(p);
      this.obstacleCollision(p);

      if (p.pulseEffect) {
        p.pulseEffect.elapsed += dt;
        p.pulseEffect.x = p.x;
        p.pulseEffect.y = p.y;
        if (p.pulseEffect.elapsed >= p.pulseEffect.duration) {
          p.pulseEffect = null;
        }
      }
    }

    for (let i = 0; i < activeParticles.length; i++) {
      for (let j = i + 1; j < activeParticles.length; j++) {
        this.particleCollision(activeParticles[i], activeParticles[j]);
      }
    }

    this.sparks = this.sparks.filter(s => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      return s.life > 0;
    });
  }

  private boundaryCollision(p: Particle): void {
    if (p.x - p.radius < 0) {
      p.x = p.radius;
      p.vx = Math.abs(p.vx) * 0.8;
    }
    if (p.x + p.radius > 800) {
      p.x = 800 - p.radius;
      p.vx = -Math.abs(p.vx) * 0.8;
    }
    if (p.y - p.radius < 0) {
      p.y = p.radius;
      p.vy = Math.abs(p.vy) * 0.8;
    }
    if (p.y + p.radius > 600) {
      p.y = 600 - p.radius;
      p.vy = -Math.abs(p.vy) * 0.8;
    }
  }

  private obstacleCollision(p: Particle): void {
    for (const obs of this.obstacles) {
      const closestX = Math.max(obs.x, Math.min(p.x, obs.x + obs.width));
      const closestY = Math.max(obs.y, Math.min(p.y, obs.y + obs.height));
      const dx = p.x - closestX;
      const dy = p.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < p.radius * p.radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.01) {
          const nx = dx / dist;
          const ny = dy / dist;
          p.x = closestX + nx * (p.radius + 1);
          p.y = closestY + ny * (p.radius + 1);
          const dot = p.vx * nx + p.vy * ny;
          p.vx -= 2 * dot * nx;
          p.vy -= 2 * dot * ny;
          p.vx *= 0.8;
          p.vy *= 0.8;
        } else {
          p.x = obs.x - p.radius - 1;
          p.vx = -Math.abs(p.vx) * 0.8;
        }
      }
    }
  }

  private particleCollision(a: Particle, b: Particle): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0.01) {
      const nx = dx / dist;
      const ny = dy / dist;

      const overlap = minDist - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const relVx = a.vx - b.vx;
      const relVy = a.vy - b.vy;
      const relDot = relVx * nx + relVy * ny;

      if (relDot > 0) {
        a.vx -= relDot * nx;
        a.vy -= relDot * ny;
        b.vx += relDot * nx;
        b.vy += relDot * ny;
      }

      if (!this.performanceMode) {
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 60;
          this.sparks.push({
            x: midX,
            y: midY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.1,
            maxLife: 0.1,
          });
        }
      }
    }
  }

  updateObstacles(dt: number): void {
    for (const obs of this.obstacles) {
      if (obs.moving) {
        obs.y += obs.speed * obs.direction * dt;
        if (obs.y > obs.originY + obs.range) {
          obs.direction = -1;
        } else if (obs.y < obs.originY - obs.range) {
          obs.direction = 1;
        }
      }
    }
  }

  checkTargetReached(targets: { x: number; y: number }[]): number[] {
    const reached: number[] = [];
    for (let ti = 0; ti < targets.length; ti++) {
      for (const p of this.particles) {
        if (p.reached) continue;
        const dx = p.x - targets[ti].x;
        const dy = p.y - targets[ti].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          p.reached = true;
          p.targetIndex = ti;
          p.vx = 0;
          p.vy = 0;
          p.x = targets[ti].x;
          p.y = targets[ti].y;
          reached.push(ti);
          break;
        }
      }
    }
    return reached;
  }

  allReached(): boolean {
    return this.particles.length > 0 && this.particles.every(p => p.reached);
  }

  getActiveCount(): number {
    return this.particles.filter(p => !p.reached).length;
  }
}
