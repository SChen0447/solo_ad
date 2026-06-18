import { v4 as uuidv4 } from 'uuid';
import type { Crystal } from '../state/gameStore';

export const CELL_SIZE = 20;
export const MAP_COLS = 60;
export const MAP_ROWS = 60;
export const MAP_WIDTH = MAP_COLS * CELL_SIZE;
export const MAP_HEIGHT = MAP_ROWS * CELL_SIZE;
export const WALL_THICKNESS = 3;

type Cell = 0 | 1;

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export class GameMap {
  grid: Cell[][] = [];
  rooms: Room[] = [];
  crystals: Crystal[] = [];
  portalX = 0;
  portalY = 0;
  startX = 0;
  startY = 0;

  generate(): void {
    this.grid = [];
    this.rooms = [];
    this.crystals = [];

    for (let y = 0; y < MAP_ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        this.grid[y][x] = 1;
      }
    }

    this.carveRooms();
    this.connectRooms();
    this.widenCorridors();
    this.ensureConnectivity();

    const startRoom = this.rooms[0];
    this.startX = startRoom.cx * CELL_SIZE + CELL_SIZE / 2;
    this.startY = startRoom.cy * CELL_SIZE + CELL_SIZE / 2;

    const portalRoom = this.rooms[this.rooms.length - 1];
    this.portalX = portalRoom.cx * CELL_SIZE + CELL_SIZE / 2;
    this.portalY = portalRoom.cy * CELL_SIZE + CELL_SIZE / 2;

    this.placeCrystals();
  }

  private carveRooms(): void {
    const numRooms = 12 + Math.floor(Math.random() * 6);
    const attempts = 200;

    for (let i = 0; i < attempts && this.rooms.length < numRooms; i++) {
      const w = 3 + Math.floor(Math.random() * 5);
      const h = 3 + Math.floor(Math.random() * 5);
      const x = 2 + Math.floor(Math.random() * (MAP_COLS - w - 4));
      const y = 2 + Math.floor(Math.random() * (MAP_ROWS - h - 4));

      let overlap = false;
      for (const room of this.rooms) {
        if (
          x - 2 < room.x + room.w &&
          x + w + 2 > room.x &&
          y - 2 < room.y + room.h &&
          y + h + 2 > room.y
        ) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        this.rooms.push({
          x,
          y,
          w,
          h,
          cx: Math.floor(x + w / 2),
          cy: Math.floor(y + h / 2),
        });
        for (let ry = y; ry < y + h; ry++) {
          for (let rx = x; rx < x + w; rx++) {
            this.grid[ry][rx] = 0;
          }
        }
      }
    }

    this.rooms.sort((a, b) => {
      const da = a.cx + a.cy;
      const db = b.cx + b.cy;
      return da - db;
    });
  }

  private connectRooms(): void {
    for (let i = 0; i < this.rooms.length - 1; i++) {
      const a = this.rooms[i];
      const b = this.rooms[i + 1];
      this.carveCorridor(a.cx, a.cy, b.cx, b.cy);
    }
  }

  private carveCorridor(x1: number, y1: number, x2: number, y2: number): void {
    let x = x1;
    let y = y1;

    while (x !== x2) {
      this.grid[y][x] = 0;
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      this.grid[y][x] = 0;
      y += y < y2 ? 1 : -1;
    }
    this.grid[y][x] = 0;
  }

  private widenCorridors(): void {
    const copy = this.grid.map((row) => [...row]);
    for (let y = 1; y < MAP_ROWS - 1; y++) {
      for (let x = 1; x < MAP_COLS - 1; x++) {
        if (copy[y][x] === 0) {
          this.grid[y - 1][x] = 0;
          this.grid[y + 1][x] = 0;
          this.grid[y][x - 1] = 0;
          this.grid[y][x + 1] = 0;
        }
      }
    }
  }

  private ensureConnectivity(): void {
    const visited: boolean[][] = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      visited[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        visited[y][x] = false;
      }
    }

    const startCell = this.rooms[0];
    const queue: [number, number][] = [[startCell.cx, startCell.cy]];
    visited[startCell.cy][startCell.cx] = true;

    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (
          nx >= 0 &&
          nx < MAP_COLS &&
          ny >= 0 &&
          ny < MAP_ROWS &&
          !visited[ny][nx] &&
          this.grid[ny][nx] === 0
        ) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }

    const endRoom = this.rooms[this.rooms.length - 1];
    if (!visited[endRoom.cy][endRoom.cx]) {
      this.carveCorridor(
        startCell.cx,
        startCell.cy,
        endRoom.cx,
        endRoom.cy
      );
      this.widenCorridors();
    }
  }

  private placeCrystals(): void {
    const candidates: [number, number][] = [];
    for (let y = 2; y < MAP_ROWS - 2; y++) {
      for (let x = 2; x < MAP_COLS - 2; x++) {
        if (this.grid[y][x] === 0) {
          const sdx = x - Math.floor(this.startX / CELL_SIZE);
          const sdy = y - Math.floor(this.startY / CELL_SIZE);
          const distFromStart = Math.sqrt(sdx * sdx + sdy * sdy);
          if (distFromStart > 5) {
            let wallCount = 0;
            for (const [ddx, ddy] of [
              [0, 1],
              [0, -1],
              [1, 0],
              [-1, 0],
            ]) {
              if (this.grid[y + ddy][x + ddx] === 1) wallCount++;
            }
            if (wallCount >= 1 && wallCount <= 3) {
              candidates.push([x, y]);
            }
          }
        }
      }
    }

    const numCrystals = 10 + Math.floor(Math.random() * 6);
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(numCrystals, shuffled.length); i++) {
      const [cx, cy] = shuffled[i];
      this.crystals.push({
        id: uuidv4(),
        x: cx * CELL_SIZE + CELL_SIZE / 2,
        y: cy * CELL_SIZE + CELL_SIZE / 2,
        collected: false,
        collectAnim: 0,
      });
    }
  }

  isWall(px: number, py: number): boolean {
    const cx = Math.floor(px / CELL_SIZE);
    const cy = Math.floor(py / CELL_SIZE);
    if (cx < 0 || cx >= MAP_COLS || cy < 0 || cy >= MAP_ROWS) return true;
    return this.grid[cy][cx] === 1;
  }

  isWallRect(px: number, py: number, radius: number): boolean {
    return (
      this.isWall(px - radius, py - radius) ||
      this.isWall(px + radius, py - radius) ||
      this.isWall(px - radius, py + radius) ||
      this.isWall(px + radius, py + radius)
    );
  }

  render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    canvasW: number,
    canvasH: number
  ): void {
    const startCol = Math.max(0, Math.floor(camX / CELL_SIZE));
    const endCol = Math.min(
      MAP_COLS,
      Math.ceil((camX + canvasW) / CELL_SIZE) + 1
    );
    const startRow = Math.max(0, Math.floor(camY / CELL_SIZE));
    const endRow = Math.min(
      MAP_ROWS,
      Math.ceil((camY + canvasH) / CELL_SIZE) + 1
    );

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const sx = col * CELL_SIZE - camX;
        const sy = row * CELL_SIZE - camY;

        if (this.grid[row][col] === 1) {
          ctx.fillStyle = '#2c2c2c';
          ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
          ctx.fillStyle = '#3a3a3a';
          ctx.fillRect(sx, sy, CELL_SIZE, WALL_THICKNESS);
          ctx.fillRect(sx, sy, WALL_THICKNESS, CELL_SIZE);
        } else {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }
}
