export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  isEntrance?: boolean;
  isExit?: boolean;
  items: RoomItem[];
}

export interface RoomItem {
  type: 'coin' | 'chest';
  x: number;
  y: number;
}

export interface Corridor {
  fromRoomId: number;
  toRoomId: number;
  points: { x: number; y: number }[];
}

export interface BSPResult {
  rooms: Room[];
  corridors: Corridor[];
  gridWidth: number;
  gridHeight: number;
}

interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 6;
const MIN_LEAF_SIZE = 8;
const TARGET_ROOM_COUNT_MIN = 8;
const TARGET_ROOM_COUNT_MAX = 12;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitNode(node: BSPNode, depth: number = 0): void {
  if (node.left || node.right) return;
  if (node.width < MIN_LEAF_SIZE * 2 && node.height < MIN_LEAF_SIZE * 2) return;

  const canSplitH = node.width >= MIN_LEAF_SIZE * 2;
  const canSplitV = node.height >= MIN_LEAF_SIZE * 2;

  let splitHorizontal: boolean;
  if (canSplitH && canSplitV) {
    splitHorizontal = Math.random() > 0.5;
  } else if (canSplitH) {
    splitHorizontal = false;
  } else if (canSplitV) {
    splitHorizontal = true;
  } else {
    return;
  }

  if (splitHorizontal) {
    const splitY = randomInt(MIN_LEAF_SIZE, node.height - MIN_LEAF_SIZE);
    node.left = {
      x: node.x,
      y: node.y,
      width: node.width,
      height: splitY,
    };
    node.right = {
      x: node.x,
      y: node.y + splitY,
      width: node.width,
      height: node.height - splitY,
    };
  } else {
    const splitX = randomInt(MIN_LEAF_SIZE, node.width - MIN_LEAF_SIZE);
    node.left = {
      x: node.x,
      y: node.y,
      width: splitX,
      height: node.height,
    };
    node.right = {
      x: node.x + splitX,
      y: node.y,
      width: node.width - splitX,
      height: node.height,
    };
  }

  splitNode(node.left, depth + 1);
  splitNode(node.right, depth + 1);
}

function getLeafNodes(node: BSPNode): BSPNode[] {
  if (!node.left && !node.right) return [node];
  const leaves: BSPNode[] = [];
  if (node.left) leaves.push(...getLeafNodes(node.left));
  if (node.right) leaves.push(...getLeafNodes(node.right));
  return leaves;
}

function createRoomInNode(node: BSPNode, roomId: number): Room {
  const roomWidth = randomInt(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, node.width - 2));
  const roomHeight = randomInt(MIN_ROOM_SIZE, Math.min(MAX_ROOM_SIZE, node.height - 2));

  const roomX = node.x + randomInt(1, node.width - roomWidth - 1);
  const roomY = node.y + randomInt(1, node.height - roomHeight - 1);

  const items: RoomItem[] = [];
  const itemCount = Math.floor(Math.random() * 3);
  for (let i = 0; i < itemCount; i++) {
    const ix = randomInt(roomX + 1, roomX + roomWidth - 2);
    const iy = randomInt(roomY + 1, roomY + roomHeight - 2);
    const type = Math.random() > 0.7 ? 'chest' : 'coin';
    items.push({ type, x: ix, y: iy });
  }

  return {
    id: roomId,
    x: roomX,
    y: roomY,
    width: roomWidth,
    height: roomHeight,
    centerX: Math.floor(roomX + roomWidth / 2),
    centerY: Math.floor(roomY + roomHeight / 2),
    items,
  };
}

