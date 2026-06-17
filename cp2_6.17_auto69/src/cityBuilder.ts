import * as THREE from 'three';
import {
  BuildingType,
  BuildingData,
  CityDataStore,
  createBuildingData,
  getTypeName,
} from './cityData';

type EventBusEmit = (event: string, data?: unknown) => void;

interface BuildingMeshGroup {
  group: THREE.Group;
  dataId: string;
  outline: THREE.LineSegments | null;
}

export class CityBuilder {
  private scene: THREE.Scene;
  private store: CityDataStore;
  private meshMap: Map<string, BuildingMeshGroup> = new Map();
  private raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Mesh;
  private selectedId: string | null = null;
  private emit: EventBusEmit;
  private isDragging = false;
  private isShiftDragging = false;
  private dragStart = new THREE.Vector2();
  private dragOffset = new THREE.Vector3();
  private placingType: BuildingType | null = null;
  private animatingMeshes: Map<
    string,
    { startTime: number; duration: number; type: 'rise' | 'shrink' | 'grow' }
  > = new Map();
  private pulsePhase = 0;

  constructor(
    scene: THREE.Scene,
    store: CityDataStore,
    groundPlane: THREE.Mesh,
    emit: EventBusEmit
  ) {
    this.scene = scene;
    this.store = store;
    this.groundPlane = groundPlane;
    this.emit = emit;
  }

  setPlacingType(type: BuildingType | null): void {
    this.placingType = type;
  }

