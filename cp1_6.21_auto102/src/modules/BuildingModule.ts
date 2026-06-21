import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { ShadowSystem } from '../core/ShadowSystem';

export interface BuildingData {
  id: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; depth: number; height: number };
  materialKey: MaterialKey;
}

export type MaterialKey =
  | 'concrete'
  | 'glass'
  | 'brick'
  | 'metal'
  | 'wood'
  | 'white';

export const MATERIALS: Record<MaterialKey, { color: string; name: string }> = {
  concrete: { color: '#B0B0B0', name: '混凝土灰' },
  glass: { color: '#4A90D9', name: '玻璃蓝' },
  brick: { color: '#C0392B', name: '红砖' },
  metal: { color: '#A9A9A9', name: '金属银' },
  wood: { color: '#8B4513', name: '木质褐' },
  white: { color: '#F5F5F5', name: '白色' }
};

const MAX_BUILDINGS = 40;

export interface BuildingObject {
  id: string;
  group: THREE.Group;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  baseCircle: THREE.Mesh;
  topLabel: THREE.Sprite;
  sideLabelW: THREE.Sprite;
  sideLabelD: THREE.Sprite;
  sideLabelH: THREE.Sprite;
  data: BuildingData;
  highlightMesh?: THREE.Mesh;
}

export class BuildingModule {
  private scene: THREE.Scene;
  private shadowSystem: ShadowSystem;
  private camera: THREE.Camera;
  private buildings: Map<string, BuildingObject> = new Map();
  private selectedId: string | null = null;
  private previewMesh: THREE.Mesh | null = null;
  private previewMaterial: THREE.MeshStandardMaterial;
  private pendingSize: { width: number; depth: number; height: number } = {
    width: 4,
    depth: 4,
    height: 6
  };
  private pendingMaterial: MaterialKey = 'concrete';
  private isPlacingMode: boolean = false;

  private onBuildingSelect?: (id: string | null) => void;
  private onBuildingCountChange?: (count: number) => void;

  constructor(
    scene: THREE.Scene,
    shadowSystem: ShadowSystem,
    camera: THREE.Camera
  ) {
    this.scene = scene;
    this.shadowSystem = shadowSystem;
    this.camera = camera;

    this.previewMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
  }

  public setCallbacks(
    onSelect?: (id: string | null) => void,
    onCountChange?: (count: number) => void
  ): void {
    this.onBuildingSelect = onSelect;
    this.onBuildingCountChange = onCountChange;
  }

  public setPlacingMode(active: boolean): void {
    this.isPlacingMode = active;
    if (active && !this.previewMesh) {
      this.createPreviewMesh();
    } else if (!active && this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      this.previewMesh = null;
    }
  }

  public isPlacingActive(): boolean {
    return this.isPlacingMode;
  }

  public setPendingSize(width: number, depth: number, height: number): void {
    this.pendingSize = {
      width: THREE.MathUtils.clamp(width, 2, 6),
      depth: THREE.MathUtils.clamp(depth, 2, 6),
      height: THREE.MathUtils.clamp(height, 3, 15)
    };
    if (this.previewMesh) {
      this.updatePreviewMesh();
    }
  }

  public getPendingSize(): { width: number; depth: number; height: number } {
    return { ...this.pendingSize };
  }

  public setPendingMaterial(key: MaterialKey): void {
    this.pendingMaterial = key;
    if (this.previewMesh) {
      this.previewMaterial.color.set(MATERIALS[key].color);
    }
  }

  public getPendingMaterial(): MaterialKey {
    return this.pendingMaterial;
  }

  private createPreviewMesh(): void {
    const { width, depth, height } = this.pendingSize;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    this.previewMesh = new THREE.Mesh(geometry, this.previewMaterial);
    this.previewMaterial.color.set(MATERIALS[this.pendingMaterial].color);
    this.previewMesh.position.y = height / 2;
    this.previewMesh.visible = false;
    this.scene.add(this.previewMesh);
  }

  private updatePreviewMesh(): void {
    if (!this.previewMesh) return;
    const { width, depth, height } = this.pendingSize;
    this.previewMesh.geometry.dispose();
    this.previewMesh.geometry = new THREE.BoxGeometry(width, height, depth);
    this.previewMesh.position.y = height / 2;
  }

  public updatePreviewPosition(point: THREE.Vector3): void {
    if (!this.previewMesh || !this.isPlacingMode) return;
    this.previewMesh.visible = true;
    const { width, depth } = this.pendingSize;
    this.previewMesh.position.x = Math.round(point.x / 2) * 2;
    this.previewMesh.position.z = Math.round(point.z / 2) * 2;
    this.previewMesh.position.y = this.pendingSize.height / 2;
    void width;
    void depth;
  }

