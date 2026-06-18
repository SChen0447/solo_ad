import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ParticleCloud } from './particleCloud';
import { AQIDataPoint } from './dataLoader';

export interface InteractionCallbacks {
  onParticleHover?: (point: AQIDataPoint | null) => void;
  onParticleClick?: (point: AQIDataPoint) => void;
  onLegendFilterChange?: (filter: number | null) => void;
}

interface AqiLevel {
  name: string;
  min: number;
  max: number;
  color: string;
  filterValue: number;
}

const AQI_LEVELS: AqiLevel[] = [
  { name: '优', min: 0, max: 50, color: '#00e400', filterValue: 50 },
  { name: '良', min: 51, max: 100, color: '#ffff00', filterValue: 100 },
  { name: '轻度污染', min: 101, max: 150, color: '#ff7e00', filterValue: 150 },
  { name: '中度污染', min: 151, max: 200, color: '#ff0000', filterValue: 200 },
  { name: '重度污染', min: 201, max: 300, color: '#99004c', filterValue: 300 },
  { name: '严重污染', min: 301, max: 500, color: '#7e0023', filterValue: 500 }
];

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
  private legendDiv: HTMLElement | null = null;
  private isLegendDragging = false;
  private legendDragOffset = { x: 0, y: 0 };
  private activeFilter: number | null = null;
  private _callbacks: InteractionCallbacks;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    labelRenderer: CSS2DRenderer,
    _container: HTMLElement,
    particleCloud: ParticleCloud,
    callbacks: InteractionCallbacks = {}
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.labelRenderer = labelRenderer;
    this.particleCloud = particleCloud;
    this._callbacks = callbacks;
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
    if (this.isLegendDragging && this.legendDiv) {
      const newX = event.clientX - this.legendDragOffset.x;
      const newY = event.clientY - this.legendDragOffset.y;
      const maxX = window.innerWidth - this.legendDiv.offsetWidth - 10;
      const maxY = window.innerHeight - this.legendDiv.offsetHeight - 10;
      this.legendDiv.style.right = 'auto';
      this.legendDiv.style.bottom = 'auto';
      this.legendDiv.style.left = `${Math.max(10, Math.min(newX, maxX))}px`;
      this.legendDiv.style.top = `${Math.max(10, Math.min(newY, maxY))}px`;
      return;
    }

    const rect = this.labelRenderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.particleCloud.updateMouse(this.mouse);

    if (!this.isDragging) {
      this.particleCloud.raycast(this.camera);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.css2d-legend')) {
      if (target.closest('.css2d-legend-drag-handle')) {
        this.isLegendDragging = true;
        const legendRect = (target.closest('.css2d-legend') as HTMLElement).getBoundingClientRect();
        this.legendDragOffset = {
          x: event.clientX - legendRect.left,
          y: event.clientY - legendRect.top
        };
        event.preventDefault();
      }
      return;
    }
    this.isDragging = false;
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.isLegendDragging) {
      this.isLegendDragging = false;
      return;
    }
    const movementThreshold = 3;
    if (Math.abs(event.movementX) < movementThreshold && Math.abs(event.movementY) < movementThreshold) {
      this.isDragging = false;
    } else {
      this.isDragging = true;
    }
  }

  private onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.closest('.css2d-legend-item')) {
      const item = target.closest('.css2d-legend-item') as HTMLElement;
      const filterValue = parseInt(item.dataset.filter || '0', 10);
      this.toggleFilter(filterValue, item);
      event.stopPropagation();
      return;
    }

    if (target.closest('.css2d-legend-reset')) {
      this.resetLegendPosition();
      event.stopPropagation();
      return;
    }

    if (this.isDragging || this.isLegendDragging) return;

    const rect = this.labelRenderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.particleCloud.updateMouse(this.mouse);
    this.particleCloud.handleClick(this.camera);
  }

  private toggleFilter(filterValue: number, _itemEl: HTMLElement): void {
    if (this.activeFilter === filterValue) {
      this.activeFilter = null;
    } else {
      this.activeFilter = filterValue;
    }

    if (this.legendDiv) {
      const items = this.legendDiv.querySelectorAll('.css2d-legend-item');
      items.forEach((item) => {
        const val = parseInt((item as HTMLElement).dataset.filter || '0', 10);
        if (this.activeFilter === null) {
          (item as HTMLElement).classList.remove('active');
          (item as HTMLElement).classList.remove('dimmed');
        } else if (val === this.activeFilter) {
          (item as HTMLElement).classList.add('active');
          (item as HTMLElement).classList.remove('dimmed');
        } else {
          (item as HTMLElement).classList.remove('active');
          (item as HTMLElement).classList.add('dimmed');
        }
      });
    }

    if (this._callbacks.onLegendFilterChange) {
      this._callbacks.onLegendFilterChange(this.activeFilter);
    }
  }

  private resetLegendPosition(): void {
    if (this.legendDiv) {
      this.legendDiv.style.right = '20px';
      this.legendDiv.style.bottom = '20px';
      this.legendDiv.style.left = 'auto';
      this.legendDiv.style.top = 'auto';
    }
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
        background: rgba(11, 15, 25, 0.85);
        border-radius: 8px;
        padding: 12px 16px 14px;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        min-width: 240px;
        pointer-events: auto;
        user-select: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
        z-index: 50;
      }
      .css2d-legend:hover {
        border-color: rgba(99, 179, 237, 0.3);
      }
      .css2d-legend-drag-handle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .css2d-legend-title {
        font-size: 13px;
        font-weight: 600;
        color: #e0e6ed;
      }
      .css2d-legend-reset {
        font-size: 10px;
        color: #63b3ed;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      .css2d-legend-reset:hover {
        opacity: 1;
      }
      .css2d-legend-bar {
        width: 100%;
        height: 16px;
        border-radius: 4px;
        background: linear-gradient(
          to right,
          #00e400 0%,
          #ffff00 20%,
          #ff7e00 40%,
          #ff0000 60%,
          #99004c 80%,
          #7e0023 100%
        );
        margin-bottom: 4px;
      }
      .css2d-legend-scale {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #718096;
        margin-bottom: 10px;
      }
      .css2d-legend-items {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .css2d-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s ease, opacity 0.2s ease;
      }
      .css2d-legend-item:hover {
        background: rgba(99, 179, 237, 0.1);
      }
      .css2d-legend-item.active {
        background: rgba(99, 179, 237, 0.2);
        box-shadow: inset 0 0 0 1px rgba(99, 179, 237, 0.4);
      }
      .css2d-legend-item.dimmed {
        opacity: 0.35;
      }
      .css2d-legend-color {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex-shrink: 0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
      .css2d-legend-text {
        color: #cbd5e0;
        font-size: 11px;
        flex: 1;
      }
      .css2d-legend-hint {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 10px;
        color: #718096;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  public createLegend(scene: THREE.Scene): void {
    const legendDiv = document.createElement('div');
    legendDiv.className = 'css2d-legend';

    const levelsHtml = AQI_LEVELS.map((level) => `
      <div class="css2d-legend-item" data-filter="${level.filterValue}">
        <div class="css2d-legend-color" style="background:${level.color};"></div>
        <span class="css2d-legend-text">${level.name} (${level.min}-${level.max > 300 ? '+' : level.max})</span>
      </div>
    `).join('');

    legendDiv.innerHTML = `
      <div class="css2d-legend-drag-handle">
        <span class="css2d-legend-title">AQI 空气质量指数</span>
        <span class="css2d-legend-reset">重置位置</span>
      </div>
      <div class="css2d-legend-bar"></div>
      <div class="css2d-legend-scale">
        <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span>
      </div>
      <div class="css2d-legend-items">
        ${levelsHtml}
      </div>
      <div class="css2d-legend-hint">点击等级可筛选 · 拖动标题可移动</div>
    `;

    this.legendDiv = legendDiv;

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
