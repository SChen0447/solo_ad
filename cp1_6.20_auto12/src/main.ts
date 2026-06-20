import * as THREE from 'three';
import { DataModule } from './dataModule';
import { RiverModule } from './riverModule';
import { UIModule } from './uiModule';
import { InteractionModule } from './interactionModule';

class DataRiverApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private dataModule: DataModule;
  private riverModule: RiverModule;
  private uiModule!: UIModule;
  private interactionModule!: InteractionModule;

  private container: HTMLElement;
  private labelContainer: HTMLElement;
  private animationFrameId: number | null = null;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;
  private lastTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.labelContainer = document.getElementById('label-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e14);
    this.scene.fog = new THREE.FogExp2(0x0b0e14, 0.0035);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(60, 50, 80);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cursor = 'grab';

    this.dataModule = new DataModule();

    this.setupLights();
    this.setupStarfield();
    this.setupGroundGrid();

    this.riverModule = new RiverModule(this.scene, this.dataModule);

    this.initUI();
    this.initInteraction();
    this.setupEventListeners();

    this.start();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(50, 80, 30);
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x00d4ff, 0.6);
    rimLight.position.set(-50, 30, -100);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xaa44ff, 0.3);
    fillLight.position.set(30, -20, -60);
    this.scene.add(fillLight);

    const point1 = new THREE.PointLight(0x00d4ff, 0.8, 150);
    point1.position.set(0, 20, -50);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xaa44ff, 0.6, 120);
    point2.position.set(-30, -10, -150);
    this.scene.add(point2);
  }

  private setupStarfield(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 100;

      const color = new THREE.Color();
      const tint = Math.random();
      if (tint < 0.3) {
        color.setHSL(0.55 + Math.random() * 0.1, 0.8, 0.7);
      } else if (tint < 0.6) {
        color.setHSL(0.75 + Math.random() * 0.1, 0.6, 0.7);
      } else {
        color.setHSL(0.0, 0.0, 0.7 + Math.random() * 0.3);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private setupGroundGrid(): void {
    const gridHelper = new THREE.GridHelper(500, 100, 0x1a2030, 0x0f1420);
    gridHelper.position.y = -40;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.4;
    this.scene.add(gridHelper);

    const axisZLine = new THREE.BufferGeometry();
    const axisPoints = [];
    for (let z = 0; z >= -220; z -= 10) {
      axisPoints.push(0, -39.5, z);
      axisPoints.push(0, -39, z);
    }
    const axisPositions = new Float32Array(axisPoints);
    axisZLine.setAttribute('position', new THREE.BufferAttribute(axisPositions, 3));
    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.3 });
    const axisLines = new THREE.LineSegments(axisZLine, axisMaterial);
    this.scene.add(axisLines);
  }

  private initUI(): void {
    const dayCount = this.dataModule.getDayCount();
    this.uiModule = new UIModule(this.labelContainer, dayCount, {
      onTimelineChange: (dayIndex: number) => {
        this.interactionModule.handleTimelineChange(dayIndex);
      },
      onMetricToggle: (metric, visible) => {
        this.interactionModule.handleMetricToggle(metric, visible);
      }
    });
  }

  private initInteraction(): void {
    this.interactionModule = new InteractionModule(
      this.camera,
      this.renderer,
      this.riverModule,
      this.uiModule,
      this.dataModule
    );
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.riverModule.update(delta);
    this.interactionModule.update(delta);

    this.renderer.render(this.scene, this.camera);

    const labelRenderer = this.uiModule.getLabelRenderer();
    const labels = this.uiModule.getLabels();
    for (const label of labels) {
      if (!label.parent) {
        this.scene.add(label);
      }
    }
    labelRenderer.render(this.scene, this.camera);

    this.fpsCounter++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1.0) {
      this.lastTime = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }
  }

  private start(): void {
    this.animate();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new DataRiverApp();
  (window as any).dataRiverApp = app;
});
