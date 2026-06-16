import * as THREE from 'three';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from 'chart.js';
import type { AnimationController, AnimationStatus } from './animationController';
import type { BackendClient, FoldResponse, SequenceInfo } from './backend';
import type { FrameData } from './sceneManager';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface UICallbacks {
  onStartFold: (sequenceId: number) => Promise<void>;
}

const SEQUENCE_OPTIONS: SequenceInfo[] = [
  { id: 0, name: '纯α-螺旋（丙氨酸）', type: 'alpha', length: 15 },
  { id: 1, name: 'β-折叠（缬氨酸-丝氨酸交替）', type: 'beta', length: 16 },
  { id: 2, name: '随机卷曲（甘氨酸-脯氨酸）', type: 'coil', length: 16 },
];

export class UIManager {
  private container: HTMLElement;
  private backend: BackendClient;
  private animCtrl: AnimationController;
  private callbacks: UICallbacks;

  private seqSelect: HTMLSelectElement | null = null;
  private startBtn: HTMLButtonElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private speedLabel: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;
  private progressContainer: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private seqInfoEl: HTMLElement | null = null;

  private loadingScene: THREE.Scene | null = null;
  private loadingCamera: THREE.PerspectiveCamera | null = null;
  private loadingRenderer: THREE.WebGLRenderer | null = null;
  private loadingAnimId: number | null = null;
  private dnaGroup: THREE.Group | null = null;

  private phiChart: Chart | null = null;
  private psiChart: Chart | null = null;

  private phiDataHistory: { x: number; y: number }[][] = [];
  private psiDataHistory: { x: number; y: number }[][] = [];
  private maxHistoryPoints = 100;
  private lastChartUpdate = 0;
  private chartUpdateInterval = 80;

  private foldData: FoldResponse | null = null;

  private chartContainer: HTMLElement | null = null;
  private isDraggingChart = false;
  private chartDragOffset = { x: 0, y: 0 };

  constructor(
    containerId: string,
    backend: BackendClient,
    animCtrl: AnimationController,
    callbacks: UICallbacks
  ) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;
    this.backend = backend;
    this.animCtrl = animCtrl;
    this.callbacks = callbacks;

