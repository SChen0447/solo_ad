export enum CellType {
  CORRIDOR = 'corridor',
  ROOM = 'room',
  TREASURE = 'treasure',
  TRAP = 'trap',
  BOSS = 'boss',
  ENTRANCE = 'entrance',
  EXIT = 'exit'
}

export interface Cell {
  type: CellType;
  x: number;
  y: number;
  explored: boolean;
  visited: boolean;
  eventTriggered: boolean;
}

export class MazeGenerator {
  private width: number;
  private height: number;
  private grid: Cell[][];
  private rooms: { x: number; y: number; w: number; h: number }[] = [];

  constructor(width: number = 12, height: number = 12) {
    this.width = width;
    this.height = height;
    this.grid = [];
  }

  public generate(): Cell[][] {
    this.initializeGrid();
    this.generateRooms();
    this.connectRooms();
    this.placeSpecialRooms();
    this.setEntranceAndExit();
    return this.grid;
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          type: CellType.CORRIDOR,
          x,
          y,
          explored: false,
          visited: false,
          eventTriggered: false
        });
      }
      this.grid.push(row);
    }
  }

  private generateRooms(): void {
    const roomCount = 6 + Math.floor(Math.random() * 4);
    this.rooms = [];
    
    for (let i = 0; i < roomCount * 3 && this.rooms.length < roomCount; i++) {
      const roomW = 2 + Math.floor(Math.random() * 3);
      const roomH = 2 + Math.floor(Math.random() * 3);
      const roomX = 1 + Math.floor(Math.random() * (this.width - roomW - 2));
      const roomY = 1 + Math.floor(Math.random() * (this.height - roomH - 2));

      const newRoom = { x: roomX, y: roomY, w: roomW, h: roomH };
      
      let overlaps = false;
      for (const room of this.rooms) {
        if (this.roomsOverlap(newRoom, room, 1)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }
  }

  private roomsOverlap(
    r1: { x: number; y: number; w: number; h: number },
    r2: { x: number; y: number; w: number; h: number },
    padding: number
  ): boolean {
    return !(
      r1.x + r1.w + padding < r2.x ||
      r2.x + r2.w + padding < r1.x ||
      r1.y + r1.h + padding < r2.y ||
      r2.y + r2.h + padding < r1.y
    );
  }

  private carveRoom(room: { x: number; y: number; w: number; h: number }): void {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          this.grid[y][x].type = CellType.ROOM;
        }
      }
    }
  }

  private connectRooms(): void {
    if (this.rooms.length < 2) return;

    const centers: { x: number; y: number }[] = this.rooms.map(room => ({
      x: Math.floor(room.x + room.w / 2),
      y: Math.floor(room.y + room.h / 2)
    }));

    for (let i = 1; i < centers.length; i++) {
      this.createCorridor(centers[i - 1], centers[i]);
    }

    if (centers.length > 3) {
      const idx1 = Math.floor(Math.random() * centers.length);
      const idx2 = (idx1 + 2 + Math.floor(Math.random() * (centers.length - 2))) % centers.length;
      this.createCorridor(centers[idx1], centers[idx2]);
    }
  }

  private createCorridor(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): void {
    let x = from.x;
    let y = from.y;

    const horizontalFirst = Math.random() > 0.5;

    if (horizontalFirst) {
      while (x !== to.x) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          if (this.grid[y][x].type !== CellType.ROOM) {
            this.grid[y][x].type = CellType.CORRIDOR;
          }
        }
        x += x < to.x ? 1 : -1;
      }
      while (y !== to.y) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          if (this.grid[y][x].type !== CellType.ROOM) {
            this.grid[y][x].type = CellType.CORRIDOR;
          }
        }
        y += y < to.y ? 1 : -1;
      }
    } else {
      while (y !== to.y) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          if (this.grid[y][x].type !== CellType.ROOM) {
            this.grid[y][x].type = CellType.CORRIDOR;
          }
        }
        y += y < to.y ? 1 : -1;
      }
      while (x !== to.x) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          if (this.grid[y][x].type !== CellType.ROOM) {
            this.grid[y][x].type = CellType.CORRIDOR;
          }
        }
        x += x < to.x ? 1 : -1;
      }
    }

    if (to.y >= 0 && to.y < this.height && to.x >= 0 && to.x < this.width) {
      if (this.grid[to.y][to.x].type !== CellType.ROOM) {
        this.grid[to.y][to.x].type = CellType.CORRIDOR;
      }
    }
  }

  private placeSpecialRooms(): void {
    const roomCells: Cell[] = [];
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === CellType.ROOM) {
          roomCells.push(this.grid[y][x]);
        }
      }
    }

    this.shuffleArray(roomCells);

    let treasureCount = 0;
    let trapCount = 0;
    const targetTreasure = 2 + Math.floor(Math.random() * 2);
    const targetTrap = 2 + Math.floor(Math.random() * 2);

    for (const cell of roomCells) {
      if (treasureCount < targetTreasure) {
        cell.type = CellType.TREASURE;
        treasureCount++;
      } else if (trapCount < targetTrap) {
        cell.type = CellType.TRAP;
        trapCount++;
      }
      
      if (treasureCount >= targetTreasure && trapCount >= targetTrap) {
        break;
      }
    }
  }

  private setEntranceAndExit(): void {
    let entranceSet = false;
    for (let x = 0; x < this.width && !entranceSet; x++) {
      for (let y = 0; y < this.height && !entranceSet; y++) {
        if (this.grid[y][x].type === CellType.ROOM || this.grid[y][x].type === CellType.CORRIDOR) {
          this.grid[y][x].type = CellType.ENTRANCE;
          this.grid[y][x].explored = true;
          this.grid[y][x].visited = true;
          this.grid[y][x].eventTriggered = true;
          entranceSet = true;
        }
      }
    }

    let bossSet = false;
    for (let y = this.height - 1; y >= 0 && !bossSet; y--) {
      for (let x = this.width - 1; x >= 0 && !bossSet; x--) {
        if (this.grid[y][x].type === CellType.ROOM) {
          this.grid[y][x].type = CellType.BOSS;
          bossSet = true;
        }
      }
    }

    if (!bossSet) {
      for (let y = this.height - 1; y >= 0 && !bossSet; y--) {
        for (let x = this.width - 1; x >= 0 && !bossSet; x--) {
          if (this.grid[y][x].type === CellType.CORRIDOR) {
            this.grid[y][x].type = CellType.BOSS;
            bossSet = true;
          }
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.grid[y][x];
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public findEntrance(): { x: number; y: number } {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].type === CellType.ENTRANCE) {
          return { x, y };
        }
      }
    }
    return { x: 0, y: 0 };
  }

  public isWalkable(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    return cell.type !== CellType.CORRIDOR || true;
  }

  public exploreAround(x: number, y: number, radius: number = 1): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cell = this.getCell(x + dx, y + dy);
        if (cell) {
          cell.explored = true;
        }
      }
    }
  }
}

export const CELL_COLORS: Record<CellType, string> = {
  [CellType.CORRIDOR]: '#2d2a24',
  [CellType.ROOM]: '#3a3530',
  [CellType.TREASURE]: '#4a4238',
  [CellType.TRAP]: '#5c4a3a',
  [CellType.BOSS]: '#6b2d2d',
  [CellType.ENTRANCE]: '#2d4a2d',
  [CellType.EXIT]: '#4a3a2d'
};
