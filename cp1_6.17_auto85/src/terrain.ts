import * as THREE from 'three';

export class Terrain {
  public mesh: THREE.Mesh;
  public gridSize: number = 16;
  public cellSize: number = 1;
  public heights: number[][] = [];
  public deformRadius: number = 3;
  public deformAmount: number = 0.5;

  private geometry: THREE.PlaneGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private vertexCount: number;

  constructor() {
    this.vertexCount = (this.gridSize + 1) * (this.gridSize + 1);
    this.geometry = new THREE.PlaneGeometry(
      this.gridSize * this.cellSize,
      this.gridSize * this.cellSize,
      this.gridSize,
      this.gridSize
    );
    this.geometry.rotateX(-Math.PI / 2);

    this.positions = this.geometry.attributes.position.array as Float32Array;
    this.colors = new Float32Array(this.vertexCount * 3);

    this.initHeights();
    this.initColors();
    this.updateGeometryAttributes();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
  }

  private initHeights(): void {
    for (let z = 0; z <= this.gridSize; z++) {
      this.heights[z] = [];
      for (let x = 0; x <= this.gridSize; x++) {
        this.heights[z][x] = 0;
      }
    }
  }

  private initColors(): void {
    const baseColor = new THREE.Color(0x4caf50);
    for (let i = 0; i < this.vertexCount; i++) {
      this.colors[i * 3] = baseColor.r;
      this.colors[i * 3 + 1] = baseColor.g;
      this.colors[i * 3 + 2] = baseColor.b;
    }
  }

  private updateGeometryAttributes(): void {
    for (let z = 0; z <= this.gridSize; z++) {
      for (let x = 0; x <= this.gridSize; x++) {
        const index = z * (this.gridSize + 1) + x;
        this.positions[index * 3 + 1] = this.heights[z][x];
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.updateColors();
    this.updateNormals();
  }

  public deform(worldX: number, worldZ: number, direction: number): void {
    const halfSize = (this.gridSize * this.cellSize) / 2;
    const localX = worldX + halfSize;
    const localZ = worldZ + halfSize;

    const centerGridX = Math.round(localX / this.cellSize);
    const centerGridZ = Math.round(localZ / this.cellSize);

    const minX = Math.max(0, centerGridX - this.deformRadius);
    const maxX = Math.min(this.gridSize, centerGridX + this.deformRadius);
    const minZ = Math.max(0, centerGridZ - this.deformRadius);
    const maxZ = Math.min(this.gridSize, centerGridZ + this.deformRadius);

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerGridX;
        const dz = z - centerGridZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= this.deformRadius) {
          const falloff = this.cosineFalloff(distance / this.deformRadius);
          const delta = this.deformAmount * falloff * direction;
          this.heights[z][x] += delta;
          this.heights[z][x] = Math.max(-2, Math.min(3, this.heights[z][x]));

          const index = z * (this.gridSize + 1) + x;
          this.positions[index * 3 + 1] = this.heights[z][x];
        }
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.updateColors();
    this.updateNormals();
  }

  private cosineFalloff(t: number): number {
    return (1 + Math.cos(t * Math.PI)) / 2;
  }

  public updateColors(): void {
    const brownColor = new THREE.Color(0x8b4513);
    const greenColor = new THREE.Color(0x4caf50);
    const darkGreenColor = new THREE.Color(0x1b5e20);
    const whiteColor = new THREE.Color(0xffffff);

    const tempColor = new THREE.Color();

    for (let z = 0; z <= this.gridSize; z++) {
      for (let x = 0; x <= this.gridSize; x++) {
        const height = this.heights[z][x];
        const index = z * (this.gridSize + 1) + x;

        if (height > 0) {
          const t = Math.min(1, height / 2);
          tempColor.copy(greenColor).lerp(brownColor, t);
          if (height > 1.5) {
            const snowT = Math.min(1, (height - 1.5) / 1);
            tempColor.lerp(whiteColor, snowT);
          }
        } else {
          const t = Math.min(1, Math.abs(height) / 1.5);
          tempColor.copy(greenColor).lerp(darkGreenColor, t);
        }

        this.colors[index * 3] = tempColor.r;
        this.colors[index * 3 + 1] = tempColor.g;
        this.colors[index * 3 + 2] = tempColor.b;
      }
    }

    if (!this.geometry.getAttribute('color')) {
      this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    } else {
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  public updateNormals(): void {
    this.geometry.computeVertexNormals();
  }

  public getHeightAt(worldX: number, worldZ: number): number {
    const halfSize = (this.gridSize * this.cellSize) / 2;
    const localX = worldX + halfSize;
    const localZ = worldZ + halfSize;

    const gridX = localX / this.cellSize;
    const gridZ = localZ / this.cellSize;

    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    if (x0 < 0 || x1 > this.gridSize || z0 < 0 || z1 > this.gridSize) {
      return 0;
    }

    const fx = gridX - x0;
    const fz = gridZ - z0;

    const h00 = this.heights[z0][x0];
    const h10 = this.heights[z0][x1];
    const h01 = this.heights[z1][x0];
    const h11 = this.heights[z1][x1];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const height = h0 * (1 - fz) + h1 * fz;

    return height;
  }

  public getNormalAt(worldX: number, worldZ: number): THREE.Vector3 {
    const eps = 0.1;
    const hL = this.getHeightAt(worldX - eps, worldZ);
    const hR = this.getHeightAt(worldX + eps, worldZ);
    const hD = this.getHeightAt(worldX, worldZ - eps);
    const hU = this.getHeightAt(worldX, worldZ + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
    normal.normalize();
    return normal;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
