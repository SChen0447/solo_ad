import { Room, Enemy, GRID_SIZE, ROOM_SIZE, createId } from './types';

const ENEMY_NAMES = ['史莱姆', '骷髅兵', '蝙蝠', '哥布林', '暗影怪'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEnemy(): Enemy {
  const baseHp = randomInt(20, 40);
  return {
    id: createId(),
    name: ENEMY_NAMES[randomInt(0, ENEMY_NAMES.length - 1)],
    hp: baseHp,
    maxHp: baseHp,
    attack: randomInt(5, 12),
    defense: randomInt(1, 4),
  };
}

function generateRoomWalls(): boolean[][] {
  const walls: boolean[][] = [];
  for (let y = 0; y < ROOM_SIZE; y++) {
    walls[y] = [];
    for (let x = 0; x < ROOM_SIZE; x++) {
      if (x === 0 || x === ROOM_SIZE - 1 || y === 0 || y === ROOM_SIZE - 1) {
        walls[y][x] = true;
      } else {
        walls[y][x] = Math.random() < 0.08;
      }
    }
  }
  return walls;
}

function randomWalk(): boolean[][] {
  const connected: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    connected[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      connected[y][x] = false;
    }
  }

  let x = 0;
  let y = 0;
  const steps = GRID_SIZE * GRID_SIZE * 3;

  for (let i = 0; i < steps; i++) {
    connected[y][x] = true;
    const dir = randomInt(0, 3);
    if (dir === 0 && x > 0) x--;
    else if (dir === 1 && x < GRID_SIZE - 1) x++;
    else if (dir === 2 && y > 0) y--;
    else if (dir === 3 && y < GRID_SIZE - 1) y++;
  }

  return connected;
}

export function generateDungeon(): Room[][] {
  const connected = randomWalk();
  const dungeon: Room[][] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    dungeon[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!connected[y][x]) {
        dungeon[y][x] = {
          x,
          y,
          visited: false,
          enemies: [],
          hasChest: false,
          chestOpened: false,
          items: [],
          walls: generateRoomWalls(),
        };
        continue;
      }

      const enemyCount = (x === 0 && y === 0) ? 0 : randomInt(0, 2);
      const enemies: Enemy[] = [];
      for (let i = 0; i < enemyCount; i++) {
        enemies.push(generateEnemy());
      }

      const hasChest = (x !== 0 || y !== 0) && Math.random() < 0.3;

      dungeon[y][x] = {
        x,
        y,
        visited: x === 0 && y === 0,
        enemies,
        hasChest,
        chestOpened: false,
        items: [],
        walls: generateRoomWalls(),
      };
    }
  }

  return dungeon;
}

export function isRoomAccessible(dungeon: Room[][], x: number, y: number): boolean {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
  return dungeon[y][x].enemies.length === 0 || dungeon[y][x].visited;
}

export function getAdjacentRooms(dungeon: Room[][], x: number, y: number): { x: number; y: number; direction: string }[] {
  const adjacent: { x: number; y: number; direction: string }[] = [];
  const directions = [
    { dx: 0, dy: -1, dir: 'up' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: -1, dy: 0, dir: 'left' },
    { dx: 1, dy: 0, dir: 'right' },
  ];

  for (const d of directions) {
    const nx = x + d.dx;
    const ny = y + d.dy;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      adjacent.push({ x: nx, y: ny, direction: d.dir });
    }
  }

  return adjacent;
}
