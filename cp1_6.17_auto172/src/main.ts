import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointCloudManager } from './pointCloud.js';
import { setupUIControls } from './uiControls.js';

export interface DataPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  features: number[];
}

export interface ClusterParams {
  algorithm: 'kmeans' | 'dbscan';
  k?: number;
  epsilon?: number;
}

export interface ClusterResult {
  labels: number[];
  centroids: number[][];
  stats: ClusterStat[];
}

export interface ClusterStat {
  label: number;
  count: number;
  centroid: [number, number, number];
  avgDistance: number;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pointCloudManager: PointCloudManager;
  private container: HTMLElement;
  private perfMonitor: HTMLElement;
  private perfFps: HTMLElement;
  private perfTris: HTMLElement;
  private perfPoints: HTMLElement;
  private fpsFrames: number = 0;
  private fpsLastTime: number = performance.now();
  private currentFPS: number = 0;
  private showPerf: boolean = false;
  private animFrameId: number = 0;
  private clock: THREE.Clock;
  private gridHelper: THREE.GridHelper | null = null;
  private axisX: THREE.Line | null = null;
  private axisY: THREE.Line | null = null;
  private axisZ: THREE.Line | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.perfMonitor = document.getElementById('perf-monitor')!;
    this.perfFps = document.getElementById('perf-fps')!;
    this.perfTris = document.getElementById('perf-tris')!;
    this.perfPoints = document.getElementById('perf-points')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D1117);
    this.scene.fog = new THREE.Fog(0x0D1117, 15, 40);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(6, 5, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);

    this.setupLighting();
    this.setupReferenceGrid();
    this.setupAxes();

    this.pointCloudManager = new PointCloudManager(this.scene, this.camera, this.renderer);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 15, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x3498DB, 0.4);
    fillLight.position.set(-8, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xE74C3C, 0.25);
    rimLight.position.set(0, -5, -10);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x3498DB, 0.6, 30);
    pointLight1.position.set(-5, 8, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xE74C3C, 0.4, 25);
    pointLight2.position.set(5, 3, -5);
    this.scene.add(pointLight2);
  }

  private setupReferenceGrid(): void {
    this.gridHelper = new THREE.GridHelper(20, 40, 0x30363D, 0x30363D);
    const gridMaterial = this.gridHelper.material as THREE.Material;
    gridMaterial.opacity = 0.25;
    gridMaterial.transparent = true;
    this.scene.add(this.gridHelper);
  }

  private setupAxes(): void {
    const axisLength = 8;
    const segments = 50;

    const createGradientAxis = (
      startColor: number,
      endColor: number,
      startPt: [number, number, number],
      endPt: [number, number, number]
    ): THREE.Line => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array((segments + 1) * 3);
      const colors = new Float32Array((segments + 1) * 3);
      const startC = new THREE.Color(startColor);
      const endC = new THREE.Color(endColor);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        positions[i * 3] = startPt[0] + (endPt[0] - startPt[0]) * t;
        positions[i * 3 + 1] = startPt[1] + (endPt[1] - startPt[1]) * t;
        positions[i * 3 + 2] = startPt[2] + (endPt[2] - startPt[2]) * t;
        const c = startC.clone().lerp(endC, t);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      });

      return new THREE.Line(geometry, material);
    };

    this.axisX = createGradientAxis(0x3A0000, 0xE74C3C, [0, 0, 0], [axisLength, 0, 0]);
    this.axisY = createGradientAxis(0x003A00, 0x3FB950, [0, 0, 0], [0, axisLength, 0]);
    this.axisZ = createGradientAxis(0x001A3A, 0x3498DB, [0, 0, 0], [0, 0, axisLength]);

    this.scene.add(this.axisX);
    this.scene.add(this.axisY);
    this.scene.add(this.axisZ);

    const addAxisLabel = (text: string, pos: [number, number, number], color: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true })
      );
      sprite.position.set(...pos);
      sprite.scale.set(0.6, 0.6, 0.6);
      this.scene.add(sprite);
    };

    addAxisLabel('X', [axisLength + 0.4, 0, 0], 0xE74C3C);
    addAxisLabel('Y', [0, axisLength + 0.4, 0], 0x3FB950);
    addAxisLabel('Z', [0, 0, axisLength + 0.4], 0x3498DB);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public togglePerfMonitor(): void {
    this.showPerf = !this.showPerf;
    this.perfMonitor.classList.toggle('visible', this.showPerf);
  }

  public resetCamera(): void {
    this.camera.position.set(6, 5, 8);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  public getPointCloudManager(): PointCloudManager {
    return this.pointCloudManager;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public start(): void {
    setupUIControls(this);
    this.animate();
  }

  private updatePerformance(): void {
    this.fpsFrames++;
    const now = performance.now();
    const elapsed = now - this.fpsLastTime;

    if (elapsed >= 500) {
      this.currentFPS = Math.round((this.fpsFrames * 1000) / elapsed);
      this.fpsFrames = 0;
      this.fpsLastTime = now;

      if (this.showPerf) {
        this.perfFps.textContent = this.currentFPS.toString();
        const info = this.renderer.info;
        this.perfTris.textContent = info.render.triangles.toLocaleString();
        this.perfPoints.textContent = this.pointCloudManager.getPointCount().toLocaleString();

        this.perfFps.className = 'perf-value';
        if (this.currentFPS < 20) {
          this.perfFps.classList.add('danger');
        } else if (this.currentFPS < 30) {
          this.perfFps.classList.add('warning');
        }
      }
    }
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.controls.update();
    this.pointCloudManager.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.updatePerformance();
  };
}

const app = new App();
app.start();

export default App;
