export enum CellType {
  Wall = 'wall',
  Corridor = 'corridor',
  Start = 'start',
  End = 'end'
}

export interface MonsterData {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  alive: boolean;
}

export interface ItemData {
  x: number;
  y: number;
  type: 'potion' | 'power' | 'key';
  picked: boolean;
}

export interface ChestData {
  x: number;
  y: number;
  locked: boolean;
  opened: boolean;
}

export interface MazeData {
  width: number;
  height: number;
  cells: CellType[][];
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  monsters: MonsterData[];
  items: ItemData[];
  chests: ChestData[];
}

export function generateMaze(width: number, height: number): MazeData {
  const mazeW = width % 2 === 0 ? width + 1 : width;
  const mazeH = height % 2 === 0 ? height + 1 : height;

  const cells: CellType[][] = [];
  for (let y = 0; y < mazeH; y++) {
    cells[y] = [];
    for (let x = 0; x < mazeW; x++) {
      cells[y][x] = CellType.Wall;
    }
  }

  const visited: boolean[][] = [];
  for (let y = 0; y < mazeH; y++) {
    visited[y] = [];
    for (let x = 0; x < mazeW; x++) {
      visited[y][x] = false;
    }
  }

  const startX = 1;
  const startY = 1;
  cells[startY][startX] = CellType.Corridor;
  visited[startY][startX] = true;

  const stack: [number, number][] = [[startX, startY]];
  const dirs: [number, number][] = [[0, -2], [0, 2], [-2, 0], [2, 0]];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors: [number, number, number, number][] = [];

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < mazeW - 1 && ny > 0 && ny < mazeH - 1 && !visited[ny][nx]) {
        neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
      }
    }

    if (neighbors.length > 0) {
      const idx = Math.floor(Math.random() * neighbors.length);
      const [nx, ny, wx, wy] = neighbors[idx];
      cells[ny][nx] = CellType.Corridor;
      cells[wy][wx] = CellType.Corridor;
      visited[ny][nx] = true;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  cells[startY][startX] = CellType.Start;

  const corridorCells: [number, number][] = [];
  for (let y = 0; y < mazeH; y++) {
    for (let x = 0; x < mazeW; x++) {
      if (cells[y][x] === CellType.Corridor) {
        corridorCells.push([x, y]);
      }
    }
  }

  const reachable = bfsReachable(cells, startX, startY, mazeW, mazeH);
  const unreachable: [number, number][] = [];
  for (const [cx, cy] of corridorCells) {
    if (!reachable.has(`${cx},${cy}`)) {
      unreachable.push([cx, cy]);
    }
  }

  if (unreachable.length > 0) {
    for (const [ux, uy] of unreachable) {
      const neighborDirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of neighborDirs) {
        const nx = ux + dx;
        const ny = uy + dy;
        if (nx >= 0 && nx < mazeW && ny >= 0 && ny < mazeH && cells[ny][nx] === CellType.Wall) {
          const nnx = ux + dx * 2;
          const nny = uy + dy * 2;
          if (nnx >= 0 && nnx < mazeW && nny >= 0 && nny < mazeH && reachable.has(`${nnx},${nny}`)) {
            cells[ny][nx] = CellType.Corridor;
            break;
          }
        }
      }
    }
  }

  const allCorridors: [number, number][] = [];
  for (let y = 0; y < mazeH; y++) {
    for (let x = 0; x < mazeW; x++) {
      if (cells[y][x] === CellType.Corridor) {
        allCorridors.push([x, y]);
      }
    }
  }

  const deadEnds: [number, number][] = [];
  for (const [cx, cy] of allCorridors) {
    let wallCount = 0;
    const neighborDirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of neighborDirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= mazeW || ny < 0 || ny >= mazeH || cells[ny][nx] === CellType.Wall) {
        wallCount++;
      }
    }
    if (wallCount >= 3) {
      deadEnds.push([cx, cy]);
    }
  }

  const extraOpenings = Math.min(Math.floor(deadEnds.length * 0.3), 10);
  for (let i = 0; i < extraOpenings && deadEnds.length > 0; i++) {
    const idx = Math.floor(Math.random() * deadEnds.length);
    const [dx, dy] = deadEnds.splice(idx, 1)[0];
    const neighborDirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [ndx, ndy] of neighborDirs) {
      const nx = dx + ndx;
      const ny = dy + ndy;
      const nnx = dx + ndx * 2;
      const nny = dy + ndy * 2;
      if (nx >= 0 && nx < mazeW && ny >= 0 && ny < mazeH &&
          nnx >= 0 && nnx < mazeW && nny >= 0 && nny < mazeH &&
          cells[ny][nx] === CellType.Wall &&
          cells[nny][nnx] === CellType.Corridor) {
        cells[ny][nx] = CellType.Corridor;
        break;
      }
    }
  }

  const finalCorridors: [number, number][] = [];
  for (let y = 0; y < mazeH; y++) {
    for (let x = 0; x < mazeW; x++) {
      if (cells[y][x] === CellType.Corridor) {
        finalCorridors.push([x, y]);
      }
    }
  }

  let endX = mazeW - 2;
  let endY = mazeH - 2;
  let foundEnd = false;
  const finalReachable = bfsReachable(cells, startX, startY, mazeW, mazeH);
  for (let y = mazeH - 2; y >= 1 && !foundEnd; y -= 2) {
    for (let x = mazeW - 2; x >= 1 && !foundEnd; x -= 2) {
      if (cells[y][x] === CellType.Corridor && finalReachable.has(`${x},${y}`) && (x !== startX || y !== startY)) {
        endX = x;
        endY = y;
        foundEnd = true;
      }
    }
  }
  if (!foundEnd) {
    for (let i = finalCorridors.length - 1; i >= 0; i--) {
      const [cx, cy] = finalCorridors[i];
      if (cx !== startX || cy !== startY) {
        endX = cx;
        endY = cy;
        break;
      }
    }
  }
  cells[endY][endX] = CellType.End;

  const corridors: [number, number][] = [];
  for (let y = 0; y < mazeH; y++) {
    for (let x = 0; x < mazeW; x++) {
      if (cells[y][x] === CellType.Corridor) {
        corridors.push([x, y]);
      }
    }
  }

  for (let i = corridors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [corridors[i], corridors[j]] = [corridors[j], corridors[i]];
  }

  const monsterCount = Math.min(Math.floor(corridors.length * 0.08), 8);
  const itemCount = Math.min(Math.floor(corridors.length * 0.06), 6);
  const chestCount = Math.min(Math.floor(corridors.length * 0.04), 3);

  const monsters: MonsterData[] = [];
  const items: ItemData[] = [];
  const chests: ChestData[] = [];

  let usedSet = new Set<string>();
  usedSet.add(`${startX},${startY}`);
  usedSet.add(`${endX},${endY}`);

  let cIdx = 0;
  for (let i = 0; i < monsterCount && cIdx < corridors.length; cIdx++) {
    const [x, y] = corridors[cIdx];
    const key = `${x},${y}`;
    if (!usedSet.has(key)) {
      usedSet.add(key);
      const hp = Math.floor(Math.random() * 5) + 8;
      monsters.push({
        x, y,
        hp,
        maxHp: hp,
        atk: Math.floor(Math.random() * 3) + 2,
        def: Math.floor(Math.random() * 2),
        alive: true
      });
      i++;
    }
  }

  for (let i = 0; i < itemCount && cIdx < corridors.length; cIdx++) {
    const [x, y] = corridors[cIdx];
    const key = `${x},${y}`;
    if (!usedSet.has(key)) {
      usedSet.add(key);
      const types: ItemData['type'][] = ['potion', 'power', 'key'];
      const typeIdx = i % 3;
      items.push({
        x, y,
        type: types[typeIdx],
        picked: false
      });
      i++;
    }
  }

  for (let i = 0; i < chestCount && cIdx < corridors.length; cIdx++) {
    const [x, y] = corridors[cIdx];
    const key = `${x},${y}`;
    if (!usedSet.has(key)) {
      usedSet.add(key);
      chests.push({
        x, y,
        locked: i === 0,
        opened: false
      });
      i++;
    }
  }

  return {
    width: mazeW,
    height: mazeH,
    cells,
    startX,
    startY,
    endX,
    endY,
    monsters,
    items,
    chests
  };
}

export function getCell(maze: MazeData, x: number, y: number): CellType {
  if (x < 0 || x >= maze.width || y < 0 || y >= maze.height) {
    return CellType.Wall;
  }
  return maze.cells[y][x];
}

function bfsReachable(cells: CellType[][], startX: number, startY: number, width: number, height: number): Set<string> {
  const visited = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  visited.add(`${startX},${startY}`);
  const dirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
          !visited.has(key) &&
          (cells[ny][nx] === CellType.Corridor || cells[ny][nx] === CellType.Start || cells[ny][nx] === CellType.End)) {
        visited.add(key);
        queue.push([nx, ny]);
      }
    }
  }

  return visited;
}
