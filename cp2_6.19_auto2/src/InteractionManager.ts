import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class InteractionManager {
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    domElement: HTMLElement,
  ) {
    this.camera = camera;
    this.renderer = renderer;

    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.autoRotate = false;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.8;
  }

  update(): void {
    this.controls.update();
  }

  onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  resetCamera(): void {
    this.camera.position.set(0, 8, 20);
    this.camera.lookAt(0, 0, 0);
    this.controls.reset();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
