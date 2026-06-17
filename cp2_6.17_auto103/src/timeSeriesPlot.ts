import * as THREE from 'three';
import { PerPointMetrics, TimeDomainMetric } from './dataParser';

interface DataPointInfo {
  index: number;
  interval: number;
  metrics: PerPointMetrics;
  position: THREE.Vector3;
}

export class TimeSeriesPlot {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private line!: THREE.Line;
  private pointsMesh!: THREE.InstancedMesh;
  private axesGroup: THREE.Group;
  private dataPointInfos: DataPointInfo[] = [];
  private currentMetric: TimeDomainMetric = 'sdnn';
  private hoveredIndex: number = -1;
  private dummy: THREE.Object3D;

  private readonly COLORS = {
    line: 0x00e5ff,
    point: 0xffffff,
    grid: 0xffffff,
    label: 0xa0a0c0
  };

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.axesGroup = new THREE.Group();
    this.group.add(this.axesGroup);
    this.scene.add(this.group);
    this.dummy = new THREE.Object3D();
  }

  public updateData(
    rrIntervals: number[],
    perPointMetrics: PerPointMetrics[],
    metric: TimeDomainMetric
  ): void {
    this.currentMetric = metric;
    this.clear();

    if (rrIntervals.length === 0) return;

    const maxPoints = 5000;
    const step = Math.max(1, Math.floor(rrIntervals.length / maxPoints));
    const sampledIndices: number[] = [];

    for (let i = 0; i < rrIntervals.length; i += step) {
      sampledIndices.push(i);
    }

    const positions: number[] = [];
    const colors: number[] = [];
    this.dataPointInfos = [];

    const xRange = sampledIndices.length - 1;
    const yMin = Math.min(...rrIntervals) - 50;
    const yMax = Math.max(...rrIntervals) + 50;
    const yRange = yMax - yMin;

    const metricValues = perPointMetrics.map(m => m[metric]);
    const zMin = Math.min(...metricValues) * 0.9;
    const zMax = Math.max(...metricValues) * 1.1;
    const zRange = zMax - zMin || 1;

    const xScale = 80 / Math.max(xRange, 1);
    const yScale = 40 / yRange;
    const zScale = 30 / zRange;

    for (let i = 0; i < sampledIndices.length; i++) {
      const idx = sampledIndices[i];
      const x = i * xScale - 40;
      const y = (rrIntervals[idx] - yMin) * yScale - 20;
      const z = (perPointMetrics[idx][metric] - zMin) * zScale - 15;

      positions.push(x, y, z);
      this.dataPointInfos.push({
        index: idx,
        interval: rrIntervals[idx],
        metrics: perPointMetrics[idx],
        position: new THREE.Vector3(x, y, z)
      });

      const alpha = i / sampledIndices.length;
      const r = 0;
      const g = (0.9 + alpha * 0.1);
      const b = (1 + alpha * 0.1);
      colors.push(r, g, b, 0.3 + alpha * 0.7);
    }

    this.createAxes(xRange, yRange, zRange, rrIntervals, yMin, zMin, metric);
    this.createLine(positions, colors);
    this.createPoints(positions);
  }

  private createLine(positions: number[], colors: number[]): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });

    this.line = new THREE.Line(geometry, material);
    this.group.add(this.line);
  }

  private createPoints(positions: number[]): void {
    const pointCount = positions.length / 3;
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: this.COLORS.point,
      transparent: true,
      opacity: 0.9
    });

    this.pointsMesh = new THREE.InstancedMesh(geometry, material, pointCount);
    this.pointsMesh.userData.isTimeSeriesPoint = true;

    for (let i = 0; i < pointCount; i++) {
      this.dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      this.dummy.updateMatrix();
      this.pointsMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.pointsMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.pointsMesh);
  }

  private createAxes(
    xRange: number,
    yRange: number,
    zRange: number,
    rrIntervals: number[],
    yMin: number,
    zMin: number,
    metric: TimeDomainMetric
  ): void {
    const xScale = 80 / Math.max(xRange, 1);
    const yScale = 40 / yRange;
    const zScale = 30 / (zRange || 1);

    this.createAxisLine(
      new THREE.Vector3(-40, -20, -15),
      new THREE.Vector3(40, -20, -15),
      '心跳序号',
      xRange,
      xScale,
      'x'
    );

    this.createAxisLine(
      new THREE.Vector3(-40, -20, -15),
      new THREE.Vector3(-40, 20, -15),
      '间隔 (ms)',
      yRange,
      yScale,
      'y',
      yMin
    );

    this.createAxisLine(
      new THREE.Vector3(-40, -20, -15),
      new THREE.Vector3(-40, -20, 15),
      metric.toUpperCase(),
      zRange,
      zScale,
      'z',
      zMin
    );

    this.createGridPlanes();
  }

  private createAxisLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    label: string,
    range: number,
    scale: number,
    direction: 'x' | 'y' | 'z',
    minValue: number = 0
  ): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: this.COLORS.grid,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.Line(geometry, material);
    this.axesGroup.add(line);

    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const t = i / tickCount;
      const value = minValue + t * range;

      const tickStart = start.clone();
      const tickEnd = start.clone();

      if (direction === 'x') {
        tickStart.x = start.x + t * (end.x - start.x);
        tickEnd.x = tickStart.x;
        tickEnd.y = start.y - 0.8;
      } else if (direction === 'y') {
        tickStart.y = start.y + t * (end.y - start.y);
        tickEnd.y = tickStart.y;
        tickEnd.x = start.x - 0.8;
      } else {
        tickStart.z = start.z + t * (end.z - start.z);
        tickEnd.z = tickStart.z;
        tickEnd.y = start.y - 0.8;
      }

      const tickGeom = new THREE.BufferGeometry().setFromPoints([tickStart, tickEnd]);
      const tickMat = new THREE.LineBasicMaterial({
        color: this.COLORS.grid,
        transparent: true,
        opacity: 0.4
      });
      const tickLine = new THREE.Line(tickGeom, tickMat);
      this.axesGroup.add(tickLine);

      const labelCanvas = this.createTextLabel(value.toFixed(0), 32);
      const labelTexture = new THREE.CanvasTexture(labelCanvas);
      const labelMat = new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true
      });
      const labelSprite = new THREE.Sprite(labelMat);
      labelSprite.scale.set(4, 2, 1);

      if (direction === 'x') {
        labelSprite.position.set(tickStart.x, start.y - 2.5, start.z);
      } else if (direction === 'y') {
        labelSprite.position.set(start.x - 3, tickStart.y, start.z);
      } else {
        labelSprite.position.set(start.x, start.y - 2.5, tickStart.z);
      }

      this.axesGroup.add(labelSprite);
    }

    const titleCanvas = this.createTextLabel(label, 40, '#00e5ff');
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMat = new THREE.SpriteMaterial({
      map: titleTexture,
      transparent: true
    });
    const titleSprite = new THREE.Sprite(titleMat);
    titleSprite.scale.set(8, 2.5, 1);

    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    if (direction === 'x') {
      titleSprite.position.set(midPoint.x, start.y - 5, start.z);
    } else if (direction === 'y') {
      titleSprite.position.set(start.x - 6, midPoint.y, start.z);
    } else {
      titleSprite.position.set(start.x, start.y - 5, midPoint.z);
    }
    this.axesGroup.add(titleSprite);
  }

  private createGridPlanes(): void {
    const gridSize = 80;
    const gridDivisions = 10;

    const xyGrid = new THREE.GridHelper(gridSize, gridDivisions, 0x444466, 0x333355);
    xyGrid.rotation.x = Math.PI / 2;
    xyGrid.position.set(0, -20, -15);
    (xyGrid.material as THREE.Material).transparent = true;
    (xyGrid.material as THREE.Material).opacity = 0.15;
    this.axesGroup.add(xyGrid);

    const xzGrid = new THREE.GridHelper(gridSize, gridDivisions, 0x444466, 0x333355);
    xzGrid.position.set(0, -20, 0);
    (xzGrid.material as THREE.Material).transparent = true;
    (xzGrid.material as THREE.Material).opacity = 0.15;
    this.axesGroup.add(xzGrid);

    const yzGrid = new THREE.GridHelper(30, gridDivisions, 0x444466, 0x333355);
    yzGrid.rotation.z = Math.PI / 2;
    yzGrid.position.set(-40, 0, 0);
    (yzGrid.material as THREE.Material).transparent = true;
    (yzGrid.material as THREE.Material).opacity = 0.15;
    this.axesGroup.add(yzGrid);
  }

  private createTextLabel(
    text: string,
    fontSize: number = 32,
    color: string = '#a0a0c0'
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.font = `bold ${fontSize}px Inter, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas;
  }

  public getPointInfo(index: number): DataPointInfo | null {
    if (index >= 0 && index < this.dataPointInfos.length) {
      return this.dataPointInfos[index];
    }
    return null;
  }

  public getPointsMesh(): THREE.InstancedMesh | null {
    return this.pointsMesh || null;
  }

  public setHoveredPoint(index: number): void {
    if (!this.pointsMesh) return;

    if (this.hoveredIndex >= 0 && this.hoveredIndex < this.pointsMesh.count) {
      this.dummy.scale.set(1, 1, 1);
      const info = this.dataPointInfos[this.hoveredIndex];
      if (info) {
        this.dummy.position.copy(info.position);
      }
      this.dummy.updateMatrix();
      this.pointsMesh.setMatrixAt(this.hoveredIndex, this.dummy.matrix);
      const color = new THREE.Color(this.COLORS.point);
      this.pointsMesh.setColorAt(this.hoveredIndex, color);
    }

    this.hoveredIndex = index;

    if (index >= 0 && index < this.pointsMesh.count) {
      this.dummy.scale.set(1.8, 1.8, 1.8);
      const info = this.dataPointInfos[index];
      if (info) {
        this.dummy.position.copy(info.position);
      }
      this.dummy.updateMatrix();
      this.pointsMesh.setMatrixAt(index, this.dummy.matrix);
      const color = new THREE.Color(0x00e5ff);
      this.pointsMesh.setColorAt(index, color);
    }

    this.pointsMesh.instanceMatrix.needsUpdate = true;
    if (this.pointsMesh.instanceColor) {
      this.pointsMesh.instanceColor.needsUpdate = true;
    }
  }

  private clear(): void {
    if (this.line) {
      this.group.remove(this.line);
      this.line.geometry.dispose();
      (this.line.material as THREE.Material).dispose();
    }

    if (this.pointsMesh) {
      this.group.remove(this.pointsMesh);
      this.pointsMesh.geometry.dispose();
      (this.pointsMesh.material as THREE.Material).dispose();
    }

    while (this.axesGroup.children.length > 0) {
      const child = this.axesGroup.children[0];
      this.axesGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    this.dataPointInfos = [];
    this.hoveredIndex = -1;
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}
