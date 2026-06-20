export const GRID_SIZE = 30;
export const CELL_SIZE = 40;
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

export const TERRAIN_COLORS: Record<string, string> = {
  sand: '#f4e4c1',
  grass: '#6aab5e',
  rock: '#7a7a7a',
  shallowWater: '#4a9eff',
};

export const TOWER_COLORS: Record<number, string> = {
  1: '#ff6347',
  2: '#ffd700',
  3: '#00ffff',
};

export const RESOURCE_COLORS: Record<string, string> = {
  wood: '#cd853f',
  stone: '#808080',
  crystal: '#00bfff',
};

export type TerrainType = 'sand' | 'grass' | 'rock' | 'shallowWater';

export interface Point {
  x: number;
  y: number;
}

const PERM: number[] = [];
const GRAD: Point[] = [
  { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

function initNoise(seed: number) {
  for (let i = 0; i < 256; i++) PERM[i] = i;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = seed % (i + 1);
    [PERM[i], PERM[j]] = [PERM[j], PERM[i]];
  }
  for (let i = 0; i < 256; i++) PERM[256 + i] = PERM[i];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function dotGrad(ix: number, iy: number, x: number, y: number): number {
  const idx = PERM[PERM[ix & 255] + (iy & 255)] & 7;
  const g = GRAD[idx];
  return (x - ix) * g.x + (y - iy) * g.y;
}

function perlinNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const x1 = x0 + 1;
  const y0 = Math.floor(y);
  const y1 = y0 + 1;
  const sx = fade(x - x0);
  const sy = fade(y - y0);
  const n00 = dotGrad(x0, y0, x, y);
  const n10 = dotGrad(x1, y0, x, y);
  const n01 = dotGrad(x0, y1, x, y);
  const n11 = dotGrad(x1, y1, x, y);
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

export function generateTerrain(seed: number = 42): TerrainType[][] {
  initNoise(seed);
  const cx = GRID_SIZE / 2;
  const cy = GRID_SIZE / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const terrain: TerrainType[][] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    terrain[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const nx = x / GRID_SIZE * 4;
      const ny = y / GRID_SIZE * 4;
      let n = perlinNoise(nx, ny);
      n = (n + 1) / 2;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      n -= dist * 0.6;

      if (n < 0.2) {
        terrain[y][x] = 'shallowWater';
      } else if (n < 0.35) {
        terrain[y][x] = 'sand';
      } else if (n < 0.6) {
        terrain[y][x] = 'grass';
      } else {
        terrain[y][x] = 'rock';
      }
    }
  }

  const center = Math.floor(GRID_SIZE / 2);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const y = center + dy;
      const x = center + dx;
      if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) {
        terrain[y][x] = 'grass';
      }
    }
  }

  return terrain;
}

export function bfsPath(
  start: Point,
  end: Point,
  terrain: TerrainType[][],
  buildings: (string | null)[][]
): Point[] | null {
  const cols = GRID_SIZE;
  const rows = GRID_SIZE;
  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );
  const parent: (Point | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  const queue: Point[] = [start];
  visited[start.y][start.x] = true;

  const dirs = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;

    if (cur.x === end.x && cur.y === end.y) {
      const path: Point[] = [];
      let p: Point | null = end;
      while (p) {
        path.unshift(p);
        p = parent[p.y][p.x];
      }
      return path;
    }

    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (
        nx >= 0 && nx < cols &&
        ny >= 0 && ny < rows &&
        !visited[ny][nx]
      ) {
        const t = terrain[ny][nx];
        if (t === 'shallowWater' || t === 'sand' || t === 'grass') {
          const b = buildings[ny][nx];
          if (b === null || b === 'crystalTower' || (nx === end.x && ny === end.y)) {
            visited[ny][nx] = true;
            parent[ny][nx] = cur;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  return null;
}

export function computeSineWave(
  x: number,
  time: number,
  wavelength: number = 60,
  amplitude: number = 8,
  period: number = 2
): number {
  const frequency = (2 * Math.PI) / wavelength;
  const omega = (2 * Math.PI) / period;
  return amplitude * Math.sin(frequency * x - omega * time);
}

export function computeWaveColor(y: number, canvasHeight: number): string {
  const t = y / canvasHeight;
  const r = Math.round(lerp(26, 42, t));
  const g = Math.round(lerp(58, 90, t));
  const b = Math.round(lerp(92, 140, t));
  return `rgb(${r},${g},${b})`;
}
