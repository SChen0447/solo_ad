import {
  GRID_SIZE,
  CELL_SIZE,
  WAVE_SPEED,
  WAVE_DAMPING,
  DT,
  OBSERVATION_POINTS,
  FAULT_CENTER,
  FAULT_TILT_ANGLE,
  MAGNITUDE_DEFAULT,
} from './config';
import type { ObservationData, SimSnapshot } from './store';

const N = GRID_SIZE;
const TOTAL = N * N * N;

function idx(i: number, j: number, k: number): number {
  return i * N * N + j * N + k;
}

function isNearFault(x: number, y: number, z: number): boolean {
  const dx = x - FAULT_CENTER.x;
  const dy = y - FAULT_CENTER.y;
  const dz = z - FAULT_CENTER.z;
  const rad = (FAULT_TILT_ANGLE * Math.PI) / 180;
  const normalY = Math.cos(rad);
  const normalZ = Math.sin(rad);
  const dist = Math.abs(dy * normalY + dz * normalZ);
  return dist < 1.5;
}

export class SeismicSimulator {
  private displacement: Float32Array;
  private displacementPrev: Float32Array;
  private stress: Float32Array;
  private sourceX: number;
  private sourceY: number;
  private sourceZ: number;
  private magnitude: number;
  private time: number;
  private faultActivated: boolean;
  private faultActivationTime: number;

  constructor() {
    this.displacement = new Float32Array(TOTAL);
    this.displacementPrev = new Float32Array(TOTAL);
    this.stress = new Float32Array(TOTAL);
    this.sourceX = 0;
    this.sourceY = 0;
    this.sourceZ = 0;
    this.magnitude = MAGNITUDE_DEFAULT;
    this.time = 0;
    this.faultActivated = false;
    this.faultActivationTime = -1;
  }

  reset(): void {
    this.displacement.fill(0);
    this.displacementPrev.fill(0);
    this.stress.fill(0);
    this.time = 0;
    this.faultActivated = false;
    this.faultActivationTime = -1;
  }

  setSource(x: number, y: number, z: number): void {
    this.sourceX = x;
    this.sourceY = y;
    this.sourceZ = z;
  }

  setMagnitude(m: number): void {
    this.magnitude = m;
  }

  step(dt: number): SimSnapshot {
    const c2 = (WAVE_SPEED * WAVE_SPEED * dt * dt) / (CELL_SIZE * CELL_SIZE);
    const damping = WAVE_DAMPING;
    const amp = this.magnitude * 0.15;

    const srcI = Math.round((this.sourceX / CELL_SIZE) + N / 2);
    const srcJ = Math.round((this.sourceY / CELL_SIZE) + N / 2);
    const srcK = Math.round((this.sourceZ / CELL_SIZE) + N / 2);

    const srcIdx =
      srcI >= 0 && srcI < N && srcJ >= 0 && srcJ < N && srcK >= 0 && srcK < N
        ? idx(srcI, srcJ, srcK)
        : -1;

    const sourceFreq = 2.0 + this.magnitude * 0.3;
    const sourceVal =
      srcIdx >= 0
        ? amp * Math.sin(2 * Math.PI * sourceFreq * this.time) *
          Math.exp(-0.3 * this.time)
        : 0;

    const newDisp = new Float32Array(TOTAL);

    for (let i = 1; i < N - 1; i++) {
      for (let j = 1; j < N - 1; j++) {
        for (let k = 1; k < N - 1; k++) {
          const n = idx(i, j, k);
          const laplacian =
            this.displacement[idx(i + 1, j, k)] +
            this.displacement[idx(i - 1, j, k)] +
            this.displacement[idx(i, j + 1, k)] +
            this.displacement[idx(i, j - 1, k)] +
            this.displacement[idx(i, j, k + 1)] +
            this.displacement[idx(i, j, k - 1)] -
            6 * this.displacement[n];

          let val =
            2 * this.displacement[n] -
            this.displacementPrev[n] +
            c2 * laplacian;

          val *= damping;

          const worldX = (i - N / 2) * CELL_SIZE;
          const worldY = (j - N / 2) * CELL_SIZE;
          const worldZ = (k - N / 2) * CELL_SIZE;

          if (isNearFault(worldX, worldY, worldZ)) {
            val *= 0.7;
            const reflected = val * 0.3;
            if (i > 1) newDisp[idx(i - 1, j, k)] += reflected * 0.5;
            if (j > 1) newDisp[idx(i, j - 1, k)] += reflected * 0.3;
            if (k > 1) newDisp[idx(i, j, k - 1)] += reflected * 0.2;
          }

          newDisp[n] = val;
        }
      }
    }

    if (srcIdx >= 0) {
      newDisp[srcIdx] += sourceVal;
    }

    let maxDisp = 0;
    for (let i = 0; i < TOTAL; i++) {
      const absVal = Math.abs(newDisp[i]);
      if (absVal > maxDisp) maxDisp = absVal;
      const dv = newDisp[i] - this.displacement[i];
      this.stress[i] = Math.abs(dv) / dt;
    }

    this.displacementPrev.set(this.displacement);
    this.displacement.set(newDisp);

    this.time += dt;

    const obsData: ObservationData[] = OBSERVATION_POINTS.map((pt) => {
      const pi = Math.round((pt.x / CELL_SIZE) + N / 2);
      const pj = Math.round((pt.y / CELL_SIZE) + N / 2);
      const pk = Math.round((pt.z / CELL_SIZE) + N / 2);
      let disp = 0;
      let stressVal = 0;
      if (pi >= 0 && pi < N && pj >= 0 && pj < N && pk >= 0 && pk < N) {
        const pidx = idx(pi, pj, pk);
        disp = Math.abs(this.displacement[pidx]);
        stressVal = this.stress[pidx];
      }
      return { id: pt.id, displacement: disp, stress: stressVal, history: [] };
    });

    if (!this.faultActivated) {
      const faultWorldX = FAULT_CENTER.x;
      const faultWorldY = FAULT_CENTER.y;
      const faultWorldZ = FAULT_CENTER.z;
      const fi = Math.round((faultWorldX / CELL_SIZE) + N / 2);
      const fj = Math.round((faultWorldY / CELL_SIZE) + N / 2);
      const fk = Math.round((faultWorldZ / CELL_SIZE) + N / 2);
      if (fi >= 0 && fi < N && fj >= 0 && fj < N && fk >= 0 && fk < N) {
        const fidx = idx(fi, fj, fk);
        if (Math.abs(this.displacement[fidx]) > 0.05 * this.magnitude) {
          this.faultActivated = true;
          this.faultActivationTime = this.time;
        }
      }
    }

    if (
      this.faultActivated &&
      this.faultActivationTime > 0 &&
      this.time - this.faultActivationTime > 0.5
    ) {
      this.faultActivated = false;
      this.faultActivationTime = -1;
    }

    return {
      time: this.time,
      displacementField: new Float32Array(this.displacement),
      stressField: new Float32Array(this.stress),
      maxDisplacement: maxDisp,
      observationData: obsData,
      faultActivated: this.faultActivated,
    };
  }

  getTime(): number {
    return this.time;
  }
}
