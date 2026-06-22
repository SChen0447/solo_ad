import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class OrbitControlsWrapper {
  public controls: OrbitControls;
  public autoRotate: boolean = false;
  public autoRotateSpeed: number = 0.5;
  private camera: THREE.PerspectiveCamera;
  private lastInteractionTime: number = 0;
  private interactionPauseDuration: number = 500;
  private isDragging: boolean = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.configureControls();
  }

  private configureControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;

    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.0;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 500;

    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.8;

    this.controls.screenSpacePanning = false;

    this.controls.addEventListener('start', () => {
      this.isDragging = true;
      this.lastInteractionTime = performance.now();
    });

    this.controls.addEventListener('end', () => {
      this.isDragging = false;
      this.lastInteractionTime = performance.now();
    });

    this.controls.addEventListener('change', () => {
      if (this.isDragging) {
        this.lastInteractionTime = performance.now();
      }
    });
  }

  public get isUserInteracting(): boolean {
    if (this.isDragging) return true;
    return (performance.now() - this.lastInteractionTime) < this.interactionPauseDuration;
  }

  public setTarget(target: THREE.Vector3): void {
    this.controls.target.copy(target);
    this.controls.update();
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  public setAutoRotateSpeed(speed: number): void {
    this.autoRotateSpeed = speed;
  }

  public update(deltaTimeMs: number): void {
    if (this.autoRotate && !this.isUserInteracting) {
      const deltaTimeSec = deltaTimeMs / 1000;
      const radiansPerSec = (this.autoRotateSpeed * Math.PI) / 180 * 60;
      const radiansThisFrame = radiansPerSec * deltaTimeSec;

      const spherical = new THREE.Spherical();
      const offset = new THREE.Vector3();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        this.camera.up,
        new THREE.Vector3(0, 1, 0)
      );
      const quaternionInverse = quaternion.clone().invert();

      offset.copy(this.camera.position).sub(this.controls.target);
      offset.applyQuaternion(quaternion);
      spherical.setFromVector3(offset);
      spherical.theta += radiansThisFrame;

      offset.setFromSpherical(spherical);
      offset.applyQuaternion(quaternionInverse);
      this.camera.position.copy(this.controls.target).add(offset);
    }

    this.controls.update();
  }

  public reset(): void {
    this.controls.reset();
  }

  public dispose(): void {
    this.controls.dispose();
  }

  public setDampingFactor(factor: number): void {
    this.controls.dampingFactor = factor;
  }

  public getTarget(): THREE.Vector3 {
    return this.controls.target.clone();
  }
}
