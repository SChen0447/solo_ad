import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { AQIDataPoint } from './dataLoader';

export interface ParticleCloudOptions {
  particlesPerPoint?: number;
  rotationSpeed?: number;
  sizeScale?: number;
}

export interface ParticleCloudCallbacks {
  onParticleHover?: (point: AQIDataPoint | null) => void;
  onParticleClick?: (point: AQIDataPoint) => void;
}

interface ParticleMetaData {
  dataPoint: AQIDataPoint;
  dataPointIndex: number;
  originalSize: number;
  originalColor: THREE.Color;
  isHighlighted: boolean;
}

interface SpatialHashCell {
  particleIndices: number[];
}

export class ParticleCloud {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private dataPoints: AQIDataPoint[] = [];
  private particleMetaData: ParticleMetaData[] = [];
  private particleGroups: number[][] = [];
  private rotationSpeed = 0.002;
  private sizeScale = 1.0;
  private particlesPerPoint = 30;
  private callbacks: ParticleCloudCallbacks;
  private raycaster: THREE.Raycaster;
  private raycasterThreshold = 0.3;
  private mouse: THREE.Vector2;
  private tooltipElement: HTMLElement;
  private tooltipLabel: CSS2DObject | null = null;
  private highlightedDataPointIndex: number | null = null;
  private group: THREE.Group;
  private transitionOpacity = 1.0;
  private targetOpacity = 1.0;
  private spriteTexture: THREE.Texture | null = null;
  private isTransitioning = false;
  private pendingData: AQIDataPoint[] | null = null;
  private fadeDuration = 0.5;
  private spatialHash: Map<string, SpatialHashCell> = new Map();
  private spatialHashCellSize = 0.5;
  private minFrameDelta = 0.001;

