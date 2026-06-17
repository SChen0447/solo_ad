import { LevelManager, ElementType } from './level';

export interface PathResult {
  reachable: boolean[][];
  paths: { x: number; y: number }[][];
  shortestJumps: number;
  passRate: number;
  totalCells: number;
  reachableCells: number;
  endReachable: boolean;
}

interface BFSNode {
  x: number;
  y: number;
  jumps: number;
  parent: BFSNode | null;
}

const JUMP_HEIGHT = 3;
const MOVE_DIRECTIONS = [
  { dx: 1, dy: 0, jump: false },
  { dx: -1, dy: 0, jump: false },
  { dx: 0, dy: 1, jump: false },
  { dx: 0, dy: -1, jump: false }
];

export class PathFinder {
  private level: LevelManager;

  constructor(level: LevelManager) {
    this.level = level;
  }

  setLevel(level: LevelManager): void {
    this.level = level;
  }

  findPaths(): PathResult {
    const { width, height } = this.level.getDimensions();
    const startPos = this.level.getStartPos();
    const endPos = this.level.getEndPos();
    const collisionGrid = this.level.getCollisionGrid();
    const elements = this.level.getElements();

    const springPositions: { x: number; y: number }[] = [];
    const portalPositions: { x: number; y: number }[] = [];

    for (const elem of elements) {
      if (elem.type === ElementType.SPRING) {
        springPositions.push({ x: elem.x, y: elem.y });
      } else if (elem.type === ElementType.PORTAL) {
        portalPositions.push({ x: elem.x, y: elem.y });
      }
    }

    const reachable: boolean[][] = [];
    const jumpCount: number[][] = [];
    for (let y = 0; y < height; y++) {
      reachable[y] = [];
      jumpCount[y] = [];
      for (let x = 0; x < width; x++) {
        reachable[y][x] = false;
        jumpCount[y][x] = Infinity;
      }
    }

    const startX = Math.floor(startPos.x);
    const startY = Math.floor(startPos.y);
    const endX = Math.floor(endPos.x);
    const endY = Math.floor(endPos.y);

    const queue: BFSNode[] = [];
    const visited = new Set<string>();

    if (startX >= 0 && startX < width && startY >= 0 && startY < height && !collisionGrid[startY][startX]) {
      queue.push({ x: startX, y: startY, jumps: 0, parent: null });
      visited.add(`${startX},${startY}`);
      reachable[startY][startX] = true;
      jumpCount[startY][startX] = 0;
    }

    const allPaths: { x: number; y: number }[][] = [];
    let shortestPathToEnd: BFSNode | null = null;
    let minJumpsToEnd = Infinity;

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === endX && current.y === endY) {
        if (current.jumps < minJumpsToEnd) {
          minJumpsToEnd = current.jumps;
          shortestPathToEnd = current;
        }
        const path: { x: number; y: number }[] = [];
        let node: BFSNode | null = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        allPaths.push(path);
      }

      for (const dir of MOVE_DIRECTIONS) {
        this.expandNode(
          current,
          dir.dx,
          dir.dy,
          false,
          1,
          collisionGrid,
          width,
          height,
          queue,
          visited,
          reachable,
          jumpCount,
          springPositions,
          portalPositions
        );
      }

      for (let jumpUp = 1; jumpUp <= JUMP_HEIGHT; jumpUp++) {
        for (let jumpDist = -3; jumpDist <= 3; jumpDist++) {
          if (jumpDist === 0 && jumpUp === 0) continue;
          this.expandNode(
            current,
            jumpDist,
            -jumpUp,
            true,
            1,
            collisionGrid,
            width,
            height,
            queue,
            visited,
            reachable,
            jumpCount,
            springPositions,
            portalPositions
          );
        }
      }
    }

    const isSpring = (x: number, y: number) =>
      springPositions.some(s => s.x === x && s.y === y);

    const isPortal = (x: number, y: number) =>
      portalPositions.some(p => p.x === x && p.y === y);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (reachable[y][x]) {
          if (isSpring(x, y)) {
            for (let jumpUp = 1; jumpUp <= JUMP_HEIGHT * 2; jumpUp++) {
              for (let jumpDist = -4; jumpDist <= 4; jumpDist++) {
                const nx = x + jumpDist;
                const ny = y - jumpUp;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                    !collisionGrid[ny][nx] && !reachable[ny][nx]) {
                  reachable[ny][nx] = true;
                  jumpCount[ny][nx] = Math.min(jumpCount[ny][nx], jumpCount[y][x] + 1);
                }
              }
            }
          }
          if (isPortal(x, y) && portalPositions.length >= 2) {
            for (const portal of portalPositions) {
              if (portal.x !== x || portal.y !== y) {
                const px = portal.x;
                const py = portal.y;
                if (px >= 0 && px < width && py >= 0 && py < height &&
                    !collisionGrid[py][px] && !reachable[py][px]) {
                  reachable[py][px] = true;
                  jumpCount[py][px] = Math.min(jumpCount[py][px], jumpCount[y][x] + 1);
                  queue.push({ x: px, y: py, jumps: jumpCount[y][x] + 1, parent: null });
                }
              }
            }
          }
        }
      }
    }

    let reachableCells = 0;
    let totalPassableCells = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!collisionGrid[y][x]) {
          totalPassableCells++;
          if (reachable[y][x]) {
            reachableCells++;
          }
        }
      }
    }

    const passRate = totalPassableCells > 0
      ? Math.round((reachableCells / totalPassableCells) * 100)
      : 0;

    const endReachable = reachable[endY]?.[endX] ?? false;
    const shortestJumps = endReachable && shortestPathToEnd
      ? shortestPathToEnd.jumps
      : -1;

    return {
      reachable,
      paths: allPaths,
      shortestJumps,
      passRate,
      totalCells: totalPassableCells,
      reachableCells,
      endReachable
    };
  }

  private expandNode(
    current: BFSNode,
    dx: number,
    dy: number,
    isJump: boolean,
    jumpMultiplier: number,
    collisionGrid: boolean[][],
    width: number,
    height: number,
    queue: BFSNode[],
    visited: Set<string>,
    reachable: boolean[][],
    jumpCount: number[][],
    springPositions: { x: number; y: number }[],
    portalPositions: { x: number; y: number }[]
  ): void {
    const nx = current.x + dx;
    const ny = current.y + dy;

    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
    if (collisionGrid[ny][nx]) return;

    if (dy < 0) {
      for (let checkY = current.y - 1; checkY >= ny; checkY--) {
        if (collisionGrid[checkY]?.[nx]) return;
      }
    }

    if (dx !== 0 && dy === 0) {
      const startX = Math.min(current.x, nx);
      const endX = Math.max(current.x, nx);
      for (let checkX = startX; checkX <= endX; checkX++) {
        if (collisionGrid[current.y]?.[checkX]) return;
      }
    }

    const key = `${nx},${ny}`;
    const newJumps = current.jumps + (isJump ? 1 * jumpMultiplier : 0);

    if (!visited.has(key)) {
      visited.add(key);
      reachable[ny][nx] = true;
      jumpCount[ny][nx] = newJumps;
      queue.push({ x: nx, y: ny, jumps: newJumps, parent: current });
    } else if (newJumps < jumpCount[ny][nx]) {
      jumpCount[ny][nx] = newJumps;
      queue.push({ x: nx, y: ny, jumps: newJumps, parent: current });
    }
  }
}
