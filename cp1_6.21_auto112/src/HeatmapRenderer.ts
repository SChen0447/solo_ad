import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { SceneManager } from './SceneManager';

export interface HeatPointData {
  id: string;
  lat: number;
  lon: number;
  density: number;
  speciesId: string;
  speciesName: string;
  speciesIcon: string;
  date: string;
  trend: number[];
}

interface HeatPoint {
  data: HeatPointData;
  sprite: THREE.Sprite;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  currentDensity: number;
  targetDensity: number;
  baseScale: number;
  tweenObj: { opacity: number; scale: number };
  fadeTween: TWEEN.Tween<{ opacity: number; scale: number }> | null;
}

type HeatMapCallback = (point: HeatPointData, screenPos: { x: number; y: number }, worldPos: THREE.Vector3) => void;

export class HeatmapRenderer {
  private sceneManager: SceneManager;
  private pointsGroup: THREE.Group;
  private heatPoints: Map<string, HeatPoint> = new Map();
  private spriteTexture: THREE.Texture;
  private hitTestMeshes: THREE.Mesh[] = [];

  private onClickCallback: HeatMapCallback | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private currentSpeciesId: string = 'all';
  private currentDate: string = '';
  private animatingUpdate = false;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.pointsGroup = new THREE.Group();
    this.sceneManager.earthGroup.add(this.pointsGroup);

