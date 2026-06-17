import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import type { RockLayerData, OreBodyData } from './types';

export interface InteractionCallbacks {
  onHover?: (data: RockLayerData | OreBodyData | null, event?: MouseEvent) => void;
  onClick?: (data: RockLayerData | OreBodyData, event?: MouseEvent) => void;
  onOreDoubleClick?: (data: OreBodyData, event?: MouseEvent) => void;
  onClipPlaneDrag?: (yWorld: number) => void;
}

export class InteractionManager {
  private sceneManager: SceneManager;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private callbacks: InteractionCallbacks;

  private hoveredObject: THREE.Object3D | null = null;
  private originalMaterials: Map<THREE.Object3D, THREE.Color> = new Map();

  private isDraggingClip: boolean = false;
  private clipDragPlane: THREE.Plane;

  private clickTimeout: number | null = null;
  private lastClickTime: number = 0;
  private pendingClickObject: THREE.Object3D | null = null;

  constructor(
    sceneManager: SceneManager,
    domElement: HTMLElement,
    callbacks: InteractionCallbacks = {}
  ) {
    this.sceneManager = sceneManager;
    this.camera = sceneManager.camera;
    this.domElement = domElement;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Mesh.threshold = 0.1;
    this.mouse = new THREE.Vector2();
    this.clipDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointermove', this.onPointerMove, { passive: false });
    this.domElement.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.domElement.addEventListener('pointerup', this.onPointerUp, { passive: false });
    this.domElement.addEventListener('pointerleave', this.onPointerLeave);
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersect(): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets = this.sceneManager.getPickableObjects();
    return this.raycaster.intersectObjects(targets, false);
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.updateMouse(event);

    if (this.isDraggingClip) {
      event.preventDefault();
      this.dragClipPlane();
      return;
    }

    const hits = this.intersect();
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      this.setHovered(hitObj);
      const data = hitObj.userData?.data as RockLayerData | OreBodyData;
      if (data) this.callbacks.onHover?.(data, event);
    } else {
      this.setHovered(null);
      this.callbacks.onHover?.(null, event);
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.updateMouse(event);

    if (this.sceneManager.isClippingOn()) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const clipY = this.sceneManager.getClipPlaneY();
      this.clipDragPlane.constant = -clipY;
      const hitPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.clipDragPlane, hitPoint);
      if (hitPoint && Math.abs(hitPoint.y - clipY) < 80 &&
          Math.abs(hitPoint.x) < 140 && Math.abs(hitPoint.z) < 140) {
        this.isDraggingClip = true;
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.isDraggingClip) {
      this.isDraggingClip = false;
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    this.updateMouse(event);
    const hits = this.intersect();
    if (hits.length === 0) return;

    const hitObj = hits[0].object;
    const data = hitObj.userData?.data as RockLayerData | OreBodyData;
    if (!data) return;

    const now = performance.now();
    const isDouble = this.pendingClickObject === hitObj &&
                     now - this.lastClickTime < 350;

    if (isDouble) {
      if (this.clickTimeout !== null) {
        window.clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
      }
      this.pendingClickObject = null;
      if (hitObj.userData?.type === 'oreBody') {
        this.callbacks.onOreDoubleClick?.(data as OreBodyData, event);
      } else {
        this.callbacks.onClick?.(data, event);
      }
    } else {
      this.lastClickTime = now;
      this.pendingClickObject = hitObj;
      const capturedData = data;
      const capturedEvent = event;
      this.clickTimeout = window.setTimeout(() => {
        this.callbacks.onClick?.(capturedData, capturedEvent);
        this.pendingClickObject = null;
        this.clickTimeout = null;
      }, 280);
    }
  };

  private onPointerLeave = (): void => {
    this.setHovered(null);
    this.callbacks.onHover?.(null);
    this.isDraggingClip = false;
  };

  private dragClipPlane(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hitPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.clipDragPlane, hitPoint)) {
      const newY = Math.max(-290, Math.min(0, hitPoint.y));
      this.sceneManager.updateClipPlaneY(newY);
      this.callbacks.onClipPlaneDrag?.(newY);
    }
  }

  private setHovered(obj: THREE.Object3D | null): void {
    if (this.hoveredObject === obj) return;

    if (this.hoveredObject) {
      this.restoreObjectAppearance(this.hoveredObject);
      this.hoveredObject = null;
    }

    if (obj) {
      this.hoveredObject = obj;
      this.highlightObject(obj);
      this.domElement.style.cursor = 'pointer';
    } else {
      this.domElement.style.cursor = 'default';
    }
  }

  private highlightObject(obj: THREE.Object3D): void {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      if (!this.originalMaterials.has(obj)) {
        this.originalMaterials.set(obj, mat.emissive.clone());
      }
      mat.emissive.setHex(0x334466);
      mat.emissiveIntensity = 0.5;
      mat.needsUpdate = true;
    }
  }

  private restoreObjectAppearance(obj: THREE.Object3D): void {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      const original = this.originalMaterials.get(obj);
      if (original) {
        mat.emissive.copy(original);
        mat.emissiveIntensity = obj.userData?.type === 'oreBody' ? 0.15 : 0;
        mat.needsUpdate = true;
        this.originalMaterials.delete(obj);
      }
    }
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    if (this.clickTimeout !== null) {
      window.clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
  }
}
