import { v4 as uuidv4 } from 'uuid';
import {
  Particle,
  Spring,
  CollisionBall,
  Shockwave,
  PhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
  Vec2,
} from './types';

const TRAIL_LENGTH = 10;

export class PhysicsEngine {
  private particles: Map<string, Particle> = new Map();
  private springs: Spring[] = [];
  private collisionBalls: CollisionBall[] = [];
  private shockwaves: Shockwave[] = [];
  private config: PhysicsConfig;
  private gridSize: number = 12;
  private particleSpacing: number = 15;
  private softBodyCenter: Vec2 = { x: 0, y: 0 };

  constructor(config?: Partial<PhysicsConfig>) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getParticles(): Particle[] {
    return Array.from(this.particles.values());
  }

  getSprings(): Spring[] {
    return [...this.springs];
  }

  getCollisionBalls(): CollisionBall[] {
    return [...this.collisionBalls];
  }

  getShockwaves(): Shockwave[] {
    return [...this.shockwaves];
  }

  getGridSize(): number {
    return this.gridSize;
  }

  addParticle(x: number, y: number, mass: number = 1, pinned: boolean = false): Particle {
    const particle: Particle = {
      id: uuidv4(),
      position: { x, y },
      previousPosition: { x, y },
      velocity: { x: 0, y: 0 },
      mass,
      pinned,
      trail: [],
    };
    this.particles.set(particle.id, particle);
    return particle;
  }

  addSpring(p1Id: string, p2Id: string, type: 'structural' | 'shear' | 'bend' = 'structural'): Spring | null {
    const p1 = this.particles.get(p1Id);
    const p2 = this.particles.get(p2Id);
    if (!p1 || !p2) return null;

    const dx = p2.position.x - p1.position.x;
    const dy = p2.position.y - p1.position.y;
    const restLength = Math.sqrt(dx * dx + dy * dy);

    const spring: Spring = {
      id: uuidv4(),
      p1: p1Id,
      p2: p2Id,
      restLength,
      stiffness: this.config.stiffness,
      type,
      tension: 0,
    };
    this.springs.push(spring);
    return spring;
  }

