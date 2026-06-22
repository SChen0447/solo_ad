export const GRID_SIZE = 20;
export const TILE_SIZE = 40;
export const MAP_WIDTH = GRID_SIZE * TILE_SIZE;
export const MAP_HEIGHT = GRID_SIZE * TILE_SIZE;

export type TileType = 'grass' | 'path' | 'resource' | 'base' | 'spawn';

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  resourceDepleted: boolean;
  resourceAmount: number;
}

export interface PathPoint {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

export class Grid {
  tiles: Tile[][] = [];
  path: PathPoint[] = [];
  resourceTiles: { x: number; y: number }[] = [];
  basePosition: { gridX: number; gridY: number } = { gridX: 18, gridY: 10 };
  spawnPosition: { gridX: number; gridY: number } = { gridX: 0, gridY: 10 };

  constructor() {
    this.generateTiles();
    this.generatePath();
    this.generateResources();
  }

  generateTiles(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.tiles[y][x] = {
          type: 'grass',
          x,
          y,
          resourceDepleted: false,
          resourceAmount: 100
        };
      }
    }
  }

  generatePath(): void {
    const waypoints: { x: number; y: number }[] = [
      { x: 0, y: 10 },
      { x: 5, y: 10 },
      { x: 5, y: 3 },
      { x: 12, y: 3 },
      { x: 12, y: 16 },
      { x: 18, y: 16 },
      { x: 18, y: 10 }
    ];

    this.path = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      
      const dx = Math.sign(end.x - start.x);
      const dy = Math.sign(end.y - start.y);
      
      let cx = start.x;
      let cy = start.y;
      
      while (cx !== end.x || cy !== end.y) {
        if (this.tiles[cy] && this.tiles[cy][cx]) {
          this.tiles[cy][cx].type = 'path';
        }
        this.path.push({
          x: cx * TILE_SIZE + TILE_SIZE / 2,
          y: cy * TILE_SIZE + TILE_SIZE / 2,
          gridX: cx,
          gridY: cy
        });
        
        if (cx !== end.x) cx += dx;
        else if (cy !== end.y) cy += dy;
      }
    }
    
    const last = waypoints[waypoints.length - 1];
    if (this.tiles[last.y] && this.tiles[last.y][last.x]) {
      this.tiles[last.y][last.x].type = 'path';
    }
    this.path.push({
      x: last.x * TILE_SIZE + TILE_SIZE / 2,
      y: last.y * TILE_SIZE + TILE_SIZE / 2,
      gridX: last.x,
      gridY: last.y
    });

    this.tiles[this.spawnPosition.gridY][this.spawnPosition.gridX].type = 'spawn';
    this.tiles[this.basePosition.gridY][this.basePosition.gridX].type = 'base';
  }

  generateResources(): void {
    const resourcePositions = [
      { x: 2, y: 6 }, { x: 3, y: 14 },
      { x: 8, y: 7 }, { x: 9, y: 12 },
      { x: 14, y: 6 }, { x: 15, y: 13 },
      { x: 16, y: 2 }, { x: 7, y: 17 }
    ];

    for (const pos of resourcePositions) {
      if (this.tiles[pos.y] && this.tiles[pos.y][pos.x] && this.tiles[pos.y][pos.x].type === 'grass') {
        this.tiles[pos.y][pos.x].type = 'resource';
        this.tiles[pos.y][pos.x].resourceAmount = 100;
        this.resourceTiles.push(pos);
      }
    }
  }

  isBuildable(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return false;
    return this.tiles[gridY][gridX].type === 'grass';
  }

  worldToGrid(wx: number, wy: number): { gridX: number; gridY: number } {
    return {
      gridX: Math.floor(wx / TILE_SIZE),
      gridY: Math.floor(wy / TILE_SIZE)
    };
  }

  gridToWorldCenter(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * TILE_SIZE + TILE_SIZE / 2,
      y: gridY * TILE_SIZE + TILE_SIZE / 2
    };
  }

  getTile(gridX: number, gridY: number): Tile | null {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return null;
    return this.tiles[gridY][gridX];
  }

  getBaseWorldPosition(): { x: number; y: number } {
    return this.gridToWorldCenter(this.basePosition.gridX, this.basePosition.gridY);
  }

  getSpawnWorldPosition(): { x: number; y: number } {
    return this.gridToWorldCenter(this.spawnPosition.gridX, this.spawnPosition.gridY);
  }

  getPathPoint(index: number): PathPoint | null {
    if (index < 0 || index >= this.path.length) return null;
    return this.path[index];
  }

  getPathLength(): number {
    return this.path.length;
  }

  findNearestResource(wx: number, wy: number): { gridX: number; gridY: number; distance: number } | null {
    let nearest: { gridX: number; gridY: number; distance: number } | null = null;
    
    for (const rt of this.resourceTiles) {
      const tile = this.tiles[rt.y][rt.x];
      if (tile.resourceDepleted || tile.resourceAmount <= 0) continue;
      
      const center = this.gridToWorldCenter(rt.x, rt.y);
      const dist = Math.hypot(center.x - wx, center.y - wy);
      
      if (!nearest || dist < nearest.distance) {
        nearest = { gridX: rt.x, gridY: rt.y, distance: dist };
      }
    }
    
    return nearest;
  }

  collectResource(gridX: number, gridY: number, amount: number): number {
    const tile = this.getTile(gridX, gridY);
    if (!tile || tile.type !== 'resource' || tile.resourceDepleted) return 0;
    
    const collected = Math.min(amount, tile.resourceAmount);
    tile.resourceAmount -= collected;
    
    if (tile.resourceAmount <= 0) {
      tile.resourceDepleted = true;
    }
    
    return collected;
  }
}
