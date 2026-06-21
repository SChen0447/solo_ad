import type { EnemyData, EnemyType, Position } from '../types';
import type { MapGenerator } from '../game/mapGenerator';
import type { Player } from './player';

let enemyIdCounter = 0;

const ENEMY_STATS: Record<EnemyType, { hp: number; attack: number; defense: number }> = {
  goblin: { hp: 30, attack: 8, defense: 2 },
  skeleton: { hp: 40, attack: 12, defense: 3 },
  orc: { hp: 60, attack: 15, defense: 5 }
};

export class Enemy {
  public data: EnemyData;

  constructor(type: EnemyType, x: number, y: number, roomIndex: number) {
    const stats = ENEMY_STATS[type];
    this.data = {
      id: `enemy_${enemyIdCounter++}`,
      type,
      x,
      y,
      hp: stats.hp,
      maxHp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      roomIndex,
      aiState: 'patrol',
      patrolDirection: this.getRandomDirection(),
      lastDirChange: 0,
      isHit: false,
      hitTime: 0,
      isDying: false,
      deathTime: 0,
      dead: false
    };
  }

  private getRandomDirection(): Position {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 }
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  public takeDamage(amount: number, currentTime: number): void {
    const actualDamage = Math.max(1, amount - this.data.defense);
    this.data.hp -= actualDamage;
    this.data.isHit = true;
    this.data.hitTime = currentTime;

    if (this.data.hp <= 0) {
      this.data.hp = 0;
      this.data.isDying = true;
      this.data.deathTime = currentTime;
    }
  }

  public isDead(): boolean {
    return this.data.dead;
  }

  public isAdjacentToPlayer(player: Player): boolean {
    const dx = Math.abs(this.data.x - player.x);
    const dy = Math.abs(this.data.y - player.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  private isInSameRoom(player: Player, map: MapGenerator): boolean {
    const playerRoom = map.getRoomAt(player.x, player.y);
    const enemyRoom = map.rooms[this.data.roomIndex];
    if (!playerRoom || !enemyRoom) return false;
    return playerRoom === enemyRoom;
  }

  private getDistanceToPlayer(player: Player): number {
    return Math.abs(this.data.x - player.x) + Math.abs(this.data.y - player.y);
  }

  public update(
    player: Player,
    map: MapGenerator,
    enemies: Enemy[],
    currentTime: number,
    turnTick: boolean
  ): Position | null {
    if (this.data.isDying) {
      if (currentTime - this.data.deathTime > 500) {
        this.data.dead = true;
      }
      return null;
    }

    if (this.data.isHit && currentTime - this.data.hitTime > 200) {
      this.data.isHit = false;
    }

    if (!turnTick) return null;

    if (this.isAdjacentToPlayer(player)) {
      return null;
    }

    const inSameRoom = this.isInSameRoom(player, map);
    const distance = this.getDistanceToPlayer(player);

    if (inSameRoom && distance < 5) {
      this.data.aiState = 'chase';
    } else {
      this.data.aiState = 'patrol';
    }

    let moveDir: Position;

    if (this.data.aiState === 'chase') {
      moveDir = this.getChaseDirection(player, map, enemies);
    } else {
      if (currentTime - this.data.lastDirChange > 2000) {
        this.data.patrolDirection = this.getRandomDirection();
        this.data.lastDirChange = currentTime;
      }
      moveDir = this.data.patrolDirection;
    }

    if (moveDir.x === 0 && moveDir.y === 0) return null;

    const newX = this.data.x + moveDir.x;
    const newY = this.data.y + moveDir.y;

    if (!map.isWalkable(newX, newY)) return null;

    const enemyOccupied = enemies.some(
      e => e !== this && !e.isDead() && e.data.x === newX && e.data.y === newY
    );
    if (enemyOccupied) return null;

    if (player.x === newX && player.y === newY) return null;

    this.data.x = newX;
    this.data.y = newY;

    return { x: newX, y: newY };
  }

  private getChaseDirection(
    player: Player,
    map: MapGenerator,
    enemies: Enemy[]
  ): Position {
    const dx = player.x - this.data.x;
    const dy = player.y - this.data.y;

    const directions: Position[] = [];

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx !== 0) directions.push({ x: dx > 0 ? 1 : -1, y: 0 });
      if (dy !== 0) directions.push({ x: 0, y: dy > 0 ? 1 : -1 });
    } else {
      if (dy !== 0) directions.push({ x: 0, y: dy > 0 ? 1 : -1 });
      if (dx !== 0) directions.push({ x: dx > 0 ? 1 : -1, y: 0 });
    }

    for (const dir of directions) {
      const newX = this.data.x + dir.x;
      const newY = this.data.y + dir.y;
      if (
        map.isWalkable(newX, newY) &&
        !enemies.some(e => e !== this && !e.isDead() && e.data.x === newX && e.data.y === newY) &&
        !(player.x === newX && player.y === newY)
      ) {
        return dir;
      }
    }

    return { x: 0, y: 0 };
  }

  public static spawnEnemies(map: MapGenerator): Enemy[] {
    const enemies: Enemy[] = [];
    const types: EnemyType[] = ['goblin', 'skeleton', 'orc'];

    for (let i = 1; i < map.rooms.length; i++) {
      const positions = map.getEnemySpawnPositions(i);
      for (const pos of positions) {
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push(new Enemy(type, pos.x, pos.y, i));
      }
    }

    return enemies;
  }
}
