import * as THREE from 'three';

interface BuildingData {
  x: number;
  z: number;
  height: number;
}

interface DrainOutletData {
  x: number;
  z: number;
  drainRate: number;
}

const GRID = 50;
const CELL_SIZE = 1.0;
const TERRAIN_OFFSET_X = -GRID * CELL_SIZE / 2;
const TERRAIN_OFFSET_Z = -GRID * CELL_SIZE / 2;
const HEIGHT_SCALE = 2.0;

export class TerrainRenderer {
  private scene: THREE.Scene;
  private terrainMesh!: THREE.Mesh;
  private waterMesh!: THREE.Mesh;
  private buildingMeshes: THREE.Mesh[] = [];
  private drainRings: THREE.Mesh[] = [];
  private terrainGeometry!: THREE.PlaneGeometry;
  private waterGeometry!: THREE.PlaneGeometry;
  private waterMaterial!: THREE.MeshPhongMaterial;
  private heightmap: Float32Array;
  private buildings: BuildingData[];
  private drainOutlets: DrainOutletData[];
  private clock: THREE.Clock;
  private prevAvgWater: number = 0;
  private smoothedColorT: number = 0;
  private targetColorT: number = 0;
  private trendHistory: number[] = [];
  private readonly TREND_WINDOW: number = 20;
  private accumulatedTrend: number = 0;
  private trendEma: number = 0;

  constructor(scene: THREE.Scene, heightmap: Float32Array, buildings: BuildingData[], drainOutlets: DrainOutletData[]) {
    this.scene = scene;
    this.heightmap = heightmap;
    this.buildings = buildings;
    this.drainOutlets = drainOutlets;
    this.clock = new THREE.Clock();

    this.createTerrain();
    this.createWater();
    this.createBuildings();
    this.createDrainOutlets();
  }

