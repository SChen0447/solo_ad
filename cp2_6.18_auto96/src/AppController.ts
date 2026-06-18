import * as THREE from 'three';
import { RoadNetworkManager } from './RoadNetworkManager';
import { ParticleFlowManager } from './ParticleFlowManager';

export interface TrafficData {
  segmentId: string;
  density: number;
  direction: 1 | -1;
}

export class AppController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private tooltip: HTMLElement;

  private roadNetworkManager: RoadNetworkManager;
  private particleFlowManager: ParticleFlowManager;

  private trafficData: Map<string, TrafficData> = new Map();
  private elapsedTime: number = 0;
  private dataUpdateTimer: number = 0;
  private dataUpdateInterval: number = 3.0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredSegmentId: string | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    tooltip: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.tooltip = tooltip;

    this.roadNetworkManager = new RoadNetworkManager(scene);
    this.particleFlowManager = new ParticleFlowManager(scene);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.generateInitialData();

    renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private generateInitialData(): void {
    const segmentIds = this.roadNetworkManager.getSegmentIds();
    for (const id of segmentIds) {
      const density = 40 + Math.random() * 120;
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      this.trafficData.set(id, { segmentId: id, density, direction });
    }
    this.pushDataToManagers();
  }

  private updateTrafficData(): void {
    const segmentIds = this.roadNetworkManager.getSegmentIds();
    const t = this.elapsedTime;

    for (const id of segmentIds) {
      const prev = this.trafficData.get(id)!;
      const row = parseInt(id.split('_')[1]);
      const col = parseInt(id.split('_')[2]);
      const phaseOffset = row * 1.3 + col * 0.7;

      const sinWave = Math.sin(t * 0.4 + phaseOffset) * 50;
      const noise = (Math.random() - 0.5) * 30;
      let newDensity = 100 + sinWave + noise;
      newDensity = Math.max(0, Math.min(200, newDensity));

      const dirChange = Math.random();
      const direction: 1 | -1 = dirChange > 0.85
        ? (prev.direction === 1 ? -1 : 1)
        : prev.direction;

      this.trafficData.set(id, {
        segmentId: id,
        density: newDensity,
        direction,
      });
    }

    this.pushDataToManagers();
  }

  private pushDataToManagers(): void {
    const densityMap = new Map<string, number>();
    const directionMap = new Map<string, 1 | -1>();

    this.trafficData.forEach((data, id) => {
      densityMap.set(id, data.density);
      directionMap.set(id, data.direction);
    });

    this.roadNetworkManager.setTrafficDensity(densityMap);
    this.particleFlowManager.updateFlowDirection(directionMap, densityMap);
  }

  start(): void {
    this.roadNetworkManager.build();
    this.particleFlowManager.build(this.roadNetworkManager.getSegmentPaths());
  }

  update(delta: number, speedMultiplier: number, camera: THREE.PerspectiveCamera): void {
    const scaledDelta = delta * speedMultiplier;
    this.elapsedTime += scaledDelta;

    this.dataUpdateTimer += scaledDelta;
    if (this.dataUpdateTimer >= this.dataUpdateInterval) {
      this.dataUpdateTimer = 0;
      this.updateTrafficData();
    }

    const camDist = camera.position.length();
    this.roadNetworkManager.updateLOD(camDist);

    this.particleFlowManager.update(scaledDelta, camDist);

    this.updateHover();
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.tooltip) {
      this.tooltip.style.left = (event.clientX + 12) + 'px';
      this.tooltip.style.top = (event.clientY - 10) + 'px';
    }
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(
      this.roadNetworkManager.getHoverMeshes()
    );

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const segId = hit.userData['segmentId'] as string;

      if (segId && segId !== this.hoveredSegmentId) {
        if (this.hoveredSegmentId) {
          this.roadNetworkManager.setSegmentHighlight(this.hoveredSegmentId, false);
        }
        this.hoveredSegmentId = segId;
        this.roadNetworkManager.setSegmentHighlight(segId, true);
      }

      if (segId) {
        const data = this.trafficData.get(segId);
        if (data && this.tooltip) {
          const timeLabel = new Date().toLocaleTimeString('zh-CN');
          this.tooltip.innerHTML =
            `<b>路段 ${segId}</b><br/>密度: ${data.density.toFixed(1)} 辆/分钟<br/>时间: ${timeLabel}`;
          this.tooltip.style.display = 'block';
        }
      }
    } else {
      if (this.hoveredSegmentId) {
        this.roadNetworkManager.setSegmentHighlight(this.hoveredSegmentId, false);
        this.hoveredSegmentId = null;
      }
      if (this.tooltip) {
        this.tooltip.style.display = 'none';
      }
    }
  }
}
