export interface HeightPoint {
  x: number;
  y: number;
  z: number;
}

export type HeightMap = HeightPoint[];

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
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

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;

    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  octaveNoise2D(x: number, y: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}

export function generateHeightMap(
  size: number,
  heightRange: number,
  seed: number
): HeightMap {
  const perlin = new PerlinNoise(seed);
  const heightMap: HeightMap = [];
  const scale = 0.08;
  const octaves = 6;
  const persistence = 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const noiseValue = perlin.octaveNoise2D(x * scale, y * scale, octaves, persistence);
      const normalizedValue = (noiseValue + 1) / 2;
      const z = normalizedValue * heightRange;
      heightMap.push({ x, y, z });
    }
  }

  return heightMap;
}
