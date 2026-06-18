import { GridData, CellType, CELL_SIZE, getCell, gridToPixel } from './utils';

export interface PathPoint {
  x: number;
  y: number;
}

export type SimulationResult = 'reached_finish' | 'hit_spike' | 'out_of_bounds' | 'timeout' | 'no_player';

export interface SimulationOutput {
  path: PathPoint[];
  result: SimulationResult;
  resultMessage: string;
}

const GRAVITY = 0.45;
const INITIAL_VX = 3.0;
const INITIAL_VY = -6.0;
const WALK_SPEED = 2.5;
const PATH_SAMPLE_INTERVAL = 60;
const MAX_SIMULATION_MS = 2000;
const PLAYER_HALF = CELL_SIZE * 0.35;
const FIXED_DT = 1000 / 60;

function isSolid(grid: GridData, col: number, row: number): boolean {
  const cell = getCell(grid, col, row);
  return cell === CellType.Ground;
}

function checkPlayerCollision(
  px: number,
  py: number,
  grid: GridData
): { hitGround: boolean; hitSpike: boolean; hitFinish: boolean; onGround: boolean } {
  const left = px - PLAYER_HALF;
  const right = px + PLAYER_HALF;
  const top = py - PLAYER_HALF;
  const bottom = py + PLAYER_HALF;

  const minCol = Math.floor(left / CELL_SIZE);
  const maxCol = Math.floor(right / CELL_SIZE);
  const minRow = Math.floor(top / CELL_SIZE);
  const maxRow = Math.floor(bottom / CELL_SIZE);

  let hitGround = false;
  let hitSpike = false;
  let hitFinish = false;
  let onGround = false;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = getCell(grid, c, r);
      if (cell === CellType.Ground) hitGround = true;
      if (cell === CellType.Spike) hitSpike = true;
      if (cell === CellType.Finish) hitFinish = true;
    }
  }

  if (!hitGround) {
    const feetY = py + PLAYER_HALF + 1;
    const feetRow = Math.floor(feetY / CELL_SIZE);
    const centerCol = Math.floor(px / CELL_SIZE);
    if (isSolid(grid, centerCol, feetRow)) {
      onGround = true;
    }
  }

  return { hitGround, hitSpike, hitFinish, onGround };
}

function resolveVerticalCollision(
  px: number,
  py: number,
  vy: number,
  grid: GridData
): { y: number; vy: number; landed: boolean } {
  if (vy > 0) {
    const feetY = py + PLAYER_HALF;
    const footRow = Math.floor(feetY / CELL_SIZE);
    const centerCol = Math.floor(px / CELL_SIZE);

    if (isSolid(grid, centerCol, footRow)) {
      const groundTop = footRow * CELL_SIZE;
      return { y: groundTop - PLAYER_HALF, vy: 0, landed: true };
    }
  }

  if (vy < 0) {
    const headY = py - PLAYER_HALF;
    const headRow = Math.floor(headY / CELL_SIZE);
    const centerCol = Math.floor(px / CELL_SIZE);

    if (isSolid(grid, centerCol, headRow)) {
      const groundBottom = (headRow + 1) * CELL_SIZE;
      return { y: groundBottom + PLAYER_HALF, vy: 0, landed: false };
    }
  }

  return { y: py, vy, landed: false };
}

function resolveHorizontalCollision(
  px: number,
  py: number,
  vx: number,
  grid: GridData
): { x: number; vx: number; blocked: boolean } {
  if (vx > 0) {
    const rightX = px + PLAYER_HALF;
    const rightCol = Math.floor(rightX / CELL_SIZE);
    const centerRow = Math.floor(py / CELL_SIZE);

    if (isSolid(grid, rightCol, centerRow)) {
      const wallLeft = rightCol * CELL_SIZE;
      return { x: wallLeft - PLAYER_HALF, vx: 0, blocked: true };
    }
  }

  if (vx < 0) {
    const leftX = px - PLAYER_HALF;
    const leftCol = Math.floor(leftX / CELL_SIZE);
    const centerRow = Math.floor(py / CELL_SIZE);

    if (isSolid(grid, leftCol, centerRow)) {
      const wallRight = (leftCol + 1) * CELL_SIZE;
      return { x: wallRight + PLAYER_HALF, vx: 0, blocked: true };
    }
  }

  return { x: px, vx, blocked: false };
}

