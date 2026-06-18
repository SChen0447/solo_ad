import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Galaxy } from './galaxy';
import { Config } from './config';

export type InteractionMode = 'explore' | 'select';

export interface SelectionBounds {
  min: THREE.Vector2;
  max: THREE.Vector2;
}

export class Interaction {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private galaxy: Galaxy;
  private container: HTMLElement;
  private controls: OrbitControls;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private invModelViewMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private rayOrigin: THREE.Vector3 = new THREE.Vector3();
  private rayDirection: THREE.Vector3 = new THREE.Vector3();

  private hoveredIndex: number = -1;
  private lastHoverTime: number = 0;

  private mode: InteractionMode = 'explore';
  private isDragging: boolean = false;
  private dragStart: THREE.Vector2 = new THREE.Vector2();
  private dragCurrent: THREE.Vector2 = new THREE.Vector2();
  private selectionBounds: SelectionBounds | null = null;
  private selectionRect: HTMLElement;
  private selectionOverlay: HTMLElement;
  private hasSelection: boolean = false;

  private onClickCallbacks: Array<(index: number, point: THREE.Vector3) => void> = [];
  private onSelectionChangeCallbacks: Array<(bounds: SelectionBounds | null) => void> = [];

  private tempVec: THREE.Vector3 = new THREE.Vector3();
  private projectedPoint: THREE.Vector3 = new THREE.Vector3();

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    galaxy: Galaxy,
    container: HTMLElement
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.galaxy = galaxy;
    this.container = container;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 800;
    this.controls.enablePan = false;

    this.selectionOverlay = document.getElementById('selection-overlay')!;
    this.selectionRect = document.getElementById('selection-rect')!;

    this.raycaster.params.Points = { threshold: 3 };

    this.bindEvents();
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('pointerleave', this.onPointerLeave);
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private findNearestParticle(worldPoint: THREE.Vector3, worldDirection: THREE.Vector3): { index: number; point: THREE.Vector3 } | null {
    const particles = this.galaxy.getParticles();
    if (!particles) return null;

    const positions = (particles.geometry as THREE.BufferGeometry).attributes.position.array as Float32Array;
    const count = this.galaxy.getParticleCount();

    this.invModelViewMatrix.copy(particles.matrixWorld).invert();
    this.rayOrigin.copy(worldPoint).applyMatrix4(this.invModelViewMatrix);
    this.rayDirection.copy(worldDirection).applyMatrix4(this.invModelViewMatrix).normalize();

    let bestIndex = -1;
    let bestDist = Infinity;
    let bestPoint = new THREE.Vector3();

    const threshold = 5;

    for (let i = 0; i < count; i++) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];

      const dx = ix - this.rayOrigin.x;
      const dy = iy - this.rayOrigin.y;
      const dz = iz - this.rayOrigin.z;

      const projection = dx * this.rayDirection.x + dy * this.rayDirection.y + dz * this.rayDirection.z;

      if (projection < 0) continue;

      const closestX = this.rayOrigin.x + this.rayDirection.x * projection;
      const closestY = this.rayOrigin.y + this.rayDirection.y * projection;
      const closestZ = this.rayOrigin.z + this.rayDirection.z * projection;

      const distSq = (ix - closestX) ** 2 + (iy - closestY) ** 2 + (iz - closestZ) ** 2;
      const dist = Math.sqrt(distSq);

