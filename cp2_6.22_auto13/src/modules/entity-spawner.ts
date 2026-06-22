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
  const startRoom = dungeon.rooms[0];

  const x = startRoom.x + startRoom.width / 2 + (random() - 0.5) * 10;
  const y = startRoom.y + startRoom.height / 2 + (random() - 0.5) * 10;

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

  const availableRooms = dungeon.rooms.filter((_, index) => index !== 0);

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
  const pointCount = 3 + Math.floor(random() * 2);

  pathPoints.push({
    x: startRoom.x + startRoom.width / 2,
    y: startRoom.y + startRoom.height / 2
  });

  const visitedRooms = new Set<string>([startRoom.id]);
  let currentRoom = startRoom;

  for (let i = 1; i < pointCount; i++) {
    const connectedRooms = currentRoom.connections
      .map(id => dungeon.rooms.find(r => r.id === id))
      .filter((r): r is Room => r !== undefined);

    let nextRoom: Room | undefined;

    const unvisited = connectedRooms.filter(r => !visitedRooms.has(r.id));
    if (unvisited.length > 0) {
      nextRoom = unvisited[Math.floor(random() * unvisited.length)];
    } else if (connectedRooms.length > 0) {
      nextRoom = connectedRooms[Math.floor(random() * connectedRooms.length)];
    } else {
      nextRoom = dungeon.rooms[Math.floor(random() * dungeon.rooms.length)];
    }

    if (nextRoom) {
      pathPoints.push({
        x: nextRoom.x + nextRoom.width / 2,
        y: nextRoom.y + nextRoom.height / 2
      });
      visitedRooms.add(nextRoom.id);
      currentRoom = nextRoom;
    }
  }

  return pathPoints;
}

export function spawnEntities(dungeon: DungeonData, seed: number = Date.now()): {
  player: Player;
  enemies: Enemy[];
} {
  const player = createPlayer(dungeon, seed);
  const enemies = createEnemies(dungeon, seed);

  return { player, enemies };
}
