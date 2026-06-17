import type { Star, StarGenerationParams } from './types';

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

const spectralColors: Record<string, { r: number; g: number; b: number }> = {
  O: { r: 155, g: 176, b: 255 },
  B: { r: 170, g: 191, b: 255 },
  A: { r: 213, g: 224, b: 255 },
  F: { r: 255, g: 248, b: 220 },
  G: { r: 255, g: 230, b: 150 },
  K: { r: 255, g: 180, b: 80 },
  M: { r: 255, g: 100, b: 50 },
};

const spectralTypes: Array<'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'> = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];

const spectralWeights = [0.00003, 0.13, 0.6, 3, 7, 12, 76];

function generateSpectralType(random: SeededRandom): 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' {
  const totalWeight = spectralWeights.reduce((a, b) => a + b, 0);
  let rand = random.next() * totalWeight;
  
  for (let i = 0; i < spectralTypes.length; i++) {
    rand -= spectralWeights[i];
    if (rand <= 0) return spectralTypes[i];
  }
  return 'M';
}

function poissonDiskSampling3D(
  count: number,
  radius: number,
  minDistance: number,
  random: SeededRandom,
  distribution: 'sphere' | 'disk'
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const maxAttempts = 30;

  function getRandomPoint(): { x: number; y: number; z: number } {
    if (distribution === 'sphere') {
      const theta = random.range(0, Math.PI * 2);
      const phi = Math.acos(random.range(-1, 1));
      const r = Math.cbrt(random.next()) * radius;
      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      };
    } else {
      const theta = random.range(0, Math.PI * 2);
      const r = Math.sqrt(random.next()) * radius;
      const y = random.range(-radius * 0.15, radius * 0.15);
      return {
        x: r * Math.cos(theta),
        y,
        z: r * Math.sin(theta),
      };
    }
  }

  function isFarEnough(point: { x: number; y: number; z: number }): boolean {
    for (const existing of points) {
      const dx = point.x - existing.x;
      const dy = point.y - existing.y;
      const dz = point.z - existing.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDistance) return false;
    }
    return true;
  }

  while (points.length < count) {
    for (let attempt = 0; attempt < maxAttempts && points.length < count; attempt++) {
      const point = getRandomPoint();
      if (isFarEnough(point)) {
        points.push(point);
      }
    }
  }

  return points;
}

export async function generateStars(params: StarGenerationParams): Promise<Star[]> {
  await new Promise(resolve => setTimeout(resolve, 500));

  const { count, distribution, seed } = params;
  const random = new SeededRandom(seed);
  const radius = 100;
  const minDistance = distribution === 'sphere' ? 8 : 6;

  const positions = poissonDiskSampling3D(count, radius, minDistance, random, distribution);

  return positions.map((pos, index) => {
    const spectralType = generateSpectralType(random);
    const color = spectralColors[spectralType];
    const brightness = random.range(0.3, 1.0);
    const size = random.range(0.8, 2.5) * brightness;

    return {
      id: `star-${index}-${Date.now()}`,
      position: pos,
      brightness,
      color: {
        r: color.r / 255,
        g: color.g / 255,
        b: color.b / 255,
      },
      spectralType,
      size,
    };
  });
}
