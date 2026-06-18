import {
  TileType,
  Crystal,
  ElementType,
  MAP_TILE_COLS,
  MAP_TILE_ROWS,
  INITIAL_CRYSTAL_COUNT,
  TILE_SIZE,
  MAP_TILE_COLS as _MC,
} from '@/types';

const ELEMENTS: ElementType[] = ['fire', 'water', 'earth', 'wind'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface MapData {
  tiles: TileType[][];
  crystals: Crystal[];
  alchemistTableX: number;
  alchemistTableY: number;
}

function generateNoiseMap(cols: number, rows: number, rand: () => number): number[][] {
  const noise: number[][] = [];
  for (let y = 0; y < rows; y++) {
    noise[y] = [];
    for (let x = 0; x < cols; x++) {
      noise[y][x] = rand();
    }
  }

  const smoothed: number[][] = [];
  for (let y = 0; y < rows; y++) {
    smoothed[y] = [];
    for (let x = 0; x < cols; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
            sum += noise[ny][nx];
            count++;
          }
        }
      }
      smoothed[y][x] = sum / count;
    }
  }
  return smoothed;
}

export function generateMap(seed?: number): MapData {
  const rand = seededRandom(seed ?? Date.now());
  const cols = MAP_TILE_COLS;
  const rows = MAP_TILE_ROWS;
  const noise = generateNoiseMap(cols, rows, rand);

  const tiles: TileType[][] = [];
  const centerX = Math.floor(cols / 2);
  const centerY = Math.floor(rows / 2);

  for (let y = 0; y < rows; y++) {
    tiles[y] = [];
    for (let x = 0; x < cols; x++) {
      const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const v = noise[y][x];

      if (distToCenter < 3) {
        tiles[y][x] = 'grass';
      } else if (v < 0.25) {
        tiles[y][x] = 'water';
      } else if (v > 0.85) {
        tiles[y][x] = 'rock';
      } else {
        tiles[y][x] = 'grass';
      }
    }
  }

  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const ty = centerY + dy;
      const tx = centerX + dx;
      if (ty >= 0 && ty < rows && tx >= 0 && tx < cols) {
        if (Math.abs(dx) + Math.abs(dy) <= 3) {
          tiles[ty][tx] = 'grass';
        }
      }
    }
  }

  const alchemistTableX = centerX * TILE_SIZE + TILE_SIZE / 2;
  const alchemistTableY = centerY * TILE_SIZE + TILE_SIZE / 2;

  const crystals: Crystal[] = [];
  let crystalId = 0;
  let attempts = 0;

  while (crystals.length < INITIAL_CRYSTAL_COUNT && attempts < 1000) {
    const cx = Math.floor(rand() * cols);
    const cy = Math.floor(rand() * rows);
    const tile = tiles[cy][cx];

    if (tile === 'grass') {
      const distToTable = Math.sqrt(
        (cx * TILE_SIZE - alchemistTableX) ** 2 + (cy * TILE_SIZE - alchemistTableY) ** 2
      );
      if (distToTable > 100) {
        crystals.push({
          id: `crystal_${crystalId++}`,
          element: ELEMENTS[Math.floor(rand() * ELEMENTS.length)],
          x: cx * TILE_SIZE + TILE_SIZE / 2,
          y: cy * TILE_SIZE + TILE_SIZE / 2,
          collected: false,
        });
      }
    }
    attempts++;
  }

  return { tiles, crystals, alchemistTableX, alchemistTableY };
}

export function spawnCrystal(
  tiles: TileType[][],
  playerX: number,
  playerY: number,
  existingCrystals: Crystal[]
): Crystal | null {
  const cols = tiles[0].length;
  const rows = tiles.length;
  const rand = Math.random;
  let attempts = 0;

  while (attempts < 100) {
    const cx = Math.floor(rand() * cols);
    const cy = Math.floor(rand() * rows);

    if (tiles[cy][cx] !== 'grass') {
      attempts++;
      continue;
    }

    const worldX = cx * TILE_SIZE + TILE_SIZE / 2;
    const worldY = cy * TILE_SIZE + TILE_SIZE / 2;
    const distToPlayer = Math.sqrt((worldX - playerX) ** 2 + (worldY - playerY) ** 2);

    if (distToPlayer < 150) {
      attempts++;
      continue;
    }

    const tooClose = existingCrystals.some(
      (c) => !c.collected && Math.sqrt((c.x - worldX) ** 2 + (c.y - worldY) ** 2) < TILE_SIZE * 2
    );
    if (tooClose) {
      attempts++;
      continue;
    }

    return {
      id: `crystal_${Date.now()}_${attempts}`,
      element: ELEMENTS[Math.floor(rand() * ELEMENTS.length)],
      x: worldX,
      y: worldY,
      collected: false,
    };
  }
  return null;
}
