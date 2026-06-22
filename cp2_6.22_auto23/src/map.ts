export enum TileType {
  GRASS = 0,
  PATH = 1,
  RESOURCE = 2,
  BASE = 3
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
  resourceAmount?: number;
  resourceDepleted?: boolean;
  pulsePhase?: number;
}

export class Grid {
  cols: number;
  rows: number;
  tileSize: number;
  tiles: Tile[][];
  path: { x: number; y: number }[];
  resourcePoints: { col: number; row: number }[];

  constructor(cols = 20, rows = 20, tileSize = 40) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = [];
    this.path = [];
    this.resourcePoints = [];
    this.generate();
  }

  generate(): void {
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = {
          type: TileType.GRASS,
          x: col * this.tileSize,
          y: row * this.tileSize
        };
      }
    }

    this.generatePath();
    this.generateResources();
  }

  generatePath(): void {
    const pathCoords: { col: number; row: number }[] = [];

    let col = 0;
    let row = 3;
    for (; col <= 5; col++) {
      pathCoords.push({ col, row });
    }

    for (; row <= 10; row++) {
      pathCoords.push({ col, row });
    }

    for (; col <= 12; col++) {
      pathCoords.push({ col, row });
    }

    for (; row >= 5; row--) {
      pathCoords.push({ col, row });
    }

    for (; col <= 17; col++) {
      pathCoords.push({ col, row });
    }

    for (; row <= 15; row++) {
      pathCoords.push({ col, row });
    }

    for (; col < this.cols; col++) {
      pathCoords.push({ col, row });
    }

    for (const coord of pathCoords) {
      this.tiles[coord.row][coord.col].type = TileType.PATH;
    }

    const lastCoord = pathCoords[pathCoords.length - 1];
    this.tiles[lastCoord.row][lastCoord.col].type = TileType.BASE;

    this.path = pathCoords.map((c) => ({
      x: c.col * this.tileSize + this.tileSize / 2,
      y: c.row * this.tileSize + this.tileSize / 2
    }));
  }

  generateResources(): void {
    const resourcePositions = [
      { col: 3, row: 7 },
      { col: 7, row: 2 },
      { col: 9, row: 13 },
      { col: 14, row: 9 },
      { col: 16, row: 3 },
      { col: 5, row: 15 },
      { col: 11, row: 17 },
      { col: 18, row: 12 }
    ];

    for (const pos of resourcePositions) {
      if (this.tiles[pos.row] && this.tiles[pos.row][pos.col]) {
        if (this.tiles[pos.row][pos.col].type === TileType.GRASS) {
          this.tiles[pos.row][pos.col].type = TileType.RESOURCE;
          this.tiles[pos.row][pos.col].resourceAmount = 100;
          this.tiles[pos.row][pos.col].resourceDepleted = false;
          this.tiles[pos.row][pos.col].pulsePhase = Math.random() * Math.PI * 2;
          this.resourcePoints.push(pos);
        }
      }
    }
  }

  getTile(col: number, row: number): Tile | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return this.tiles[row][col];
  }

  getTileAtPixel(px: number, py: number): Tile | null {
    const col = Math.floor(px / this.tileSize);
    const row = Math.floor(py / this.tileSize);
    return this.getTile(col, row);
  }

  getColRowAtPixel(px: number, py: number): { col: number; row: number } | null {
    const col = Math.floor(px / this.tileSize);
    const row = Math.floor(py / this.tileSize);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return { col, row };
  }

  isBuildable(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    return tile !== null && tile.type === TileType.GRASS;
  }

  getWidth(): number {
    return this.cols * this.tileSize;
  }

  getHeight(): number {
    return this.rows * this.tileSize;
  }

  getPathStart(): { x: number; y: number } {
    return this.path[0];
  }

  getBasePosition(): { x: number; y: number } {
    return this.path[this.path.length - 1];
  }

  updateResourcePulses(deltaTime: number): void {
    const pulseSpeed = Math.PI / 1000;
    for (const pos of this.resourcePoints) {
      const tile = this.tiles[pos.row][pos.col];
      if (tile.pulsePhase !== undefined) {
        tile.pulsePhase += deltaTime * pulseSpeed;
      }
    }
  }
}
