import './styles.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DataLoader } from './DataLoader';
import { SceneManager } from './SceneManager';
import { InteractionManager } from './InteractionManager';
import { GUIControls } from './GUIControls';
import type { RockLayerData, OreBodyData } from './types';

class App {
  private canvas: HTMLCanvasElement;
  private dataLoader: DataLoader;
  private sceneManager: SceneManager;
  private controls: OrbitControls;
  private interaction: InteractionManager;
  private gui!: GUIControls;

  private tooltipEl: HTMLElement;
  private tooltipTitle: HTMLElement;
  private tooltipContent: HTMLElement;

  private infoPanel: HTMLElement;
  private infoPanelBody: HTMLElement;
  private closePanelBtn: HTMLElement;

  private modalOverlay: HTMLElement;
  private modalBody: HTMLElement;
  private closeModalBtn: HTMLElement;
  private modalCancelBtn: HTMLElement;
  private exportBtn: HTMLElement;

  private currentOreData: OreBodyData | null = null;
  private fpsCounter: HTMLElement | null = null;
  private frameTimes: number[] = [];
  private lastTime: number = performance.now();

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.tooltipEl = document.getElementById('tooltip') as HTMLElement;
    this.tooltipTitle = this.tooltipEl.querySelector('.tooltip-title') as HTMLElement;
    this.tooltipContent = this.tooltipEl.querySelector('.tooltip-content') as HTMLElement;

    this.infoPanel = document.getElementById('info-panel') as HTMLElement;
    this.infoPanelBody = this.infoPanel.querySelector('.panel-body') as HTMLElement;
    this.closePanelBtn = document.getElementById('close-panel') as HTMLElement;

    this.modalOverlay = document.getElementById('modal-overlay') as HTMLElement;
    this.modalBody = this.modalOverlay.querySelector('.modal-body') as HTMLElement;
    this.closeModalBtn = document.getElementById('close-modal') as HTMLElement;
    this.modalCancelBtn = document.getElementById('modal-cancel') as HTMLElement;
    this.exportBtn = document.getElementById('export-btn') as HTMLElement;

    this.dataLoader = new DataLoader();
    this.sceneManager = new SceneManager(this.canvas);

    this.controls = new OrbitControls(this.sceneManager.camera, this.canvas);
    this.controls.target.copy(this.sceneManager.initialCameraTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 1.1;
    this.controls.panSpeed = 0.9;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 900;
    this.controls.maxPolarAngle = Math.PI * 0.98;
    this.controls.minPolarAngle = 0.02;
    this.controls.update();

    this.interaction = new InteractionManager(this.sceneManager, this.canvas, {
      onHover: this.onHover.bind(this),
      onClick: this.onClick.bind(this),
      onOreDoubleClick: this.onOreDoubleClick.bind(this),
      onClipPlaneDrag: (y) => {
        this.gui?.setClipDepth(y);
      }
    });

    this.bindUIEvents();
    this.createFPSCounter();
    this.createHint();

    this.init();
  }

