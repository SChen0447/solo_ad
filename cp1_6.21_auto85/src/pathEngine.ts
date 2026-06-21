import type { PathPoint, Vector3 } from './types';
import { dataManager } from './dataManager';

interface GridCell {
  x: number;
  z: number;
  walkable: boolean;
  g: number;
  h: number;
  f: number;
  parent: GridCell | null;
}

const GRID_SIZE = 1;
const WORLD_MIN_X = -22;
const WORLD_MAX_X = 22;
const WORLD_MIN_Z = -17;
const WORLD_MAX_Z = 17;
const GRID_COLS = Math.ceil((WORLD_MAX_X - WORLD_MIN_X) / GRID_SIZE);
const GRID_ROWS = Math.ceil((WORLD_MAX_Z - WORLD_MIN_Z) / GRID_SIZE);

function worldToGrid(x: number, z: number): { gridX: number; gridZ: number } {
  const gridX = Math.floor((x - WORLD_MIN_X) / GRID_SIZE);
  const gridZ = Math.floor((z - WORLD_MIN_Z) / GRID_SIZE);
  return {
    gridX: Math.max(0, Math.min(GRID_COLS - 1, gridX)),
    gridZ: Math.max(0, Math.min(GRID_ROWS - 1, gridZ))
  };
}

function gridToWorld(gridX: number, gridZ: number): { x: number; z: number } {
  return {
    x: WORLD_MIN_X + gridX * GRID_SIZE + GRID_SIZE / 2,
    z: WORLD_MIN_Z + gridZ * GRID_SIZE + GRID_SIZE / 2
  };
}

function createWalkableGrid(): boolean[][] {
  const grid: boolean[][] = [];
  
  const zones = dataManager.getZones();
  
  for (let gz = 0; gz < GRID_ROWS; gz++) {
    grid[gz] = [];
    for (let gx = 0; gx < GRID_COLS; gx++) {
      const { x, z } = gridToWorld(gx, gz);
      
      let inAnyZone = false;
      for (const zone of zones) {
        const b = zone.bounds;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
          inAnyZone = true;
          break;
        }
      }
      
      const nearCorridor = 
        (x >= -7 && x <= 7 && z >= -2 && z <= 2);
      
      grid[gz][gx] = inAnyZone || nearCorridor;
    }
  }
  
  return grid;
}

function heuristic(a: GridCell, b: GridCell): number {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return dx + dz;
}

function getNeighbors(grid: GridCell[][], cell: GridCell): GridCell[] {
  const neighbors: GridCell[] = [];
  const dirs = [
    [0, -1], [0, 1], [-1, 0], [1, 0],
    [-1, -1], [-1, 1], [1, -1], [1, 1]
  ];
  
  for (const [dx, dz] of dirs) {
    const nx = cell.x + dx;
    const nz = cell.z + dz;
    
    if (nx >= 0 && nx < GRID_COLS && nz >= 0 && nz < GRID_ROWS) {
      if (grid[nz][nx].walkable) {
        neighbors.push(grid[nz][nx]);
      }
    }
  }
  
  return neighbors;
}

export class PathEngine {
  private walkableGrid: boolean[][];
  
  constructor() {
    this.walkableGrid = createWalkableGrid();
  }

  refreshWalkableGrid(): void {
    this.walkableGrid = createWalkableGrid();
  }

  findPath(startX: number, startZ: number, endX: number, endZ: number): PathPoint[] {
    const startGrid = worldToGrid(startX, startZ);
    const endGrid = worldToGrid(endX, endZ);

    if (!this.walkableGrid[startGrid.gridZ][startGrid.gridX] ||
        !this.walkableGrid[endGrid.gridZ][endGrid.gridX]) {
      return [];
    }

    const grid: GridCell[][] = [];
    for (let gz = 0; gz < GRID_ROWS; gz++) {
      grid[gz] = [];
      for (let gx = 0; gx < GRID_COLS; gx++) {
        grid[gz][gx] = {
          x: gx,
          z: gz,
          walkable: this.walkableGrid[gz][gx],
          g: Infinity,
          h: 0,
          f: Infinity,
          parent: null
        };
      }
    }

    const startCell = grid[startGrid.gridZ][startGrid.gridX];
    const endCell = grid[endGrid.gridZ][endGrid.gridX];

    startCell.g = 0;
    startCell.h = heuristic(startCell, endCell);
    startCell.f = startCell.h;

    const openSet: GridCell[] = [startCell];
    const closedSet: Set<GridCell> = new Set();

    while (openSet.length > 0) {
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      if (current === endCell) {
        const path: PathPoint[] = [];
        let node: GridCell | null = current;
        while (node) {
          const worldPos = gridToWorld(node.x, node.z);
          path.unshift(worldPos);
          node = node.parent;
        }
        return path;
      }

      openSet.splice(currentIndex, 1);
      closedSet.add(current);

      const neighbors = getNeighbors(grid, current);
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor)) continue;

