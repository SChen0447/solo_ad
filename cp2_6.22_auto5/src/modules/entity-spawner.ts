import type { RoomData, Player, Enemy } from '../types';
import DungeonGenerator from './dungeon-generator';

class EntitySpawner {
  private dungeonGenerator: DungeonGenerator;

  constructor(seed: number = Date.now()) {
    this.dungeonGenerator = new DungeonGenerator(seed);
  }

  spawnPlayer(roomData: RoomData): Player {
    const startRoom = roomData.rooms[0];
    return {
      x: startRoom.x + startRoom.width / 2,
      y: startRoom.y + startRoom.height / 2,
      radius: 10,
      speed: 200,
      currentRoom: { x: startRoom.gridX, y: startRoom.gridY },
      isHit: false,
      hitTimer: 0,
      knockback: null,
      knockbackTimer: 0
    };
  }

  spawnEnemies(roomData: RoomData): Enemy[] {
    const enemies: Enemy[] = [];
    const enemyCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < enemyCount; i++) {
      const pathPointCount = 2 + Math.floor(Math.random() * 2);
      const path = this.dungeonGenerator.getPathPointsOnCorridors(roomData, pathPointCount);

      const spawnPoint = path[0];
      enemies.push({
        id: i,
        x: spawnPoint.x,
        y: spawnPoint.y,
        size: 14,
        speed: 80,
        path,
        currentPathIndex: 0,
        waitTimer: 0,
        isWaiting: false
      });
    }

    return enemies;
  }

  spawnAll(roomData: RoomData): { player: Player; enemies: Enemy[] } {
    return {
      player: this.spawnPlayer(roomData),
      enemies: this.spawnEnemies(roomData)
    };
  }
}

export default EntitySpawner;
