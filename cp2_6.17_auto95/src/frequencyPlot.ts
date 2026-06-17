import * as THREE from 'three';

export interface FrequencyBandState {
  vlf: boolean;
  lf: boolean;
  hf: boolean;
}

export class FrequencyPlot {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private barsGroup: THREE.Group;
  private ratioLine: THREE.Line | null = null;
  private axesGroup: THREE.Group;
  private barMeshes: THREE.Mesh[] = [];

  private colorLow = new THREE.Color(0x1e3a5f);
  private colorHigh = new THREE.Color(0xff6b6b);
  private colorRatio = new THREE.Color(0x4ade80);

  private maxPower: number = 1;
  private maxRatio: number = 1;

  private bands: FrequencyBandState = {
    vlf: true,
    lf: true,
    hf: true
  };

  private barWidth = 0.6;
  private barDepth = 0.8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.barsGroup = new THREE.Group();
    this.axesGroup = new THREE.Group();
    this.group.add(this.axesGroup);
    this.group.add(this.barsGroup);
    this.scene.add(this.group);

    this.group.position.set(8, 0, -5);
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setBands(bands: FrequencyBandState): void {
    this.bands = bands;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    this.barMeshes.forEach((mesh, index) => {
      const bandIndex = index % 3;
      if (bandIndex === 0) {
        mesh.visible = this.bands.vlf;
      } else if (bandIndex === 1) {
        mesh.visible = this.bands.lf;
      } else {
        mesh.visible = this.bands.hf;
      }
    });
  }

  updateData(
    vlf: number[],
    lf: number[],
    hf: number[],
    lfHfRatios: number[],
    numWindows: number = 5
  ): void {
    const startIdx = Math.max(0, vlf.length - numWindows);
    const vlfSlice = vlf.slice(startIdx);
    const lfSlice = lf.slice(startIdx);
    const hfSlice = hf.slice(startIdx);
    const ratioSlice = lfHfRatios.slice(startIdx);

    const allPowers = [...vlfSlice, ...lfSlice, ...hfSlice];
    this.maxPower = Math.max(...allPowers, 1);
    this.maxRatio = Math.max(...ratioSlice, 1);

    this.clearBars();
    this.drawAxes(vlfSlice.length);
    this.drawBars(vlfSlice, lfSlice, hfSlice);
    this.drawRatioLine(ratioSlice);
  }

  private clearBars(): void {
    while (this.barsGroup.children.length > 0) {
      const child = this.barsGroup.children[0];
      this.barsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.barMeshes = [];

    if (this.ratioLine) {
      this.barsGroup.remove(this.ratioLine);
      this.ratioLine.geometry.dispose();
      (this.ratioLine.material as THREE.Material).dispose();
      this.ratioLine = null;
    }
  }

  private drawAxes(numWindows: number): void {
    while (this.axesGroup.children.length > 0) {
      const child = this.axesGroup.children[0];
      this.axesGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).dispose();
      }
    }

    const xLen = 3;
    const yLen = 8;
    const zLen = numWindows;

