export interface GridCell {
  col: number;
  row: number;
  isObstacle: boolean;
  isStart: boolean;
  isEnd: boolean;
  isPath: boolean;
  highlightTimer: number;
}

export interface PathPoint {
  x: number;
  y: number;
  col: number;
  row: number;
}

interface AStarNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class PathManager {
  public readonly cols: number = 15;
  public readonly rows: number = 10;
  public readonly cellSize: number = 60;
  public grid: GridCell[][] = [];
  public pathPoints: PathPoint[] = [];
  private startCell = { col: 0, row: 0 };
  private endCell = { col: 14, row: 9 };

  constructor() {
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let row = 0; row < this.rows; row++) {
      const rowCells: GridCell[] = [];
      for (let col = 0; col < this.cols; col++) {
        rowCells.push({
          col,
          row,
          isObstacle: false,
          isStart: col === this.startCell.col && row === this.startCell.row,
          isEnd: col === this.endCell.col && row === this.endCell.row,
          isPath: false,
          highlightTimer: 0
        });
      }
      this.grid.push(rowCells);
    }
  }

  public resetAndGenerate(): void {
    this.initializeGrid();
    this.placeObstacles();
    this.calculatePath();
  }

  private placeObstacles(): void {
    const obstacleCount = 5 + Math.floor(Math.random() * 4);
    let placed = 0;
    let attempts = 0;
    const maxAttempts = 500;

    while (placed < obstacleCount && attempts < maxAttempts) {
      attempts++;
      const col = Math.floor(Math.random() * this.cols);
      const row = Math.floor(Math.random() * this.rows);
      const cell = this.grid[row][col];

      if (cell.isStart || cell.isEnd || cell.isObstacle) continue;

      if ((col <= 1 && row <= 1) || (col >= this.cols - 2 && row >= this.rows - 2)) continue;

      cell.isObstacle = true;
      if (this.validatePathExists()) {
        placed++;
      } else {
        cell.isObstacle = false;
      }
    }
  }

  private validatePathExists(): boolean {
    return this.findPath(this.startCell, this.endCell) !== null;
  }

  private calculatePath(): void {
    const path = this.findPath(this.startCell, this.endCell);
    this.pathPoints = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c].isPath = false;
      }
    }

    if (path) {
      for (const node of path) {
        this.grid[node.row][node.col].isPath = true;
        this.pathPoints.push({
          col: node.col,
          row: node.row,
          x: node.col * this.cellSize + this.cellSize / 2,
          y: node.row * this.cellSize + this.cellSize / 2
        });
      }
    }
  }

  private findPath(start: { col: number; row: number }, end: { col: number; row: number }): AStarNode[] | null {
    const openList: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
      col: start.col,
      row: start.row,
      g: 0,
      h: this.heuristic(start, end),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    const directions = [
      { dc: 0, dr: -1 },
      { dc: 1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: -1, dr: 0 }
    ];

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      if (current.col === end.col && current.row === end.row) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.col},${current.row}`);

      for (const dir of directions) {
        const newCol = current.col + dir.dc;
        const newRow = current.row + dir.dr;

        if (!this.isWithinBounds(newCol, newRow)) continue;
        if (this.grid[newRow][newCol].isObstacle) continue;

        const key = `${newCol},${newRow}`;
        if (closedSet.has(key)) continue;

        const g = current.g + 1;
        const h = this.heuristic({ col: newCol, row: newRow }, end);
        const f = g + h;

        const existingNode = openList.find(n => n.col === newCol && n.row === newRow);
        if (existingNode) {
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        } else {
          openList.push({
            col: newCol,
            row: newRow,
            g,
            h,
            f,
            parent: current
          });
        }
      }
    }

    return null;
  }

  private heuristic(a: { col: number; row: number }, b: { col: number; row: number }): number {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  }

  private reconstructPath(endNode: AStarNode): AStarNode[] {
    const path: AStarNode[] = [];
    let current: AStarNode | null = endNode;
    while (current) {
      path.unshift(current);
      current = current.parent;
    }
    return path;
  }

  public isWithinBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  public canPlaceTower(col: number, row: number): boolean {
    if (!this.isWithinBounds(col, row)) return false;
    const cell = this.grid[row][col];
    return !cell.isObstacle && !cell.isPath && !cell.isStart && !cell.isEnd;
  }

  public highlightPathCell(col: number, row: number): void {
    if (this.isWithinBounds(col, row) && this.grid[row][col].isPath) {
      this.grid[row][col].highlightTimer = 0.2;
    }
  }

  public update(dt: number): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c].highlightTimer > 0) {
          this.grid[r][c].highlightTimer -= dt;
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const x = c * this.cellSize;
        const y = r * this.cellSize;

        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        if (cell.isObstacle) {
          ctx.fillStyle = '#4B5563';
          ctx.fillRect(x + 4, y + 4, this.cellSize - 8, this.cellSize - 8);
        }

        if (cell.isStart) {
          ctx.fillStyle = '#10B981';
          ctx.fillRect(x + 6, y + 6, this.cellSize - 12, this.cellSize - 12);
        }

        if (cell.isEnd) {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(x + 6, y + 6, this.cellSize - 12, this.cellSize - 12);
        }

        if (cell.isPath && cell.highlightTimer > 0) {
          const alpha = cell.highlightTimer / 0.2;
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha * 0.6})`;
          ctx.fillRect(x, y, this.cellSize, this.cellSize);
        }
      }
    }

    if (this.pathPoints.length > 1) {
      ctx.strokeStyle = '#3B82F680';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
      for (let i = 1; i < this.pathPoints.length; i++) {
        ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
      }
      ctx.stroke();
    }
  }

  public getCellAtPixel(px: number, py: number): { col: number; row: number } | null {
    const col = Math.floor(px / this.cellSize);
    const row = Math.floor(py / this.cellSize);
    if (this.isWithinBounds(col, row)) {
      return { col, row };
    }
    return null;
  }

  public getStartPosition(): { x: number; y: number } {
    return {
      x: this.startCell.col * this.cellSize + this.cellSize / 2,
      y: this.startCell.row * this.cellSize + this.cellSize / 2
    };
  }

  public getEndPosition(): { x: number; y: number } {
    return {
      x: this.endCell.col * this.cellSize + this.cellSize / 2,
      y: this.endCell.row * this.cellSize + this.cellSize / 2
    };
  }
}
