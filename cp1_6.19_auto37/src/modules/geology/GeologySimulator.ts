import { FaultParams, LayerConfig, MeasurementPoint, CrackSegment, VertexDeformation } from './types';

const TERRAIN_SIZE = 200;
const GRID_SEGMENTS = 100;
const CRACK_THRESHOLD = 0.5;
const DEFORM_INFLUENCE_RADIUS = 60;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function perlinNoise2D(x: number, y: number, seed: number = 42): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const hash = (a: number, b: number) => {
    let h = seed + a * 374761393 + b * 668265263;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  };

  const n00 = hash(X, Y);
  const n10 = hash(X + 1, Y);
  const n01 = hash(X, Y + 1);
  const n11 = hash(X + 1, Y + 1);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

function fbm(x: number, y: number, octaves: number = 4, seed: number = 42): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxVal = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlinNoise2D(x * frequency, y * frequency, seed + i * 100);
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxVal;
}

export class GeologySimulator {
  faultParams: FaultParams;
  layers: LayerConfig[];
  baseVertices: Float32Array;
  gridWidth: number;
  gridHeight: number;
  crackSegments: CrackSegment[] = [];
  private rng: () => number;

  constructor(faultParams?: Partial<FaultParams>) {
    this.rng = seededRandom(12345);
    this.faultParams = {
      strike: faultParams?.strike ?? 30,
      dipDirection: faultParams?.dipDirection ?? 80,
      dipAngle: faultParams?.dipAngle ?? 75,
      slipDirection: faultParams?.slipDirection ?? 1,
      maxDisplacement: faultParams?.maxDisplacement ?? 15,
    };

    this.layers = [
      { color: '#d4a373', thickness: 10 + this.rng() * 10, baseHeight: 0 },
      { color: '#8b5e3c', thickness: 10 + this.rng() * 10, baseHeight: 0 },
      { color: '#4a3b32', thickness: 10 + this.rng() * 10, baseHeight: 0 },
    ];
    this.layers[0].baseHeight = 0;
    this.layers[1].baseHeight = -this.layers[0].thickness;
    this.layers[2].baseHeight = -this.layers[0].thickness - this.layers[1].thickness;

    this.gridWidth = GRID_SEGMENTS + 1;
    this.gridHeight = GRID_SEGMENTS + 1;
    this.baseVertices = this.generateBaseVertices();
  }

  private generateBaseVertices(): Float32Array {
    const vertices = new Float32Array(this.gridWidth * this.gridHeight * 3);
    const halfSize = TERRAIN_SIZE / 2;
    const step = TERRAIN_SIZE / GRID_SEGMENTS;

    for (let iy = 0; iy < this.gridHeight; iy++) {
      for (let ix = 0; ix < this.gridWidth; ix++) {
        const idx = (iy * this.gridWidth + ix) * 3;
        const x = -halfSize + ix * step;
        const z = -halfSize + iy * step;
        const nx = x / 40;
        const nz = z / 40;
        const elevation = fbm(nx, nz, 4, 42) * 8 - 4;
        vertices[idx] = x;
        vertices[idx + 1] = elevation;
        vertices[idx + 2] = z;
      }
    }
    return vertices;
  }

  getFaultLineCenter(): [number, number, number] {
    return [0, 0, 0];
  }

  private computeFaultNormal(): [number, number, number] {
    const strikeRad = (this.faultParams.strike * Math.PI) / 180;
    const dipRad = (this.faultParams.dipAngle * Math.PI) / 180;
    const nx = -Math.sin(dipRad) * Math.sin(strikeRad);
    const ny = Math.cos(dipRad);
    const nz = Math.sin(dipRad) * Math.cos(strikeRad);
    return [nx, ny, nz];
  }

  private computeSlipVector(): [number, number, number] {
    const strikeRad = (this.faultParams.strike * Math.PI) / 180;
    const dipRad = (this.faultParams.dipAngle * Math.PI) / 180;
    const dipDirRad = (this.faultParams.dipDirection * Math.PI) / 180;
    const sx = Math.cos(dipRad) * Math.cos(dipDirRad);
    const sy = Math.sin(dipRad);
    const sz = Math.cos(dipRad) * Math.sin(dipDirRad);
    const dir = this.faultParams.slipDirection >= 0 ? 1 : -1;
    return [sx * dir, sy * dir, sz * dir];
  }