  private bindUIEvents(): void {
    this.closePanelBtn.addEventListener('click', () => {
      this.hideInfoPanel();
    });

    this.closeModalBtn.addEventListener('click', () => this.hideModal());
    this.modalCancelBtn.addEventListener('click', () => this.hideModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.hideModal();
    });
    this.exportBtn.addEventListener('click', () => this.exportOreData());
  }

  private createFPSCounter(): void {
    this.fpsCounter = document.createElement('div');
    this.fpsCounter.className = 'fps-counter';
    this.fpsCounter.innerHTML = '<span class="label">FPS</span><span class="value">--</span>';
    document.getElementById('app-container')!.appendChild(this.fpsCounter);
  }

  private createHint(): void {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.innerHTML = `
      <strong>操作提示</strong><br/>
      鼠标左键：旋转视角 ｜ 右键：平移 ｜ 滚轮：缩放<br/>
      悬停：查看属性 ｜ <strong>单击</strong>：详情面板 ｜ <strong>双击矿体</strong>：储量信息
    `;
    document.getElementById('app-container')!.appendChild(hint);
  }

  private async init(): Promise<void> {
    try {
      const data = await this.dataLoader.load();
      const layerMeshes = this.dataLoader.generateRockLayerMeshes();
      const oreMesh = this.dataLoader.generateOreBodyMesh();

      this.sceneManager.buildLayers(layerMeshes);
      this.sceneManager.buildOreBody(oreMesh);

      this.gui = new GUIControls(data.rockLayers, {
        onOpacityChange: (opacity) => this.sceneManager.setAllLayersOpacity(opacity),
        onLayerVisibility: (id, visible) => this.sceneManager.setLayerVisibility(id, visible),
        onResetCamera: () => this.sceneManager.resetCamera(this.controls),
        onToggleClipping: (enabled) => this.sceneManager.enableClipping(enabled),
        onClipPlaneChange: (y) => this.sceneManager.updateClipPlaneY(y)
      });

      this.startRenderLoop();
    } catch (err) {
      console.error('Failed to initialize application:', err);
    }
  }

  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = now - this.lastTime;
      this.lastTime = now;
      this.frameTimes.push(delta);
      if (this.frameTimes.length > 60) this.frameTimes.shift();
      this.updateFPS();

      this.controls.update();
      this.sceneManager.render();
    };
    animate();
  }

  private updateFPS(): void {
    if (!this.fpsCounter) return;
    if (this.frameTimes.length < 10) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = Math.round(1000 / avg);
    const val = this.fpsCounter.querySelector('.value') as HTMLElement;
    if (val) {
      val.textContent = String(fps);
      val.style.color = fps >= 45 ? '#00ff99' : fps >= 30 ? '#00e5ff' : '#ff8080';
    }
  }

  private onHover(data: RockLayerData | OreBodyData | null, event?: MouseEvent): void {
    if (!data || !event) {
      this.tooltipEl.classList.remove('visible');
      this.tooltipEl.classList.add('hidden');
      return;
    }

    const isOre = 'reserves' in data;
    this.tooltipTitle.textContent = isOre
      ? `✨ ${data.name}`
      : data.name;

    const content = `
      <div class="row">
        <span class="label">类型</span>
        <span class="value">${isOre ? data.type : data.type}</span>
      </div>
      <div class="row">
        <span class="label">深度范围</span>
        <span class="value">${data.depthRange.min}–${data.depthRange.max}m</span>
      </div>
      <div class="row">
        <span class="label">平均密度</span>
        <span class="value">${data.density.toFixed(2)} g/cm³</span>
      </div>
      <div class="minerals">
        <strong style="color:#6b7390;font-weight:500;">主要矿物：</strong>
        <span style="color:#00e5ff;">${data.minerals.join(' · ')}</span>
      </div>
    `;
    this.tooltipContent.innerHTML = content;

    const x = event.clientX + 18;
    const y = event.clientY + 18;
    const tw = this.tooltipEl.offsetWidth;
    const th = this.tooltipEl.offsetHeight;
    const maxX = window.innerWidth - tw - 16;
    const maxY = window.innerHeight - th - 16;

    this.tooltipEl.style.left = `${Math.min(x, maxX)}px`;
    this.tooltipEl.style.top = `${Math.min(y, maxY)}px`;
    this.tooltipEl.classList.remove('hidden');
    requestAnimationFrame(() => this.tooltipEl.classList.add('visible'));
  }

  private onClick(data: RockLayerData | OreBodyData): void {
    this.showInfoPanel(data);
  }

  private onOreDoubleClick(data: OreBodyData): void {
    this.sceneManager.flashOreBody();
    this.currentOreData = data;
    this.showModal(data);
  }

  private showInfoPanel(data: RockLayerData | OreBodyData): void {
    const isOre = 'reserves' in data;
    const typeClass = isOre ? 'ore' : '';

    const extraItems = isOre
      ? `
        <div class="info-item">
          <div class="info-item-label">估算储量</div>
          <div class="info-item-value">${(data as OreBodyData).reserves.toLocaleString()} t</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">平均品位</div>
          <div class="info-item-value">${(data as OreBodyData).grade.toFixed(1)} g/t</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">开采难度</div>
          <div class="info-item-value">${(data as OreBodyData).miningDifficulty}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">矿体形态</div>
          <div class="info-item-value">${(data as OreBodyData).form}</div>
        </div>
      `
      : `
        <div class="info-item">
          <div class="info-item-label">层厚</div>
          <div class="info-item-value">${(data as RockLayerData).thickness} m</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">孔隙度</div>
          <div class="info-item-value">${(data.porosity * 100).toFixed(1)}%</div>
        </div>
      `;

    const extraSection = isOre ? `
      <div class="info-section">
        <div class="info-section-title">开采信息</div>
        <div class="info-description" style="border-left-color:#ffd700;">
          <strong style="color:#ffd700;">提示：</strong>双击矿体可查看详细储量报告并支持数据导出。
        </div>
      </div>
    ` : '';

    this.infoPanelBody.innerHTML = `
      <div class="info-title">${isOre ? '✨ ' : ''}${data.name}</div>
      <div class="info-type ${typeClass}">${data.type}</div>

      <div class="info-section">
        <div class="info-section-title">基本属性</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-item-label">深度范围</div>
            <div class="info-item-value">${data.depthRange.min}–${data.depthRange.max} m</div>
          </div>
          <div class="info-item">
            <div class="info-item-label">平均密度</div>
            <div class="info-item-value">${data.density.toFixed(2)} g/cm³</div>
          </div>
          <div class="info-item">
            <div class="info-item-label">抗压强度</div>
            <div class="info-item-value">${data.compressiveStrength} MPa</div>
          </div>
          ${extraItems}
        </div>
      </div>

      <div class="info-section">
        <div class="info-section-title">矿物成分</div>
        <div class="minerals-list">
          ${data.minerals.map(m => `<span class="mineral-tag">${m}</span>`).join('')}
        </div>
      </div>

      <div class="info-section">
        <div class="info-section-title">地质描述</div>
        <div class="info-description">${data.description}</div>
      </div>

      ${extraSection}
    `;

    this.infoPanel.classList.add('active');
  }

  private hideInfoPanel(): void {
    this.infoPanel.classList.remove('active');
  }

  private showModal(data: OreBodyData): void {
    const difficultyMap: Record<string, number> = { '低': 1, '中等': 2, '高': 3, '极高': 4 };
    const diffLevel = difficultyMap[data.miningDifficulty] || 2;

    this.modalBody.innerHTML = `
      <div class="modal-stats">
        <div class="modal-stat">
          <div class="modal-stat-label">估算金属储量</div>
          <div class="modal-stat-value">
            ${(data.reserves * data.grade / 1000).toFixed(2)}
            <span class="modal-stat-unit">kg Au</span>
          </div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">矿石量</div>
          <div class="modal-stat-value">
            ${data.reserves.toLocaleString()}
            <span class="modal-stat-unit">t</span>
          </div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">平均品位</div>
          <div class="modal-stat-value">
            ${data.grade.toFixed(2)}
            <span class="modal-stat-unit">g/t</span>
          </div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-label">埋藏深度</div>
          <div class="modal-stat-value">
            ${data.depthRange.min}–${data.depthRange.max}
            <span class="modal-stat-unit">m</span>
          </div>
        </div>
      </div>

      <div class="info-section" style="margin-bottom: 14px;">
        <div class="info-section-title" style="color:#6b7390;font-size:12px;letter-spacing:0.8px;margin-bottom:10px;">
          开采难度评估
        </div>
        <div class="difficulty-badge">
          <span>开采难度：${data.miningDifficulty}</span>
          <span class="difficulty-dots">
            ${[1,2,3,4].map(i => `<span class="difficulty-dot ${i <= diffLevel ? 'active' : ''}"></span>`).join('')}
          </span>
        </div>
      </div>

      <div class="info-section">
        <div class="info-section-title" style="color:#6b7390;font-size:12px;letter-spacing:0.8px;margin-bottom:10px;">
          矿体控制坐标点 (数量: ${data.controlPoints.length})
        </div>
        <div style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #a4b0cc;
          background: rgba(0,0,0,0.25);
          padding: 10px 12px;
          border-radius: 8px;
          max-height: 120px;
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.05);
        ">
          ${data.controlPoints.map(p =>
            `<div style="padding:3px 0;border-bottom:1px dashed rgba(255,255,255,0.04);">
              X: <span style="color:#00e5ff;">${p.x.toFixed(1)}</span> &nbsp;
              Y: <span style="color:#00e5ff;">${p.y.toFixed(1)}</span> &nbsp;
              Z: <span style="color:#00e5ff;">${p.z.toFixed(1)}</span>
            </div>`
          ).join('')}
        </div>
      </div>
    `;

    this.modalOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      /* Trigger reflow for transition */
    });
  }

  private hideModal(): void {
    this.modalOverlay.classList.add('hidden');
  }

  private exportOreData(): void {
    if (!this.currentOreData) return;

    const exportData = {
      exportTime: new Date().toISOString(),
      oreBody: {
        id: this.currentOreData.id,
        name: this.currentOreData.name,
        type: this.currentOreData.type,
        form: this.currentOreData.form,
        center: this.currentOreData.center,
        dimensions: this.currentOreData.dimensions,
        rotation: this.currentOreData.rotation,
        depthRange: this.currentOreData.depthRange,
        density: this.currentOreData.density,
        reserves: this.currentOreData.reserves,
        reservesUnit: 'tons',
        grade: this.currentOreData.grade,
        gradeUnit: 'g/t',
        goldContentKg: +(this.currentOreData.reserves * this.currentOreData.grade / 1000).toFixed(2),
        miningDifficulty: this.currentOreData.miningDifficulty,
        porosity: this.currentOreData.porosity,
        compressiveStrength: this.currentOreData.compressiveStrength,
        minerals: this.currentOreData.minerals,
        description: this.currentOreData.description,
        controlPoints3D: this.currentOreData.controlPoints,
        color: this.currentOreData.color,
        materialProps: {
          metalness: this.currentOreData.metalness,
          roughness: this.currentOreData.roughness
        }
      },
      metadata: {
        coordinateSystem: 'Y-up (depth negative downward)',
        unit: 'meters',
        source: 'Geological 3D Visualizer'
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `orebody_${this.currentOreData.id}_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    this.exportBtn.textContent = '✓ 导出成功';
    this.exportBtn.style.background = 'linear-gradient(135deg, #00ff99, #00cc77)';
    setTimeout(() => {
      this.exportBtn.textContent = '导出数据';
      this.exportBtn.style.background = '';
    }, 2000);
  }

  public dispose(): void {
    this.interaction.dispose();
    this.gui?.destroy();
    this.sceneManager.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as unknown as { app?: App }).app = new App();
});
