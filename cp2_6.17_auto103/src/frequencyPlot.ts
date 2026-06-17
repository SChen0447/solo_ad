import * as THREE from 'three';
import { WindowedFrequencyData } from './dataParser';

interface BarData {
  band: 'vlf' | 'lf' | 'hf';
  windowIndex: number;
  value: number;
  position: THREE.Vector3;
  height: number;
}

export interface BandVisibility {
  vlf: boolean;
  lf: boolean;
  hf: boolean;
}

export class FrequencyPlot {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private barsGroup: THREE.Group;
  private ratioLine!: THREE.Line;
  private axesGroup: THREE.Group;
  private barData: BarData[] = [];

  private readonly BAND_COLORS_LOW = new THREE.Color(0x1e3a5f);
  private readonly BAND_COLORS_HIGH = new THREE.Color(0xff6b6b);
  private readonly RATIO_COLOR = 0x4ade80;

  private readonly BAR_WIDTH = 2;
  private readonly BAR_DEPTH = 2;
  private readonly BAND_SPACING = 3;
  private readonly WINDOW_SPACING = 4;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.barsGroup = new THREE.Group();
    this.axesGroup = new THREE.Group();
    this.group.add(this.barsGroup);
    this.group.add(this.axesGroup);
    this.scene.add(this.group);
  }

  public updateData(
    frequencyData: WindowedFrequencyData[],
    visibility: BandVisibility
  ): void {
    this.visibility = visibility;
    this.clear();

    if (frequencyData.length === 0) return;

    const allValues: number[] = [];
    frequencyData.forEach(d => {
      if (visibility.vlf) allValues.push(d.bands.vlf);
      if (visibility.lf) allValues.push(d.bands.lf);
      if (visibility.hf) allValues.push(d.bands.hf);
    });

    if (allValues.length === 0) return;

    const maxPower = Math.max(...allValues) * 1.1;
    const minPower = 0;
    const powerRange = maxPower - minPower || 1;

    const yScale = 30 / powerRange;

    const visibleBands: ('vlf' | 'lf' | 'hf')[] = [];
    if (visibility.vlf) visibleBands.push('vlf');
    if (visibility.lf) visibleBands.push('lf');
    if (visibility.hf) visibleBands.push('hf');

    const totalWidth = visibleBands.length * this.BAND_WIDTH +
      (visibleBands.length - 1) * this.BAND_SPACING;
    const totalDepth = frequencyData.length * this.BAR_DEPTH +
      (frequencyData.length - 1) * this.WINDOW_SPACING;

    const xOffset = -totalWidth / 2;
    const zOffset = -totalDepth / 2;

    for (let w = 0; w < frequencyData.length; w++) {
      const windowData = frequencyData[w];
      let bandIdx = 0;

      if (visibility.vlf) {
        this.createBar('vlf', w, windowData.bands.vlf, bandIdx, w, xOffset, zOffset, yScale, maxPower);
        bandIdx++;
      }
      if (visibility.lf) {
        this.createBar('lf', w, windowData.bands.lf, bandIdx, w, xOffset, zOffset, yScale, maxPower);
        bandIdx++;
      }
      if (visibility.hf) {
        this.createBar('hf', w, windowData.bands.hf, bandIdx, w, xOffset, zOffset, yScale, maxPower);
        bandIdx++;
      }
    }

    this.createRatioLine(frequencyData, yScale, xOffset, zOffset, visibleBands);
    this.createAxes(frequencyData.length, maxPower, visibleBands, xOffset, zOffset, totalWidth, totalDepth);
    this.createFloorGrid(totalWidth, totalDepth);
  }

  private createBar(
    band: 'vlf' | 'lf' | 'hf',
    windowIndex: number,
    value: number,
    bandPosIndex: number,
    windowPosIndex: number,
    xOffset: number,
    zOffset: number,
    yScale: number,
    maxPower: number
  ): void {
    const height = Math.max(value * yScale, 0.1);
    const x = xOffset + bandPosIndex * (this.BAR_WIDTH + this.BAND_SPACING) + this.BAR_WIDTH / 2;
    const z = zOffset + windowPosIndex * (this.BAR_DEPTH + this.WINDOW_SPACING) + this.BAR_DEPTH / 2;
    const y = height / 2;

    const geometry = new THREE.BoxGeometry(this.BAR_WIDTH, height, this.BAR_DEPTH);

    const t = value / maxPower;
    const color = this.BAND_COLORS_LOW.clone().lerp(this.BAND_COLORS_HIGH, t);

    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      shininess: 50,
      specular: 0x333333
    });

    const bar = new THREE.Mesh(geometry, material);
    bar.position.set(x, y, z);
    bar.userData = { band, windowIndex, value };

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.3
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    bar.add(edgeLines);

    this.barsGroup.add(bar);

    this.barData.push({
      band,
      windowIndex,
      value,
      position: new THREE.Vector3(x, height, z),
      height
    });
  }

  private createRatioLine(
    frequencyData: WindowedFrequencyData[],
    yScale: number,
    xOffset: number,
    zOffset: number,
    visibleBands: ('vlf' | 'lf' | 'hf')[]
  ): void {
    const positions: number[] = [];
    const totalWidth = visibleBands.length * this.BAR_WIDTH +
      (visibleBands.length - 1) * this.BAND_SPACING;

    const maxRatio = Math.max(...frequencyData.map(d => d.bands.lfHfRatio)) * 1.2;
    const ratioYScale = 30 / (maxRatio || 1);

    for (let w = 0; w < frequencyData.length; w++) {
      const ratio = frequencyData[w].bands.lfHfRatio;
      const x = xOffset + totalWidth + 1;
      const z = zOffset + w * (this.BAR_DEPTH + this.WINDOW_SPACING) + this.BAR_DEPTH / 2;
      const y = ratio * ratioYScale;

      positions.push(x, y, z);
    }

    if (positions.length >= 3) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: this.RATIO_COLOR,
        transparent: true,
        opacity: 0.9,
        linewidth: 3
      });

      this.ratioLine = new THREE.Line(geometry, material);
      this.barsGroup.add(this.ratioLine);

      for (let i = 0; i < frequencyData.length; i++) {
        const ratio = frequencyData[i].bands.lfHfRatio;
        const x = xOffset + totalWidth + 1;
        const z = zOffset + i * (this.BAR_DEPTH + this.WINDOW_SPACING) + this.BAR_DEPTH / 2;
        const y = ratio * ratioYScale;

        const dotGeom = new THREE.SphereGeometry(0.3, 8, 8);
        const dotMat = new THREE.MeshBasicMaterial({ color: this.RATIO_COLOR });
        const dot = new THREE.Mesh(dotGeom, dotMat);
        dot.position.set(x, y, z);
        this.barsGroup.add(dot);
      }
    }
  }

  private createAxes(
    numWindows: number,
    maxPower: number,
    visibleBands: ('vlf' | 'lf' | 'hf')[],
    xOffset: number,
    zOffset: number,
    totalWidth: number,
    totalDepth: number
  ): void {
    const origin = new THREE.Vector3(xOffset, 0, zOffset);
    const xEnd = new THREE.Vector3(xOffset + totalWidth, 0, zOffset);
    const yEnd = new THREE.Vector3(xOffset, 30, zOffset);
    const zEnd = new THREE.Vector3(xOffset, 0, zOffset + totalDepth);

    this.createAxisLine(origin, xEnd, '频段', visibleBands, 'x');
    this.createAxisLine(origin, yEnd, '功率', maxPower, 'y');
    this.createAxisLine(origin, zEnd, '时间窗', numWindows, 'z');

    const legendCanvas = this.createTextLabel('LF/HF', 36, '#4ade80');
    const legendTexture = new THREE.CanvasTexture(legendCanvas);
    const legendMat = new THREE.SpriteMaterial({ map: legendTexture, transparent: true });
    const legendSprite = new THREE.Sprite(legendMat);
    legendSprite.scale.set(6, 2, 1);
    legendSprite.position.set(xOffset + totalWidth + 1, 32, zOffset + totalDepth / 2);
    this.axesGroup.add(legendSprite);
  }

  private createAxisLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    label: string,
    rangeValue: number | string[],
    direction: 'x' | 'y' | 'z'
  ): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const line = new THREE.Line(geometry, material);
    this.axesGroup.add(line);

    const tickCount = 5;
    if (Array.isArray(rangeValue)) {
      for (let i = 0; i < rangeValue.length; i++) {
        const t = (i + 0.5) / rangeValue.length;
        const tickPos = start.clone();

        if (direction === 'x') {
          tickPos.x = start.x + t * (end.x - start.x);
          this.createTickLabel(tickPos, rangeValue[i], 'below');
        }
      }
    } else {
      for (let i = 0; i <= tickCount; i++) {
        const t = i / tickCount;
        const value = t * rangeValue;
        const tickPos = start.clone();

        if (direction === 'y') {
          tickPos.y = start.y + t * (end.y - start.y);
          this.createTickLabel(tickPos, value.toFixed(0), 'left');
        } else if (direction === 'z') {
          tickPos.z = start.z + t * (end.z - start.z);
          this.createTickLabel(tickPos, `W${i}`, 'front');
        }
      }
    }

    const titleCanvas = this.createTextLabel(label, 40, '#00e5ff');
    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    const titleMat = new THREE.SpriteMaterial({ map: titleTexture, transparent: true });
    const titleSprite = new THREE.Sprite(titleMat);
    titleSprite.scale.set(8, 2.5, 1);

    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    if (direction === 'x') {
      titleSprite.position.set(midPoint.x, start.y - 4, start.z);
    } else if (direction === 'y') {
      titleSprite.position.set(start.x - 4, midPoint.y, start.z);
    } else {
      titleSprite.position.set(start.x, start.y - 4, midPoint.z);
    }
    this.axesGroup.add(titleSprite);
  }

  private createTickLabel(position: THREE.Vector3, text: string, placement: 'below' | 'left' | 'front'): void {
    const canvas = this.createTextLabel(text, 28);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 1.5, 1);

    const offset = 1.5;
    if (placement === 'below') {
      sprite.position.set(position.x, position.y - offset, position.z);
    } else if (placement === 'left') {
      sprite.position.set(position.x - offset, position.y, position.z);
    } else {
      sprite.position.set(position.x, position.y - offset, position.z + offset);
    }

    this.axesGroup.add(sprite);
  }

  private createFloorGrid(width: number, depth: number): void {
    const gridHelper = new THREE.GridHelper(Math.max(width, depth), 10, 0x444466, 0x333355);
    gridHelper.position.set(width / 2, 0, depth / 2);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    this.axesGroup.add(gridHelper);
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

  public getBarsGroup(): THREE.Group {
    return this.barsGroup;
  }

  private clear(): void {
    while (this.barsGroup.children.length > 0) {
      const child = this.barsGroup.children[0];
      this.barsGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
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

    this.barData = [];
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}
