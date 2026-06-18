import { TrafficData, DENSITY_RANGE, GRID_SIZE } from './types';

export class TrafficSimulation {
  private roadIds: string[] = [];
  private baseDensities: Map<string, number> = new Map();
  private phaseOffsets: Map<string, number> = new Map();
  private time: number = 0;

  constructor() {
    this.initializeRoads();
  }

  private initializeRoads(): void {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (j < GRID_SIZE - 1) {
          const id = `h-${i}-${j}`;
          this.roadIds.push(id);
          this.baseDensities.set(id, 40 + Math.random() * 80);
          this.phaseOffsets.set(id, Math.random() * Math.PI * 2);
        }
        if (i < GRID_SIZE - 1) {
          const id = `v-${i}-${j}`;
          this.roadIds.push(id);
          this.baseDensities.set(id, 40 + Math.random() * 80);
          this.phaseOffsets.set(id, Math.random() * Math.PI * 2);
        }
      }
    }
  }

  public fetchData(): TrafficData {
    this.time += 1;
    const roadDensities = new Map<string, number>();
    const flowDirections = new Map<string, 1 | -1>();

    for (const roadId of this.roadIds) {
      const base = this.baseDensities.get(roadId) || 80;
      const phase = this.phaseOffsets.get(roadId) || 0;
      
      const sineWave = Math.sin(this.time * 0.1 + phase) * 0.5 + 0.5;
      const noise = (Math.random() - 0.5) * 0.3;
      const variation = sineWave + noise;
      
      const density = Math.max(
        DENSITY_RANGE.MIN,
        Math.min(
          DENSITY_RANGE.MAX,
          base + variation * 60 + (Math.random() - 0.5) * 20
        )
      );
      
      roadDensities.set(roadId, Math.round(density));
      flowDirections.set(roadId, Math.random() > 0.5 ? 1 : -1);
    }

    return {
      timestamp: Date.now(),
      roadDensities,
      flowDirections
    };
  }

  public getRoadIds(): string[] {
    return [...this.roadIds];
  }
}
