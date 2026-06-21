import type { Tile, Room, MapData, Position } from '../types';

const MAP_WIDTH = 15;
const MAP_HEIGHT = 15;
const MIN_ROOMS = 6;
const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 8;

export class MapGenerator {
  public width: number = MAP_WIDTH;
  public height: number = MAP_HEIGHT;
  public tiles: Tile[][] = [];
  public rooms: Room[] = [];

  constructor() {
    this.initTiles();
  }

  private initTiles(): void {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          type: 'wall',
          visited: false,
          visible: false
        });
      }
      this.tiles.push(row);
    }
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private roomsOverlap(r1: Room, r2: Room, padding: number = 1): boolean {
    return !(
      r1.x + r1.width + padding < r2.x ||
      r2.x + r2.width + padding < r1.x ||
      r1.y + r1.height + padding < r2.y ||
      r2.y + r2.height + padding < r1.y
    );
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          this.tiles[y][x].type = 'floor';
        }
      }
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    for (let x = startX; x <= endX; x++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.tiles[y][x].type = 'floor';
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    for (let y = startY; y <= endY; y++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.tiles[y][x].type = 'floor';
      }
    }
  }

  private connectRooms(r1: Room, r2: Room): void {
    if (Math.random() < 0.5) {
      this.carveHorizontalCorridor(r1.centerX, r2.centerX, r1.centerY);
      this.carveVerticalCorridor(r1.centerY, r2.centerY, r2.centerX);
    } else {
      this.carveVerticalCorridor(r1.centerY, r2.centerY, r1.centerX);
      this.carveHorizontalCorridor(r1.centerX, r2.centerX, r2.centerY);
    }
  }

  private placeDoors(room: Room): void {
    const directions = [
      { dx: 0, dy: -1, checkX: room.centerX, checkY: room.y - 1 },
      { dx: 0, dy: 1, checkX: room.centerX, checkY: room.y + room.height },
      { dx: -1, dy: 0, checkX: room.x - 1, checkY: room.centerY },
      { dx: 1, dy: 0, checkX: room.x + room.width, checkY: room.centerY }
    ];

    for (const dir of directions) {
      if (
        dir.checkY >= 0 && dir.checkY < this.height &&
        dir.checkX >= 0 && dir.checkX < this.width &&
        this.tiles[dir.checkY][dir.checkX].type === 'floor'
      ) {
        const doorX = room.centerX + (dir.dx !== 0 ? (dir.dx > 0 ? room.width - 1 : 0) : 0);
        const doorY = room.centerY + (dir.dy !== 0 ? (dir.dy > 0 ? room.height - 1 : 0) : 0);
        if (
          doorY >= 0 && doorY < this.height &&
          doorX >= 0 && doorX < this.width
        ) {
          this.tiles[doorY][doorX].type = 'door';
        }
      }
    }
  }

  private placeTraps(): void {
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.tiles[y][x].type === 'floor') {
          let isCorridor = true;
          for (const room of this.rooms) {
            if (
              x >= room.x && x < room.x + room.width &&
              y >= room.y && y < room.y + room.height
            ) {
              isCorridor = false;
              break;
            }
          }
          if (isCorridor && Math.random() < 0.1) {
            this.tiles[y][x].type = 'trap';
          }
        }
      }
    }
  }

  public generate(): MapData {
    this.initTiles();
    this.rooms = [];

    let attempts = 0;
    const maxAttempts = 200;

    while (this.rooms.length < MIN_ROOMS && attempts < maxAttempts) {
      attempts++;
      const width = this.randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
      const height = this.randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
      const x = this.randInt(1, this.width - width - 2);
      const y = this.randInt(1, this.height - height - 2);

      const newRoom: Room = {
        x,
        y,
        width,
        height,
        centerX: Math.floor(x + width / 2),
        centerY: Math.floor(y + height / 2)
      };

      let overlaps = false;
      for (const existingRoom of this.rooms) {
        if (this.roomsOverlap(newRoom, existingRoom, 1)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.carveRoom(newRoom);
        if (this.rooms.length > 0) {
          this.connectRooms(this.rooms[this.rooms.length - 1], newRoom);
        }
        this.rooms.push(newRoom);
      }
    }

    for (let i = 1; i < this.rooms.length; i++) {
      this.placeDoors(this.rooms[i]);
    }

    this.placeTraps();

    for (let x = 0; x < this.width; x++) {
      this.tiles[0][x].type = 'wall';
      this.tiles[this.height - 1][x].type = 'wall';
    }
    for (let y = 0; y < this.height; y++) {
      this.tiles[y][0].type = 'wall';
      this.tiles[y][this.width - 1].type = 'wall';
    }

    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      rooms: this.rooms
    };
  }

  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.tiles[y][x];
    return tile.type === 'floor' || tile.type === 'door' || tile.type === 'trap';
  }

  public getRoomAt(x: number, y: number): Room | null {
    for (const room of this.rooms) {
      if (
        x >= room.x && x < room.x + room.width &&
        y >= room.y && y < room.y + room.height
      ) {
        return room;
      }
    }
    return null;
  }

  public getSpawnPosition(): Position {
    if (this.rooms.length === 0) {
      return { x: 1, y: 1 };
    }
    const firstRoom = this.rooms[0];
    return {
      x: firstRoom.centerX,
      y: firstRoom.centerY
    };
  }

  public getEnemySpawnPositions(roomIndex: number): Position[] {
    const positions: Position[] = [];
    const room = this.rooms[roomIndex];
    if (!room || roomIndex === 0) return positions;

    const count = this.randInt(2, 4);
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const px = this.randInt(room.x + 1, room.x + room.width - 2);
        const py = this.randInt(room.y + 1, room.y + room.height - 2);
        if (
          this.tiles[py][px].type === 'floor' &&
          !positions.some(p => p.x === px && p.y === py)
        ) {
          positions.push({ x: px, y: py });
          break;
        }
        attempts++;
      }
    }
    return positions;
  }

  public getChestPosition(roomIndex: number): Position | null {
    const room = this.rooms[roomIndex];
    if (!room || roomIndex === 0) return null;

    let attempts = 0;
    while (attempts < 20) {
      const px = this.randInt(room.x + 1, room.x + room.width - 2);
      const py = this.randInt(room.y + 1, room.y + room.height - 2);
      if (this.tiles[py][px].type === 'floor' && !this.tiles[py][px].hasChest) {
        this.tiles[py][px].hasChest = true;
        this.tiles[py][px].chestOpened = false;
        return { x: px, y: py };
      }
      attempts++;
    }
    return null;
  }
}
