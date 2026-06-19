import * as THREE from 'three';
import * as dat from 'dat.gui';
import { TerrainRenderer } from './renderer/TerrainRenderer';
import { RainSystem } from './renderer/RainSystem';
import { WaterSimulator } from './compute/WaterSimulator';
import cityData from './data/cityData.json';

interface MonitorPoint {
  gx: number;
  gz: number;
  mesh: THREE.Mesh;
  blinkPhase: number;
}

interface PooledPopup {
  element: HTMLElement;
  titleEl: HTMLElement;
  waterEl: HTMLElement;
  trendEl: HTMLElement;
  inUse: boolean;
  hideTimer: number | null;
  fadeTimer: number | null;
}

const GRID = 50;

class App {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private terrainRenderer!: TerrainRenderer;
  private rainSystem!: RainSystem;
  private waterSimulator!: WaterSimulator;
  private clock: THREE.Clock;
  private isPaused: boolean = false;
  private simTime: number = 0;
  private monitorPoints: MonitorPoint[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private activePopup: PooledPopup | null = null;
  private popupPool: PooledPopup[] = [];

  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.init();
  }

  private init(): void {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initModules();
    this.initMonitorPoints();
    this.initGUI();
    this.initEvents();
    this.animate();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x3a3a3a);
    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x3a3a3a, 40, 80);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(30, 35, 30);
    this.camera.lookAt(0, 0, 0);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x888899, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(20, 30, 10);
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x8899aa, 0x443322, 0.4);
    this.scene.add(hemiLight);
  }

  private initModules(): void {
    const heightmap = new Float32Array(cityData.heightmap);
    const buildings = cityData.buildings;
    const drainOutlets = cityData.drainOutlets;

    this.terrainRenderer = new TerrainRenderer(this.scene, heightmap, buildings, drainOutlets);
    this.rainSystem = new RainSystem(this.scene);
    this.waterSimulator = new WaterSimulator(heightmap, drainOutlets);
  }

  private initMonitorPoints(): void {
    const positions = [
      { gx: 10, gz: 10 },
      { gx: 25, gz: 5 },
      { gx: 40, gz: 15 },
      { gx: 15, gz: 40 },
      { gx: 35, gz: 35 },
    ];

    for (const pos of positions) {
      const worldPos = this.terrainRenderer.gridToWorld(pos.gx, pos.gz);
      const terrainH = this.terrainRenderer.getTerrainHeightAt(pos.gx, pos.gz);

      const geo = new THREE.SphereGeometry(0.35, 16, 16);
      const mat = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        emissive: 0x330000,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(worldPos.x, terrainH + 1.0, worldPos.z);
      this.scene.add(mesh);

      this.monitorPoints.push({
        gx: pos.gx,
        gz: pos.gz,
        mesh,
        blinkPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private initGUI(): void {
    const gui = new dat.GUI({ autoPlace: false, closed: true });
    gui.domElement.style.position = 'fixed';
    gui.domElement.style.right = '0';
    gui.domElement.style.bottom = '0';
    gui.domElement.style.zIndex = '200';
    gui.domElement.style.transition = 'transform 0.3s ease-out';
    document.body.appendChild(gui.domElement);

    const params = {
      rainIntensity: 0,
      drainEfficiency: 1.0,
    };

    gui.add(params, 'rainIntensity', 0, 200, 1).name('降雨强度(mm/h)').onChange((val: number) => {
      this.waterSimulator.setRainIntensity(val);
      this.rainSystem.setRainIntensity(val);
    });

    gui.add(params, 'drainEfficiency', 0.5, 2.0, 0.1).name('排水效率(倍速)').onChange((val: number) => {
      this.waterSimulator.setDrainEfficiency(val);
    });
  }

  private initEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.resetSimulation();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePause();
      }
    });

    window.addEventListener('click', (e) => this.onClick(e));

    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let cameraAngleX = Math.PI / 4;
    let cameraAngleY = Math.PI / 4;
    let cameraDistance = 50;

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      cameraAngleX -= dx * 0.005;
      cameraAngleY = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleY + dy * 0.005));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      this.updateCameraPosition(cameraAngleX, cameraAngleY, cameraDistance);
    });

    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      cameraDistance = Math.max(15, Math.min(100, cameraDistance + e.deltaY * 0.05));
      this.updateCameraPosition(cameraAngleX, cameraAngleY, cameraDistance);
    }, { passive: false });

    this.updateCameraPosition(cameraAngleX, cameraAngleY, cameraDistance);
  }

  private updateCameraPosition(angleX: number, angleY: number, distance: number): void {
    this.camera.position.x = Math.cos(angleY) * Math.sin(angleX) * distance;
    this.camera.position.y = Math.sin(angleY) * distance;
    this.camera.position.z = Math.cos(angleY) * Math.cos(angleX) * distance;
    this.camera.lookAt(0, 0, 0);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onClick(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.monitorPoints.map(mp => mp.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const mp = this.monitorPoints.find(m => m.mesh === hitMesh);
      if (mp) {
        this.showMonitorPopup(mp, e.clientX, e.clientY);
      }
    }
  }

  private acquirePopup(): PooledPopup {
    let available = this.popupPool.find(p => !p.inUse);
    if (available) {
      available.element.classList.remove('fade-out');
      return available;
    }

    const element = document.createElement('div');
    element.className = 'monitor-popup';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:bold;margin-bottom:4px;';
    const waterEl = document.createElement('div');
    const trendEl = document.createElement('div');
    element.appendChild(titleEl);
    element.appendChild(waterEl);
    element.appendChild(trendEl);
    document.body.appendChild(element);

    const popup: PooledPopup = {
      element, titleEl, waterEl, trendEl,
      inUse: false, hideTimer: null, fadeTimer: null,
    };
    this.popupPool.push(popup);
    return popup;
  }

  private showMonitorPopup(mp: MonitorPoint, screenX: number, screenY: number): void {
    this.removePopup();

    const popup = this.acquirePopup();
    popup.inUse = true;

    const waterLevel = this.waterSimulator.getWaterLevelAt(mp.gx, mp.gz);
    const trend = this.waterSimulator.getWaterTrendAt(mp.gx, mp.gz);

    const waterLevelCm = (waterLevel * 100).toFixed(1);
    let trendIcon = '→';
    let trendText = '稳定';
    if (trend > 0.0001) {
      trendIcon = '↑';
      trendText = '上升';
    } else if (trend < -0.0001) {
      trendIcon = '↓';
      trendText = '下降';
    }

    popup.titleEl.textContent = `监测点 (${mp.gx}, ${mp.gz})`;
    popup.waterEl.textContent = `水位: ${waterLevelCm} cm`;
    popup.trendEl.textContent = `趋势: ${trendIcon} ${trendText}`;

    popup.element.classList.remove('fade-out');
    popup.element.style.display = 'block';
    popup.element.style.left = `${screenX + 10}px`;
    popup.element.style.top = `${screenY - 60}px`;
    popup.element.style.opacity = '0';
    popup.element.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
      popup.element.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
      popup.element.style.opacity = '1';
      popup.element.style.transform = 'translateY(0)';
    });

    this.activePopup = popup;

    if (popup.hideTimer) { window.clearTimeout(popup.hideTimer); popup.hideTimer = null; }
    if (popup.fadeTimer) { window.clearTimeout(popup.fadeTimer); popup.fadeTimer = null; }

    popup.hideTimer = window.setTimeout(() => {
      popup.element.style.transition = 'opacity 0.25s ease-in, transform 0.25s ease-in';
      popup.element.style.opacity = '0';
      popup.element.style.transform = 'translateY(-10px)';
      popup.fadeTimer = window.setTimeout(() => {
        this.removePopup();
      }, 280);
    }, 2720);
  }

  private removePopup(): void {
    if (this.activePopup) {
      const popup = this.activePopup;
      if (popup.hideTimer) { window.clearTimeout(popup.hideTimer); popup.hideTimer = null; }
      if (popup.fadeTimer) { window.clearTimeout(popup.fadeTimer); popup.fadeTimer = null; }
      popup.element.style.display = 'none';
      popup.element.style.transition = '';
      popup.element.style.opacity = '';
      popup.element.style.transform = '';
      popup.inUse = false;
      this.activePopup = null;
    }
  }

  private resetSimulation(): void {
    this.waterSimulator.reset();
    this.rainSystem.setRainIntensity(0);
    this.simTime = 0;
    this.isPaused = false;
    this.updatePauseOverlay();
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.updatePauseOverlay();
  }

  private updatePauseOverlay(): void {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      if (this.isPaused) {
        overlay.classList.add('visible');
      } else {
        overlay.classList.remove('visible');
      }
    }
  }

  private updateInfoPanel(): void {
    const rainIntensity = this.waterSimulator.getRainIntensity();
    const avgWater = this.waterSimulator.getAverageWaterLevel();
    const activeMonitors = this.monitorPoints.filter(
      mp => this.waterSimulator.getWaterLevelAt(mp.gx, mp.gz) > 0.001
    ).length;

    const panelRain = document.getElementById('panel-rain');
    const panelTime = document.getElementById('panel-time');
    const panelMonitors = document.getElementById('panel-monitors');
    const panelAvgWater = document.getElementById('panel-avg-water');
    const simTimeDisplay = document.getElementById('sim-time-display');
    const fpsDisplay = document.getElementById('fps-display');

    if (panelRain) panelRain.textContent = `${rainIntensity.toFixed(0)} mm/h`;
    if (panelTime) panelTime.textContent = `${this.simTime.toFixed(1)}s`;
    if (panelMonitors) panelMonitors.textContent = `${activeMonitors}`;
    if (panelAvgWater) panelAvgWater.textContent = `${(avgWater * 100).toFixed(1)}cm`;
    if (simTimeDisplay) simTimeDisplay.textContent = `模拟时长: ${this.simTime.toFixed(1)}s`;
    if (fpsDisplay) fpsDisplay.textContent = `FPS: ${this.currentFps}`;
  }

  private updateMonitorBlink(time: number): void {
    for (const mp of this.monitorPoints) {
      const blink = Math.sin(time * Math.PI * 2 + mp.blinkPhase);
      const mat = mp.mesh.material as THREE.MeshPhongMaterial;
      if (blink > 0) {
        mat.emissive.setRGB(0.6, 0, 0);
        mat.opacity = 1.0;
      } else {
        mat.emissive.setRGB(0.15, 0, 0);
        mat.opacity = 0.6;
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1.0) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    if (!this.isPaused) {
      this.simTime += delta;

      const waterGrid = this.waterSimulator.step(performance.now());
      this.terrainRenderer.updateWaterSurface(waterGrid, elapsed);
      this.terrainRenderer.updateDrainOutlets(waterGrid, elapsed);
      this.rainSystem.update(delta);
    }

    this.updateMonitorBlink(elapsed);
    this.updateInfoPanel();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
