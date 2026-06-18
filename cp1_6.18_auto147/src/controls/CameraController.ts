import * as THREE from 'three';

const CRUISE_DURATION = 30;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private isCruising: boolean = false;
  private cruiseTime: number = 0;
  private cruisePathRadius: number = 8;
  private cruiseMinRadius: number = 3;
  private cruiseMaxRadius: number = 12;
  private cruiseHeightStart: number = 2;
  private cruiseHeightEnd: number = 6;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 2, 8);
  private currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  startCruise(): void {
    this.isCruising = true;
    this.cruiseTime = 0;
  }

  stopCruise(): void {
    this.isCruising = false;
  }

  get cruising(): boolean {
    return this.isCruising;
  }

  update(delta: number): void {
    if (!this.isCruising) return;

    this.cruiseTime += delta;
    if (this.cruiseTime >= CRUISE_DURATION) {
      this.cruiseTime -= CRUISE_DURATION;
    }

    const t = this.cruiseTime / CRUISE_DURATION;

    const angle = t * Math.PI * 2;
    const radius = this.cruiseMinRadius + (this.cruiseMaxRadius - this.cruiseMinRadius) * t;
    const height = this.cruiseHeightStart + (this.cruiseHeightEnd - this.cruiseHeightStart) * Math.sin(t * Math.PI);

    const targetX = radius * Math.cos(angle);
    const targetZ = radius * Math.sin(angle);
    const targetY = height;

    const targetPos = new THREE.Vector3(targetX, targetY, targetZ);
    const targetLook = this.target.clone();

    const lerpFactor = 1.0 - Math.pow(0.01, delta);
    this.currentPosition.lerp(targetPos, lerpFactor);
    this.currentLookAt.lerp(targetLook, lerpFactor);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  setCurrentState(position: THREE.Vector3, lookAt: THREE.Vector3): void {
    this.currentPosition.copy(position);
    this.currentLookAt.copy(lookAt);
  }
}
