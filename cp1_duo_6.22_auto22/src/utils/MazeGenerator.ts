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
  visited: boolean;
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
}

interface Point {
  x: number;
  y: number;
}

class PriorityQueue<T> {
  private items: { element: T; priority: number }[] = [];

  enqueue(element: T, priority: number): void {
    const item = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }
    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift()?.element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const DIRS_4 = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

function getWalkableNeighbors(cells: MazeCell[][], point: Point): Point[] {
  const neighbors: Point[] = [];
  for (const dir of DIRS_4) {
    const nx = point.x + dir.x;
    const ny = point.y + dir.y;
    if (
      nx >= 0 &&
      nx < cells[0].length &&
      ny >= 0 &&
      ny < cells.length &&
      cells[ny][nx].type !== CellType.WALL
    ) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

function aStarSearch(cells: MazeCell[][], start: Point, end: Point): Point[] | null {
  const openSet = new PriorityQueue<Point>();
  const cameFrom: Map<string, Point> = new Map();
  const gScore: Map<string, number> = new Map();
  const fScore: Map<string, number> = new Map();
  const closedSet: Set<string> = new Set();

  const key = (p: Point) => `${p.x},${p.y}`;

  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, end));
  openSet.enqueue(start, fScore.get(key(start))!);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    const ck = key(current);

    if (closedSet.has(ck)) continue;
    closedSet.add(ck);

    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [current];
      let curr = current;
      while (cameFrom.has(key(curr))) {
        curr = cameFrom.get(key(curr))!;
        path.unshift(curr);
      }
      return path;
    }

    for (const neighbor of getWalkableNeighbors(cells, current)) {
      const nk = key(neighbor);
      if (closedSet.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + heuristic(neighbor, end));
        openSet.enqueue(neighbor, fScore.get(nk)!);
      }
    }
  }
  return null;
}

function createEmptyMaze(width: number, height: number): MazeCell[][] {
  const cells: MazeCell[][] = [];
  for (let y = 0; y < height; y++) {
    cells[y] = [];
    for (let x = 0; x < width; x++) {
      cells[y][x] = {
        type: CellType.WALL,
        x,
        y,
        visited: false
      };
    }
  }
  return cells;
}

function buildPathWithAStar(cells: MazeCell[][], start: Point, end: Point): Point[] {
  const pathCells: Point[] = [];
  const key = (p: Point) => `${p.x},${p.y}`;
  const inPath: Set<string> = new Set();

  const openSet = new PriorityQueue<Point>();
  const cameFrom: Map<string, Point> = new Map();
  const gScore: Map<string, number> = new Map();
  const fScore: Map<string, number> = new Map();
  const closedSet: Set<string> = new Set();

  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, end));
  openSet.enqueue(start, fScore.get(key(start))!);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    const ck = key(current);

    if (closedSet.has(ck)) continue;
    closedSet.add(ck);

    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [current];
      let curr = current;
      while (cameFrom.has(key(curr))) {
        curr = cameFrom.get(key(curr))!;
        path.unshift(curr);
      }
      return path;
    }

    const neighbors = getPotentialNeighbors(cells, current);
    for (const neighbor of neighbors) {
      const nk = key(neighbor);
      if (closedSet.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + heuristic(neighbor, end));
        openSet.enqueue(neighbor, fScore.get(nk)!);
      }
    }
  }

  return directPathFallback(start, end);
}

