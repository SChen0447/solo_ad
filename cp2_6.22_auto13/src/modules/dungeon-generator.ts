import type { DungeonData, Room, Corridor, Position, Decoration, DecorationType } from '../types';

const MAP_WIDTH = 780;
const MAP_HEIGHT = 520;
const MAP_OFFSET_X = 10;
const MAP_OFFSET_Y = 60;
const MIN_ROOM_SIZE = 60;
const CORRIDOR_WIDTH = 20;
const MIN_ROOM_COUNT = 6;
const MAX_ROOM_COUNT = 10;
const WALL_COLORS = ['#2D2D2D', '#3E2E1E'];
const FLOOR_COLOR = '#1A1A2E';
const CORRIDOR_COLOR = '#2A2A40';

interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateRoomId(index: number): string {
  return `room_${index}`;
}

function splitNode(node: BSPNode, random: () => number, depth: number = 0): BSPNode {
  const canSplitH = node.width >= MIN_ROOM_SIZE * 2;
  const canSplitV = node.height >= MIN_ROOM_SIZE * 2;

  if (!canSplitH && !canSplitV) return node;

  let splitHorizontally: boolean;
  if (canSplitH && canSplitV) {
    splitHorizontally = random() > 0.5;
  } else {
    splitHorizontally = canSplitV;
  }

  if (splitHorizontally) {
    const splitY = node.y + MIN_ROOM_SIZE + Math.floor(random() * (node.height - MIN_ROOM_SIZE * 2));
    node.left = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: splitY - node.y
    };
    node.right = {
      x: node.x,
      y: splitY,
      width: node.width,
      height: node.y + node.height - splitY
    };
  } else {
    const splitX = node.x + MIN_ROOM_SIZE + Math.floor(random() * (node.width - MIN_ROOM_SIZE * 2));
    node.left = {
      x: node.x,
      y: node.y,
      width: splitX - node.x,
      height: node.height
    };
    node.right = {
      x: splitX,
      y: node.y,
      width: node.x + node.width - splitX,
      height: node.height
    };
  }

  node.left = splitNode(node.left, random, depth + 1);
  node.right = splitNode(node.right, random, depth + 1);

  return node;
}

function collectLeafNodes(node: BSPNode): BSPNode[] {
  if (!node.left && !node.right) {
    return [node];
  }
  const leaves: BSPNode[] = [];
  if (node.left) leaves.push(...collectLeafNodes(node.left));
  if (node.right) leaves.push(...collectLeafNodes(node.right));
  return leaves;
}

function createRoomFromNode(node: BSPNode, random: () => number, index: number): Room {
  const padding = 8 + Math.floor(random() * 8);
  const width = node.width - padding * 2 - Math.floor(random() * 20);
  const height = node.height - padding * 2 - Math.floor(random() * 15);
  const x = node.x + padding + Math.floor(random() * (node.width - width - padding * 2));
  const y = node.y + padding + Math.floor(random() * (node.height - height - padding * 2));

  return {
    id: generateRoomId(index),
    gridX: Math.floor((x - MAP_OFFSET_X) / 160),
    gridY: Math.floor((y - MAP_OFFSET_Y) / 120),
    x,
    y,
    width: Math.max(width, MIN_ROOM_SIZE - 20),
    height: Math.max(height, MIN_ROOM_SIZE - 20),
    wallColor: WALL_COLORS[Math.floor(random() * WALL_COLORS.length)],
    floorColor: FLOOR_COLOR,
    connections: [],
    decorations: []
  };
}

function createLCorridor(from: Room, to: Room, random: () => number): Position[] {
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;

  const path: Position[] = [];
  const goHorizontalFirst = random() > 0.5;

  if (goHorizontalFirst) {
    const minX = Math.min(fromCenterX, toCenterX);
    const maxX = Math.max(fromCenterX, toCenterX);
    for (let px = minX; px <= maxX; px += 10) {
      path.push({ x: px, y: fromCenterY });
    }
    path.push({ x: maxX, y: fromCenterY });

    const minY = Math.min(fromCenterY, toCenterY);
    const maxY = Math.max(fromCenterY, toCenterY);
    for (let py = minY; py <= maxY; py += 10) {
      path.push({ x: toCenterX, y: py });
    }
    path.push({ x: toCenterX, y: maxY });
  } else {
    const minY = Math.min(fromCenterY, toCenterY);
    const maxY = Math.max(fromCenterY, toCenterY);
    for (let py = minY; py <= maxY; py += 10) {
      path.push({ x: fromCenterX, y: py });
    }
    path.push({ x: fromCenterX, y: maxY });

    const minX = Math.min(fromCenterX, toCenterX);
    const maxX = Math.max(fromCenterX, toCenterX);
    for (let px = minX; px <= maxX; px += 10) {
      path.push({ x: px, y: toCenterY });
    }
    path.push({ x: maxX, y: toCenterY });
  }

  return path;
}