  signedDistanceToFaultPlane(x: number, _y: number, z: number): number {
    const [nx, ny, nz] = this.computeFaultNormal();
    const strikeRad = (this.faultParams.strike * Math.PI) / 180;
    const fx = Math.cos(strikeRad);
    const fz = Math.sin(strikeRad);
    return nx * (x - fx * x) + ny * (_y) + nz * (z - fz * z);
  }

  isOnHangingWall(x: number, y: number, z: number): boolean {
    const [nx, ny, nz] = this.computeFaultNormal();
    const d = nx * x + ny * y + nz * z;
    return d > 0;
  }

  computeDeformedVertices(time: number): Float32Array {
    const deformed = new Float32Array(this.baseVertices);
    const progress = Math.min(time / 50, 1);
    const displacement = progress * this.faultParams.maxDisplacement;
    const [sx, sy, sz] = this.computeSlipVector();

    for (let i = 0; i < this.gridWidth * this.gridHeight; i++) {
      const idx = i * 3;
      const ox = this.baseVertices[idx];
      const oy = this.baseVertices[idx + 1];
      const oz = this.baseVertices[idx + 2];

      const isHanging = this.isOnHangingWall(ox, oy, oz);
      const distToFault = Math.abs(this.signedDistanceToFaultPlane(ox, oy, oz));
      const influence = Math.max(0, 1 - distToFault / DEFORM_INFLUENCE_RADIUS);
      const smoothInfluence = influence * influence * (3 - 2 * influence);

      const sign = isHanging ? 1 : 0;
      const effectiveDisp = displacement * smoothInfluence * sign;

      deformed[idx] = ox + sx * effectiveDisp;
      deformed[idx + 1] = oy + sy * effectiveDisp;
      deformed[idx + 2] = oz + sz * effectiveDisp;
    }

    return deformed;
  }

  computeVertexDeformations(time: number): VertexDeformation[] {
    const deformed = this.computeDeformedVertices(time);
    const result: VertexDeformation[] = [];
    for (let i = 0; i < this.gridWidth * this.gridHeight; i++) {
      const idx = i * 3;
      const orig: [number, number, number] = [this.baseVertices[idx], this.baseVertices[idx + 1], this.baseVertices[idx + 2]];
      const def: [number, number, number] = [deformed[idx], deformed[idx + 1], deformed[idx + 2]];
      const dx = def[0] - orig[0];
      const dy = def[1] - orig[1];
      const dz = def[2] - orig[2];
      result.push({ original: orig, deformed: def, displacement: Math.sqrt(dx * dx + dy * dy + dz * dz) });
    }
    return result;
  }

  detectCracks(time: number): CrackSegment[] {
    const progress = Math.min(time / 50, 1);
    if (progress < 0.01) return [];

    const cracks: CrackSegment[] = [];
    const step = TERRAIN_SIZE / GRID_SEGMENTS;
    const halfSize = TERRAIN_SIZE / 2;
    const deformed = this.computeDeformedVertices(time);

    for (let iy = 0; iy < this.gridHeight - 1; iy++) {
      for (let ix = 0; ix < this.gridWidth - 1; ix++) {
        const i = iy * this.gridWidth + ix;
        const idx = i * 3;

        const dx = deformed[idx] - this.baseVertices[idx];
        const dy = deformed[idx + 1] - this.baseVertices[idx + 1];
        const dz = deformed[idx + 2] - this.baseVertices[idx + 2];
        const disp = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const iRight = i + 1;
        const idxR = iRight * 3;
        const dxR = deformed[idxR] - this.baseVertices[idxR];
        const dyR = deformed[idxR + 1] - this.baseVertices[idxR + 1];
        const dzR = deformed[idxR + 2] - this.baseVertices[idxR + 2];
        const dispR = Math.sqrt(dxR * dxR + dyR * dyR + dzR * dzR);

        const gradientH = Math.abs(disp - dispR) / step;
        if (gradientH > CRACK_THRESHOLD) {
          cracks.push({
            start: [deformed[idx], deformed[idx + 1], deformed[idx + 2]],
            end: [deformed[idxR], deformed[idxR + 1], deformed[idxR + 2]],
          });
        }

        const iDown = i + this.gridWidth;
        const idxD = iDown * 3;
        const dxD = deformed[idxD] - this.baseVertices[idxD];
        const dyD = deformed[idxD + 1] - this.baseVertices[idxD + 1];
        const dzD = deformed[idxD + 2] - this.baseVertices[idxD + 2];
        const dispD = Math.sqrt(dxD * dxD + dyD * dyD + dzD * dzD);

        const gradientV = Math.abs(disp - dispD) / step;
        if (gradientV > CRACK_THRESHOLD) {
          cracks.push({
            start: [deformed[idx], deformed[idx + 1], deformed[idx + 2]],
            end: [deformed[idxD], deformed[idxD + 1], deformed[idxD + 2]],
          });
        }
      }
    }

    this.crackSegments = cracks;
    return cracks;
  }

