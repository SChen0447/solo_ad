export enum Terrain {
  Clearing = 0,
  Tree = 1,
  Bush = 2,
  Stone = 3,
}

export const TERRAIN_COLORS: Record<Terrain, string> = {
  [Terrain.Clearing]: '#3a5a40',
  [Terrain.Tree]: '#1b4332',
  [Terrain.Bush]: '#2d6a4f',
  [Terrain.Stone]: '#6b705c',
};

export const GRID_SIZE = 10;
export const CELL_SIZE = 32;
export const FRAGMENTS_TO_WIN = 20;

export interface SoulFragment {
  x: number;
  y: number;
  collected: boolean;
  pulsePhase: number;
}

export interface GameMap {
  grid: Terrain[][];
  fragments: SoulFragment[];
  level: number;
}

function hash(x: number, y: number, seed: number): number {
  let h = seed + x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy, seed);
  const n10 = hash(ix + 1, iy, seed);
  const n01 = hash(ix, iy + 1, seed);
  const n11 = hash(ix + 1, iy + 1, seed);
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

function fractalNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

function noiseToTerrain(noise: number): Terrain {
  if (noise < 0.25) return Terrain.Clearing;
  if (noise < 0.5) return Terrain.Tree;
  if (noise < 0.72) return Terrain.Bush;
  return Terrain.Stone;
}

export function isPassable(terrain: Terrain): boolean {
  return terrain === Terrain.Clearing || terrain === Terrain.Stone;
}

export function generateMap(level: number): GameMap {
  const seed = level * 7919 + 42;
  const grid: Terrain[][] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const noise = fractalNoise(x * 0.5, y * 0.5, seed);
      grid[y][x] = noiseToTerrain(noise);
    }
  }

  if (!isPassable(grid[0][0])) {
    grid[0][0] = Terrain.Clearing;
  }

  let passableCells: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (isPassable(grid[y][x]) && !(x === 0 && y === 0)) {
        passableCells.push({ x, y });
      }
    }
  }

  if (passableCells.length < FRAGMENTS_TO_WIN) {
    const blockedCells: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!isPassable(grid[y][x])) {
          blockedCells.push({ x, y });
        }
      }
    }
    const shuffledBlocked = blockedCells.sort(() => Math.random() - 0.5);
    const needed = FRAGMENTS_TO_WIN - passableCells.length + 2;
    for (let i = 0; i < Math.min(needed, shuffledBlocked.length); i++) {
      const cell = shuffledBlocked[i];
      grid[cell.y][cell.x] = Terrain.Clearing;
      passableCells.push(cell);
    }
  }

  const fragmentCount = FRAGMENTS_TO_WIN;
  const shuffled = passableCells.sort(() => Math.random() - 0.5);
  const fragments: SoulFragment[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    fragments.push({
      x: shuffled[i].x,
      y: shuffled[i].y,
      collected: false,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  return { grid, fragments, level };
}

export function drawMap(ctx: CanvasRenderingContext2D, gameMap: GameMap, time: number): void {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const terrain = gameMap.grid[y][x];
      ctx.fillStyle = TERRAIN_COLORS[terrain];
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      if (terrain === Terrain.Tree) {
        drawTree(ctx, x, y, time);
      } else if (terrain === Terrain.Bush) {
        drawBush(ctx, x, y);
      } else if (terrain === Terrain.Stone) {
        drawStone(ctx, x, y);
      }
    }
  }

  drawFragments(ctx, gameMap.fragments, time);
}

function drawTree(ctx: CanvasRenderingContext2D, gx: number, gy: number, time: number): void {
  const cx = gx * CELL_SIZE + CELL_SIZE / 2;
  const cy = gy * CELL_SIZE + CELL_SIZE / 2;
  const sway = Math.sin(time * 0.001 + gx * 1.5 + gy * 0.7) * 1.5;

  ctx.fillStyle = '#4a2c17';
  ctx.fillRect(cx - 2 + sway * 0.3, cy + 2, 4, 10);

  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.moveTo(cx + sway, cy - 8);
  ctx.lineTo(cx - 8 + sway * 0.5, cy + 4);
  ctx.lineTo(cx + 8 + sway * 0.5, cy + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.moveTo(cx + sway * 0.7, cy - 4);
  ctx.lineTo(cx - 6 + sway * 0.3, cy + 6);
  ctx.lineTo(cx + 6 + sway * 0.3, cy + 6);
  ctx.closePath();
  ctx.fill();
}

function drawBush(ctx: CanvasRenderingContext2D, gx: number, gy: number): void {
  const cx = gx * CELL_SIZE + CELL_SIZE / 2;
  const cy = gy * CELL_SIZE + CELL_SIZE / 2;
  ctx.fillStyle = '#1a5c3a';
  ctx.beginPath();
  ctx.arc(cx - 4, cy + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22704a';
  ctx.beginPath();
  ctx.arc(cx + 4, cy + 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e6040';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawStone(ctx: CanvasRenderingContext2D, gx: number, gy: number): void {
  const cx = gx * CELL_SIZE + CELL_SIZE / 2;
  const cy = gy * CELL_SIZE + CELL_SIZE / 2;
  ctx.fillStyle = '#8a8a7a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9a9a8a';
  ctx.beginPath();
  ctx.ellipse(cx - 2, cy, 6, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFragments(ctx: CanvasRenderingContext2D, fragments: SoulFragment[], time: number): void {
  for (const frag of fragments) {
    if (frag.collected) continue;
    const cx = frag.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = frag.y * CELL_SIZE + CELL_SIZE / 2;
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + frag.pulsePhase);
    const glowSize = 6 * pulse;

    ctx.save();
    ctx.globalAlpha = 0.3 * pulse;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(cx, cy, glowSize + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
