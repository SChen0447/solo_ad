import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../maze/MazeGenerator';

interface PathNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: PathNode | null;
}

export class AI {
  public sprite: Phaser.GameObjects.Triangle;
  public tileX: number;
  public tileY: number;
  public worldX: number;
  public worldY: number;
  private targetX: number;
  private targetY: number;
  public isMoving: boolean;
  public moveSpeed: number;
  private scene: Phaser.Scene;
  private path: { x: number; y: number }[];
  private pathIndex: number;
  private tiles: number[][];
  private updateCounter: number;
  private lastPlayerTileX: number;
  private lastPlayerTileY: number;

  constructor(scene: Phaser.Scene, startTileX: number, startTileY: number, tiles: number[][]) {
    this.scene = scene;
    this.tileX = startTileX;
    this.tileY = startTileY;
    this.worldX = startTileX * TILE_SIZE + TILE_SIZE / 2;
    this.worldY = startTileY * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.worldX;
    this.targetY = this.worldY;
    this.isMoving = false;
    this.moveSpeed = 120;
    this.path = [];
    this.pathIndex = 0;
    this.tiles = tiles;
    this.updateCounter = 0;
    this.lastPlayerTileX = -1;
    this.lastPlayerTileY = -1;

    this.sprite = scene.add.triangle(
      this.worldX, this.worldY,
      0, -14,
      -12, 10,
      12, 10,
      0xe53e3e
    );
    this.sprite.setStrokeStyle(2, 0xfc8181);
    this.sprite.setDepth(10);
  }

  public updateTiles(tiles: number[][]): void {
    this.tiles = tiles;
  }

  public setPosition(tx: number, ty: number): void {
    this.tileX = tx;
    this.tileY = ty;
    this.worldX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.worldY = ty * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.worldX;
    this.targetY = this.worldY;
    this.sprite.x = this.worldX;
    this.sprite.y = this.worldY;
    this.isMoving = false;
    this.path = [];
    this.pathIndex = 0;
  }

  public update(delta: number, playerTileX: number, playerTileY: number): void {
    if (this.isMoving) {
      const dx = this.targetX - this.sprite.x;
      const dy = this.targetY - this.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        this.sprite.x = this.targetX;
        this.sprite.y = this.targetY;
        this.worldX = this.targetX;
        this.worldY = this.targetY;
        this.tileX = Math.round((this.worldX - TILE_SIZE / 2) / TILE_SIZE);
        this.tileY = Math.round((this.worldY - TILE_SIZE / 2) / TILE_SIZE);
        this.isMoving = false;
      } else {
        const step = this.moveSpeed * delta / 1000;
        this.sprite.x += (dx / dist) * step;
        this.sprite.y += (dy / dist) * step;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.sprite.angle = dx > 0 ? 90 : -90;
        } else {
          this.sprite.angle = dy > 0 ? 180 : 0;
        }
      }
      return;
    }

    const needsRecalc = Math.abs(playerTileX - this.lastPlayerTileX) >= 3 ||
      Math.abs(playerTileY - this.lastPlayerTileY) >= 3 ||
      this.path.length === 0 ||
      this.pathIndex >= this.path.length;

    if (needsRecalc) {
      this.calcPath(playerTileX, playerTileY);
      this.lastPlayerTileX = playerTileX;
      this.lastPlayerTileY = playerTileY;
    }

    if (this.path.length > 0 && this.pathIndex < this.path.length) {
      const next = this.path[this.pathIndex];

      if (this.updateCounter === 0 && Math.random() < 0.05) {
        const neighbors = this.getWalkableNeighbors(this.tileX, this.tileY);
        if (neighbors.length > 0) {
          const wrong = neighbors[Math.floor(Math.random() * neighbors.length)];
          if (wrong.x !== next.x || wrong.y !== next.y) {
            this.moveTo(wrong.x, wrong.y);
            this.pathIndex++;
            return;
          }
        }
      }

      this.moveTo(next.x, next.y);
      this.pathIndex++;
      this.updateCounter++;
    }
  }

  private moveTo(tx: number, ty: number): void {
    this.targetX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = ty * TILE_SIZE + TILE_SIZE / 2;
    this.isMoving = true;
  }

  public calcPath(targetTx: number, targetTy: number): void {
    const start = performance.now();
    this.path = this.dijkstra(this.tileX, this.tileY, targetTx, targetTy);
    this.pathIndex = 0;
    if (this.path.length > 0 && this.path[0].x === this.tileX && this.path[0].y === this.tileY) {
      this.path.shift();
    }
  }

  private dijkstra(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] {
    if (sx === tx && sy === ty) return [];

    const open: PathNode[] = [];
    const closed = new Set<string>();

    open.push({ x: sx, y: sy, g: 0, f: 0, parent: null });

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const key = `${current.x},${current.y}`;

      if (current.x === tx && current.y === ty) {
        const result: { x: number; y: number }[] = [];
        let node: PathNode | null = current;
        while (node) {
          result.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return result;
      }

      if (closed.has(key)) continue;
      closed.add(key);

      const neighbors = this.getWalkableNeighbors(current.x, current.y);

      for (const n of neighbors) {
        const nkey = `${n.x},${n.y}`;
        if (closed.has(nkey)) continue;

        const g = current.g + 1;
        const f = g + Math.abs(n.x - tx) + Math.abs(n.y - ty);

        const existing = open.find(o => o.x === n.x && o.y === n.y);
        if (!existing || g < existing.g) {
          if (existing) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          } else {
            open.push({ x: n.x, y: n.y, g, f, parent: current });
          }
        }
      }
    }

    return [];
  }

  private getWalkableNeighbors(x: number, y: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const d of dirs) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        if (this.tiles[ny][nx] !== 0) {
          result.push({ x: nx, y: ny });
        }
      }
    }
    return result;
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}
