import * as THREE from 'three';
import {
  DataParser,
  HRVAnalysisResult,
  TimeDomainMetric,
  PerPointMetrics
} from './dataParser';
import { TimeSeriesPlot } from './timeSeriesPlot';
import { FrequencyPlot, BandVisibility } from './frequencyPlot';

class HRVVisualizerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private timeSeriesPlot: TimeSeriesPlot;
  private frequencyPlot: FrequencyPlot;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 120;
  private cameraAzimuth: number = 0.6;
  private cameraPolar: number = 0.5;
  private panOffset: THREE.Vector2 = new THREE.Vector2(0, 0);

  private targetCameraAzimuth: number = 0.6;
  private targetCameraPolar: number = 0.5;
  private targetCameraDistance: number = 120;
  private targetPanOffset: THREE.Vector2 = new THREE.Vector2(0, 0);

  private rotationSensitivity: number = 0.005;
  private minDistance: number = 60;
  private maxDistance: number = 360;

  private currentData: HRVAnalysisResult | null = null;
  private currentMetric: TimeDomainMetric = 'sdnn';
  private bandVisibility: BandVisibility = { vlf: true, lf: true, hf: true };
  private windowStep: number = 32;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private tooltip: HTMLElement;
  private infoContent: HTMLElement;
  private errorModal: HTMLElement;
  private errorMessage: HTMLElement;

  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.infoContent = document.getElementById('infoContent')!;
    this.errorModal = document.getElementById('errorModal')!;
    this.errorMessage = document.getElementById('errorMessage')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08081a);
    this.scene.fog = new THREE.Fog(0x08081a, 150, 250);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x08081a, 1);
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.timeSeriesPlot = new TimeSeriesPlot(
      this.scene,
      new THREE.Vector3(-50, 0, 0)
    );
    this.frequencyPlot = new FrequencyPlot(
      this.scene,
      new THREE.Vector3(60, -20, 0)
    );

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.updateCameraPosition();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 80, 50);
    directionalLight.castShadow = false;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00e5ff, 0.5, 200);
    pointLight1.position.set(-50, 30, 30);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4ade80, 0.3, 150);
    pointLight2.position.set(60, 20, -30);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize.bind(this));

    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.addEventListener('change', this.onFileSelect.bind(this));

    this.setupCustomSelect('metricSelect', (value: string) => {
      this.currentMetric = value as TimeDomainMetric;
      this.updatePlots();
    });

    const vlfToggle = document.getElementById('vlfToggle') as HTMLInputElement;
    const lfToggle = document.getElementById('lfToggle') as HTMLInputElement;
    const hfToggle = document.getElementById('hfToggle') as HTMLInputElement;

    const updateVisibility = () => {
      this.bandVisibility = {
        vlf: vlfToggle.checked,
        lf: lfToggle.checked,
        hf: hfToggle.checked
      };
      this.updatePlots();
    };

    vlfToggle.addEventListener('change', updateVisibility);
    lfToggle.addEventListener('change', updateVisibility);
    hfToggle.addEventListener('change', updateVisibility);

    const windowStepSlider = document.getElementById('windowStepSlider') as HTMLInputElement;
    const windowStepValue = document.getElementById('windowStepValue') as HTMLElement;

    windowStepSlider.addEventListener('input', (e) => {
      this.windowStep = parseInt((e.target as HTMLInputElement).value);
      windowStepValue.textContent = `步长: ${this.windowStep}`;
      if (this.currentData && this.currentData.isValid) {
        this.reanalyzeData();
      }
    });

    const resetViewBtn = document.getElementById('resetViewBtn') as HTMLButtonElement;
    resetViewBtn.addEventListener('click', this.resetView.bind(this));

    const errorCloseBtn = document.getElementById('errorCloseBtn') as HTMLButtonElement;
    errorCloseBtn.addEventListener('click', () => {
      this.errorModal.classList.remove('visible');
    });
  }

  private async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    const uploadBtn = document.getElementById('fileUploadBtn') as HTMLElement;
    const fileNameDisplay = document.getElementById('fileNameDisplay') as HTMLElement;

    if (file) {
      uploadBtn.classList.remove('selected');
      void uploadBtn.offsetWidth;
      uploadBtn.classList.add('selected');
      fileNameDisplay.textContent = `已选择: ${file.name}`;

      const result = await DataParser.parseCSVFile(file, this.windowStep);
      this.handleAnalysisResult(result);
    } else {
      uploadBtn.classList.remove('selected');
      fileNameDisplay.textContent = '上传 CSV 文件';
    }
  }

  private setupCustomSelect(selectId: string, onChange: (value: string) => void): void {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    const trigger = selectEl.querySelector('.custom-select-trigger') as HTMLElement;
    const options = selectEl.querySelectorAll('.custom-select-option');
    const labelEl = trigger.querySelector('.custom-select-label') as HTMLElement;

    const closeAllSelects = (excludeEl?: HTMLElement) => {
      document.querySelectorAll('.custom-select.open').forEach((el) => {
        if (el !== excludeEl) {
          el.classList.remove('open');
        }
      });
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = selectEl.classList.contains('open');
      closeAllSelects();
      if (!isOpen) {
        selectEl.classList.add('open');
      }
    });

    options.forEach((option) => {
      const optEl = option as HTMLElement;
      optEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = optEl.dataset.value || '';
        const label = optEl.textContent || '';

        trigger.dataset.value = value;
        labelEl.textContent = label;

        options.forEach((o) => o.classList.remove('selected'));
        optEl.classList.add('selected');

        selectEl.classList.remove('open');
        onChange(value);
      });
    });

    document.addEventListener('click', () => {
      closeAllSelects();
    });
  }

  private async reanalyzeData(): Promise<void> {
    if (!this.currentData) return;

    const rrContent = this.currentData.rrIntervals.join('\n');
    const result = await DataParser.parseCSVContent(rrContent, this.windowStep);
    this.handleAnalysisResult(result);
  }

  private handleAnalysisResult(result: HRVAnalysisResult): void {
    if (!result.isValid) {
      this.showError(result.errorMessage || '数据解析失败');
      return;
    }

    this.currentData = result;
    this.updatePlots();
    this.updateInfoPanel();
  }

  private updatePlots(): void {
    if (!this.currentData || !this.currentData.isValid) return;

    this.timeSeriesPlot.updateData(
      this.currentData.rrIntervals,
      this.currentData.timeDomain.perPoint,
      this.currentMetric
    );

    this.frequencyPlot.updateData(
      this.currentData.frequencyDomain,
      this.bandVisibility
    );
  }

  private updateInfoPanel(): void {
    if (!this.currentData || !this.currentData.isValid) {
      this.infoContent.innerHTML = '<div class="empty-state">请上传 CSV 数据文件开始分析</div>';
      return;
    }

    const { overall } = this.currentData.timeDomain;
    const latestFreq = this.currentData.frequencyDomain[this.currentData.frequencyDomain.length - 1];

    let html = `
      <div class="metric-row">
        <span class="metric-label">数据点数:</span>
        <span class="metric-value">${this.currentData.rrIntervals.length}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">SDNN:</span>
        <span class="metric-value">${overall.sdnn.toFixed(2)} ms</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">RMSSD:</span>
        <span class="metric-value">${overall.rmssd.toFixed(2)} ms</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">pNN50:</span>
        <span class="metric-value">${overall.pnn50.toFixed(2)} %</span>
      </div>
    `;

    if (latestFreq) {
      html += `
        <div class="metric-row">
          <span class="metric-label">VLF:</span>
          <span class="metric-value">${latestFreq.bands.vlf.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">LF:</span>
          <span class="metric-value">${latestFreq.bands.lf.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">HF:</span>
          <span class="metric-value">${latestFreq.bands.hf.toFixed(2)}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">LF/HF:</span>
          <span class="metric-value">${latestFreq.bands.lfHfRatio.toFixed(3)}</span>
        </div>
      `;
    }

    html += '<div class="data-list">';
    const previewCount = Math.min(10, this.currentData.rrIntervals.length);
    for (let i = 0; i < previewCount; i++) {
      html += `
        <div class="data-list-item">
          <span>#${i + 1}</span>
          <span>${this.currentData.rrIntervals[i].toFixed(1)} ms</span>
        </div>
      `;
    }
    if (this.currentData.rrIntervals.length > previewCount) {
      html += `<div class="data-list-item"><span>...</span><span>共 ${this.currentData.rrIntervals.length} 条</span></div>`;
    }
    html += '</div>';

    this.infoContent.innerHTML = html;
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorModal.classList.add('visible');
  }

  private resetView(): void {
    this.targetCameraAzimuth = 0.6;
    this.targetCameraPolar = 0.5;
    this.targetCameraDistance = 120;
    this.targetPanOffset.set(0, 0);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
    } else if (event.button === 2) {
      this.isPanning = true;
    }
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.targetCameraAzimuth -= deltaX * this.rotationSensitivity;
      this.targetCameraPolar = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.1, this.targetCameraPolar + deltaY * this.rotationSensitivity)
      );
    }

    if (this.isPanning) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      const panSpeed = 0.1;
      this.targetPanOffset.x -= deltaX * panSpeed;
      this.targetPanOffset.y += deltaY * panSpeed;
    }

    this.previousMousePosition = { x: event.clientX, y: event.clientY };

    this.updateRaycaster(event);
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.targetCameraDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetCameraDistance * (1 + event.deltaY * zoomSpeed))
    );
  }

  private updateRaycaster(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const pointsMesh = this.timeSeriesPlot.getPointsMesh();
    if (pointsMesh) {
      const intersects = this.raycaster.intersectObject(pointsMesh);
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined) {
          this.timeSeriesPlot.setHoveredPoint(instanceId);
          const pointInfo = this.timeSeriesPlot.getPointInfo(instanceId);
          if (pointInfo) {
            this.showTooltip(event.clientX, event.clientY, pointInfo);
            return;
          }
        }
      } else {
        this.timeSeriesPlot.setHoveredPoint(-1);
      }
    }

    this.hideTooltip();
  }

  private showTooltip(
    clientX: number,
    clientY: number,
    pointInfo: { index: number; interval: number; metrics: PerPointMetrics }
  ): void {
    const tipIndex = document.getElementById('tipIndex')!;
    const tipInterval = document.getElementById('tipInterval')!;
    const tipSdnn = document.getElementById('tipSdnn')!;
    const tipRmssd = document.getElementById('tipRmssd')!;
    const tipPnn50 = document.getElementById('tipPnn50')!;

    tipIndex.textContent = `#${pointInfo.index + 1}`;
    tipInterval.textContent = `${pointInfo.interval.toFixed(1)} ms`;
    tipSdnn.textContent = `${pointInfo.metrics.sdnn.toFixed(2)} ms`;
    tipRmssd.textContent = `${pointInfo.metrics.rmssd.toFixed(2)} ms`;
    tipPnn50.textContent = `${pointInfo.metrics.pnn50.toFixed(2)} %`;

    this.tooltip.style.left = `${clientX + 15}px`;
    this.tooltip.style.top = `${clientY + 15}px`;
    this.tooltip.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  private updateCameraPosition(): void {
    const damping = 0.1;

    this.cameraAzimuth += (this.targetCameraAzimuth - this.cameraAzimuth) * damping;
    this.cameraPolar += (this.targetCameraPolar - this.cameraPolar) * damping;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * damping;
    this.panOffset.lerp(this.targetPanOffset, damping);

    const x = this.cameraDistance * Math.sin(this.cameraPolar) * Math.cos(this.cameraAzimuth);
    const y = this.cameraDistance * Math.cos(this.cameraPolar);
    const z = this.cameraDistance * Math.sin(this.cameraPolar) * Math.sin(this.cameraAzimuth);

    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3(-x, -y, -z).normalize();
    right.crossVectors(forward, up).normalize();

    const panOffset3D = new THREE.Vector3(
      this.panOffset.x * right.x,
      this.panOffset.y * up.y,
      this.panOffset.x * right.z
    );

    this.camera.position.set(x + panOffset3D.x, y + panOffset3D.y, z + panOffset3D.z);
    this.camera.lookAt(panOffset3D.x, 0, panOffset3D.z);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.updateCameraPosition();
    this.renderer.render(this.scene, this.camera);
  }

  public getFPS(): number {
    return this.fps;
  }
}

const app = new HRVVisualizerApp();
(window as any).app = app;
