import * as THREE from 'three';
import { TerrainData } from '../city/Terrain.js';

export class HeatmapRenderer {
  private scene: THREE.Scene;
  private terrainData: TerrainData;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private data: number[][] = [];
  private resolutionScale: 1 | 2 = 1;
  private lowPerformanceMode = false;
  private gridSize = 16;
  private breathPhase = 0;

  private readonly BASE_SIZE = 0.5;
  private readonly SIZE_PER_100 = 0.5;
  private readonly MIN_OPACITY = 0.3;
  private readonly MAX_OPACITY = 0.7;
  private readonly BREATH_PERIOD = 1.2;

  private readonly LOW_THRESHOLD = 30;
  private readonly HIGH_THRESHOLD = 80;
  private readonly MIN_PEOPLE = 0;
  private readonly MAX_PEOPLE = 200;

  constructor(scene: THREE.Scene, terrainData: TerrainData) {
    this.scene = scene;
    this.terrainData = terrainData;
    this.createMesh();
  }

  private createMesh(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
    }

    const cols = Math.ceil(this.gridSize / this.resolutionScale);
    const rows = Math.ceil(this.gridSize / this.resolutionScale);
    const total = cols * rows;

    const planeGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    const colors = new Float32Array(total * 3);

    for (let i = 0; i < total; i++) {
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 1;
    }

    planeGeo.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.instancedMesh = new THREE.InstancedMesh(planeGeo, material, total);
    this.instancedMesh.count = total;
    this.instancedMesh.renderOrder = 10;
    this.scene.add(this.instancedMesh);

    this.refreshMesh();
  }

  updateData(data: number[][]): void {
    this.data = data;
    this.gridSize = data.length;

    if (this.lowPerformanceMode && this.resolutionScale !== 2) {
      this.resolutionScale = 2;
      this.createMesh();
    } else if (!this.lowPerformanceMode && this.resolutionScale !== 1) {
      this.resolutionScale = 1;
      this.createMesh();
    }

    this.refreshMesh();
  }

  setLowPerformanceMode(low: boolean): void {
    if (low !== this.lowPerformanceMode) {
      this.lowPerformanceMode = low;
      if (this.data.length > 0) {
        this.updateData(this.data);
      }
    }
  }

  getResolutionLabel(): string {
    return this.resolutionScale === 1 ? '1x1' : '2x2';
  }

  private refreshMesh(): void {
    if (!this.instancedMesh || this.data.length === 0) return;

    const scale = this.resolutionScale;
    const cols = Math.ceil(this.gridSize / scale);
    const rows = Math.ceil(this.gridSize / scale);
    const colorAttr = this.instancedMesh.geometry.getAttribute('color') as THREE.InstancedBufferAttribute;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const avgPeople = this.getAveragePeople(c * scale, r * scale, scale);
        const { x, z, height } = this.getBlockCenter(c * scale, r * scale, scale);
        const size = this.calculateSize(avgPeople);
        const color = this.getHeatColor(avgPeople);

        this.dummy.position.set(x, height + 0.15, z);
        this.dummy.rotation.x = -Math.PI / 2;
        this.dummy.scale.set(size, size, 1);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(idx, this.dummy.matrix);

        colorAttr.setXYZ(idx, color.r, color.g, color.b);
        idx++;
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  private getAveragePeople(startCol: number, startRow: number, scale: number): number {
    let sum = 0;
    let count = 0;

    for (let r = startRow; r < Math.min(startRow + scale, this.gridSize); r++) {
      for (let c = startCol; c < Math.min(startCol + scale, this.gridSize); c++) {
        if (this.data[r] && this.data[r][c] !== undefined) {
          sum += this.data[r][c];
          count++;
        }
      }
    }

    return count > 0 ? sum / count : 0;
  }

  private getBlockCenter(startCol: number, startRow: number, scale: number): { x: number; z: number; height: number } {
    let sumX = 0, sumZ = 0, sumH = 0, count = 0;

    const endCol = Math.min(startCol + scale, this.gridSize);
    const endRow = Math.min(startRow + scale, this.gridSize);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const pos = this.terrainData.getBlockWorldPosition(c, r);
        sumX += pos.x;
        sumZ += pos.z;
        sumH += pos.y;
        count++;
      }
    }

    return {
      x: sumX / count,
      z: sumZ / count,
      height: sumH / count
    };
  }

  private calculateSize(people: number): number {
    const bs = this.terrainData.blockSize * 0.8;
    const normalizedPeople = Math.max(this.MIN_PEOPLE, Math.min(this.MAX_PEOPLE, people));
    const sizeFactor = this.BASE_SIZE + (normalizedPeople / 100) * this.SIZE_PER_100;
    return bs * sizeFactor * 0.6;
  }

  private getHeatColor(people: number): THREE.Color {
    const normalized = Math.max(0, Math.min(1, (people - this.MIN_PEOPLE) / (this.MAX_PEOPLE - this.MIN_PEOPLE)));
    const h = THREE.MathUtils.lerp(240, 0, normalized);
    const s = 0.85;
    const l = THREE.MathUtils.lerp(0.65, 0.5, normalized);
    const color = new THREE.Color().setHSL(h / 360, s, l);
    return color;
  }

  update(elapsed: number): void {
    if (!this.instancedMesh) return;

    this.breathPhase = (elapsed % this.BREATH_PERIOD) / this.BREATH_PERIOD;
    const wave = Math.sin(this.breathPhase * Math.PI * 2);
    const opacity = this.MIN_OPACITY + (this.MAX_OPACITY - this.MIN_OPACITY) * (0.5 + 0.5 * wave);

    const mat = this.instancedMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
  }

  dispose(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
      this.instancedMesh = null;
    }
  }
}
