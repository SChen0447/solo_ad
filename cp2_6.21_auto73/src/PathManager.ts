import { PathNode, Point, CellType, GRID_COLS, GRID_ROWS, CELL_SIZE, COLORS } from './types';

/**
 * PathManager - 路径管理模块
 * 
 * 职责：
 *  - 程序化生成10x15网格地图，随机放置5-8个障碍物
 *  - 使用A*寻路算法计算起点(左上)到终点(右下)的最短路径
 *  - 管理地形格子类型（empty/obstacle/path/start/end/tower）
 *  - 提供坐标转换（网格坐标 <-> 世界坐标）
 *  - 绘制路径网格、障碍物、起点终点及路径连线
 * 
 * 数据流向：
 *  - 输入：无（自包含生成逻辑）
 *  - 输出：路径点队列 -> UnitManager（单位沿路径移动）
 *        : 格子占用信息 -> GameEngine（炮塔放置合法性校验）
 *        : 渲染数据 -> GameEngine.render()
 * 
 * 调用者：GameEngine
 * 被调用：getNeighbors -> A*算法；getPathWorldPoints -> UnitManager
 */
export class PathManager {
  private grid: CellType[][] = [];
  private path: Point[] = [];
  private startPos: Point = { x: 0, y: 0 };
  private endPos: Point = { x: GRID_COLS - 1, y: GRID_ROWS - 1 };
  private pathHighlightTime: number = 0;
  private obstacleCount: number = 0;

