export interface Cell {
  emoji: string | null;
  isAnimating: boolean;
}

export type Grid = Cell[][];

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellWithEmoji extends CellPosition {
  emoji: string;
}

const EMOJIS: string[] = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵',
  '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝',
  '🍅', '🥑', '🍆', '🥕', '🌽'
];

export function createGrid(size: number): Grid {
  const grid: Grid = [];
  for (let row = 0; row < size; row++) {
    const rowCells: Cell[] = [];
    for (let col = 0; col < size; col++) {
      rowCells.push({
        emoji: null,
        isAnimating: false
      });
    }
    grid.push(rowCells);
  }
  return grid;
}

export function getCell(grid: Grid, row: number, col: number): Cell | null {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
    return null;
  }
  return grid[row][col];
}

export function setCell(grid: Grid, row: number, col: number, emoji: string): void {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col].emoji = emoji;
  }
}

export function clearCell(grid: Grid, row: number, col: number): void {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col].emoji = null;
  }
}

export function setCellAnimating(grid: Grid, row: number, col: number, isAnimating: boolean): void {
  if (row >= 0 && row < grid.length && col >= 0 && col < grid[0].length) {
    grid[row][col].isAnimating = isAnimating;
  }
}

export function getRandomEmoji(): string {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

export function getRandomEmojiDifferentFrom(exclude: string): string {
  let emoji = getRandomEmoji();
  let attempts = 0;
  while (emoji === exclude && attempts < 10) {
    emoji = getRandomEmoji();
    attempts++;
  }
  return emoji;
}

export function fillCellRandom(grid: Grid, row: number, col: number): string {
  const emoji = getRandomEmoji();
  setCell(grid, row, col, emoji);
  return emoji;
}

export function refillCellRandom(grid: Grid, row: number, col: number): string {
  const cell = getCell(grid, row, col);
  const currentEmoji = cell?.emoji ?? '';
  const newEmoji = getRandomEmojiDifferentFrom(currentEmoji);
  setCell(grid, row, col, newEmoji);
  return newEmoji;
}

export function getConnectedEmptyCells(grid: Grid, startRow: number, startCol: number): CellPosition[] {
  const result: CellPosition[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  
  const startCell = getCell(grid, startRow, startCol);
  if (!startCell || startCell.emoji !== null) {
    return result;
  }
  
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: CellPosition[] = [{ row: startRow, col: startCol }];
  visited[startRow][startCol] = true;
  
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    
    for (const dir of directions) {
      const newRow = current.row + dir.row;
      const newCol = current.col + dir.col;
      
      if (
        newRow >= 0 && newRow < rows &&
        newCol >= 0 && newCol < cols &&
        !visited[newRow][newCol]
      ) {
        const cell = grid[newRow][newCol];
        if (cell.emoji === null) {
          visited[newRow][newCol] = true;
          queue.push({ row: newRow, col: newCol });
        }
      }
    }
  }
  
  return result;
}

export function getEmptyCellsInBfsOrder(grid: Grid, startRow: number, startCol: number): CellPosition[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const result: CellPosition[] = [];
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: CellPosition[] = [];
  
  const startCell = getCell(grid, startRow, startCol);
  if (!startCell || startCell.emoji !== null) {
    return result;
  }
  
  queue.push({ row: startRow, col: startCol });
  visited[startRow][startCol] = true;
  
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    
    for (const dir of directions) {
      const newRow = current.row + dir.row;
      const newCol = current.col + dir.col;
      
      if (
        newRow >= 0 && newRow < rows &&
        newCol >= 0 && newCol < cols &&
        !visited[newRow][newCol]
      ) {
        const cell = grid[newRow][newCol];
        if (cell.emoji === null) {
          visited[newRow][newCol] = true;
          queue.push({ row: newRow, col: newCol });
        }
      }
    }
  }
  
  return result;
}

export function getEmptyCellsByBfsLayers(grid: Grid, startRow: number, startCol: number): CellPosition[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const layers: CellPosition[][] = [];
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: { pos: CellPosition; distance: number }[] = [];
  
  const startCell = getCell(grid, startRow, startCol);
  if (!startCell || startCell.emoji !== null) {
    return layers;
  }
  
  queue.push({ pos: { row: startRow, col: startCol }, distance: 0 });
  visited[startRow][startCol] = true;
  
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];
  
  while (queue.length > 0) {
    const { pos, distance } = queue.shift()!;
    
    if (distance >= layers.length) {
      layers.push([]);
    }
    layers[distance].push(pos);
    
    for (const dir of directions) {
      const newRow = pos.row + dir.row;
      const newCol = pos.col + dir.col;
      
      if (
        newRow >= 0 && newRow < rows &&
        newCol >= 0 && newCol < cols &&
        !visited[newRow][newCol]
      ) {
        const cell = grid[newRow][newCol];
        if (cell.emoji === null) {
          visited[newRow][newCol] = true;
          queue.push({ pos: { row: newRow, col: newCol }, distance: distance + 1 });
        }
      }
    }
  }
  
  return layers;
}

export function getAllEmptyCells(grid: Grid): CellPosition[] {
  const result: CellPosition[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col].emoji === null) {
        result.push({ row, col });
      }
    }
  }
  return result;
}

export function generateRowByRowFillData(grid: Grid): CellWithEmoji[][] {
  const rows: CellWithEmoji[][] = [];
  
  for (let row = 0; row < grid.length; row++) {
    const rowData: CellWithEmoji[] = [];
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col].emoji === null) {
        rowData.push({
          row,
          col,
          emoji: getRandomEmoji()
        });
      }
    }
    if (rowData.length > 0) {
      rows.push(rowData);
    }
  }
  
  return rows;
}

export function getGridSize(grid: Grid): { rows: number; cols: number } {
  return {
    rows: grid.length,
    cols: grid[0]?.length ?? 0
  };
}

export function countFilledCells(grid: Grid): number {
  let count = 0;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col].emoji !== null) {
        count++;
      }
    }
  }
  return count;
}

export function clearGrid(grid: Grid): void {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      grid[row][col].emoji = null;
      grid[row][col].isAnimating = false;
    }
  }
}
