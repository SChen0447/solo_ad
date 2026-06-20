import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RiverModule } from './riverModule';
import { UIModule } from './uiModule';
import { DataModule, MetricKey } from './dataModule';

export interface InteractionOptions {
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
}

const DEFAULT_OPTIONS: InteractionOptions = {
  enableDamping: true,
  dampingFactor: 0.08,
  minDistance: 20,
  maxDistance: 400
};

export class InteractionModule {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private riverModule: RiverModule;
  private uiModule: UIModule;
  private dataModule: DataModule;
  private options: InteractionOptions;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private downPosition: { x: number; y: number } = { x: 0, y: 0 };
  private targetCameraPosition: THREE.Vector3 | null = null;
  private targetLookAt: THREE.Vector3 | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    riverModule: RiverModule,
    uiModule: UIModule,
    dataModule: DataModule,
    options?: Partial<InteractionOptions>
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.riverModule = riverModule;
    this.uiModule = uiModule;
    this.dataModule = dataModule;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.configureControls();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();
  }

  private configureControls(): void {
    this.controls.enableDamping = this.options.enableDamping;
    this.controls.dampingFactor = this.options.dampingFactor;
    this.controls.enablePan = true;
    this.controls.minDistance = this.options.minDistance;
    this.controls.maxDistance = this.options.maxDistance;
    this.controls.target.set(0, 0, -100);
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.7;
    this.controls.update();
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.addEventListener('pointermove', this.onPointerMove.bind(this));
    dom.addEventListener('pointerup', this.onPointerUp.bind(this));
    dom.addEventListener('pointerleave', this.onPointerUp.bind(this));

    this.controls.addEventListener('change', () => {
      this.renderer.domElement.style.cursor = this.isDragging ? 'grabbing' : 'grab';
    });
  }

  private onPointerDown(event: PointerEvent): void {
    this.isDragging = true;
    this.downPosition = { x: event.clientX, y: event.clientY };
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const dx = Math.abs(event.clientX - this.downPosition.x);
    const dy = Math.abs(event.clientY - this.downPosition.y);
    if (dx > 3 || dy > 3) {
    }
  }

  private onPointerUp(event: PointerEvent): void {
    const dx = Math.abs(event.clientX - this.downPosition.x);
    const dy = Math.abs(event.clientY - this.downPosition.y);
    const wasClick = this.isDragging && dx < 5 && dy < 5;

    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'grab';

    if (wasClick) {
      this.handleClick(event);
    }
  }

  private handleClick(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const riverGroup = this.riverModule.getRiverGroup();
    const intersects = this.raycaster.intersectObjects(riverGroup.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitPoint = hit.point;
      const dayIndex = this.riverModule.findNearestDay(hitPoint);
      this.focusOnDay(dayIndex, true);
    } else {
      this.riverModule.clearHighlight();
      this.uiModule.clearDataLabels();
    }
  }

  focusOnDay(dayIndex: number, showLabel: boolean = false): void {
    const position = this.riverModule.getDayPosition(dayIndex);
    const dataPoint = this.dataModule.getDataByDay(dayIndex + 1);

    if (!position || !dataPoint) return;

    this.riverModule.setHighlight(dayIndex);
    this.uiModule.updateTimelineValue(dayIndex, dataPoint.date);

    if (showLabel) {
      this.uiModule.showDataLabel(position, dataPoint);
    }

    const cameraOffset = new THREE.Vector3(40, 30, 50);
    this.targetCameraPosition = position.clone().add(cameraOffset);
    this.targetLookAt = position.clone();
  }

  handleTimelineChange(dayIndex: number): void {
    this.focusOnDay(dayIndex, false);
    const position = this.riverModule.getDayPosition(dayIndex);
    const dataPoint = this.dataModule.getDataByDay(dayIndex + 1);
    if (position && dataPoint) {
      this.uiModule.showDataLabel(position, dataPoint);
    }
  }

  handleMetricToggle(metric: MetricKey, visible: boolean): void {
    this.riverModule.toggleMetric(metric, visible);
  }

  update(delta: number): void {
    this.controls.update();

    if (this.targetCameraPosition && this.targetLookAt) {
      const lerpFactor = Math.min(1, delta * 4);

      this.camera.position.lerp(this.targetCameraPosition, lerpFactor);
      this.controls.target.lerp(this.targetLookAt, lerpFactor);

      const dist = this.camera.position.distanceTo(this.targetCameraPosition);
      const lookDist = this.controls.target.distanceTo(this.targetLookAt);

      if (dist < 0.5 && lookDist < 0.5) {
        this.targetCameraPosition = null;
        this.targetLookAt = null;
      }
    }
  }

  getControls(): OrbitControls {
    return this.controls;
  }
}