  computePointDisplacement(px: number, py: number, pz: number, time: number): number {
    const progress = Math.min(time / 50, 1);
    const displacement = progress * this.faultParams.maxDisplacement;
    const [sx, sy, sz] = this.computeSlipVector();
    const isHanging = this.isOnHangingWall(px, py, pz);
    const distToFault = Math.abs(this.signedDistanceToFaultPlane(px, py, pz));
    const influence = Math.max(0, 1 - distToFault / DEFORM_INFLUENCE_RADIUS);
    const smoothInfluence = influence * influence * (3 - 2 * influence);
    const sign = isHanging ? 1 : 0;
    const effectiveDisp = displacement * smoothInfluence * sign;
    const totalSlip = sx * effectiveDisp + sy * effectiveDisp + sz * effectiveDisp;
    return Math.abs(totalSlip);
  }

  computePointStress(px: number, py: number, pz: number, time: number): number {
    const progress = Math.min(time / 50, 1);
    const displacement = progress * this.faultParams.maxDisplacement;
    const isHanging = this.isOnHangingWall(px, py, pz);
    const distToFault = Math.abs(this.signedDistanceToFaultPlane(px, py, pz));
    const influence = Math.max(0, 1 - distToFault / DEFORM_INFLUENCE_RADIUS);
    const smoothInfluence = influence * influence * (3 - 2 * influence);
    const sign = isHanging ? 1 : -1;
    const gradientFactor = Math.max(0, 1 - distToFault / 30);
    return displacement * smoothInfluence * sign * gradientFactor * 2.5;
  }

  computePointEnergy(px: number, py: number, pz: number, time: number): number {
    const disp = this.computePointDisplacement(px, py, pz, time);
    const stress = this.computePointStress(px, py, pz, time);
    return 0.5 * disp * Math.abs(stress);
  }

  generateDefaultMeasurementPoints(): MeasurementPoint[] {
    const points: MeasurementPoint[] = [];
    const strikeRad = (this.faultParams.strike * Math.PI) / 180;
    const faultDirX = Math.cos(strikeRad);
    const faultDirZ = Math.sin(strikeRad);
    const perpX = -faultDirZ;
    const perpZ = faultDirX;

    const distances = [10, 30, 50];
    for (let d = 0; d < distances.length; d++) {
      const dist = distances[d];
      const sideSign = d % 2 === 0 ? 1 : -1;

      const hx = perpX * dist * 1;
      const hz = perpZ * dist * 1;
      const hy = fbm(hx / 40, hz / 40, 4, 42) * 8 - 4;
      points.push({
        id: `hanging-${d + 1}`,
        position: [hx, hy + 1, hz],
        displacement: 0,
        stress: 0,
        energy: 0,
        isUserAdded: false,
        createdAt: Date.now(),
        side: 'hanging',
      });

      const fx = perpX * dist * -1;
      const fz = perpZ * dist * -1;
      const fy = fbm(fx / 40, fz / 40, 4, 42) * 8 - 4;
      points.push({
        id: `footwall-${d + 1}`,
        position: [fx, fy + 1, fz],
        displacement: 0,
        stress: 0,
        energy: 0,
        isUserAdded: false,
        createdAt: Date.now(),
        side: 'footwall',
      });
    }

    return points;
  }

  updateMeasurementPoints(points: MeasurementPoint[], time: number): MeasurementPoint[] {
    return points.map(p => {
      const [px, py, pz] = p.position;
      const displacement = this.computePointDisplacement(px, py, pz, time);
      const stress = this.computePointStress(px, py, pz, time);
      const energy = this.computePointEnergy(px, py, pz, time);
      return { ...p, displacement, stress, energy };
    });
  }

  getTerrainElevation(x: number, z: number): number {
    return fbm(x / 40, z / 40, 4, 42) * 8 - 4;
  }

  findSurfacePoint(worldX: number, worldZ: number): [number, number, number] {
    const y = this.getTerrainElevation(worldX, worldZ);
    return [worldX, y, worldZ];
  }

  getBaseVertices(): Float32Array {
    return this.baseVertices;
  }

  getGridDimensions(): { width: number; height: number } {
    return { width: this.gridWidth, height: this.gridHeight };
  }

  getTerrainSize(): number {
    return TERRAIN_SIZE;
  }
}
