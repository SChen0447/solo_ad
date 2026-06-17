import * as THREE from 'three';
import { parseCSVFile, recomputeWindowedFrequency, HRVData } from './dataParser';
import { TimeSeriesPlot } from './timeSeriesPlot';
import { FrequencyPlot, FrequencyBandState } from './frequencyPlot';

class HRVVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private timeSeriesPlot: TimeSeriesPlot;
  private frequencyPlot: FrequencyPlot;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;

  private cameraDistance: number = 25;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private panOffsetX: number = 0;
  private panOffsetY: number = 0;

  private targetTheta: number = Math.PI / 4;
  private targetPhi: number = Math.PI / 3;
  private targetDistance: number = 25;
  private targetPanX: number = 0;
  private targetPanY: number = 0;

  private rotationSpeed: number = 0.005;
  private zoomSpeed: number = 0.001;
  private panSpeed: number = 0.01;

  private minZoom: number = 0.5;
  private maxZoom: number = 3;
  private baseDistance: number = 25;

  private hrvData: HRVData | null = null;
  private currentMetric: 'SDNN' | 'RMSSD' | 'pNN50' = 'SDNN';
  private windowStep: number = 32;
  private bandState: FrequencyBandState = { vlf: true, lf: true, hf: true };

  private tooltip: HTMLElement;
  private fileInput: HTMLInputElement;
  private metricSelect: HTMLSelectElement;
  private dataContent: HTMLElement;

  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.metricSelect = document.getElementById('metricSelect') as HTMLSelectElement;
    this.dataContent = document.getElementById('dataContent')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.timeSeriesPlot = new TimeSeriesPlot(this.scene);
    this.frequencyPlot = new FrequencyPlot(this.scene);

    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00e5ff, 0.5, 50);
    pointLight1.position.set(-10, 5, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4ade80, 0.3, 50);
    pointLight2.position.set(10, 5, 5);
    this.scene.add(pointLight2);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta) + this.panOffsetX;
    const y = this.cameraDistance * Math.cos(this.cameraPhi) + this.panOffsetY;
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.panOffsetX, this.panOffsetY, 0);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this.onResize());

    this.fileInput.addEventListener('change', (e) => this.onFileChange(e));
    this.metricSelect.addEventListener('change', () => this.onMetricChange());

    const vlfToggle = document.getElementById('vlfToggle') as HTMLInputElement;
    const lfToggle = document.getElementById('lfToggle') as HTMLInputElement;
    const hfToggle = document.getElementById('hfToggle') as HTMLInputElement;

    vlfToggle.addEventListener('change', () => this.updateBands());
    lfToggle.addEventListener('change', () => this.updateBands());
    hfToggle.addEventListener('change', () => this.updateBands());

    const windowStepSlider = document.getElementById('windowStep') as HTMLInputElement;
    const stepValue = document.getElementById('stepValue')!;

    windowStepSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      stepValue.textContent = val.toString();
      this.windowStep = val;
      this.updateFrequencyPlot();
    });

    const resetBtn = document.getElementById('resetView')!;
    resetBtn.addEventListener('click', () => this.resetView());
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      this.targetTheta += deltaX * this.rotationSpeed;
      this.targetPhi -= deltaY * this.rotationSpeed;

      this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    }

    if (this.isPanning) {
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      const panFactor = this.cameraDistance * this.panSpeed;
      this.targetPanX -= deltaX * panFactor * 0.1;
      this.targetPanY += deltaY * panFactor * 0.1;

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    }

    this.checkHover(e);
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const zoomFactor = 1 + e.deltaY * this.zoomSpeed;
    const currentScale = this.cameraDistance / this.baseDistance;
    let newScale = currentScale * zoomFactor;

    newScale = Math.max(this.minZoom, Math.min(this.maxZoom, newScale));
    this.targetDistance = this.baseDistance * newScale;
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    parseCSVFile(file)
      .then((data) => {
        this.hrvData = data;
        this.updateTimeSeriesPlot();
        this.updateFrequencyPlot();
        this.updateDataPreview();
      })
      .catch((error) => {
        alert('数据解析失败: ' + error.message);
      });
  }

  private onMetricChange(): void {
    this.currentMetric = this.metricSelect.value as 'SDNN' | 'RMSSD' | 'pNN50';
    this.updateTimeSeriesPlot();
  }

  private updateBands(): void {
    const vlfToggle = document.getElementById('vlfToggle') as HTMLInputElement;
    const lfToggle = document.getElementById('lfToggle') as HTMLInputElement;
    const hfToggle = document.getElementById('hfToggle') as HTMLInputElement;

    this.bandState = {
      vlf: vlfToggle.checked,
      lf: lfToggle.checked,
      hf: hfToggle.checked
    };

    this.frequencyPlot.setBands(this.bandState);
  }

  private updateTimeSeriesPlot(): void {
    if (!this.hrvData) return;

    const metricValues = this.hrvData.rollingMetrics[this.currentMetric];
    this.timeSeriesPlot.updateData(this.hrvData.rrIntervals, metricValues);
  }

  private updateFrequencyPlot(): void {
    if (!this.hrvData) return;

    const windowedFreq = recomputeWindowedFrequency(this.hrvData.rrIntervals, this.windowStep);
    this.frequencyPlot.updateData(
      windowedFreq.vlf,
      windowedFreq.lf,
      windowedFreq.hf,
      windowedFreq.lfHfRatio,
      5
    );
    this.frequencyPlot.setBands(this.bandState);
  }

  private updateDataPreview(): void {
    if (!this.hrvData) return;

    const { rrIntervals, timeDomain, frequencyDomain } = this.hrvData;

    let html = '<div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">';
    html += '<div style="font-size:11px;color:#9090b0;margin-bottom:4px;">数据概览</div>';
    html += `<div style="font-family:monospace;font-size:12px;color:#a0a0c0;">总心跳数: <span style="color:#00e5ff;">${rrIntervals.length}</span></div>`;
    html += '</div>';

    html += '<div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);">';
    html += '<div style="font-size:11px;color:#9090b0;margin-bottom:6px;">时域指标</div>';
    html += `<div class="stats-row"><span class="stats-label">SDNN:</span><span class="stats-value">${timeDomain.SDNN.toFixed(2)} ms</span></div>`;
    html += `<div class="stats-row"><span class="stats-label">RMSSD:</span><span class="stats-value">${timeDomain.RMSSD.toFixed(2)} ms</span></div>`;
    html += `<div class="stats-row"><span class="stats-label">pNN50:</span><span class="stats-value">${timeDomain.pNN50.toFixed(2)}%</span></div>`;
    html += `<div class="stats-row"><span class="stats-label">平均RR:</span><span class="stats-value">${timeDomain.meanRR.toFixed(2)} ms</span></div>`;
    html += '</div>';

    html += '<div style="margin-bottom:10px;">';
    html += '<div style="font-size:11px;color:#9090b0;margin-bottom:6px;">频域指标</div>';
    html += `<div class="stats-row"><span class="stats-label">VLF:</span><span class="stats-value">${(frequencyDomain.vlfPower / 1000).toFixed(2)} ms²</span></div>`;
    html += `<div class="stats-row"><span class="stats-label">LF:</span><span class="stats-value">${(frequencyDomain.lfPower / 1000).toFixed(2)} ms²</span></div>`;
    html += `<div class="stats-row"><span class="stats-label">HF:</span><span class="stats-value">${(frequencyDomain.hfPower / 1000).toFixed(2)} ms²</span></div>`;
    html += `<div class="stats-row"><span class="stats-label">LF/HF:</span><span class="stats-value">${frequencyDomain.lfHfRatio.toFixed(3)}</span></div>`;
    html += '</div>';

    html += '<div>';
    html += '<div style="font-size:11px;color:#9090b0;margin-bottom:6px;">前10个RR间期</div>';
    html += '<div class="data-list">';
    for (let i = 0; i < Math.min(10, rrIntervals.length); i++) {
      html += `<div class="data-item"><span class="idx">#${i + 1}</span><span class="val">${rrIntervals[i].toFixed(1)} ms</span></div>`;
    }
    html += '</div>';
    html += '</div>';

    this.dataContent.innerHTML = html;
  }

  private checkHover(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const point = this.timeSeriesPlot.checkHover(mouseX, mouseY, this.camera);

    if (point) {
      this.showTooltip(e.clientX, e.clientY, point);
    } else {
      this.hideTooltip();
    }
  }

  private showTooltip(x: number, y: number, point: { index: number; rrInterval: number; metricValue: number }): void {
    const metricLabel = this.currentMetric;
    const metricUnit = this.currentMetric === 'pNN50' ? '%' : ' ms';

    this.tooltip.innerHTML = `
      <div class="tip-row"><span class="tip-label">心跳序号:</span><span class="tip-value">#${point.index + 1}</span></div>
      <div class="tip-row"><span class="tip-label">RR间期:</span><span class="tip-value">${point.rrInterval.toFixed(1)} ms</span></div>
      <div class="tip-row"><span class="tip-label">${metricLabel}:</span><span class="tip-value">${point.metricValue.toFixed(2)}${metricUnit}</span></div>
    `;

    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 15) + 'px';
    this.tooltip.style.top = (y + 15) + 'px';
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  private resetView(): void {
    this.targetTheta = Math.PI / 4;
    this.targetPhi = Math.PI / 3;
    this.targetDistance = this.baseDistance;
    this.targetPanX = 0;
    this.targetPanY = 0;
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const smoothFactor = 0.1;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * smoothFactor;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * smoothFactor;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * smoothFactor;
    this.panOffsetX += (this.targetPanX - this.panOffsetX) * smoothFactor;
    this.panOffsetY += (this.targetPanY - this.panOffsetY) * smoothFactor;

    this.updateCameraPosition();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.timeSeriesPlot.dispose();
    this.frequencyPlot.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new HRVVisualizer();
});
