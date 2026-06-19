import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Renderer3D } from './Renderer3D';
import { UIDataManager } from './UIDataManager';

const GRID_SIZE = 20;

export class TerrainEditor {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private renderer3D: Renderer3D;
  private dataManager: UIDataManager;

  private groundMesh: THREE.Mesh;
  private gridHelper: THREE.GridHelper;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private dragThreshold: number = 5;
  private mouseHasMoved: boolean = false;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2332);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    const distance = 30;
    const angle = (45 * Math.PI) / 180;
    this.camera.position.set(
      distance * Math.cos(angle) * Math.cos(Math.PI / 4),
      distance * Math.sin(angle),
      distance * Math.cos(angle) * Math.sin(Math.PI / 4)
    );
    this.camera.lookAt(0, 0, 0);

    this.setupLights();

    this.groundMesh = this.createGround();
    this.scene.add(this.groundMesh);

    this.gridHelper = new THREE.GridHelper(
      GRID_SIZE,
      GRID_SIZE,
      0xffffff30,
      0xffffff20
    );
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.2;
    this.scene.add(this.gridHelper);

    this.controls = new OrbitControls(this.camera, container);
    this.configureControls();

    this.renderer3D = new Renderer3D(this.scene, this.camera, container);

    this.dataManager = new UIDataManager();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.setupDataCallbacks();
    this.updateCursor();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.2);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  private createGround(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x253347,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.name = 'ground';
    return mesh;
  }

  private configureControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minPolarAngle = 0.1;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
  }

  private setupEventListeners(): void {
    const canvas = this.renderer3D.getCanvas();

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseLeave);

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize);
  }

  private setupDataCallbacks(): void {
    this.dataManager.setVoxelsChangeCallback(() => {
      const voxels = this.dataManager.getAllVoxels();
      this.renderer3D.rebuildAllVoxels(voxels);
    });

    this.dataManager.setModeChangeCallback(() => {
      this.updateCursor();
    });

    this.dataManager.setHistoryChangeCallback(() => {
      this.dataManager.updateHistoryButtons();
    });

    this.dataManager.setToastCallback((msg: string) => this.showToast(msg));
  }

  private updateCursor(): void {
    const mode = this.dataManager.getCurrentMode();
    const canvas = this.renderer3D.getCanvas();
    switch (mode) {
      case 'add':
        canvas.style.cursor = 'crosshair';
        break;
      case 'remove':
        canvas.style.cursor = 'not-allowed';
        break;
      case 'select':
        canvas.style.cursor = 'pointer';
        break;
    }
  }

  private onResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.mouseHasMoved = false;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.controls.enabled = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    if (this.isDragging && Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
      this.mouseHasMoved = true;
      this.controls.enabled = true;
      this.renderer3D.hideHighlight();
    }

    this.updateMouseFromEvent(e);
    if (!this.isDragging || this.mouseHasMoved) {
      this.updateHoverHighlight();
    }

    if (this.isDragging && this.mouseHasMoved && e.buttons === 1) {
      this.controls.update();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      if (this.isDragging && !this.mouseHasMoved) {
        this.updateMouseFromEvent(e);
        this.handleClick();
      }
      this.isDragging = false;
      this.mouseHasMoved = false;
      this.controls.enabled = true;
    }
  };

  private onMouseLeave = (): void => {
    this.renderer3D.hideHighlight();
    this.isDragging = false;
    this.mouseHasMoved = false;
    this.controls.enabled = true;
  };

  private updateMouseFromEvent(e: MouseEvent): void {
    const rect = this.renderer3D.getCanvas().getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateHoverHighlight(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const mode = this.dataManager.getCurrentMode();

    if (mode === 'add') {
      const addPos = this.getAddPosition();
      if (addPos) {
        this.renderer3D.showHighlight(addPos.x, addPos.y, addPos.z);
      } else {
        this.renderer3D.hideHighlight();
      }
    } else if (mode === 'remove' || mode === 'select') {
      const hit = this.renderer3D.pickVoxel(this.raycaster);
      if (hit) {
        this.renderer3D.showHighlight(hit.x, hit.y, hit.z);
      } else {
        this.renderer3D.hideHighlight();
      }
    }
  }

  private getGroundPosition(): { x: number; y: number; z: number } | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.groundMesh, false);
    if (hits.length === 0) return null;

    const point = hits[0].point;
    const half = GRID_SIZE / 2;
    const gx = Math.floor(point.x + half);
    const gz = Math.floor(point.z + half);

    if (gx < 0 || gx >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) return null;

    return { x: gx - half + 0.5, y: 0.5, z: gz - half + 0.5 };
  }

  private getAddPosition(): { x: number; y: number; z: number } | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const voxelHit = this.renderer3D.pickVoxel(this.raycaster);
    if (voxelHit) {
      const normal = voxelHit.faceNormal;
      const nx = Math.round(normal.x);
      const ny = Math.round(normal.y);
      const nz = Math.round(normal.z);
      const newX = voxelHit.x + nx;
      const newY = voxelHit.y + ny;
      const newZ = voxelHit.z + nz;

      if (ny < 0) {
        return null;
      }

      const half = GRID_SIZE / 2;
      if (
        newX < -half + 0.5 ||
        newX > half - 0.5 ||
        newZ < -half + 0.5 ||
        newZ > half - 0.5
      ) {
        return null;
      }

      if (this.dataManager.hasVoxel(newX, newY, newZ)) return null;

      return { x: newX, y: newY, z: newZ };
    }

    const groundPos = this.getGroundPosition();
    if (groundPos) {
      if (this.dataManager.hasVoxel(groundPos.x, groundPos.y, groundPos.z)) return null;
      return groundPos;
    }

    return null;
  }

  private handleClick(): void {
    const mode = this.dataManager.getCurrentMode();

    if (mode === 'add') {
      const pos = this.getAddPosition();
      if (pos) {
        const color = this.dataManager.getCurrentColor();
        if (this.dataManager.addVoxel(pos.x, pos.y, pos.z, color)) {
          this.renderer3D.addVoxel(pos.x, pos.y, pos.z, color);
          this.showToast('已添加体素');
        }
      }
    } else if (mode === 'remove') {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hit = this.renderer3D.pickVoxel(this.raycaster);
      if (hit) {
        if (this.dataManager.removeVoxel(hit.x, hit.y, hit.z)) {
          this.renderer3D.removeVoxel(hit.x, hit.y, hit.z);
          this.showToast('已移除体素');
        }
      }
    } else if (mode === 'select') {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hit = this.renderer3D.pickVoxel(this.raycaster);
      if (hit) {
        this.dataManager.setColor(hit.color);
        this.showToast('已选取颜色');
      }
    }
  }

  private showToast(message: string): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.controls.update();
    this.renderer3D.update(delta);
    this.renderer3D.render();
  };

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();
    this.renderer3D.dispose();
    this.groundMesh.geometry.dispose();
    (this.groundMesh.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    window.removeEventListener('resize', this.onResize);
  }
}