  public placeBuildingAt(point: THREE.Vector3): BuildingData | null {
    if (this.buildings.size >= MAX_BUILDINGS) {
      this.tryMergeNearbyBuildings();
      if (this.buildings.size >= MAX_BUILDINGS) {
        return null;
      }
    }

    const { width, depth, height } = this.pendingSize;
    const x = Math.round(point.x / 2) * 2;
    const z = Math.round(point.z / 2) * 2;

    const data: BuildingData = {
      id: uuidv4(),
      position: { x, y: 0, z },
      dimensions: { width, depth, height },
      materialKey: this.pendingMaterial
    };

    this.createBuildingObject(data);
    this.notifyCountChange();
    return data;
  }

  private createBuildingObject(data: BuildingData): BuildingObject {
    const group = new THREE.Group();
    group.position.set(data.position.x, data.position.y, data.position.z);
    group.name = `building_${data.id}`;

    const { width, depth, height } = data.dimensions;

    const material = this.createMaterial(data.materialKey);
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'building_mesh';
    group.add(mesh);

    const edgesGeo = new THREE.EdgesGeometry(geometry);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15
    });
    const edges = new THREE.LineSegments(edgesGeo, edgesMat);
    edges.position.y = height / 2;
    group.add(edges);

    const circleGeo = new THREE.CircleGeometry(
      Math.max(width, depth) / 2 + 0.3,
      32
    );
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x5DADE2,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const baseCircle = new THREE.Mesh(circleGeo, circleMat);
    baseCircle.rotation.x = -Math.PI / 2;
    baseCircle.position.y = 0.02;
    group.add(baseCircle);

    const topLabel = this.createLabelSprite(
      `${width}×${depth}m`,
      0.4 + Math.max(width, depth) * 0.1
    );
    topLabel.position.set(0, height + 0.8, 0);
    group.add(topLabel);

    const sideLabelW = this.createLabelSprite(`${width}m`, 0.35);
    sideLabelW.position.set(0, height / 2, depth / 2 + 0.3);
    group.add(sideLabelW);

    const sideLabelD = this.createLabelSprite(`${depth}m`, 0.35);
    sideLabelD.position.set(width / 2 + 0.3, height / 2, 0);
    sideLabelD.rotation.y = Math.PI / 2;
    group.add(sideLabelD);

    const sideLabelH = this.createLabelSprite(`${height}m`, 0.35);
    sideLabelH.position.set(-width / 2 - 0.3, height / 2, 0);
    sideLabelH.rotation.y = -Math.PI / 2;
    group.add(sideLabelH);

    const buildingObj: BuildingObject = {
      id: data.id,
      group,
      mesh,
      edges,
      baseCircle,
      topLabel,
      sideLabelW,
      sideLabelD,
      sideLabelH,
      data: { ...data }
    };

    this.buildings.set(data.id, buildingObj);
    this.scene.add(group);
    return buildingObj;
  }

  private createMaterial(key: MaterialKey): THREE.MeshStandardMaterial {
    const info = MATERIALS[key];
    const shininess = this.shadowSystem.getMaterialShininessFactor();

    let metalness = 0.1;
    let roughness = 0.7;
    let opacity = 1;
    let transparent = false;

    switch (key) {
      case 'glass':
        metalness = 0.2 + shininess * 0.5;
        roughness = 0.15;
        opacity = 0.75;
        transparent = true;
        break;
      case 'metal':
        metalness = 0.6 + shininess * 0.3;
        roughness = 0.25;
        break;
      case 'concrete':
        metalness = 0.05;
        roughness = 0.85;
        break;
      case 'wood':
        metalness = 0.02;
        roughness = 0.8;
        break;
      case 'brick':
        metalness = 0.02;
        roughness = 0.9;
        break;
      case 'white':
        metalness = 0.05;
        roughness = 0.7;
        break;
    }

    return new THREE.MeshStandardMaterial({
      color: info.color,
      metalness,
      roughness,
      transparent,
      opacity
    });
  }

  private createLabelSprite(text: string, size: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 25, 40, 0.55)';
    const padding = 8;
    const cornerRadius = 6;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;
    ctx.beginPath();
    ctx.moveTo(padding + cornerRadius, padding);
    ctx.lineTo(padding + w - cornerRadius, padding);
    ctx.quadraticCurveTo(padding + w, padding, padding + w, padding + cornerRadius);
    ctx.lineTo(padding + w, padding + h - cornerRadius);
    ctx.quadraticCurveTo(padding + w, padding + h, padding + w - cornerRadius, padding + h);
    ctx.lineTo(padding + cornerRadius, padding + h);
    ctx.quadraticCurveTo(padding, padding + h, padding, padding + h - cornerRadius);
    ctx.lineTo(padding, padding + cornerRadius);
    ctx.quadraticCurveTo(padding, padding, padding + cornerRadius, padding);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size * 2, size, 1);
    sprite.renderOrder = 999;
    return sprite;
  }

  public selectBuilding(id: string | null): void {
    if (this.selectedId && this.selectedId !== id) {
      this.removeHighlight(this.selectedId);
    }
    this.selectedId = id;
    if (id) {
      this.addHighlight(id);
    }
    if (this.onBuildingSelect) {
      this.onBuildingSelect(id);
    }
  }

  private addHighlight(id: string): void {
    const obj = this.buildings.get(id);
    if (!obj) return;

    const { width, depth, height } = obj.data.dimensions;
    const highlightGeo = new THREE.BoxGeometry(
      width + 0.15,
      height + 0.15,
      depth + 0.15
    );
    const edgesGeo = new THREE.EdgesGeometry(highlightGeo);
    const highlightMat = new THREE.LineBasicMaterial({
      color: 0xFFD93D,
      transparent: true,
      opacity: 0.9
    });
    const highlightMesh = new THREE.LineSegments(edgesGeo, highlightMat) as unknown as THREE.Mesh;
    (highlightMesh as unknown as THREE.LineSegments).position.y = height / 2;
    (highlightMesh as unknown as THREE.LineSegments).name = 'highlight';
    obj.highlightMesh = highlightMesh;
    obj.group.add(highlightMesh as unknown as THREE.Object3D);

    (obj.edges.material as THREE.LineBasicMaterial).color.set(0xFFD93D);
    (obj.edges.material as THREE.LineBasicMaterial).opacity = 0.6;
  }

  private removeHighlight(id: string): void {
    const obj = this.buildings.get(id);
    if (!obj) return;
    if (obj.highlightMesh) {
      obj.group.remove(obj.highlightMesh as unknown as THREE.Object3D);
      (obj.highlightMesh as unknown as THREE.LineSegments).geometry.dispose();
      ((obj.highlightMesh as unknown as THREE.LineSegments).material as THREE.Material).dispose();
      obj.highlightMesh = undefined;
    }
    (obj.edges.material as THREE.LineBasicMaterial).color.set(0xffffff);
    (obj.edges.material as THREE.LineBasicMaterial).opacity = 0.15;
  }

  public getSelectedId(): string | null {
    return this.selectedId;
  }

  public getSelectedBuilding(): BuildingObject | null {
    return this.selectedId ? this.buildings.get(this.selectedId) ?? null : null;
  }

  public deleteSelectedBuilding(): boolean {
    if (!this.selectedId) return false;
    const result = this.deleteBuilding(this.selectedId);
    if (result) {
      this.selectedId = null;
      if (this.onBuildingSelect) this.onBuildingSelect(null);
      this.notifyCountChange();
    }
    return result;
  }

  public deleteBuilding(id: string): boolean {
    const obj = this.buildings.get(id);
    if (!obj) return false;

    this.scene.remove(obj.group);
    obj.mesh.geometry.dispose();
    (obj.mesh.material as THREE.Material).dispose();
    obj.edges.geometry.dispose();
    (obj.edges.material as THREE.Material).dispose();
    obj.baseCircle.geometry.dispose();
    (obj.baseCircle.material as THREE.Material).dispose();
    [obj.topLabel, obj.sideLabelW, obj.sideLabelD, obj.sideLabelH].forEach(
      (s) => {
        (s.material as THREE.SpriteMaterial).map?.dispose();
        (s.material as THREE.Material).dispose();
      }
    );
    if (obj.highlightMesh) {
      (obj.highlightMesh as unknown as THREE.LineSegments).geometry.dispose();
      ((obj.highlightMesh as unknown as THREE.LineSegments).material as THREE.Material).dispose();
    }

    this.buildings.delete(id);
    return true;
  }

  public setBuildingMaterial(id: string, key: MaterialKey): void {
    const obj = this.buildings.get(id);
    if (!obj) return;

    const targetMaterial = this.createMaterial(key);
    const oldMaterial = obj.mesh.material as THREE.MeshStandardMaterial;

    const startTime = performance.now();
    const duration = 200;
    const startColor = oldMaterial.color.clone();
    const endColor = targetMaterial.color.clone();
    const startMetalness = oldMaterial.metalness;
    const endMetalness = targetMaterial.metalness;
    const startRoughness = oldMaterial.roughness;
    const endRoughness = targetMaterial.roughness;
    const startOpacity = oldMaterial.opacity;
    const endOpacity = targetMaterial.opacity;
    const startTransparent = oldMaterial.transparent;

    oldMaterial.dispose();
    obj.mesh.material = targetMaterial;
    obj.data.materialKey = key;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      (obj.mesh.material as THREE.MeshStandardMaterial).color.lerpColors(
        startColor,
        endColor,
        ease
      );
      (obj.mesh.material as THREE.MeshStandardMaterial).metalness =
        startMetalness + (endMetalness - startMetalness) * ease;
      (obj.mesh.material as THREE.MeshStandardMaterial).roughness =
        startRoughness + (endRoughness - startRoughness) * ease;
      (obj.mesh.material as THREE.MeshStandardMaterial).opacity =
        startOpacity + (endOpacity - startOpacity) * ease;
      (obj.mesh.material as THREE.MeshStandardMaterial).transparent =
        startTransparent || targetMaterial.transparent;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        (obj.mesh.material as THREE.MeshStandardMaterial).transparent =
          targetMaterial.transparent;
      }
    };
    animate();
  }

  public updateBuildingDimensions(
    id: string,
    width: number,
    depth: number,
    height: number
  ): void {
    const obj = this.buildings.get(id);
    if (!obj) return;

    const w = THREE.MathUtils.clamp(width, 2, 6);
    const d = THREE.MathUtils.clamp(depth, 2, 6);
    const h = THREE.MathUtils.clamp(height, 3, 15);
    obj.data.dimensions = { width: w, depth: d, height: h };

    obj.mesh.geometry.dispose();
    obj.mesh.geometry = new THREE.BoxGeometry(w, h, d);
    obj.mesh.position.y = h / 2;

    obj.edges.geometry.dispose();
    obj.edges.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
    obj.edges.position.y = h / 2;

    obj.baseCircle.geometry.dispose();
    obj.baseCircle.geometry = new THREE.CircleGeometry(Math.max(w, d) / 2 + 0.3, 32);

    this.replaceLabel(obj.topLabel, `${w}×${d}m`, 0.4 + Math.max(w, d) * 0.1);
    obj.topLabel.position.set(0, h + 0.8, 0);

    this.replaceLabel(obj.sideLabelW, `${w}m`, 0.35);
    obj.sideLabelW.position.set(0, h / 2, d / 2 + 0.3);

    this.replaceLabel(obj.sideLabelD, `${d}m`, 0.35);
    obj.sideLabelD.position.set(w / 2 + 0.3, h / 2, 0);

    this.replaceLabel(obj.sideLabelH, `${h}m`, 0.35);
    obj.sideLabelH.position.set(-w / 2 - 0.3, h / 2, 0);

    if (obj.highlightMesh) {
      this.removeHighlight(id);
      this.addHighlight(id);
    }
  }

  private replaceLabel(sprite: THREE.Sprite, text: string, size: number): void {
    (sprite.material as THREE.SpriteMaterial).map?.dispose();

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 25, 40, 0.55)';
    const padding = 8;
    const cornerRadius = 6;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;
    ctx.beginPath();
    ctx.moveTo(padding + cornerRadius, padding);
    ctx.lineTo(padding + w - cornerRadius, padding);
    ctx.quadraticCurveTo(padding + w, padding, padding + w, padding + cornerRadius);
    ctx.lineTo(padding + w, padding + h - cornerRadius);
    ctx.quadraticCurveTo(padding + w, padding + h, padding + w - cornerRadius, padding + h);
    ctx.lineTo(padding + cornerRadius, padding + h);
    ctx.quadraticCurveTo(padding, padding + h, padding, padding + h - cornerRadius);
    ctx.lineTo(padding, padding + cornerRadius);
    ctx.quadraticCurveTo(padding, padding, padding + cornerRadius, padding);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    (sprite.material as THREE.SpriteMaterial).map = texture;
    sprite.scale.set(size * 2, size, 1);
  }

  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.buildings.forEach((obj) => {
      meshes.push(obj.mesh);
    });
    return meshes;
  }

  public getBuildingIdByMesh(mesh: THREE.Object3D): string | null {
    for (const [id, obj] of this.buildings.entries()) {
      if (obj.mesh === mesh || obj.group === mesh || obj.group.children.includes(mesh)) {
        return id;
      }
    }
    return null;
  }

  public getBuildingData(): BuildingData[] {
    const result: BuildingData[] = [];
    this.buildings.forEach((obj) => {
      result.push({ ...obj.data });
    });
    return result;
  }

  public clearAll(): void {
    const ids = Array.from(this.buildings.keys());
    ids.forEach((id) => this.deleteBuilding(id));
    this.selectedId = null;
    if (this.onBuildingSelect) this.onBuildingSelect(null);
    this.notifyCountChange();
  }

  public loadBuildings(dataList: BuildingData[]): void {
    this.clearAll();
    dataList.forEach((data) => {
      this.createBuildingObject({ ...data });
    });
    this.notifyCountChange();
  }

  public getCount(): number {
    return this.buildings.size;
  }

  private notifyCountChange(): void {
    if (this.onBuildingCountChange) {
      this.onBuildingCountChange(this.buildings.size);
    }
  }

  private tryMergeNearbyBuildings(): boolean {
    if (this.buildings.size < 2) return false;
    const arr = Array.from(this.buildings.values());
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i];
        const b = arr[j];
        const dist = Math.sqrt(
          Math.pow(a.data.position.x - b.data.position.x, 2) +
            Math.pow(a.data.position.z - b.data.position.z, 2)
        );
        if (dist < 3 && a.data.materialKey === b.data.materialKey) {
          const avgX = (a.data.position.x + b.data.position.x) / 2;
          const avgZ = (a.data.position.z + b.data.position.z) / 2;
          const newW = Math.min(
            6,
            Math.round((a.data.dimensions.width + b.data.dimensions.width) / 2)
          );
          const newD = Math.min(
            6,
            Math.round((a.data.dimensions.depth + b.data.dimensions.depth) / 2)
          );
          const newH = Math.max(a.data.dimensions.height, b.data.dimensions.height);
          this.deleteBuilding(a.id);
          this.deleteBuilding(b.id);
          const mergedData: BuildingData = {
            id: uuidv4(),
            position: { x: avgX, y: 0, z: avgZ },
            dimensions: { width: newW, depth: newD, height: newH },
            materialKey: a.data.materialKey
          };
          this.createBuildingObject(mergedData);
          return true;
        }
      }
    }
    return false;
  }

  public updateLabelsScale(cameraPos: THREE.Vector3): void {
    this.buildings.forEach((obj) => {
      const worldPos = new THREE.Vector3();
      obj.group.getWorldPosition(worldPos);
      worldPos.y += obj.data.dimensions.height / 2;
      const dist = cameraPos.distanceTo(worldPos);
      const scale = Math.max(0.8, Math.min(3, dist / 15));

      const baseScaleTop = 0.4 + Math.max(obj.data.dimensions.width, obj.data.dimensions.depth) * 0.1;
      obj.topLabel.scale.set(baseScaleTop * 2 * scale, baseScaleTop * scale, 1);

      const baseScaleSide = 0.35;
      obj.sideLabelW.scale.set(baseScaleSide * 2 * scale, baseScaleSide * scale, 1);
      obj.sideLabelD.scale.set(baseScaleSide * 2 * scale, baseScaleSide * scale, 1);
      obj.sideLabelH.scale.set(baseScaleSide * 2 * scale, baseScaleSide * scale, 1);
    });
  }

  public setHoveredBuilding(id: string | null): void {
    this.buildings.forEach((obj, key) => {
      if (key === id && key !== this.selectedId) {
        (obj.edges.material as THREE.LineBasicMaterial).color.set(0xFFD93D);
        (obj.edges.material as THREE.LineBasicMaterial).opacity = 0.35;
      } else if (key !== this.selectedId) {
        (obj.edges.material as THREE.LineBasicMaterial).color.set(0xffffff);
        (obj.edges.material as THREE.LineBasicMaterial).opacity = 0.15;
      }
    });
  }

  public updateMaterialsShininess(): void {
    const shininess = this.shadowSystem.getMaterialShininessFactor();
    this.buildings.forEach((obj) => {
      const key = obj.data.materialKey;
      const mat = obj.mesh.material as THREE.MeshStandardMaterial;
      switch (key) {
        case 'glass':
          mat.metalness = 0.2 + shininess * 0.5;
          break;
        case 'metal':
          mat.metalness = 0.6 + shininess * 0.3;
          break;
      }
    });
  }

  public dispose(): void {
    this.clearAll();
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh.geometry.dispose();
      this.previewMaterial.dispose();
      this.previewMesh = null;
    }
  }
}
