import * as THREE from 'three';
import { CurveSurface, ControlPoint, PanelMaterialParams } from './CurveSurface';
import { LightController, EnvPreset } from './LightController';

const MATERIAL_TRANSITION_DURATION = 200;

export class PanelController {
  private container: HTMLElement;
  private surface: CurveSurface;
  private lightController: LightController;
  private camera: THREE.PerspectiveCamera;
  private onSelectPanels?: (indices: number[]) => void;

  private sidebarPanel: HTMLElement;
  private hamburgerBtn: HTMLElement;
  private sidebarOverlay: HTMLElement;
  private minimapContainer: HTMLElement;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;

  private controlPointsList: HTMLElement;
  private panelSelectList: HTMLElement;

  private sunDial: HTMLElement;
  private sunIndicator: HTMLElement;
  private sunAzimuthVal: HTMLElement;
  private sunAltitudeVal: HTMLElement;

  private matColor: HTMLInputElement;
  private matOpacity: HTMLInputElement;
  private matMetalness: HTMLInputElement;
  private matRoughness: HTMLInputElement;
  private matOpacityVal: HTMLElement;
  private matMetalnessVal: HTMLElement;
  private matRoughnessVal: HTMLElement;

  private envButtons: NodeListOf<HTMLElement>;

  private materialUpdatePending: boolean = false;
  private pendingMaterialParams: Partial<PanelMaterialParams> = {};
  private lastMaterialUpdateTime: number = 0;
  private materialUpdateInterval: number = 16;

  private isDraggingSun: boolean = false;
  private selectedPanelIndices: number[] = [];
  private expandedSections: Map<string, boolean> = new Map();

  constructor(
    container: HTMLElement,
    surface: CurveSurface,
    lightController: LightController,
    camera: THREE.PerspectiveCamera,
    onSelectPanels?: (indices: number[]) => void
  ) {
    this.container = container;
    this.surface = surface;
    this.lightController = lightController;
    this.camera = camera;
    this.onSelectPanels = onSelectPanels;

    this.sidebarPanel = document.getElementById('sidebar-panel') as HTMLElement;
    this.hamburgerBtn = document.getElementById('hamburger') as HTMLElement;
    this.sidebarOverlay = document.getElementById('sidebar-overlay') as HTMLElement;
    this.minimapContainer = document.getElementById('minimap') as HTMLElement;

    this.controlPointsList = document.getElementById('control-points-list') as HTMLElement;
    this.panelSelectList = document.getElementById('panel-select-list') as HTMLElement;

    this.sunDial = document.getElementById('sun-dial') as HTMLElement;
    this.sunIndicator = document.getElementById('sun-indicator') as HTMLElement;
    this.sunAzimuthVal = document.getElementById('sun-azimuth-val') as HTMLElement;
    this.sunAltitudeVal = document.getElementById('sun-altitude-val') as HTMLElement;

    this.matColor = document.getElementById('mat-color') as HTMLInputElement;
    this.matOpacity = document.getElementById('mat-opacity') as HTMLInputElement;
    this.matMetalness = document.getElementById('mat-metalness') as HTMLInputElement;
    this.matRoughness = document.getElementById('mat-roughness') as HTMLInputElement;
    this.matOpacityVal = document.getElementById('mat-opacity-val') as HTMLElement;
    this.matMetalnessVal = document.getElementById('mat-metalness-val') as HTMLElement;
    this.matRoughnessVal = document.getElementById('mat-roughness-val') as HTMLElement;

    this.envButtons = document.querySelectorAll('.env-btn');

    this.expandedSections.set('control-points', true);
    this.expandedSections.set('material', true);
    this.expandedSections.set('lighting', true);

    this.initMinimap();
    this.initControlPointsList();
    this.initPanelSelectList();
    this.initMaterialControls();
    this.initSunDial();
    this.initEnvButtons();
    this.initSectionToggles();
    this.initResponsiveLayout();
    this.updateSunDialPosition();
  }

  private initMinimap(): void {
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 300;
    this.minimapCanvas.height = 300;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.minimapContainer.appendChild(this.minimapCanvas);
  }

