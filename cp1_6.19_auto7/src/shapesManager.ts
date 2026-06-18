import {
  Particle,
  SpringConstraint,
  Rope,
  Cloth,
  Point,
  Rect,
  PARTICLE_SPACING,
  CLOTH_GRID_SIZE,
} from './types';

export class ShapesManager {
  private ropeIdCounter = 0;
  private clothIdCounter = 0;

  createRope(p1: Point, p2: Point, customSegments?: number): Rope {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const segments = customSegments ?? Math.max(2, Math.floor(distance / PARTICLE_SPACING));
    const actualSpacing = distance / segments;

    const particles: Particle[] = [];
    const constraints: SpringConstraint[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const sagOffset = Math.sin(t * Math.PI) * 5;
      const x = p1.x + dx * t;
      const y = p1.y + dy * t + sagOffset;

      particles.push({
        x,
        y,
        oldX: x,
        oldY: y,
        pinned: false,
        mass: 1,
        tension: 0,
      });
    }

    for (let i = 0; i < segments; i++) {
      constraints.push({
        p1: i,
        p2: i + 1,
        restLength: actualSpacing,
        stiffness: 200,
        type: 'structural',
      });
    }

    return {
      id: `rope-${++this.ropeIdCounter}`,
      particles,
      constraints,
    };
  }

  createCloth(rect: Rect): Cloth {
    const { x, y, width, height } = rect;
    const gridSize = CLOTH_GRID_SIZE;
    const cols = gridSize;
    const rows = gridSize;
    const spacingX = width / (cols - 1);
    const spacingY = height / (rows - 1);

    const particles: Particle[] = [];
    const constraints: SpringConstraint[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = x + col * spacingX;
        const py = y + row * spacingY;

        particles.push({
          x: px,
          y: py,
          oldX: px,
          oldY: py,
          pinned: false,
          mass: 1,
          tension: 0,
        });
      }
    }

    const getIndex = (row: number, col: number) => row * cols + col;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = getIndex(row, col);

        if (col < cols - 1) {
          constraints.push({
            p1: idx,
            p2: getIndex(row, col + 1),
            restLength: spacingX,
            stiffness: 200,
            type: 'structural',
          });
        }

        if (row < rows - 1) {
          constraints.push({
            p1: idx,
            p2: getIndex(row + 1, col),
            restLength: spacingY,
            stiffness: 200,
            type: 'structural',
          });
        }

        if (col < cols - 1 && row < rows - 1) {
          const diagonalLength = Math.sqrt(spacingX * spacingX + spacingY * spacingY);
          constraints.push({
            p1: idx,
            p2: getIndex(row + 1, col + 1),
            restLength: diagonalLength,
            stiffness: 150,
            type: 'shear',
          });
          constraints.push({
            p1: getIndex(row, col + 1),
            p2: getIndex(row + 1, col),
            restLength: diagonalLength,
            stiffness: 150,
            type: 'shear',
          });
        }
      }
    }

    return {
      id: `cloth-${++this.clothIdCounter}`,
      particles,
      constraints,
      gridSize,
      width,
      height,
    };
  }

  removeRope(id: string, ropes: Rope[]): Rope[] {
    return ropes.filter(r => r.id !== id);
  }

  removeCloth(id: string, cloths: Cloth[]): Cloth[] {
    return cloths.filter(c => c.id !== id);
  }

  clearAll(): { ropes: Rope[]; cloths: Cloth[] } {
    return { ropes: [], cloths: [] };
  }
}
