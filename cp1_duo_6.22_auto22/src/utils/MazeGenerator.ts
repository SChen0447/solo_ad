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

function getNeighbors(cells: MazeCell[][], point: Point): Point[] {
  const neighbors: Point[] = [];
  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 }
  ];

  for (const dir of dirs) {
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

function aStar(cells: MazeCell[][], start: Point, end: Point): Point[] | null {
  const openSet = new PriorityQueue<Point>();
  const cameFrom: Map<string, Point> = new Map();
  const gScore: Map<string, number> = new Map();
  const fScore: Map<string, number> = new Map();

  const key = (p: Point) => `${p.x},${p.y}`;

  gScore.set(key(start), 0);
  fScore.set(key(start), heuristic(start, end));
  openSet.enqueue(start, fScore.get(key(start))!);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [current];
      let curr = current;
      while (cameFrom.has(key(curr))) {
        curr = cameFrom.get(key(curr))!;
        path.unshift(curr);
      }
      return path;
    }

    for (const neighbor of getNeighbors(cells, current)) {
      const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(key(neighbor)) ?? Infinity)) {
        cameFrom.set(key(neighbor), current);
        gScore.set(key(neighbor), tentativeG);
        fScore.set(key(neighbor), tentativeG + heuristic(neighbor, end));
        openSet.enqueue(neighbor, fScore.get(key(neighbor))!);
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

function recursiveBacktrack(cells: MazeCell[][], startX: number, startY: number): void {
  const stack: Point[] = [];
  cells[startY][startX].type = CellType.FLOOR;
  cells[startY][startX].visited = true;
  stack.push({ x: startX, y: startY });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: Point[] = [];
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
        nx < cells[0].length - 1 &&
        ny > 0 &&
        ny < cells.length - 1 &&
        !cells[ny][nx].visited
      ) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      const mx = (current.x + next.x) / 2;
      const my = (current.y + next.y) / 2;
      cells[my][mx].type = CellType.FLOOR;
      cells[next.y][next.x].type = CellType.FLOOR;
      cells[next.y][next.x].visited = true;
      stack.push(next);
    } else {
      stack.pop();
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
  const cells = createEmptyMaze(width, height);

  recursiveBacktrack(cells, 1, 1);

  const floorCells = getFloorCells(cells);
  const shuffled = shuffleArray(floorCells);

  let startPos: Point = { x: 1, y: 1 };
  let endPos: Point = { x: width - 2, y: height - 2 };

  let maxDist = 0;
  for (const a of shuffled.slice(0, 20)) {
    for (const b of shuffled.slice(0, 20)) {
      const d = distance(a, b);
      if (d > maxDist) {
        const path = aStar(cells, a, b);
        if (path && path.length > 0) {
          maxDist = d;
          startPos = a;
          endPos = b;
        }
      }
    }
  }

  cells[startPos.y][startPos.x].type = CellType.START;
  cells[endPos.y][endPos.x].type = CellType.END;

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

  return {
    width,
    height,
    cells,
    startPos,
    endPos,
    chestPositions,
    monsterPositions
  };
}

export function findPath(
  cells: MazeCell[][],
  start: Point,
  end: Point
): Point[] | null {
  return aStar(cells, start, end);
}
