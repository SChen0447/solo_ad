import * as THREE from 'three';

export interface TimeSeriesPoint {
  index: number;
  rrInterval: number;
  metricValue: number;
}

export class TimeSeriesPlot {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private line: THREE.Line | null = null;
  private pointsMesh: THREE.Points | null = null;
  private axesGroup: THREE.Group;
  private dataPoints: TimeSeriesPoint[] = [];
  private xRange: [number, number] = [0, 100];
  private yRange: [number, number] = [0, 1500];
  private zRange: [number, number] = [0, 100];
  private pointSprites: THREE.Sprite[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoverIndex: number = -1;

  private COLOR_LINE = 0x00e5ff;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.axesGroup = new THREE.Group();
    this.group.add(this.axesGroup);
    this.scene.add(this.group);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.group.position.set(-8, 0, -5);
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  updateData(rrIntervals: number[], metricValues: number[]): void {
    this.dataPoints = rrIntervals.map((rr, i) => ({
      index: i,
      rrInterval: rr,
      metricValue: metricValues[i] || 0
    }));

    if (this.dataPoints.length === 0) return;

    this.xRange = [0, this.dataPoints.length - 1];
    this.yRange = [
      Math.min(...rrIntervals) * 0.9,
      Math.max(...rrIntervals) * 1.1
    ];
    this.zRange = [
      Math.min(...metricValues) * 0.9,
      Math.max(...metricValues) * 1.1 || 1
    ];

    if (this.zRange[0] === this.zRange[1]) {
      this.zRange = [0, this.zRange[1] * 2 || 1];
    }

    this.drawAxes();
    this.drawLine();
    this.drawPoints();
  }

  private drawAxes(): void {
    while (this.axesGroup.children.length > 0) {
      const child = this.axesGroup.children[0];
      this.axesGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const xLen = this.xRange[1] - this.xRange[0];
    const yLen = this.yRange[1] - this.yRange[0];
    const zLen = this.zRange[1] - this.zRange[0];

    const scale = 10 / Math.max(xLen, yLen, zLen);
    const xScaled = xLen * scale;
    const yScaled = yLen * scale;
    const zScaled = zLen * scale;

    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15
    });

    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const yPos = (i / gridCount) * yScaled;
      const zPos = (i / gridCount) * zScaled;

      const xGridGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, yPos, 0),
        new THREE.Vector3(xScaled, yPos, 0)
      ]);
      this.axesGroup.add(new THREE.Line(xGridGeom, gridMaterial));

      const zGridGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, yPos, 0),
        new THREE.Vector3(0, yPos, zScaled)
      ]);
      this.axesGroup.add(new THREE.Line(zGridGeom, gridMaterial));

      const xzGridGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3((i / gridCount) * xScaled, 0, 0),
        new THREE.Vector3((i / gridCount) * xScaled, 0, zScaled)
      ]);
      this.axesGroup.add(new THREE.Line(xzGridGeom, gridMaterial));
    }

    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });

    const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(xScaled, 0, 0)
    ]);
    this.axesGroup.add(new THREE.Line(xAxisGeom, axisMaterial));

    const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, yScaled, 0)
    ]);
    this.axesGroup.add(new THREE.Line(yAxisGeom, axisMaterial));

    const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, zScaled)
    ]);
    this.axesGroup.add(new THREE.Line(zAxisGeom, axisMaterial));

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 32;
    const labelCtx = labelCanvas.getContext('2d')!;
    labelCtx.fillStyle = '#a0a0b0';
    labelCtx.font = '11px Inter, sans-serif';
    labelCtx.textAlign = 'center';
    labelCtx.fillText('心跳序号', 64, 20);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true
    }));
    labelSprite.position.set(xScaled / 2, -0.8, 0);
    labelSprite.scale.set(3, 0.75, 1);
    this.axesGroup.add(labelSprite);

    const yLabelCanvas = document.createElement('canvas');
    yLabelCanvas.width = 128;
    yLabelCanvas.height = 32;
    const yLabelCtx = yLabelCanvas.getContext('2d')!;
    yLabelCtx.fillStyle = '#a0a0b0';
    yLabelCtx.font = '11px Inter, sans-serif';
    yLabelCtx.textAlign = 'center';
    yLabelCtx.fillText('RR间期 (ms)', 64, 20);

    const yLabelTexture = new THREE.CanvasTexture(yLabelCanvas);
    const yLabelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: yLabelTexture,
      transparent: true
    }));
    yLabelSprite.position.set(-1.5, yScaled / 2, 0);
    yLabelSprite.scale.set(3, 0.75, 1);
    this.axesGroup.add(yLabelSprite);
  }

  private drawLine(): void {
    if (this.line) {
      this.group.remove(this.line);
      this.line.geometry.dispose();
      (this.line.material as THREE.Material).dispose();
      this.line = null;
    }

    if (this.dataPoints.length < 2) return;

    const xLen = this.xRange[1] - this.xRange[0];
    const yLen = this.yRange[1] - this.yRange[0];
    const zLen = this.zRange[1] - this.zRange[0];
    const scale = 10 / Math.max(xLen, yLen, zLen);

    const positions: number[] = [];
    const colors: number[] = [];

    const color = new THREE.Color(this.COLOR_LINE);

    for (let i = 0; i < this.dataPoints.length; i++) {
      const point = this.dataPoints[i];
      const x = (point.index - this.xRange[0]) * scale;
      const y = (point.rrInterval - this.yRange[0]) * scale;
      const z = (point.metricValue - this.zRange[0]) * scale;

      positions.push(x, y, z);

      const alpha = 0.3 + 0.7 * (i / this.dataPoints.length);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });

    this.line = new THREE.Line(geometry, material);
    this.group.add(this.line);
  }

  private drawPoints(): void {
    if (this.pointsMesh) {
      this.group.remove(this.pointsMesh);
      this.pointsMesh.geometry.dispose();
      (this.pointsMesh.material as THREE.Material).dispose();
      this.pointsMesh = null;
    }

    if (this.dataPoints.length === 0) return;

    const xLen = this.xRange[1] - this.xRange[0];
    const yLen = this.yRange[1] - this.yRange[0];
    const zLen = this.zRange[1] - this.zRange[0];
    const scale = 10 / Math.max(xLen, yLen, zLen);

    const positions: number[] = [];
    const sizes: number[] = [];

    const step = Math.max(1, Math.floor(this.dataPoints.length / 500));

    for (let i = 0; i < this.dataPoints.length; i += step) {
      const point = this.dataPoints[i];
      const x = (point.index - this.xRange[0]) * scale;
      const y = (point.rrInterval - this.yRange[0]) * scale;
      const z = (point.metricValue - this.zRange[0]) * scale;

      positions.push(x, y, z);
      sizes.push(3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.15,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.pointsMesh = new THREE.Points(geometry, material);
    this.group.add(this.pointsMesh);
  }

  checkHover(mouseX: number, mouseY: number, camera: THREE.Camera): TimeSeriesPoint | null {
    if (!this.pointsMesh || this.dataPoints.length === 0) return null;

    this.mouse.set(mouseX, mouseY);
    this.raycaster.setFromCamera(this.mouse, camera);

    const intersects = this.raycaster.intersectObject(this.pointsMesh);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const step = Math.max(1, Math.floor(this.dataPoints.length / 500));
      const dataIndex = intersects[0].index * step;
      if (dataIndex < this.dataPoints.length) {
        this.hoverIndex = dataIndex;
        return this.dataPoints[dataIndex];
      }
    }

    this.hoverIndex = -1;
    return null;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    if (this.line) {
      this.line.geometry.dispose();
      (this.line.material as THREE.Material).dispose();
    }
    if (this.pointsMesh) {
      this.pointsMesh.geometry.dispose();
      (this.pointsMesh.material as THREE.PointsMaterial).dispose();
    }
    this.scene.remove(this.group);
  }
}
