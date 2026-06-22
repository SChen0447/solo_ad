import type { DungeonData, Player, Enemy, Position, Room } from '../types';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function createPlayer(dungeon: DungeonData, seed: number = Date.now()): Player {
  const random = seededRandom(seed + 1000);
  
  const centerIndex = Math.floor(dungeon.gridSize / 2);
  const startRoom = dungeon.rooms.find(
    r => r.gridX === centerIndex && r.gridY === centerIndex
  ) || dungeon.rooms[0];
  
  const x = startRoom.x + startRoom.width / 2 + (random() - 0.5) * 20;
  const y = startRoom.y + startRoom.height / 2 + (random() - 0.5) * 20;
  
  return {
    id: 'player',
    type: 'player',
    x,
    y,
    radius: 10,
    speed: 200,
    currentRoomId: startRoom.id,
    isHit: false,
    hitTimer: 0,
    velocityX: 0,
    velocityY: 0
  };
}

export function createEnemies(dungeon: DungeonData, seed: number = Date.now()): Enemy[] {
  const random = seededRandom(seed + 2000);
  
  const enemyCount = Math.floor(random() * 3) + 3;
  const enemies: Enemy[] = [];
  
  const availableRooms = dungeon.rooms.filter(room => {
    const centerIndex = Math.floor(dungeon.gridSize / 2);
    return !(room.gridX === centerIndex && room.gridY === centerIndex);
  });
  
  const shuffledRooms = [...availableRooms].sort(() => random() - 0.5);
  
  for (let i = 0; i < enemyCount && i < shuffledRooms.length; i++) {
    const room = shuffledRooms[i];
    const patrolPath = generatePatrolPath(dungeon, room, random);
    
    const startPos = patrolPath[0];
    
    enemies.push({
      id: `enemy_${i}`,
      type: 'enemy',
      x: startPos.x,
      y: startPos.y,
      size: 14,
      speed: 80,
      patrolPath,
      currentPathIndex: 0,
      waitTimer: 0,
      isWaiting: false,
      startRoomId: room.id
    });
  }
  
  return enemies;
}

function generatePatrolPath(dungeon: DungeonData, startRoom: Room, random: () => number): Position[] {
  const pathPoints: Position[] = [];
  const pointCount = Math.floor(random() * 2) + 2;
  
  const centerX = startRoom.x + startRoom.width / 2;
  const centerY = startRoom.y + startRoom.height / 2;
  
  pathPoints.push({
    x: centerX + (random() - 0.5) * (startRoom.width * 0.4),
    y: centerY + (random() - 0.5) * (startRoom.height * 0.4)
  });
  
  const connectedRoomIds = startRoom.connections;
  if (connectedRoomIds.length > 0) {
    const targetRoomId = connectedRoomIds[Math.floor(random() * connectedRoomIds.length)];
    const targetRoom = dungeon.rooms.find(r => r.id === targetRoomId);
    
    if (targetRoom) {
      const corridorMidpoint = getCorridorMidpoint(startRoom, targetRoom);
      pathPoints.push(corridorMidpoint);
      
      if (pointCount >= 3) {
        const targetCenterX = targetRoom.x + targetRoom.width / 2;
        const targetCenterY = targetRoom.y + targetRoom.height / 2;
        pathPoints.push({
          x: targetCenterX + (random() - 0.5) * (targetRoom.width * 0.3),
          y: targetCenterY + (random() - 0.5) * (targetRoom.height * 0.3)
        });
      }
    }
  } else {
    for (let i = 1; i < pointCount; i++) {
      pathPoints.push({
        x: centerX + (random() - 0.5) * (startRoom.width * 0.6),
        y: centerY + (random() - 0.5) * (startRoom.height * 0.6)
      });
    }
  }
  
  return pathPoints;
}

function getCorridorMidpoint(roomA: Room, roomB: Room): Position {
  const centerAX = roomA.x + roomA.width / 2;
  const centerAY = roomA.y + roomA.height / 2;
  const centerBX = roomB.x + roomB.width / 2;
  const centerBY = roomB.y + roomB.height / 2;
  
  return {
    x: (centerAX + centerBX) / 2,
    y: (centerAY + centerBY) / 2
  };
}

export function spawnEntities(dungeon: DungeonData, seed: number = Date.now()): {
  player: Player;
  enemies: Enemy[];
} {
  const player = createPlayer(dungeon, seed);
  const enemies = createEnemies(dungeon, seed);
  
  return { player, enemies };
}
