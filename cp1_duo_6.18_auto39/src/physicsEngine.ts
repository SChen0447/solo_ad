import type {
  PhysicsWorld,
  PhysicsWorldConfig,
  Particle,
  SpringConstraint,
  Rope,
  Cloth,
  Vec2,
} from './types';

const SOLVER_ITERATIONS = 8;

export class PhysicsEngine {
  private world: PhysicsWorld;
  private config: PhysicsWorldConfig;

  constructor(initialConfig?: Partial<PhysicsWorldConfig>) {
    this.config = {
      gravity: 1,
      airResistance: 0.02,
      stiffness: 200,
      damping: 0.98,
      attachmentThreshold: 30,
      ...initialConfig,
    };
    this.world = {
      ropes: [],
      cloths: [],
      config: this.config,
      allParticles: [],
      allConstraints: [],
    };
  }

  getWorld(): PhysicsWorld {
    return this.world;
  }

  getConfig(): PhysicsWorldConfig {
    return this.config;
  }

  setConfig(config: Partial<PhysicsWorldConfig>): void {
    this.config = { ...this.config, ...config };
    this.world.config = this.config;
    this.updateConstraintStiffness();
  }

  addRope(rope: Rope): void {
    this.world.ropes.push(rope);
    this.world.allParticles.push(...rope.particles);
    this.world.allConstraints.push(...rope.constraints);
  }

  addCloth(cloth: Cloth): void {
    this.world.cloths.push(cloth);
    const flatParticles = cloth.particles.flat();
    this.world.allParticles.push(...flatParticles);
    this.world.allConstraints.push(...cloth.constraints);
  }

  addConstraint(constraint: SpringConstraint): void {
    this.world.allConstraints.push(constraint);
  }

  private updateConstraintStiffness(): void {
    for (const c of this.world.allConstraints) {
      c.stiffness = this.config.stiffness;
    }
  }

  update(dt: number): void {
    const clampedDt = Math.min(dt, 0.033);
    const subSteps = 2;
    const subDt = clampedDt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.applyForces(subDt);
      this.integrate(subDt);
      this.solveConstraints();
      this.updateTensions();
    }

    this.checkRopeClothAttachment();
  }

  private applyForces(dt: number): void {
    const gravityY = this.config.gravity * 500;
    const airResistance = this.config.airResistance;

    for (const particle of this.world.allParticles) {
      if (particle.pinned) continue;

      const vx = particle.pos.x - particle.prevPos.x;
      const vy = particle.pos.y - particle.prevPos.y;

      const dragFactor = 1 - airResistance;
      const newVx = vx * dragFactor;
      const newVy = vy * dragFactor + gravityY * dt;

      particle.prevPos = { ...particle.pos };
      particle.pos.x += newVx;
      particle.pos.y += newVy;
    }
  }

  private integrate(_dt: number): void {
    // Verlet integration handled in applyForces
  }

  private solveConstraints(): void {
    for (let i = 0; i < SOLVER_ITERATIONS; i++) {
      for (const constraint of this.world.allConstraints) {
        this.solveSpringConstraint(constraint);
      }
    }
  }

  private solveSpringConstraint(constraint: SpringConstraint): void {
    const { p1, p2, restLength, stiffness } = constraint;

    const dx = p2.pos.x - p1.pos.x;
    const dy = p2.pos.y - p1.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const diff = (dist - restLength) / dist;
    const stiffnessFactor = stiffness / 1000;

    const offsetX = dx * diff * stiffnessFactor * 0.5;
    const offsetY = dy * diff * stiffnessFactor * 0.5;

    if (!p1.pinned) {
      p1.pos.x += offsetX;
      p1.pos.y += offsetY;
    }
    if (!p2.pinned) {
      p2.pos.x -= offsetX;
      p2.pos.y -= offsetY;
    }
  }

  private updateTensions(): void {
    for (const particle of this.world.allParticles) {
      particle.tension = 0;
    }

    for (const constraint of this.world.allConstraints) {
      const dx = constraint.p2.pos.x - constraint.p1.pos.x;
      const dy = constraint.p2.pos.y - constraint.p1.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const strain = Math.abs(dist - constraint.restLength) / constraint.restLength;

      constraint.p1.tension += strain;
      constraint.p2.tension += strain;
    }
  }

  private checkRopeClothAttachment(): void {
    // Attachment is handled externally via mouse interaction
  }

  attachRopeToCloth(rope: Rope, cloth: Cloth, ropeParticle: Particle, clothParticle: Particle): void {
    const constraint: SpringConstraint = {
      id: `attach-${rope.id}-${cloth.id}-${Date.now()}`,
      p1: ropeParticle,
      p2: clothParticle,
      restLength: 0,
      stiffness: this.config.stiffness * 2,
      damping: this.config.damping,
    };

    this.addConstraint(constraint);
    rope.isAttachedToCloth = true;
    rope.attachedClothId = cloth.id;
    rope.attachedParticleId = clothParticle.id;
  }

  findNearestParticle(pos: Vec2, maxDist: number): Particle | null {
    let nearest: Particle | null = null;
    let minDist = maxDist;

    for (const particle of this.world.allParticles) {
      const dx = particle.pos.x - pos.x;
      const dy = particle.pos.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = particle;
      }
    }

    return nearest;
  }

  findClothEdgeParticle(pos: Vec2, maxDist: number): { particle: Particle; cloth: Cloth } | null {
    let nearest: { particle: Particle; cloth: Cloth } | null = null;
    let minDist = maxDist;

    for (const cloth of this.world.cloths) {
      const edgeParticles: Particle[] = [];

      for (let c = 0; c < cloth.cols; c++) {
        edgeParticles.push(cloth.particles[0][c]);
        edgeParticles.push(cloth.particles[cloth.rows - 1][c]);
      }
      for (let r = 0; r < cloth.rows; r++) {
        edgeParticles.push(cloth.particles[r][0]);
        edgeParticles.push(cloth.particles[r][cloth.cols - 1]);
      }

      for (const particle of edgeParticles) {
        const dx = particle.pos.x - pos.x;
        const dy = particle.pos.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = { particle, cloth };
        }
      }
    }

    return nearest;
  }

  clear(): void {
    this.world.ropes = [];
    this.world.cloths = [];
    this.world.allParticles = [];
    this.world.allConstraints = [];
  }
}
