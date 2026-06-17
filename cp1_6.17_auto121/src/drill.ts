import * as THREE from 'three';
import { DrillData, StratumData } from './types';

export class DrillManager {
  private scene: THREE.Scene;
  private drills: Map<string, DrillData> = new Map();
  private drillMeshes: Map<string, THREE.Group> = new Map();
  private labelSprites: Map<string, THREE.Sprite> = new Map();

  public onDrillClick: ((drillId: string) => void) | null = null;
  public onDrillChanged: (() => void) | null = null;

  private drillCounter: number = 0;
  private cylinderRadius: number = 0.3;

  private currentOpacity: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  addDrill(x: number, z: number, strata?: StratumData[], name?: string): string {
    this.drillCounter++;
    const id = `drill_${this.drillCounter}`;
    const drillName = name || `ZK${String(this.drillCounter).padStart(3, '0')}`;

    const defaultStrata: StratumData[] = strata || [
      { name: '表土层', depth: 2, color: '#D4A574' },
      { name: '黏土层', depth: 5, color: '#CD853F' },
      { name: '砂土层', depth: 8, color: '#DAA520' },
      { name: '基岩层', depth: 10, color: '#696969' }
    ];

    const drillData: DrillData = {
      id,
      name: drillName,
      x,
      z,
      strata: defaultStrata
    };

    this.drills.set(id, drillData);
    this.createDrillMesh(drillData);

    return id;
  }

  removeDrill(id: string): void {
    const group = this.drillMeshes.get(id);
    if (group) {
      this.scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.drillMeshes.delete(id);
      this.labelSprites.delete(id);
    }
    this.drills.delete(id);

    if (this.onDrillChanged) {
      this.onDrillChanged();
    }
  }

  clearAllDrills(): void {
    const ids = Array.from(this.drills.keys());
    ids.forEach((id) => this.removeDrill(id));
    this.drillCounter = 0;
  }

  getDrill(id: string): DrillData | undefined {
    return this.drills.get(id);
  }

  getAllDrills(): DrillData[] {
    return Array.from(this.drills.values());
  }

  getDrillMeshes(): THREE.Object3D[] {
    return Array.from(this.drillMeshes.values());
  }

  updateDrillStrata(id: string, strata: StratumData[]): void {
    const drill = this.drills.get(id);
    if (drill) {
      drill.strata = strata;
      this.updateDrillMesh(id);
      if (this.onDrillChanged) {
        this.onDrillChanged();
      }
    }
  }

  handleDrillClick(drillId: string): void {
    if (this.onDrillClick) {
      this.onDrillClick(drillId);
    }
  }

  setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.drillMeshes.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.opacity = opacity;
              m.transparent = opacity < 1;
            });
          } else {
            child.material.opacity = opacity;
            child.material.transparent = opacity < 1;
          }
        }
      });
    });

    this.labelSprites.forEach((sprite) => {
      sprite.material.opacity = opacity;
      sprite.material.transparent = opacity < 1;
    });
  }

  update(_delta: number): void {
  }

  private createDrillMesh(drill: DrillData): void {
    const group = new THREE.Group();
    group.userData.drillId = drill.id;

    const sortedStrata = [...drill.strata].sort((a, b) => a.depth - b.depth);

    let prevDepth = 0;
    sortedStrata.forEach((stratum, index) => {
      const layerHeight = stratum.depth - prevDepth;
      if (layerHeight <= 0) return;

      const geometry = new THREE.CylinderGeometry(
        this.cylinderRadius,
        this.cylinderRadius,
        layerHeight,
        16
      );

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(stratum.color),
        transparent: true,
        opacity: 0.7 * this.currentOpacity,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.1
      });

      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.y = -stratum.depth + layerHeight / 2;
      cylinder.userData.drillId = drill.id;
      cylinder.userData.stratumIndex = index;
      cylinder.castShadow = true;
      group.add(cylinder);

      const edgeGeometry = new THREE.RingGeometry(
        this.cylinderRadius - 0.001,
        this.cylinderRadius + 0.001,
        16
      );
      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3 * this.currentOpacity,
        side: THREE.DoubleSide
      });
      const edgeRing = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edgeRing.rotation.x = Math.PI / 2;
      edgeRing.position.y = -stratum.depth;
      group.add(edgeRing);

      prevDepth = stratum.depth;
    });

    const topCapGeometry = new THREE.CircleGeometry(this.cylinderRadius, 16);
    const topCapMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sortedStrata[0]?.color || '#D4A574'),
      transparent: true,
      opacity: 0.9 * this.currentOpacity,
      side: THREE.DoubleSide
    });
    const topCap = new THREE.Mesh(topCapGeometry, topCapMaterial);
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = 0.01;
    group.add(topCap);

    const labelSprite = this.createLabelSprite(drill.name);
    labelSprite.position.set(0, 0.5, 0);
    group.add(labelSprite);
    this.labelSprites.set(drill.id, labelSprite);

    group.position.set(drill.x, 0, drill.z);
    group.userData.drillId = drill.id;
    this.scene.add(group);
    this.drillMeshes.set(drill.id, group);
  }

  private createLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.clearRect(0, 0, 256, 64);

    context.font = 'bold 28px "Microsoft YaHei", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    context.lineWidth = 4;
    context.strokeText(text, 128, 32);

    context.fillStyle = 'white';
    context.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  private updateDrillMesh(id: string): void {
    const group = this.drillMeshes.get(id);
    const drill = this.drills.get(id);
    if (!group || !drill) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.labelSprites.delete(id);

    this.createDrillMeshFromGroup(group, drill);
  }

  private createDrillMeshFromGroup(group: THREE.Group, drill: DrillData): void {
    const sortedStrata = [...drill.strata].sort((a, b) => a.depth - b.depth);

    let prevDepth = 0;
    sortedStrata.forEach((stratum, index) => {
      const layerHeight = stratum.depth - prevDepth;
      if (layerHeight <= 0) return;

      const geometry = new THREE.CylinderGeometry(
        this.cylinderRadius,
        this.cylinderRadius,
        layerHeight,
        16
      );

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(stratum.color),
        transparent: true,
        opacity: 0.7 * this.currentOpacity,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.1
      });

      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.y = -stratum.depth + layerHeight / 2;
      cylinder.userData.drillId = drill.id;
      cylinder.userData.stratumIndex = index;
      cylinder.castShadow = true;
      group.add(cylinder);

      const edgeGeometry = new THREE.RingGeometry(
        this.cylinderRadius - 0.001,
        this.cylinderRadius + 0.001,
        16
      );
      const edgeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.3 * this.currentOpacity,
        side: THREE.DoubleSide
      });
      const edgeRing = new THREE.Mesh(edgeGeometry, edgeMaterial);
      edgeRing.rotation.x = Math.PI / 2;
      edgeRing.position.y = -stratum.depth;
      group.add(edgeRing);

      prevDepth = stratum.depth;
    });

    const topCapGeometry = new THREE.CircleGeometry(this.cylinderRadius, 16);
    const topCapMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sortedStrata[0]?.color || '#D4A574'),
      transparent: true,
      opacity: 0.9 * this.currentOpacity,
      side: THREE.DoubleSide
    });
    const topCap = new THREE.Mesh(topCapGeometry, topCapMaterial);
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = 0.01;
    group.add(topCap);

    const labelSprite = this.createLabelSprite(drill.name);
    labelSprite.position.set(0, 0.5, 0);
    group.add(labelSprite);
    this.labelSprites.set(drill.id, labelSprite);
  }
}
