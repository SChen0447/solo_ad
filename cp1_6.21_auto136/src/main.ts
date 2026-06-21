import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { caffeineMolecule } from './moleculeData';
import { ModelBuilder } from './ModelBuilder';
import { UIController } from './UIController';

class MoleculeVisualizer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private modelBuilder!: ModelBuilder;
  private uiController!: UIController;
  private canvas!: HTMLCanvasElement;

  private autoRotateSpeed: number = 10;
  private isAutoRotating: boolean = true;
  private clock: THREE.Clock = new THREE.Clock();

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private pointLights: THREE.PointLight[] = [];

  private glowSprite: THREE.Sprite | null = null;

  constructor() {
    this.canvas = document.getElementById('canvas-container') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });

    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupControls();
    this.setupGlowEffect();
    this.setupModel();
    this.setupUI();
    this.setupEventListeners();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupCamera(): void {
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 5, 5);
    this.scene.add(this.directionalLight);

    const pointLight1 = new THREE.PointLight(0x4488ff, 0.6, 20);
    pointLight1.position.set(-3, 2, 3);
    this.scene.add(pointLight1);
    this.pointLights.push(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4466, 0.4, 20);
    pointLight2.position.set(3, -2, -3);
    this.scene.add(pointLight2);
    this.pointLights.push(pointLight2);

    const pointLight3 = new THREE.PointLight(0x88ff88, 0.3, 20);
    pointLight3.position.set(0, 3, -3);
    this.scene.add(pointLight3);
    this.pointLights.push(pointLight3);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = this.autoRotateSpeed * 0.5;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }

  private setupGlowEffect(): void {
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 512;
    glowCanvas.height = 512;
    const ctx = glowCanvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(100, 150, 255, 0.15)');
    gradient.addColorStop(0.4, 'rgba(80, 120, 220, 0.08)');
    gradient.addColorStop(0.7, 'rgba(60, 100, 200, 0.03)');
    gradient.addColorStop(1, 'rgba(40, 80, 180, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.glowSprite = new THREE.Sprite(glowMaterial);
    this.glowSprite.scale.set(12, 12, 1);
    this.glowSprite.position.set(0, 0, -2);
    this.scene.add(this.glowSprite);
  }

  private setupModel(): void {
    this.modelBuilder = new ModelBuilder(caffeineMolecule);
    this.scene.add(this.modelBuilder.moleculeGroup);

    const center = this.modelBuilder.getCenterOfMass();
    this.modelBuilder.moleculeGroup.position.sub(center);

    this.controls.target.set(0, 0, 0);
  }

  private setupUI(): void {
    this.uiController = new UIController({
      modelBuilder: this.modelBuilder,
      camera: this.camera,
      renderer: this.renderer,
      controls: this.controls,
      canvas: this.canvas,
    });

    this.uiController.onAutoRotateChange((enabled) => {
      this.isAutoRotating = enabled;
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    if (this.isAutoRotating && !this.controls.enableDamping) {
      this.modelBuilder.moleculeGroup.rotation.y += (this.autoRotateSpeed * Math.PI / 180) * deltaTime;
    } else if (this.isAutoRotating) {
      this.modelBuilder.moleculeGroup.rotation.y += (this.autoRotateSpeed * Math.PI / 180) * deltaTime;
    }

    this.controls.update();
    this.modelBuilder.update(deltaTime, this.uiController.getIsExploding());

    if (this.glowSprite) {
      const time = this.clock.getElapsedTime();
      this.glowSprite.material.opacity = 0.8 + 0.2 * Math.sin(time * 0.5);
      this.glowSprite.scale.setScalar(12 + 0.5 * Math.sin(time * 0.3));
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.uiController.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

let visualizer: MoleculeVisualizer | null = null;

window.addEventListener('DOMContentLoaded', () => {
  visualizer = new MoleculeVisualizer();
});

window.addEventListener('beforeunload', () => {
  if (visualizer) {
    visualizer.dispose();
  }
});
