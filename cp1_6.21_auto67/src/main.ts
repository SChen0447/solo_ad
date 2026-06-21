import * as THREE from 'three';
import { SolarSystem } from './solarSystem';
import { CameraControls } from './controls';
import { UIManager } from './uiManager';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private solarSystem: SolarSystem;
  private controls: CameraControls;
  private uiManager: UIManager;
  private container: HTMLElement;

  private clock: THREE.Clock;
  private speedMultiplier: number = 1;
  private fixedTimeStep: number = 1 / 60;
  private accumulator: number = 0;

  constructor() {
    this.clock = new THREE.Clock();

    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510);
    this.scene.fog = new THREE.FogExp2(0x000510, 0.003);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 60, 80);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.solarSystem = new SolarSystem(this.scene);

    this.controls = new CameraControls(this.camera, this.renderer.domElement);

    this.uiManager = new UIManager(
      this.camera,
      this.renderer.domElement,
      this.solarSystem.getPlanets(),
      {
        onSpeedChange: (speed: number) => {
          this.speedMultiplier = speed;
        },
        onResetView: () => {
          this.controls.resetView();
        }
      }
    );

    this.createStars();

    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  private createStars(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const radius = 200 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      const hue = 0.55 + (Math.random() - 0.5) * 0.1;
      color.setHSL(hue, 0.2, brightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedTimeStep) {
      this.solarSystem.updatePlanets(this.fixedTimeStep, this.speedMultiplier);
      this.accumulator -= this.fixedTimeStep;
    }

    this.controls.update(deltaTime);
    this.uiManager.update();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
