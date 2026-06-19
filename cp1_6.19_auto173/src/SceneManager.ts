import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Furniture, FurnitureType, FurniturePosition } from './Parser';

export interface SceneManagerCallbacks {
  onFurnitureSelect?: (id: string | null) => void;
  onFurnitureMove?: (id: string, position: FurniturePosition) => void;
  onContextMenu?: (id: string, screenX: number, screenY: number) => void;
}

interface FurnitureObject {
  group: THREE.Group;
  data: Furniture;
  highlightMesh?: THREE.Mesh;
  shadowMesh?: THREE.Mesh;
}

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private furnitureMap: Map<string, FurnitureObject> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedId: string | null = null;
  private isDragging = false;
  private dragPlane: THREE.Plane;
  private dragOffset: THREE.Vector3;
  private callbacks: SceneManagerCallbacks;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  private groundPlane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private animatingObjects: Map<string, { startTime: number; duration: number; type: 'fadeIn' | 'fadeOut' | 'move'; startPos?: THREE.Vector3; endPos?: THREE.Vector3 }> = new Map();

  constructor(container: HTMLElement, callbacks: SceneManagerCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe8edf2);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2.1;

    this.groundPlane = this.createGround();
    this.scene.add(this.groundPlane);

    this.gridHelper = new THREE.GridHelper(20, 40, 0xcccccc, 0xe0e0e0);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    this.setupLights();
    this.setupEventListeners();
    this.animate();
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(30, 30);
    const material = new THREE.MeshStandardMaterial({
      color: 0xe8edf2,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    return ground;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xa0c4ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);

    window.addEventListener('resize', this.onWindowResize);
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      Array.from(this.furnitureMap.values()).map(f => f.group),
      true
    );

    if (intersects.length > 0) {
      let object: THREE.Object3D | null = intersects[0].object;
      while (object && !object.userData.furnitureId) {
        object = object.parent;
      }

      if (object && object.userData.furnitureId) {
        const id = object.userData.furnitureId;
        this.selectFurniture(id);
        this.isDragging = true;
        this.controls.enabled = false;

        const furnitureObj = this.furnitureMap.get(id);
        if (furnitureObj) {
          const intersectPoint = intersects[0].point.clone();
          const worldPos = new THREE.Vector3();
          furnitureObj.group.getWorldPosition(worldPos);
          
          this.dragOffset.copy(worldPos).sub(intersectPoint);
          this.dragOffset.y = 0;

          this.showShadow(id);
        }
      }
    } else {
      this.selectFurniture(null);
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.updateMouse(event);

    if (this.isDragging && this.selectedId) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersectPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);

      if (intersectPoint) {
        const newPos = intersectPoint.add(this.dragOffset);
        newPos.y = 0;
        this.moveFurnitureVisual(this.selectedId, newPos);
        this.updateShadowPosition(this.selectedId, newPos);
      }
    }
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) return;

    if (this.isDragging && this.selectedId) {
      this.isDragging = false;
      this.controls.enabled = true;
      this.hideShadow(this.selectedId);

      const furnitureObj = this.furnitureMap.get(this.selectedId);
      if (furnitureObj) {
        const worldPos = new THREE.Vector3();
        furnitureObj.group.getWorldPosition(worldPos);
        
        const snappedPos = {
          x: Math.round(worldPos.x * 2) / 2,
          y: 0,
          z: Math.round(worldPos.z * 2) / 2,
        };

        this.animateMoveTo(this.selectedId, snappedPos);

        if (this.callbacks.onFurnitureMove) {
          this.callbacks.onFurnitureMove(this.selectedId, snappedPos);
        }
      }
    }
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      Array.from(this.furnitureMap.values()).map(f => f.group),
      true
    );

    if (intersects.length > 0) {
      let object: THREE.Object3D | null = intersects[0].object;
      while (object && !object.userData.furnitureId) {
        object = object.parent;
      }

      if (object && object.userData.furnitureId) {
        const id = object.userData.furnitureId;
        this.selectFurniture(id);
        
        if (this.callbacks.onContextMenu) {
          this.callbacks.onContextMenu(id, event.clientX, event.clientY);
        }
      }
    }
  };

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onWindowResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  selectFurniture(id: string | null): void {
    if (this.selectedId === id) return;

    if (this.selectedId) {
      this.hideHighlight(this.selectedId);
    }

    this.selectedId = id;

    if (id) {
      this.showHighlight(id);
    }

    if (this.callbacks.onFurnitureSelect) {
      this.callbacks.onFurnitureSelect(id);
    }
  }

  private showHighlight(id: string): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;

    if (furnitureObj.highlightMesh) {
      furnitureObj.highlightMesh.visible = true;
      return;
    }

    const box = new THREE.Box3().setFromObject(furnitureObj.group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const geometry = new THREE.BoxGeometry(
      size.x + 0.1,
      size.y + 0.05,
      size.z + 0.1
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xff8c42,
      transparent: true,
      opacity: 1,
    });

    const highlight = new THREE.LineSegments(edges, material);
    highlight.position.copy(center);
    highlight.userData.isHighlight = true;

    furnitureObj.group.add(highlight);
    furnitureObj.highlightMesh = highlight as unknown as THREE.Mesh;
  }

  private hideHighlight(id: string): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj || !furnitureObj.highlightMesh) return;
    furnitureObj.highlightMesh.visible = false;
  }

  private showShadow(id: string): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;

    if (furnitureObj.shadowMesh) {
      furnitureObj.shadowMesh.visible = true;
      return;
    }

    const box = new THREE.Box3().setFromObject(furnitureObj.group);
    const size = new THREE.Vector3();
    box.getSize(size);

    const geometry = new THREE.PlaneGeometry(size.x * 1.1, size.z * 1.1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    const shadow = new THREE.Mesh(geometry, material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.visible = true;

    furnitureObj.group.add(shadow);
    furnitureObj.shadowMesh = shadow;
  }

  private hideShadow(id: string): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj || !furnitureObj.shadowMesh) return;
    furnitureObj.shadowMesh.visible = false;
  }

  private updateShadowPosition(id: string, pos: THREE.Vector3): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj || !furnitureObj.shadowMesh) return;
    furnitureObj.shadowMesh.position.x = pos.x;
    furnitureObj.shadowMesh.position.z = pos.z;
  }

  private moveFurnitureVisual(id: string, position: THREE.Vector3): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;
    furnitureObj.group.position.copy(position);
  }

  private animateMoveTo(id: string, targetPos: FurniturePosition): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;

    const startPos = furnitureObj.group.position.clone();
    const endPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);

    this.animatingObjects.set(id, {
      startTime: this.clock.getElapsedTime(),
      duration: 0.2,
      type: 'move',
      startPos,
      endPos,
    });
  }

  addFurniture(furniture: Furniture): void {
    if (this.furnitureMap.has(furniture.id)) return;

    const group = this.createFurnitureModel(furniture);
    group.userData.furnitureId = furniture.id;

    group.position.set(furniture.position.x, furniture.position.y, furniture.position.z);
    group.scale.set(0, 0, 0);

    this.scene.add(group);
    this.furnitureMap.set(furniture.id, { group, data: furniture });

    this.animateFadeIn(furniture.id);
  }

  private animateFadeIn(id: string): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;

    this.animatingObjects.set(id, {
      startTime: this.clock.getElapsedTime(),
      duration: 0.3,
      type: 'fadeIn',
    });
  }

  removeFurniture(id: string): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;

    this.animateFadeOut(id, () => {
      this.scene.remove(furnitureObj.group);
      furnitureObj.group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.furnitureMap.delete(id);
      this.animatingObjects.delete(id);
    });

    if (this.selectedId === id) {
      this.selectedId = null;
    }
  }

  private animateFadeOut(id: string, onComplete: () => void): void {
    this.animatingObjects.set(id, {
      startTime: this.clock.getElapsedTime(),
      duration: 0.5,
      type: 'fadeOut',
    });

    setTimeout(onComplete, 500);
  }

  clearAll(): void {
    const ids = Array.from(this.furnitureMap.keys());
    ids.forEach(id => this.removeFurniture(id));
  }

  updateFurniturePosition(id: string, position: FurniturePosition): void {
    const furnitureObj = this.furnitureMap.get(id);
    if (!furnitureObj) return;

    furnitureObj.group.position.set(position.x, position.y, position.z);
    furnitureObj.data.position = { ...position };
  }

  private createFurnitureModel(furniture: Furniture): THREE.Group {
    const group = new THREE.Group();

    switch (furniture.type) {
      case 'sofa':
        this.createSofa(group, furniture);
        break;
      case 'table':
        this.createTable(group, furniture);
        break;
      case 'bookshelf':
        this.createBookshelf(group, furniture);
        break;
      case 'lamp':
        this.createLamp(group, furniture);
        break;
    }

    return group;
  }

  private createSofa(group: THREE.Group, furniture: Furniture): void {
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.7,
      metalness: 0.1,
    });

    const seatHeight = 0.4;
    const depth = 0.8;
    const backHeight = 0.5;
    const armHeight = 0.3;

    const mainLength = 1.5;
    const sideLength = 1.5;

    const mainSeat = new THREE.Mesh(
      new THREE.BoxGeometry(mainLength, seatHeight, depth),
      material
    );
    mainSeat.position.y = seatHeight / 2;
    mainSeat.position.z = -sideLength / 2 + depth / 2;
    mainSeat.castShadow = true;
    mainSeat.receiveShadow = true;
    group.add(mainSeat);

    const mainBack = new THREE.Mesh(
      new THREE.BoxGeometry(mainLength, backHeight, 0.15),
      material
    );
    mainBack.position.y = seatHeight + backHeight / 2;
    mainBack.position.z = -sideLength / 2 + depth - 0.075;
    mainBack.castShadow = true;
    group.add(mainBack);

    const sideSeat = new THREE.Mesh(
      new THREE.BoxGeometry(depth, seatHeight, sideLength),
      material
    );
    sideSeat.position.y = seatHeight / 2;
    sideSeat.position.x = -mainLength / 2 + depth / 2;
    sideSeat.castShadow = true;
    sideSeat.receiveShadow = true;
    group.add(sideSeat);

    const sideBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, backHeight, sideLength),
      material
    );
    sideBack.position.y = seatHeight + backHeight / 2;
    sideBack.position.x = -mainLength / 2 + 0.075;
    sideBack.castShadow = true;
    group.add(sideBack);

    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, armHeight, depth),
      material
    );
    leftArm.position.y = seatHeight + armHeight / 2;
    leftArm.position.x = mainLength / 2 - 0.075;
    leftArm.position.z = -sideLength / 2 + depth / 2;
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(depth, armHeight, 0.15),
      material
    );
    rightArm.position.y = seatHeight + armHeight / 2;
    rightArm.position.x = -mainLength / 2 + depth / 2;
    rightArm.position.z = -sideLength / 2 + 0.075;
    rightArm.castShadow = true;
    group.add(rightArm);
  }

  private createTable(group: THREE.Group, furniture: Furniture): void {
    const material = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
    });

    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 0.6),
      material
    );
    tableTop.position.y = 0.3;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x708090,
      metalness: 0.8,
      roughness: 0.2,
    });

    const legPositions = [
      { x: -0.5, z: -0.2 },
      { x: 0.5, z: -0.2 },
      { x: -0.5, z: 0.2 },
      { x: 0.5, z: 0.2 },
    ];

    for (const pos of legPositions) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
        legMaterial
      );
      leg.position.set(pos.x, 0.15, pos.z);
      leg.castShadow = true;
      group.add(leg);
    }
  }

  private createBookshelf(group: THREE.Group, furniture: Furniture): void {
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.6,
      metalness: 0.1,
    });

    const width = 1.0;
    const height = 1.8;
    const depth = 0.3;
    const shelfCount = 5;
    const thickness = 0.03;

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, thickness),
      material
    );
    back.position.y = height / 2;
    back.position.z = -depth / 2 + thickness / 2;
    back.castShadow = true;
    group.add(back);

    const leftSide = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      material
    );
    leftSide.position.x = -width / 2 + thickness / 2;
    leftSide.position.y = height / 2;
    leftSide.castShadow = true;
    group.add(leftSide);

    const rightSide = new THREE.Mesh(
      new THREE.BoxGeometry(thickness, height, depth),
      material
    );
    rightSide.position.x = width / 2 - thickness / 2;
    rightSide.position.y = height / 2;
    rightSide.castShadow = true;
    group.add(rightSide);

    const shelfHeight = height / shelfCount;
    for (let i = 0; i <= shelfCount; i++) {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(width, thickness, depth),
        material
      );
      shelf.position.y = i * shelfHeight + thickness / 2;
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
    }
  }

  private createLamp(group: THREE.Group, furniture: Furniture): void {
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.8,
      roughness: 0.2,
    });

    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      roughness: 0.3,
    });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.03, 16),
      poleMaterial
    );
    base.position.y = 0.015;
    base.castShadow = true;
    group.add(base);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8),
      poleMaterial
    );
    pole.position.y = 0.23;
    pole.castShadow = true;
    group.add(pole);

    const shade = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      shadeMaterial
    );
    shade.position.y = 0.45;
    shade.castShadow = true;
    group.add(shade);

    const light = new THREE.PointLight(0xffeedd, 0.5, 3);
    light.position.y = 0.45;
    group.add(light);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();

    this.updateAnimations(elapsed);
    this.updateHighlightPulse(elapsed);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateAnimations(elapsed: number): void {
    for (const [id, anim] of this.animatingObjects.entries()) {
      const furnitureObj = this.furnitureMap.get(id);
      if (!furnitureObj) continue;

      const progress = Math.min((elapsed - anim.startTime) / anim.duration, 1);

      if (anim.type === 'fadeIn') {
        const eased = this.easeOutBack(progress);
        furnitureObj.group.scale.setScalar(eased);
      } else if (anim.type === 'fadeOut') {
        const eased = 1 - this.easeInBack(progress);
        furnitureObj.group.scale.setScalar(Math.max(eased, 0));
      } else if (anim.type === 'move' && anim.startPos && anim.endPos) {
        const eased = this.easeOutElastic(progress);
        const pos = anim.startPos.clone().lerp(anim.endPos, eased);
        furnitureObj.group.position.copy(pos);
      }

      if (progress >= 1) {
        if (anim.type !== 'fadeOut') {
          this.animatingObjects.delete(id);
        }
      }
    }
  }

  private updateHighlightPulse(elapsed: number): void {
    if (!this.selectedId) return;

    const furnitureObj = this.furnitureMap.get(this.selectedId);
    if (!furnitureObj || !furnitureObj.highlightMesh) return;

    const pulse = 0.6 + 0.4 * Math.sin(elapsed * Math.PI * 2);
    const material = (furnitureObj.highlightMesh as any).material as THREE.Material;
    if ('opacity' in material) {
      (material as any).opacity = pulse;
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onWindowResize);

    this.clearAll();

    this.controls.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