function generateCorridor(roomA: Room, roomB: Room): Corridor {
  const points: { x: number; y: number }[] = [];

  const startX = roomA.centerX;
  const startY = roomA.centerY;
  const endX = roomB.centerX;
  const endY = roomB.centerY;

  const horizontalFirst = Math.random() > 0.5;

  if (horizontalFirst) {
    for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
      points.push({ x, y: startY });
    }
    const yDir = endY > startY ? 1 : -1;
    for (let y = startY + yDir; y !== endY + yDir; y += yDir) {
      points.push({ x: endX, y });
    }
  } else {
    for (let y = Math.min(startY, endY); y <= Math.max(startY, endY); y++) {
      points.push({ x: startX, y });
    }
    const xDir = endX > startX ? 1 : -1;
    for (let x = startX + xDir; x !== endX + xDir; x += xDir) {
      points.push({ x, y: endY });
    }
  }

  return {
    fromRoomId: roomA.id,
    toRoomId: roomB.id,
    points,
  };
}

function roomsDistance(a: Room, b: Room): number {
  const dx = a.centerX - b.centerX;
  const dy = a.centerY - b.centerY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateDungeon(gridWidth: number, gridHeight: number): BSPResult {
  const root: BSPNode = {
    x: 1,
    y: 1,
    width: gridWidth - 2,
    height: gridHeight - 2,
  };

  splitNode(root);

  let leaves = getLeafNodes(root);

  while (leaves.length > TARGET_ROOM_COUNT_MAX) {
    const randomIndex = Math.floor(Math.random() * leaves.length);
    leaves.splice(randomIndex, 1);
  }

  if (leaves.length < TARGET_ROOM_COUNT_MIN) {
    const sortedLeaves = [...leaves].sort((a, b) => {
      const sizeA = a.width * a.height;
      const sizeB = b.width * b.height;
      return sizeB - sizeA;
    });

    for (const leaf of sortedLeaves) {
      if (leaves.length >= TARGET_ROOM_COUNT_MIN) break;
      if (leaf.width >= MIN_LEAF_SIZE * 2 || leaf.height >= MIN_LEAF_SIZE * 2) {
        splitNode(leaf);
        const newLeaves = getLeafNodes(leaf);
        const idx = leaves.indexOf(leaf);
        if (idx !== -1) {
          leaves.splice(idx, 1, ...newLeaves);
        }
      }
    }
  }

  const rooms: Room[] = [];
  let roomId = 0;
  for (const leaf of leaves) {
    const room = createRoomInNode(leaf, roomId++);
    rooms.push(room);
  }

  let maxDist = 0;
  let entranceIdx = 0;
  let exitIdx = 1;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const dist = roomsDistance(rooms[i], rooms[j]);
      if (dist > maxDist) {
        maxDist = dist;
        entranceIdx = i;
        exitIdx = j;
      }
    }
  }
  rooms[entranceIdx].isEntrance = true;
  rooms[exitIdx].isExit = true;

  const corridors: Corridor[] = [];
  const connected = new Set<number>();
  connected.add(rooms[0].id);

  while (connected.size < rooms.length) {
    let bestDist = Infinity;
    let bestFrom: Room | null = null;
    let bestTo: Room | null = null;

    for (const roomA of rooms) {
      if (!connected.has(roomA.id)) continue;
      for (const roomB of rooms) {
        if (connected.has(roomB.id)) continue;
        const dist = roomsDistance(roomA, roomB);
        if (dist < bestDist) {
          bestDist = dist;
          bestFrom = roomA;
          bestTo = roomB;
        }
      }
    }

    if (bestFrom && bestTo) {
      corridors.push(generateCorridor(bestFrom, bestTo));
      connected.add(bestTo.id);
    } else {
      break;
    }
  }

  const extraCorridors = Math.floor(rooms.length * 0.3);
  for (let i = 0; i < extraCorridors; i++) {
    const idxA = Math.floor(Math.random() * rooms.length);
    const idxB = Math.floor(Math.random() * rooms.length);
    if (idxA !== idxB) {
      const exists = corridors.some(
        (c) =>
          (c.fromRoomId === rooms[idxA].id && c.toRoomId === rooms[idxB].id) ||
          (c.fromRoomId === rooms[idxB].id && c.toRoomId === rooms[idxA].id)
      );
      if (!exists) {
        corridors.push(generateCorridor(rooms[idxA], rooms[idxB]));
      }
    }
  }

  return {
    rooms,
    corridors,
    gridWidth,
    gridHeight,
  };
}
