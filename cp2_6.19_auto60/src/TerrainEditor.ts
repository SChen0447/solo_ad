import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Renderer3D } from './Renderer3D';
import { UIDataManager, type VoxelData, type ToolMode } from './UIDataManager';

interface HitResult {
  type: 'ground' | 'voxel';
  x: number;
  y: number;
  z: number;
  faceNormal?: THREE.Vector3;
}

export class TerrainEditor {
  private renderer3D: Renderer3D;
  private dataManager: UIDataManager;
  private controls: OrbitControls;

  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private isMouseDown: boolean = false;
  private mouseDownButton: number = -1;
  private lastEditPos: string | null = null;

  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.renderer3D = new Renderer3D(container);
    this.dataManager = new UIDataManager();

    this.controls = new OrbitControls(
      this.renderer3D.getCamera(),
      this.renderer3D.getRenderer().domElement
    );
    this.setupControls();

    this.setupEventListeners();
    this.setupDataCallbacks();

    this.startAnimationLoop();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);

    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    const camera = this.renderer3D.getCamera();
    const distance = 30;
    const angle = (45 * Math.PI) / 180;
    camera.position.set(
      distance * Math.cos(angle),
      distance * Math.sin(angle),
      distance * Math.cos(angle)
    );
    camera.lookAt(0, 0, 0);
    this.controls.update();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer3D.getRenderer().domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupDataCallbacks(): void {
    this.dataManager.setOnVoxelAdded((voxel: VoxelData, animate: boolean) => {
      this.renderer3D.addVoxel(voxel, animate);
      this.checkVoxelLimit();
    });

    this.dataManager.setOnVoxelRemoved((voxel: VoxelData, animate: boolean) => {
      this.renderer3D.removeVoxel(voxel, animate);
    });

    this.dataManager.setOnVoxelSelected((voxel: VoxelData) => {
      this.renderer3D.highlightVoxel(voxel.x, voxel.y, voxel.z);
    });

    this.dataManager.setOnModeChanged((_mode: ToolMode) => {
      this.renderer3D.removeHighlight();
    });
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    this.isMouseDown = true;
    this.mouseDownButton = e.button;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
    this.lastEditPos = null;
  }

  private onMouseMove(e: MouseEvent): void {
    const canvas = this.renderer3D.getRenderer().domElement;
    const rect = canvas.getBoundingClientRect();

    const mouse = this.renderer3D.getMouse();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isMouseDown && this.mouseDownButton === 0) {
      const dx = Math.abs(e.clientX - this.dragStartPos.x);
      const dy = Math.abs(e.clientY - this.dragStartPos.y);

      if (dx > 5 || dy > 5) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        const mode = this.dataManager.getCurrentMode();
        if (mode === 'add' || mode === 'remove') {
          const hit = this.raycast();
          if (hit) {
            const posKey = `${hit.x},${hit.y},${hit.z}`;
            if (posKey !== this.lastEditPos) {
              this.lastEditPos = posKey;
              this.handleEditAction(hit);
            }
          }
        }
      }
    }

    this.updateHoverHighlight();
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0 || !this.isMouseDown) {
      this.isMouseDown = false;
      this.mouseDownButton = -1;
      return;
    }

    const wasDragging = this.isDragging;
    this.isMouseDown = false;
    this.mouseDownButton = -1;
    this.isDragging = false;
    this.lastEditPos = null;

    if (!wasDragging) {
      const hit = this.raycast();
      if (hit) {
        this.handleEditAction(hit);
      }
    }
  }

  private handleEditAction(hit: HitResult): void {
    const mode = this.dataManager.getCurrentMode();

    switch (mode) {
      case 'add':
        this.handleAddAction(hit);
        break;
      case 'remove':
        this.handleRemoveAction(hit);
        break;
      case 'select':
        this.handleSelectAction(hit);
        break;
    }
  }

  private handleAddAction(hit: HitResult): void {
    let x: number, y: number, z: number;

    if (hit.type === 'ground') {
      x = Math.floor(hit.x);
      y = 0;
      z = Math.floor(hit.z);
    } else {
      const normal = hit.faceNormal;
      if (!normal) return;

      x = hit.x + Math.round(normal.x);
      y = hit.y + Math.round(normal.y);
      z = hit.z + Math.round(normal.z);
    }

    if (this.isWithinBounds(x, z)) {
      const added = this.dataManager.addVoxel(x, y, z);
      if (!added && this.dataManager.hasVoxel(x, y, z)) {
        this.dataManager.showToast('该位置已有像素块');
      }
    } else {
      this.dataManager.showToast('超出地形边界');
    }
  }

  private handleRemoveAction(hit: HitResult): void {
    if (hit.type === 'voxel') {
      this.dataManager.removeVoxel(hit.x, hit.y, hit.z);
    }
  }

  private handleSelectAction(hit: HitResult): void {
    if (hit.type === 'voxel') {
      this.dataManager.selectVoxel(hit.x, hit.y, hit.z);
    }
  }

  private updateHoverHighlight(): void {
    const mode = this.dataManager.getCurrentMode();

    if (mode !== 'select') {
      this.renderer3D.removeHighlight();
      return;
    }

    const hit = this.raycast();
    if (hit && hit.type === 'voxel') {
      this.renderer3D.highlightVoxel(hit.x, hit.y, hit.z);
    } else {
      this.renderer3D.removeHighlight();
    }
  }

  private raycast(): HitResult | null {
    const raycaster = this.renderer3D.getRaycaster();
    const mouse = this.renderer3D.getMouse();
    const camera = this.renderer3D.getCamera();

    raycaster.setFromCamera(mouse, camera);

    const voxelMeshes = this.renderer3D.getVoxelMeshes();
    const groundMeshes = this.renderer3D.getGroundMeshes();

    const voxelIntersects = raycaster.intersectObjects(voxelMeshes, false);

    if (voxelIntersects.length > 0) {
      const intersect = voxelIntersects[0];
      const mesh = intersect.object as THREE.InstancedMesh;

      const instanceId = intersect.instanceId;
      if (instanceId === undefined) return null;

      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(instanceId, matrix);
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(matrix);

      const x = Math.floor(position.x - 0.5);
      const y = Math.floor(position.y - 0.5);
      const z = Math.floor(position.z - 0.5);

      const faceNormal = intersect.face?.normal.clone();
      if (faceNormal) {
        faceNormal.transformDirection(mesh.matrixWorld);
      }

      return {
        type: 'voxel',
        x,
        y,
        z,
        faceNormal
      };
    }

    const groundIntersects = raycaster.intersectObjects(groundMeshes, false);

    if (groundIntersects.length > 0) {
      const intersect = groundIntersects[0];
      const point = intersect.point;

      const x = Math.floor(point.x);
      const z = Math.floor(point.z);

      return {
        type: 'ground',
        x,
        y: 0,
        z
      };
    }

    return null;
  }

  private isWithinBounds(x: number, z: number): boolean {
    const gridSize = 20;
    const halfGrid = gridSize / 2;
    return x >= -halfGrid && x < halfGrid && z >= -halfGrid && z < halfGrid;
  }

  private checkVoxelLimit(): void {
    const total = this.dataManager.getAllVoxels().length;
    if (total >= 1900) {
      this.dataManager.showToast(`警告: 已接近像素块上限 (${total}/2000)`);
    }
    if (total >= 2000) {
      this.dataManager.showToast('已达到像素块上限 (2000)');
    }
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);

      this.frameCount++;
      if (time - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = time;
      }

      this.controls.update();
      this.renderer3D.render();
    };

    animate(performance.now());
  }

  getFPS(): number {
    return this.fps;
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.controls.dispose();
    this.renderer3D.dispose();
  }
}