  private createTerrain(): void {
    this.terrainGeometry = new THREE.PlaneGeometry(
      GRID * CELL_SIZE,
      GRID * CELL_SIZE,
      GRID - 1,
      GRID - 1
    );
    this.terrainGeometry.rotateX(-Math.PI / 2);

    const positions = this.terrainGeometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const heightIdx = iz * GRID + ix;
      const h = this.heightmap[heightIdx] * HEIGHT_SCALE;

      positions.setY(i, h);

      const normalizedH = Math.min(1, Math.max(0, this.heightmap[heightIdx] / 5.0));
      const r = 0.76 * (1 - normalizedH) + 0.36 * normalizedH;
      const g = 0.70 * (1 - normalizedH) + 0.55 * normalizedH;
      const b = 0.50 * (1 - normalizedH) + 0.22 * normalizedH;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    this.terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.terrainGeometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, material);
    this.terrainMesh.position.set(0, 0, 0);
    this.scene.add(this.terrainMesh);
  }

  private createWater(): void {
    this.waterGeometry = new THREE.PlaneGeometry(
      GRID * CELL_SIZE,
      GRID * CELL_SIZE,
      GRID - 1,
      GRID - 1
    );
    this.waterGeometry.rotateX(-Math.PI / 2);

    this.waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x4488cc,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.waterMesh = new THREE.Mesh(this.waterGeometry, this.waterMaterial);
    this.waterMesh.position.set(0, 0, 0);
    this.scene.add(this.waterMesh);
  }

  private createBuildings(): void {
    for (const b of this.buildings) {
      const worldX = TERRAIN_OFFSET_X + b.x * CELL_SIZE + CELL_SIZE / 2;
      const worldZ = TERRAIN_OFFSET_Z + b.z * CELL_SIZE + CELL_SIZE / 2;
      const terrainIdx = b.z * GRID + b.x;
      const terrainH = this.heightmap[terrainIdx] * HEIGHT_SCALE;

      const heightScale = b.height;
      const normalizedH = Math.min(1, Math.max(0, heightScale / 8.0));
      const gray = 0.8 * (1 - normalizedH) + 0.4 * normalizedH;

      const geo = new THREE.BoxGeometry(0.8, heightScale, 0.8);
      const mat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(gray, gray, gray),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(worldX, terrainH + heightScale / 2, worldZ);
      this.scene.add(mesh);
      this.buildingMeshes.push(mesh);
    }
  }

  private createDrainOutlets(): void {
    for (const outlet of this.drainOutlets) {
      const worldX = TERRAIN_OFFSET_X + outlet.x * CELL_SIZE + CELL_SIZE / 2;
      const worldZ = TERRAIN_OFFSET_Z + outlet.z * CELL_SIZE + CELL_SIZE / 2;
      const terrainIdx = outlet.z * GRID + outlet.x;
      const terrainH = this.heightmap[terrainIdx] * HEIGHT_SCALE;

      const baseScale = 0.3 + outlet.drainRate * 0.2;
      const geo = new THREE.TorusGeometry(baseScale, 0.05, 8, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x00cc00,
        emissive: 0x003300,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(worldX, terrainH + 0.1, worldZ);
      this.scene.add(mesh);
      this.drainRings.push(mesh);
    }
  }

  updateWaterSurface(waterGrid: Float32Array, time: number): void {
    const positions = this.waterGeometry.attributes.position;
    let maxWater = 0;
    let avgWater = 0;
    let hasWater = false;
    let waterCount = 0;

    for (let i = 0; i < positions.count; i++) {
      const ix = i % GRID;
      const iz = Math.floor(i / GRID);
      const idx = iz * GRID + ix;
      const terrainH = this.heightmap[idx] * HEIGHT_SCALE;
      const waterH = waterGrid[idx] * HEIGHT_SCALE;
      const surfaceY = terrainH + waterH;

      positions.setY(i, surfaceY);

      if (waterH > 0.01) {
        hasWater = true;
        waterCount++;
        avgWater += waterH;
        if (waterH > maxWater) maxWater = waterH;

        const wave1 = Math.sin(time * 2.2 + ix * 0.35 + iz * 0.42) * 0.03 * Math.min(waterH, 1);
        const wave2 = Math.sin(time * 3.7 - ix * 0.22 + iz * 0.18) * 0.02 * Math.min(waterH, 1);
        const wave3 = Math.cos(time * 1.5 + ix * 0.5 - iz * 0.28 + Math.sin(ix * 0.1 + iz * 0.07) * 2.0) * 0.015 * Math.min(waterH, 1);
        positions.setY(i, surfaceY + wave1 + wave2 + wave3);
      }
    }

    if (waterCount > 0) avgWater /= waterCount;

    positions.needsUpdate = true;
    this.waterGeometry.computeVertexNormals();

    const rawTrend = avgWater - this.prevAvgWater;
    this.prevAvgWater = avgWater;

    this.trendHistory.push(rawTrend);
    this.accumulatedTrend += rawTrend;
    if (this.trendHistory.length > this.TREND_WINDOW) {
      const oldest = this.trendHistory.shift() as number;
      this.accumulatedTrend -= oldest;
    }
    const windowAvg = this.accumulatedTrend / Math.max(1, this.trendHistory.length);
    this.trendEma += (windowAvg - this.trendEma) * 0.15;
    const trend = this.trendEma;

    if (hasWater) {
      const absT = Math.min(1, maxWater / (3 * HEIGHT_SCALE));
      const trendGain = 15000;
      const trendBias = Math.max(-0.35, Math.min(0.35, trend * trendGain));
      this.targetColorT = Math.max(0, Math.min(1, absT + trendBias));

      const smoothSpeed = 0.1;
      this.smoothedColorT += (this.targetColorT - this.smoothedColorT) * smoothSpeed;

      const t = this.smoothedColorT;
      const hue = 210 + t * 30;
      const lightness = 80 - t * 40;
      const color = new THREE.Color(`hsl(${hue}, 70%, ${lightness}%)`);
      this.waterMaterial.color.copy(color);
      this.waterMaterial.opacity = 0.3 + t * 0.45;
    } else {
      this.prevAvgWater = 0;
      this.targetColorT = 0;
      this.smoothedColorT = 0;
      this.trendHistory.length = 0;
      this.accumulatedTrend = 0;
      this.trendEma = 0;
      this.waterMaterial.opacity = 0;
    }
  }

  updateDrainOutlets(waterGrid: Float32Array, time: number): void {
    for (let i = 0; i < this.drainRings.length; i++) {
      const ring = this.drainRings[i];
      const outlet = this.drainOutlets[i];
      ring.rotation.z = time * Math.PI * 2;

      const idx = outlet.z * GRID + outlet.x;
      const waterH = waterGrid[idx];
      const isActive = waterH > 0.001;

      const mat = ring.material as THREE.MeshPhongMaterial;
      if (isActive) {
        mat.color.set(0x00cc00);
        const glowIntensity = Math.min(1.0, Math.max(-0.5, waterH * 10 - 0.5));
        mat.emissive.setRGB(0, glowIntensity, 0);
      } else {
        mat.color.set(0x666666);
        mat.emissive.setRGB(0.1, 0.1, 0.1);
      }

      const scale = 0.3 + outlet.drainRate * 0.2;
      ring.scale.set(scale, scale, scale);
    }
  }

  worldToGrid(worldX: number, worldZ: number): { x: number; z: number } {
    const gx = Math.floor((worldX - TERRAIN_OFFSET_X) / CELL_SIZE);
    const gz = Math.floor((worldZ - TERRAIN_OFFSET_Z) / CELL_SIZE);
    return { x: gx, z: gz };
  }

  gridToWorld(gx: number, gz: number): { x: number; z: number } {
    return {
      x: TERRAIN_OFFSET_X + gx * CELL_SIZE + CELL_SIZE / 2,
      z: TERRAIN_OFFSET_Z + gz * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  getTerrainHeightAt(gx: number, gz: number): number {
    if (gx < 0 || gx >= GRID || gz < 0 || gz >= GRID) return 0;
    return this.heightmap[gz * GRID + gx] * HEIGHT_SCALE;
  }
}