      if (dist < threshold && dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
        bestPoint.set(closestX, closestY, closestZ);
      }
    }

    if (bestIndex >= 0) {
      bestPoint.applyMatrix4(particles.matrixWorld);
      return { index: bestIndex, point: bestPoint };
    }

    return null;
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.updateMouse(event);

    if (this.mode === 'select' && this.isDragging) {
      this.dragCurrent.set(event.clientX, event.clientY);
      this.updateSelectionRect();
    } else if (this.mode === 'explore') {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const result = this.findNearestParticle(this.raycaster.ray.origin, this.raycaster.ray.direction);

      if (result) {
        const now = performance.now();
        if (result.index !== this.hoveredIndex || now - this.lastHoverTime > 100) {
          this.hoveredIndex = result.index;
          this.lastHoverTime = now;
          this.galaxy.highlightParticle(result.index, result.point, now);
        }
        this.container.style.cursor = 'pointer';
      } else {
        if (this.hoveredIndex !== -1) {
          this.hoveredIndex = -1;
        }
        this.container.style.cursor = 'grab';
      }
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.updateMouse(event);

    if (this.mode === 'select') {
      this.isDragging = true;
      this.controls.enabled = false;
      this.dragStart.set(event.clientX, event.clientY);
      this.dragCurrent.set(event.clientX, event.clientY);
      this.selectionRect.style.display = 'block';
      this.updateSelectionRect();
      this.hasSelection = false;
    } else {
      this.container.style.cursor = 'grabbing';
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.updateMouse(event);

    if (this.mode === 'select' && this.isDragging) {
      this.isDragging = false;
      this.controls.enabled = true;

      const x1 = Math.min(this.dragStart.x, this.dragCurrent.x);
      const y1 = Math.min(this.dragStart.y, this.dragCurrent.y);
      const x2 = Math.max(this.dragStart.x, this.dragCurrent.x);
      const y2 = Math.max(this.dragStart.y, this.dragCurrent.y);

      const width = x2 - x1;
      const height = y2 - y1;

      if (width > 5 && height > 5) {
        this.selectionBounds = {
          min: new THREE.Vector2(x1, y1),
          max: new THREE.Vector2(x2, y2),
        };
        this.hasSelection = true;
      } else {
        this.selectionBounds = null;
        this.hasSelection = false;
        this.selectionRect.style.display = 'none';
      }

      this.onSelectionChangeCallbacks.forEach(cb => cb(this.selectionBounds));
    } else if (this.mode === 'explore') {
      this.container.style.cursor = 'grab';

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const result = this.findNearestParticle(this.raycaster.ray.origin, this.raycaster.ray.direction);
      if (result) {
        const now = performance.now();
        this.galaxy.highlightParticle(result.index, result.point, now);
        this.hoveredIndex = result.index;
        this.lastHoverTime = now;
        this.onClickCallbacks.forEach(cb => cb(result.index, result.point));
      }
    }
  };

  private onPointerLeave = (): void => {
    this.hoveredIndex = -1;
    if (this.mode === 'select' && this.isDragging) {
      this.isDragging = false;
      this.controls.enabled = true;
      this.selectionRect.style.display = 'none';
    }
  };

  private updateSelectionRect(): void {
    const x1 = Math.min(this.dragStart.x, this.dragCurrent.x);
    const y1 = Math.min(this.dragStart.y, this.dragCurrent.y);
    const x2 = Math.max(this.dragStart.x, this.dragCurrent.x);
    const y2 = Math.max(this.dragStart.y, this.dragCurrent.y);

    this.selectionRect.style.left = `${x1}px`;
    this.selectionRect.style.top = `${y1}px`;
    this.selectionRect.style.width = `${x2 - x1}px`;
    this.selectionRect.style.height = `${y2 - y1}px`;
  }

  public setMode(mode: InteractionMode): void {
    this.mode = mode;
    if (mode === 'explore') {
      this.controls.enabled = true;
      this.clearSelection();
    } else {
      this.controls.enabled = false;
    }
  }

  public getMode(): InteractionMode {
    return this.mode;
  }

  public getSelectionBounds(): SelectionBounds | null {
    return this.hasSelection ? this.selectionBounds : null;
  }

  public hasActiveSelection(): boolean {
    return this.hasSelection;
  }

  public clearSelection(): void {
    this.selectionBounds = null;
    this.hasSelection = false;
    this.selectionRect.style.display = 'none';
    this.onSelectionChangeCallbacks.forEach(cb => cb(null));
  }

  public triggerExplosion(): boolean {
    if (!this.hasSelection || !this.selectionBounds) return false;
    this.galaxy.triggerExplosion(
      this.selectionBounds.min,
      this.selectionBounds.max,
      this.camera,
      performance.now()
    );
    return true;
  }

  public onClick(callback: (index: number, point: THREE.Vector3) => void): void {
    this.onClickCallbacks.push(callback);
  }

  public onSelectionChange(callback: (bounds: SelectionBounds | null) => void): void {
    this.onSelectionChangeCallbacks.push(callback);
  }

  public update(): void {
    this.controls.update();
  }

  public dispose(): void {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
  }
}