export function runSimulation(grid: GridData): Promise<SimulationOutput> {
  return new Promise((resolve) => {
    const playerPos = findPlayerStart(grid);
    if (!playerPos) {
      resolve({
        path: [],
        result: 'no_player',
        resultMessage: '请先放置玩家起点',
      });
      return;
    }

    const startPixel = gridToPixel(playerPos.col, playerPos.row);
    let px = startPixel.x;
    let py = startPixel.y;
    let vx = INITIAL_VX;
    let vy = INITIAL_VY;
    let isWalking = false;
    let lastSampleTime = 0;
    let elapsed = 0;

    const path: PathPoint[] = [{ x: px, y: py }];
    let result: SimulationResult = 'timeout';
    let resolved = false;

    let rafId: number;
    let lastFrameTime = performance.now();

    function step() {
      if (resolved) return;

      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;
      elapsed += frameTime;

      if (elapsed >= MAX_SIMULATION_MS) {
        result = 'timeout';
        resolved = true;
        resolve({
          path,
          result,
          resultMessage: '模拟完成-超时未到达终点',
        });
        return;
      }

      const steps = Math.max(1, Math.floor(frameTime / FIXED_DT));
      for (let i = 0; i < steps; i++) {
        if (resolved) break;

        if (isWalking) {
          vx = WALK_SPEED;
          vy = 0;

          px += vx;
          const hResult = resolveHorizontalCollision(px, py, vx, grid);
          px = hResult.x;
          vx = hResult.vx;

          if (hResult.blocked) {
            result = 'out_of_bounds';
            resolved = true;
            if (elapsed - lastSampleTime >= PATH_SAMPLE_INTERVAL || path.length === 0) {
              path.push({ x: px, y: py });
              lastSampleTime = elapsed;
            }
            resolve({
              path,
              result,
              resultMessage: '模拟完成-碰到墙壁',
            });
            return;
          }

          const feetY = py + PLAYER_HALF + 2;
          const feetRow = Math.floor(feetY / CELL_SIZE);
          const centerCol = Math.floor(px / CELL_SIZE);
          if (!isSolid(grid, centerCol, feetRow)) {
            isWalking = false;
            vy = 0;
          }
        } else {
          vy += GRAVITY;

          py += vy;
          const vResult = resolveVerticalCollision(px, py, vy, grid);
          py = vResult.y;
          vy = vResult.vy;

          if (vResult.landed) {
            isWalking = true;
            vx = WALK_SPEED;
          }

          px += vx;
          const hResult = resolveHorizontalCollision(px, py, vx, grid);
          px = hResult.x;
          if (hResult.blocked) {
            vx = 0;
          }
        }

        const col = Math.floor(px / CELL_SIZE);
        const row = Math.floor(py / CELL_SIZE);
        if (col < -1 || col >= grid.cols + 1 || row < -1 || row >= grid.rows + 1) {
          result = 'out_of_bounds';
          resolved = true;
          path.push({ x: px, y: py });
          resolve({
            path,
            result,
            resultMessage: '模拟完成-超出边界',
          });
          return;
        }

        const collision = checkPlayerCollision(px, py, grid);

        if (collision.hitSpike) {
          result = 'hit_spike';
          resolved = true;
          path.push({ x: px, y: py });
          resolve({
            path,
            result,
            resultMessage: '模拟完成-经过尖刺',
          });
          return;
        }

        if (collision.hitFinish) {
          result = 'reached_finish';
          resolved = true;
          path.push({ x: px, y: py });
          resolve({
            path,
            result,
            resultMessage: '模拟完成-到达终点',
          });
          return;
        }
      }

      if (elapsed - lastSampleTime >= PATH_SAMPLE_INTERVAL) {
        path.push({ x: px, y: py });
        lastSampleTime = elapsed;
      }

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cancelAnimationFrame(rafId);
        result = 'timeout';
        resolve({
          path,
          result,
          resultMessage: '模拟完成-超时未到达终点',
        });
      }
    }, MAX_SIMULATION_MS + 50);
  });
}

function findPlayerStart(grid: GridData): { col: number; row: number } | null {
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (grid.cells[row * grid.cols + col] === CellType.Player) {
        return { col, row };
      }
    }
  }
  return null;
}
