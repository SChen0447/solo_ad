import type {
  Particle,
  SpringConstraint,
  Rope,
  Cloth,
  Vec2,
  PhysicsWorldConfig,
} from './types';

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

function createParticle(x: number, y: number, mass = 1): Particle {
  return {
    id: generateId('particle'),
    pos: { x, y },
    prevPos: { x, y },
    mass,
    pinned: false,
    tension: 0,
  };
}

function createSpringConstraint(
  p1: Particle,
  p2: Particle,
  stiffness: number,
  damping: number,
  isDiagonal = false
): SpringConstraint {
  const dx = p2.pos.x - p1.pos.x;
  const dy = p2.pos.y - p1.pos.y;
  const restLength = Math.sqrt(dx * dx + dy * dy);

  return {
    id: generateId('spring'),
    p1,
    p2,
    restLength,
    stiffness,
    damping,
    isDiagonal,
  };
}

export class ShapesManager {
  private config: PhysicsWorldConfig;

  constructor(config: PhysicsWorldConfig) {
    this.config = config;
  }

  updateConfig(config: Partial<PhysicsWorldConfig>): void {
    this.config = { ...this.config, ...config };
  }

  createRope(p1: Vec2, p2: Vec2, segmentLength = 10): Rope {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const totalLength = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.max(2, Math.floor(totalLength / segmentLength));
    const actualSegmentLength = totalLength / segments;

    const particles: Particle[] = [];
    const constraints: SpringConstraint[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = p1.x + dx * t;
      const y = p1.y + dy * t;
      particles.push(createParticle(x, y));
    }

    for (let i = 0; i < segments; i++) {
      const constraint = createSpringConstraint(
        particles[i],
        particles[i + 1],
        this.config.stiffness,
        this.config.damping
      );
      constraint.restLength = actualSegmentLength;
      constraints.push(constraint);
    }

    return {
      id: generateId('rope'),
      particles,
      constraints,
      isAttachedToCloth: false,
    };
  }

  createCloth(
    x: number,
    y: number,
    width: number,
    height: number,
    cols = 10,
    rows = 10
  ): Cloth {
    const spacingX = width / (cols - 1);
    const spacingY = height / (rows - 1);
    const spacing = Math.max(spacingX, spacingY);

    const particles: Particle[][] = [];
    const constraints: SpringConstraint[] = [];

    for (let r = 0; r < rows; r++) {
      const row: Particle[] = [];
      for (let c = 0; c < cols; c++) {
        const px = x + c * spacingX;
        const py = y + r * spacingY;
        const particle = createParticle(px, py);
        row.push(particle);
      }
      particles.push(row);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = particles[r][c];

        if (c < cols - 1) {
          constraints.push(
            createSpringConstraint(
              p,
              particles[r][c + 1],
              this.config.stiffness,
              this.config.damping
            )
          );
        }

        if (r < rows - 1) {
          constraints.push(
            createSpringConstraint(
              p,
              particles[r + 1][c],
              this.config.stiffness,
              this.config.damping
            )
          );
        }

        if (r < rows - 1 && c < cols - 1) {
          constraints.push(
            createSpringConstraint(
              p,
              particles[r + 1][c + 1],
              this.config.stiffness * 0.7,
              this.config.damping,
              true
            )
          );
        }

        if (r < rows - 1 && c > 0) {
          constraints.push(
            createSpringConstraint(
              p,
              particles[r + 1][c - 1],
              this.config.stiffness * 0.7,
              this.config.damping,
              true
            )
          );
        }
      }
    }

    return {
      id: generateId('cloth'),
      particles,
      constraints,
      cols,
      rows,
      spacing,
    };
  }

  getRopeEndParticles(rope: Rope): [Particle, Particle] {
    return [rope.particles[0], rope.particles[rope.particles.length - 1]];
  }

  isRopeEndParticle(rope: Rope, particle: Particle): boolean {
    return (
      particle.id === rope.particles[0].id ||
      particle.id === rope.particles[rope.particles.length - 1].id
    );
  }

  getClothCornerParticles(cloth: Cloth): Particle[] {
    return [
      cloth.particles[0][0],
      cloth.particles[0][cloth.cols - 1],
      cloth.particles[cloth.rows - 1][0],
      cloth.particles[cloth.rows - 1][cloth.cols - 1],
    ];
  }

  getClothEdgeParticles(cloth: Cloth): Particle[] {
    const edgeParticles: Particle[] = [];
    for (let c = 0; c < cloth.cols; c++) {
      edgeParticles.push(cloth.particles[0][c]);
      edgeParticles.push(cloth.particles[cloth.rows - 1][c]);
    }
    for (let r = 1; r < cloth.rows - 1; r++) {
      edgeParticles.push(cloth.particles[r][0]);
      edgeParticles.push(cloth.particles[r][cloth.cols - 1]);
    }
    return edgeParticles;
  }
}
