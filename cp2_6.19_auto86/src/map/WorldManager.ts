import { Tile, TerrainType } from './Tile';

export class WorldManager {
  private mapWidth = 16;
  private mapHeight = 16;
  private tiles: Tile[][] = [];

  generateMap(): void {
    this.tiles = [];
    const rng = this.seededRandom(Date.now());

    for (let y = 0; y < this.mapHeight; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        const val = rng();
        if (val < 0.45) {
          this.tiles[y][x] = new Tile(TerrainType.GRASS);
        } else if (val < 0.65) {
          this.tiles[y][x] = new Tile(TerrainType.TREE);
        } else if (val < 0.82) {
          this.tiles[y][x] = new Tile(TerrainType.STONE);
        } else {
          this.tiles[y][x] = new Tile(TerrainType.WATER);
        }
      }
    }

    const spawnX = Math.floor(this.mapWidth / 2);
    const spawnY = Math.floor(this.mapHeight / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = spawnY + dy;
        const nx = spawnX + dx;
        if (ny >= 0 && ny < this.mapHeight && nx >= 0 && nx < this.mapWidth) {
          this.tiles[ny][nx] = new Tile(TerrainType.GRASS);
        }
      }
    }

    const craftX = this.mapWidth - 2;
    const craftY = 1;
    this.tiles[craftY][craftX] = new Tile(TerrainType.GRASS);
    this.tiles[craftY][craftX + 1] = new Tile(TerrainType.GRASS);
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
      return null;
    }
    return this.tiles[y][x];
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
      this.tiles[y][x] = tile;
    }
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.walkable;
  }

  getMovementSpeed(x: number, y: number): number {
    const tile = this.getTile(x, y);
    if (tile && tile.type === TerrainType.WATER) {
      return 0.5;
    }
    return 1.0;
  }

  getMapWidth(): number {
    return this.mapWidth;
  }

  getMapHeight(): number {
    return this.mapHeight;
  }

  getCraftingStationTile(): { x: number; y: number } {
    return { x: this.mapWidth - 2, y: 1 };
  }
}
