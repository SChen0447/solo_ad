import { HeightMap } from './terrainGenerator';

interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  water: number;
  sediment: number;
  age: number;
}

export interface ParticlePath {
  points: { x: number; y: number; z: number }[];
}

const getHeight = (heightMap: HeightMap, size: number, x: number, y: number): number => {
  if (x < 0 || x >= size || y < 0 || y >= size) return 0;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const idx00 = yi * size + xi;
  const idx10 = yi * size + Math.min(xi + 1, size - 1);
  const idx01 = Math.min(yi + 1, size - 1) * size + xi;
  const idx11 = Math.min(yi + 1, size - 1) * size + Math.min(xi + 1, size - 1);

  const h00 = heightMap[idx00].z;
  const h10 = heightMap[idx10].z;
  const h01 = heightMap[idx01].z;
  const h11 = heightMap[idx11].z;

  const h0 = h00 * (1 - xf) + h10 * xf;
  const h1 = h01 * (1 - xf) + h11 * xf;
  return h0 * (1 - yf) + h1 * yf;
};

const setHeight = (heightMap: HeightMap, size: number, x: number, y: number, delta: number): void => {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = Math.floor(y) * size + Math.floor(x);
  heightMap[idx].z = Math.max(0, heightMap[idx].z + delta);
};

const getGradient = (heightMap: HeightMap, size: number, x: number, y: number): { gx: number; gy: number } => {
  const eps = 0.5;
  const gx = (getHeight(heightMap, size, x + eps, y) - getHeight(heightMap, size, x - eps, y)) / (2 * eps);
  const gy = (getHeight(heightMap, size, x, y + eps) - getHeight(heightMap, size, x, y - eps)) / (2 * eps);
  return { gx, gy };
};

const depositSediment = (
  heightMap: HeightMap,
  size: number,
  x: number,
  y: number,
  amount: number
): void => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  setHeight(heightMap, size, xi, yi, amount * (1 - xf) * (1 - yf));
  setHeight(heightMap, size, xi + 1, yi, amount * xf * (1 - yf));
  setHeight(heightMap, size, xi, yi + 1, amount * (1 - xf) * yf);
  setHeight(heightMap, size, xi + 1, yi + 1, amount * xf * yf);
};

export function simulateErosion(
  heightMap: HeightMap,
  iterations: number
): { heightMap: HeightMap; paths: ParticlePath[] } {
  const size = Math.sqrt(heightMap.length);
  const newHeightMap: HeightMap = heightMap.map((p) => ({ ...p }));
  const allPaths: ParticlePath[] = [];

  const INERTIA = 0.05;
  const SEDIMENT_CAPACITY_FACTOR = 4;
  const MIN_SLOPE = 0.01;
  const DEPOSITION_RATE = 0.3;
  const EROSION_RATE = 0.3;
  const EVAPORATION_RATE = 0.02;
  const MIN_WATER = 0.01;
  const MAX_AGE = 64;
  const PARTICLES_PER_ITERATION = 20;

  for (let iter = 0; iter < iterations; iter++) {
    for (let p = 0; p < PARTICLES_PER_ITERATION; p++) {
      const particle: WaterParticle = {
        x: Math.random() * (size - 2) + 1,
        y: Math.random() * (size - 2) + 1,
        vx: 0,
        vy: 0,
        water: 1,
        sediment: 0,
        age: 0
      };

      const path: ParticlePath = { points: [] };

      while (particle.water > MIN_WATER && particle.age < MAX_AGE) {
        const oldX = particle.x;
        const oldY = particle.y;
        const oldHeight = getHeight(newHeightMap, size, oldX, oldY);

        const { gx, gy } = getGradient(newHeightMap, size, particle.x, particle.y);

        particle.vx = particle.vx * INERTIA - gx * (1 - INERTIA);
        particle.vy = particle.vy * INERTIA - gy * (1 - INERTIA);

        const velocity = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (velocity > 0) {
          particle.vx /= velocity;
          particle.vy /= velocity;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x >= size - 1 || particle.y < 0 || particle.y >= size - 1) {
          break;
        }

        const newHeight = getHeight(newHeightMap, size, particle.x, particle.y);
        const deltaHeight = newHeight - oldHeight;

        const sedimentCapacity = Math.max(-deltaHeight, MIN_SLOPE) * particle.water * SEDIMENT_CAPACITY_FACTOR;

        if (particle.sediment > sedimentCapacity || deltaHeight > 0) {
          const depositAmount = deltaHeight > 0
            ? Math.min(deltaHeight, particle.sediment)
            : (particle.sediment - sedimentCapacity) * DEPOSITION_RATE;

          particle.sediment -= depositAmount;
          depositSediment(newHeightMap, size, oldX, oldY, depositAmount);
        } else {
          const erodeAmount = Math.min((sedimentCapacity - particle.sediment) * EROSION_RATE, -deltaHeight);
          particle.sediment += erodeAmount;
          depositSediment(newHeightMap, size, oldX, oldY, -erodeAmount);
        }

        particle.water *= (1 - EVAPORATION_RATE);
        particle.age++;

        path.points.push({
          x: particle.x - size / 2,
          y: newHeight,
          z: particle.y - size / 2
        });
      }

      if (path.points.length > 3) {
        allPaths.push(path);
      }
    }
  }

  return { heightMap: newHeightMap, paths: allPaths };
}
