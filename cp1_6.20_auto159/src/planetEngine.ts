export type MineralRarity = 'common' | 'rare' | 'legendary';

export interface Cell {
  x: number;
  y: number;
  height: number;
  mined: boolean;
  mineral: MineralRarity | null;
  mineralAmount: number;
}

export interface Planet {
  id: number;
  name: string;
  gridSize: number;
  cellSize: number;
  cells: Cell[][];
  fadeInProgress: number;
}

const GRID_SIZE = 16;
const CELL_SIZE = 32;

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let n: number;
    let q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = p[i];
      p[i] = p[n];
      p[n] = q;
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.permutation[this.permutation[X] + Y];
    const ab = this.permutation[this.permutation[X] + Y + 1];
    const ba = this.permutation[this.permutation[X + 1] + Y];
    const bb = this.permutation[this.permutation[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    return (this.lerp(x1, x2, v) + 1) / 2;
  }

  octaveNoise(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

function getHeightColor(height: number): string {
  const r1 = 139, g1 = 69, b1 = 19;
  const r2 = 210, g2 = 180, b2 = 140;

  const t = Math.max(0, Math.min(1, height));
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function generateMineral(height: number, randomValue: number): { rarity: MineralRarity | null; amount: number } {
  if (randomValue < 0.6) {
    return { rarity: null, amount: 0 };
  }

  const rarityRoll = Math.random();
  const heightBonus = height * 0.3;

  if (rarityRoll < 0.05 + heightBonus * 0.1) {
    return { rarity: 'legendary', amount: 1 + Math.floor(Math.random() * 2) };
  } else if (rarityRoll < 0.25 + heightBonus) {
    return { rarity: 'rare', amount: 2 + Math.floor(Math.random() * 3) };
  } else {
    return { rarity: 'common', amount: 3 + Math.floor(Math.random() * 5) };
  }
}

export function generatePlanet(id: number, seed?: number): Planet {
  const actualSeed = seed ?? id * 12345 + 6789;
  const noise = new PerlinNoise(actualSeed);
  const cells: Cell[][] = [];

  const planetNames = ['阿尔法星', '贝塔星', '伽马星', '德尔塔星', '厄普西隆星'];
  const name = planetNames[id % planetNames.length];

  for (let y = 0; y < GRID_SIZE; y++) {
    cells[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const height = noise.octaveNoise(x * 0.15, y * 0.15, 4, 0.5);
      const mineralCheck = Math.random();
      const { rarity, amount } = generateMineral(height, mineralCheck);

      cells[y][x] = {
        x,
        y,
        height,
        mined: false,
        mineral: rarity,
        mineralAmount: amount,
      };
    }
  }

  return {
    id,
    name,
    gridSize: GRID_SIZE,
    cellSize: CELL_SIZE,
    cells,
    fadeInProgress: 0,
  };
}

export function getCellColor(cell: Cell): string {
  if (cell.mined) {
    return '#1a1a2e';
  }
  return getHeightColor(cell.height);
}

export function getMineralColor(rarity: MineralRarity | null): string {
  switch (rarity) {
    case 'common':
      return '#FFD700';
    case 'rare':
      return '#FF69B4';
    case 'legendary':
      return '#00FFFF';
    default:
      return 'transparent';
  }
}

export function getMineralName(rarity: MineralRarity): string {
  switch (rarity) {
    case 'common':
      return '普通矿石';
    case 'rare':
      return '稀有矿石';
    case 'legendary':
      return '传说矿石';
  }
}

export function getCellAtPosition(planet: Planet, px: number, py: number): Cell | null {
  const x = Math.floor(px / planet.cellSize);
  const y = Math.floor(py / planet.cellSize);
  if (x >= 0 && x < planet.gridSize && y >= 0 && y < planet.gridSize) {
    return planet.cells[y][x];
  }
  return null;
}
