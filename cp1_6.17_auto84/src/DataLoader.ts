import type {
  GeologyData,
  RockLayerData,
  RockLayerMeshData,
  OreBodyData,
  OreBodyMeshData
} from './types';
import geologyJson from './data/geologyData.json';

export class DataLoader {
  private data: GeologyData | null = null;

  public async load(): Promise<GeologyData> {
    this.data = geologyJson as unknown as GeologyData;
    return this.data;
  }

  public getData(): GeologyData {
    if (!this.data) {
      throw new Error('Data not loaded. Call load() first.');
    }
    return this.data;
  }

  public generateRockLayerMeshes(): RockLayerMeshData[] {
    if (!this.data) {
      throw new Error('Data not loaded. Call load() first.');
    }
    return this.data.rockLayers.map(layer => this.generateLayerGeometry(layer));
  }

  public generateOreBodyMesh(): OreBodyMeshData {
    if (!this.data) {
      throw new Error('Data not loaded. Call load() first.');
    }
    return this.generateOreGeometry(this.data.oreBody);
  }

  private pseudoNoise(x: number, z: number, freq: number, seed: number): number {
    const nx = x * freq + seed * 1.7;
    const nz = z * freq + seed * 2.3;
    return (
      Math.sin(nx) * Math.cos(nz) * 0.5 +
      Math.sin(nx * 2.1 + 0.5) * Math.cos(nz * 1.9 + 0.3) * 0.3 +
      Math.sin(nx * 0.7 + 1.2) * Math.cos(nz * 0.8 + 0.7) * 0.2
    );
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 1, g: 1, b: 1 };
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  }

  private lerpColor(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    return {
      r: c1.r + (c2.r - c1.r) * t,
      g: c1.g + (c2.g - c1.g) * t,
      b: c1.b + (c2.b - c1.b) * t
    };
  }

  private generateLayerGeometry(layer: RockLayerData): RockLayerMeshData {
    const N = layer.gridSize;
    const SIZE = 200;
    const HALF = SIZE / 2;
    const step = SIZE / (N - 1);
    const seed = layer.baseDepth * 0.013 + layer.amplitude;

    const topY: number[][] = [];
    for (let i = 0; i < N; i++) {
      topY[i] = [];
      for (let j = 0; j < N; j++) {
        const x = -HALF + j * step;
        const z = -HALF + i * step;
        const noise = this.pseudoNoise(x, z, layer.frequency, seed);
        topY[i][j] = -(layer.baseDepth + noise * layer.amplitude);
      }
    }

    const bottomY: number[][] = [];
    for (let i = 0; i < N; i++) {
      bottomY[i] = [];
      for (let j = 0; j < N; j++) {
        const x = -HALF + j * step;
        const z = -HALF + i * step;
        const noise = this.pseudoNoise(x, z, layer.frequency * 0.9, seed + 3.7);
        bottomY[i][j] = -(layer.baseDepth + layer.thickness + noise * layer.amplitude * 0.8);
      }
    }

    const vertsPerLayer = N * N;
    const totalVerts = vertsPerLayer * 2 + (N - 1) * 4;
    const vertices = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices: number[] = [];

    const colTop = this.hexToRgb(layer.colorTop);
    const colBot = this.hexToRgb(layer.colorBottom);

    let vIdx = 0;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = -HALF + j * step;
        const z = -HALF + i * step;
        vertices[vIdx * 3] = x;
        vertices[vIdx * 3 + 1] = topY[i][j];
        vertices[vIdx * 3 + 2] = z;
        const c = this.lerpColor(colTop, colBot, 0.05);
        colors[vIdx * 3] = c.r;
        colors[vIdx * 3 + 1] = c.g;
        colors[vIdx * 3 + 2] = c.b;
        vIdx++;
      }
    }
    const topStart = 0;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = -HALF + j * step;
        const z = -HALF + i * step;
        vertices[vIdx * 3] = x;
        vertices[vIdx * 3 + 1] = bottomY[i][j];
        vertices[vIdx * 3 + 2] = z;
        const c = this.lerpColor(colTop, colBot, 0.95);
        colors[vIdx * 3] = c.r;
        colors[vIdx * 3 + 1] = c.g;
        colors[vIdx * 3 + 2] = c.b;
        vIdx++;
      }
    }
    const botStart = vertsPerLayer;

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        const a = topStart + i * N + j;
        const b = topStart + i * N + j + 1;
        const c = topStart + (i + 1) * N + j;
        const d = topStart + (i + 1) * N + j + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    for (let i = 0; i < N - 1; i++) {
      for (let j = 0; j < N - 1; j++) {
        const a = botStart + i * N + j;
        const b = botStart + i * N + j + 1;
        const c = botStart + (i + 1) * N + j;
        const d = botStart + (i + 1) * N + j + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    for (let j = 0; j < N - 1; j++) {
      const t1 = topStart + j;
      const t2 = topStart + j + 1;
      const b1 = botStart + j;
      const b2 = botStart + j + 1;
      indices.push(t1, t2, b1);
      indices.push(t2, b2, b1);
    }

    for (let j = 0; j < N - 1; j++) {
      const row = N - 1;
      const t1 = topStart + row * N + j;
      const t2 = topStart + row * N + j + 1;
      const b1 = botStart + row * N + j;
      const b2 = botStart + row * N + j + 1;
      indices.push(t1, b1, t2);
      indices.push(t2, b1, b2);
    }

    for (let i = 0; i < N - 1; i++) {
      const t1 = topStart + i * N;
      const t2 = topStart + (i + 1) * N;
      const b1 = botStart + i * N;
      const b2 = botStart + (i + 1) * N;
      indices.push(t1, b1, t2);
      indices.push(t2, b1, b2);
    }

    for (let i = 0; i < N - 1; i++) {
      const col = N - 1;
      const t1 = topStart + i * N + col;
      const t2 = topStart + (i + 1) * N + col;
      const b1 = botStart + i * N + col;
      const b2 = botStart + (i + 1) * N + col;
      indices.push(t1, t2, b1);
      indices.push(t2, b2, b1);
    }

    this.computeNormals(vertices, new Uint32Array(indices), normals);

    return {
      id: layer.id,
      data: layer,
      vertices,
      indices: new Uint32Array(indices),
      colors,
      normals
    };
  }

  private generateOreGeometry(ore: OreBodyData): OreBodyMeshData {
    const { width, height } = ore.dimensions;
    const segmentsX = 36;
    const segmentsY = 20;

    const controlPts = ore.controlPoints.map(p => ({ ...p }));
    while (controlPts.length < segmentsX + 1) {
      const n = controlPts.length - 1;
      const newPts: typeof controlPts = [];
      for (let i = 0; i < n; i++) {
        newPts.push(controlPts[i]);
        newPts.push({
          x: (controlPts[i].x + controlPts[i + 1].x) / 2,
          y: (controlPts[i].y + controlPts[i + 1].y) / 2,
          z: (controlPts[i].z + controlPts[i + 1].z) / 2
        });
      }
      newPts.push(controlPts[n]);
      controlPts.splice(0, controlPts.length, ...newPts);
      if (controlPts.length >= segmentsX + 1) break;
    }

    const sampled: typeof controlPts = [];
    const ratio = (controlPts.length - 1) / segmentsX;
    for (let i = 0; i <= segmentsX; i++) {
      const idx = i * ratio;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, controlPts.length - 1);
      const t = idx - i0;
      sampled.push({
        x: controlPts[i0].x + (controlPts[i1].x - controlPts[i0].x) * t,
        y: controlPts[i0].y + (controlPts[i1].y - controlPts[i0].y) * t,
        z: controlPts[i0].z + (controlPts[i1].z - controlPts[i0].z) * t
      });
    }

    const vertCount = (segmentsX + 1) * (segmentsY + 1);
    const vertices = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const indices: number[] = [];

    let v = 0;
    for (let i = 0; i <= segmentsX; i++) {
      const cp = sampled[i];
      const taper = Math.sin((i / segmentsX) * Math.PI) * 0.6 + 0.4;
      const wEff = width * taper;
      const hEff = height * taper;
      for (let j = 0; j <= segmentsY; j++) {
        const angle = (j / segmentsY) * Math.PI * 2;
        const x = cp.x + Math.cos(angle) * wEff * 0.5;
        const y = cp.y + Math.sin(angle) * hEff * 0.5;
        const z = cp.z + Math.sin(i * 0.4) * wEff * 0.08;
        vertices[v * 3] = x;
        vertices[v * 3 + 1] = -y;
        vertices[v * 3 + 2] = z;
        v++;
      }
    }

    for (let i = 0; i < segmentsX; i++) {
      for (let j = 0; j < segmentsY; j++) {
        const a = i * (segmentsY + 1) + j;
        const b = a + 1;
        const c = a + (segmentsY + 1);
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    this.computeNormals(vertices, new Uint32Array(indices), normals);

    return {
      id: ore.id,
      data: ore,
      vertices,
      indices: new Uint32Array(indices),
      normals
    };
  }

  private computeNormals(
    vertices: Float32Array,
    indices: Uint32Array,
    normals: Float32Array
  ): void {
    const triCount = indices.length / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = indices[t * 3];
      const i1 = indices[t * 3 + 1];
      const i2 = indices[t * 3 + 2];

      const v0x = vertices[i0 * 3], v0y = vertices[i0 * 3 + 1], v0z = vertices[i0 * 3 + 2];
      const v1x = vertices[i1 * 3], v1y = vertices[i1 * 3 + 1], v1z = vertices[i1 * 3 + 2];
      const v2x = vertices[i2 * 3], v2y = vertices[i2 * 3 + 1], v2z = vertices[i2 * 3 + 2];

      const e1x = v1x - v0x, e1y = v1y - v0y, e1z = v1z - v0z;
      const e2x = v2x - v0x, e2y = v2y - v0y, e2z = v2z - v0z;

      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      normals[i0 * 3] += nx; normals[i0 * 3 + 1] += ny; normals[i0 * 3 + 2] += nz;
      normals[i1 * 3] += nx; normals[i1 * 3 + 1] += ny; normals[i1 * 3 + 2] += nz;
      normals[i2 * 3] += nx; normals[i2 * 3 + 1] += ny; normals[i2 * 3 + 2] += nz;
    }

    for (let i = 0; i < normals.length / 3; i++) {
      const nx = normals[i * 3];
      const ny = normals[i * 3 + 1];
      const nz = normals[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    }
  }
}