  private initControlPointsList(): void {
    const gridSize = this.surface.getControlGridSize();
    const points = this.surface.getControlPoints();

    for (let i = 0; i < points.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      const group = document.createElement('div');
      group.className = 'control-group';
      group.style.marginTop = '10px';

      const label = document.createElement('div');
      label.className = 'control-label';
      label.textContent = `控制点 ${i + 1} (行${row + 1}, 列${col + 1})`;
      group.appendChild(label);

      const rowDiv = document.createElement('div');
      rowDiv.className = 'control-row';

      const inputX = document.createElement('input');
      inputX.type = 'number';
      inputX.className = 'coord-input';
      inputX.value = points[i].x.toFixed(2);
      inputX.step = '0.1';
      inputX.dataset.pointIndex = String(i);
      inputX.dataset.axis = 'x';

      const inputY = document.createElement('input');
      inputY.type = 'number';
      inputY.className = 'coord-input';
      inputY.value = points[i].y.toFixed(2);
      inputY.step = '0.1';
      inputY.dataset.pointIndex = String(i);
      inputY.dataset.axis = 'y';

      const inputZ = document.createElement('input');
      inputZ.type = 'number';
      inputZ.className = 'coord-input';
      inputZ.value = points[i].z.toFixed(2);
      inputZ.step = '0.1';
      inputZ.dataset.pointIndex = String(i);
      inputZ.dataset.axis = 'z';

      rowDiv.appendChild(inputX);
      rowDiv.appendChild(inputY);
      rowDiv.appendChild(inputZ);
      group.appendChild(rowDiv);
      this.controlPointsList.appendChild(group);

      const handler = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.dataset.pointIndex || '0');
        const axis = target.dataset.axis as 'x' | 'y' | 'z';
        const val = parseFloat(target.value);
        if (!isNaN(val)) {
          const currentPoints = this.surface.getControlPoints();
          currentPoints[idx][axis] = val;
          this.surface.updateSingleControlPoint(idx, currentPoints[idx]);
        }
      };

