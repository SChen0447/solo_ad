import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ParticleCloud } from './particleCloud';
import { AQIDataPoint } from './dataLoader';

export interface InteractionCallbacks {
  onParticleHover?: (point: AQIDataPoint | null) => void;
  onParticleClick?: (point: AQIDataPoint) => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private particleCloud: ParticleCloud;
  private mouse: THREE.Vector2;
  private initialCameraPosition: THREE.Vector3;
  private initialTarget: THREE.Vector3;
  private isDragging = false;
  private legendLabel: CSS2DObject | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    labelRenderer: CSS2DRenderer,
    _container: HTMLElement,
    particleCloud: ParticleCloud,
    _callbacks: InteractionCallbacks = {}
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.labelRenderer = labelRenderer;
    this.particleCloud = particleCloud;
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.initialCameraPosition = new THREE.Vector3(7, 7, 7);
    this.initialTarget = new THREE.Vector3(0, 0, 0);

    this.controls = this.createOrbitControls();
    this.setupEventListeners();
    this.injectLegendStyles();
  }

  private createOrbitControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.target.copy(this.initialTarget);
    return controls;
  }

  private setupEventListeners(): void {
    this.labelRenderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.labelRenderer.domElement.addEventListener('click', this.onClick.bind(this));
    this.labelRenderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.labelRenderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.labelRenderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.particleCloud.updateMouse(this.mouse);

    if (!this.isDragging) {
      this.particleCloud.raycast(this.camera);
    }
  }

  private onMouseDown(): void {
    this.isDragging = false;
  }

  private onMouseUp(event: MouseEvent): void {
    const movementThreshold = 3;
    if (Math.abs(event.movementX) < movementThreshold && Math.abs(event.movementY) < movementThreshold) {
      this.isDragging = false;
    } else {
      this.isDragging = true;
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.labelRenderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.particleCloud.updateMouse(this.mouse);
    this.particleCloud.handleClick(this.camera);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  private injectLegendStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .css2d-legend {
        position: fixed;
        right: 20px;
        bottom: 20px;
        background: rgba(11, 15, 25, 0.8);
        border-radius: 8px;
        padding: 16px 20px;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        min-width: 260px;
        pointer-events: none;
        user-select: none;
      }
      .css2d-legend-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #e0e6ed;
      }
      .css2d-legend-bar {
        width: 100%;
        height: 18px;
        border-radius: 4px;
        background: linear-gradient(
          to right,
          #00e400 0%,
          #ffff00 16.67%,
          #ff7e00 33.33%,
          #ff0000 50%,
          #99004c 66.67%,
          #7e0023 100%
        );
        margin-bottom: 6px;
      }
      .css2d-legend-scale {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #a0aec0;
        margin-bottom: 12px;
      }
      .css2d-legend-items {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .css2d-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .css2d-legend-color {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex-shrink: 0;
      }
      .css2d-legend-text {
        color: #cbd5e0;
        font-size: 11px;
      }
    `;
    document.head.appendChild(style);
  }

  public createLegend(scene: THREE.Scene): void {
    const legendDiv = document.createElement('div');
    legendDiv.className = 'css2d-legend';
    legendDiv.innerHTML = `
      <div class="css2d-legend-title">AQI 空气质量指数</div>
      <div class="css2d-legend-bar"></div>
      <div class="css2d-legend-scale">
        <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300</span>
      </div>
      <div class="css2d-legend-items">
        <div class="css2d-legend-item">
          <div class="css2d-legend-color" style="background:#00e400;"></div>
          <span class="css2d-legend-text">优 (0-50)</span>
        </div>
        <div class="css2d-legend-item">
          <div class="css2d-legend-color" style="background:#ffff00;"></div>
          <span class="css2d-legend-text">良 (51-100)</span>
        </div>
        <div class="css2d-legend-item">
          <div class="css2d-legend-color" style="background:#ff7e00;"></div>
          <span class="css2d-legend-text">轻度污染 (101-150)</span>
        </div>
        <div class="css2d-legend-item">
          <div class="css2d-legend-color" style="background:#ff0000;"></div>
          <span class="css2d-legend-text">中度污染 (151-200)</span>
        </div>
        <div class="css2d-legend-item">
          <div class="css2d-legend-color" style="background:#99004c;"></div>
          <span class="css2d-legend-text">重度污染 (201-300)</span>
        </div>
        <div class="css2d-legend-item">
          <div class="css2d-legend-color" style="background:#7e0023;"></div>
          <span class="css2d-legend-text">严重污染 (&gt;300)</span>
        </div>
      </div>
    `;

    this.legendLabel = new CSS2DObject(legendDiv);
    this.legendLabel.position.set(0, 0, 0);
    scene.add(this.legendLabel);
  }

  public setInitialCamera(position: THREE.Vector3, target: THREE.Vector3): void {
    this.initialCameraPosition.copy(position);
    this.initialTarget.copy(target);
    this.resetCamera();
  }

  public resetCamera(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialTarget);
    this.controls.update();
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public update(_deltaTime: number): void {
    this.controls.update();
  }

  public dispose(): void {
    this.labelRenderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.labelRenderer.domElement.removeEventListener('click', this.onClick.bind(this));
    this.labelRenderer.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.labelRenderer.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
    this.controls.dispose();
  }
}
