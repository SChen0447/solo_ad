import * as THREE from 'three';

export interface SculptureParams {
  rotationSpeed: number;
  distortionStrength: number;
  colorOffset: number;
  particleDensity: number;
}

export class ParametricSculpture {
  public mesh: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  private vertexCount: number;
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private colors: Float32Array;
  private originalSizes: Float32Array;
  private sizes: Float32Array;
  private dataSequence: number[];
  private params: SculptureParams;
  private time: number = 0;
  private highlightedVertex: number = -1;

  constructor(vertexCount: number = 2000, params: SculptureParams) {
    this.vertexCount = vertexCount;
    this.params = { ...params };
    this.dataSequence = new Array(100).fill(0.5);

    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(vertexCount * 3);
    this.currentPositions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);
    this.originalSizes = new Float32Array(vertexCount);
    this.sizes = new Float32Array(vertexCount);

    this.generateBaseGeometry();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.updateColors();
  }

  private generateBaseGeometry(): void {
    const rows = Math.ceil(Math.sqrt(this.vertexCount * 1.5));
    const cols = Math.ceil(this.vertexCount / rows);
    const actualCount = rows * cols;
    this.vertexCount = Math.min(actualCount, this.vertexCount);

    const radius = 5;
    const height = 4;

    for (let i = 0; i < this.vertexCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const u = col / (cols - 1);
      const v = row / (rows - 1);

      const angle = u * Math.PI * 4;
      const spiralRadius = radius * (0.3 + v * 0.7);
      const y = (v - 0.5) * height;

      const wave = Math.sin(v * Math.PI * 3) * 0.5;

      const x = Math.cos(angle) * (spiralRadius + wave);
      const z = Math.sin(angle) * (spiralRadius + wave);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.currentPositions[i * 3] = x;
      this.currentPositions[i * 3 + 1] = y;
      this.currentPositions[i * 3 + 2] = z;

      this.originalSizes[i] = 2;
      this.sizes[i] = 2;
    }

    if (this.basePositions.length !== this.vertexCount * 3) {
      this.basePositions = this.basePositions.slice(0, this.vertexCount * 3);
      this.currentPositions = this.currentPositions.slice(0, this.vertexCount * 3);
      this.colors = this.colors.slice(0, this.vertexCount * 3);
      this.originalSizes = this.originalSizes.slice(0, this.vertexCount);
      this.sizes = this.sizes.slice(0, this.vertexCount);
    }
  }

  public updateParams(params: Partial<SculptureParams>): void {
    this.params = { ...this.params, ...params };
  }

  public updateData(data: number[]): void {
    this.dataSequence = [...data];
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    const dataValue = this.dataSequence.length > 0 ? this.dataSequence[this.dataSequence.length - 1] : 0.5;

    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const bx = this.basePositions[idx];
      const by = this.basePositions[idx + 1];
      const bz = this.basePositions[idx + 2];

      const distFromCenter = Math.sqrt(bx * bx + bz * bz);
      const normalizedHeight = (by + 2) / 4;
      const dataIndex = Math.floor(normalizedHeight * (this.dataSequence.length - 1));
      const dataInfluence = this.dataSequence[Math.max(0, Math.min(this.dataSequence.length - 1, dataIndex))] || 0.5;

      const distortion = this.params.distortionStrength * dataInfluence;
      const waveFreq = 2 + dataInfluence * 3;

      const waveX = Math.sin(distFromCenter * waveFreq + this.time * this.params.rotationSpeed) * distortion * 0.3;
      const waveY = Math.cos(distFromCenter * waveFreq * 0.7 + this.time * this.params.rotationSpeed * 0.8) * distortion * 0.5;
      const waveZ = Math.sin(distFromCenter * waveFreq * 1.3 + this.time * this.params.rotationSpeed * 0.6) * distortion * 0.3;

      const particleOffset = (1 - this.params.particleDensity / 100) * 0;

      this.currentPositions[idx] = bx + waveX + particleOffset;
      this.currentPositions[idx + 1] = by + waveY;
      this.currentPositions[idx + 2] = bz + waveZ + particleOffset;

      this.sizes[i] = this.originalSizes[i] * (0.5 + dataInfluence * 0.5 + this.params.particleDensity / 200);

      if (i === this.highlightedVertex) {
        this.sizes[i] = 6;
      }
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;

    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;

    this.updateColors();
  }

  private updateColors(): void {
    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const y = this.currentPositions[idx + 1];

      const normalizedY = (y + 3) / 6;
      const adjustedY = Math.max(0, Math.min(1, normalizedY + this.params.colorOffset - 0.5));

      const r = adjustedY;
      const g = adjustedY * 0.6 + 0.1;
      const b = 1 - adjustedY * 0.7;

      const goldR = 1;
      const goldG = 0.65;
      const goldB = 0;

      const deepBlueR = 0.1;
      const deepBlueG = 0.2;
      const deepBlueB = 0.5;

      const t = adjustedY;
      const finalR = deepBlueR + (goldR - deepBlueR) * t;
      const finalG = deepBlueG + (goldG - deepBlueG) * t;
      const finalB = deepBlueB + (goldB - deepBlueB) * t;

      if (i === this.highlightedVertex) {
        this.colors[idx] = 1;
        this.colors[idx + 1] = 1;
        this.colors[idx + 2] = 1;
      } else {
        this.colors[idx] = finalR;
        this.colors[idx + 1] = finalG;
        this.colors[idx + 2] = finalB;
      }
    }

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
  }

  public highlightVertex(index: number): void {
    if (this.highlightedVertex === index) return;

    if (this.highlightedVertex >= 0 && this.highlightedVertex < this.vertexCount) {
      this.sizes[this.highlightedVertex] = this.originalSizes[this.highlightedVertex];
    }

    this.highlightedVertex = index;

    if (index >= 0 && index < this.vertexCount) {
      this.sizes[index] = 6;
    }

    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;
    this.updateColors();
  }

  public getVertexCount(): number {
    return this.vertexCount;
  }

  public getVertexDataValue(index: number): number {
    if (index < 0 || index >= this.vertexCount) return 0;
    const y = this.currentPositions[index * 3 + 1];
    return (y + 3) / 6;
  }

  public setVertexCount(count: number): void {
    if (count === this.vertexCount) return;
    
    const oldCount = this.vertexCount;
    this.vertexCount = Math.max(100, count);

    this.basePositions = new Float32Array(this.vertexCount * 3);
    this.currentPositions = new Float32Array(this.vertexCount * 3);
    this.colors = new Float32Array(this.vertexCount * 3);
    this.originalSizes = new Float32Array(this.vertexCount);
    this.sizes = new Float32Array(this.vertexCount);

    this.generateBaseGeometry();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.updateColors();
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
