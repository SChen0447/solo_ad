export enum CellType {
  WALL = 0,
  FLOOR = 1,
  START = 2,
  END = 3,
  CHEST = 4,
  MONSTER = 5
}

export interface MazeCell {
  type: CellType;
  x: number;
  y: number;
}

export interface MazeData {
  width: number;
  height: number;
  cells: MazeCell[][];
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  chestPositions: { x: number; y: number }[];
  monsterPositions: { x: number; y: number }[];
  generationTimeMs: number;
  optimized: boolean;
}

interface Point {
  x: number;
  y: number;
}

const GEN_TIME_LIMIT_MS = 500;
const MAX_ITERATIONS = 2000;

class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number): void {
    const item = { element, priority };
    let lo = 0;
    let hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.items[mid].priority < item.priority) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    this.items.splice(lo, 0, item);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const DIRS_4: Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

function pointKey(p: Point): string {
  return `${p.x},${p.y}`;
}

function createEmptyMaze(width: number, height: number): MazeCell[][] {
  const cells: MazeCell[][] = [];
  for (let y = 0; y < height; y++) {
    cells[y] = [];
    for (let x = 0; x < width; x++) {
      cells[y][x] = { type: CellType.WALL, x, y };
    }
  }
  return cells;
}

function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x > 0 && x < width - 1 && y > 0 && y < height - 1;
}

function isWall(cells: MazeCell[][], x: number, y: number): boolean {
  return cells[y][x].type === CellType.WALL;
}

function carveCell(cells: MazeCell[][], x: number, y: number): void {
  cells[y][x].type = CellType.FLOOR;
}

function aStarVerify(cells: MazeCell[][], start: Point, end: Point): boolean {
  const openSet = new PriorityQueue<Point>();
  const gScore = new Map<string, number>();
  const closedSet = new Set<string>();

  gScore.set(pointKey(start), 0);
  openSet.enqueue(start, heuristic(start, end));

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    const ck = pointKey(current);

    if (closedSet.has(ck)) continue;
    closedSet.add(ck);

    if (current.x === end.x && current.y === end.y) return true;

    for (const dir of DIRS_4) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx < 0 || nx >= cells[0].length || ny < 0 || ny >= cells.length) continue;
      if (cells[ny][nx].type === CellType.WALL) continue;

      const nk = pointKey({ x: nx, y: ny });
      if (closedSet.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentativeG);
        openSet.enqueue({ x: nx, y: ny }, tentativeG + heuristic({ x: nx, y: ny }, end));
      }
    }
  }
  return false;
}

function aStarGuidedBuild(
  cells: MazeCell[][],
  start: Point,
  end: Point,
  startTime: number,
  timeLimit: number
): { completed: boolean; iterations: number } {
  const width = cells[0].length;
  const height = cells.length;

  const frontier = new PriorityQueue<Point>();
  const frontierSet = new Set<string>();
  const carved = new Set<string>();

  carveCell(cells, start.x, start.y);
  carved.add(pointKey(start));

  for (const dir of DIRS_4) {
    const nx = start.x + dir.x;
    const ny = start.y + dir.y;
    if (inBounds(nx, ny, width, height) && isWall(cells, nx, ny)) {
      const p = { x: nx, y: ny };
      frontier.enqueue(p, heuristic(p, end));
      frontierSet.add(pointKey(p));
    }
  }

  let iterations = 0;
  let endReached = false;

  while (!frontier.isEmpty() && iterations < MAX_ITERATIONS) {
    if (performance.now() - startTime > timeLimit) {
      return { completed: endReached, iterations };
    }

    iterations++;

    const current = frontier.dequeue()!;
    const ck = pointKey(current);
    frontierSet.delete(ck);

    if (!isWall(cells, current.x, current.y)) continue;

    let floorNeighbors = 0;
    for (const dir of DIRS_4) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!isWall(cells, nx, ny)) floorNeighbors++;
      }
    }

    if (floorNeighbors !== 1) continue;

    carveCell(cells, current.x, current.y);
    carved.add(ck);

    if (current.x === end.x && current.y === end.y) {
      endReached = true;
    }

    for (const dir of DIRS_4) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (!inBounds(nx, ny, width, height)) continue;
      if (!isWall(cells, nx, ny)) continue;

      const nk = pointKey({ x: nx, y: ny });
      if (frontierSet.has(nk)) continue;

      let adjFloor = 0;
      for (const d2 of DIRS_4) {
        const nnx = nx + d2.x;
        const nny = ny + d2.y;
        if (nnx >= 0 && nnx < width && nny >= 0 && nny < height) {
          if (!isWall(cells, nnx, nny)) adjFloor++;
        }
      }
      if (adjFloor === 1) {
        const priority = heuristic({ x: nx, y: ny }, end) + Math.random() * 3;
        frontier.enqueue({ x: nx, y: ny }, priority);
        frontierSet.add(nk);
      }
    }
  }

  if (!endReached) {
    let cx = start.x;
    let cy = start.y;
    while (cx !== end.x) {
      if (isWall(cells, cx, cy)) carveCell(cells, cx, cy);
      cx += cx < end.x ? 1 : -1;
    }
    while (cy !== end.y) {
      if (isWall(cells, cx, cy)) carveCell(cells, cx, cy);
      cy += cy < end.y ? 1 : -1;
    }
    if (isWall(cells, end.x, end.y)) carveCell(cells, end.x, end.y);
    endReached = true;
  }

  return { completed: endReached, iterations };
}

