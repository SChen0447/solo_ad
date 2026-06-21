import { Grid, Position, CollisionResult, FragmentState, CONFIG } from './types';
import { Fragment } from './Fragment';

export class CollisionSystem {
  private playerRadius: number;
  private collectDistance: number;

  constructor() {
    this.playerRadius = CONFIG.PLAYER_RADIUS;
    this.collectDistance = CONFIG.FRAGMENT_COLLECT_DISTANCE;
  }

  public checkCollision(
    playerPos: Position,
    grid: Grid,
    fragments: Fragment[],
    cellSize: number,
    mazeOffsetX: number,
    mazeOffsetY: number
  ): CollisionResult {
    const result: CollisionResult = {
      wallHit: false,
      collectedFragment: null,
    };

    result.wallHit = this.checkWallCollision(playerPos.x, playerPos.y, grid, cellSize, mazeOffsetX, mazeOffsetY);
    result.collectedFragment = this.checkFragmentCollision(playerPos, fragments, cellSize, mazeOffsetX, mazeOffsetY);

    return result;
  }

  public checkWallCollision(
    x: number,
    y: number,
    grid: Grid,
    cellSize: number,
    mazeOffsetX: number,
    mazeOffsetY: number
  ): boolean {
    const checkPoints = [
      { dx: -this.playerRadius + 2, dy: 0 },
      { dx: this.playerRadius - 2, dy: 0 },
      { dx: 0, dy: -this.playerRadius + 2 },
      { dx: 0, dy: this.playerRadius - 2 },
      { dx: -this.playerRadius * 0.7, dy: -this.playerRadius * 0.7 },
      { dx: this.playerRadius * 0.7, dy: -this.playerRadius * 0.7 },
      { dx: -this.playerRadius * 0.7, dy: this.playerRadius * 0.7 },
      { dx: this.playerRadius * 0.7, dy: this.playerRadius * 0.7 },
    ];

    for (const point of checkPoints) {
      const px = x + point.dx - mazeOffsetX;
      const py = y + point.dy - mazeOffsetY;

      const gridX = Math.floor(px / cellSize);
      const gridY = Math.floor(py / cellSize);

      if (gridX < 0 || gridX >= grid[0].length || gridY < 0 || gridY >= grid.length) {
        return true;
      }

      if (grid[gridY][gridX] === 1) {
        return true;
      }
    }

    return false;
  }

  private checkFragmentCollision(
    playerPos: Position,
    fragments: Fragment[],
    cellSize: number,
    mazeOffsetX: number,
    mazeOffsetY: number
  ): FragmentState | null {
    for (const fragment of fragments) {
      if (fragment.isCollected() || fragment.isDisappearing()) {
        continue;
      }

      const fragPos = fragment.getWorldPosition(cellSize, mazeOffsetX, mazeOffsetY);
      const dx = playerPos.x - fragPos.x;
      const dy = playerPos.y - fragPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.collectDistance) {
        return fragment.getState();
      }
    }

    return null;
  }

  public resolveWallCollision(
    playerPos: Position,
    prevPos: Position,
    grid: Grid,
    cellSize: number,
    mazeOffsetX: number,
    mazeOffsetY: number
  ): { x: number; y: number; stopX: boolean; stopY: boolean } {
    let newX = playerPos.x;
    let newY = playerPos.y;
    let stopX = false;
    let stopY = false;

    if (this.checkWallCollision(playerPos.x, prevPos.y, grid, cellSize, mazeOffsetX, mazeOffsetY)) {
      newX = prevPos.x;
      stopX = true;
    }

    if (this.checkWallCollision(prevPos.x, playerPos.y, grid, cellSize, mazeOffsetX, mazeOffsetY)) {
      newY = prevPos.y;
      stopY = true;
    }

    if (this.checkWallCollision(newX, newY, grid, cellSize, mazeOffsetX, mazeOffsetY)) {
      newX = prevPos.x;
      newY = prevPos.y;
      stopX = true;
      stopY = true;
    }

    return { x: newX, y: newY, stopX, stopY };
  }
}
