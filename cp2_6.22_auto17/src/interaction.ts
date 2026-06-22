import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface ViewState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface InteractionOptions {
  rotateDamping?: number;
  rotateSpeed?: number;
  zoomMin?: number;
  zoomMax?: number;
  zoomEaseDuration?: number;
  resetDuration?: number;
}

const defaultOptions: Required<InteractionOptions> = {
  rotateDamping: 0.1,
  rotateSpeed: 0.3,
  zoomMin: 2,
  zoomMax: 20,
  zoomEaseDuration: 0.5,
  resetDuration: 1.0
};

export class InteractionController {
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private options: Required<InteractionOptions>;
  private initialPosition: THREE.Vector3;
  private initialTarget: THREE.Vector3;

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetStartPosition: THREE.Vector3;
  private resetStartTarget: THREE.Vector3;

  private targetZoom: number = 0;
  private isZooming: boolean = false;
  private zoomStartTime: number = 0;
  private zoomStartDistance: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    options: InteractionOptions = {}
  ) {
    this.camera = camera;
    this.options = { ...defaultOptions, ...options };

    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.options.rotateDamping;
    this.controls.rotateSpeed = this.options.rotateSpeed;
    this.controls.enablePan = false;
    this.controls.minDistance = this.options.zoomMin;
    this.controls.maxDistance = this.options.zoomMax;
    this.controls.zoomSpeed = 0;

    this.initialPosition = new THREE.Vector3(0, 3, 8);
    this.initialTarget = new THREE.Vector3(0, 0, 0);
    this.resetStartPosition = new THREE.Vector3();
    this.resetStartTarget = new THREE.Vector3();

    this.setupEventListeners(domElement);
  }

  private setupEventListeners(domElement: HTMLElement): void {
    domElement.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    const direction = event.deltaY > 0 ? 1 : -1;
    const currentDistance = this.camera.position.distanceTo(this.controls.target);

    let newDistance = currentDistance + direction * (currentDistance * 0.1);
    newDistance = Math.max(this.options.zoomMin, Math.min(this.options.zoomMax, newDistance));

    if (newDistance !== currentDistance) {
      this.startSmoothZoom(newDistance);
    }
  }

  private startSmoothZoom(targetDistance: number): void {
    this.isZooming = true;
    this.zoomStartTime = performance.now();
    this.zoomStartDistance = this.camera.position.distanceTo(this.controls.target);
    this.targetZoom = targetDistance;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'r') {
      this.startResetAnimation();
    }
  }

  private startResetAnimation(): void {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartPosition.copy(this.camera.position);
    this.resetStartTarget.copy(this.controls.target);
    this.controls.enabled = false;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  update(_delta: number): void {
    const now = performance.now();

    if (this.isZooming) {
      const elapsed = (now - this.zoomStartTime) / 1000;
      const progress = Math.min(elapsed / this.options.zoomEaseDuration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      const currentDistance = this.zoomStartDistance + (this.targetZoom - this.zoomStartDistance) * easedProgress;

      const direction = new THREE.Vector3()
        .subVectors(this.camera.position, this.controls.target)
        .normalize();

      this.camera.position.copy(
        this.controls.target.clone().add(direction.multiplyScalar(currentDistance))
      );

      if (progress >= 1) {
        this.isZooming = false;
      }
    }

    if (this.isResetting) {
      const elapsed = (now - this.resetStartTime) / 1000;
      const progress = Math.min(elapsed / this.options.resetDuration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      this.camera.position.lerpVectors(
        this.resetStartPosition,
        this.initialPosition,
        easedProgress
      );

      this.controls.target.lerpVectors(
        this.resetStartTarget,
        this.initialTarget,
        easedProgress
      );

      if (progress >= 1) {
        this.isResetting = false;
        this.controls.enabled = true;
      }
    }

    if (!this.isZooming && !this.isResetting) {
      this.controls.update();
    }
  }

  getViewState(): ViewState {
    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone()
    };
  }

  setInitialPosition(position: THREE.Vector3, target: THREE.Vector3): void {
    this.initialPosition.copy(position);
    this.initialTarget.copy(target);
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  dispose(): void {
    this.controls.dispose();
  }
}

export function createInteractionController(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  options?: InteractionOptions
): InteractionController {
  return new InteractionController(camera, domElement, options);
}
