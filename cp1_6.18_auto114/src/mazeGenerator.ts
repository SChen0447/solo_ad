export interface MazeCell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface MazeData {
  width: number;
  height: number;
  cells: MazeCell[][];
  keyPositions: { x: number; y: number }[];
  portalPosition: { x: number; y: number };
  startPosition: { x: number; y: number };
  generationOrder: { x: number; y: number }[];
}

export class MazeGenerator {
  public generate(minSize: number = 20, maxSize: number = 30): MazeData {
    const width = this.randomInt(minSize, maxSize);
    const height = this.randomInt(minSize, maxSize);

    const cells: MazeCell[][] = [];
    for (let y = 0; y < height; y++) {
      cells[y] = [];
      for (let x = 0; x < width; x++) {
        cells[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        };
      }
    }

    const generationOrder: { x: number; y: number }[] = [];
    const startX = Math.floor(width / 2);
    const startY = Math.floor(height / 2);
    this.recursiveBacktrack(cells, startX, startY, width, height, generationOrder);

    const keyPositions = this.placeItems(cells, width, height, 5, new Set([`${startX},${startY}`]));
    const usedPositions = new Set(keyPositions.map(p => `${p.x},${p.y}`));
    usedPositions.add(`${startX},${startY}`);
    const portalPosition = this.placeItems(cells, width, height, 1, usedPositions)[0];

    return {
      width,
      height,
      cells,
      keyPositions,
      portalPosition,
      startPosition: { x: startX, y: startY },
      generationOrder
    };
  }

  private recursiveBacktrack(
    cells: MazeCell[][],
    cx: number,
    cy: number,
    width: number,
    height: number,
    order: { x: number; y: number }[]
  ): void {
    const stack: { x: number; y: number }[] = [];
    cells[cy][cx].visited = true;
    stack.push({ x: cx, y: cy });
    order.push({ x: cx, y: cy });

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(cells, current.x, current.y, width, height);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[this.randomInt(0, neighbors.length - 1)];
        this.removeWall(cells[current.y][current.x], cells[next.y][next.x], current, next);
        cells[next.y][next.x].visited = true;
        stack.push(next);
        order.push({ x: next.x, y: next.y });
      }
    }
  }

  private getUnvisitedNeighbors(
    cells: MazeCell[][],
    x: number,
    y: number,
    width: number,
    height: number
  ): { x: number; y: number }[] {
    const neighbors: { x: number; y: number }[] = [];
    if (y > 0 && !cells[y - 1][x].visited) neighbors.push({ x, y: y - 1 });
    if (x < width - 1 && !cells[y][x + 1].visited) neighbors.push({ x: x + 1, y });
    if (y < height - 1 && !cells[y + 1][x].visited) neighbors.push({ x, y: y + 1 });
    if (x > 0 && !cells[y][x - 1].visited) neighbors.push({ x: x - 1, y });
    return neighbors;
  }

  private removeWall(
    current: MazeCell,
    next: MazeCell,
    currentPos: { x: number; y: number },
    nextPos: { x: number; y: number }
  ): void {
    const dx = nextPos.x - currentPos.x;
    const dy = nextPos.y - currentPos.y;

    if (dx === 1) {
      current.walls.right = false;
      next.walls.left = false;
    } else if (dx === -1) {
      current.walls.left = false;
      next.walls.right = false;
    } else if (dy === 1) {
      current.walls.bottom = false;
      next.walls.top = false;
    } else if (dy === -1) {
      current.walls.top = false;
      next.walls.bottom = false;
    }
  }

  private placeItems(
    cells: MazeCell[][],
    width: number,
    height: number,
    count: number,
    forbidden: Set<string>
  ): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const used = new Set(forbidden);

    let attempts = 0;
    while (positions.length < count && attempts < count * 100) {
      const x = this.randomInt(0, width - 1);
      const y = this.randomInt(0, height - 1);
      const key = `${x},${y}`;
      if (!used.has(key)) {
        used.add(key);
        positions.push({ x, y });
      }
      attempts++;
    }

    return positions;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export const mazeGenerator = new MazeGenerator();
