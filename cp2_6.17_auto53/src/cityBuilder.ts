import * as THREE from 'three';
import {
  addBuilding,
  removeBuilding,
  updateBuilding,
  getBuilding,
  undoDelete,
  getDeleteHistoryCount,
  type BuildingType,
  type BuildingData,
} from './cityData';

type EventCallback = (...args: unknown[]) => void;
const eventBus: Map<string, EventCallback[]> = new Map();

export function on(event: string, cb: EventCallback) {
  if (!eventBus.has(event)) eventBus.set(event, []);
  eventBus.get(event)!.push(cb);
}

export function emit(event: string, ...args: unknown[]) {
  const cbs = eventBus.get(event);
  if (cbs) cbs.forEach((cb) => cb(...args));
}

export class CityBuilder {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Mesh;
  private buildingMeshes: Map<string, THREE.Group> = new Map();
  private selectionBox: THREE.LineSegments | null = null;
  private selectionPulseTime = 0;
  private selectedId: string | null = null;
  private placementMode: BuildingType | null = null;
  private isDragging = false;
  private isRotating = false;
  private dragStart: THREE.Vector2 = new THREE.Vector2();
  private dragCurrent: THREE.Vector2 = new THREE.Vector2();
  private deleteAnimations: {
    mesh: THREE.Group;
    startTime: number;
    duration: number;
  }[] = [];
  private spawnAnimations: {
    mesh: THREE.Group;
    startTime: number;
    duration: number;
    fromY: number;
    toY: number;
    isUndo: boolean;
  }[] = [];
  private angleTooltip: HTMLDivElement | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, groundPlane: THREE.Mesh) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = groundPlane;
    this.createAngleTooltip();
  }

  private createAngleTooltip() {
    const el = document.createElement('div');
    el.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #00bcd4; font-size: 18px; font-family: monospace;
      background: rgba(0,0,0,0.7); padding: 4px 12px; border-radius: 6px;
      pointer-events: none; display: none; z-index: 100;
    `;
    document.body.appendChild(el);
    this.angleTooltip = el;
  }

  setPlacementMode(type: BuildingType | null) {
    this.placementMode = type;
    this.deselect();
    if (type) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'default';
    }
    emit('placementModeChanged', type);
  }

  getPlacementMode(): BuildingType | null {
    return this.placementMode;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  private createResidentialBuilding(): THREE.Group {
    const group = new THREE.Group();
    const baseW = 2 + Math.random() * 2;
    const baseD = 2 + Math.random() * 2;
    const baseH = 3 + Math.random() * 5;
    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const colors = [0x4a6fa5, 0x5b7f9e, 0x6a8dae, 0x7a9dbe];
    const baseMat = new THREE.MeshPhongMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = baseH / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const roofGeo = new THREE.ConeGeometry(Math.max(baseW, baseD) * 0.75, 2, 4);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = baseH + 1;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const windowRows = Math.floor(baseH / 1.5);
    const windowCols = Math.floor(baseW / 1.2);
    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < windowCols; c++) {
        const winGeo = new THREE.BoxGeometry(0.4, 0.5, 0.05);
        const winMat = new THREE.MeshPhongMaterial({ color: 0xffffaa, emissive: 0x444400 });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(
          -baseW / 2 + 0.6 + c * 1.2,
          1 + r * 1.5,
          baseD / 2 + 0.01,
        );
        group.add(win);
      }
    }

    group.userData.buildingType = 'residential';
    return group;
  }

  private createCommercialBuilding(): THREE.Group {
    const group = new THREE.Group();
    const baseW = 3 + Math.random() * 3;
    const baseD = 3 + Math.random() * 3;
    const baseH = 8 + Math.random() * 12;
    const baseGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
    const colors = [0x3a5a8c, 0x4a6a9c, 0x2a4a7c, 0x5a7aac];
    const baseMat = new THREE.MeshPhongMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = baseH / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    for (let i = 0; i < 3; i++) {
      const stripeGeo = new THREE.BoxGeometry(baseW + 0.1, 0.15, baseD + 0.1);
      const stripeMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.y = baseH * (0.25 + i * 0.25);
      group.add(stripe);
    }

    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
    const antennaMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = baseH + 1;
    group.add(antenna);

    const lightGeo = new THREE.SphereGeometry(0.15);
    const lightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.y = baseH + 2;
    group.add(light);

    const glassRows = Math.floor(baseH / 2);
    for (let r = 0; r < glassRows; r++) {
      const glassGeo = new THREE.BoxGeometry(baseW * 0.8, 0.8, 0.05);
      const glassMat = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.5,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 1 + r * 2, baseD / 2 + 0.01);
      group.add(glass);
    }

    group.userData.buildingType = 'commercial';
    return group;
  }

  private createPark(): THREE.Group {
    const group = new THREE.Group();
    const groundGeo = new THREE.CylinderGeometry(3, 3, 0.1, 16);
    const groundMat = new THREE.MeshPhongMaterial({ color: 0x2d5a1e });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0.05;
    ground.receiveShadow = true;
    group.add(ground);

    const treeCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < treeCount; i++) {
      const tree = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.5);
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5c3a1e });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      tree.add(trunk);

      const leafGeo = new THREE.SphereGeometry(0.8 + Math.random() * 0.4, 8, 6);
      const leafMat = new THREE.MeshPhongMaterial({ color: 0x228b22 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 1.8 + Math.random() * 0.3;
      leaf.castShadow = true;
      tree.add(leaf);

      const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 0.8 + Math.random() * 1.2;
      tree.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      group.add(tree);
    }

    const benchGeo = new THREE.BoxGeometry(1.2, 0.3, 0.4);
    const benchMat = new THREE.MeshPhongMaterial({ color: 0x8b6914 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(1.5, 0.25, 0);
    group.add(bench);

    group.userData.buildingType = 'park';
    return group;
  }

  private createStreetlight(): THREE.Group {
    const group = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4);
    const poleMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1);
    const armMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0.5, 3.8, 0);
    arm.rotation.z = Math.PI / 2;
    group.add(arm);

    const lampGeo = new THREE.SphereGeometry(0.2);
    const lampMat = new THREE.MeshPhongMaterial({
      color: 0xffffcc,
      emissive: 0xffff66,
      emissiveIntensity: 0.8,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(1, 3.7, 0);
    group.add(lamp);

    const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.2);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    group.add(base);

    group.userData.buildingType = 'streetlight';
    return group;
  }

  createBuildingModel(type: BuildingType): THREE.Group {
    switch (type) {
      case 'residential':
        return this.createResidentialBuilding();
      case 'commercial':
        return this.createCommercialBuilding();
      case 'park':
        return this.createPark();
      case 'streetlight':
        return this.createStreetlight();
    }
  }

  placeBuilding(type: BuildingType, position: THREE.Vector3): BuildingData | null {
    const data = addBuilding(type, { x: position.x, y: position.y, z: position.z });
    const model = this.createBuildingModel(type);
    model.position.set(position.x, position.y, position.z);
    model.userData.dataId = data.id;
    this.scene.add(model);
    this.buildingMeshes.set(data.id, model);
    updateBuilding(data.id, { meshId: data.id });

    this.spawnAnimations.push({
      mesh: model,
      startTime: performance.now(),
      duration: 500,
      fromY: position.y - 50,
      toY: position.y,
      isUndo: false,
    });

    return data;
  }

  restoreBuilding(data: BuildingData): THREE.Group | null {
    const model = this.createBuildingModel(data.type);
    model.position.set(data.position.x, data.position.y, data.position.z);
    model.rotation.y = data.rotation;
    model.scale.setScalar(data.scale);
    model.userData.dataId = data.id;
    this.scene.add(model);
    this.buildingMeshes.set(data.id, model);

    this.spawnAnimations.push({
      mesh: model,
      startTime: performance.now(),
      duration: 500,
      fromY: 0,
      toY: data.position.y,
      isUndo: true,
    });

    return model;
  }

  selectBuilding(id: string): boolean {
    const mesh = this.buildingMeshes.get(id);
    if (!mesh) return false;
    this.deselect();
    this.selectedId = id;

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.2, size.y + 0.2, size.z + 0.2));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.8 });
    this.selectionBox = new THREE.LineSegments(edgesGeo, edgesMat);
    this.selectionBox.position.copy(center);
    this.scene.add(this.selectionBox);
    this.selectionPulseTime = 0;

    emit('buildingSelected', id);
    return true;
  }

  deselect() {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.geometry.dispose();
      (this.selectionBox.material as THREE.Material).dispose();
      this.selectionBox = null;
    }
    const prevId = this.selectedId;
    this.selectedId = null;
    if (prevId) {
      emit('buildingDeselected', prevId);
    }
  }

  deleteSelected() {
    if (!this.selectedId) return;
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;

    const data = removeBuilding(this.selectedId);
    this.deselect();

    if (data) {
      this.deleteAnimations.push({
        mesh,
        startTime: performance.now(),
        duration: 300,
      });
    }

    emit('buildingDeleted');
    emit('deleteHistoryChanged', getDeleteHistoryCount());
  }

  performUndo() {
    const data = undoDelete();
    if (!data) return;
    this.restoreBuilding(data);
    emit('buildingRestored', data);
    emit('deleteHistoryChanged', getDeleteHistoryCount());
  }

  updateSelectedPosition(pos: { x: number; y: number; z: number }) {
    if (!this.selectedId) return;
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;
    mesh.position.set(pos.x, pos.y, pos.z);
    updateBuilding(this.selectedId, { position: { ...pos } });
    this.refreshSelectionBox(mesh);
    emit('buildingUpdated', this.selectedId);
  }

  updateSelectedScale(scale: number) {
    if (!this.selectedId) return;
    const clamped = Math.max(0.5, Math.min(2.0, scale));
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;
    mesh.scale.setScalar(clamped);
    updateBuilding(this.selectedId, { scale: clamped });
    this.refreshSelectionBox(mesh);
    emit('buildingUpdated', this.selectedId);
  }

  updateSelectedRotation(rotation: number) {
    if (!this.selectedId) return;
    const mesh = this.buildingMeshes.get(this.selectedId);
    if (!mesh) return;
    mesh.rotation.y = rotation;
    updateBuilding(this.selectedId, { rotation });
    this.refreshSelectionBox(mesh);
    if (this.angleTooltip) {
      const degrees = Math.round((rotation * 180) / Math.PI) % 360;
      this.angleTooltip.textContent = `${degrees}°`;
      this.angleTooltip.style.display = 'block';
    }
    emit('buildingUpdated', this.selectedId);
  }

  updateSelectedName(name: string) {
    if (!this.selectedId) return;
    updateBuilding(this.selectedId, { name });
    emit('buildingUpdated', this.selectedId);
  }

  private refreshSelectionBox(mesh: THREE.Group) {
    if (!this.selectionBox) return;
    this.scene.remove(this.selectionBox);
    this.selectionBox.geometry.dispose();
    (this.selectionBox.material as THREE.Material).dispose();

    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x + 0.2, size.y + 0.2, size.z + 0.2));
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00bcd4, transparent: true, opacity: 0.8 });
    this.selectionBox = new THREE.LineSegments(edgesGeo, edgesMat);
    this.selectionBox.position.copy(center);
    this.scene.add(this.selectionBox);
  }

  onMouseDown(event: MouseEvent, mouse: THREE.Vector2) {
    if (this.placementMode) return;

    this.raycaster.setFromCamera(mouse, this.camera);
    const meshes = Array.from(this.buildingMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let target: THREE.Object3D | null = intersects[0].object;
      while (target && !target.userData.dataId) {
        target = target.parent;
      }
      if (target && target.userData.dataId) {
        this.selectBuilding(target.userData.dataId);
        this.isDragging = true;
        this.dragStart.copy(mouse);
        this.dragCurrent.copy(mouse);
      }
    } else {
      this.deselect();
    }
  }

  onMouseMove(event: MouseEvent, mouse: THREE.Vector2, shiftKey: boolean) {
    if (!this.isDragging || !this.selectedId) return;
    this.dragCurrent.copy(mouse);

    if (shiftKey) {
      this.isRotating = true;
      const dx = mouse.x - this.dragStart.x;
      const step = Math.PI / 4;
      const steps = Math.round(dx * 8);
      const newRot = steps * step;
      this.updateSelectedRotation(newRot);
    } else {
      this.isRotating = false;
      this.raycaster.setFromCamera(mouse, this.camera);
      const groundIntersects = this.raycaster.intersectObject(this.groundPlane);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        this.updateSelectedPosition({ x: point.x, y: 0, z: point.z });
      }
    }
  }

  onMouseUp() {
    this.isDragging = false;
    this.isRotating = false;
    if (this.angleTooltip) {
      this.angleTooltip.style.display = 'none';
    }
  }

  onWheel(event: WheelEvent) {
    if (!this.selectedId) return;
    const data = getBuilding(this.selectedId);
    if (!data) return;
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.updateSelectedScale(data.scale + delta);
  }

  onGroundClick(mouse: THREE.Vector2) {
    if (!this.placementMode) return;
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);
    if (intersects.length > 0) {
      this.placeBuilding(this.placementMode, intersects[0].point);
    }
  }

  getMeshById(id: string): THREE.Group | undefined {
    return this.buildingMeshes.get(id);
  }

  updateAnimations(deltaMs: number) {
    const now = performance.now();

    for (let i = this.deleteAnimations.length - 1; i >= 0; i--) {
      const anim = this.deleteAnimations[i];
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      anim.mesh.scale.setScalar(1 - t);
      (anim.mesh as THREE.Object3D).traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshPhongMaterial;
          if (mat.transparent !== undefined) {
            mat.transparent = true;
            mat.opacity = 1 - t;
          }
        }
      });
      if (t >= 1) {
        this.scene.remove(anim.mesh);
        anim.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        this.deleteAnimations.splice(i, 1);
      }
    }

    for (let i = this.spawnAnimations.length - 1; i >= 0; i--) {
      const anim = this.spawnAnimations[i];
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      anim.mesh.position.y = anim.fromY + (anim.toY - anim.fromY) * easeOut;

      if (anim.isUndo) {
        const scaleT = easeOut;
        anim.mesh.scale.setScalar(scaleT);
      }

      if (t >= 1) {
        anim.mesh.position.y = anim.toY;
        if (anim.isUndo) {
          anim.mesh.scale.setScalar(1);
        }
        this.spawnAnimations.splice(i, 1);
      }
    }

    if (this.selectionBox) {
      this.selectionPulseTime += deltaMs;
      const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((this.selectionPulseTime / 1500) * Math.PI * 2));
      (this.selectionBox.material as THREE.LineBasicMaterial).opacity = pulse;
    }
  }
}
