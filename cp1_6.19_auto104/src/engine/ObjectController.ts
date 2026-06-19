import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from './EventBus';
import type { ViewMode } from '../types';
import { lerp } from '../utils/animation';

export class ObjectController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private currentTarget: THREE.Object3D | null = null;
  private viewMode: ViewMode = 'free';
  private isDragging: boolean = false;
  private hoveredAnnotationId: string | null = null;
  private targetRotation: { x: number; y: number } = { x: 0, y: 0 };
  private autoRotate: boolean = true;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
    this.controls.target.set(0, 0, 0);
    this.controls.enabled = true;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    eventBus.on('VIEW_MODE_CHANGED', ({ mode }) => {
      this.viewMode = mode;
      this.updateControlsForMode(mode);
    });

    eventBus.on('RELIC_SELECTED', () => {
      this.autoRotate = false;
      setTimeout(() => {
        this.autoRotate = true;
      }, 3000);
    });
  }

  private updateControlsForMode(mode: ViewMode): void {
    switch (mode) {
      case 'free':
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        break;
      case 'focus':
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 6;
        break;
      case 'explosion':
        this.controls.enableRotate = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 15;
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkAnnotationHover();
    
    if (this.autoRotate && !this.isDragging && this.viewMode === 'free') {
      this.targetRotation.y += 0.002;
    }
  }

  private onMouseDown(): void {
    this.isDragging = true;
    this.autoRotate = false;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkAnnotationClick();
  }

  private onWheel(): void {
    this.autoRotate = false;
    setTimeout(() => {
      this.autoRotate = true;
    }, 3000);
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      this.isDragging = true;
      this.autoRotate = false;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkAnnotationHover();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    this.isDragging = false;
    if (event.changedTouches.length === 1) {
      this.checkAnnotationClick();
    }
    setTimeout(() => {
      this.autoRotate = true;
    }, 3000);
  }

  private checkAnnotationHover(): void {
    if (this.viewMode === 'free') return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const allMarkers: THREE.Object3D[] = [];
    this.camera.parent?.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.annotationId) {
        allMarkers.push(child);
      }
    });

    const intersects = this.raycaster.intersectObjects(allMarkers, false);

    if (intersects.length > 0) {
      const annotationId = intersects[0].object.userData.annotationId as string;
      if (annotationId !== this.hoveredAnnotationId) {
        if (this.hoveredAnnotationId) {
          eventBus.emit('ANNOTATION_HOVER', { annotationId: this.hoveredAnnotationId });
        }
        this.hoveredAnnotationId = annotationId;
        eventBus.emit('ANNOTATION_HOVER', { annotationId });
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else if (this.hoveredAnnotationId) {
      eventBus.emit('ANNOTATION_HOVER', { annotationId: this.hoveredAnnotationId });
      this.hoveredAnnotationId = null;
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  private checkAnnotationClick(): void {
    if (this.viewMode === 'free') return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const allMarkers: THREE.Object3D[] = [];
    this.camera.parent?.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.annotationId) {
        allMarkers.push(child);
      }
    });

    const intersects = this.raycaster.intersectObjects(allMarkers, false);

    if (intersects.length > 0) {
      const annotationId = intersects[0].object.userData.annotationId as string;
      eventBus.emit('ANNOTATION_CLICKED', { annotationId });
    }
  }

  public setFocusTarget(target: THREE.Object3D | null): void {
    this.currentTarget = target;
    if (target) {
      const box = new THREE.Box3().setFromObject(target);
      const center = box.getCenter(new THREE.Vector3());
      this.controls.target.copy(center);
    }
  }

  public update(deltaTime: number): void {
    if (this.autoRotate && !this.isDragging && this.viewMode === 'free' && this.currentTarget) {
      this.targetRotation.y += deltaTime * 0.1;
      this.currentTarget.rotation.y = lerp(
        this.currentTarget.rotation.y,
        this.targetRotation.y,
        deltaTime * 2
      );
    }

    this.controls.update();

    eventBus.emit('CAMERA_POSITION_UPDATED', {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    });
  }

  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.updateControlsForMode(mode);
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public dispose(): void {
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.removeEventListener('click', this.onClick.bind(this));
    canvas.removeEventListener('wheel', this.onWheel.bind(this));
    canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
}
