export type CellType = 'wall' | 'corridor' | 'start' | 'end';

export interface Cell {
  x: number;
  y: number;
  type: CellType;
  explored: boolean;
  visible: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface MonsterData {
  id: string;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  name: string;
}

export interface ItemData {
  id: string;
  position: Position;
  type: 'potion-heal' | 'potion-power' | 'key';
}

export interface ChestData {
  id: string;
  position: Position;
  locked: boolean;
}

export interface MazeData {
  width: number;
  height: number;
  cells: Cell[][];
  start: Position;
  end: Position;
  monsters: MonsterData[];
  items: ItemData[];
  chests: ChestData[];
}

const MONSTER_NAMES = ['👹 哥布林', '👻 幽灵', '🦇 蝙蝠王', '🐺 恶狼', '💀 骷髅兵', '🧟 僵尸'];

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMaze(width: number, height: number, floor: number): MazeData {
  const grid: Cell[][] = [];

  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = {
        x,
        y,
        type: 'wall',
        explored: false,
        visible: false,
      };
    }
  }

  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false)
  );

  const startX = 1;
  const startY = 1;
  const stack: Position[] = [{ x: startX, y: startY }];
  grid[startY][startX].type = 'corridor';
  visited[startY][startX] = true;

  const directions = [
    { dx: 0, dy: -2 },
    { dx: 2, dy: 0 },
    { dx: 0, dy: 2 },
    { dx: -2, dy: 0 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const shuffledDirs = shuffleArray(directions);
    let found = false;

    for (const { dx, dy } of shuffledDirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && !visited[ny][nx]) {
        visited[ny][nx] = true;
        grid[ny][nx].type = 'corridor';
        grid[current.y + dy / 2][current.x + dx / 2].type = 'corridor';
        stack.push({ x: nx, y: ny });
        found = true;
        break;
      }
    }

    if (!found) {
      stack.pop();
    }
  }

  const extraOpenings = Math.floor((width * height) * 0.05);
  for (let i = 0; i < extraOpenings; i++) {
    const x = randInt(2, width - 3);
    const y = randInt(2, height - 3);
    if (grid[y][x].type === 'wall') {
      let corridorNeighbors = 0;
      if (grid[y - 1]?.[x]?.type === 'corridor') corridorNeighbors++;
      if (grid[y + 1]?.[x]?.type === 'corridor') corridorNeighbors++;
      if (grid[y]?.[x - 1]?.type === 'corridor') corridorNeighbors++;
      if (grid[y]?.[x + 1]?.type === 'corridor') corridorNeighbors++;
      if (corridorNeighbors >= 2) {
        grid[y][x].type = 'corridor';
      }
    }
  }

  const corridors: Position[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x].type === 'corridor') {
        corridors.push({ x, y });
      }
    }
  }

  const start: Position = { x: startX, y: startY };
  grid[startY][startX].type = 'start';

  let endPos: Position | null = null;
  let maxDist = 0;
  for (const pos of corridors) {
    const dist = Math.abs(pos.x - start.x) + Math.abs(pos.y - start.y);
    if (dist > maxDist && !(pos.x === start.x && pos.y === start.y)) {
      maxDist = dist;
      endPos = pos;
    }
  }
  if (!endPos) endPos = corridors[corridors.length - 1];
  grid[endPos.y][endPos.x].type = 'end';

  const corridorCells = corridors.filter(
    (p) => !(p.x === start.x && p.y === start.y) && !(p.x === endPos!.x && p.y === endPos!.y)
  );
  const shuffledCorridors = shuffleArray(corridorCells);

  const monsters: MonsterData[] = [];
  const monsterCount = Math.min(3 + Math.floor(floor / 2), 10);
  let idx = 0;
  for (let i = 0; i < monsterCount && idx < shuffledCorridors.length; i++, idx++) {
    const pos = shuffledCorridors[idx];
    const hp = randInt(8, 12) + floor * 2;
    monsters.push({
      id: `monster-${Date.now()}-${i}`,
      position: pos,
      hp,
      maxHp: hp,
      attack: randInt(2, 4) + Math.floor(floor / 2),
      defense: randInt(0, 1),
      name: MONSTER_NAMES[randInt(0, MONSTER_NAMES.length - 1)],
    });
  }

  const items: ItemData[] = [];
  const itemCount = randInt(3, 6);
  for (let i = 0; i < itemCount && idx < shuffledCorridors.length; i++, idx++) {
    const pos = shuffledCorridors[idx];
    const rand = Math.random();
    let type: ItemData['type'];
    if (rand < 0.4) type = 'potion-heal';
    else if (rand < 0.7) type = 'potion-power';
    else type = 'key';
    items.push({
      id: `item-${Date.now()}-${i}`,
      position: pos,
      type,
    });
  }

  const chests: ChestData[] = [];
  const chestCount = randInt(2, 4);
  for (let i = 0; i < chestCount && idx < shuffledCorridors.length; i++, idx++) {
    const pos = shuffledCorridors[idx];
    chests.push({
      id: `chest-${Date.now()}-${i}`,
      position: pos,
      locked: i === 0,
    });
  }

  return {
    width,
    height,
    cells: grid,
    start,
    end: endPos,
    monsters,
    items,
    chests,
  };
}

export function getCell(maze: MazeData, x: number, y: number): Cell | null {
  if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) {
    return null;
  }
  return maze.cells[y][x];
}

export function isWalkable(maze: MazeData, x: number, y: number): boolean {
  const cell = getCell(maze, x, y);
  return cell !== null && cell.type !== 'wall';
}

export function updateVisibility(maze: MazeData, playerX: number, playerY: number, radius: number): void {
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      maze.cells[y][x].visible = false;
    }
  }

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = playerX + dx;
      const y = playerY + dy;
      if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + 0.5) {
        maze.cells[y][x].visible = true;
        maze.cells[y][x].explored = true;
      }
    }
  }
}

export function getVisibilityLevel(
  maze: MazeData,
  x: number,
  y: number,
  playerX: number,
  playerY: number,
  visibleRadius: number
): 'visible' | 'partial' | 'fog' {
  if (!maze.cells[y][x].explored) return 'fog';
  if (!maze.cells[y][x].visible) return 'fog';

  const dist = Math.sqrt((x - playerX) ** 2 + (y - playerY) ** 2);
  if (dist <= visibleRadius) return 'visible';
  if (dist <= visibleRadius + 1.5) return 'partial';
  return 'fog';
}

export function getMonsterAt(maze: MazeData, x: number, y: number): MonsterData | null {
  return maze.monsters.find((m) => m.position.x === x && m.position.y === y) || null;
}

export function getItemAt(maze: MazeData, x: number, y: number): ItemData | null {
  return maze.items.find((i) => i.position.x === x && i.position.y === y) || null;
}

export function getChestAt(maze: MazeData, x: number, y: number): ChestData | null {
  return maze.chests.find((c) => c.position.x === x && c.position.y === y) || null;
}

export function isAdjacentToMonster(maze: MazeData, x: number, y: number): MonsterData | null {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];
  for (const { dx, dy } of directions) {
    const monster = getMonsterAt(maze, x + dx, y + dy);
    if (monster) return monster;
  }
  return null;
}

export function removeMonster(maze: MazeData, monsterId: string): void {
  maze.monsters = maze.monsters.filter((m) => m.id !== monsterId);
}

export function removeItem(maze: MazeData, itemId: string): void {
  maze.items = maze.items.filter((i) => i.id !== itemId);
}
