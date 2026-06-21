export type TileType = 'flat' | 'step' | 'pit';

export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TileType;
  hasStep: boolean;
  stepHeight: number;
}

export interface TerrainTemplate {
  tiles: TileType[];
}

export class Terrain {
  tiles: Tile[] = [];
  tileSize: number = 30;
  groundY: number;
  baseY: number;
  scrollSpeed: number = 160;
  spawnTimer: number = 0;
  spawnInterval: number = 6;
  tilesSinceLastItem: number = 0;

  templates: TerrainTemplate[] = [
    { tiles: ['flat', 'flat', 'flat', 'flat', 'flat'] },
    { tiles: ['flat', 'flat', 'step', 'flat', 'flat'] },
    { tiles: ['flat', 'pit', 'flat', 'flat', 'flat'] },
    { tiles: ['flat', 'flat', 'step', 'step', 'flat', 'flat'] },
  ];

  constructor(canvasHeight: number) {
    this.baseY = canvasHeight - 120;
    this.groundY = this.baseY;
    this.generateInitialTerrain();
  }

  generateInitialTerrain(): void {
    const startX = 0;
    for (let i = 0; i < 12; i++) {
      this.tiles.push({
        x: startX + i * this.tileSize,
        y: this.baseY,
        width: this.tileSize,
        height: 120,
        type: 'flat',
        hasStep: false,
        stepHeight: 0
      });
    }
    this.spawnTimer = this.spawnInterval - 2;
  }

  generateTerrainSegment(startX: number): void {
    const templateIndex = Math.floor(Math.random() * this.templates.length);
    const template = this.templates[templateIndex];
    const numTiles = Math.floor(Math.random() * 3) + 4;

    let currentY = this.groundY;

    for (let i = 0; i < numTiles; i++) {
      const tileType = i < template.tiles.length ? template.tiles[i] : 'flat';
      const tile: Tile = {
        x: startX + i * this.tileSize,
        y: currentY,
        width: this.tileSize,
        height: 600 - currentY,
        type: tileType,
        hasStep: tileType === 'step',
        stepHeight: tileType === 'step' ? this.tileSize : 0
      };

      if (tileType === 'step') {
        tile.y = currentY - this.tileSize;
        tile.height = 600 - tile.y;
        currentY = tile.y;
      } else if (tileType === 'pit') {
        tile.y = this.baseY + 100;
        tile.height = 600 - tile.y;
      }

      this.tiles.push(tile);
    }

    const lastTile = this.tiles[this.tiles.length - 1];
    if (lastTile.type === 'pit') {
      this.groundY = this.baseY;
    } else {
      this.groundY = lastTile.y;
    }
  }

  getGroundYAt(x: number): number {
    for (const tile of this.tiles) {
      if (x >= tile.x && x < tile.x + tile.width) {
        if (tile.type === 'pit') {
          return 700;
        }
        return tile.y;
      }
    }
    return this.baseY;
  }

  isOnSolidGround(x: number, width: number): { onGround: boolean; groundY: number } {
    const leftX = x + 2;
    const rightX = x + width - 2;

    let leftGround = -1;
    let rightGround = -1;

    for (const tile of this.tiles) {
      if (leftX >= tile.x && leftX < tile.x + tile.width) {
        if (tile.type !== 'pit') {
          leftGround = tile.y;
        }
      }
      if (rightX >= tile.x && rightX < tile.x + tile.width) {
        if (tile.type !== 'pit') {
          rightGround = tile.y;
        }
      }
    }

    if (leftGround === -1 || rightGround === -1) {
      return { onGround: false, groundY: 700 };
    }

    const groundY = Math.min(leftGround, rightGround);
    return { onGround: true, groundY };
  }

  update(deltaTime: number, speed: number): void {
    this.scrollSpeed = speed;
    for (const tile of this.tiles) {
      tile.x -= this.scrollSpeed * deltaTime;
    }

    this.tiles = this.tiles.filter(tile => tile.x + tile.width > -50);

    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      let maxX = 0;
      for (const tile of this.tiles) {
        if (tile.x + tile.width > maxX) {
          maxX = tile.x + tile.width;
        }
      }
      this.generateTerrainSegment(maxX);
    }
  }

  reset(): void {
    this.tiles = [];
    this.groundY = this.baseY;
    this.spawnTimer = 0;
    this.generateInitialTerrain();
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const tile of this.tiles) {
      if (tile.type === 'pit') {
        continue;
      }

      const gradient = ctx.createLinearGradient(
        tile.x, tile.y,
        tile.x, tile.y + 40
      );
      gradient.addColorStop(0, '#48bb78');
      gradient.addColorStop(1, '#38a169');

      ctx.fillStyle = gradient;
      ctx.fillRect(Math.floor(tile.x), Math.floor(tile.y), tile.width, 20);

      ctx.fillStyle = '#8b4513';
      ctx.fillRect(Math.floor(tile.x), Math.floor(tile.y + 20), tile.width, tile.height - 20);

      if (tile.hasStep) {
        ctx.fillStyle = '#6b3410';
        ctx.fillRect(Math.floor(tile.x), Math.floor(tile.y + 20), tile.width, 10);
      }

      ctx.fillStyle = '#68d391';
      for (let i = 0; i < 3; i++) {
        const gx = tile.x + 5 + i * 10;
        const gy = tile.y - 3;
        ctx.fillRect(Math.floor(gx), Math.floor(gy), 2, 3);
      }
    }
  }
}
