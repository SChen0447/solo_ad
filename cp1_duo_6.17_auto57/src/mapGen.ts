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
  id: number;
}

export interface MapData {
  tiles: TileType[][];
  rooms: Room[];
  roomIdGrid: (number | null)[][];
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

function findCorridorPath(
  tiles: TileType[][],
  roomIdGrid: (number | null)[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  startRoomId: number,
  endRoomId: number,
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
    { x: 0, y: -1, cost: 1 },
    { x: 0, y: 1, cost: 1 },
    { x: -1, y: 0, cost: 1 },
    { x: 1, y: 0, cost: 1 },
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

      const nodeRoomId = roomIdGrid[ny][nx];

      if (nodeRoomId !== null && nodeRoomId !== startRoomId && nodeRoomId !== endRoomId) {
        continue;
      }

      let moveCost = dir.cost;
      if (tiles[ny][nx] === TILE.WALL) {
        moveCost += 2;
      }

      if (nodeRoomId === null && tiles[ny][nx] === TILE.FLOOR) {
        moveCost += 1;
      }

      const g = current.g + moveCost;
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

function smoothPath(path: { x: number; y: number }[]): { x: number; y: number }[] {
  if (path.length <= 2) return path;

  const smoothed: { x: number; y: number }[] = [path[0]];
  let i = 0;

  while (i < path.length - 1) {
    let j = path.length - 1;

    while (j > i + 1) {
      const p1 = path[i];
      const p2 = path[j];

      const hasDiagonalTurn = (): boolean => {
        for (let k = i; k < j - 1; k++) {
          const a = path[k];
          const b = path[k + 1];
          const c = path[k + 2];
          const d1x = b.x - a.x;
          const d1y = b.y - a.y;
          const d2x = c.x - b.x;
          const d2y = c.y - b.y;
          if (d1x !== d2x || d1y !== d2y) {
            return true;
          }
        }
        return false;
      };

      const canDirectConnect = (): boolean => {
        if (p1.x !== p2.x && p1.y !== p2.y) {
          const mid1 = { x: p2.x, y: p1.y };
          const mid2 = { x: p1.x, y: p2.y };
          const dist1 = heuristic(p1, mid1) + heuristic(mid1, p2);
          const dist2 = heuristic(p1, mid2) + heuristic(mid2, p2);
          const originalDist = j - i;
          return Math.min(dist1, dist2) <= originalDist + 1;
        }
        return true;
      };

      if (!hasDiagonalTurn() || canDirectConnect()) {
        if (p1.x !== p2.x && p1.y !== p2.y) {
          const dist1 = heuristic(p1, { x: p2.x, y: p1.y }) + heuristic({ x: p2.x, y: p1.y }, p2);
          const dist2 = heuristic(p1, { x: p1.x, y: p2.y }) + heuristic({ x: p1.x, y: p2.y }, p2);

          if (dist1 <= dist2) {
            smoothed.push({ x: p2.x, y: p1.y });
          } else {
            smoothed.push({ x: p1.x, y: p2.y });
          }
        }
        smoothed.push(p2);
        i = j;
        break;
      }
      j--;
    }

    if (j === i + 1) {
      smoothed.push(path[i + 1]);
      i++;
    }
  }

  const result: { x: number; y: number }[] = [];
  for (let k = 0; k < smoothed.length - 1; k++) {
    const a = smoothed[k];
    const b = smoothed[k + 1];

    result.push(a);

    if (a.x === b.x) {
      const step = a.y < b.y ? 1 : -1;
      for (let yy = a.y + step; yy !== b.y; yy += step) {
        result.push({ x: a.x, y: yy });
      }
    } else if (a.y === b.y) {
      const step = a.x < b.x ? 1 : -1;
      for (let xx = a.x + step; xx !== b.x; xx += step) {
        result.push({ x: xx, y: a.y });
      }
    }
  }
  if (smoothed.length > 0) {
    result.push(smoothed[smoothed.length - 1]);
  }

  return result;
}

function roomsOverlap(r1: Room, r2: Room, minSpacing: number = 1): boolean {
  const expandedR1 = {
    x: r1.x - minSpacing,
    y: r1.y - minSpacing,
    width: r1.width + minSpacing * 2,
    height: r1.height + minSpacing * 2,
  };

  return (
    expandedR1.x < r2.x + r2.width &&
    expandedR1.x + expandedR1.width > r2.x &&
    expandedR1.y < r2.y + r2.height &&
    expandedR1.y + expandedR1.height > r2.y
  );
}

function carveLShapedCorridor(
  tiles: TileType[][],
  start: { x: number; y: number },
  end: { x: number; y: number },
  rng: SeededRandom
): void {
  const horizontalFirst = rng.next() < 0.5;

  if (horizontalFirst) {
    const xStep = start.x < end.x ? 1 : -1;
    for (let x = start.x; x !== end.x; x += xStep) {
      tiles[start.y][x] = TILE.FLOOR;
    }
    tiles[start.y][end.x] = TILE.FLOOR;

    const yStep = start.y < end.y ? 1 : -1;
    for (let y = start.y; y !== end.y; y += yStep) {
      tiles[y][end.x] = TILE.FLOOR;
    }
  } else {
    const yStep = start.y < end.y ? 1 : -1;
    for (let y = start.y; y !== end.y; y += yStep) {
      tiles[y][start.x] = TILE.FLOOR;
    }
    tiles[end.y][start.x] = TILE.FLOOR;

    const xStep = start.x < end.x ? 1 : -1;
    for (let x = start.x; x !== end.x; x += xStep) {
      tiles[end.y][x] = TILE.FLOOR;
    }
  }
}

export function generateDungeon(seed: number): MapData {
  const rng = new SeededRandom(seed);

  const tiles: TileType[][] = [];
  const roomIdGrid: (number | null)[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    roomIdGrid[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = TILE.WALL;
      roomIdGrid[y][x] = null;
    }
  }

  const rooms: Room[] = [];
  const minRooms = 6;
  const maxRooms = 10;
  const targetRooms = rng.nextInt(minRooms, maxRooms);
  const maxAttemptsPerRoom = 300;

  for (let i = 0; i < targetRooms; i++) {
    let roomPlaced = false;

    for (let attempt = 0; attempt < maxAttemptsPerRoom && !roomPlaced; attempt++) {
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
        id: rooms.length,
      };

      let overlaps = false;
      for (const existingRoom of rooms) {
        if (roomsOverlap(newRoom, existingRoom, 1)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        rooms.push(newRoom);
        roomPlaced = true;

        for (let y = roomY; y < roomY + roomHeight; y++) {
          for (let x = roomX; x < roomX + roomWidth; x++) {
            tiles[y][x] = TILE.FLOOR;
            roomIdGrid[y][x] = newRoom.id;
          }
        }
      }
    }

    if (!roomPlaced && rooms.length < minRooms) {
      return generateDungeon(seed + 99999);
    }
  }

  if (rooms.length < minRooms) {
    return generateDungeon(seed + 99999);
  }

  for (let i = 1; i < rooms.length; i++) {
    const prevRoom = rooms[i - 1];
    const currRoom = rooms[i];

    const path = findCorridorPath(
      tiles,
      roomIdGrid,
      { x: prevRoom.centerX, y: prevRoom.centerY },
      { x: currRoom.centerX, y: currRoom.centerY },
      prevRoom.id,
      currRoom.id,
      MAP_WIDTH,
      MAP_HEIGHT
    );

    if (path && path.length > 0) {
      const smoothedPath = smoothPath(path);
      for (const point of smoothedPath) {
        if (roomIdGrid[point.y][point.x] === null) {
          tiles[point.y][point.x] = TILE.FLOOR;
        }
      }
    } else {
      carveLShapedCorridor(
        tiles,
        { x: prevRoom.centerX, y: prevRoom.centerY },
        { x: currRoom.centerX, y: currRoom.centerY },
        rng
      );
    }
  }

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (rng.next() < 0.25) {
        const path = findCorridorPath(
          tiles,
          roomIdGrid,
          { x: rooms[i].centerX, y: rooms[i].centerY },
          { x: rooms[j].centerX, y: rooms[j].centerY },
          rooms[i].id,
          rooms[j].id,
          MAP_WIDTH,
          MAP_HEIGHT
        );

        if (path && path.length > 0) {
          const extraTiles = path.filter(
            (p) => roomIdGrid[p.y][p.x] === null && tiles[p.y][p.x] === TILE.WALL
          ).length;
          if (extraTiles > 0 && extraTiles < 15) {
            const smoothedPath = smoothPath(path);
            for (const point of smoothedPath) {
              if (roomIdGrid[point.y][point.x] === null) {
                tiles[point.y][point.x] = TILE.FLOOR;
              }
            }
          }
        }
      }
    }
  }

  return {
    tiles,
    rooms,
    roomIdGrid,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    seed,
  };
}

export function verifyConnectivity(mapData: MapData): boolean {
  if (mapData.rooms.length < 2) return true;

  for (let i = 1; i < mapData.rooms.length; i++) {
    const path = findCorridorPath(
      mapData.tiles,
      mapData.roomIdGrid,
      { x: mapData.rooms[0].centerX, y: mapData.rooms[0].centerY },
      { x: mapData.rooms[i].centerX, y: mapData.rooms[i].centerY },
      mapData.rooms[0].id,
      mapData.rooms[i].id,
      mapData.width,
      mapData.height
    );
    if (!path) return false;
  }

  return true;
}
