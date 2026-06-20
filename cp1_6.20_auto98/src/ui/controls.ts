import * as THREE from 'three';
import type { TrafficRenderer } from '../scene/trafficRenderer';
import type { TrafficFrame } from '../data/dataProvider';
import { getSegmentStats } from '../data/dataProvider';
import type { StatsPanel } from './statsPanel';

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private trafficRenderer: TrafficRenderer;
  private statsPanel: StatsPanel;
  private trafficData: TrafficFrame[];
  private currentFrame: number;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedSegmentId: number | null = null;
  private hoveredSegmentId: number | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    trafficRenderer: TrafficRenderer,
    statsPanel: StatsPanel,
    trafficData: TrafficFrame[],
    getCurrentFrame: () => number
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.trafficRenderer = trafficRenderer;
    this.statsPanel = statsPanel;
    this.trafficData = trafficData;
    this.currentFrame = getCurrentFrame();

    const canvas = renderer.domElement;
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  update(currentFrame: number): void {
    this.currentFrame = currentFrame;
  }

  getSelectedSegmentId(): number | null {
    return this.selectedSegmentId;
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event);
    const meshes = this.trafficRenderer.getRoadMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const segId = hit.userData?.id as number | undefined;

      if (segId !== undefined && segId !== this.selectedSegmentId) {
        if (this.selectedSegmentId !== null) {
          this.trafficRenderer.unhighlightSegment(this.selectedSegmentId);
        }
        this.selectedSegmentId = segId;
        this.trafficRenderer.highlightSegment(segId);
        const stats = getSegmentStats(segId, this.currentFrame, this.trafficData);
        this.statsPanel.show(stats);
      }
    } else {
      if (this.selectedSegmentId !== null) {
        this.trafficRenderer.unhighlightSegment(this.selectedSegmentId);
        this.selectedSegmentId = null;
        this.statsPanel.hide();
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    const meshes = this.trafficRenderer.getRoadMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const segId = hit.userData?.id as number | undefined;
      if (segId !== undefined && segId !== this.selectedSegmentId) {
        if (this.hoveredSegmentId !== null && this.hoveredSegmentId !== this.selectedSegmentId) {
          this.trafficRenderer.unhighlightSegment(this.hoveredSegmentId);
        }
        this.hoveredSegmentId = segId;
        this.trafficRenderer.highlightSegment(segId);

        if (this.selectedSegmentId === null) {
          const stats = getSegmentStats(segId, this.currentFrame, this.trafficData);
          this.statsPanel.show(stats);
        }
      }
    } else {
      if (this.hoveredSegmentId !== null && this.hoveredSegmentId !== this.selectedSegmentId) {
        this.trafficRenderer.unhighlightSegment(this.hoveredSegmentId);
        if (this.selectedSegmentId === null) {
          this.statsPanel.hide();
        }
      }
      this.hoveredSegmentId = null;
    }
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  refreshSelectedStats(): void {
    if (this.selectedSegmentId !== null) {
      const stats = getSegmentStats(this.selectedSegmentId, this.currentFrame, this.trafficData);
      this.statsPanel.show(stats);
    }
  }
}