  createSoftBody(centerX: number, centerY: number, radius: number): void {
    this.particles.clear();
    this.springs = [];

    const gridSize = this.gridSize;
    const spacing = (radius * 2) / (gridSize - 1);
    this.particleSpacing = spacing;

    const particleGrid: (Particle | null)[][] = [];

    for (let i = 0; i < gridSize; i++) {
      particleGrid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        const x = centerX - radius + i * spacing;
        const y = centerY - radius + j * spacing;

        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          const particle = this.addParticle(x, y, 1);
          particleGrid[i][j] = particle;
        } else {
          particleGrid[i][j] = null;
        }
      }
    }

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const p = particleGrid[i][j];
        if (!p) continue;

        if (i + 1 < gridSize && particleGrid[i + 1][j]) {
          this.addSpring(p.id, particleGrid[i + 1][j]!.id, 'structural');
        }
        if (j + 1 < gridSize && particleGrid[i][j + 1]) {
          this.addSpring(p.id, particleGrid[i][j + 1]!.id, 'structural');
        }

        if (i + 1 < gridSize && j + 1 < gridSize && particleGrid[i + 1][j + 1]) {
          this.addSpring(p.id, particleGrid[i + 1][j + 1]!.id, 'shear');
        }
        if (i + 1 < gridSize && j - 1 >= 0 && particleGrid[i + 1][j - 1]) {
          this.addSpring(p.id, particleGrid[i + 1][j - 1]!.id, 'shear');
        }

        if (i + 2 < gridSize && particleGrid[i + 2][j]) {
          this.addSpring(p.id, particleGrid[i + 2][j]!.id, 'bend');
        }
        if (j + 2 < gridSize && particleGrid[i][j + 2]) {
          this.addSpring(p.id, particleGrid[i][j + 2]!.id, 'bend');
        }
      }
    }

    this.softBodyCenter = { x: centerX, y: centerY };
  }

  addCollisionBall(x: number, y: number, vx: number = 0, vy: number = 0): CollisionBall {
    const radius = 3 + Math.random() * 3;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C42'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const ball: CollisionBall = {
      id: uuidv4(),
      position: { x, y },
      velocity: { x: vx, y: vy },
      radius,
      color,
    };
    this.collisionBalls.push(ball);
    return ball;
  }

  removeCollisionBall(): void {
    if (this.collisionBalls.length > 0) {
      this.collisionBalls.pop();
    }
  }

  setCollisionBallCount(count: number): void {
    const current = this.collisionBalls.length;
    if (count > current) {
      for (let i = current; i < count; i++) {
        const x = 50 + Math.random() * (this.config.worldWidth - 100);
        const y = -20 - Math.random() * 200;
        this.addCollisionBall(x, y, (Math.random() - 0.5) * 50, 0);
      }
    } else if (count < current) {
      this.collisionBalls = this.collisionBalls.slice(0, count);
    }
  }

  pinParticle(particleId: string, x: number, y: number, maxForce: number = 200): void {
    const particle = this.particles.get(particleId);
    if (!particle) return;

    particle.pinned = true;
    const dx = x - particle.position.x;
    const dy = y - particle.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const force = dist * this.config.stiffness;
      if (force > maxForce) {
        const ratio = maxForce / force;
        particle.position.x = particle.position.x + dx * ratio;
        particle.position.y = particle.position.y + dy * ratio;
      } else {
        particle.position.x = x;
        particle.position.y = y;
      }
    }
    particle.previousPosition = { ...particle.position };
  }

  unpinParticle(particleId: string): void {
    const particle = this.particles.get(particleId);
    if (particle) {
      particle.pinned = false;
    }
  }

  getParticleAt(x: number, y: number, radius: number = 10): Particle | null {
    let closest: Particle | null = null;
    let closestDist = Infinity;

    for (const particle of this.particles.values()) {
      const dx = particle.position.x - x;
      const dy = particle.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius && dist < closestDist) {
        closest = particle;
        closestDist = dist;
      }
    }

    return closest;
  }

  applyForce(particleId: string, fx: number, fy: number): void {
    const particle = this.particles.get(particleId);
    if (!particle || particle.pinned) return;

    const ax = fx / particle.mass;
    const ay = fy / particle.mass;

    particle.velocity.x += ax;
    particle.velocity.y += ay;
  }

  private updateTrails(): void {
    for (const particle of this.particles.values()) {
      particle.trail.unshift({ ...particle.position });
      if (particle.trail.length > TRAIL_LENGTH) {
        particle.trail.pop();
      }
    }
  }

  private verletIntegration(dt: number): void {
    for (const particle of this.particles.values()) {
      if (particle.pinned) continue;

      const vx = (particle.position.x - particle.previousPosition.x) * this.config.damping;
      const vy = (particle.position.y - particle.previousPosition.y) * this.config.damping;

      particle.previousPosition = { ...particle.position };

      particle.position.x += vx;
      particle.position.y += vy + this.config.gravity * particle.mass * dt * dt;

      particle.velocity.x = vx / dt;
      particle.velocity.y = vy / dt;
    }
  }

  private satisfyConstraints(iterations: number = 5): void {
    for (let iter = 0; iter < iterations; iter++) {
      for (const spring of this.springs) {
        const p1 = this.particles.get(spring.p1);
        const p2 = this.particles.get(spring.p2);
        if (!p1 || !p2) continue;

        const dx = p2.position.x - p1.position.x;
        const dy = p2.position.y - p1.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) continue;

        spring.tension = Math.abs(dist - spring.restLength) * spring.stiffness;

        const diff = (dist - spring.restLength) / dist;
        const stiffnessFactor = spring.stiffness / 100;

        if (!p1.pinned && !p2.pinned) {
          p1.position.x += dx * 0.5 * diff * stiffnessFactor;
          p1.position.y += dy * 0.5 * diff * stiffnessFactor;
          p2.position.x -= dx * 0.5 * diff * stiffnessFactor;
          p2.position.y -= dy * 0.5 * diff * stiffnessFactor;
        } else if (p1.pinned && !p2.pinned) {
          p2.position.x -= dx * diff * stiffnessFactor;
          p2.position.y -= dy * diff * stiffnessFactor;
        } else if (!p1.pinned && p2.pinned) {
          p1.position.x += dx * diff * stiffnessFactor;
          p1.position.y += dy * diff * stiffnessFactor;
        }
      }
    }
  }

  private handleGroundCollision(): void {
    const groundY = this.config.groundY;
    const restitution = 0.3;

    for (const particle of this.particles.values()) {
      if (particle.position.y >= groundY) {
        const vy = particle.position.y - particle.previousPosition.y;
        particle.position.y = groundY;
        if (vy > 0) {
          particle.previousPosition.y = groundY + vy * restitution;
        }
      }

      if (particle.position.x < 0) {
        particle.position.x = 0;
      }
      if (particle.position.x > this.config.worldWidth) {
        particle.position.x = this.config.worldWidth;
      }
    }
  }

  private handleBallCollisions(): void {
    const newShockwaves: Shockwave[] = [];

    for (const ball of this.collisionBalls) {
      ball.velocity.y += this.config.gravity * 0.016;

      ball.position.x += ball.velocity.x * 0.016;
      ball.position.y += ball.velocity.y * 0.016;

      if (ball.position.y + ball.radius >= this.config.groundY) {
        ball.position.y = this.config.groundY - ball.radius;
        ball.velocity.y *= -0.6;
        ball.velocity.x *= 0.98;
      }

      if (ball.position.x - ball.radius < 0) {
        ball.position.x = ball.radius;
        ball.velocity.x *= -0.8;
      }
      if (ball.position.x + ball.radius > this.config.worldWidth) {
        ball.position.x = this.config.worldWidth - ball.radius;
        ball.velocity.x *= -0.8;
      }

      for (const particle of this.particles.values()) {
        const dx = particle.position.x - ball.position.x;
        const dy = particle.position.y - ball.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ball.radius + 3 && dist > 0) {
          const overlap = ball.radius + 3 - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          if (!particle.pinned) {
            particle.position.x += nx * overlap * 0.5;
            particle.position.y += ny * overlap * 0.5;
          }

          ball.position.x -= nx * overlap * 0.5;
          ball.position.y -= ny * overlap * 0.5;

          const relVx = particle.velocity.x - ball.velocity.x;
          const relVy = particle.velocity.y - ball.velocity.y;
          const dotProduct = relVx * nx + relVy * ny;

          if (dotProduct > 0) {
            const impulse = (2 * dotProduct) / (particle.mass + 0.1);
            if (!particle.pinned) {
              particle.velocity.x -= impulse * 0.1 * nx;
              particle.velocity.y -= impulse * 0.1 * ny;
            }
            ball.velocity.x += impulse * particle.mass * nx;
            ball.velocity.y += impulse * particle.mass * ny;
          }

          if (Math.abs(dotProduct) > 50) {
            newShockwaves.push({
              id: uuidv4(),
              position: { x: ball.position.x, y: ball.position.y },
              radius: 0,
              maxRadius: 15,
              duration: 500,
              startTime: Date.now(),
            });
          }
        }
      }
    }

    if (newShockwaves.length > 0) {
      this.shockwaves.push(...newShockwaves);
    }
  }

  private updateShockwaves(): void {
    const now = Date.now();
    this.shockwaves = this.shockwaves.filter((wave) => {
      const elapsed = now - wave.startTime;
      if (elapsed >= wave.duration) return false;

      const t = elapsed / wave.duration;
      wave.radius = wave.maxRadius * t;
      return true;
    });
  }

  simulateStep(dt: number = 1 / 60): void {
    this.updateTrails();
    this.verletIntegration(dt);
    this.satisfyConstraints(5);
    this.handleGroundCollision();
    this.handleBallCollisions();
    this.updateShockwaves();
  }
}
