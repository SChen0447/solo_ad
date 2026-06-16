import * as THREE from 'three';
import type { CityData, WeatherType } from '../data/Simulator';

export interface BuildingConfig {
  position: THREE.Vector3;
  baseWidth: number;
  baseDepth: number;
  baseHeight: number;
  seed: number;
}

interface TargetState {
  height: number;
  color: THREE.Color;
  opacity: number;
  lit: boolean;
}

export class Building {
  public mesh: THREE.Mesh;
  public windows: THREE.Mesh | null = null;
  private config: BuildingConfig;
  private currentHeight: number = 1;
  private targetState: TargetState;
  private startState: TargetState | null = null;
  private transitionProgress: number = 1;
  private readonly transitionDuration: number = 2;
  private material: THREE.MeshStandardMaterial;
  private windowMaterial: THREE.MeshBasicMaterial | null = null;

  constructor(config: BuildingConfig) {
    this.config = config;
    this.material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.2,
      transparent: true,
      opacity: 1
    });

    const geometry = new THREE.BoxGeometry(config.baseWidth, 1, config.baseDepth);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.copy(config.position);
    this.mesh.position.y = 0.5;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.targetState = {
      height: config.baseHeight,
      color: new THREE.Color(0xcccccc),
      opacity: 1,
      lit: false
    };
    this.currentHeight = config.baseHeight;
    this.updateGeometryHeight();
  }

  public updateTarget(data: CityData): void {
    this.startState = {
      height: this.currentHeight,
      color: this.material.color.clone(),
      opacity: this.material.opacity,
      lit: this.windowMaterial ? this.windowMaterial.visible : false
    };
    this.transitionProgress = 0;

    const densityFactor = data.populationDensity / 100;
    const heightVariation = 0.6 + Math.random() * 0.8;
    this.targetState.height = this.config.baseHeight * (0.5 + densityFactor * 1.5) * heightVariation;

    this.targetState.color = this.computeColor(data);
    this.targetState.opacity = this.computeOpacity(data.weather);

    const nightFactor = this.computeNightFactor(data.time);
    const litProbability = nightFactor * (0.3 + densityFactor * 0.6);
    this.targetState.lit = Math.random() < litProbability;

    this.ensureWindows();
  }

  public animate(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
      const t = this.easeInOutCubic(this.transitionProgress);

      if (this.startState) {
        this.currentHeight = this.lerp(this.startState.height, this.targetState.height, t);
        this.material.color.lerpColors(this.startState.color, this.targetState.color, t);
        this.material.opacity = this.lerp(this.startState.opacity, this.targetState.opacity, t);
      }

      this.updateGeometryHeight();
    }

    if (this.windowMaterial && this.windowMaterial.visible !== this.targetState.lit && this.transitionProgress > 0.8) {
      this.windowMaterial.visible = this.targetState.lit;
    }
  }

  private computeColor(data: CityData): THREE.Color {
    const nightFactor = this.computeNightFactor(data.time);
    const dayColor = new THREE.Color().setHSL(0.58, 0.1, 0.55 + Math.random() * 0.2);
    const nightColor = new THREE.Color().setHSL(0.7 + Math.random() * 0.1, 0.4, 0.15 + Math.random() * 0.1);

    const warmTint = new THREE.Color(0xffa040);
    if (nightFactor > 0.5) {
      nightColor.lerp(warmTint, (nightFactor - 0.5) * (data.populationDensity / 100) * 0.4);
    }

    return dayColor.clone().lerp(nightColor, nightFactor);
  }

  private computeOpacity(weather: WeatherType): number {
    switch (weather) {
      case 'sunny': return 1;
      case 'cloudy': return 0.9;
      case 'rainy': return 0.75;
      case 'snowy': return 0.85;
      default: return 1;
    }
  }

  private computeNightFactor(time: number): number {
    if (time >= 6 && time < 18) {
      if (time < 8) return (8 - time) / 2;
      if (time > 16) return (time - 16) / 2;
      return 0;
    }
    return 1;
  }

  private ensureWindows(): void {
    if (this.windows) return;

    const windowGeom = new THREE.BoxGeometry(
      this.config.baseWidth * 1.001,
      Math.max(1, this.config.baseHeight),
      this.config.baseDepth * 1.001
    );

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 64, 128);

    const warmColor = '#ffcc66';
    for (let y = 8; y < 120; y += 10) {
      for (let x = 6; x < 58; x += 8) {
        if (Math.random() < 0.55) {
          ctx.fillStyle = warmColor;
          ctx.globalAlpha = 0.6 + Math.random() * 0.4;
          ctx.fillRect(x, y, 4, 6);
        }
      }
    }
    ctx.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.windowMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      visible: false
    });

    this.windows = new THREE.Mesh(windowGeom, this.windowMaterial);
    this.windows.position.copy(this.mesh.position);
    this.mesh.add(this.windows);
  }

  private updateGeometryHeight(): void {
    const h = Math.max(0.5, this.currentHeight);
    const oldGeom = this.mesh.geometry as THREE.BoxGeometry;
    oldGeom.dispose();
    this.mesh.geometry = new THREE.BoxGeometry(this.config.baseWidth, h, this.config.baseDepth);
    this.mesh.position.y = h / 2;

    if (this.windows) {
      const oldWinGeom = this.windows.geometry as THREE.BoxGeometry;
      oldWinGeom.dispose();
      this.windows.geometry = new THREE.BoxGeometry(
        this.config.baseWidth * 1.001,
        h * 1.001,
        this.config.baseDepth * 1.001
      );
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    const geom = this.mesh.geometry as THREE.BoxGeometry;
    geom.dispose();
    this.material.dispose();
    if (this.windows) {
      (this.windows.geometry as THREE.BoxGeometry).dispose();
      if (this.windowMaterial) {
        if (this.windowMaterial.map) this.windowMaterial.map.dispose();
        this.windowMaterial.dispose();
      }
    }
  }
}
