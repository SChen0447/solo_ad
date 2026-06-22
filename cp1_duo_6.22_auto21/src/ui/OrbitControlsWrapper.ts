import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class OrbitControlsWrapper {
  public controls: OrbitControls;
  public autoRotate: boolean = false;
  public autoRotateSpeed: number = 0.5;
  private targetRotation: number = 0;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  public isUserInteracting: boolean = false;
  private lastInteractionTime: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.domElement = domElement;
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
      this.isUserInteracting = true;
      this.lastInteractionTime = Date.now();
    });

    this.controls.addEventListener('end', () => {
      this.lastInteractionTime = Date.now();
      setTimeout(() => {
        if (Date.now() - this.lastInteractionTime >= 500) {
          this.isUserInteracting = false;
        }
      }, 500);
    });
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

  public update(deltaTime: number): void {
    if (this.autoRotate && !this.isUserInteracting) {
      const radiansPerFrame = (this.autoRotateSpeed * Math.PI) / 180;
      this.targetRotation += radiansPerFrame;

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
      spherical.theta += radiansPerFrame;

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
