import * as THREE from 'three';

export type BuildingStyle = 'modern' | 'classic' | 'futuristic';

export interface BuildingData {
  id: number;
  group: THREE.Group;
  style: BuildingStyle;
  height: number;
  position: THREE.Vector3;
  shadow: THREE.Mesh;
  animating: boolean;
  animStart: number;
  startY: number;
  targetY: number;
  meshes: THREE.Mesh[];
}

export interface BuildingPlacementCallback {
  (position: THREE.Vector3): void;
}

export class BuildingManager {
  private scene: THREE.Scene;
  private buildings: Map<number, BuildingData> = new Map();
  private nextId: number = 1;
  private baseRadius: number = 200;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private groundMesh: THREE.Mesh | null = null;

  private isDragging: boolean = false;
  private dragStartPos: THREE.Vector2 | null = null;
  private lastClickTime: number = 0;
  private selectedBuildingId: number | null = null;

  public onBuildingSelected: ((id: number | null, data: BuildingData | null) => void) | null = null;
  public onBuildingPlaced: (() => void) | null = null;
  public onBuildingRemoved: (() => void) | null = null;
  public onBuildingChanged: (() => void) | null = null;

  private static readonly STYLES: BuildingStyle[] = ['modern', 'classic', 'futuristic'];

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  public setGroundMesh(mesh: THREE.Mesh): void {
    this.groundMesh = mesh;
  }

  public getBuildingCount(): number {
    return this.buildings.size;
  }

  public getMaxHeight(): number {
    let max = 0;
    for (const b of this.buildings.values()) {
      if (b.height > max) max = b.height;
    }
    return max;
  }

  public getBuilding(id: number): BuildingData | null {
    return this.buildings.get(id) || null;
  }

  public getSelectedBuilding(): BuildingData | null {
    return this.selectedBuildingId ? this.buildings.get(this.selectedBuildingId) || null : null;
  }

  public clearSelection(): void {
    this.selectedBuildingId = null;
    if (this.onBuildingSelected) this.onBuildingSelected(null, null);
  }

  public handlePointerDown(event: PointerEvent): void {
    this.isDragging = true;
    this.dragStartPos = new THREE.Vector2(event.clientX, event.clientY);
  }

  public handlePointerMove(_event: PointerEvent): void {}

  public handlePointerUp(event: PointerEvent): void {
    if (!this.isDragging || !this.dragStartPos) return;
    this.isDragging = false;

    const endPos = new THREE.Vector2(event.clientX, event.clientY);
    const distance = this.dragStartPos.distanceTo(endPos);
    const isClick = distance < 5;
    const now = performance.now();

    if (isClick) {
      if (now - this.lastClickTime < 300) {
        this.lastClickTime = 0;
      } else {
        this.lastClickTime = now;
        setTimeout(() => {
          if (performance.now() - now >= 280 && this.lastClickTime === now) {
            this.handleSingleClick(event);
          }
        }, 290);
      }
    } else {
      this.placeBuildingFromDrag(this.dragStartPos, endPos);
    }
    this.dragStartPos = null;
  }

  private handleSingleClick(event: PointerEvent): void {
    const ndc = this.getNDC(event.clientX, event.clientY);
    this.raycaster.setFromCamera(ndc, this.camera);

    const allBuildingMeshes: THREE.Object3D[] = [];
    for (const b of this.buildings.values()) {
      allBuildingMeshes.push(b.group);
    }

    const intersects = this.raycaster.intersectObjects(allBuildingMeshes, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.buildingId) {
        obj = obj.parent;
      }
      if (obj && obj.userData.buildingId) {
        const id = obj.userData.buildingId as number;
        this.selectedBuildingId = id;
        const data = this.buildings.get(id) || null;
        if (this.onBuildingSelected) this.onBuildingSelected(id, data);
        return;
      }
    }

