import { Level, CellType, GRID_WIDTH, GRID_HEIGHT, Vec2 } from './types';

const W: CellType = 'WALL';
const F: CellType = 'FLOOR';

function createEmptyGrid(): CellType[][] {
  const grid: CellType[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
        grid[y][x] = W;
      } else {
        grid[y][x] = F;
      }
    }
  }
  return grid;
}

function addWall(grid: CellType[][], x1: number, y1: number, x2: number, y2: number): void {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        grid[y][x] = W;
      }
    }
  }
}

function randomFloorCells(grid: CellType[][], count: number, exclude: Vec2[] = []): Vec2[] {
  const cells: Vec2[] = [];
  const floorCells: Vec2[] = [];
  for (let y = 1; y < GRID_HEIGHT - 1; y++) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      if (grid[y][x] === F) {
        const isExcluded = exclude.some(e => e.x === x && e.y === y);
        if (!isExcluded) {
          floorCells.push({ x, y });
        }
      }
    }
  }
  for (let i = 0; i < count && floorCells.length > 0; i++) {
    const idx = Math.floor(Math.random() * floorCells.length);
    cells.push(floorCells[idx]);
    floorCells.splice(idx, 1);
  }
  return cells;
}

function createLevel1(): Level {
  const grid = createEmptyGrid();
  addWall(grid, 4, 1, 4, 8);
  addWall(grid, 4, 8, 8, 8);
  addWall(grid, 8, 4, 8, 12);
  addWall(grid, 12, 1, 12, 10);
  addWall(grid, 1, 12, 10, 12);
  addWall(grid, 14, 6, 18, 6);
  addWall(grid, 14, 14, 14, 18);
  addWall(grid, 4, 15, 10, 15);
  addWall(grid, 2, 4, 2, 4);
  addWall(grid, 16, 10, 16, 13);
  const entrance: Vec2 = { x: 1, y: 1 };
  const exit: Vec2 = { x: 18, y: 18 };
  grid[entrance.y][entrance.x] = 'ENTRANCE';
  grid[exit.y][exit.x] = 'EXIT';
  const guardPaths: Vec2[][] = [
    [
      { x: 6, y: 3 },
      { x: 6, y: 6 },
      { x: 10, y: 6 },
      { x: 10, y: 3 },
    ],
    [
      { x: 15, y: 8 },
      { x: 15, y: 15 },
      { x: 6, y: 17 },
      { x: 6, y: 14 },
    ],
  ];
  const coinPositions = randomFloorCells(grid, 5, [entrance, exit]);
  return { id: 1, grid, entrance, exit, guardPaths, coinPositions };
}

function createLevel2(): Level {
  const grid = createEmptyGrid();
  addWall(grid, 2, 2, 6, 2);
  addWall(grid, 6, 2, 6, 6);
  addWall(grid, 6, 6, 10, 6);
  addWall(grid, 10, 3, 10, 10);
  addWall(grid, 10, 10, 15, 10);
  addWall(grid, 15, 3, 15, 10);
  addWall(grid, 3, 8, 3, 14);
  addWall(grid, 3, 14, 8, 14);
  addWall(grid, 8, 11, 8, 18);
  addWall(grid, 12, 13, 17, 13);
  addWall(grid, 12, 13, 12, 17);
  addWall(grid, 17, 2, 17, 5);
  const entrance: Vec2 = { x: 1, y: 1 };
  const exit: Vec2 = { x: 18, y: 18 };
  grid[entrance.y][entrance.x] = 'ENTRANCE';
  grid[exit.y][exit.x] = 'EXIT';
  const guardPaths: Vec2[][] = [
    [
      { x: 4, y: 4 },
      { x: 8, y: 4 },
      { x: 8, y: 8 },
      { x: 4, y: 8 },
    ],
    [
      { x: 13, y: 5 },
      { x: 13, y: 8 },
      { x: 16, y: 8 },
      { x: 16, y: 5 },
    ],
    [
      { x: 5, y: 16 },
      { x: 10, y: 16 },
      { x: 10, y: 12 },
      { x: 5, y: 12 },
    ],
  ];
  const coinPositions = randomFloorCells(grid, 5, [entrance, exit]);
  return { id: 2, grid, entrance, exit, guardPaths, coinPositions };
}

function createLevel3(): Level {
  const grid = createEmptyGrid();
  addWall(grid, 5, 1, 5, 10);
  addWall(grid, 5, 10, 10, 10);
  addWall(grid, 10, 5, 10, 10);
  addWall(grid, 10, 5, 14, 5);
  addWall(grid, 14, 5, 14, 14);
  addWall(grid, 2, 5, 2, 5);
  addWall(grid, 2, 7, 2, 15);
  addWall(grid, 2, 15, 5, 15);
  addWall(grid, 5, 13, 5, 18);
  addWall(grid, 8, 15, 12, 15);
  addWall(grid, 12, 15, 12, 18);
  addWall(grid, 16, 2, 16, 8);
  addWall(grid, 16, 12, 16, 16);
  addWall(grid, 16, 16, 18, 16);
  addWall(grid, 7, 2, 7, 2);
  addWall(grid, 12, 2, 12, 3);
  const entrance: Vec2 = { x: 1, y: 18 };
  const exit: Vec2 = { x: 18, y: 1 };
  grid[entrance.y][entrance.x] = 'ENTRANCE';
  grid[exit.y][exit.x] = 'EXIT';
  const guardPaths: Vec2[][] = [
    [
      { x: 3, y: 3 },
      { x: 3, y: 6 },
      { x: 8, y: 6 },
      { x: 8, y: 3 },
    ],
    [
      { x: 7, y: 12 },
      { x: 7, y: 17 },
      { x: 11, y: 17 },
      { x: 11, y: 12 },
    ],
    [
      { x: 15, y: 7 },
      { x: 15, y: 11 },
      { x: 17, y: 11 },
      { x: 17, y: 7 },
    ],
  ];
  const coinPositions = randomFloorCells(grid, 5, [entrance, exit]);
  return { id: 3, grid, entrance, exit, guardPaths, coinPositions };
}