      inputX.addEventListener('input', handler);
      inputY.addEventListener('input', handler);
      inputZ.addEventListener('input', handler);
    }
  }

  private initPanelSelectList(): void {
    const panelCount = this.surface.getPanelCount();
    for (let i = 0; i < panelCount; i++) {
      const item = document.createElement('div');
      item.className = 'panel-item';
      item.textContent = `面板 ${i + 1}`;
      item.dataset.panelIndex = String(i);

      item.addEventListener('click', (e: MouseEvent) => {
        const idx = parseInt(item.dataset.panelIndex || '0');
        if (e.ctrlKey || e.metaKey) {
          const pos = this.selectedPanelIndices.indexOf(idx);
          if (pos >= 0) {
            this.selectedPanelIndices.splice(pos, 1);
            item.classList.remove('selected');
          } else {
            this.selectedPanelIndices.push(idx);
            item.classList.add('selected');
          }
        } else {
          document.querySelectorAll('.panel-item.selected').forEach(el => {
            el.classList.remove('selected');
          });
          this.selectedPanelIndices = [idx];
          item.classList.add('selected');
        }
        this.surface.setSelectedPanels(this.selectedPanelIndices);
        if (this.onSelectPanels) {
          this.onSelectPanels(this.selectedPanelIndices);
        }
      });

      this.panelSelectList.appendChild(item);
    }
  }

  private initMaterialControls(): void {
    this.matColor.addEventListener('input', () => {
      this.throttleMaterialUpdate({ color: this.matColor.value });
    });

    this.matOpacity.addEventListener('input', () => {
      const val = parseFloat(this.matOpacity.value);
      this.matOpacityVal.textContent = val.toFixed(2);
      this.throttleMaterialUpdate({ opacity: val });
    });

    this.matMetalness.addEventListener('input', () => {
      const val = parseFloat(this.matMetalness.value);
      this.matMetalnessVal.textContent = val.toFixed(2);
      this.throttleMaterialUpdate({ metalness: val });
    });

    this.matRoughness.addEventListener('input', () => {
      const val = parseFloat(this.matRoughness.value);
      this.matRoughnessVal.textContent = val.toFixed(2);
      this.throttleMaterialUpdate({ roughness: val });
    });
  }

  private throttleMaterialUpdate(params: Partial<PanelMaterialParams>): void {
    this.pendingMaterialParams = { ...this.pendingMaterialParams, ...params };

    if (this.materialUpdatePending) return;

    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastMaterialUpdateTime;

    if (timeSinceLastUpdate >= this.materialUpdateInterval) {
      this.applyMaterialUpdate();
    } else {
      this.materialUpdatePending = true;
      setTimeout(() => {
        this.applyMaterialUpdate();
      }, this.materialUpdateInterval - timeSinceLastUpdate);
    }
  }

  private applyMaterialUpdate(): void {
    if (Object.keys(this.pendingMaterialParams).length > 0) {
      this.surface.updateMaterialForSelected(this.pendingMaterialParams);
      this.pendingMaterialParams = {};
    }
    this.lastMaterialUpdateTime = performance.now();
    this.materialUpdatePending = false;
  }

  private initSunDial(): void {
    const onDragStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.isDraggingSun = true;
      this.minimapContainer.classList.add('interacting');
      this.updateSunAngleFromEvent(e);
    };

    const onDragMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDraggingSun) return;
      e.preventDefault();
      this.updateSunAngleFromEvent(e);
    };

    const onDragEnd = () => {
      this.isDraggingSun = false;
      this.minimapContainer.classList.remove('interacting');
    };

    this.sunDial.addEventListener('mousedown', onDragStart);
    this.sunDial.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
  }

  private updateSunAngleFromEvent(e: MouseEvent | TouchEvent): void {
    const rect = this.sunDial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    const radius = rect.width / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedDistance = Math.min(distance / radius, 1);

    let azimuth = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (azimuth < 0) azimuth += 360;

    const altitude = normalizedDistance * 90;

    this.lightController.setSunAngle(azimuth, altitude);
    this.updateSunDialPosition();
  }

  private updateSunDialPosition(): void {
    const { azimuth, altitude } = this.lightController.getSunAngle();
    const radius = 50;
    const distance = (altitude / 90) * radius;

    const azimuthRad = (azimuth * Math.PI) / 180;
    const x = 60 + Math.sin(azimuthRad) * distance;
    const y = 60 - Math.cos(azimuthRad) * distance;

    this.sunIndicator.style.left = `${x}px`;
    this.sunIndicator.style.top = `${y}px`;

    this.sunAzimuthVal.textContent = `${Math.round(azimuth)}°`;
    this.sunAltitudeVal.textContent = `${Math.round(altitude)}°`;
  }

  private initEnvButtons(): void {
    this.envButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.envButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const env = btn.dataset.env as EnvPreset;
        this.lightController.setEnvMap(env, true);
      });
    });
  }

  private initSectionToggles(): void {
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.getAttribute('data-section');
        if (!section) return;

        const toggle = header.querySelector('.section-toggle');
        const content = document.getElementById(`content-${section}`);

        const isExpanded = !this.expandedSections.get(section);
        this.expandedSections.set(section, isExpanded);

        if (toggle) {
          toggle.classList.toggle('collapsed', !isExpanded);
        }
        if (content) {
          content.classList.toggle('collapsed', !isExpanded);
        }
      });
    });
  }

  private initResponsiveLayout(): void {
    const checkWidth = () => {
      if (window.innerWidth < 768) {
        this.hamburgerBtn.classList.add('visible');
        this.sidebarPanel.classList.remove('visible');
      } else {
        this.hamburgerBtn.classList.remove('visible');
        this.sidebarPanel.classList.add('visible');
        this.sidebarPanel.classList.remove('mobile-open');
        this.sidebarOverlay.classList.remove('visible');
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);

    this.hamburgerBtn.addEventListener('click', () => {
      this.sidebarPanel.classList.toggle('mobile-open');
      this.sidebarOverlay.classList.toggle('visible');
    });

    this.sidebarOverlay.addEventListener('click', () => {
      this.sidebarPanel.classList.remove('mobile-open');
      this.sidebarOverlay.classList.remove('visible');
    });
  }

  public updateMinimap(): void {
    if (!this.minimapCtx || !this.minimapCanvas) return;

    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const pos = (i / 10) * w;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(w, pos);
      ctx.stroke();
    }

    const centerX = w / 2;
    const centerY = h / 2;
    const scale = 25;

    const controlPoints = this.surface.getControlPoints();
    ctx.fillStyle = '#d4af37';
    for (const p of controlPoints) {
      const px = centerX + p.x * scale;
      const py = centerY + p.z * scale;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camAngle = Math.atan2(camDir.x, camDir.z);

    const camX = centerX + this.camera.position.x * scale;
    const camY = centerY + this.camera.position.z * scale;

    ctx.save();
    ctx.translate(camX, camY);
    ctx.rotate(camAngle);
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  public updateControlPointInputs(): void {
    const points = this.surface.getControlPoints();
    const inputs = this.controlPointsList.querySelectorAll('.coord-input');

    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      const idx = parseInt(el.dataset.pointIndex || '0');
      const axis = el.dataset.axis as 'x' | 'y' | 'z';
      if (document.activeElement !== el) {
        el.value = points[idx][axis].toFixed(2);
      }
    });
  }

  public updateControlPointInput(index: number, point: ControlPoint): void {
    const inputs = this.controlPointsList.querySelectorAll('.coord-input');
    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      const idx = parseInt(el.dataset.pointIndex || '0');
      if (idx === index && document.activeElement !== el) {
        const axis = el.dataset.axis as 'x' | 'y' | 'z';
        el.value = point[axis].toFixed(2);
      }
    });
  }

  public togglePanel(section: string, expanded: boolean): void {
    const header = document.querySelector(`.section-header[data-section="${section}"]`);
    const toggle = header?.querySelector('.section-toggle');
    const content = document.getElementById(`content-${section}`);

    this.expandedSections.set(section, expanded);
    if (toggle) {
      toggle.classList.toggle('collapsed', !expanded);
    }
    if (content) {
      content.classList.toggle('collapsed', !expanded);
    }
  }

  public showUI(): void {
    if (window.innerWidth >= 768) {
      this.sidebarPanel.classList.add('visible');
    }
    this.minimapContainer.classList.add('visible');
  }

  public updateSelectedPanelHighlight(indices: number[]): void {
    this.selectedPanelIndices = [...indices];
    const items = this.panelSelectList.querySelectorAll('.panel-item');
    items.forEach(item => {
      const idx = parseInt((item as HTMLElement).dataset.panelIndex || '0');
      item.classList.toggle('selected', indices.includes(idx));
    });
  }

  public dispose(): void {
  }
}
