import * as THREE from 'three';
import { Atom } from './atom';
import { MoleculeManager } from './molecule';
import { UIController } from './ui';

class MoleculeSandbox {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private moleculeManager: MoleculeManager;
  private uiController: UIController;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private selectedAtomId: string | null = null;
  private hoveredAtomId: string | null = null;

  private isDraggingItem: boolean = false;
  private dragType: 'atom' | 'group' | null = null;
  private dragKey: string | null = null;
  private ghostMesh: THREE.Object3D | null = null;

  private autoRotate: boolean = false;
  private isOptimizing: boolean = false;
  private rotationSpeed: number = (5 * Math.PI) / 180;

  private keysPressed: Set<string> = new Set();

  private isUserRotating: boolean = false;
  private isUserPanning: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };

  private sphericalTarget: { theta: number; phi: number; radius: number } = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 15
  };
  private sphericalCurrent: { theta: number; phi: number; radius: number } = {
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 15
  };
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private panOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private clock: THREE.Clock;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);
    this.scene.fog = new THREE.Fog(0x0d1117, 30, 80);

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');
    this.container = container;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.moleculeManager = new MoleculeManager(this.scene);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupGridHelper();

    this.uiController = new UIController(this.moleculeManager, {
      onAddAtom: (symbol) => this.addAtomAtViewCenter(symbol),
      onAddGroup: (key) => this.addGroupAtViewCenter(key),
      onOptimize: () => this.optimizeStructure(),
      onToggleRotate: () => this.toggleAutoRotate(),
      onClear: () => this.clearScene(),
      onDragStart: (type, key) => this.startExternalDrag(type, key),
      onDragEnd: () => this.endExternalDrag()
    });

    this.bindEvents();
    this.uiController.updatePropertyPanel();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x58a6ff, 0.8);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xbc8cff, 0.4);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 10, -15);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x58a6ff, 0.3, 30);
    pointLight1.position.set(-8, 8, 8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xbc8cff, 0.3, 30);
    pointLight2.position.set(8, -5, -8);
    this.scene.add(pointLight2);
  }

  private setupGridHelper(): void {
    const gridHelper = new THREE.GridHelper(30, 30, 0x1f2937, 0x151b23);
    gridHelper.position.y = -5;
    this.scene.add(gridHelper);
  }

  private updateCameraPosition(): void {
    const { theta, phi, radius } = this.sphericalCurrent;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);

    const target = this.cameraTarget.clone().add(this.panOffset);
    this.camera.position.set(target.x + x, target.y + y, target.z + z);
    this.camera.lookAt(target);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('dragover', (e) => this.onDragOver(e));
    canvas.addEventListener('drop', (e) => this.onDrop(e));
    canvas.addEventListener('dragleave', () => this.onDragLeave());

    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.key.toLowerCase());
      if (e.key === 'Escape') this.clearSelection();
    });
    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.isOptimizing) return;

    if (e.button === 2 && this.keysPressed.has('control')) {
      this.isUserRotating = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    } else if (e.button === 0 && this.keysPressed.has('shift')) {
      this.isUserPanning = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    this.isUserRotating = false;
    this.isUserPanning = false;
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.isUserRotating) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.sphericalTarget.theta -= dx * 0.005;
      this.sphericalTarget.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.sphericalTarget.phi + dy * 0.005));
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (this.isUserPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;

      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();

      const panFactor = 0.02 * this.sphericalCurrent.radius / 10;
      this.panOffset.add(right.multiplyScalar(-dx * panFactor));
      this.panOffset.y += dy * panFactor;

      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }

    if (this.isDraggingItem && this.ghostMesh) {
      const worldPos = this.getPlaneIntersection();
      if (worldPos) this.ghostMesh.position.copy(worldPos);
    }

    this.updateHover();
  }

  private onWheel(e: WheelEvent): void {
    if (this.isOptimizing) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.sphericalTarget.radius = Math.max(3, Math.min(50, this.sphericalTarget.radius * factor));
  }

  private onClick(e: MouseEvent): void {
    if (this.isOptimizing) return;
    if (this.isUserRotating || this.isUserPanning) return;
    if (this.isDraggingItem) return;

    if (this.keysPressed.has('control') || this.keysPressed.has('shift')) return;

    this.updateMouse(e);
    const hitAtom = this.pickAtom();

    if (hitAtom) {
      if (this.selectedAtomId === null) {
        this.selectAtom(hitAtom.id);
      } else if (this.selectedAtomId === hitAtom.id) {
        this.deselectAtom(hitAtom.id);
      } else {
        this.tryConnectAtoms(this.selectedAtomId, hitAtom.id);
        this.clearSelection();
      }
    } else {
      this.clearSelection();
    }
  }

  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!this.isDraggingItem && e.dataTransfer) {
      const data = e.dataTransfer.getData('text/plain');
      if (data.startsWith('atom:')) {
        this.startExternalDrag('atom', data.slice(5));
      } else if (data.startsWith('group:')) {
        this.startExternalDrag('group', data.slice(6));
      }
    }

    if (this.ghostMesh) {
      const ev = e as unknown as MouseEvent;
      this.updateMouseFromEvent(ev);
      const worldPos = this.getPlaneIntersection();
      if (worldPos) this.ghostMesh.position.copy(worldPos);
    }
  }

  private onDrop(e: DragEvent): void {
    e.preventDefault();
    if (this.isDraggingItem && this.dragType && this.dragKey) {
      const worldPos = this.getPlaneIntersection() || new THREE.Vector3(0, 0, 0);
      if (this.dragType === 'atom') {
        this.moleculeManager.addAtom(this.dragKey, worldPos);
      } else if (this.dragType === 'group') {
        this.moleculeManager.addGroup(this.dragKey, worldPos);
      }
    }
    this.endExternalDrag();
  }

  private onDragLeave(): void {
  }

  private startExternalDrag(type: 'atom' | 'group', key: string): void {
    this.isDraggingItem = true;
    this.dragType = type;
    this.dragKey = key;
    this.createGhostMesh(type, key);
  }

  private endExternalDrag(): void {
    this.isDraggingItem = false;
    this.dragType = null;
    this.dragKey = null;
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
  }

  private createGhostMesh(type: 'atom' | 'group', key: string): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
    }

    const center = this.getPlaneIntersection() || new THREE.Vector3(0, 0, 0);
    const group = new THREE.Group();

    if (type === 'atom') {
      const temp = new Atom(key, new THREE.Vector3(0, 0, 0));
      temp.mesh.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const clonedMat = (mesh.material as THREE.Material).clone();
          (clonedMat as THREE.MeshStandardMaterial).transparent = true;
          (clonedMat as THREE.MeshStandardMaterial).opacity = 0.5;
          const clone = new THREE.Mesh(mesh.geometry, clonedMat);
          clone.position.copy(mesh.position);
          group.add(clone);
        }
      });
    }

    group.position.copy(center);
    this.scene.add(group);
    this.ghostMesh = group;
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateMouseFromEvent(e: MouseEvent): void {
    this.updateMouse(e);
  }

  private getPlaneIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.cameraTarget.y);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, point)) {
      return point;
    }
    return null;
  }

  private pickAtom(): Atom | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.moleculeManager.atoms.forEach(a => meshes.push(a.sphere));
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.atom) {
        obj = obj.parent;
      }
      if (obj && obj.userData.atom) {
        return obj.userData.atom as Atom;
      }
    }
    return null;
  }

  private updateHover(): void {
    const hitAtom = this.pickAtom();
    const newHoverId = hitAtom ? hitAtom.id : null;

    if (newHoverId !== this.hoveredAtomId) {
      if (this.hoveredAtomId) {
        const prev = this.moleculeManager.getAtomById(this.hoveredAtomId);
        if (prev) prev.setHovered(false);
      }
      if (newHoverId) {
        hitAtom!.setHovered(true);
      }
      this.hoveredAtomId = newHoverId;
    }
  }

  private selectAtom(atomId: string): void {
    this.selectedAtomId = atomId;
    const atom = this.moleculeManager.getAtomById(atomId);
    if (atom) atom.setSelected(true);
  }

  private deselectAtom(atomId: string): void {
    this.selectedAtomId = null;
    const atom = this.moleculeManager.getAtomById(atomId);
    if (atom) atom.setSelected(false);
  }

  private clearSelection(): void {
    if (this.selectedAtomId) {
      const atom = this.moleculeManager.getAtomById(this.selectedAtomId);
      if (atom) atom.setSelected(false);
    }
    this.selectedAtomId = null;
  }

  private tryConnectAtoms(id1: string, id2: string): void {
    this.moleculeManager.cycleBondOrder(id1, id2);
  }

  private addAtomAtViewCenter(symbol: string): void {
    if (this.isOptimizing) return;
    const center = this.cameraTarget.clone().add(this.panOffset);
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
    this.moleculeManager.addAtom(symbol, center.add(offset));
  }

  private addGroupAtViewCenter(groupKey: string): void {
    if (this.isOptimizing) return;
    const center = this.cameraTarget.clone().add(this.panOffset);
    this.moleculeManager.addGroup(groupKey, center);
  }

  private async optimizeStructure(): Promise<void> {
    if (this.isOptimizing) return;
    if (this.moleculeManager.atoms.size < 2) return;

    this.isOptimizing = true;
    this.uiController.showLoading(true);
    this.clearSelection();

    const startTime = performance.now();
    await this.moleculeManager.optimizeStructure();
    const elapsed = performance.now() - startTime;

    const minDuration = 500;
    if (elapsed < minDuration) {
      await new Promise(r => setTimeout(r, minDuration - elapsed));
    }

    this.cameraTarget.copy(this.moleculeManager.getCenter());
    this.panOffset.set(0, 0, 0);

    this.uiController.showLoading(false);
    this.isOptimizing = false;
    this.uiController.updatePropertyPanel();
  }

  private toggleAutoRotate(): void {
    this.autoRotate = this.uiController.isRotationEnabled();
  }

  private clearScene(): void {
    if (this.isOptimizing) return;
    this.clearSelection();
    this.moleculeManager.clear();
    this.cameraTarget.set(0, 0, 0);
    this.panOffset.set(0, 0, 0);
    this.uiController.resetRotateButton();
    this.autoRotate = false;
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();

    if (this.autoRotate && !this.isUserRotating && !this.isOptimizing) {
      this.sphericalTarget.theta += this.rotationSpeed * dt;
    }

    this.sphericalCurrent.theta += (this.sphericalTarget.theta - this.sphericalCurrent.theta) * 0.1;
    this.sphericalCurrent.phi += (this.sphericalTarget.phi - this.sphericalCurrent.phi) * 0.1;
    this.sphericalCurrent.radius += (this.sphericalTarget.radius - this.sphericalCurrent.radius) * 0.1;

    this.updateCameraPosition();
    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new MoleculeSandbox();
  app.start();
});
