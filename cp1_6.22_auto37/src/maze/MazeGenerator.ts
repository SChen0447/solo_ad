import { MazeTopology, TopologyNode } from './Topology';

export const TILE_SIZE = 32;
export const GRID_COLS = 20;
export const GRID_ROWS = 15;

export const TILE_WALL = 0;
export const TILE_FLOOR = 1;
export const TILE_NODE = 2;

export class MazeGenerator {
  private topology: MazeTopology;
  private tiles: number[][];
  private minDistance: number = 3;

  constructor(topology: MazeTopology) {
    this.topology = topology;
    this.tiles = [];
  }

  public generate(): { tiles: number[][]; nodes: TopologyNode[] } {
    this.initTiles();
    this.assignNodeCoordinates();
    this.carvePaths();
    this.placeNodes();
    return { tiles: this.tiles, nodes: [...this.topology.nodes] };
  }

  private initTiles(): void {
    this.tiles = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        this.tiles[y][x] = TILE_WALL;
      }
    }
  }

  private assignNodeCoordinates(): void {
    const margin = 1;
    const placed: { x: number; y: number }[] = [];

    for (const node of this.topology.nodes) {
      let attempts = 0;
      let valid = false;

      while (!valid && attempts < 200) {
        const tx = margin + Math.floor(Math.random() * (GRID_COLS - 2 * margin));
        const ty = margin + Math.floor(Math.random() * (GRID_ROWS - 2 * margin));

        valid = true;
        for (const p of placed) {
          const dist = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
          if (dist < this.minDistance) {
            valid = false;
            break;
          }
        }

        if (valid) {
          node.x = tx;
          node.y = ty;
          placed.push({ x: tx, y: ty });
        }
        attempts++;
      }

      if (!valid) {
        for (let ty = margin; ty < GRID_ROWS - margin; ty++) {
          for (let tx = margin; tx < GRID_COLS - margin; tx++) {
            let ok = true;
            for (const p of placed) {
              const dist = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
              if (dist < this.minDistance) {
                ok = false;
                break;
              }
            }
            if (ok) {
              node.x = tx;
              node.y = ty;
              placed.push({ x: tx, y: ty });
              valid = true;
              break;
            }
          }
          if (valid) break;
        }
      }
    }
  }

  private carvePaths(): void {
    for (const edge of this.topology.edges) {
      const nodeA = this.topology.nodes[edge.a];
      const nodeB = this.topology.nodes[edge.b];
      this.carveLine(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
    }
  }

  private carveLine(x0: number, y0: number, x1: number, y1: number): void {
    if (Math.random() < 0.5) {
      this.carveHorizontal(x0, x1, y0);
      this.carveVertical(y0, y1, x1);
    } else {
      this.carveVertical(y0, y1, x0);
      this.carveHorizontal(x0, x1, y1);
    }
  }

  private carveHorizontal(x0: number, x1: number, y: number): void {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    for (let x = minX; x <= maxX; x++) {
      if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
        this.tiles[y][x] = TILE_FLOOR;
      }
    }
  }

  private carveVertical(y0: number, y1: number, x: number): void {
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    for (let y = minY; y <= maxY; y++) {
      if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
        this.tiles[y][x] = TILE_FLOOR;
      }
    }
  }

  private placeNodes(): void {
    for (const node of this.topology.nodes) {
      if (node.y >= 0 && node.y < GRID_ROWS && node.x >= 0 && node.x < GRID_COLS) {
        this.tiles[node.y][node.x] = TILE_NODE;
      }
    }
  }

  public isWalkable(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) return false;
    return this.tiles[ty][tx] !== TILE_WALL;
  }

  public getTiles(): number[][] {
    return this.tiles;
  }
}