    const axisMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });

    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1
    });

    const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(1.5, 0, 0)
    ]);
    this.axesGroup.add(new THREE.Line(xAxisGeom, axisMaterial));

    const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(-1.5, yLen, 0)
    ]);
    this.axesGroup.add(new THREE.Line(yAxisGeom, axisMaterial));

    const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.5, 0, 0),
      new THREE.Vector3(-1.5, 0, zLen - 1)
    ]);
    this.axesGroup.add(new THREE.Line(zAxisGeom, axisMaterial));

    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const yPos = (i / gridCount) * yLen;
      const gridGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.5, yPos, 0),
        new THREE.Vector3(1.5, yPos, 0),
        new THREE.Vector3(1.5, yPos, zLen - 1),
        new THREE.Vector3(-1.5, yPos, zLen - 1),
        new THREE.Vector3(-1.5, yPos, 0)
      ]);
      this.axesGroup.add(new THREE.Line(gridGeom, gridMaterial));
    }

    const bandLabels = ['VLF', 'LF', 'HF'];
    const xPositions = [-1, 0, 1];

    bandLabels.forEach((label, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#a0a0b0';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 32, 20);

      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true
      }));
      sprite.position.set(xPositions[i], -0.5, 0);
      sprite.scale.set(1.2, 0.6, 1);
      this.axesGroup.add(sprite);
    });

    const yCanvas = document.createElement('canvas');
    yCanvas.width = 128;
    yCanvas.height = 32;
    const yCtx = yCanvas.getContext('2d')!;
    yCtx.fillStyle = '#a0a0b0';
    yCtx.font = '10px Inter, sans-serif';
    yCtx.textAlign = 'center';
    yCtx.fillText('功率', 64, 20);

    const yTexture = new THREE.CanvasTexture(yCanvas);
    const ySprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: yTexture,
      transparent: true
    }));
    ySprite.position.set(-2.5, yLen / 2, 0);
    ySprite.scale.set(2, 0.5, 1);
    this.axesGroup.add(ySprite);

    const zCanvas = document.createElement('canvas');
    zCanvas.width = 128;
    zCanvas.height = 32;
    const zCtx = zCanvas.getContext('2d')!;
    zCtx.fillStyle = '#a0a0b0';
    zCtx.font = '10px Inter, sans-serif';
    zCtx.textAlign = 'center';
    zCtx.fillText('时间窗', 64, 20);

    const zTexture = new THREE.CanvasTexture(zCanvas);
    const zSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: zTexture,
      transparent: true
    }));
    zSprite.position.set(-1.5, -0.5, (zLen - 1) / 2);
    zSprite.scale.set(2, 0.5, 1);
    this.axesGroup.add(zSprite);
  }

  private getBarColor(normalizedValue: number): THREE.Color {
    const color = new THREE.Color();
    color.lerpColors(this.colorLow, this.colorHigh, Math.min(1, Math.max(0, normalizedValue)));
    return color;
  }

  private drawBars(vlf: number[], lf: number[], hf: number[]): void {
    const numWindows = vlf.length;
    const xPositions = [-1, 0, 1];

    for (let w = 0; w < numWindows; w++) {
      const zPos = w;
      const bands = [vlf[w], lf[w], hf[w]];

      for (let b = 0; b < 3; b++) {
        const power = bands[b];
        const height = (power / this.maxPower) * 8;
        const normalized = power / this.maxPower;

        const geometry = new THREE.BoxGeometry(this.barWidth, height, this.barDepth);
        const color = this.getBarColor(normalized);
        
        const material = new THREE.MeshPhongMaterial({
          color: color,
          transparent: true,
          opacity: 0.85,
          shininess: 50
        });

        const bar = new THREE.Mesh(geometry, material);
        bar.position.set(
          xPositions[b],
          height / 2,
          zPos
        );

        const edges = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.5
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        bar.add(edgeLines);

        this.barsGroup.add(bar);
        this.barMeshes.push(bar);
      }
    }

    this.updateVisibility();
  }

  private drawRatioLine(ratios: number[]): void {
    if (ratios.length < 2) return;

    const points: THREE.Vector3[] = [];

    for (let i = 0; i < ratios.length; i++) {
      const height = (ratios[i] / this.maxRatio) * 8 + 0.3;
      points.push(new THREE.Vector3(0.5, height, i));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: this.colorRatio,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });

    this.ratioLine = new THREE.Line(geometry, material);
    this.barsGroup.add(this.ratioLine);

    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32;
    dotCanvas.height = 32;
    const dotCtx = dotCanvas.getContext('2d')!;
    const gradient = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(74, 222, 128, 1)');
    gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
    dotCtx.fillStyle = gradient;
    dotCtx.fillRect(0, 0, 32, 32);

    const dotTexture = new THREE.CanvasTexture(dotCanvas);
    const dotMaterial = new THREE.PointsMaterial({
      size: 0.2,
      map: dotTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const dotPositions: number[] = [];
    for (let i = 0; i < points.length; i++) {
      dotPositions.push(points[i].x, points[i].y, points[i].z);
    }

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));

    const dots = new THREE.Points(dotGeometry, dotMaterial);
    this.ratioLine.add(dots);

    const legendCanvas = document.createElement('canvas');
    legendCanvas.width = 200;
    legendCanvas.height = 24;
    const legendCtx = legendCanvas.getContext('2d')!;
    legendCtx.fillStyle = '#4ade80';
    legendCtx.fillRect(0, 8, 20, 3);
    legendCtx.fillStyle = '#a0a0b0';
    legendCtx.font = '10px Inter, sans-serif';
    legendCtx.textAlign = 'left';
    legendCtx.fillText('LF/HF 比值', 30, 14);

    const legendTexture = new THREE.CanvasTexture(legendCanvas);
    const legendSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: legendTexture,
      transparent: true
    }));
    legendSprite.position.set(1, 8.5, ratios.length - 1);
    legendSprite.scale.set(2.5, 0.3, 1);
    this.barsGroup.add(legendSprite);
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.clearBars();
    while (this.axesGroup.children.length > 0) {
      const child = this.axesGroup.children[0];
      this.axesGroup.remove(child);
    }
    this.scene.remove(this.group);
  }
}
