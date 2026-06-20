export type CellType = 'empty' | 'plant' | 'carnivore' | 'decomposer' | 'dead';

export interface Cell {
  type: CellType;
  hp: number;
  hunger: number;
  age: number;
}

export const GRID_SIZE = 60;

export const createEmptyCell = (): Cell => ({
  type: 'empty',
  hp: 0,
  hunger: 0,
  age: 0,
});

export const createCell = (type: CellType, hp: number = 0): Cell => ({
  type,
  hp,
  hunger: type === 'carnivore' ? hp : 0,
  age: 0,
});

const getNeighbors = (grid: Cell[][], x: number, y: number): { x: number; y: number; cell: Cell }[] => {
  const dirs = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ];
  const result: { x: number; y: number; cell: Cell }[] = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      result.push({ x: nx, y: ny, cell: grid[ny][nx] });
    }
  }
  return result;
};

const randomChoice = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const calculateNextGeneration = (grid: Cell[][]): Cell[][] => {
  const newGrid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => createEmptyCell())
  );

  const pendingPlants: { x: number; y: number }[] = [];
  const pendingCarnivores: { x: number; y: number; hp: number }[] = [];
  const pendingDecomposers: { x: number; y: number }[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];

      if (cell.type === 'empty') {
        continue;
      }

      if (cell.type === 'dead') {
        newGrid[y][x] = { ...cell };
        continue;
      }

      const neighbors = getNeighbors(grid, x, y);
      const newCell: Cell = { ...cell, age: cell.age + 1 };

      if (cell.type === 'plant') {
        const emptyNeighbors = neighbors.filter((n) => n.cell.type === 'empty');
        if (emptyNeighbors.length > 0) {
          const target = randomChoice(emptyNeighbors);
          pendingPlants.push({ x: target.x, y: target.y });
        }
        newGrid[y][x] = newCell;
      } else if (cell.type === 'carnivore') {
        const plantNeighbors = neighbors.filter((n) => n.cell.type === 'plant');
        if (plantNeighbors.length > 0) {
          const target = randomChoice(plantNeighbors);
          newGrid[target.y][target.x] = createCell('dead', 0);
          newCell.hunger = 5;
          newCell.hp = Math.min(10, cell.hp + 1);
        } else {
          newCell.hunger = cell.hunger - 1;
          if (newCell.hunger <= 0) {
            newGrid[y][x] = createCell('dead', 0);
            continue;
          }
        }
        newGrid[y][x] = newCell;
      } else if (cell.type === 'decomposer') {
        const deadNeighbors = neighbors.filter((n) => n.cell.type === 'dead');
        if (deadNeighbors.length > 0) {
          const target = randomChoice(deadNeighbors);
          newGrid[target.y][target.x] = createCell('decomposer', 0);
          pendingDecomposers.push({ x: target.x, y: target.y });
        } else {
          if (cell.age > 0 && cell.age % 10 === 0 && Math.random() < 0.1) {
            const mutateType: CellType = Math.random() < 0.5 ? 'plant' : 'carnivore';
            if (mutateType === 'carnivore') {
              pendingCarnivores.push({ x, y, hp: 5 });
            } else {
              pendingPlants.push({ x, y });
            }
            continue;
          }
        }
        newGrid[y][x] = newCell;
      }
    }
  }

  for (const p of pendingPlants) {
    if (newGrid[p.y][p.x].type === 'empty') {
      newGrid[p.y][p.x] = createCell('plant', 0);
    }
  }
  for (const c of pendingCarnivores) {
    if (newGrid[c.y][c.x].type === 'empty' || newGrid[c.y][c.x].type === 'decomposer') {
      newGrid[c.y][c.x] = createCell('carnivore', c.hp);
    }
  }
  for (const d of pendingDecomposers) {
    if (newGrid[d.y][d.x].type === 'dead') {
      newGrid[d.y][d.x] = createCell('decomposer', 0);
    }
  }

  return newGrid;
};

export const countSpecies = (grid: Cell[][]): { plant: number; carnivore: number; decomposer: number; dead: number } => {
  let plant = 0;
  let carnivore = 0;
  let decomposer = 0;
  let dead = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const t = grid[y][x].type;
      if (t === 'plant') plant++;
      else if (t === 'carnivore') carnivore++;
      else if (t === 'decomposer') decomposer++;
      else if (t === 'dead') dead++;
    }
  }

  return { plant, carnivore, decomposer, dead };
};

export const createEmptyGrid = (): Cell[][] => {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => createEmptyCell())
  );
};
