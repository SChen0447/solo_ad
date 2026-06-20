import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildScene, getExhibitMaterials } from './sceneBuilder';
import { LightController } from './lightController';
import { lerp } from './animationUtils';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private lightController: LightController;
  private exhibitMaterials: THREE.MeshStandardMaterial[];
  private clock: THREE.Clock;
  private animationId: number = 0;

  private baseRoughness: number = 0.5;
  private breathingTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.initScene();
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.controls = this.initControls();

    const gallery = buildScene();
    this.scene = gallery.scene;
    this.exhibitMaterials = getExhibitMaterials(gallery.exhibits);

    this.lightController = new LightController(this.scene);

    this.setupEventListeners();
    this.animate();
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a12);
    return scene;
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 4, 10);
    return camera;
  }

  private initRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private initControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.target.set(0, 2, 0);
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      this.lightController.nextPreset();
    }
  }

  private updateMaterials(delta: number): void {
    const targetRoughness = this.lightController.getMaterialRoughness();
    this.baseRoughness = lerp(this.baseRoughness, targetRoughness, 0.05);

    const isBreathing = this.lightController.isBreathingActive();
    if (isBreathing) {
      this.breathingTime += delta;
    } else {
      this.breathingTime = Math.max(0, this.breathingTime - delta * 0.5);
    }

    const breathingIntensity = Math.min(this.breathingTime * 0.5, 1);
    const breathingOffset = Math.sin(performance.now() * 0.002) * 0.05 * breathingIntensity;

    for (const material of this.exhibitMaterials) {
      material.roughness = THREE.MathUtils.clamp(
        this.baseRoughness + breathingOffset,
        0.05,
        0.95
      );
      material.needsUpdate = true;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.lightController.update(delta);
    this.updateMaterials(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    this.controls.dispose();
    this.renderer.dispose();
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
