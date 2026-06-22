import type { Ship } from '../entities/ship';
import type { CollisionPair } from '../types';

interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CollisionDetector {
  private gridSize: number;
  private grid: Map<string, Ship[]>;

  constructor(gridSize: number = 50) {
    this.gridSize = gridSize;
    this.grid = new Map();
  }

  private insertShip(ship: Ship): void {
    const aabb = ship.getAABB();
    const minGridX = Math.floor(aabb.x / this.gridSize);
    const maxGridX = Math.floor((aabb.x + aabb.width) / this.gridSize);
    const minGridY = Math.floor(aabb.y / this.gridSize);
    const maxGridY = Math.floor((aabb.y + aabb.height) / this.gridSize);

    for (let gx = minGridX; gx <= maxGridX; gx++) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const key = `${gx},${gy}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(ship);
      }
    }
  }

  private checkAABB(a: AABB, b: AABB): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  detectCollisions(ships: Ship[]): CollisionPair[] {
    const startTime = performance.now();
    this.grid.clear();

    const aliveShips = ships.filter(s => s.isAlive);
    aliveShips.forEach(ship => this.insertShip(ship));

    const collisions: CollisionPair[] = [];
    const checked = new Set<string>();

    for (const [, cellShips] of this.grid) {
      for (let i = 0; i < cellShips.length; i++) {
        for (let j = i + 1; j < cellShips.length; j++) {
          const a = cellShips[i];
          const b = cellShips[j];

          const pairKey = a.id < b.id ? `${a.id}_${b.id}` : `${b.id}_${a.id}`;
          if (checked.has(pairKey)) continue;
          checked.add(pairKey);

          if (a.team === b.team && this.checkAABB(a.getAABB(), b.getAABB())) {
            this.resolveCollision(a, b);
          }
        }
      }
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 1) {
      console.warn(`Collision detection took ${elapsed.toFixed(2)}ms, exceeds 1ms limit`);
    }

    return collisions;
  }

  private resolveCollision(a: Ship, b: Ship): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    const overlap = (a.size + b.size) / 2 - dist;
    if (overlap > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const pushX = nx * overlap * 0.5;
      const pushY = ny * overlap * 0.5;

      a.x -= pushX;
      a.y -= pushY;
      b.x += pushX;
      b.y += pushY;

      if (Math.random() < 0.1) {
        a.startDodge();
        b.startDodge();
      }
    }
  }

  checkPointCollision(ships: Ship[], x: number, y: number): Ship | null {
    for (const ship of ships) {
      if (!ship.isAlive) continue;
      const dx = x - ship.x;
      const dy = y - ship.y;
      if (dx * dx + dy * dy <= ship.size * ship.size) {
        return ship;
      }
    }
    return null;
  }

  checkRectCollision(ships: Ship[], x1: number, y1: number, x2: number, y2: number): Ship[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return ships.filter(ship => {
      if (!ship.isAlive || ship.team !== 'player') return false;
      const aabb = ship.getAABB();
      return (
        aabb.x < maxX &&
        aabb.x + aabb.width > minX &&
        aabb.y < maxY &&
        aabb.y + aabb.height > minY
      );
    });
  }
}
