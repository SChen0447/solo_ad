import * as THREE from 'three';
import { scaleLinear } from 'd3-scale';

export interface HeatmapConfig {
  gridSize: number;
  cellSize: number;
  minValue: number;
  maxValue: number;
}

export class HeatmapOverlay {
  public mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private canvas: HTMLCanvasElement;
  private texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private config: HeatmapConfig;
  private currentGrid: number[][];
  private targetGrid: number[][];
  private colorScale: (v: number) => string;

  constructor(config: HeatmapConfig) {
    this.config = config;
    this.colorScale = scaleLinear<string>()
      .domain([0, 2.5, 5, 7.5, 10])
      .range([
        'rgba(30, 144, 255, 0.72)',
        'rgba(0, 206, 209, 0.72)',
        'rgba(50, 205, 50, 0.72)',
        'rgba(255, 215, 0, 0.72)',
        'rgba(255, 69, 0, 0.72)',
      ])
      .clamp(true);

    const resolution = config.gridSize * config.cellSize;

    this.canvas = document.createElement('canvas');
    this.canvas.width = config.gridSize;
    this.canvas.height = config.gridSize;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    this.ctx = ctx;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.geometry = new THREE.PlaneGeometry(resolution, resolution, 1, 1);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.05;

    this.currentGrid = this.createEmptyGrid();
    this.targetGrid = this.createEmptyGrid();

    this.renderGrid(this.currentGrid);
  }

  private createEmptyGrid(): number[][] {
    const g: number[][] = [];
    for (let i = 0; i < this.config.gridSize; i++) {
      g[i] = new Array(this.config.gridSize).fill(0);
    }
    return g;
  }

  public update(speedGrid: number[][], smoothness: number = 0.12): void {
    for (let i = 0; i < this.config.gridSize; i++) {
      for (let j = 0; j < this.config.gridSize; j++) {
      const target = speedGrid[i] ? (speedGrid[i][j] ?? 0) : 0;
        this.targetGrid[i][j] = this.currentGrid[i][j] + (target - this.currentGrid[i][j]) * smoothness;
      }
    }

    const tmp = this.currentGrid;
    this.currentGrid = this.targetGrid;
    this.targetGrid = tmp;

    this.renderGrid(this.currentGrid);
    this.texture.needsUpdate = true;
  }

  private renderGrid(grid: number[][]): void {
    const ctx = this.ctx;
    const size = this.config.gridSize;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const v = grid[i][j];
        const rgba = this.parseRgba(this.colorScale(v));
        const flippedJ = size - 1 - j;
        const idx = (flippedJ * size + i) * 4;
        data[idx] = rgba.r;
        data[idx + 1] = rgba.g;
        data[idx + 2] = rgba.b;
        data[idx + 3] = rgba.a;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  private parseRgba(str: string): { r: number; g: number; b: number; a: number } {
    const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: Math.floor(parseFloat(match[4] ?? '1') * 255),
      };
    }
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  public getColorScale(): (v: number) => string {
    return this.colorScale;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
