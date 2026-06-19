import { Tile, TileType } from './Tile';

export class WorldManager {
  public static readonly GRID_SIZE = 16;
  public static readonly TILE_SIZE = 48;

  private tiles: Tile[][];
  private craftingStationX: number;
  private craftingStationY: number;

  constructor() {
    this.tiles = [];
    this.craftingStationX = WorldManager.GRID_SIZE - 2;
    this.craftingStationY = 1;
    this.generateMap();
  }

  private generateMap(): void {
    for (let y = 0; y < WorldManager.GRID_SIZE; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < WorldManager.GRID_SIZE; x++) {
        this.tiles[y][x] = new Tile(x, y, TileType.GRASS);
      }
    }

    this.generateWater();
    this.generateTrees();
    this.generateStones();
    this.placeCraftingStation();
  }

  private generateWater(): void {
    const waterClusterCount = 2 + Math.floor(Math.random() * 2);
    for (let c = 0; c < waterClusterCount; c++) {
      const centerX = Math.floor(Math.random() * (WorldManager.GRID_SIZE - 4)) + 2;
      const centerY = Math.floor(Math.random() * (WorldManager.GRID_SIZE - 4)) + 2;
      const size = 2 + Math.floor(Math.random() * 3);

      for (let y = centerY - size; y <= centerY + size; y++) {
        for (let x = centerX - size; x <= centerX + size; x++) {
          if (x >= 0 && x < WorldManager.GRID_SIZE && y >= 0 && y < WorldManager.GRID_SIZE) {
            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (dist <= size && Math.random() < 0.75) {
              this.tiles[y][x].setType(TileType.WATER);
            }
          }
        }
      }
    }
  }

  private generateTrees(): void {
    const treeCount = 18 + Math.floor(Math.random() * 8);
    let placed = 0;
    let attempts = 0;

    while (placed < treeCount && attempts < 500) {
      const x = Math.floor(Math.random() * WorldManager.GRID_SIZE);
      const y = Math.floor(Math.random() * WorldManager.GRID_SIZE);
      attempts++;

      if (this.tiles[y][x].type === TileType.GRASS && !this.isNearCraftingStation(x, y)) {
        this.tiles[y][x].setType(TileType.TREE);
        placed++;
      }
    }
  }

  private generateStones(): void {
    const stoneCount = 10 + Math.floor(Math.random() * 6);
    let placed = 0;
    let attempts = 0;

    while (placed < stoneCount && attempts < 500) {
      const x = Math.floor(Math.random() * WorldManager.GRID_SIZE);
      const y = Math.floor(Math.random() * WorldManager.GRID_SIZE);
      attempts++;

      if (this.tiles[y][x].type === TileType.GRASS && !this.isNearCraftingStation(x, y)) {
        this.tiles[y][x].setType(TileType.STONE);
        placed++;
      }
    }
  }

  private isNearCraftingStation(x: number, y: number): boolean {
    return Math.abs(x - this.craftingStationX) <= 1 && Math.abs(y - this.craftingStationY) <= 1;
  }

  private placeCraftingStation(): void {
    this.tiles[this.craftingStationY][this.craftingStationX].setType(TileType.CRAFTING);
  }

  public getTile(gridX: number, gridY: number): Tile | null {
    if (gridX < 0 || gridX >= WorldManager.GRID_SIZE || gridY < 0 || gridY >= WorldManager.GRID_SIZE) {
      return null;
    }
    return this.tiles[gridY][gridX];
  }

  public setTile(gridX: number, gridY: number, type: TileType): boolean {
    const tile = this.getTile(gridX, gridY);
    if (!tile) return false;
    tile.setType(type);
    return true;
  }

  public harvestTile(gridX: number, gridY: number): string | null {
    const tile = this.getTile(gridX, gridY);
    if (!tile || !tile.harvestable) return null;

    const item = tile.harvestItem || null;
    tile.setType(TileType.GRASS);
    return item;
  }

  public isWalkable(gridX: number, gridY: number): boolean {
    const tile = this.getTile(gridX, gridY);
    if (!tile) return false;
    return tile.walkable;
  }

  public isSlow(gridX: number, gridY: number): boolean {
    const tile = this.getTile(gridX, gridY);
    if (!tile) return false;
    return tile.isSlow();
  }

  public getCraftingStationPosition(): { x: number; y: number } {
    return { x: this.craftingStationX, y: this.craftingStationY };
  }

  public isAtCraftingStation(px: number, py: number): boolean {
    const dx = Math.abs(px - this.craftingStationX);
    const dy = Math.abs(py - this.craftingStationY);
    return dx <= 1 && dy <= 1;
  }

  public getAllTiles(): Tile[][] {
    return this.tiles;
  }

  public getWorldWidth(): number {
    return WorldManager.GRID_SIZE * WorldManager.TILE_SIZE;
  }

  public getWorldHeight(): number {
    return WorldManager.GRID_SIZE * WorldManager.TILE_SIZE;
  }
}