    if (this.groundMesh) {
      const groundIntersects = this.raycaster.intersectObject(this.groundMesh);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;
        if (this.isInsideBase(point)) {
          const style = BuildingManager.STYLES[Math.floor(Math.random() * 3)];
          const height = 10 + Math.random() * 70;
          this.createBuilding(point, style, height);
          this.clearSelection();
          return;
        }
      }
    }

    this.clearSelection();
  }

  private placeBuildingFromDrag(start: THREE.Vector2, end: THREE.Vector2): void {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const ndc = this.getNDC(midX, midY);
    this.raycaster.setFromCamera(ndc, this.camera);

    if (!this.groundMesh) return;
    const intersects = this.raycaster.intersectObject(this.groundMesh);
    if (intersects.length === 0) return;

    const point = intersects[0].point;
    if (!this.isInsideBase(point)) return;

    const style = BuildingManager.STYLES[Math.floor(Math.random() * 3)];
    const dragDist = start.distanceTo(end);
    const height = Math.max(10, Math.min(80, 10 + dragDist * 0.15));
    this.createBuilding(point, style, height);
    this.clearSelection();
  }

  private getNDC(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.camera.userData.canvasRect as DOMRect | undefined;
    const w = rect?.width || window.innerWidth;
    const h = rect?.height || window.innerHeight;
    const l = rect?.left || 0;
    const t = rect?.top || 0;
    return new THREE.Vector2(
      ((clientX - l) / w) * 2 - 1,
      -((clientY - t) / h) * 2 + 1
    );
  }

  private isInsideBase(point: THREE.Vector3): boolean {
    const dx = point.x;
    const dz = point.z;
    return dx * dx + dz * dz <= (this.baseRadius - 3) * (this.baseRadius - 3);
  }

  public createBuilding(position: THREE.Vector3, style: BuildingStyle, height: number): BuildingData {
    const group = new THREE.Group();
    group.position.set(position.x, 0, position.z);
    group.userData.buildingId = this.nextId;

    const meshes: THREE.Mesh[] = [];
    this.buildGeometry(group, style, height, meshes);

    meshes.forEach(m => {
      m.userData.buildingId = this.nextId;
      m.castShadow = true;
      m.receiveShadow = true;
    });

    const shadowGeo = new THREE.CircleGeometry(4 + height * 0.04, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    shadow.scale.setScalar(0.8 + height * 0.005);
    group.add(shadow);

    this.scene.add(group);

    const data: BuildingData = {
      id: this.nextId,
      group,
      style,
      height,
      position: position.clone(),
      shadow,
      animating: true,
      animStart: performance.now(),
      startY: -height,
      targetY: 0,
      meshes
    };

    this.buildings.set(this.nextId, data);
    this.nextId++;

    if (this.onBuildingPlaced) this.onBuildingPlaced();
    return data;
  }

  private buildGeometry(group: THREE.Group, style: BuildingStyle, height: number, meshes: THREE.Mesh[]): void {
    if (style === 'modern') {
      const baseW = 5 + Math.random() * 3;
      const baseD = 5 + Math.random() * 3;
      const mainGeo = new THREE.BoxGeometry(baseW, height, baseD);
      const mainMat = this.createGradientMaterial('#3498db', '#2980b9');
      const mainMesh = new THREE.Mesh(mainGeo, mainMat);
      mainMesh.position.y = height / 2;
      group.add(mainMesh);
      meshes.push(mainMesh);

      const topSize = Math.min(baseW, baseD) * 0.4;
      const topH = 2 + Math.random() * 3;
      const topGeo = new THREE.BoxGeometry(topSize, topH, topSize);
      const topMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.6, roughness: 0.3 });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = height + topH / 2;
      group.add(topMesh);
      meshes.push(topMesh);

      this.addWindowLights(group, baseW, baseD, height, meshes);
    } else if (style === 'classic') {
      const baseW = 6 + Math.random() * 3;
      const baseD = 6 + Math.random() * 3;
      const mainH = height * 0.75;
      const roofH = height * 0.25;

      const mainGeo = new THREE.BoxGeometry(baseW, mainH, baseD);
      const mainMat = this.createGradientMaterial('#d4a574', '#b8860b');
      const mainMesh = new THREE.Mesh(mainGeo, mainMat);
      mainMesh.position.y = mainH / 2;
      group.add(mainMesh);
      meshes.push(mainMesh);

      const roofShape = new THREE.Shape();
      roofShape.moveTo(-baseW / 2 - 0.5, 0);
      roofShape.lineTo(baseW / 2 + 0.5, 0);
      roofShape.lineTo(0, roofH);
      roofShape.closePath();
      const extrudeSettings = { depth: baseD + 1, bevelEnabled: false };
      const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.8 });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.rotation.y = Math.PI / 2;
      roofMesh.position.set(0, mainH, -baseD / 2 - 0.5);
      roofMesh.rotation.y = -Math.PI / 2;
      roofMesh.position.set(baseD / 2 + 0.5, mainH, 0);
      roofMesh.rotation.y = 0;
      roofMesh.position.set(0, mainH, -(baseD + 1) / 2);
      group.add(roofMesh);
      meshes.push(roofMesh);

      this.addWindowLights(group, baseW, baseD, mainH, meshes);
    } else {
      const radius = 2.5 + Math.random() * 2;
      const mainGeo = new THREE.CylinderGeometry(radius, radius * 1.1, height, 24);
      const mainMat = this.createGradientMaterial('#9b59b6', '#8e44ad');
      const mainMesh = new THREE.Mesh(mainGeo, mainMat);
      mainMesh.position.y = height / 2;
      group.add(mainMesh);
      meshes.push(mainMesh);

      const ringCount = Math.floor(height / 15);
      for (let i = 1; i <= ringCount; i++) {
        const ringY = (height / (ringCount + 1)) * i;
        const ringGeo = new THREE.TorusGeometry(radius + 0.6, 0.3, 12, 48);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x00cec9,
          emissive: 0x00cec9,
          emissiveIntensity: 0.8,
          metalness: 0.9,
          roughness: 0.1
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = ringY;
        group.add(ringMesh);
        meshes.push(ringMesh);
      }

      const topH = 3 + Math.random() * 3;
      const topGeo = new THREE.ConeGeometry(radius * 0.6, topH, 16);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0xe74c3c,
        emissive: 0xe74c3c,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2
      });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = height + topH / 2;
      group.add(topMesh);
      meshes.push(topMesh);
    }
  }

  private addWindowLights(group: THREE.Group, w: number, d: number, h: number, meshes: THREE.Mesh[]): void {
    const windowColor = 0xffeaa7;
    const windowMat = new THREE.MeshStandardMaterial({
      color: windowColor,
      emissive: windowColor,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85
    });

    const floors = Math.max(3, Math.floor(h / 6));
    const floorH = h / floors;
    const winW = 0.8;
    const winH = Math.min(1.5, floorH * 0.5);

    for (let f = 1; f < floors; f++) {
      const y = f * floorH;
      const winOnX = Math.max(1, Math.floor(w / 2.5));
      const winOnZ = Math.max(1, Math.floor(d / 2.5));

      for (let i = 0; i < winOnX; i++) {
        const x = -w / 2 + (w / (winOnX + 1)) * (i + 1);
        if (Math.random() < 0.6) {
          const w1 = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), windowMat);
          w1.position.set(x, y, d / 2 + 0.01);
          group.add(w1);
          meshes.push(w1);
          const w2 = w1.clone();
          w2.position.z = -d / 2 - 0.01;
          w2.rotation.y = Math.PI;
          group.add(w2);
          meshes.push(w2);
        }
      }

      for (let i = 0; i < winOnZ; i++) {
        const z = -d / 2 + (d / (winOnZ + 1)) * (i + 1);
        if (Math.random() < 0.6) {
          const w3 = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), windowMat);
          w3.rotation.y = Math.PI / 2;
          w3.position.set(w / 2 + 0.01, y, z);
          group.add(w3);
          meshes.push(w3);
          const w4 = w3.clone();
          w4.position.x = -w / 2 - 0.01;
          w4.rotation.y = -Math.PI / 2;
          group.add(w4);
          meshes.push(w4);
        }
      }
    }
  }

  private createGradientMaterial(topColorHex: string, bottomColorHex: string): THREE.ShaderMaterial {
    const topColor = new THREE.Color(topColorHex);
    const bottomColor = new THREE.Color(bottomColorHex);

    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: topColor },
        bottomColor: { value: bottomColor }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vPosition;
        void main() {
          float t = vPosition.y / 10.0 + 0.5;
          t = clamp(t, 0.0, 1.0);
          vec3 color = mix(bottomColor, topColor, t);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }

  public updateBuildingStyle(id: number, style: BuildingStyle): void {
    const data = this.buildings.get(id);
    if (!data) return;

    data.style = style;

    for (const mesh of data.meshes) {
      data.group.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    data.meshes.length = 0;

    this.buildGeometry(data.group, style, data.height, data.meshes);
    data.meshes.forEach(m => {
      m.userData.buildingId = id;
      m.castShadow = true;
      m.receiveShadow = true;
    });

    data.animating = true;
    data.animStart = performance.now();
    data.startY = -data.height * 0.3;
    data.targetY = 0;

    if (this.onBuildingChanged) this.onBuildingChanged();
  }

  public updateBuildingHeight(id: number, height: number): void {
    const data = this.buildings.get(id);
    if (!data) return;

    data.height = Math.max(10, Math.min(80, height));

    for (const mesh of data.meshes) {
      data.group.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    data.meshes.length = 0;

    this.buildGeometry(data.group, data.style, data.height, data.meshes);
    data.meshes.forEach(m => {
      m.userData.buildingId = id;
      m.castShadow = true;
      m.receiveShadow = true;
    });

    data.shadow.scale.setScalar(0.8 + data.height * 0.005);

    data.animating = true;
    data.animStart = performance.now();
    data.startY = -data.height * 0.2;
    data.targetY = 0;

    if (this.onBuildingChanged) this.onBuildingChanged();
  }

  public removeBuilding(id: number): void {
    const data = this.buildings.get(id);
    if (!data) return;

    this.scene.remove(data.group);
    data.group.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    data.shadow.geometry.dispose();
    (data.shadow.material as THREE.Material).dispose();

    this.buildings.delete(id);
    if (this.selectedBuildingId === id) {
      this.clearSelection();
    }
    if (this.onBuildingRemoved) this.onBuildingRemoved();
  }

  public update(deltaTime: number): void {
    const now = performance.now();
    const animDuration = 500;

    for (const data of this.buildings.values()) {
      if (data.animating) {
        const elapsed = now - data.animStart;
        if (elapsed >= animDuration) {
          data.group.position.y = data.targetY;
          data.animating = false;
        } else {
          const t = elapsed / animDuration;
          const eased = 1 - Math.pow(1 - t, 3);
          data.group.position.y = data.startY + (data.targetY - data.startY) * eased;
        }
      }
    }
    void deltaTime;
  }
}
