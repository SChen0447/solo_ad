import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { dataLoader } from './dataLoader';
import { heatmapRenderer } from './heatmapRenderer';
import type { AppState, LayerType, BuildingData, BuildingValues } from './types';

import './style.css';

class CityHeatmapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;

  private state: AppState = {
    energy: { enabled: true, opacity: 0.7, radius: 40, data: null },
    traffic: { enabled: true, opacity: 0.7, radius: 40, data: null },
    green: { enabled: true, opacity: 0.7, radius: 40, data: null },
    gridData: null,
    selectedBuilding: null,
    buildingValues: {}
  };

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fps: number = 0;

  private pendingLayerUpdate: boolean = false;
  private layerUpdateTimeout: number | null = null;

  constructor() {
    this.container = document.getElementById('scene-container')!;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      2000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupControls();
    this.setupLights();
    this.setupGround();
    this.setupEventListeners();
    this.loadInitialData();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x1a1a2e);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 300, 600);
  }

  private setupCamera(): void {
    this.camera.position.set(150, 120, 150);
    this.camera.lookAt(0, 0, 0);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 10, 0);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 150, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -250;
    directionalLight.shadow.camera.right = 250;
    directionalLight.shadow.camera.top = 250;
    directionalLight.shadow.camera.bottom = -250;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x4b0082, 0.3);
    this.scene.add(hemisphereLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a4e,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(500, 50, 0x444466, 0x333355);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));

    document.getElementById('layer-energy')?.addEventListener('change', (e) => {
      this.state.energy.enabled = (e.target as HTMLInputElement).checked;
      this.scheduleLayerUpdate();
    });

    document.getElementById('layer-traffic')?.addEventListener('change', (e) => {
      this.state.traffic.enabled = (e.target as HTMLInputElement).checked;
      this.scheduleLayerUpdate();
    });

    document.getElementById('layer-green')?.addEventListener('change', (e) => {
      this.state.green.enabled = (e.target as HTMLInputElement).checked;
      this.scheduleLayerUpdate();
    });

    document.getElementById('opacity-energy')?.addEventListener('input', (e) => {
      this.state.energy.opacity = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('opacity-energy-value')!.textContent = this.state.energy.opacity.toFixed(2);
      this.scheduleLayerUpdate();
    });

    document.getElementById('opacity-traffic')?.addEventListener('input', (e) => {
      this.state.traffic.opacity = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('opacity-traffic-value')!.textContent = this.state.traffic.opacity.toFixed(2);
      this.scheduleLayerUpdate();
    });

    document.getElementById('opacity-green')?.addEventListener('input', (e) => {
      this.state.green.opacity = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('opacity-green-value')!.textContent = this.state.green.opacity.toFixed(2);
      this.scheduleLayerUpdate();
    });

    document.getElementById('radius-energy')?.addEventListener('change', (e) => {
      this.state.energy.radius = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('radius-energy-value')!.textContent = this.state.energy.radius.toString();
      this.fetchLayer('energy');
    });

    document.getElementById('radius-traffic')?.addEventListener('change', (e) => {
      this.state.traffic.radius = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('radius-traffic-value')!.textContent = this.state.traffic.radius.toString();
      this.fetchLayer('traffic');
    });

    document.getElementById('radius-green')?.addEventListener('change', (e) => {
      this.state.green.radius = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('radius-green-value')!.textContent = this.state.green.radius.toString();
      this.fetchLayer('green');
    });

    document.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const view = (e.target as HTMLButtonElement).dataset.view;
        this.animateToView(view as 'top' | 'front' | 'side');
      });
    });

    document.getElementById('close-panel')?.addEventListener('click', () => {
      this.togglePanel(false);
    });

    document.getElementById('toggle-btn')?.addEventListener('click', () => {
      this.togglePanel(true);
    });

    this.checkScreenSize();
    window.addEventListener('resize', this.checkScreenSize.bind(this));
  }

  private checkScreenSize(): void {
    const panel = document.getElementById('control-panel');
    const toggle = document.getElementById('panel-toggle');
    if (window.innerWidth <= 768) {
      toggle?.classList.remove('panel-toggle-hidden');
      panel?.classList.remove('panel-open');
    } else {
      toggle?.classList.add('panel-toggle-hidden');
      panel?.classList.remove('panel-open');
    }
  }

  private togglePanel(open: boolean): void {
    const panel = document.getElementById('control-panel');
    if (open) {
      panel?.classList.add('panel-open');
    } else {
      panel?.classList.remove('panel-open');
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      const gridData = await dataLoader.fetchGrid();
      this.state.gridData = gridData;

      gridData.buildings.forEach((building) => {
        heatmapRenderer.addBuilding(building, this.scene);
      });

      document.getElementById('building-count')!.textContent = gridData.buildings.length.toString();

      await this.fetchAllLayers();

      this.state.buildingValues = {};
      gridData.buildings.forEach((b) => {
        this.state.buildingValues[b.id] = { energy: 0, traffic: 0, green: 0 };
      });
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  private async fetchAllLayers(): Promise<void> {
    try {
      const layers = await dataLoader.fetchAllLayers(40);
      this.state.energy.data = layers.energy;
      this.state.traffic.data = layers.traffic;
      this.state.green.data = layers.green;
      this.updateBuildingValues();
      this.updateHeatmap();
    } catch (error) {
      console.error('Failed to fetch layers:', error);
    }
  }

  private async fetchLayer(layerType: LayerType): Promise<void> {
    try {
      const data = await dataLoader.fetchLayer(layerType, this.state[layerType].radius);
      this.state[layerType].data = data;
      this.updateBuildingValues();
      this.updateHeatmap();
    } catch (error) {
      console.error(`Failed to fetch ${layerType} layer:`, error);
    }
  }

  private updateBuildingValues(): void {
    if (!this.state.gridData) return;

    this.state.gridData.buildings.forEach((building) => {
      const id = building.id;
      this.state.buildingValues[id] = {
        energy: this.state.energy.data?.values[String(id)] ?? 0,
        traffic: this.state.traffic.data?.values[String(id)] ?? 0,
        green: this.state.green.data?.values[String(id)] ?? 0
      };
    });
  }

  private scheduleLayerUpdate(): void {
    this.pendingLayerUpdate = true;

    if (this.layerUpdateTimeout !== null) {
      window.clearTimeout(this.layerUpdateTimeout);
    }

    this.layerUpdateTimeout = window.setTimeout(() => {
      this.updateHeatmap();
      this.pendingLayerUpdate = false;
      this.layerUpdateTimeout = null;
    }, 50);
  }

  private updateHeatmap(): void {
    requestAnimationFrame(() => {
      const layers = {
        energy: this.state.energy,
        traffic: this.state.traffic,
        green: this.state.green
      };
      heatmapRenderer.updateCombinedHeatmap(layers);
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.checkScreenSize();
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = heatmapRenderer.getAllBuildingMeshes();
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const buildingId = hit.userData.buildingId as number;

      if (buildingId) {
        this.selectBuilding(buildingId);
      }
    }
  }

  private selectBuilding(buildingId: number): void {
    this.state.selectedBuilding = buildingId;

    heatmapRenderer.highlightBuilding(buildingId, this.scene);

    const building = this.state.gridData?.buildings.find(b => b.id === buildingId);
    const values = this.state.buildingValues[buildingId];

    if (building && values) {
      this.showInfoPopup(building, values);
    }
  }

  private showInfoPopup(building: BuildingData, values: BuildingValues): void {
    const popup = document.getElementById('info-popup');
    if (!popup) return;

    document.getElementById('building-id')!.textContent = building.id.toString();
    document.getElementById('building-height')!.textContent = building.height.toFixed(1) + ' 单位';
    document.getElementById('building-energy')!.textContent = values.energy.toFixed(1);
    document.getElementById('building-traffic')!.textContent = values.traffic.toFixed(1);
    document.getElementById('building-green')!.textContent = values.green.toFixed(1);

    popup.classList.remove('hidden');
  }

  private animateToView(view: 'top' | 'front' | 'side'): void {
    const targetPositions = {
      top: { x: 0, y: 200, z: 200, target: { x: 0, y: 0, z: 0 } },
      front: { x: 0, y: 150, z: 250, target: { x: 0, y: 0, z: 0 } },
      side: { x: 250, y: 80, z: 0, target: { x: 0, y: 0, z: 0 } }
    };

    const config = targetPositions[view];

    new TWEEN.Tween({
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      tx: this.controls.target.x,
      ty: this.controls.target.y,
      tz: this.controls.target.z
    })
      .to({
        x: config.x,
        y: config.y,
        z: config.z,
        tx: config.target.x,
        ty: config.target.y,
        tz: config.target.z
      }, 1000)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate((obj) => {
        this.camera.position.set(obj.x, obj.y, obj.z);
        this.controls.target.set(obj.tx, obj.ty, obj.tz);
        this.controls.update();
      })
      .start();
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const fpsElement = document.getElementById('fps-counter');
      if (fpsElement) {
        fpsElement.textContent = this.fps.toString();
        fpsElement.style.color = this.fps >= 40 ? '#6bcb77' : '#ff6b6b';
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    TWEEN.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateFPS();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CityHeatmapApp();
});