  constructor(
    scene: THREE.Scene,
    _labelRenderer: CSS2DRenderer,
    options: ParticleCloudOptions = {},
    callbacks: ParticleCloudCallbacks = {}
  ) {
    this.scene = scene;
    this.rotationSpeed = options.rotationSpeed ?? 0.002;
    this.sizeScale = options.sizeScale ?? 1.0;
    this.particlesPerPoint = options.particlesPerPoint ?? 30;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: this.raycasterThreshold };
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.tooltipElement = this.createTooltipElement();
    this.spriteTexture = this.createSpriteTexture();
  }

  private createSpriteTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createTooltipElement(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'label-tooltip';
    return div;
  }

  private showTooltip(point: AQIDataPoint, worldPos: THREE.Vector3): void {
    this.hideTooltip();
    this.tooltipElement.innerHTML =
      `<div style="font-weight:600;">AQI: ${point.aqi}</div>` +
      `<div>坐标: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})</div>`;
    this.tooltipElement.classList.add('visible');
    this.tooltipLabel = new CSS2DObject(this.tooltipElement);
    this.tooltipLabel.position.set(worldPos.x, worldPos.y + 0.8, worldPos.z);
    this.group.add(this.tooltipLabel);
  }

  private hideTooltip(): void {
    if (this.tooltipLabel) {
      this.group.remove(this.tooltipLabel);
      this.tooltipLabel = null;
    }
    this.tooltipElement.classList.remove('visible');
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        }
      : { r: 0, g: 1, b: 0 };
  }

  private getSpatialHashKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.spatialHashCellSize);
    const cy = Math.floor(y / this.spatialHashCellSize);
    const cz = Math.floor(z / this.spatialHashCellSize);
    return `${cx},${cy},${cz}`;
  }

  private buildSpatialHash(): void {
    this.spatialHash.clear();
    if (!this.geometry) return;

    const positions = this.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.particleMetaData.length; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const key = this.getSpatialHashKey(x, y, z);

      let cell = this.spatialHash.get(key);
      if (!cell) {
        cell = { particleIndices: [] };
        this.spatialHash.set(key, cell);
      }
      cell.particleIndices.push(i);
    }
  }

  private generateParticlePositionsWithCollision(
    center: THREE.Vector3,
    count: number,
    spread: number,
    minDistance: number
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const maxAttempts = count * 30;

    for (let i = 0; i < count && positions.length < count; i++) {
      let placed = false;
      for (let attempt = 0; attempt < maxAttempts / count && !placed; attempt++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random()) * spread;

        const x = center.x + r * Math.sin(phi) * Math.cos(theta);
        const y = center.y + r * Math.sin(phi) * Math.sin(theta);
        const z = center.z + r * Math.cos(phi);

        let tooClose = false;
        const checkRadius = minDistance * 1.2;
        for (const existing of positions) {
          const dx = existing.x - x;
          const dy = existing.y - y;
          const dz = existing.z - z;
          if (dx * dx + dy * dy + dz * dz < checkRadius * checkRadius) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          positions.push(new THREE.Vector3(x, y, z));
          placed = true;
        }
      }

      if (!placed) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random()) * spread;
        positions.push(new THREE.Vector3(
          center.x + r * Math.sin(phi) * Math.cos(theta),
          center.y + r * Math.sin(phi) * Math.sin(theta),
          center.z + r * Math.cos(phi)
        ));
      }
    }

    return positions;
  }

  public async setData(dataPoints: AQIDataPoint[]): Promise<void> {
    if (this.points && !this.isTransitioning) {
      this.isTransitioning = true;
      this.targetOpacity = 0;
      this.pendingData = dataPoints;
    } else if (!this.points) {
      this.createParticleSystem(dataPoints);
    }
  }

  private createParticleSystem(dataPoints: AQIDataPoint[]): void {
    this.removePoints();
    this.dataPoints = dataPoints;
    this.particleMetaData = [];
    this.particleGroups = [];
    this.highlightedDataPointIndex = null;

    const totalParticles = dataPoints.length * this.particlesPerPoint;
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);

    let particleIndex = 0;

    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i];
      const rgb = this.hexToRgb(point.color);
      const baseSize = 0.5 + (point.aqi / 300) * 2.5;

      const baseSpread = 0.6;
      const aqiSpreadBonus = (point.aqi / 300) * 0.9;
      const spread = baseSpread + aqiSpreadBonus;
      const minDistance = spread / Math.sqrt(this.particlesPerPoint) * 0.5;

      const center = new THREE.Vector3(point.x, point.y, point.z);
      const particlePositions = this.generateParticlePositionsWithCollision(
        center,
        this.particlesPerPoint,
        spread,
        minDistance
      );

      const groupIndices: number[] = [];

      for (let j = 0; j < particlePositions.length; j++) {
        const pos = particlePositions[j];
        const distFromCenter = pos.distanceTo(center);
        const distFactor = Math.max(0.25, 1 - distFromCenter / (spread * 0.9));

        const sizeVariation = 0.65 + Math.random() * 0.7;

        const idx = particleIndex * 3;
        positions[idx] = pos.x;
        positions[idx + 1] = pos.y;
        positions[idx + 2] = pos.z;

        const brightness = 0.65 + 0.35 * distFactor;
        colors[idx] = rgb.r * brightness;
        colors[idx + 1] = rgb.g * brightness;
        colors[idx + 2] = rgb.b * brightness;

        sizes[particleIndex] = baseSize * sizeVariation * (0.7 + 0.3 * distFactor);

        this.particleMetaData.push({
          dataPoint: point,
          dataPointIndex: i,
          originalSize: sizes[particleIndex],
          originalColor: new THREE.Color(
            colors[idx],
            colors[idx + 1],
            colors[idx + 2]
          ),
          isHighlighted: false
        });

        groupIndices.push(particleIndex);
        particleIndex++;
      }

      this.particleGroups.push(groupIndices);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      map: this.spriteTexture,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    this.buildSpatialHash();

    this.transitionOpacity = 0;
    this.targetOpacity = 1;
    this.isTransitioning = true;
    this.pendingData = null;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setSizeScale(scale: number): void {
    this.sizeScale = scale;
    if (!this.geometry || !this.points) return;
    const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;

    for (let i = 0; i < this.particleMetaData.length; i++) {
      const meta = this.particleMetaData[i];
      const newSize = meta.isHighlighted
        ? meta.originalSize * this.sizeScale * 1.5
        : meta.originalSize * this.sizeScale;
      sizeAttr.setX(i, newSize);
    }
    sizeAttr.needsUpdate = true;
  }

  public updateMouse(mouse: THREE.Vector2): void {
    this.mouse.copy(mouse);
  }

  public raycast(camera: THREE.Camera): void {
    if (!this.points || !this.geometry) return;

    this.raycaster.setFromCamera(this.mouse, camera);
    this.raycaster.params.Points = { threshold: this.raycasterThreshold };
    const intersects = this.raycaster.intersectObject(this.points);

    if (intersects.length > 0) {
      const particleIndex = intersects[0].index;
      if (particleIndex === undefined || particleIndex >= this.particleMetaData.length) return;

      const dataPointIdx = this.particleMetaData[particleIndex].dataPointIndex;
      this.highlightDataPoint(dataPointIdx);

      const positions = this.geometry.attributes.position as THREE.BufferAttribute;
      const worldPos = new THREE.Vector3(
        positions.getX(particleIndex),
        positions.getY(particleIndex),
        positions.getZ(particleIndex)
      );
      this.showTooltip(this.particleMetaData[particleIndex].dataPoint, worldPos);

      if (this.callbacks.onParticleHover) {
        this.callbacks.onParticleHover(this.particleMetaData[particleIndex].dataPoint);
      }
    } else {
      this.clearHighlight();
      this.hideTooltip();
      if (this.callbacks.onParticleHover) {
        this.callbacks.onParticleHover(null);
      }
    }
  }

  private highlightDataPoint(dataPointIdx: number): void {
    if (this.highlightedDataPointIndex === dataPointIdx) return;
    this.clearHighlight();
    if (!this.geometry || !this.particleGroups[dataPointIdx]) return;

    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizes = this.geometry.attributes.size as THREE.BufferAttribute;
    const indices = this.particleGroups[dataPointIdx];

    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      this.particleMetaData[i].isHighlighted = true;
      colors.setXYZ(i, 1, 1, 1);
      sizes.setX(i, this.particleMetaData[i].originalSize * this.sizeScale * 1.5);
    }

    colors.needsUpdate = true;
    sizes.needsUpdate = true;
    this.highlightedDataPointIndex = dataPointIdx;
  }

  private clearHighlight(): void {
    if (this.highlightedDataPointIndex === null) return;
    if (!this.geometry) {
      this.highlightedDataPointIndex = null;
      return;
    }

    const prevIdx = this.highlightedDataPointIndex;
    this.highlightedDataPointIndex = null;

    if (!this.particleGroups[prevIdx]) return;

    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const sizes = this.geometry.attributes.size as THREE.BufferAttribute;
    const indices = this.particleGroups[prevIdx];

    for (let k = 0; k < indices.length; k++) {
      const i = indices[k];
      if (this.particleMetaData[i].isHighlighted) {
        this.particleMetaData[i].isHighlighted = false;
        const color = this.particleMetaData[i].originalColor;
        colors.setXYZ(i, color.r, color.g, color.b);
        sizes.setX(i, this.particleMetaData[i].originalSize * this.sizeScale);
      }
    }

    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  public handleClick(camera: THREE.Camera): void {
    if (!this.points) return;

    this.raycaster.setFromCamera(this.mouse, camera);
    this.raycaster.params.Points = { threshold: this.raycasterThreshold };
    const intersects = this.raycaster.intersectObject(this.points);

    if (intersects.length > 0) {
      const particleIndex = intersects[0].index;
      if (particleIndex === undefined || particleIndex >= this.particleMetaData.length) return;

      const meta = this.particleMetaData[particleIndex];
      console.log('=== Particle Click Details ===');
      console.log('采样点:', meta.dataPoint.name);
      console.log('ID:', meta.dataPoint.id);
      console.log('AQI:', meta.dataPoint.aqi);
      console.log('经纬度:', meta.dataPoint.lat, meta.dataPoint.lng);
      console.log('坐标:', meta.dataPoint.x, meta.dataPoint.y, meta.dataPoint.z);
      console.log('颜色:', meta.dataPoint.color);

      if (this.callbacks.onParticleClick) {
        this.callbacks.onParticleClick(meta.dataPoint);
      }
    }
  }

  public update(deltaTime: number): void {
    this.group.rotation.y += this.rotationSpeed;

    if (this.isTransitioning && this.material) {
      const safeDelta = Math.max(this.minFrameDelta, Math.min(deltaTime, 0.1));
      const fadeAmount = safeDelta / this.fadeDuration;

      if (this.targetOpacity === 0) {
        this.transitionOpacity = Math.max(0, this.transitionOpacity - fadeAmount);
        this.material.opacity = this.transitionOpacity;
        this.material.needsUpdate = true;

        if (this.transitionOpacity <= 0) {
          if (this.pendingData) {
            this.createParticleSystem(this.pendingData);
          } else {
            this.isTransitioning = false;
          }
        }
      } else if (this.targetOpacity === 1) {
        this.transitionOpacity = Math.min(1, this.transitionOpacity + fadeAmount);
        this.material.opacity = this.transitionOpacity;
        this.material.needsUpdate = true;

        if (this.transitionOpacity >= 1) {
          this.isTransitioning = false;
        }
      }
    }

    if (this.tooltipLabel) {
      this.tooltipLabel.updateMatrixWorld();
    }
  }

  public getPoints(): THREE.Points | null {
    return this.points;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public getAverageAqi(): number {
    if (this.dataPoints.length === 0) return 0;
    const sum = this.dataPoints.reduce((acc, p) => acc + p.aqi, 0);
    return Math.round(sum / this.dataPoints.length);
  }

  public getSamplePointCount(): number {
    return this.dataPoints.length;
  }

  public getParticleCount(): number {
    return this.particleMetaData.length;
  }

  public getSpatialHashCellCount(): number {
    return this.spatialHash.size;
  }

  private removePoints(): void {
    if (this.points) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }
    this.geometry = null;
    this.material = null;
    this.hideTooltip();
    this.dataPoints = [];
    this.particleMetaData = [];
    this.particleGroups = [];
    this.spatialHash.clear();
    this.highlightedDataPointIndex = null;
  }

  public clear(): void {
    this.removePoints();
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.group);
    if (this.spriteTexture) {
      this.spriteTexture.dispose();
    }
  }
}