  constructor() {
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        this.grid[y][x] = 'empty';
      }
    }
    this.grid[this.startPos.y][this.startPos.x] = 'start';
    this.grid[this.endPos.y][this.endPos.x] = 'end';
  }

  public generateMap(): Point[] {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      this.initializeGrid();
      this.placeObstacles();
      this.path = this.aStar(this.startPos, this.endPos);
      
      if (this.path.length > 0) {
        this.markPathOnGrid();
        return this.path;
      }
      attempts++;
    }

    this.initializeGrid();
    this.path = this.generateFallbackPath();
    this.markPathOnGrid();
    return this.path;
  }

  private markPathOnGrid(): void {
    for (const point of this.path) {
      if (this.grid[point.y][point.x] === 'empty') {
        this.grid[point.y][point.x] = 'path';
      }
    }
  }

  private generateFallbackPath(): Point[] {
    const path: Point[] = [];
    let x = this.startPos.x;
    let y = this.startPos.y;

    while (x < this.endPos.x) {
      path.push({ x, y });
      x++;
    }
    while (y < this.endPos.y) {
      path.push({ x, y });
      y++;
    }
    path.push({ x: this.endPos.x, y: this.endPos.y });

    return path;
  }

  private placeObstacles(): void {
    this.obstacleCount = Math.floor(Math.random() * 4) + 5;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = 100;

    while (placed < this.obstacleCount && attempts < maxAttempts) {
      attempts++;
      const x = Math.floor(Math.random() * GRID_COLS);
      const y = Math.floor(Math.random() * GRID_ROWS);

      if (this.grid[y][x] !== 'empty') continue;
      if ((x === this.startPos.x && y === this.startPos.y) ||
          (x === this.endPos.x && y === this.endPos.y)) continue;

      this.grid[y][x] = 'obstacle';

      if (this.hasPath()) {
        placed++;
      } else {
        this.grid[y][x] = 'empty';
      }
    }
  }

  private hasPath(): boolean {
    const path = this.aStar(this.startPos, this.endPos);
    return path.length > 0;
  }

  private aStar(start: Point, end: Point): Point[] {
    const openList: PathNode[] = [];
    const closedSet: Set<string> = new Set();

    const startNode: PathNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null
    };

    openList.push(startNode);

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      closedSet.add(`${current.x},${current.y}`);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(key)) continue;

        const g = current.g + 1;
        const existing = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + existing.h;
            existing.parent = current;
          }
        } else {
          openList.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h: this.heuristic(neighbor, end),
            f: g + this.heuristic(neighbor, end),
            parent: current
          });
        }
      }
    }

    return [];
  }

  private heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getNeighbors(node: PathNode): Point[] {
    const neighbors: Point[] = [];
    const directions = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];

    for (const dir of directions) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;

      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        const cellType = this.grid[ny][nx];
        if (cellType !== 'obstacle' && cellType !== 'tower') {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  private reconstructPath(endNode: PathNode): Point[] {
    const path: Point[] = [];
    let current: PathNode | null = endNode;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }

  public getPath(): Point[] {
    return this.path;
  }

  public getPathWorldPoints(): Point[] {
    return this.path.map(p => ({
      x: p.x * CELL_SIZE + CELL_SIZE / 2,
      y: p.y * CELL_SIZE + CELL_SIZE / 2
    }));
  }

  public getGrid(): CellType[][] {
    return this.grid;
  }

  public getCellType(gridX: number, gridY: number): CellType {
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return 'obstacle';
    }
    return this.grid[gridY][gridX];
  }

  public canPlaceTower(gridX: number, gridY: number): boolean {
    const cellType = this.getCellType(gridX, gridY);
    return cellType === 'empty';
  }

  public setCellType(gridX: number, gridY: number, type: CellType): void {
    if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
      this.grid[gridY][gridX] = type;
    }
  }

  public triggerPathHighlight(): void {
    this.pathHighlightTime = 0.2;
  }

  public update(deltaTime: number): void {
    if (this.pathHighlightTime > 0) {
      this.pathHighlightTime -= deltaTime;
      if (this.pathHighlightTime < 0) this.pathHighlightTime = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderGrid(ctx);
    this.renderPath(ctx);
    this.renderStartEnd(ctx);
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        if (this.grid[y][x] === 'obstacle') {
          ctx.fillStyle = COLORS.obstacle;
          ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  private renderPath(ctx: CanvasRenderingContext2D): void {
    if (this.path.length < 2) return;

    const isHighlighted = this.pathHighlightTime > 0;
    const alpha = isHighlighted ? 1 : 0.5;

    ctx.strokeStyle = isHighlighted ? COLORS.pathHighlight : COLORS.path;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    const worldPoints = this.getPathWorldPoints();
    ctx.moveTo(worldPoints[0].x, worldPoints[0].y);
    for (let i = 1; i < worldPoints.length; i++) {
      ctx.lineTo(worldPoints[i].x, worldPoints[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private renderStartEnd(ctx: CanvasRenderingContext2D): void {
    const startX = this.startPos.x * CELL_SIZE + CELL_SIZE / 2;
    const startY = this.startPos.y * CELL_SIZE + CELL_SIZE / 2;
    const endX = this.endPos.x * CELL_SIZE + CELL_SIZE / 2;
    const endY = this.endPos.y * CELL_SIZE + CELL_SIZE / 2;

    ctx.fillStyle = COLORS.start;
    ctx.fillRect(
      this.startPos.x * CELL_SIZE + 4,
      this.startPos.y * CELL_SIZE + 4,
      CELL_SIZE - 8,
      CELL_SIZE - 8
    );

    ctx.fillStyle = COLORS.end;
    ctx.fillRect(
      this.endPos.x * CELL_SIZE + 4,
      this.endPos.y * CELL_SIZE + 4,
      CELL_SIZE - 8,
      CELL_SIZE - 8
    );

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('起点', startX, startY);
    ctx.fillText('终点', endX, endY);
  }

  public getStartWorldPos(): Point {
    return {
      x: this.startPos.x * CELL_SIZE + CELL_SIZE / 2,
      y: this.startPos.y * CELL_SIZE + CELL_SIZE / 2
    };
  }

  public getEndWorldPos(): Point {
    return {
      x: this.endPos.x * CELL_SIZE + CELL_SIZE / 2,
      y: this.endPos.y * CELL_SIZE + CELL_SIZE / 2
    };
  }

  public gridToWorld(gridX: number, gridY: number): Point {
    return {
      x: gridX * CELL_SIZE + CELL_SIZE / 2,
      y: gridY * CELL_SIZE + CELL_SIZE / 2
    };
  }

  public worldToGrid(worldX: number, worldY: number): Point {
    return {
      x: Math.floor(worldX / CELL_SIZE),
      y: Math.floor(worldY / CELL_SIZE)
    };
  }
}