function addExtraPassages(
  cells: MazeCell[][],
  start: Point,
  end: Point,
  extraCount: number,
  startTime: number,
  timeLimit: number
): number {
  const width = cells[0].length;
  const height = cells.length;
  let added = 0;
  let attempts = 0;
  const maxAttempts = extraCount * 10;

  while (added < extraCount && attempts < maxAttempts) {
    if (performance.now() - startTime > timeLimit) break;
    attempts++;

    const x = 1 + Math.floor(Math.random() * (width - 2));
    const y = 1 + Math.floor(Math.random() * (height - 2));

    if (!isWall(cells, x, y)) continue;

    let floorCount = 0;
    for (const dir of DIRS_4) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!isWall(cells, nx, ny)) floorCount++;
      }
    }

    if (floorCount >= 2) {
      carveCell(cells, x, y);

      if (aStarVerify(cells, start, end)) {
        added++;
      } else {
        cells[y][x].type = CellType.WALL;
      }
    }
  }

  return added;
}

function generateFastMaze(cells: MazeCell[][], start: Point, end: Point): void {
  let cx = start.x;
  let cy = start.y;

  carveCell(cells, cx, cy);

  const maxSteps = cells.length * cells[0].length;
  let steps = 0;

  while ((cx !== end.x || cy !== end.y) && steps < maxSteps) {
    steps++;

    const choices: Point[] = [];

    if (cx < end.x) choices.push({ x: 1, y: 0 });
    if (cx > end.x) choices.push({ x: -1, y: 0 });
    if (cy < end.y) choices.push({ x: 0, y: 1 });
    if (cy > end.y) choices.push({ x: 0, y: -1 });

    if (Math.random() < 0.3) {
      const perpDirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ].filter((d) => {
        const nx = cx + d.x;
        const ny = cy + d.y;
        return (
          inBounds(nx, ny, cells[0].length, cells.length) &&
          (d.x === 0 || (d.x !== 0 && cx + d.x !== end.x))
        );
      });
      if (perpDirs.length > 0) {
        const pick = perpDirs[Math.floor(Math.random() * perpDirs.length)];
        choices.push(pick);
      }
    }

    if (choices.length === 0) break;

    const dir = choices[Math.floor(Math.random() * choices.length)];
    cx += dir.x;
    cy += dir.y;

    if (inBounds(cx, cy, cells[0].length, cells.length)) {
      carveCell(cells, cx, cy);
    } else {
      cx -= dir.x;
      cy -= dir.y;
    }
  }

  const branches = Math.floor((cells.length * cells[0].length) * 0.1);
  for (let i = 0; i < branches; i++) {
    const rx = 1 + Math.floor(Math.random() * (cells[0].length - 2));
    const ry = 1 + Math.floor(Math.random() * (cells.length - 2));
    if (!isWall(cells, rx, ry)) {
      const dir = DIRS_4[Math.floor(Math.random() * 4)];
      const nx = rx + dir.x;
      const ny = ry + dir.y;
      if (inBounds(nx, ny, cells[0].length, cells.length) && isWall(cells, nx, ny)) {
        carveCell(cells, nx, ny);
      }
    }
  }
}

