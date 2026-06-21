import type { RoomData, Room, Corridor, Position } from '../types';

const GRID_SIZE = 5;
const WALL_COLORS = ['#2D2D2D', '#3E2E1E', '#2D2D2D', '#333333', '#382818'];

class DungeonGenerator {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  private randomWallColor(): string {
    return WALL_COLORS[this.randomInt(0, WALL_COLORS.length - 1)];
  }

  generate(canvasWidth: number, canvasHeight: number): RoomData {
    const startTime = performance.now();
    const statusBarHeight = 50;
    const padding = 20;
    const availableWidth = canvasWidth - padding * 2;
    const availableHeight = canvasHeight - statusBarHeight - padding * 2;
    const cellWidth = Math.floor(availableWidth / GRID_SIZE);
    const cellHeight = Math.floor(availableHeight / GRID_SIZE);

    const rooms: Room[] = [];
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const roomPadding = 15;
        const baseX = padding + gx * cellWidth + roomPadding;
        const baseY = statusBarHeight + padding + gy * cellHeight + roomPadding;
        const roomWidth = cellWidth - roomPadding * 2;
        const roomHeight = cellHeight - roomPadding * 2;

        rooms.push({
          gridX: gx,
          gridY: gy,
          x: baseX,
          y: baseY,
          width: roomWidth,
          height: roomHeight,
          wallColor: this.randomWallColor(),
          connected: []
        });
      }
    }

    const corridors: Corridor[] = [];
    const visited = new Set<string>();
    const roomMap = new Map<string, Room>();
    rooms.forEach(r => roomMap.set(`${r.gridX},${r.gridY}`, r));

    const startRoom = rooms[0];
    visited.add(`${startRoom.gridX},${startRoom.gridY}`);
    const frontier: { room: Room; from: Room; dx: number; dy: number }[] = [];

    const addFrontier = (room: Room, from: Room, dx: number, dy: number) => {
      const key = `${room.gridX},${room.gridY}`;
      if (!visited.has(key) && !frontier.some(f => f.room.gridX === room.gridX && f.room.gridY === room.gridY)) {
        frontier.push({ room, from, dx, dy });
      }
    };

    const neighbors = this.getNeighbors(startRoom, rooms);
    neighbors.forEach(n => addFrontier(n.room, startRoom, n.dx, n.dy));

    while (frontier.length > 0) {
      const idx = this.randomInt(0, frontier.length - 1);
      const { room, from, dx } = frontier.splice(idx, 1)[0];
      const roomKey = `${room.gridX},${room.gridY}`;

      if (visited.has(roomKey)) continue;
      visited.add(roomKey);

      from.connected.push({ x: room.gridX, y: room.gridY });
      room.connected.push({ x: from.gridX, y: from.gridY });

      const fromCenter = {
        x: from.x + from.width / 2,
        y: from.y + from.height / 2
      };
      const toCenter = {
        x: room.x + room.width / 2,
        y: room.y + room.height / 2
      };

      if (dx !== 0) {
        const midX = (fromCenter.x + toCenter.x) / 2;
        corridors.push({ from: fromCenter, to: { x: midX, y: fromCenter.y } });
        corridors.push({ from: { x: midX, y: fromCenter.y }, to: { x: midX, y: toCenter.y } });
        corridors.push({ from: { x: midX, y: toCenter.y }, to: toCenter });
      } else {
        const midY = (fromCenter.y + toCenter.y) / 2;
        corridors.push({ from: fromCenter, to: { x: fromCenter.x, y: midY } });
        corridors.push({ from: { x: fromCenter.x, y: midY }, to: { x: toCenter.x, y: midY } });
        corridors.push({ from: { x: toCenter.x, y: midY }, to: toCenter });
      }

      const newNeighbors = this.getNeighbors(room, rooms);
      newNeighbors.forEach(n => addFrontier(n.room, room, n.dx, n.dy));
    }

    const endTime = performance.now();
    const generationTime = endTime - startTime;
    console.log(`Dungeon generation completed in ${generationTime.toFixed(3)}ms`);

    if (generationTime > 2) {
      console.warn(`Warning: Dungeon generation took ${generationTime.toFixed(3)}ms, exceeding 2ms target!`);
    }

    return {
      rooms,
      corridors,
      gridSize: GRID_SIZE,
      cellWidth,
      cellHeight,
      padding
    };
  }

  private getNeighbors(room: Room, rooms: Room[]): { room: Room; dx: number; dy: number }[] {
    const neighbors: { room: Room; dx: number; dy: number }[] = [];
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];

    for (const dir of directions) {
      const nx = room.gridX + dir.dx;
      const ny = room.gridY + dir.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const neighbor = rooms.find(r => r.gridX === nx && r.gridY === ny);
        if (neighbor) {
          neighbors.push({ room: neighbor, dx: dir.dx, dy: dir.dy });
        }
      }
    }

    return neighbors;
  }

  getPathPointsOnCorridors(roomData: RoomData, count: number): Position[] {
    const points: Position[] = [];
    const corridors = roomData.corridors;

    for (let i = 0; i < count; i++) {
      const corridor = corridors[this.randomInt(0, corridors.length - 1)];
      const t = this.random();
      points.push({
        x: corridor.from.x + (corridor.to.x - corridor.from.x) * t,
        y: corridor.from.y + (corridor.to.y - corridor.from.y) * t
      });
    }

    return points;
  }
}

export default DungeonGenerator;
