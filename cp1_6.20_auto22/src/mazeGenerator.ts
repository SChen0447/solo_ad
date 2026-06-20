export type MazeData = number[][];

interface Cell {
  row: number;
  col: number;
}

export function generateMaze(rows: number, cols: number): MazeData {
  const gridRows = 2 * rows + 1;
  const gridCols = 2 * cols + 1;
  const grid: MazeData = [];

  for (let r = 0; r < gridRows; r++) {
    grid[r] = [];
    for (let c = 0; c < gridCols; c++) {
      grid[r][c] = 1;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[2 * r + 1][2 * c + 1] = 0;
    }
  }

  const visited: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    visited[r] = [];
    for (let c = 0; c < cols; c++) {
      visited[r][c] = false;
    }
  }

  const directions: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const stack: Cell[] = [];
  const startRow = 0;
  const startCol = 0;
  visited[startRow][startCol] = true;
  stack.push({ row: startRow, col: startCol });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = shuffle(directions)
      .map(([dr, dc]) => ({
        row: current.row + dr,
        col: current.col + dc,
        dr,
        dc,
      }))
      .filter(
        (n) =>
          n.row >= 0 &&
          n.row < rows &&
          n.col >= 0 &&
          n.col < cols &&
          !visited[n.row][n.col]
      );

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[0];
      visited[next.row][next.col] = true;
      const wallR = 2 * current.row + 1 + next.dr;
      const wallC = 2 * current.col + 1 + next.dc;
      grid[wallR][wallC] = 0;
      stack.push({ row: next.row, col: next.col });
    }
  }

  const extraPassages = Math.floor(rows * cols * 0.1);
  let opened = 0;
  let attempts = 0;
  while (opened < extraPassages && attempts < extraPassages * 10) {
    attempts++;
    const r = 1 + Math.floor(Math.random() * (gridRows - 2));
    const c = 1 + Math.floor(Math.random() * (gridCols - 2));
    if (grid[r][c] === 1) {
      const hasVerticalPassage =
        r > 0 && r < gridRows - 1 && grid[r - 1][c] === 0 && grid[r + 1][c] === 0;
      const hasHorizontalPassage =
        c > 0 && c < gridCols - 1 && grid[r][c - 1] === 0 && grid[r][c + 1] === 0;
      if (hasVerticalPassage || hasHorizontalPassage) {
        grid[r][c] = 0;
        opened++;
      }
    }
  }

  return grid;
}

export function getWorldPosition(
  gridRow: number,
  gridCol: number,
  cellSize: number
): { x: number; z: number } {
  return {
    x: gridCol * cellSize,
    z: gridRow * cellSize,
  };
}

export function findPassablePosition(
  maze: MazeData,
  preferRow?: number,
  preferCol?: number
): { row: number; col: number } {
  const rows = maze.length;
  const cols = maze[0].length;

  if (preferRow !== undefined && preferCol !== undefined) {
    for (let dr = 0; dr < Math.max(rows, cols); dr++) {
      for (const [dy, dx] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ]) {
        const r = preferRow + dy * dr;
        const c = preferCol + dx * dr;
        if (r >= 0 && r < rows && c >= 0 && c < cols && maze[r][c] === 0) {
          return { row: r, col: c };
        }
      }
    }
  }

  const passable: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (maze[r][c] === 0) {
        passable.push({ row: r, col: c });
      }
    }
  }
  return passable[Math.floor(Math.random() * passable.length)];
}
