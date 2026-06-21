export interface GridCell {
  x: number;
  z: number;
}

export class MazeGrid {
  public readonly size: number;
  private walls: boolean[][];

  constructor(size: number = 10) {
    this.size = size;
    this.walls = Array(size).fill(null).map(() => Array(size).fill(false));
  }

  getWall(x: number, z: number): boolean {
    if (x < 0 || x >= this.size || z < 0 || z >= this.size) {
      return true;
    }
    return this.walls[z][x];
  }

  setWall(x: number, z: number, hasWall: boolean): void {
    if (x < 0 || x >= this.size || z < 0 || z >= this.size) {
      return;
    }
    if ((x === 0 && z === 0) || (x === this.size - 1 && z === this.size - 1) {
      if (hasWall) return;
    }
    this.walls[z][x] = hasWall;
  }

  toggleWall(x: number, z: number): boolean {
    const current = this.getWall(x, z);
    this.setWall(x, z, !current);
    return !current;
  }

  getGridData(): boolean[][] {
    return this.walls.map(row => [...row]);
  }

  findPath(start: GridCell, end: GridCell): GridCell[] | null {
    if (this.getWall(start.x, start.z) || this.getWall(end.x, end.z)) {
      return null;
    }

    const queue: GridCell[] = [start];
    const visited = new Set<string>();
    const parent = new Map<string, GridCell | null>();

    const startKey = `${start.x},${start.z}`;
    visited.add(startKey);
    parent.set(startKey, null);

    const directions = [
      { x: 0, z: -1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = `${current.x},${current.z}`;

      if (current.x === end.x && current.z === end.z) {
        const path: GridCell[] = [];
        let node: GridCell | null = current;
        while (node) {
          path.unshift(node);
          node = parent.get(`${node.x},${node.z}`) || null;
        }
        return path;
      }

      for (const dir of directions) {
        const nx = current.x + dir.x;
        const nz = current.z + dir.z;
        const nkey = `${nx},${nz}`;

        if (!visited.has(nkey) && !this.getWall(nx, nz) {
          visited.add(nkey);
          parent.set(nkey, current);
          queue.push({ x: nx, z: nz });
        }
      }
    }

    return null;
  }

  countDeadEnds(): number {
    let count = 0;
    const directions = [
      { x: 0, z: -1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
      { x: -1, z: 0 }
    ];

    for (let z = 0; z < this.size; z++) {
      for (let x = 0; x < this.size; x++) {
        if (this.walls[z][x]) continue;
        let openCount = 0;
        for (const dir of directions) {
          const nx = x + dir.x;
          const nz = z + dir.z;
          if (nx >= 0 && nx < this.size && nz >= 0 && nz < this.size && !this.walls[nz][nx]) {
            openCount++;
          }
        }
        if (openCount === 1) {
          count++;
        }
      }
    }
    return count;
  }

  reset(): void {
    this.walls = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
  }
}