    this.init();
  }

  private init(): void {
    this.buildControlPanel();
    this.initLoadingAnimation();
    this.initCharts();
    this.setupAnimationListeners();
    this.setupChartDrag();
  }

  private buildControlPanel(): void {
    this.container.innerHTML = '';
    this.container.className = 'control-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = '🧬 蛋白质折叠控制';
    this.container.appendChild(title);

    const seqGroup = this.createSection('氨基酸序列选择');
    this.seqSelect = document.createElement('select');
    this.seqSelect.className = 'control-select';
    this.addTooltip(this.seqSelect, '选择一种预设的氨基酸序列类型');
    SEQUENCE_OPTIONS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = String(s.id);
      opt.textContent = s.name;
      this.seqSelect!.appendChild(opt);
    });
    this.seqSelect.addEventListener('change', () => this.updateSeqInfo());
    seqGroup.appendChild(this.seqSelect);

    this.seqInfoEl = document.createElement('div');
    this.seqInfoEl.className = 'seq-info';
    seqGroup.appendChild(this.seqInfoEl);
    this.updateSeqInfo();
    this.container.appendChild(seqGroup);

    const startGroup = this.createSection('模拟启动');
    this.startBtn = document.createElement('button');
    this.startBtn.className = 'btn btn-primary btn-full';
    this.startBtn.innerHTML = '🔬 模拟折叠';
    this.addTooltip(this.startBtn, '生成分子坐标并开始折叠动画');
    this.startBtn.addEventListener('click', () => this.onStartFoldClick());
    startGroup.appendChild(this.startBtn);
    this.container.appendChild(startGroup);

    const ctrlGroup = this.createSection('动画控制');

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn btn-secondary';
    this.playBtn.innerHTML = '▶ 播放';
    this.playBtn.disabled = true;
    this.addTooltip(this.playBtn, '播放或暂停折叠动画');
    this.playBtn.addEventListener('click', () => this.animCtrl.togglePlay());
    btnRow.appendChild(this.playBtn);

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'btn btn-secondary';
    this.resetBtn.innerHTML = '↺ 重置';
    this.resetBtn.disabled = true;
    this.addTooltip(this.resetBtn, '重置到初始线性肽链状态');
    this.resetBtn.addEventListener('click', () => this.onResetClick());
    btnRow.appendChild(this.resetBtn);

    ctrlGroup.appendChild(btnRow);

    const speedLabelRow = document.createElement('div');
    speedLabelRow.className = 'label-row';
    const speedText = document.createElement('span');
    speedText.textContent = '播放速度';
    this.speedLabel = document.createElement('span');
    this.speedLabel.className = 'speed-value';
    this.speedLabel.textContent = '1.0x';
    speedLabelRow.appendChild(speedText);
    speedLabelRow.appendChild(this.speedLabel);
    ctrlGroup.appendChild(speedLabelRow);

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '0.1';
    this.speedSlider.max = '5.0';
    this.speedSlider.step = '0.1';
    this.speedSlider.value = '1.0';
    this.speedSlider.className = 'control-slider';
    this.addTooltip(this.speedSlider, '调整动画播放速度（0.1x - 5x）');
    this.speedSlider.disabled = true;
    this.speedSlider.addEventListener('input', () => {
      const val = parseFloat(this.speedSlider!.value);
      this.speedLabel!.textContent = val.toFixed(1) + 'x';
      this.animCtrl.setSpeed(val);
    });
    ctrlGroup.appendChild(this.speedSlider);

    this.container.appendChild(ctrlGroup);

    const progGroup = this.createSection('折叠进度');
    this.progressContainer = document.createElement('div');
    this.progressContainer.className = 'progress-outer';
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'progress-bar-inner';
    this.progressBar.style.width = '0%';
    this.progressText = document.createElement('div');
    this.progressText.className = 'progress-text-inline';
    this.progressText.textContent = '0%';
    this.progressContainer.appendChild(this.progressBar);
    this.progressContainer.appendChild(this.progressText);
    progGroup.appendChild(this.progressContainer);
    this.container.appendChild(progGroup);

    const legendGroup = this.createSection('颜色图例');
    const legend = document.createElement('div');
    legend.className = 'legend-grid';
    const items: [string, string][] = [
      ['#2255ff', 'N端（蓝色）'],
      ['#ff3344', 'C端（红色）'],
      ['#ffffff', '非极性侧链'],
      ['#33cc44', '极性侧链'],
      ['#ff3333', '酸性侧链'],
      ['#3355ff', '碱性侧链'],
    ];
    items.forEach(([color, label]) => {
      const row = document.createElement('div');
      row.className = 'legend-row';
      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.backgroundColor = color;
      const text = document.createElement('span');
      text.className = 'legend-label';
      text.textContent = label;
      row.appendChild(dot);
      row.appendChild(text);
      legend.appendChild(row);
    });
    legendGroup.appendChild(legend);
    this.container.appendChild(legendGroup);
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'panel-section';
    const h = document.createElement('div');
    h.className = 'section-title';
    h.textContent = title;
    section.appendChild(h);
    return section;
  }

  private addTooltip(el: HTMLElement, text: string): void {
    el.dataset.tooltip = text;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let tipEl: HTMLDivElement | null = null;

    const show = () => {
      timeoutId = setTimeout(() => {
        tipEl = document.createElement('div');
        tipEl.className = 'tooltip-bubble';
        tipEl.textContent = text;
        document.body.appendChild(tipEl);
        const rect = el.getBoundingClientRect();
        tipEl.style.left = `${rect.left + rect.width / 2}px`;
        tipEl.style.top = `${rect.bottom + 10}px`;
        requestAnimationFrame(() => { if (tipEl) tipEl.classList.add('visible'); });
      }, 200);
    };
    const hide = () => {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (tipEl) {
        tipEl.classList.remove('visible');
        setTimeout(() => { tipEl?.remove(); tipEl = null; }, 200);
      }
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('blur', hide);
  }

  private updateSeqInfo(): void {
    if (!this.seqSelect || !this.seqInfoEl) return;
    const id = parseInt(this.seqSelect.value);
    const seq = SEQUENCE_OPTIONS[id];
    const typeLabels: Record<string, string> = {
      alpha: '🌊 α-螺旋', beta: '🧩 β-折叠', coil: '〰️ 随机卷曲',
    };
    this.seqInfoEl.innerHTML = `
      <div><span class="info-label">结构类型:</span> ${typeLabels[seq.type] || seq.type}</div>
      <div><span class="info-label">残基数量:</span> ${seq.length} 个</div>
    `;
  }

  private async onStartFoldClick(): Promise<void> {
    if (!this.seqSelect || !this.startBtn) return;
    const id = parseInt(this.seqSelect.value);
    this.startBtn.disabled = true;
    this.showLoading(true);
    try {
      await this.callbacks.onStartFold(id);
      this.enableControls(true);
    } catch (e) {
      console.error(e);
      alert('折叠模拟启动失败：' + (e as Error).message);
    } finally {
      this.showLoading(false);
      this.startBtn.disabled = false;
    }
  }

  private onResetClick(): void {
    this.animCtrl.reset();
    this.resetChartHistory();
  }

  setFoldData(data: FoldResponse): void {
    this.foldData = data;
    this.initChartsForSequence(data);
    this.resetChartHistory();
  }

  private enableControls(enabled: boolean): void {
    if (this.playBtn) this.playBtn.disabled = !enabled;
    if (this.resetBtn) this.resetBtn.disabled = !enabled;
    if (this.speedSlider) this.speedSlider.disabled = !enabled;
  }

  showLoading(show: boolean): void {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    if (show) {
      overlay.classList.remove('hidden');
      this.startLoadingAnim();
    } else {
      overlay.classList.add('hidden');
      this.stopLoadingAnim();
    }
  }

  private initLoadingAnimation(): void {
    const el = document.getElementById('loading-scene');
    if (!el) return;

    this.loadingScene = new THREE.Scene();
    this.loadingCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.loadingCamera.position.set(0, 0, 18);

    this.loadingRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.loadingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.loadingRenderer.setSize(180, 180);
    el.appendChild(this.loadingRenderer.domElement);

    this.dnaGroup = new THREE.Group();
    this.loadingScene.add(this.dnaGroup);

    const helixLen = 10;
    const helixR = 2.5;
    const basePairs = 16;

    const strandMat1 = new THREE.MeshPhongMaterial({
      color: 0x0db2ff,
      shininess: 100,
      emissive: 0x003355,
    });
    const strandMat2 = new THREE.MeshPhongMaterial({
      color: 0x9933ff,
      shininess: 100,
      emissive: 0x330055,
    });

    for (let i = 0; i < basePairs; i++) {
      const t = i / (basePairs - 1);
      const y = (t - 0.5) * helixLen * 2;
      const angle = t * Math.PI * 5;

      const x1 = Math.cos(angle) * helixR;
      const z1 = Math.sin(angle) * helixR;
      const x2 = Math.cos(angle + Math.PI) * helixR;
      const z2 = Math.sin(angle + Math.PI) * helixR;

      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), strandMat1);
      s1.position.set(x1, y, z1);
      this.dnaGroup.add(s1);

      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), strandMat2);
      s2.position.set(x2, y, z2);
      this.dnaGroup.add(s2);

      const pairColor = new THREE.Color().lerpColors(
        new THREE.Color(0x0db2ff),
        new THREE.Color(0x9933ff),
        0.5 + Math.sin(t * Math.PI * 2) * 0.5
      );
      const pairMat = new THREE.MeshPhongMaterial({ color: pairColor, shininess: 60, transparent: true, opacity: 0.7 });
      const from = new THREE.Vector3(x1, y, z1);
      const to = new THREE.Vector3(x2, y, z2);
      const len = from.distanceTo(to);
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 8), pairMat);
      this.alignCyl(rung, from, to);
      this.dnaGroup.add(rung);
    }

    for (let strand = 0; strand < 2; strand++) {
      const mat = strand === 0 ? strandMat1 : strandMat2;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < basePairs * 4; i++) {
        const t = i / (basePairs * 4 - 1);
        const y = (t - 0.5) * helixLen * 2;
        const angle = t * Math.PI * 5 + strand * Math.PI;
        points.push(new THREE.Vector3(
          Math.cos(angle) * helixR, y, Math.sin(angle) * helixR
        ));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);
      const tube = new THREE.Mesh(tubeGeo, mat);
      this.dnaGroup.add(tube);
    }

    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    this.loadingScene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 10);
    this.loadingScene.add(dir);
  }

  private alignCyl(cyl: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.001) return;
    cyl.position.copy(from).add(to).multiplyScalar(0.5);
    const up = new THREE.Vector3(0, 1, 0);
    const dirN = dir.clone().normalize();
    if (Math.abs(up.dot(dirN)) > 0.9999) {
      if (up.dot(dirN) < 0) cyl.rotation.x = Math.PI;
      return;
    }
    const axis = new THREE.Vector3().crossVectors(up, dirN).normalize();
    const angle = Math.acos(up.dot(dirN));
    cyl.quaternion.setFromAxisAngle(axis, angle);
  }

  private startLoadingAnim(): void {
    if (!this.loadingRenderer || !this.loadingScene || !this.loadingCamera || !this.dnaGroup) return;
    const period = 1500;
    const start = performance.now();
    const step = () => {
      const now = performance.now();
      const t = ((now - start) % period) / period;
      if (this.dnaGroup) {
        this.dnaGroup.rotation.y = t * Math.PI * 2;
        this.dnaGroup.rotation.x = Math.sin(now / 800) * 0.2;
      }
      this.loadingRenderer!.render(this.loadingScene!, this.loadingCamera!);
      this.loadingAnimId = requestAnimationFrame(step);
    };
    step();
  }

  private stopLoadingAnim(): void {
    if (this.loadingAnimId) {
      cancelAnimationFrame(this.loadingAnimId);
      this.loadingAnimId = null;
    }
  }

  private setupAnimationListeners(): void {
    this.animCtrl.onStateChange(state => this.updateAnimUI(state));
    this.animCtrl.onFrame(frame => this.onFrameUpdate(frame));
  }

  private updateAnimUI(state: { status: AnimationStatus; progress: number; speed: number }): void {
    if (this.playBtn) {
      if (state.status === 'playing') {
        this.playBtn.innerHTML = '⏸ 暂停';
      } else if (state.status === 'paused') {
        this.playBtn.innerHTML = '▶ 播放';
      } else if (state.status === 'finished') {
        this.playBtn.innerHTML = '↻ 重播';
      } else {
        this.playBtn.innerHTML = '▶ 播放';
      }
    }
    if (this.progressBar) this.progressBar.style.width = `${state.progress * 100}%`;
    if (this.progressText) this.progressText.textContent = `${(state.progress * 100).toFixed(1)}%`;
  }

  private onFrameUpdate(frame: FrameData): void {
    const now = performance.now();
    if (now - this.lastChartUpdate < this.chartUpdateInterval) return;
    this.lastChartUpdate = now;
    this.pushChartData(frame);
  }

  private initCharts(): void {
    this.chartContainer = document.getElementById('chart-container');
    if (!this.chartContainer) return;

    this.chartContainer.innerHTML = `
      <div class="chart-window" id="chart-window">
        <div class="chart-header">
          <div class="chart-title">📊 二面角实时变化 (Phi / Psi)</div>
          <div class="chart-hint">横轴：折叠进度 (%) &nbsp; 纵轴：角度 (-180° ~ 180°)</div>
        </div>
        <div class="chart-body">
          <div class="chart-box">
            <div class="chart-subtitle">Phi (φ) 角</div>
            <canvas id="phi-chart"></canvas>
          </div>
          <div class="chart-box">
            <div class="chart-subtitle">Psi (ψ) 角</div>
            <canvas id="psi-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    this.phiChart = this.createChart('phi-chart', 'φ角', '#0db2ff');
    this.psiChart = this.createChart('psi-chart', 'ψ角', '#ff6b9d');
  }

  private createChart(canvasId: string, label: string, color: string): Chart | null {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cfg: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        normalized: true,
        interaction: {
          mode: 'nearest',
          axis: 'xy',
          intersect: false,
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: 100,
            title: { display: true, text: '折叠进度 (%)', color: 'rgba(255,255,255,0.6)' },
            ticks: { color: 'rgba(255,255,255,0.5)', backdropColor: 'transparent' },
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
          y: {
            type: 'linear',
            min: -180,
            max: 180,
            title: { display: true, text: '角度 (°)', color: 'rgba(255,255,255,0.6)' },
            ticks: {
              color: 'rgba(255,255,255,0.5)',
              backdropColor: 'transparent',
              stepSize: 60,
            },
            grid: { color: 'rgba(255,255,255,0.08)' },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.5)',
              boxWidth: 12,
              padding: 8,
              font: { size: 10 },
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(255,255,255,0.95)',
            titleColor: '#000',
            bodyColor: '#000',
            borderColor: '#0db2ff',
            borderWidth: 1,
            cornerRadius: 4,
            padding: 8,
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const p = items[0].parsed?.x;
                return p != null ? `进度: ${p.toFixed(1)}%` : '';
              },
              label: (item) => {
                const ds = item.dataset;
                const y = item.parsed?.y;
                return `${ds.label || ''}: ${y != null ? y.toFixed(1) : '?'}°`;
              },
            },
          },
        },
        elements: {
          point: { radius: 0, hoverRadius: 4 },
          line: { borderWidth: 1.5, tension: 0.25 },
        },
      },
    };

    return new Chart(ctx, cfg);
  }

  private initChartsForSequence(data: FoldResponse): void {
    const n = data.n_residues;
    this.phiDataHistory = [];
    this.psiDataHistory = [];
    for (let i = 0; i < n; i++) {
      this.phiDataHistory.push([]);
      this.psiDataHistory.push([]);
    }

    const phiDatasets = [];
    const psiDatasets = [];
    for (let i = 0; i < n; i++) {
      const hue = (i * 360 / n) % 360;
      phiDatasets.push({
        label: `残基 ${i + 1}`,
        data: [],
        borderColor: `hsla(${hue}, 80%, 60%, 0.85)`,
        backgroundColor: `hsla(${hue}, 80%, 60%, 0.1)`,
      });
      psiDatasets.push({
        label: `残基 ${i + 1}`,
        data: [],
        borderColor: `hsla(${(hue + 180) % 360}, 80%, 60%, 0.85)`,
        backgroundColor: `hsla(${(hue + 180) % 360}, 80%, 60%, 0.1)`,
      });
    }

    if (this.phiChart) {
      this.phiChart.data.datasets = phiDatasets;
      this.phiChart.update('none');
    }
    if (this.psiChart) {
      this.psiChart.data.datasets = psiDatasets;
      this.psiChart.update('none');
    }
  }

  private pushChartData(frame: FrameData): void {
    const pct = frame.progress * 100;
    const n = frame.phis.length;
    for (let i = 0; i < n; i++) {
      this.phiDataHistory[i].push({ x: pct, y: frame.phis[i] });
      this.psiDataHistory[i].push({ x: pct, y: frame.psis[i] });
      if (this.phiDataHistory[i].length > this.maxHistoryPoints) {
        this.phiDataHistory[i].shift();
      }
      if (this.psiDataHistory[i].length > this.maxHistoryPoints) {
        this.psiDataHistory[i].shift();
      }
    }

    if (this.phiChart) {
      for (let i = 0; i < n; i++) {
        (this.phiChart.data.datasets[i] as any).data = this.phiDataHistory[i];
      }
      this.phiChart.update('none');
    }
    if (this.psiChart) {
      for (let i = 0; i < n; i++) {
        (this.psiChart.data.datasets[i] as any).data = this.psiDataHistory[i];
      }
      this.psiChart.update('none');
    }
  }

  private resetChartHistory(): void {
    const n = this.phiDataHistory.length;
    for (let i = 0; i < n; i++) {
      this.phiDataHistory[i] = [];
      this.psiDataHistory[i] = [];
      if (this.phiChart && this.phiChart.data.datasets[i]) {
        (this.phiChart.data.datasets[i] as any).data = [];
      }
      if (this.psiChart && this.psiChart.data.datasets[i]) {
        (this.psiChart.data.datasets[i] as any).data = [];
      }
    }
    this.phiChart?.update('none');
    this.psiChart?.update('none');
  }

  private setupChartDrag(): void {
    if (window.innerWidth >= 768) return;
    const win = document.getElementById('chart-window');
    if (!win) return;
    const header = win.querySelector('.chart-header') as HTMLElement;
    if (!header) return;
    header.style.cursor = 'grab';

    header.addEventListener('pointerdown', (e) => {
      this.isDraggingChart = true;
      win.classList.add('dragging');
      const rect = win.getBoundingClientRect();
      this.chartDragOffset.x = (e as PointerEvent).clientX - rect.left;
      this.chartDragOffset.y = (e as PointerEvent).clientY - rect.top;
      header.style.cursor = 'grabbing';
      header.setPointerCapture((e as PointerEvent).pointerId);
    });

    header.addEventListener('pointermove', (e) => {
      if (!this.isDraggingChart) return;
      const x = (e as PointerEvent).clientX - this.chartDragOffset.x;
      const y = (e as PointerEvent).clientY - this.chartDragOffset.y;
      win.style.left = `${Math.max(0, x)}px`;
      win.style.top = `${Math.max(0, y)}px`;
    });

    const endDrag = (e: PointerEvent) => {
      this.isDraggingChart = false;
      win.classList.remove('dragging');
      header.style.cursor = 'grab';
      try { header.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);
  }

  dispose(): void {
    this.stopLoadingAnim();
    this.phiChart?.destroy();
    this.psiChart?.destroy();
    this.enableControls(false);
  }
}