function createLevel4(): Level {
  const grid = createEmptyGrid();
  addWall(grid, 3, 1, 3, 5);
  addWall(grid, 3, 5, 7, 5);
  addWall(grid, 7, 1, 7, 9);
  addWall(grid, 7, 9, 12, 9);
  addWall(grid, 12, 5, 12, 9);
  addWall(grid, 12, 5, 16, 5);
  addWall(grid, 16, 1, 16, 9);
  addWall(grid, 2, 9, 2, 14);
  addWall(grid, 2, 14, 9, 14);
  addWall(grid, 9, 11, 9, 14);
  addWall(grid, 9, 11, 14, 11);
  addWall(grid, 14, 11, 14, 16);
  addWall(grid, 4, 17, 10, 17);
  addWall(grid, 4, 17, 4, 18);
  addWall(grid, 16, 12, 16, 18);
  addWall(grid, 11, 17, 15, 17);
  addWall(grid, 2, 2, 2, 2);
  const entrance: Vec2 = { x: 1, y: 1 };
  const exit: Vec2 = { x: 18, y: 18 };
  grid[entrance.y][entrance.x] = 'ENTRANCE';
  grid[exit.y][exit.x] = 'EXIT';
  const guardPaths: Vec2[][] = [
    [
      { x: 5, y: 2 },
      { x: 5, y: 4 },
      { x: 10, y: 4 },
      { x: 10, y: 2 },
    ],
    [
      { x: 14, y: 3 },
      { x: 14, y: 7 },
      { x: 17, y: 7 },
      { x: 17, y: 3 },
    ],
    [
      { x: 4, y: 11 },
      { x: 4, y: 13 },
      { x: 7, y: 13 },
      { x: 7, y: 11 },
    ],
    [
      { x: 15, y: 14 },
      { x: 15, y: 17 },
      { x: 12, y: 17 },
      { x: 12, y: 14 },
    ],
  ];
  const coinPositions = randomFloorCells(grid, 5, [entrance, exit]);
  return { id: 4, grid, entrance, exit, guardPaths, coinPositions };
}

function createLevel5(): Level {
  const grid = createEmptyGrid();
  addWall(grid, 2, 2, 8, 2);
  addWall(grid, 8, 2, 8, 8);
  addWall(grid, 4, 5, 8, 5);
  addWall(grid, 4, 5, 4, 12);
  addWall(grid, 4, 12, 8, 12);
  addWall(grid, 8, 8, 12, 8);
  addWall(grid, 12, 4, 12, 8);
  addWall(grid, 12, 4, 16, 4);
  addWall(grid, 16, 4, 16, 10);
  addWall(grid, 12, 10, 16, 10);
  addWall(grid, 10, 12, 10, 17);
  addWall(grid, 10, 12, 14, 12);
  addWall(grid, 14, 12, 14, 15);
  addWall(grid, 2, 15, 6, 15);
  addWall(grid, 6, 15, 6, 18);
  addWall(grid, 16, 13, 18, 13);
  addWall(grid, 16, 16, 18, 16);
  addWall(grid, 2, 8, 2, 10);
  addWall(grid, 14, 2, 14, 2);
  const entrance: Vec2 = { x: 18, y: 1 };
  const exit: Vec2 = { x: 1, y: 18 };
  grid[entrance.y][entrance.x] = 'ENTRANCE';
  grid[exit.y][exit.x] = 'EXIT';
  const guardPaths: Vec2[][] = [
    [
      { x: 5, y: 4 },
      { x: 6, y: 7 },
      { x: 10, y: 7 },
      { x: 10, y: 4 },
    ],
    [
      { x: 13, y: 6 },
      { x: 13, y: 9 },
      { x: 15, y: 9 },
      { x: 15, y: 6 },
    ],
    [
      { x: 6, y: 9 },
      { x: 6, y: 11 },
      { x: 9, y: 11 },
      { x: 9, y: 9 },
    ],
    [
      { x: 12, y: 14 },
      { x: 12, y: 16 },
      { x: 15, y: 16 },
      { x: 15, y: 14 },
    ],
    [
      { x: 3, y: 16 },
      { x: 3, y: 17 },
      { x: 5, y: 17 },
      { x: 5, y: 16 },
    ],
  ];
  const coinPositions = randomFloorCells(grid, 5, [entrance, exit]);
  return { id: 5, grid, entrance, exit, guardPaths, coinPositions };
}

export const LEVELS: Level[] = [
  createLevel1(),
  createLevel2(),
  createLevel3(),
  createLevel4(),
  createLevel5(),
];

export function getLevel(id: number): Level {
  const idx = Math.max(0, Math.min(id - 1, LEVELS.length - 1));
  return LEVELS[idx];
}
