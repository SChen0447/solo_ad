import {
  Particle,
  SpringConstraint,
  Rope,
  Cloth,
  PhysicsWorld,
  PhysicsParams,
  Point,
  DAMPING,
  CONSTRAINT_ITERATIONS,
  ATTACHMENT_THRESHOLD,
} from './types';

export class PhysicsEngine {
  private world: PhysicsWorld;

  constructor() {
    this.world = {
      ropes: [],
      cloths: [],
      attachments: [],
      gravity: 1,
      airResistance: 0.02,
      elasticity: 200,
      damping: DAMPING,
    };
  }

  getWorld(): PhysicsWorld {
    return this.world;
  }

  setParams(params: Partial<PhysicsParams>): void {
    if (params.gravity !== undefined) {
      this.world.gravity = params.gravity;
    }
    if (params.airResistance !== undefined) {
      this.world.airResistance = params.airResistance;
    }
    if (params.elasticity !== undefined) {
      this.world.elasticity = params.elasticity;
    }
  }

  addRope(rope: Rope): void {
    this.world.ropes.push(rope);
  }

  addCloth(cloth: Cloth): void {
    this.world.cloths.push(cloth);
  }

  addConstraint(constraint: SpringConstraint, parent: Rope | Cloth): void {
    parent.constraints.push(constraint);
  }

  update(dt: number): void {
    const fixedDt = Math.min(dt, 1 / 30);

    this.applyAttachments();
    this.integrate(fixedDt);
    this.solveConstraints();
    this.updateTension();
  }

  private integrate(dt: number): void {
    const { gravity, airResistance, damping } = this.world;
    const dtSquared = dt * dt;

    const processParticles = (particles: Particle[]) => {
      for (const p of particles) {
        if (p.pinned) continue;

        const vx = (p.x - p.oldX) * damping;
        const vy = (p.y - p.oldY) * damping;

        p.oldX = p.x;
        p.oldY = p.y;

        const ax = -vx * airResistance;
        const ay = gravity * 100 - vy * airResistance;

        p.x += vx + ax * dtSquared;
        p.y += vy + ay * dtSquared;
      }
    };

    for (const rope of this.world.ropes) {
      processParticles(rope.particles);
    }

    for (const cloth of this.world.cloths) {
      processParticles(cloth.particles);
    }
  }

  private solveConstraints(): void {
    const { elasticity } = this.world;

    const solve = (particles: Particle[], constraints: SpringConstraint[]) => {
      for (let i = 0; i < CONSTRAINT_ITERATIONS; i++) {
        for (const c of constraints) {
          const p1 = particles[c.p1];
          const p2 = particles[c.p2];

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist === 0) continue;

          const diff = (c.restLength - dist) / dist;
          const stiffnessFactor = c.stiffness / elasticity;
          const offsetX = dx * diff * 0.5 * stiffnessFactor;
          const offsetY = dy * diff * 0.5 * stiffnessFactor;

          if (!p1.pinned) {
            p1.x -= offsetX;
            p1.y -= offsetY;
          }
          if (!p2.pinned) {
            p2.x += offsetX;
            p2.y += offsetY;
          }
        }
      }
    };

    for (const rope of this.world.ropes) {
      solve(rope.particles, rope.constraints);
    }