function getPotentialNeighbors(cells: MazeCell[][], point: Point): Point[] {
  const neighbors: Point[] = [];
  for (const dir of DIRS_4) {
    const nx = point.x + dir.x;
    const ny = point.y + dir.y;
    if (nx > 0 && nx < cells[0].length - 1 && ny > 0 && ny < cells.length - 1) {
      if (cells[ny][nx].type !== CellType.WALL) {
        neighbors.push({ x: nx, y: ny });
      } else {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  return neighbors;
}

function directPathFallback(start: Point, end: Point): Point[] {
  const path: Point[] = [];
  let cx = start.x;
  let cy = start.y;
  path.push({ x: cx, y: cy });

  while (cx !== end.x) {
    cx += cx < end.x ? 1 : -1;
    path.push({ x: cx, y: cy });
  }
  while (cy !== end.y) {
    cy += cy < end.y ? 1 : -1;
    path.push({ x: cx, y: cy });
  }
  return path;
}

function carvePath(cells: MazeCell[][], path: Point[]): void {
  for (const p of path) {
    if (cells[p.y][p.x].type === CellType.WALL) {
      cells[p.y][p.x].type = CellType.FLOOR;
      cells[p.y][p.x].visited = true;
    }
  }
}

function iterativeBacktrackFill(cells: MazeCell[][]): void {
  const width = cells[0].length;
  const height = cells.length;
  const stack: Point[] = [];

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      if (!cells[y][x].visited) {
        cells[y][x].type = CellType.FLOOR;
        cells[y][x].visited = true;
        stack.push({ x, y });

        while (stack.length > 0) {
          const current = stack[stack.length - 1];
          const unvisited: Point[] = [];
          const dirs = [
            { x: 0, y: -2 },
            { x: 2, y: 0 },
            { x: 0, y: 2 },
            { x: -2, y: 0 }
          ];

          for (const dir of dirs) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            if (
              nx > 0 &&
              nx < width - 1 &&
              ny > 0 &&
              ny < height - 1 &&
              !cells[ny][nx].visited
            ) {
              unvisited.push({ x: nx, y: ny });
            }
          }

          if (unvisited.length > 0) {
            const next = unvisited[Math.floor(Math.random() * unvisited.length)];
            const mx = (current.x + next.x) / 2;
            const my = (current.y + next.y) / 2;
            cells[my][mx].type = CellType.FLOOR;
            cells[my][mx].visited = true;
            cells[next.y][next.x].type = CellType.FLOOR;
            cells[next.y][next.x].visited = true;
            stack.push(next);
          } else {
            stack.pop();
          }
        }
      }
    }
  }
}

function addRandomBranches(cells: MazeCell[][], count: number): void {
  const width = cells[0].length;
  const height = cells.length;

  for (let i = 0; i < count; i++) {
    const x = 1 + Math.floor(Math.random() * (width - 2));
    const y = 1 + Math.floor(Math.random() * (height - 2));

    if (cells[y][x].type === CellType.WALL) {
      let hasFloorNeighbor = false;
      for (const dir of DIRS_4) {
        const nx = x + dir.x;
        const ny = y + dir.y;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && cells[ny][nx].type !== CellType.WALL) {
          hasFloorNeighbor = true;
          break;
        }
      }
      if (hasFloorNeighbor) {
        cells[y][x].type = CellType.FLOOR;
        cells[y][x].visited = true;
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

function validateMaze(cells: MazeCell[][], start: Point, end: Point): boolean {
  const path = aStarSearch(cells, start, end);
  return path !== null && path.length > 0;
}

export function generateMaze(width: number = 10, height: number = 10): MazeData {
  const startTime = performance.now();

  const MAX_RETRIES = 10;
  let cells: MazeCell[][] = createEmptyMaze(width, height);
  let startPos: Point = { x: 1, y: 1 };
  let endPos: Point = { x: width - 2, y: height - 2 };
  let pathValid = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    cells = createEmptyMaze(width, height);

    const corePath = buildPathWithAStar(cells, startPos, endPos);
    carvePath(cells, corePath);

    iterativeBacktrackFill(cells);

    addRandomBranches(cells, Math.floor(width * height * 0.15));

    pathValid = validateMaze(cells, startPos, endPos);
    if (pathValid) break;
  }

  if (!pathValid) {
    const fallbackPath = directPathFallback(startPos, endPos);
    carvePath(cells, fallbackPath);
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

  if (generationTimeMs > 500) {
    console.warn(`[MazeGenerator] 迷宫生成耗时 ${generationTimeMs.toFixed(2)}ms，超过500ms阈值`);
  } else {
    console.log(`[MazeGenerator] 迷宫生成耗时 ${generationTimeMs.toFixed(2)}ms`);
  }

  return {
    width,
    height,
    cells,
    startPos,
    endPos,
    chestPositions,
    monsterPositions,
    generationTimeMs
  };
}

export function findPath(
  cells: MazeCell[][],
  start: Point,
  end: Point
): Point[] | null {
  return aStarSearch(cells, start, end);
}
