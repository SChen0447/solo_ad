export const TILE_SIZE = 40;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 40;

export const TILE = {
  WALL: 0,
  FLOOR: 1,
} as const;

export type TileType = typeof TILE[keyof typeof TILE];

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface MapData {
  tiles: TileType[][];
  rooms: Room[];
  width: number;
  height: number;
  seed: number;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findPath(
  tiles: TileType[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  width: number,
  height: number
): { x: number; y: number }[] | null {
  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };

  openSet.push(startNode);

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === end.x && current.y === end.y) {
      const path: { x: number; y: number }[] = [];
      let node: AStarNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (closedSet.has(`${nx},${ny}`)) continue;

      const g = current.g + 1;
      const h = heuristic({ x: nx, y: ny }, end);
      const f = g + h;

      const existing = openSet.find((n) => n.x === nx && n.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
      } else {
        openSet.push({
          x: nx,
          y: ny,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  return null;
}

function roomsOverlap(r1: Room, r2: Room, padding: number = 1): boolean {
  return (
    r1.x - padding < r2.x + r2.width &&
    r1.x + r1.width + padding > r2.x &&
    r1.y - padding < r2.y + r2.height &&
    r1.y + r1.height + padding > r2.y
  );
}

export function generateDungeon(seed: number): MapData {
  const rng = new SeededRandom(seed);
  const tiles: TileType[][] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = TILE.WALL;
    }
  }

  const rooms: Room[] = [];
  const minRooms = 6;
  const maxRooms = 10;
  const targetRooms = rng.nextInt(minRooms, maxRooms);
  let attempts = 0;
  const maxAttempts = 200;

  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts++;

    const roomWidth = rng.nextInt(3, 8);
    const roomHeight = rng.nextInt(3, 8);
    const roomX = rng.nextInt(2, MAP_WIDTH - roomWidth - 2);
    const roomY = rng.nextInt(2, MAP_HEIGHT - roomHeight - 2);

    const newRoom: Room = {
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight,
      centerX: Math.floor(roomX + roomWidth / 2),
      centerY: Math.floor(roomY + roomHeight / 2),
    };

    let overlaps = false;
    for (const existingRoom of rooms) {
      if (roomsOverlap(newRoom, existingRoom, 2)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);

      for (let y = roomY; y < roomY + roomHeight; y++) {
        for (let x = roomX; x < roomX + roomWidth; x++) {
          tiles[y][x] = TILE.FLOOR;
        }
      }
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    const prevRoom = rooms[i - 1];
    const currRoom = rooms[i];

    const path = findPath(
      tiles,
      { x: prevRoom.centerX, y: prevRoom.centerY },
      { x: currRoom.centerX, y: currRoom.centerY },
      MAP_WIDTH,
      MAP_HEIGHT
    );

    if (path) {
      for (const point of path) {
        tiles[point.y][point.x] = TILE.FLOOR;
      }
    } else {
      let cx = prevRoom.centerX;
      let cy = prevRoom.centerY;

      while (cx !== currRoom.centerX) {
        tiles[cy][cx] = TILE.FLOOR;
        cx += cx < currRoom.centerX ? 1 : -1;
      }
      while (cy !== currRoom.centerY) {
        tiles[cy][cx] = TILE.FLOOR;
        cy += cy < currRoom.centerY ? 1 : -1;
      }
    }
  }

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (rng.next() < 0.3) {
        const path = findPath(
          tiles,
          { x: rooms[i].centerX, y: rooms[i].centerY },
          { x: rooms[j].centerX, y: rooms[j].centerY },
          MAP_WIDTH,
          MAP_HEIGHT
        );

        if (path) {
          for (const point of path) {
            tiles[point.y][point.x] = TILE.FLOOR;
          }
        }
      }
    }
  }

  return {
    tiles,
    rooms,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    seed,
  };
}

export function verifyConnectivity(mapData: MapData): boolean {
  if (mapData.rooms.length < 2) return true;

  for (let i = 1; i < mapData.rooms.length; i++) {
    const path = findPath(
      mapData.tiles,
      { x: mapData.rooms[0].centerX, y: mapData.rooms[0].centerY },
      { x: mapData.rooms[i].centerX, y: mapData.rooms[i].centerY },
      mapData.width,
      mapData.height
    );
    if (!path) return false;
  }

  return true;
}