        const dx = Math.abs(neighbor.x - current.x);
        const dz = Math.abs(neighbor.z - current.z);
        const moveCost = (dx + dz === 2) ? 1.4 : 1;
        const tentativeG = current.g + moveCost;

        if (tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = heuristic(neighbor, endCell);
          neighbor.f = neighbor.g + neighbor.h;

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return [];
  }

  smoothPath(path: PathPoint[], segmentsPerSegment: number = 5): PathPoint[] {
    if (path.length < 2) return path;

    const smoothed: PathPoint[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = i > 0 ? path[i - 1] : path[i];
      const p1 = path[i];
      const p2 = path[i + 1];
      const p3 = i < path.length - 2 ? path[i + 2] : path[i + 1];

      for (let t = 0; t < segmentsPerSegment; t++) {
        const tt = t / segmentsPerSegment;
        const tt2 = tt * tt;
        const tt3 = tt2 * tt;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * tt +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tt3
        );

        const z = 0.5 * (
          (2 * p1.z) +
          (-p0.z + p2.z) * tt +
          (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * tt2 +
          (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * tt3
        );

        smoothed.push({ x, z });
      }
    }

    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  getPathControlPoints(path: PathPoint[], numPoints: number = 3): PathPoint[] {
    if (path.length < 2) return [];

    const controlPoints: PathPoint[] = [];
    const step = Math.floor(path.length / (numPoints + 1));

    for (let i = 1; i <= numPoints; i++) {
      const index = Math.min(i * step, path.length - 2);
      controlPoints.push({ ...path[index] });
    }

    return controlPoints;
  }

  recalculatePathWithControlPoints(
    startX: number, startZ: number,
    endX: number, endZ: number,
    controlPoints: PathPoint[]
  ): PathPoint[] {
    let fullPath: PathPoint[] = [];

    const allPoints = [
      { x: startX, z: startZ },
      ...controlPoints,
      { x: endX, z: endZ }
    ];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const segmentPath = this.findPath(
        allPoints[i].x, allPoints[i].z,
        allPoints[i + 1].x, allPoints[i + 1].z
      );

      if (segmentPath.length === 0) {
        return [];
      }

      if (i > 0 && segmentPath.length > 0) {
        segmentPath.shift();
      }

      fullPath = fullPath.concat(segmentPath);
    }

    return fullPath;
  }

  generateLightParticles(
    path: PathPoint[],
    particleCount: number = 5,
    speed: number = 0.5
  ): LightParticle[] {
    const particles: LightParticle[] = [];
    const totalLength = this.getPathLength(path);

    for (let i = 0; i < particleCount; i++) {
      const startDistance = (i / particleCount) * totalLength;
      particles.push({
        distance: startDistance,
        speed,
        totalLength,
        path
      });
    }

    return particles;
  }

  getPathLength(path: PathPoint[]): number {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dz = path[i].z - path[i - 1].z;
      length += Math.sqrt(dx * dx + dz * dz);
    }
    return length;
  }

  getPositionOnPath(path: PathPoint[], distance: number): Vector3 {
    let accumulated = 0;

    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dz = path[i].z - path[i - 1].z;
      const segmentLength = Math.sqrt(dx * dx + dz * dz);

      if (accumulated + segmentLength >= distance) {
        const t = (distance - accumulated) / segmentLength;
        return {
          x: path[i - 1].x + dx * t,
          y: 0.1,
          z: path[i - 1].z + dz * t
        };
      }

      accumulated += segmentLength;
    }

    const last = path[path.length - 1];
    return { x: last.x, y: 0.1, z: last.z };
  }

  getPathColor(progress: number): string {
    const startColor = { r: 34, g: 197, b: 94 };
    const endColor = { r: 239, g: 68, b: 68 };

    const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress);

    return `rgb(${r}, ${g}, ${b})`;
  }
}

export interface LightParticle {
  distance: number;
  speed: number;
  totalLength: number;
  path: PathPoint[];
}

export const pathEngine = new PathEngine();