    for (const cloth of this.world.cloths) {
      solve(cloth.particles, cloth.constraints);
    }
  }

  private applyAttachments(): void {
    for (const attachment of this.world.attachments) {
      const rope = this.world.ropes.find(r => r.id === attachment.ropeId);
      const cloth = this.world.cloths.find(c => c.id === attachment.clothId);

      if (!rope || !cloth) continue;

      const ropeParticle = rope.particles[attachment.ropeParticleIndex];
      const clothParticle = cloth.particles[attachment.clothParticleIndex];

      ropeParticle.x = clothParticle.x;
      ropeParticle.y = clothParticle.y;
      ropeParticle.oldX = clothParticle.oldX;
      ropeParticle.oldY = clothParticle.oldY;
    }
  }

  private updateTension(): void {
    const calculateTension = (particles: Particle[], constraints: SpringConstraint[]) => {
      const tensionMap = new Map<number, number>();

      for (const c of constraints) {
        const p1 = particles[c.p1];
        const p2 = particles[c.p2];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const strain = Math.abs(dist - c.restLength) / c.restLength;

        tensionMap.set(c.p1, Math.max(tensionMap.get(c.p1) || 0, strain));
        tensionMap.set(c.p2, Math.max(tensionMap.get(c.p2) || 0, strain));
      }

      for (let i = 0; i < particles.length; i++) {
        particles[i].tension = tensionMap.get(i) || 0;
      }
    };

    for (const rope of this.world.ropes) {
      calculateTension(rope.particles, rope.constraints);
    }

    for (const cloth of this.world.cloths) {
      calculateTension(cloth.particles, cloth.constraints);
    }
  }

  checkAttachmentCandidate(
    _particle: Particle,
    pos: Point
  ): { cloth: Cloth; particleIndex: number } | null {
    let closest: { cloth: Cloth; particleIndex: number; dist: number } | null = null;

    for (const cloth of this.world.cloths) {
      const edgeParticles = this.getClothEdgeIndices(cloth);

      for (const idx of edgeParticles) {
        const clothParticle = cloth.particles[idx];
        const dx = clothParticle.x - pos.x;
        const dy = clothParticle.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTACHMENT_THRESHOLD && (!closest || dist < closest.dist)) {
          closest = { cloth, particleIndex: idx, dist };
        }
      }
    }

    return closest ? { cloth: closest.cloth, particleIndex: closest.particleIndex } : null;
  }

  private getClothEdgeIndices(cloth: Cloth): number[] {
    const indices: number[] = [];
    const size = cloth.gridSize;

    for (let i = 0; i < size; i++) {
      indices.push(i);
      indices.push(i + size * (size - 1));
      indices.push(i * size);
      indices.push(i * size + (size - 1));
    }

    return [...new Set(indices)];
  }

  createAttachment(
    rope: Rope,
    ropeParticleIndex: number,
    cloth: Cloth,
    clothParticleIndex: number
  ): void {
    const existingIndex = this.world.attachments.findIndex(
      a => a.ropeId === rope.id && a.ropeParticleIndex === ropeParticleIndex
    );

    if (existingIndex >= 0) {
      this.world.attachments.splice(existingIndex, 1);
    }

    this.world.attachments.push({
      ropeId: rope.id,
      ropeParticleIndex,
      clothId: cloth.id,
      clothParticleIndex,
    });

    const ropeParticle = rope.particles[ropeParticleIndex];
    const clothParticle = cloth.particles[clothParticleIndex];
    ropeParticle.x = clothParticle.x;
    ropeParticle.y = clothParticle.y;
    ropeParticle.oldX = clothParticle.oldX;
    ropeParticle.oldY = clothParticle.oldY;
  }

  getParticleAt(
    x: number,
    y: number,
    radius: number
  ): {
    particle: Particle;
    parent: Rope | Cloth;
    parentType: 'rope' | 'cloth';
    parentId: string;
    index: number;
  } | null {
    const radiusSq = radius * radius;

    for (const rope of this.world.ropes) {
      for (let i = 0; i < rope.particles.length; i++) {
        const p = rope.particles[i];
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < radiusSq) {
          return {
            particle: p,
            parent: rope,
            parentType: 'rope',
            parentId: rope.id,
            index: i,
          };
        }
      }
    }

    for (const cloth of this.world.cloths) {
      for (let i = 0; i < cloth.particles.length; i++) {
        const p = cloth.particles[i];
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy < radiusSq) {
          return {
            particle: p,
            parent: cloth,
            parentType: 'cloth',
            parentId: cloth.id,
            index: i,
          };
        }
      }
    }

    return null;
  }

  isRopeEndpoint(ropeId: string, particleIndex: number): boolean {
    const rope = this.world.ropes.find(r => r.id === ropeId);
    if (!rope) return false;
    return particleIndex === 0 || particleIndex === rope.particles.length - 1;
  }
}