  getPlacingType(): BuildingType | null {
    return this.placingType;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  private createResidentialMesh(): THREE.Group {
    const group = new THREE.Group();
    const baseW = 2 + Math.random() * 2;
    const baseH = 4 + Math.random() * 6;
    const baseD = 2 + Math.random() * 2;

    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.2, 0.35 + Math.random() * 0.15),
      roughness: 0.8,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = baseH / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const roofGeo = new THREE.ConeGeometry(baseW * 0.75, baseH * 0.3, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.05, 0.5, 0.3 + Math.random() * 0.2),
      roughness: 0.9,
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.y = baseH + baseH * 0.15;
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.castShadow = true;
    group.add(roofMesh);

    const windowGeo = new THREE.BoxGeometry(baseW * 0.15, baseH * 0.12, 0.05);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffeeaa,
      emissive: 0xffeeaa,
      emissiveIntensity: 0.3,
    });
    const windowRows = Math.floor(baseH / 1.5);
    const windowCols = Math.floor(baseW / 1.2);
    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < windowCols; c++) {
        const w = new THREE.Mesh(windowGeo, windowMat);
        w.position.set(
          -baseW / 2 + 0.6 + c * 1.2,
          1.0 + r * 1.5,
          baseD / 2 + 0.01
        );
        group.add(w);
      }
    }

    return group;
  }

  private createCommercialMesh(): THREE.Group {
    const group = new THREE.Group();
    const baseW = 3 + Math.random() * 3;
    const baseH = 10 + Math.random() * 15;
    const baseD = 3 + Math.random() * 3;

    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.15, 0.4 + Math.random() * 0.15),
      roughness: 0.3,
      metalness: 0.6,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = baseH / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const edgeGeo = new THREE.BoxGeometry(baseW + 0.2, 0.3, baseD + 0.2);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x6688aa,
      metalness: 0.8,
      roughness: 0.2,
    });
    const floors = Math.floor(baseH / 3);
    for (let i = 0; i < floors; i++) {
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.y = 1.5 + i * 3;
      group.add(edge);
    }

    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = baseH + 1.5;
    group.add(antenna);

    const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff3333,
      emissiveIntensity: 1.0,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.y = baseH + 3;
    group.add(light);

    return group;
  }

  private createParkMesh(): THREE.Group {
    const group = new THREE.Group();
    const radius = 2.5 + Math.random() * 1.5;

    const groundGeo = new THREE.CylinderGeometry(radius, radius, 0.2, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d6b30,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0.1;
    ground.receiveShadow = true;
    group.add(ground);

    const treeCount = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius * 0.7);
      const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 1.5 + Math.random(), 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(
        Math.cos(angle) * dist,
        0.85 + Math.random() * 0.3,
        Math.sin(angle) * dist
      );
      trunk.castShadow = true;
      group.add(trunk);

      const foliageH = 1.5 + Math.random() * 1;
      const foliageR = 0.6 + Math.random() * 0.5;
      const foliageGeo = new THREE.ConeGeometry(foliageR, foliageH, 8);
      const foliageMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28 + Math.random() * 0.08, 0.6, 0.3 + Math.random() * 0.15),
        roughness: 0.8,
      });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.set(
        trunk.position.x,
        trunk.position.y + foliageH / 2 + 0.5,
        trunk.position.z
      );
      foliage.castShadow = true;
      group.add(foliage);
    }

    return group;
  }

  private createStreetlightMesh(): THREE.Group {
    const group = new THREE.Group();

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.7,
      roughness: 0.4,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0.5, 3.8, 0);
    arm.rotation.z = Math.PI / 2;
    group.add(arm);

    const lampGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfff4cc,
      emissive: 0xffeeaa,
      emissiveIntensity: 0.8,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(1.0, 3.7, 0);
    group.add(lamp);

    const pointLight = new THREE.PointLight(0xffeeaa, 2, 10);
    pointLight.position.set(1.0, 3.5, 0);
    group.add(pointLight);

    return group;
  }

  private createBuildingMesh(type: BuildingType): THREE.Group {
    switch (type) {
      case BuildingType.RESIDENTIAL:
        return this.createResidentialMesh();
      case BuildingType.COMMERCIAL:
        return this.createCommercialMesh();
      case BuildingType.PARK:
        return this.createParkMesh();
      case BuildingType.STREETLIGHT:
        return this.createStreetlightMesh();
    }
  }

  placeBuilding(type: BuildingType, position: THREE.Vector3): void {
    const data = createBuildingData(type, {
      x: position.x,
      y: 0,
      z: position.z,
    });
    this.store.add(data);

    const mesh = this.createBuildingMesh(type);
    mesh.position.set(data.position.x, -50, data.position.z);
    mesh.userData.dataId = data.id;
    mesh.userData.isBuilding = true;
    this.scene.add(mesh);

    this.meshMap.set(data.id, { group: mesh, dataId: data.id, outline: null });
    this.animatingMeshes.set(data.id, { startTime: performance.now(), duration: 500, type: 'rise' });

    this.emit('buildingAdded', data);
  }

  restoreBuilding(data: BuildingData): void {
    this.store.add(data);

    const mesh = this.createBuildingMesh(data.type);
    mesh.position.set(data.position.x, 0, data.position.z);
    mesh.rotation.y = data.rotation.y;
    mesh.scale.set(data.scale.x, data.scale.y, data.scale.z);
    mesh.userData.dataId = data.id;
    mesh.userData.isBuilding = true;
    this.scene.add(mesh);

    this.meshMap.set(data.id, { group: mesh, dataId: data.id, outline: null });

    mesh.scale.set(0, 0, 0);
    this.animatingMeshes.set(data.id, { startTime: performance.now(), duration: 500, type: 'grow' });

    this.emit('buildingAdded', data);
  }

  deleteSelected(): void {
    if (!this.selectedId) return;
    const id = this.selectedId;
    this.deselectBuilding();
    this.animatingMeshes.set(id, { startTime: performance.now(), duration: 300, type: 'shrink' });
  }

  private finalizeDelete(id: string): void {
    const entry = this.meshMap.get(id);
    if (entry) {
      this.removeOutline(entry);
      this.scene.remove(entry.group);
      entry.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.meshMap.delete(id);
    }
    const data = this.store.remove(id);
    this.emit('buildingDeleted', data);
  }

  selectBuilding(id: string): void {
    if (this.selectedId === id) return;
    this.deselectBuilding();
    this.selectedId = id;
    this.addOutline(id);
    this.emit('buildingSelected', this.store.get(id));
  }

  deselectBuilding(): void {
    if (this.selectedId) {
      this.removeOutlineById(this.selectedId);
      this.selectedId = null;
      this.emit('buildingDeselected');
    }
  }

  private addOutline(id: string): void {
    const entry = this.meshMap.get(id);
    if (!entry) return;

    const box = new THREE.Box3().setFromObject(entry.group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.3, size.y + 0.3, size.z + 0.3));
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x00bcd4,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const outline = new THREE.LineSegments(edgesGeo, edgesMat);
    outline.position.copy(center);
    outline.position.sub(entry.group.position);
    entry.group.add(outline);
    entry.outline = outline;
  }

  private removeOutline(entry: BuildingMeshGroup): void {
    if (entry.outline) {
      entry.group.remove(entry.outline);
      entry.outline.geometry.dispose();
      (entry.outline.material as THREE.Material).dispose();
      entry.outline = null;
    }
  }

  private removeOutlineById(id: string): void {
    const entry = this.meshMap.get(id);
    if (entry) {
      this.removeOutline(entry);
    }
  }

  updateBuildingProperty(
    id: string,
    props: Partial<Pick<BuildingData, 'name' | 'position' | 'rotation' | 'scale'>>
  ): void {
    this.store.update(id, props);
    const entry = this.meshMap.get(id);
    if (!entry) return;
    const data = this.store.get(id);
    if (!data) return;

    entry.group.position.set(data.position.x, data.position.y, data.position.z);
    entry.group.rotation.y = data.rotation.y;
    entry.group.scale.set(data.scale.x, data.scale.y, data.scale.z);

    if (this.selectedId === id) {
      this.removeOutlineById(id);
      this.addOutline(id);
    }
  }

  handleClick(mouse: THREE.Vector2, camera: THREE.Camera): void {
    if (this.isDragging) return;

    this.raycaster.setFromCamera(mouse, camera);

    if (this.placingType !== null) {
      const intersects = this.raycaster.intersectObject(this.groundPlane);
      if (intersects.length > 0) {
        this.placeBuilding(this.placingType, intersects[0].point);
      }
      return;
    }

    const buildingMeshes = this.getBuildingMeshes();
    const intersects = this.raycaster.intersectObjects(buildingMeshes, true);
    if (intersects.length > 0) {
      let target: THREE.Object3D | null = intersects[0].object;
      while (target && !target.userData.isBuilding) {
        target = target.parent;
      }
      if (target && target.userData.dataId) {
        this.selectBuilding(target.userData.dataId);
        return;
      }
    }

    this.deselectBuilding();
  }

  startDrag(mouse: THREE.Vector2, camera: THREE.Camera, shiftKey: boolean): void {
    if (!this.selectedId) return;
    const entry = this.meshMap.get(this.selectedId);
    if (!entry) return;

    this.isDragging = true;
    this.isShiftDragging = shiftKey;
    this.dragStart.copy(mouse);

    if (!shiftKey) {
      this.raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, intersection);
      if (intersection) {
        this.dragOffset.copy(entry.group.position).sub(intersection);
      }
    }
  }

  updateDrag(mouse: THREE.Vector2, camera: THREE.Camera): void {
    if (!this.isDragging || !this.selectedId) return;
    const entry = this.meshMap.get(this.selectedId);
    if (!entry) return;

    if (this.isShiftDragging) {
      const dx = mouse.x - this.dragStart.x;
      const step = Math.round(dx * 8) * (Math.PI / 4);
      const data = this.store.get(this.selectedId);
      if (data) {
        const newRotation = Math.round(step / (Math.PI / 4)) * (Math.PI / 4);
        entry.group.rotation.y = newRotation;
        this.store.update(this.selectedId, { rotation: { y: newRotation } });
        this.emit('buildingRotated', { id: this.selectedId, angle: Math.round((newRotation * 180) / Math.PI) });
      }
    } else {
      this.raycaster.setFromCamera(mouse, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, intersection);
      if (intersection) {
        const newPos = intersection.add(this.dragOffset);
        entry.group.position.x = newPos.x;
        entry.group.position.z = newPos.z;
        this.store.update(this.selectedId, {
          position: { x: newPos.x, y: 0, z: newPos.z },
        });
        this.removeOutlineById(this.selectedId);
        this.addOutline(this.selectedId);
        this.emit('buildingMoved', this.store.get(this.selectedId));
      }
    }
  }

  endDrag(): void {
    if (this.isDragging && this.selectedId) {
      this.emit('buildingPropertyChanged', this.store.get(this.selectedId));
    }
    this.isDragging = false;
    this.isShiftDragging = false;
  }

  handleScroll(delta: number): void {
    if (!this.selectedId) return;
    const entry = this.meshMap.get(this.selectedId);
    if (!entry) return;

    const scaleFactor = delta > 0 ? 0.9 : 1.1;
    const newScaleX = Math.max(0.5, Math.min(2.0, entry.group.scale.x * scaleFactor));
    const newScaleY = Math.max(0.5, Math.min(2.0, entry.group.scale.y * scaleFactor));
    const newScaleZ = Math.max(0.5, Math.min(2.0, entry.group.scale.z * scaleFactor));

    entry.group.scale.set(newScaleX, newScaleY, newScaleZ);
    this.store.update(this.selectedId, {
      scale: { x: newScaleX, y: newScaleY, z: newScaleZ },
    });
    this.removeOutlineById(this.selectedId);
    this.addOutline(this.selectedId);
    this.emit('buildingPropertyChanged', this.store.get(this.selectedId));
  }

  private getBuildingMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    this.meshMap.forEach((entry) => {
      meshes.push(entry.group);
    });
    return meshes;
  }

  update(time: number): void {
    const now = performance.now();
    const toDelete: string[] = [];

    this.animatingMeshes.forEach((anim, id) => {
      const entry = this.meshMap.get(id);
      if (!entry) return;

      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);

      if (anim.type === 'rise') {
        const eased = 1 - Math.pow(1 - t, 3);
        entry.group.position.y = -50 + 50 * eased;
      } else if (anim.type === 'shrink') {
        const eased = t;
        const s = 1 - eased;
        entry.group.scale.set(s, s, s);
        entry.group.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
            child.material.transparent = true;
            child.material.opacity = 1 - eased;
          }
        });
        if (t >= 1) {
          toDelete.push(id);
        }
      } else if (anim.type === 'grow') {
        const eased = 1 - Math.pow(1 - t, 3);
        entry.group.scale.set(eased, eased, eased);
      }

      if (t >= 1 && anim.type !== 'shrink') {
        this.animatingMeshes.delete(id);
      }
    });

    toDelete.forEach((id) => {
      this.animatingMeshes.delete(id);
      this.finalizeDelete(id);
    });

    if (this.selectedId) {
      this.pulsePhase += 0.016;
      const entry = this.meshMap.get(this.selectedId);
      if (entry && entry.outline) {
        const mat = entry.outline.material as THREE.LineBasicMaterial;
        mat.opacity = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.pulsePhase * (2 * Math.PI) / 1.5));
      }
    }
  }
}
