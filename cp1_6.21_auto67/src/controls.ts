import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraControls {
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 1000;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private startTarget: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.setupControls();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.maxPolarAngle = Math.PI * 0.95;
    this.controls.minPolarAngle = 0.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 1;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;
  }

  public resetView(): void {
    const targetPos = new THREE.Vector3(0, 60, 80);
    const targetLook = new THREE.Vector3(0, 0, 0);

    this.startPosition.copy(this.camera.position);
    this.targetPosition.copy(targetPos);
    this.startTarget.copy(this.controls.target);
    this.targetLookAt.copy(targetLook);

    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.controls.enabled = false;
  }

  public update(_deltaTime: number): void {
    if (this.isAnimating) {
      this.animateReset();
    }
    this.controls.update();
  }

  private animateReset(): void {
    const elapsed = performance.now() - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);
    const eased = this.easeInOutCubic(progress);

    this.camera.position.lerpVectors(this.startPosition, this.targetPosition, eased);
    this.controls.target.lerpVectors(this.startTarget, this.targetLookAt, eased);

    if (progress >= 1) {
      this.isAnimating = false;
      this.controls.enabled = true;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public resize(): void {
  }
}
