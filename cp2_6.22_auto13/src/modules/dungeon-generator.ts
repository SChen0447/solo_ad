import type { DungeonData, Room, Corridor, Position, Decoration, DecorationType } from '../types';

const GRID_SIZE = 5;
const ROOM_WIDTH = 140;
const ROOM_HEIGHT = 100;
const PADDING = 20;
const WALL_COLORS = ['#2D2D2D', '#3E2E1E'];
const FLOOR_COLOR = '#1A1A2E';
const CORRIDOR_COLOR = '#2A2A40';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getRoomId(gridX: number, gridY: number): string {
  return `room_${gridX}_${gridY}`;
}

interface RoomNode {
  id: string;
  gridX: number;
  gridY: number;
  visited: boolean;
  neighbors: string[];
}

function generateMaze(gridSize: number, random: () => number): Map<string, string[]> {
  const nodes = new Map<string, RoomNode>();
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const id = getRoomId(x, y);
      const neighbors: string[] = [];
      if (x > 0) neighbors.push(getRoomId(x - 1, y));
      if (x < gridSize - 1) neighbors.push(getRoomId(x + 1, y));
      if (y > 0) neighbors.push(getRoomId(x, y - 1));
      if (y < gridSize - 1) neighbors.push(getRoomId(x, y + 1));
      
      nodes.set(id, {
        id,
        gridX: x,
        gridY: y,
        visited: false,
        neighbors
      });
    }
  }
  
  const connections = new Map<string, string[]>();
  nodes.forEach(node => connections.set(node.id, []));
  
  const startId = getRoomId(Math.floor(gridSize / 2), Math.floor(gridSize / 2));
  const stack: string[] = [startId];
  const startNode = nodes.get(startId)!;
  startNode.visited = true;
  
  while (stack.length > 0) {
    const currentId = stack[stack.length - 1];
    const current = nodes.get(currentId)!;
    
    const unvisitedNeighbors = current.neighbors.filter(n => !nodes.get(n)!.visited);
    
    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }
    
    const nextId = unvisitedNeighbors[Math.floor(random() * unvisitedNeighbors.length)];
    const nextNode = nodes.get(nextId)!;
    
    connections.get(currentId)!.push(nextId);
    connections.get(nextId)!.push(currentId);
    
    nextNode.visited = true;
    stack.push(nextId);
  }
  
  const extraConnections = Math.floor(gridSize * gridSize * 0.15);
  for (let i = 0; i < extraConnections; i++) {
    const x = Math.floor(random() * gridSize);
    const y = Math.floor(random() * gridSize);
    const id = getRoomId(x, y);
    const node = nodes.get(id)!;
    
    const unconnected = node.neighbors.filter(n => !connections.get(id)!.includes(n));
    if (unconnected.length > 0) {
      const target = unconnected[Math.floor(random() * unconnected.length)];
      if (!connections.get(id)!.includes(target)) {
        connections.get(id)!.push(target);
        connections.get(target)!.push(id);
      }
    }
  }
  
  return connections;
}

function generateCorridors(rooms: Room[], connections: Map<string, string[]>): Corridor[] {
  const corridors: Corridor[] = [];
  const roomMap = new Map<string, Room>();
  rooms.forEach(r => roomMap.set(r.id, r));
  
  const processed = new Set<string>();
  
  rooms.forEach(room => {
    const roomConnections = connections.get(room.id) || [];
    roomConnections.forEach(targetId => {
      const key = [room.id, targetId].sort().join('-');
      if (processed.has(key)) return;
      processed.add(key);
      
      const target = roomMap.get(targetId);
      if (!target) return;
      
      const path: Position[] = [];
      
      const startX = room.x + room.width / 2;
      const startY = room.y + room.height / 2;
      const endX = target.x + target.width / 2;
      const endY = target.y + target.height / 2;
      
      if (room.gridX === target.gridX) {
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        for (let y = minY; y <= maxY; y += 10) {
          path.push({ x: startX, y });
        }
        path.push({ x: startX, y: maxY });
      } else {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        for (let x = minX; x <= maxX; x += 10) {
          path.push({ x, y: startY });
        }
        path.push({ x: maxX, y: startY });
      }
      
      corridors.push({
        from: room.id,
        to: targetId,
        path
      });
    });
  });
  
  return corridors;
}

function generateDecorations(
  room: Room,
  connections: string[],
  allRooms: Room[],
  random: () => number
): Decoration[] {
  const decorations: Decoration[] = [];
  const corridorOpenings: Position[] = [];

  for (const connId of connections) {
    const connRoom = allRooms.find(r => r.id === connId);
    if (!connRoom) continue;
    if (connRoom.gridX === room.gridX) {
      const isAbove = connRoom.gridY < room.gridY;
      corridorOpenings.push({
        x: room.x + room.width / 2,
        y: isAbove ? room.y : room.y + room.height
      });
    } else {
      const isLeft = connRoom.gridX < room.gridX;
      corridorOpenings.push({
        x: isLeft ? room.x : room.x + room.width,
        y: room.y + room.height / 2
      });
    }
  }

  const count = Math.floor(random() * 4) + 1;
  const types: DecorationType[] = ['pillar', 'rubble', 'chest'];
  const margin = 18;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 10) {
      const dx = room.x + margin + random() * (room.width - margin * 2);
      const dy = room.y + margin + random() * (room.height - margin * 2);

      let tooClose = false;
      for (const opening of corridorOpenings) {
        const ddx = dx - opening.x;
        const ddy = dy - opening.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < 25) {
          tooClose = true;
          break;
        }
      }
      for (const existing of decorations) {
        const ddx = dx - existing.x;
        const ddy = dy - existing.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < 20) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        decorations.push({
          type: types[Math.floor(random() * types.length)],
          x: dx,
          y: dy,
          size: 6 + random() * 4
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
  
  const connections = generateMaze(GRID_SIZE, random);
  
  const rooms: Room[] = [];
  const offsetX = (800 - (GRID_SIZE * (ROOM_WIDTH + PADDING) - PADDING)) / 2;
  const offsetY = 50 + (600 - 50 - (GRID_SIZE * (ROOM_HEIGHT + PADDING) - PADDING)) / 2;
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const id = getRoomId(x, y);
      const wallColor = WALL_COLORS[Math.floor(random() * WALL_COLORS.length)];
      
      rooms.push({
        id,
        gridX: x,
        gridY: y,
        x: offsetX + x * (ROOM_WIDTH + PADDING),
        y: offsetY + y * (ROOM_HEIGHT + PADDING),
        width: ROOM_WIDTH,
        height: ROOM_HEIGHT,
        wallColor,
        floorColor: FLOOR_COLOR,
        connections: connections.get(id) || [],
        decorations: []
      });
    }
  }
  
  for (const room of rooms) {
    room.decorations = generateDecorations(
      room,
      room.connections,
      rooms,
      random
    );
  }
  
  const corridors = generateCorridors(rooms, connections);
  
  const endTime = performance.now();
  console.log(`Dungeon generation took: ${(endTime - startTime).toFixed(3)}ms`);
  
  return {
    rooms,
    gridSize: GRID_SIZE,
    roomWidth: ROOM_WIDTH,
    roomHeight: ROOM_HEIGHT,
    padding: PADDING,
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

export function isPointInCorridor(dungeon: DungeonData, x: number, y: number, corridorWidth: number = 20): boolean {
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

export { CORRIDOR_COLOR, FLOOR_COLOR, WALL_COLORS };
