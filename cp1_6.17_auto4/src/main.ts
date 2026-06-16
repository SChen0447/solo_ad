import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityGenerator } from './core/CityGenerator';
import { Simulator } from './data/Simulator';
import { DataPanel } from './ui/DataPanel';
import { ControlPanel } from './ui/ControlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cityGenerator: CityGenerator;
  private simulator: Simulator;
  private dataPanel: DataPanel;
  private controlPanel: ControlPanel;
  private container: HTMLElement;
  private fpsPanel: HTMLDivElement;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;
  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('app')!;
    const canvasContainer = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    this.simulator = new Simulator();

    this.cityGenerator = new CityGenerator(this.scene);

    this.dataPanel = new DataPanel(this.container, this.simulator);
    this.controlPanel = new ControlPanel(
      this.container,
      this.camera,
      this.renderer,
      this.cityGenerator,
      this.simulator
    );

    this.fpsPanel = this.createFpsPanel();
    this.container.appendChild(this.fpsPanel);

    this.clock = new THREE.Clock();
    this.lastTime = performance.now();

    this.simulator.subscribe(() => {
      const t0 = performance.now();
      this.cityGenerator.updateCity(this.simulator.getData());
      const elapsed = performance.now() - t0;
      if (elapsed > 100) {
        console.warn(`City update took ${elapsed.toFixed(0)}ms (target < 100ms)`);
      }
    });

    this.cityGenerator.updateCity(this.simulator.getData());
    this.simulator.startAutoUpdate();

    window.addEventListener('resize', () => this.onResize());
  }

  private createFpsPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: rgba(10, 14, 39, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px;
      border: 1px solid rgba(0, 212, 255, 0.2);
      color: #e0e8ff;
      font-family: monospace;
      font-size: 12px;
      z-index: 100;
      min-width: 140px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;
    panel.innerHTML = `
      <div style="margin-bottom: 6px; color: #00D4FF; font-weight: 600; letter-spacing: 1px; font-size: 11px;">PERFORMANCE</div>
      <div style="display: flex; justify-content: space-between;"><span style="color: #a8b5cf;">FPS</span><span class="fps-val" style="color: #00D4FF; font-weight: bold;">0</span></div>
      <div style="display: flex; justify-content: space-between;"><span style="color: #a8b5cf;">建筑</span><span class="bld-val" style="color: #FF6B35; font-weight: bold;">0</span></div>
      <div style="display: flex; justify-content: space-between;"><span style="color: #a8b5cf;">三角面</span><span class="tri-val" style="color: #FF6B35; font-weight: bold;">0</span></div>
    `;
    return panel;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public start(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const now = performance.now();

      this.frameCount++;
      if (now - this.fpsUpdateTime >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
        this.frameCount = 0;
        this.fpsUpdateTime = now;
        this.updateFpsPanel();
      }

      this.cityGenerator.animate(delta);
      this.controlPanel.animate(delta);
      this.controls.update();

      this.renderer.render(this.scene, this.camera);
    };

    this.fpsUpdateTime = performance.now();
    animate();
  }

  private updateFpsPanel(): void {
    const fpsEl = this.fpsPanel.querySelector('.fps-val') as HTMLSpanElement;
    const bldEl = this.fpsPanel.querySelector('.bld-val') as HTMLSpanElement;
    const triEl = this.fpsPanel.querySelector('.tri-val') as HTMLSpanElement;

    fpsEl.textContent = this.currentFps.toString();
    fpsEl.style.color = this.currentFps >= 30 ? '#00D4FF' : '#FF6B35';
    bldEl.textContent = this.cityGenerator.getBuildingCount().toString();
    triEl.textContent = this.cityGenerator.getTriangleCount().toLocaleString();
  }
}

const app = new App();
app.start();