function connectRooms(rooms: Room[], random: () => number): { corridors: Corridor[]; connections: Map<string, string[]> } {
  const corridors: Corridor[] = [];
  const connections = new Map<string, string[]>();
  rooms.forEach(r => connections.set(r.id, []));

  const connected = new Set<string>();
  const toConnect = new Set(rooms.map(r => r.id));

  if (rooms.length > 0) {
    connected.add(rooms[0].id);
    toConnect.delete(rooms[0].id);
  }

  while (toConnect.size > 0) {
    let bestDist = Infinity;
    let bestFrom: string | null = null;
    let bestTo: string | null = null;

    for (const fromId of connected) {
      const fromRoom = rooms.find(r => r.id === fromId)!;
      for (const toId of toConnect) {
        const toRoom = rooms.find(r => r.id === toId)!;
        const dx = (fromRoom.x + fromRoom.width / 2) - (toRoom.x + toRoom.width / 2);
        const dy = (fromRoom.y + fromRoom.height / 2) - (toRoom.y + toRoom.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bestDist) {
          bestDist = dist;
          bestFrom = fromId;
          bestTo = toId;
        }
      }
    }

    if (bestFrom && bestTo) {
      const fromRoom = rooms.find(r => r.id === bestFrom)!;
      const toRoom = rooms.find(r => r.id === bestTo)!;

      connections.get(bestFrom)!.push(bestTo);
      connections.get(bestTo)!.push(bestFrom);

      corridors.push({
        from: bestFrom,
        to: bestTo,
        path: createLCorridor(fromRoom, toRoom, random)
      });

      connected.add(bestTo);
      toConnect.delete(bestTo);
    }
  }

  const extraConnections = Math.floor(rooms.length * 0.2);
  for (let i = 0; i < extraConnections; i++) {
    const fromIdx = Math.floor(random() * rooms.length);
    const toIdx = Math.floor(random() * rooms.length);
    if (fromIdx === toIdx) continue;

    const fromId = rooms[fromIdx].id;
    const toId = rooms[toIdx].id;

    if (!connections.get(fromId)!.includes(toId)) {
      connections.get(fromId)!.push(toId);
      connections.get(toId)!.push(fromId);

      corridors.push({
        from: fromId,
        to: toId,
        path: createLCorridor(rooms[fromIdx], rooms[toIdx], random)
      });
    }
  }

  return { corridors, connections };
}

function generateDecorations(
  room: Room,
  random: () => number
): Decoration[] {
  const decorations: Decoration[] = [];
  const count = Math.floor(random() * 3) + 1;
  const types: DecorationType[] = ['pillar', 'rubble', 'chest'];
  const margin = 15;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 10) {
      const dx = room.x + margin + random() * (room.width - margin * 2);
      const dy = room.y + margin + random() * (room.height - margin * 2);

      let tooClose = false;
      for (const existing of decorations) {
        const ddx = dx - existing.x;
        const ddy = dy - existing.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < 18) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        decorations.push({
          type: types[Math.floor(random() * types.length)],
          x: dx,
          y: dy,
          size: 5 + random() * 4
        });
        break;
      }
      attempts++;
    }
  }

  return decorations;
}

export function generateDungeon(seed: number = Date.now()): DungeonData {
  const startTime = performance.now();

  const random = seededRandom(seed);

  const root: BSPNode = {
    x: MAP_OFFSET_X,
    y: MAP_OFFSET_Y,
    width: MAP_WIDTH,
    height: MAP_HEIGHT
  };

  splitNode(root, random);

  const leafNodes = collectLeafNodes(root);

  const targetCount = MIN_ROOM_COUNT + Math.floor(random() * (MAX_ROOM_COUNT - MIN_ROOM_COUNT + 1));
  const selectedNodes = leafNodes
    .sort(() => random() - 0.5)
    .slice(0, Math.min(targetCount, leafNodes.length));

  const rooms: Room[] = selectedNodes.map((node, index) => {
    const room = createRoomFromNode(node, random, index);
    return room;
  });

  const { corridors, connections } = connectRooms(rooms, random);

  rooms.forEach(room => {
    room.connections = connections.get(room.id) || [];
    room.decorations = generateDecorations(room, random);
  });

  const endTime = performance.now();
  console.log(`BSP Dungeon generation took: ${(endTime - startTime).toFixed(3)}ms`);
  console.log(`Rooms: ${rooms.length}, Corridors: ${corridors.length}`);

  return {
    rooms,
    gridSize: 5,
    roomWidth: MIN_ROOM_SIZE,
    roomHeight: MIN_ROOM_SIZE,
    padding: 20,
    corridors
  };
}

export function getRoomAtPosition(dungeon: DungeonData, x: number, y: number): Room | null {
  for (const room of dungeon.rooms) {
    if (
      x >= room.x && x <= room.x + room.width &&
      y >= room.y && y <= room.y + room.height
    ) {
      return room;
    }
  }
  return null;
}

export function isPointInCorridor(dungeon: DungeonData, x: number, y: number, corridorWidth: number = CORRIDOR_WIDTH): boolean {
  for (const corridor of dungeon.corridors) {
    for (let i = 0; i < corridor.path.length - 1; i++) {
      const p1 = corridor.path[i];
      const p2 = corridor.path[i + 1];

      const minX = Math.min(p1.x, p2.x) - corridorWidth / 2;
      const maxX = Math.max(p1.x, p2.x) + corridorWidth / 2;
      const minY = Math.min(p1.y, p2.y) - corridorWidth / 2;
      const maxY = Math.max(p1.y, p2.y) + corridorWidth / 2;

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
  }
  return false;
}

export function isWalkable(dungeon: DungeonData, x: number, y: number, radius: number = 10): boolean {
  for (const room of dungeon.rooms) {
    if (
      x - radius >= room.x + 4 &&
      x + radius <= room.x + room.width - 4 &&
      y - radius >= room.y + 4 &&
      y + radius <= room.y + room.height - 4
    ) {
      return true;
    }
  }

  return isPointInCorridor(dungeon, x, y, 16);
}

export { CORRIDOR_COLOR, FLOOR_COLOR, WALL_COLORS, CORRIDOR_WIDTH };