    this.spriteTexture = this.createGlowTexture();
    this.setupPointerEvents();
    this.sceneManager.addRenderCallback(this.updateScales.bind(this));
  }

  private createGlowTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.06)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private densityToColor(density: number): THREE.Color {
    const t = Math.max(0, Math.min(1, density / 100));
    const colors = [
      { pos: 0.0, r: 30, g: 64, b: 175 },
      { pos: 0.2, r: 59, g: 130, b: 246 },
      { pos: 0.45, r: 16, g: 185, b: 129 },
      { pos: 0.7, r: 251, g: 191, b: 36 },
      { pos: 0.85, r: 249, g: 115, b: 22 },
      { pos: 1.0, r: 239, g: 68, b: 68 }
    ];
    for (let i = 0; i < colors.length - 1; i++) {
      if (t >= colors[i].pos && t <= colors[i + 1].pos) {
        const range = colors[i + 1].pos - colors[i].pos;
        const lt = (t - colors[i].pos) / range;
        const r = colors[i].r + (colors[i + 1].r - colors[i].r) * lt;
        const g = colors[i].g + (colors[i + 1].g - colors[i].g) * lt;
        const b = colors[i].b + (colors[i + 1].b - colors[i].b) * lt;
        return new THREE.Color(r / 255, g / 255, b / 255);
      }
    }
    return new THREE.Color(0x3b82f6);
  }

  private setupPointerEvents(): void {
    const canvas = this.sceneManager.renderer.domElement;

    const handleClick = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      const intersects = this.raycaster.intersectObjects(this.hitTestMeshes, false);

      if (intersects.length > 0 && this.onClickCallback) {
        const mesh = intersects[0].object as THREE.Mesh;
        const id = mesh.userData.id;
        const hp = this.heatPoints.get(id);
        if (hp) {
          const worldPos = new THREE.Vector3();
          hp.mesh.getWorldPosition(worldPos);
          const screen = this.sceneManager.projectToScreen(worldPos);
          this.onClickCallback(hp.data, screen, worldPos);
        }
      }
    };

    canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        handleClick(t.clientX, t.clientY);
      }
    }, { passive: true });
  }

  public onClick(cb: HeatMapCallback): void {
    this.onClickCallback = cb;
  }

  public updateData(points: HeatPointData[], speciesId: string, date: string): void {
    const filtered = speciesId === 'all'
      ? points
      : points.filter(p => p.speciesId === speciesId);

    this.currentSpeciesId = speciesId;
    this.currentDate = date;

    const incomingIds = new Set(filtered.map(p => p.id));
    const existingIds = new Set(this.heatPoints.keys());

    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        this.fadeOutPoint(id);
      }
    }

    for (const data of filtered) {
      if (this.heatPoints.has(data.id)) {
        this.updatePoint(data);
      } else {
        this.createPoint(data);
      }
    }
  }

  private createPoint(data: HeatPointData): void {
    const position = this.sceneManager.latLonToVector3(data.lat, data.lon, this.sceneManager.getEarthRadius() * 1.005);
    const color = this.densityToColor(data.density);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.spriteTexture,
      color: color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    this.pointsGroup.add(sprite);

    const hitGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const hitMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.001,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
    hitMesh.position.copy(position);
    hitMesh.userData.id = data.id;
    this.pointsGroup.add(hitMesh);
    this.hitTestMeshes.push(hitMesh);

    const baseScale = 0.25 + (data.density / 100) * 0.8;
    const tweenObj = { opacity: 0, scale: 0.1 };

    const heatPoint: HeatPoint = {
      data,
      sprite,
      mesh: hitMesh,
      position: position.clone(),
      currentDensity: 0,
      targetDensity: data.density,
      baseScale,
      tweenObj,
      fadeTween: null
    };

    this.heatPoints.set(data.id, heatPoint);

    new TWEEN.Tween(tweenObj)
      .to({ opacity: 0.85, scale: baseScale }, 500)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => {
        (sprite.material as THREE.SpriteMaterial).opacity = tweenObj.opacity;
        sprite.scale.setScalar(tweenObj.scale * 1.8);
      })
      .start();

    heatPoint.currentDensity = data.density;
  }

  private updatePoint(data: HeatPointData): void {
    const hp = this.heatPoints.get(data.id)!;

    if (hp.fadeTween) {
      hp.fadeTween.stop();
      hp.fadeTween = null;
    }

    hp.data = data;
    hp.targetDensity = data.density;
    const newColor = this.densityToColor(data.density);
    (hp.sprite.material as THREE.SpriteMaterial).color.copy(newColor);
    (hp.mesh.material as THREE.MeshBasicMaterial).color.copy(newColor);

    const newBaseScale = 0.25 + (data.density / 100) * 0.8;
    hp.baseScale = newBaseScale;
    hp.tweenObj.scale = newBaseScale;

    const startDensity = { v: hp.currentDensity };
    new TWEEN.Tween(startDensity)
      .to({ v: data.density }, 500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        hp.currentDensity = startDensity.v;
      })
      .start();
  }

  private fadeOutPoint(id: string): void {
    const hp = this.heatPoints.get(id);
    if (!hp) return;

    const sprite = hp.sprite;
    const mesh = hp.mesh;
    const tweenObj = hp.tweenObj;

    hp.fadeTween = new TWEEN.Tween(tweenObj)
      .to({ opacity: 0, scale: 0.05 }, 500)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(() => {
        (sprite.material as THREE.SpriteMaterial).opacity = tweenObj.opacity;
        sprite.scale.setScalar(tweenObj.scale * 1.8);
      })
      .onComplete(() => {
        this.pointsGroup.remove(sprite);
        this.pointsGroup.remove(mesh);
        sprite.material.dispose();
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        const idx = this.hitTestMeshes.indexOf(mesh);
        if (idx > -1) this.hitTestMeshes.splice(idx, 1);
        this.heatPoints.delete(id);
      })
      .start();
  }

  private updateScales(_delta: number): void {
    const camPos = this.sceneManager.camera.position;
    for (const hp of this.heatPoints.values()) {
      if (hp.fadeTween) continue;
      const dist = camPos.distanceTo(hp.position);
      const scaleFactor = Math.max(0.6, Math.min(1.6, dist / 6));
      const dynamicScale = hp.tweenObj.scale * scaleFactor * 1.8;
      hp.sprite.scale.setScalar(dynamicScale);
    }
  }

  public setSpeciesFilter(speciesId: string): void {
    this.currentSpeciesId = speciesId;
  }

  public getPointById(id: string): HeatPointData | undefined {
    return this.heatPoints.get(id)?.data;
  }

  public getAllPoints(): HeatPointData[] {
    return Array.from(this.heatPoints.values()).map(hp => hp.data);
  }

  public dispose(): void {
    this.sceneManager.removeRenderCallback(this.updateScales.bind(this));
    for (const id of Array.from(this.heatPoints.keys())) {
      const hp = this.heatPoints.get(id)!;
      this.pointsGroup.remove(hp.sprite);
      this.pointsGroup.remove(hp.mesh);
      hp.sprite.material.dispose();
      hp.mesh.geometry.dispose();
      (hp.mesh.material as THREE.Material).dispose();
    }
    this.heatPoints.clear();
    this.hitTestMeshes.length = 0;
    this.spriteTexture.dispose();
    this.sceneManager.earthGroup.remove(this.pointsGroup);
  }
}
