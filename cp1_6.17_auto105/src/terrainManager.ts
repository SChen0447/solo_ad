import * as THREE from 'three';

export type TerrainEvent = 'heightChanged' | 'verticesUpdated';

export interface SamplePoint {
  x: number;
  z: number;
  height: number;
  distance: number;
  index?: number;
}

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback) {
    const listeners = this.events.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(...args));
    }
  }
}

export class TerrainManager extends EventEmitter {
  public readonly gridSize: number;
  public readonly segments: number;
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  public heights: Float32Array;
  public contourLines: THREE.LineSegments;
  private contourGeometry: THREE.BufferGeometry;
  private heightColors: Float32Array;

  constructor(gridSize: number = 20, segments: number = 20) {
    super();
    this.gridSize = gridSize;
    this.segments = segments;
    this.heights = new Float32Array((segments + 1) * (segments + 1));

    this.geometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    const positionAttr = this.geometry.getAttribute('position');
    this.heightColors = new Float32Array(positionAttr.count * 3);

    this.updateColors();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;

    this.contourGeometry = new THREE.BufferGeometry();
    this.contourLines = new THREE.LineSegments(
      this.contourGeometry,
      new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
        linewidth: 1
      })
    );
    this.contourLines.position.y = 0.01;
    this.updateContours();
  }

  private getColorForHeight(height: number): THREE.Color {
    const color = new THREE.Color();
    if (height < 0) {
      color.setHSL(0.35, 0.7, 0.15);
    } else if (height < 1.5) {
      const t = height / 1.5;
      color.setRGB(
        0.1 + t * 0.5,
        0.5 - t * 0.25,
        0.1 + t * 0.05
      );
    } else if (height < 3) {
      const t = (height - 1.5) / 1.5;
      color.setRGB(
        0.6 + t * 0.2,
        0.45 - t * 0.1,
        0.2 - t * 0.1
      );
    } else {
      const t = Math.min((height - 3) / 2, 1);
      color.setRGB(
        0.8 + t * 0.2,
        0.75 + t * 0.25,
        0.75 + t * 0.25
      );
    }
    return color;
  }

  public updateColors() {
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positionAttr.count; i++) {
      const h = positionAttr.getY(i);
      const color = this.getColorForHeight(h);
      this.heightColors[i * 3] = color.r;
      this.heightColors[i * 3 + 1] = color.g;
      this.heightColors[i * 3 + 2] = color.b;
    }
    if (this.geometry.getAttribute('color')) {
      (this.geometry.getAttribute('color') as THREE.BufferAttribute).array = this.heightColors;
      this.geometry.getAttribute('color').needsUpdate = true;
    } else {
      this.geometry.setAttribute('color', new THREE.BufferAttribute(this.heightColors, 3));
    }
  }

  public getVertexHeight(x: number, z: number): number {
    const halfSize = this.gridSize / 2;
    const col = Math.round((x + halfSize) / this.gridSize * this.segments);
    const row = Math.round((z + halfSize) / this.gridSize * this.segments);
    const clampedCol = Math.max(0, Math.min(this.segments, col));
    const clampedRow = Math.max(0, Math.min(this.segments, row));
    const idx = clampedRow * (this.segments + 1) + clampedCol;
    return this.heights[idx];
  }

  public getInterpolatedHeight(x: number, z: number): number {
    const halfSize = this.gridSize / 2;
    const fx = (x + halfSize) / this.gridSize * this.segments;
    const fz = (z + halfSize) / this.gridSize * this.segments;
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = Math.min(x0 + 1, this.segments);
    const z1 = Math.min(z0 + 1, this.segments);
    const tx = fx - x0;
    const tz = fz - z0;

    const h00 = this.heights[Math.max(0, z0) * (this.segments + 1) + Math.max(0, x0)];
    const h10 = this.heights[Math.max(0, z0) * (this.segments + 1) + x1];
    const h01 = this.heights[z1 * (this.segments + 1) + Math.max(0, x0)];
    const h11 = this.heights[z1 * (this.segments + 1) + x1];

    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    return h0 * (1 - tz) + h1 * tz;
  }

  public updateVertexHeight(col: number, row: number, newHeight: number, radius: number = 2) {
    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const halfSize = this.gridSize / 2;

    const minCol = Math.max(0, Math.floor(col - radius));
    const maxCol = Math.min(this.segments, Math.ceil(col + radius));
    const minRow = Math.max(0, Math.floor(row - radius));
    const maxRow = Math.min(this.segments, Math.ceil(row + radius));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const dist = Math.sqrt((c - col) ** 2 + (r - row) ** 2);
        if (dist <= radius) {
          const falloff = 1 - (dist / radius);
          const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
          const idx = r * (this.segments + 1) + c;
          const oldHeight = this.heights[idx];
          const targetHeight = newHeight;
          this.heights[idx] = oldHeight + (targetHeight - oldHeight) * smoothFalloff;
          positionAttr.setY(idx, this.heights[idx]);
        }
      }
    }

    positionAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.updateColors();
    this.updateContours();
    this.emit('heightChanged');
    this.emit('verticesUpdated');
  }

  public getVertexIndicesAt(x: number, z: number): { col: number; row: number } | null {
    const halfSize = this.gridSize / 2;
    const col = Math.round((x + halfSize) / this.gridSize * this.segments);
    const row = Math.round((z + halfSize) / this.gridSize * this.segments);
    if (col < 0 || col > this.segments || row < 0 || row > this.segments) return null;
    return { col, row };
  }

  public sampleProfile(points: THREE.Vector3[], step: number = 0.5): SamplePoint[] {
    if (points.length < 2) return [];

    const samples: SamplePoint[] = [];
    let totalDist = 0;
    let accumulated = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const segDist = p1.distanceTo(p2);

      while (accumulated <= totalDist + segDist) {
        const t = (accumulated - totalDist) / segDist;
        const x = p1.x + (p2.x - p1.x) * t;
        const z = p1.z + (p2.z - p1.z) * t;
        const height = this.getInterpolatedHeight(x, z);
        samples.push({ x, z, height, distance: accumulated });
        accumulated += step;
      }
      totalDist += segDist;
    }

    const lastP = points[points.length - 1];
    samples.push({
      x: lastP.x,
      z: lastP.z,
      height: this.getInterpolatedHeight(lastP.x, lastP.z),
      distance: totalDist
    });

    samples.forEach((s, i) => s.index = i);
    return samples;
  }

  public updateContours(interval: number = 0.5) {
    const vertices: number[] = [];
    const halfSize = this.gridSize / 2;
    const cellSize = this.gridSize / this.segments;

    for (let row = 0; row < this.segments; row++) {
      for (let col = 0; col < this.segments; col++) {
        const idx00 = row * (this.segments + 1) + col;
        const idx10 = idx00 + 1;
        const idx01 = idx00 + (this.segments + 1);
        const idx11 = idx01 + 1;

        const h00 = this.heights[idx00];
        const h10 = this.heights[idx10];
        const h01 = this.heights[idx01];
        const h11 = this.heights[idx11];

        const minH = Math.min(h00, h10, h01, h11);
        const maxH = Math.max(h00, h10, h01, h11);

        const startLevel = Math.ceil(minH / interval) * interval;
        for (let level = startLevel; level <= maxH; level += interval) {
          if (Math.abs(level) < 0.001) continue;

          const edges: { x1: number; z1: number; x2: number; z2: number }[] = [];

          if ((h00 - level) * (h10 - level) < 0) {
            const t = (level - h00) / (h10 - h00);
            edges.push({
              x1: -halfSize + col * cellSize + t * cellSize,
              z1: -halfSize + row * cellSize,
              x2: -halfSize + col * cellSize + t * cellSize,
              z2: -halfSize + row * cellSize
            });
          }

          if ((h10 - level) * (h11 - level) < 0) {
            const t = (level - h10) / (h11 - h10);
            edges.push({
              x1: -halfSize + (col + 1) * cellSize,
              z1: -halfSize + row * cellSize + t * cellSize,
              x2: -halfSize + (col + 1) * cellSize,
              z2: -halfSize + row * cellSize + t * cellSize
            });
          }

          if ((h01 - level) * (h11 - level) < 0) {
            const t = (level - h01) / (h11 - h01);
            edges.push({
              x1: -halfSize + col * cellSize + t * cellSize,
              z1: -halfSize + (row + 1) * cellSize,
              x2: -halfSize + col * cellSize + t * cellSize,
              z2: -halfSize + (row + 1) * cellSize
            });
          }

          if ((h00 - level) * (h01 - level) < 0) {
            const t = (level - h00) / (h01 - h00);
            edges.push({
              x1: -halfSize + col * cellSize,
              z1: -halfSize + row * cellSize + t * cellSize,
              x2: -halfSize + col * cellSize,
              z2: -halfSize + row * cellSize + t * cellSize
            });
          }

          if (edges.length >= 2) {
            vertices.push(
              edges[0].x1, level + 0.015, edges[0].z1,
              edges[1].x1, level + 0.015, edges[1].z1
            );
          }
        }
      }
    }

    this.contourGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
  }

  public getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const half = this.gridSize / 2;
    return { minX: -half, maxX: half, minZ: -half, maxZ: half };
  }
}
