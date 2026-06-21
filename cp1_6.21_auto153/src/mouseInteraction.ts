import * as THREE from 'three';
import { SceneManager } from './sceneManager';

export class MouseInteraction {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private sceneManager: SceneManager;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private spherical: THREE.Spherical;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private fog: THREE.FogExp2 | null = null;
  private fogOpacity: number = 0;
  private fogTargetOpacity: number = 0;

  private minPolarAngle: number = 0.1;
  private maxPolarAngle: number = (80 * Math.PI) / 180;
  private minDistance: number = 20;
  private maxDistance: number = 150;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    sceneManager: SceneManager
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.sceneManager = sceneManager;

    const offset = camera.position.clone().sub(this.target);
    this.spherical = new THREE.Spherical().setFromVector3(offset);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    domElement.addEventListener('mousedown', this.onMouseDown);
    domElement.addEventListener('mousemove', this.onMouseMove);
    domElement.addEventListener('mouseup', this.onMouseUp);
    domElement.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  setFog(fog: THREE.FogExp2): void {
    this.fog = fog;
  }

  update(delta: number): void {
    if (this.fog) {
      if (this.fogOpacity < this.fogTargetOpacity) {
        this.fogOpacity = Math.min(this.fogTargetOpacity, this.fogOpacity + delta * 0.5);
      } else if (this.fogOpacity > this.fogTargetOpacity) {
        this.fogOpacity = Math.max(this.fogTargetOpacity, this.fogOpacity - delta * 0.3);
      }
      this.fog.density = this.fogOpacity * 0.01;
    }

    const autoAngle = this.sceneManager.getAutoRotateAngle(delta);
    if (autoAngle !== 0) {
      this.spherical.theta -= autoAngle;
      this.updateCamera();
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
      this.previousMouse = { x: event.clientX, y: event.clientY };
      this.sceneManager.setAutoRotating(false);
      this.fogTargetOpacity = 1;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.spherical.theta -= deltaX * 0.005;
    this.spherical.phi += deltaY * 0.005;

    this.spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.spherical.phi)
    );

    this.updateCamera();
    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.fogTargetOpacity = 0;
      if (!this.sceneManager.isFullRotating()) {
        this.sceneManager.setAutoRotating(true);
      }
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.spherical.radius += event.deltaY * 0.05;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );
    this.updateCamera();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'r' || event.key === 'R') {
      this.sceneManager.startFullRotation();
    }
  }

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
