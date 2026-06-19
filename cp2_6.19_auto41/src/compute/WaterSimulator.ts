interface Drain {
  x: number;
  z: number;
  drainRate: number;
}

export class WaterSimulator {
  private heightmap: Float32Array;
  private drains: Array<Drain>;
  private gridSize: number;
  private prevAverageWaterLevel: number;
  private lastUpdateTime: number;

  public waterLevel: Float32Array;
  public rainIntensity: number;
  public drainEfficiency: number;
  public timeStep: number;

  constructor(
    heightmap: Float32Array,
    drains: Array<Drain>,
    gridSize: number = 50
  ) {
    this.heightmap = heightmap;
    this.drains = drains;
    this.gridSize = gridSize;
    this.prevAverageWaterLevel = 0;
    this.lastUpdateTime = 0;

    this.waterLevel = new Float32Array(gridSize * gridSize);
    this.rainIntensity = 0;
    this.drainEfficiency = 1.0;
    this.timeStep = 1 / 30;
  }

  update(deltaTime: number): void {
    const now = performance.now();
    if (now - this.lastUpdateTime < 33) {
      return;
    }
    this.lastUpdateTime = now;

    const size = this.gridSize;
    const totalCells = size * size;
    const newWaterLevel = new Float32Array(totalCells);

    const rainAmount = this.rainIntensity * this.timeStep * 0.001;
    const diffusionCoefficient = 0.3;

    for (let i = 0; i < totalCells; i++) {
      const x = i % size;
      const z = Math.floor(i / size);

      let water = this.waterLevel[i];
      const terrain = this.heightmap[i];
      const totalHeight = terrain + water;

      water += rainAmount;

      if (totalHeight > terrain) {
        const directions = [
          { dx: 0, dz: -1 },
          { dx: 0, dz: 1 },
          { dx: -1, dz: 0 },
          { dx: 1, dz: 0 }
        ];

        for (const dir of directions) {
          const nx = x + dir.dx;
          const nz = z + dir.dz;

          if (nx < 0 || nx >= size || nz < 0 || nz >= size) {
            continue;
          }

          const ni = nz * size + nx;
          const neighborTerrain = this.heightmap[ni];
          const neighborWater = this.waterLevel[ni];
          const neighborTotal = neighborTerrain + neighborWater;

          const heightDiff = totalHeight - neighborTotal;
          if (heightDiff > 0) {
            const transfer = heightDiff * diffusionCoefficient * 0.25;
            water -= transfer;
            newWaterLevel[ni] += transfer;
          }
        }
      }

      newWaterLevel[i] += water;
    }

    for (const drain of this.drains) {
      const dx = Math.floor(drain.x);
      const dz = Math.floor(drain.z);
      const drainAmount = drain.drainRate * this.drainEfficiency * this.timeStep;

      for (let oz = -1; oz <= 1; oz++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = dx + ox;
          const nz = dz + oz;

          if (nx < 0 || nx >= size || nz < 0 || nz >= size) {
            continue;
          }

          const ni = nz * size + nx;
          if (newWaterLevel[ni] > this.heightmap[ni]) {
            newWaterLevel[ni] = Math.max(
              this.heightmap[ni],
              newWaterLevel[ni] - drainAmount
            );
          }
        }
      }
    }

    for (let i = 0; i < totalCells; i++) {
      if (newWaterLevel[i] < 0) {
        newWaterLevel[i] = 0;
      }
    }

    this.waterLevel.set(newWaterLevel);
  }

  reset(): void {
    this.waterLevel.fill(0);
    this.prevAverageWaterLevel = 0;
  }

  getWaterLevelAt(x: number, z: number): number {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    if (ix < 0 || ix >= this.gridSize || iz < 0 || iz >= this.gridSize) {
      return 0;
    }
    return this.waterLevel[iz * this.gridSize + ix];
  }

  getAverageWaterLevel(): number {
    let sum = 0;
    const total = this.waterLevel.length;
    for (let i = 0; i < total; i++) {
      sum += this.waterLevel[i];
    }
    return sum / total;
  }

  getWaterLevelTrend(): 'rising' | 'falling' | 'stable' {
    const current = this.getAverageWaterLevel();
    const prev = this.prevAverageWaterLevel;
    this.prevAverageWaterLevel = current;

    const diff = current - prev;
    const epsilon = 0.0001;

    if (diff > epsilon) {
      return 'rising';
    } else if (diff < -epsilon) {
      return 'falling';
    }
    return 'stable';
  }
}
