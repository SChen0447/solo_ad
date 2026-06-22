import * as THREE from 'three';
import {
  TerrainParams,
  GRID_SIZE,
  CELL_SIZE,
  TERRAIN_EXTENT,
  COLOR_LOW,
  COLOR_MID,
  COLOR_HIGH,
  COLOR_PEAK,
} from '../types';

class PerlinNoise {
  private perm: Uint8Array;

  constructor(seed: number) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    let s = Math.abs(seed) || 1;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
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
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  fbm(x: number, y: number, octaves: number, lacunarity: number, gain: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }
}

export class TerrainGenerator {
  private heightMap: Float32Array;
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.MeshPhongMaterial | null = null;
  private perlin: PerlinNoise | null = null;

  constructor() {
    this.heightMap = new Float32Array(GRID_SIZE * GRID_SIZE);
  }

  getHeightMap(): Float32Array {
    return this.heightMap;
  }

  getHeightAt(x: number, z: number): number {
    const halfExtent = TERRAIN_EXTENT / 2;
    const gx = Math.floor((x + halfExtent) / CELL_SIZE);
    const gz = Math.floor((z + halfExtent) / CELL_SIZE);

    if (gx < 0 || gx >= GRID_SIZE - 1 || gz < 0 || gz >= GRID_SIZE - 1) {
      return 0;
    }

    const i0 = gz * GRID_SIZE + gx;
    const i1 = gz * GRID_SIZE + gx + 1;
    const i2 = (gz + 1) * GRID_SIZE + gx;
    const i3 = (gz + 1) * GRID_SIZE + gx + 1;

    const fx = (x + halfExtent) / CELL_SIZE - gx;
    const fz = (z + halfExtent) / CELL_SIZE - gz;

    const h00 = this.heightMap[i0];
    const h10 = this.heightMap[i1];
    const h01 = this.heightMap[i2];
    const h11 = this.heightMap[i3];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  getSlopeAt(x: number, z: number): number {
    const delta = CELL_SIZE * 2;
    const hx = this.getHeightAt(x + delta, z) - this.getHeightAt(x - delta, z);
    const hz = this.getHeightAt(x, z + delta) - this.getHeightAt(x, z - delta);
    const dh = Math.sqrt(hx * hx + hz * hz);
    const dist = delta * 2;
    return Math.atan2(dh, dist) * (180 / Math.PI);
  }

  getGradientAt(x: number, z: number): { dx: number; dz: number } {
    const delta = CELL_SIZE * 2;
    const hx = this.getHeightAt(x + delta, z) - this.getHeightAt(x - delta, z);
    const hz = this.getHeightAt(x, z + delta) - this.getHeightAt(x, z - delta);
    const len = Math.sqrt(hx * hx + hz * hz) || 1;
    return { dx: -hx / len, dz: -hz / len };
  }

  generate(params: TerrainParams): THREE.Mesh {
    this.perlin = new PerlinNoise(params.seed);

    const octaves = Math.floor(3 + params.roughness * 5);
    const lacunarity = 2.0;
    const gain = 0.5 + params.roughness * 0.3;
    const scale = 0.02 + params.roughness * 0.04;
    const altitudeScale = params.altitude / 100;

    let minH = Infinity;
    let maxH = -Infinity;

    for (let gz = 0; gz < GRID_SIZE; gz++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const nx = gx * scale;
        const ny = gz * scale;
        let h = this.perlin.fbm(nx, ny, octaves, lacunarity, gain);
        h = (h + 1) * 0.5;

        if (params.erosion > 0) {
          const ridged = 1.0 - Math.abs(this.perlin.fbm(nx * 1.5, ny * 1.5, 3, lacunarity, gain));
          h = h * (1 - params.erosion * 0.6) + ridged * params.erosion * 0.6;

          const detail = this.perlin.fbm(nx * 4, ny * 4, 2, lacunarity, 0.3);
          h += detail * params.erosion * 0.15;
        }

        h *= altitudeScale * 10;

        const idx = gz * GRID_SIZE + gx;
        this.heightMap[idx] = h;

        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }

    const range = maxH - minH || 1;
    for (let i = 0; i < this.heightMap.length; i++) {
      this.heightMap[i] = ((this.heightMap[i] - minH) / range) * altitudeScale * 10;
    }

    return this.buildMesh();
  }

  private buildMesh(): THREE.Mesh {
    if (this.mesh) {
      this.geometry?.dispose();
      this.material?.dispose();
    }

    const segments = GRID_SIZE - 1;
    const halfExtent = TERRAIN_EXTENT / 2;

    this.geometry = new THREE.PlaneGeometry(
      TERRAIN_EXTENT,
      TERRAIN_EXTENT,
      segments,
      segments
    );
    this.geometry.rotateX(-Math.PI / 2);

    const positions = this.geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    const cLow = new THREE.Color(COLOR_LOW);
    const cMid = new THREE.Color(COLOR_MID);
    const cHigh = new THREE.Color(COLOR_HIGH);
    const cPeak = new THREE.Color(COLOR_PEAK);

    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      const h = this.heightMap[i];
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
    const range = maxH - minH || 1;

    for (let i = 0; i < positions.count; i++) {
      const y = this.heightMap[i];
      positions.setY(i, y);

      const t = (y - minH) / range;
      const color = new THREE.Color();

      if (t < 0.33) {
        color.lerpColors(cLow, cMid, t / 0.33);
      } else if (t < 0.66) {
        color.lerpColors(cMid, cHigh, (t - 0.33) / 0.33);
      } else {
        color.lerpColors(cHigh, cPeak, (t - 0.66) / 0.34);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.computeVertexNormals();
    positions.needsUpdate = true;

    this.material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: false,
      shininess: 10,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(0, 0, 0);
    this.mesh.receiveShadow = true;

    return this.mesh;
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