function getFloorCells(cells: MazeCell[][]): Point[] {
  const floors: Point[] = [];
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[0].length; x++) {
      if (cells[y][x].type === CellType.FLOOR) {
        floors.push({ x, y });
      }
    }
  }
  return floors;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function generateMaze(width: number = 10, height: number = 10): MazeData {
  const startTime = performance.now();

  const startPos: Point = { x: 1, y: 1 };
  const endPos: Point = { x: width - 2, y: height - 2 };

  let cells: MazeCell[][] = createEmptyMaze(width, height);
  let optimized = false;

  const buildResult = aStarGuidedBuild(cells, startPos, endPos, startTime, GEN_TIME_LIMIT_MS * 0.6);

  const elapsed = performance.now() - startTime;
  if (elapsed > GEN_TIME_LIMIT_MS * 0.6 || !buildResult.completed) {
    optimized = true;
    cells = createEmptyMaze(width, height);
    generateFastMaze(cells, startPos, endPos);
  } else {
    const remainingTime = GEN_TIME_LIMIT_MS - elapsed;
    const extraCount = Math.floor(width * height * 0.08);
    addExtraPassages(cells, startPos, endPos, extraCount, startTime, GEN_TIME_LIMIT_MS);
  }

  let valid = aStarVerify(cells, startPos, endPos);
  if (!valid) {
    let cx = startPos.x;
    let cy = startPos.y;
    while (cx !== endPos.x) {
      carveCell(cells, cx, cy);
      cx += cx < endPos.x ? 1 : -1;
    }
    while (cy !== endPos.y) {
      carveCell(cells, cx, cy);
      cy += cy < endPos.y ? 1 : -1;
    }
    carveCell(cells, endPos.x, endPos.y);
    optimized = true;
  }

  cells[startPos.y][startPos.x].type = CellType.START;
  cells[endPos.y][endPos.x].type = CellType.END;

  const floorCells = getFloorCells(cells);
  const shuffled = shuffleArray(floorCells);

  const chestPositions: Point[] = [];
  const monsterPositions: Point[] = [];
  const numChests = 3;
  const numMonsters = Math.floor(Math.random() * 4) + 5;

  const availableFloors = shuffled.filter(
    (p) =>
      cells[p.y][p.x].type === CellType.FLOOR &&
      distance(p, startPos) > 2 &&
      distance(p, endPos) > 2
  );

  let idx = 0;
  for (let i = 0; i < numChests && idx < availableFloors.length; i++, idx++) {
    const pos = availableFloors[idx];
    cells[pos.y][pos.x].type = CellType.CHEST;
    chestPositions.push(pos);
  }

  for (let i = 0; i < numMonsters && idx < availableFloors.length; i++, idx++) {
    const pos = availableFloors[idx];
    cells[pos.y][pos.x].type = CellType.MONSTER;
    monsterPositions.push(pos);
  }

  const endTime = performance.now();
  const generationTimeMs = endTime - startTime;

  if (optimized) {
    console.log(
      `[MazeGenerator] 使用优化模式，生成耗时 ${generationTimeMs.toFixed(2)}ms`
    );
  } else {
    console.log(
      `[MazeGenerator] 标准模式生成完成，耗时 ${generationTimeMs.toFixed(2)}ms`
    );
  }

  if (generationTimeMs > GEN_TIME_LIMIT_MS) {
    console.warn(
      `[MazeGenerator] ⚠ 生成耗时 ${generationTimeMs.toFixed(2)}ms，超过 ${GEN_TIME_LIMIT_MS}ms 阈值`
    );
  }

  return {
    width,
    height,
    cells,
    startPos,
    endPos,
    chestPositions,
    monsterPositions,
    generationTimeMs,
    optimized
  };
}

export function findPath(
  cells: MazeCell[][],
  start: Point,
  end: Point
): Point[] | null {
  const openSet = new PriorityQueue<Point>();
  const cameFrom = new Map<string, Point>();
  const gScore = new Map<string, number>();
  const closedSet = new Set<string>();

  gScore.set(pointKey(start), 0);
  openSet.enqueue(start, heuristic(start, end));

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    const ck = pointKey(current);

    if (closedSet.has(ck)) continue;
    closedSet.add(ck);

    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [current];
      let curr = current;
      while (cameFrom.has(pointKey(curr))) {
        curr = cameFrom.get(pointKey(curr))!;
        path.unshift(curr);
      }
      return path;
    }

    for (const dir of DIRS_4) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx < 0 || nx >= cells[0].length || ny < 0 || ny >= cells.length) continue;
      if (cells[ny][nx].type === CellType.WALL) continue;

      const nk = pointKey({ x: nx, y: ny });
      if (closedSet.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        gScore.set(nk, tentativeG);
        openSet.enqueue({ x: nx, y: ny }, tentativeG + heuristic({ x: nx, y: ny }, end));
      }
    }
  }
  return null;
}
