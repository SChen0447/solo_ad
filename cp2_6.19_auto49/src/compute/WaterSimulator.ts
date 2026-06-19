export interface DrainOutlet {
  x: number;
  z: number;
  drainRate: number;
}

export interface WaterSimulatorConfig {
  gridSize: number;
  rainIntensity: number;
  drainEfficiency: number;
  drainOutlets: DrainOutlet[];
}

const GRID = 50;
const STEPS_PER_SECOND = 30;
const RAIN_SCALE = 0.00005;

export class WaterSimulator {
  private gridSize: number = GRID;
  private waterLevel: Float32Array;
  private terrainHeight: Float32Array;
  private prevWaterLevel: Float32Array;
  private drainOutlets: DrainOutlet[];
  private drainEfficiency: number = 1.0;
  private rainIntensity: number = 0;
  private lastStepTime: number = 0;
  private stepInterval: number = 1000 / STEPS_PER_SECOND;

  constructor(terrainHeight: Float32Array, drainOutlets: DrainOutlet[]) {
    const len = this.gridSize * this.gridSize;
    this.waterLevel = new Float32Array(len);
    this.prevWaterLevel = new Float32Array(len);
    this.terrainHeight = terrainHeight;
    this.drainOutlets = drainOutlets;
  }

  setRainIntensity(value: number): void {
    this.rainIntensity = value;
  }

  getRainIntensity(): number {
    return this.rainIntensity;
  }

  setDrainEfficiency(value: number): void {
    this.drainEfficiency = value;
  }

  getDrainEfficiency(): number {
    return this.drainEfficiency;
  }

  reset(): void {
    this.waterLevel.fill(0);
    this.prevWaterLevel.fill(0);
    this.rainIntensity = 0;
  }

  step(currentTime: number): Float32Array {
    if (currentTime - this.lastStepTime < this.stepInterval) {
      return this.waterLevel;
    }
    this.lastStepTime = currentTime;

    this.prevWaterLevel.set(this.waterLevel);
    this.applyRain();
    this.applyDrainage();
    this.simulateFlow();

    return this.waterLevel;
  }

  private applyRain(): void {
    if (this.rainIntensity <= 0) return;
    const amount = this.rainIntensity * RAIN_SCALE;
    for (let i = 0; i < this.waterLevel.length; i++) {
      this.waterLevel[i] += amount;
    }
  }

  private applyDrainage(): void {
    for (const outlet of this.drainOutlets) {
      const cx = outlet.x;
      const cz = outlet.z;
      const rate = outlet.drainRate * this.drainEfficiency;
      const radius = 2;

      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = cx + dx;
          const nz = cz + dz;
          if (nx < 0 || nx >= this.gridSize || nz < 0 || nz >= this.gridSize) continue;
          const idx = nz * this.gridSize + nx;
          const terrainH = this.terrainHeight[idx];
          const waterH = this.waterLevel[idx] + terrainH;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > radius) continue;
          if (waterH > terrainH) {
            const falloff = 1 - dist / (radius + 1);
            const drainAmount = rate * 0.002 * falloff;
            this.waterLevel[idx] = Math.max(0, this.waterLevel[idx] - drainAmount);
          }
        }
      }
    }
  }

  private simulateFlow(): void {
    const newWater = new Float32Array(this.waterLevel.length);
    newWater.set(this.waterLevel);

    const flowCoeff = 0.25;

    for (let z = 0; z < this.gridSize; z++) {
      for (let x = 0; x < this.gridSize; x++) {
        const idx = z * this.gridSize + x;
        const currentSurface = this.terrainHeight[idx] + this.waterLevel[idx];
        if (this.waterLevel[idx] <= 0.0001) continue;

        let totalFlowOut = 0;
        const flows: { neighborIdx: number; flow: number }[] = [];

        const neighbors = [
          [x - 1, z],
          [x + 1, z],
          [x, z - 1],
          [x, z + 1],
        ];

        for (const [nx, nz] of neighbors) {
          if (nx < 0 || nx >= this.gridSize || nz < 0 || nz >= this.gridSize) continue;
          const nIdx = nz * this.gridSize + nx;
          const neighborSurface = this.terrainHeight[nIdx] + this.waterLevel[nIdx];

          if (currentSurface > neighborSurface) {
            const diff = currentSurface - neighborSurface;
            const flow = Math.min(diff * flowCoeff, this.waterLevel[idx] * 0.25);
            if (flow > 0) {
              flows.push({ neighborIdx: nIdx, flow });
              totalFlowOut += flow;
            }
          }
        }

        if (totalFlowOut > this.waterLevel[idx]) {
          const scale = this.waterLevel[idx] / totalFlowOut;
          for (const f of flows) {
            f.flow *= scale;
          }
          totalFlowOut = this.waterLevel[idx];
        }

        newWater[idx] -= totalFlowOut;
        for (const f of flows) {
          newWater[f.neighborIdx] += f.flow;
        }
      }
    }

    for (let i = 0; i < newWater.length; i++) {
      if (newWater[i] < 0.0001) newWater[i] = 0;
    }

    this.waterLevel = newWater;
  }

  getWaterLevel(): Float32Array {
    return this.waterLevel;
  }

  getWaterLevelAt(x: number, z: number): number {
    if (x < 0 || x >= this.gridSize || z < 0 || z >= this.gridSize) return 0;
    return this.waterLevel[z * this.gridSize + x];
  }

  getWaterTrendAt(x: number, z: number): number {
    if (x < 0 || x >= this.gridSize || z < 0 || z >= this.gridSize) return 0;
    const idx = z * this.gridSize + x;
    return this.waterLevel[idx] - this.prevWaterLevel[idx];
  }

  getAverageWaterLevel(): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < this.waterLevel.length; i++) {
      if (this.waterLevel[i] > 0.0001) {
        sum += this.waterLevel[i];
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  isDrainActive(outlet: DrainOutlet): boolean {
    const idx = outlet.z * this.gridSize + outlet.x;
    const surfaceH = this.terrainHeight[idx] + this.waterLevel[idx];
    return surfaceH > this.terrainHeight[idx] && this.waterLevel[idx] > 0.001;
  }
}
