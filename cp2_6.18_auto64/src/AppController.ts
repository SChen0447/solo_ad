import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import { RoadNetworkManager } from './RoadNetworkManager';
import { ParticleFlowManager } from './ParticleFlowManager';
import { ToolTipManager } from './ToolTipManager';
import { PerformanceMonitor } from './PerformanceMonitor';
import { TrafficSimulation } from './trafficSimulation';
import {
  AppState,
  LODLevel,
  DATA_UPDATE_INTERVAL,
  LOD_DISTANCE_NEAR,
  LOD_DISTANCE_MID,
  HoverInfo
} from './types';

export class AppController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private roadNetworkManager: RoadNetworkManager;
  private particleFlowManager: ParticleFlowManager;
  private toolTipManager: ToolTipManager;
  private performanceMonitor: PerformanceMonitor;
  private trafficSimulation: TrafficSimulation;

  private state: AppState;
  private gui: dat.GUI;
  private lastDataUpdate: number = 0;
  private animationFrameId: number | null = null;
  private currentHoveredRoad: string | null = null;
  private lastTimestamp: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    controls: OrbitControls,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;
    this.container = container;
    this.clock = new THREE.Clock();

    this.state = {
      speedMultiplier: 1.0,
      currentLOD: 'near',
      cameraDistance: 60,
      isRunning: true
    };

    this.roadNetworkManager = new RoadNetworkManager(this.scene, this.camera);
    this.particleFlowManager = new ParticleFlowManager(
      this.scene,
      this.roadNetworkManager.getRoads()
    );
    this.toolTipManager = new ToolTipManager();
    this.performanceMonitor = new PerformanceMonitor(this.renderer);
    this.trafficSimulation = new TrafficSimulation();

    this.gui = this.createControlPanel();
    this.setupEventListeners();
    this.setupLighting();
    
    const initialData = this.trafficSimulation.fetchData();
    this.roadNetworkManager.setTrafficDensity(initialData.roadDensities);
    this.particleFlowManager.updateFlowDirection(initialData.flowDirections);
    this.particleFlowManager.updateRoadDensities(initialData.roadDensities);
  }

  private createControlPanel(): dat.GUI {
    const gui = new dat.GUI({ width: 220 });
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '10px';
    gui.domElement.style.right = '10px';
    gui.domElement.style.zIndex = '999';

    const folder = gui.addFolder('车流仿真控制');
    folder.open();

    folder.add(this.state, 'speedMultiplier', 0.5, 3.0, 0.1)
      .name('速度倍率')
      .onChange(() => {
        this.lastDataUpdate = 0;
      });

    return gui;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x444444, 0x222222, 0.4);
    this.scene.add(hemisphereLight);
  }

  private setupEventListeners(): void {
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseMove(event: MouseEvent): void {
    const hoveredRoadId = this.roadNetworkManager.handleMouseMove(event, this.container);
    
    if (hoveredRoadId) {
      const density = this.roadNetworkManager.getRoadDensity(hoveredRoadId);
      if (density !== null) {
        const info: HoverInfo = {
          roadId: hoveredRoadId,
          density,
          timestamp: Date.now(),
          screenX: event.clientX,
          screenY: event.clientY
        };
        this.toolTipManager.show(info);
        this.currentHoveredRoad = hoveredRoadId;
      }
    } else {
      this.toolTipManager.hide();
      this.currentHoveredRoad = null;
    }

    if (this.currentHoveredRoad) {
      this.toolTipManager.updatePosition(event.clientX, event.clientY);
    }
  }

  private handleMouseLeave(): void {
    this.toolTipManager.hide();
    this.currentHoveredRoad = null;
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateLOD(): void {
    const cameraDistance = this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    this.state.cameraDistance = cameraDistance;

    let newLOD: LODLevel;
    if (cameraDistance < LOD_DISTANCE_NEAR) {
      newLOD = 'near';
    } else if (cameraDistance < LOD_DISTANCE_MID) {
      newLOD = 'mid';
    } else {
      newLOD = 'far';
    }

    if (newLOD !== this.state.currentLOD) {
      this.state.currentLOD = newLOD;
      this.roadNetworkManager.updateLOD(newLOD, cameraDistance);
      this.particleFlowManager.updateLOD(newLOD);
    }
  }

  private fetchData(): void {
    const data = this.trafficSimulation.fetchData();
    
    this.roadNetworkManager.setTrafficDensity(data.roadDensities);
    this.particleFlowManager.updateFlowDirection(data.flowDirections);
    this.particleFlowManager.updateRoadDensities(data.roadDensities);
  }

  public start(): void {
    this.state.isRunning = true;
    this.animate();
  }

  public stop(): void {
    this.state.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate(): void {
    if (!this.state.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    this.performanceMonitor.begin();

    const timestamp = performance.now();
    const deltaTime = this.lastTimestamp > 0 
      ? (timestamp - this.lastTimestamp) / 16.67 
      : 1;
    this.lastTimestamp = timestamp;

    const effectiveInterval = DATA_UPDATE_INTERVAL / this.state.speedMultiplier;
    if (timestamp - this.lastDataUpdate >= effectiveInterval) {
      this.fetchData();
      this.lastDataUpdate = timestamp;
    }

    this.controls.update();
    this.updateLOD();
    this.particleFlowManager.update(deltaTime);

    this.renderer.render(this.scene, this.camera);

    this.performanceMonitor.end();
  }

  public dispose(): void {
    this.stop();
    
    this.roadNetworkManager.dispose();
    this.particleFlowManager.dispose();
    this.toolTipManager.dispose();
    this.performanceMonitor.dispose();
    
    this.gui.destroy();
    
    this.container.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    this.controls.dispose();
  }

  public getState(): AppState {
    return { ...this.state };
  }

  public getRoadManager(): RoadNetworkManager {
    return this.roadNetworkManager;
  }

  public getParticleManager(): ParticleFlowManager {
    return this.particleFlowManager;
  }
}
