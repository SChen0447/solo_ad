import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import { RoadNetworkManager } from './RoadNetworkManager';
import { ParticleFlowManager } from './ParticleFlowManager';

export interface RoadSegment {
  id: string;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
  density: number;
  direction: 'x' | 'z';
  isIntersection: boolean;
}

export interface TrafficData {
  segments: Map<string, number>;
  timestamp: number;
}

export class AppController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private gui: dat.GUI;

  private roadNetworkManager!: RoadNetworkManager;
  private particleFlowManager!: ParticleFlowManager;

  private speedMultiplier: number = 1;
  private dataUpdateInterval: number = 3000;
  private lastDataUpdate: number = 0;
  private simulationTime: number = 0;

  private trafficData: TrafficData = {
    segments: new Map(),
    timestamp: 0
  };

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private tooltipElement: HTMLElement;
  private hoveredSegment: RoadSegment | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls, gui: dat.GUI) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.gui = gui;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.tooltipElement = document.getElementById('tooltip')!;

    this.setupGUI();
    this.setupEventListeners();
  }

  init(): void {
    this.roadNetworkManager = new RoadNetworkManager(this.scene);
    this.particleFlowManager = new ParticleFlowManager(this.scene);

    this.roadNetworkManager.init();
    this.generateInitialData();

    this.particleFlowManager.init(
      this.roadNetworkManager.getRoadSegments(),
      this.roadNetworkManager.getIntersections()
    );

    this.updateTrafficVisualization();
  }

  private setupGUI(): void {
    const params = {
      speedMultiplier: 1.0
    };

    const folder = this.gui.addFolder('控制');
    folder.open();

    folder.add(params, 'speedMultiplier', 0.5, 3.0, 0.1)
      .name('速度倍率')
      .onChange((value: number) => {
        this.speedMultiplier = value;
      });
  }

  private setupEventListeners(): void {
    const canvas = this.scene.userData.canvas || document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    }
  }

  private generateInitialData(): void {
    const segments = this.roadNetworkManager.getRoadSegments();
    segments.forEach((segment) => {
      const baseDensity = 30 + Math.random() * 170;
      this.trafficData.segments.set(segment.id, baseDensity);
    });
    this.trafficData.timestamp = Date.now();
  }

  private fetchData(): void {
    this.simulationTime += this.dataUpdateInterval * this.speedMultiplier;

    const segments = this.roadNetworkManager.getRoadSegments();
    segments.forEach((segment) => {
      const phase = segment.id.charCodeAt(segment.id.length - 1) * 0.3;
      const timeScale = (this.simulationTime / 1000) * 0.5;
      const sinValue = Math.sin(timeScale + phase);
      const randomNoise = (Math.random() - 0.5) * 30;
      const baseDensity = 80 + sinValue * 60 + randomNoise;
      const clampedDensity = Math.max(0, Math.min(200, baseDensity));
      this.trafficData.segments.set(segment.id, clampedDensity);
    });

    this.trafficData.timestamp = Date.now();
  }

  private updateTrafficVisualization(): void {
    const densityMap = new Map<string, number>();
    this.trafficData.segments.forEach((density, id) => {
      densityMap.set(id, density);
    });

    this.roadNetworkManager.setTrafficDensity(densityMap);
    this.particleFlowManager.updateFlowDirection(densityMap);
  }

  update(): void {
    const now = performance.now();

    if (now - this.lastDataUpdate >= this.dataUpdateInterval / this.speedMultiplier) {
      this.fetchData();
      this.updateTrafficVisualization();
      this.lastDataUpdate = now;
    }

    const cameraDistance = this.camera.position.distanceTo(this.controls.target);
    this.roadNetworkManager.updateLOD(cameraDistance);
    this.particleFlowManager.updateLOD(cameraDistance);
    this.particleFlowManager.update(this.speedMultiplier);

    this.updateHover();
  }

  private onMouseMove(event: MouseEvent): void {
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseLeave(): void {
    this.hoveredSegment = null;
    this.tooltipElement.style.display = 'none';
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const roadMeshes = this.roadNetworkManager.getRaycastMeshes();
    const intersects = this.raycaster.intersectObjects(roadMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const segmentId = mesh.userData.segmentId;

      if (segmentId) {
        const segment = this.roadNetworkManager.getSegmentById(segmentId);
        if (segment) {
          if (this.hoveredSegment?.id !== segmentId) {
            if (this.hoveredSegment) {
              this.roadNetworkManager.setSegmentHighlight(this.hoveredSegment.id, false);
            }
            this.hoveredSegment = segment;
            this.roadNetworkManager.setSegmentHighlight(segmentId, true);
          }

          const density = this.trafficData.segments.get(segmentId) || 0;
          const time = new Date(this.trafficData.timestamp);
          const timeStr = time.toLocaleTimeString('zh-CN', { hour12: false });

          this.tooltipElement.style.display = 'block';
          this.tooltipElement.style.left = `${intersects[0].point.x + 10}px`;
          this.tooltipElement.style.top = `${intersects[0].point.y + 10}px`;

          const densityEl = this.tooltipElement.querySelector('.density');
          const timeEl = this.tooltipElement.querySelector('.time');
          if (densityEl) densityEl.textContent = `${Math.round(density)} 辆/分钟`;
          if (timeEl) timeEl.textContent = timeStr;

          const screenPos = this.worldToScreen(intersects[0].point);
          if (screenPos) {
            this.tooltipElement.style.left = `${screenPos.x + 15}px`;
            this.tooltipElement.style.top = `${screenPos.y - 10}px`;
          }
        }
      }
    } else {
      if (this.hoveredSegment) {
        this.roadNetworkManager.setSegmentHighlight(this.hoveredSegment.id, false);
        this.hoveredSegment = null;
      }
      this.tooltipElement.style.display = 'none';
    }
  }

  private worldToScreen(point: THREE.Vector3): { x: number; y: number } | null {
    const vector = point.clone().project(this.camera);
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;

    return {
      x: (vector.x + 1) / 2 * canvas.clientWidth,
      y: (-vector.y + 1) / 2 * canvas.clientHeight
    };
  }

  onResize(): void {
  }

  getTrafficData(): TrafficData {
    return this.trafficData;
  }
}
