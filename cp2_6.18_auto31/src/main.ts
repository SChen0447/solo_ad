import * as THREE from 'three';
import Stats from 'stats.js';
import { Galaxy } from './galaxy';
import { Interaction } from './interaction';
import { UIControlPanel } from './ui';
import { Config } from './config';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private galaxy!: Galaxy;
  private interaction!: Interaction;
  private uiPanel!: UIControlPanel;
  private stats: Stats;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private isRunning: boolean = false;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      throw new Error('Container element #app not found');
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.0015);

    this.camera = new THREE.PerspectiveCamera(
      Config.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      Config.CAMERA_NEAR,
      Config.CAMERA_FAR
    );
    this.camera.position.set(0, Config.CAMERA_DISTANCE * 0.6, Config.CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container as HTMLCanvasElement,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a1a, 1);

    this.stats = new Stats();
    this.stats.showPanel(0);
    const statsDom = document.getElementById('stats')!;
    statsDom.appendChild(this.stats.dom);

    this.clock = new THREE.Clock();
  }

  public async init(): Promise<void> {
    this.galaxy = new Galaxy(this.scene);

    this.interaction = new Interaction(
      this.camera,
      this.renderer,
      this.galaxy,
      this.container
    );

    this.uiPanel = new UIControlPanel(this.galaxy, this.interaction);

    this.addAmbientStars();

    this.bindEvents();

    this.isRunning = true;
    this.animate();
  }

  private addAmbientStars(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 800 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    this.stats.begin();

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = performance.now();

    this.interaction.update();
    this.galaxy.update(delta, currentTime);
    this.uiPanel.update();

    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  };

  public dispose(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onResize);

    this.uiPanel?.dispose();
    this.interaction?.dispose();
    this.galaxy?.dispose();
    this.renderer?.dispose();
  }
}

const app = new App();
app.init().catch((err) => {
  console.error('Failed to initialize application:', err);
});
