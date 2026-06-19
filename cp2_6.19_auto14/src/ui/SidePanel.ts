import { CrossSectionResult, LayerSample } from '../data/GeologyInterfaces';

export interface SidePanelHandlers {
  onDepthChange: (depth: number) => void;
  onDepthInput: (depth: number) => void;
  onResetView: () => void;
}

const PANEL_CSS = `
.geology-side-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: rgba(22, 33, 62, 0.95);
  backdrop-filter: blur(10px);
  padding: 24px 20px;
  border-left: 1px solid rgba(74, 144, 217, 0.3);
  z-index: 90;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #E0E0E0;
}
.geology-side-panel h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: #4A90D9;
  letter-spacing: 1px;
}
.geology-side-panel .subtitle {
  font-size: 12px;
  color: #8892B0;
  margin-bottom: 28px;
}
.geology-side-panel .section {
  margin-bottom: 24px;
}
.geology-side-panel .section-label {
  font-size: 13px;
  color: #A0AEC0;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.geology-side-panel .depth-value {
  font-size: 14px;
  font-weight: 600;
  color: #4A90D9;
  background: rgba(74, 144, 217, 0.15);
  padding: 2px 10px;
  border-radius: 10px;
}
.geology-side-panel .depth-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, #2D3A5A, #4A90D9);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}
.geology-side-panel .depth-slider:hover {
  box-shadow: 0 0 10px rgba(74, 144, 217, 0.5);
}
.geology-side-panel .depth-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 3px solid #4A90D9;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.geology-side-panel .depth-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 12px rgba(74, 144, 217, 0.8);
  transform: scale(1.1);
}
.geology-side-panel .depth-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 3px solid #4A90D9;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.geology-side-panel .layer-info {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}
.geology-side-panel .layer-info::-webkit-scrollbar { width: 4px; }
.geology-side-panel .layer-info::-webkit-scrollbar-track { background: transparent; }
.geology-side-panel .layer-info::-webkit-scrollbar-thumb { background: #4A90D9; border-radius: 2px; }
.geology-side-panel .info-title {
  font-size: 12px;
  color: #8892B0;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(74, 144, 217, 0.2);
}
.geology-side-panel .layer-item {
  background: rgba(74, 144, 217, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}
.geology-side-panel .layer-item:hover {
  background: rgba(74, 144, 217, 0.15);
  border-left-color: #4A90D9;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}
.geology-side-panel .layer-item .row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.geology-side-panel .layer-item .name {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.geology-side-panel .color-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: inline-block;
}
.geology-side-panel .layer-item .thickness {
  font-size: 12px;
  color: #4A90D9;
  font-weight: 600;
}
.geology-side-panel .layer-item .hex {
  font-size: 11px;
  color: #A0AEC0;
  font-family: 'Courier New', monospace;
}
.geology-side-panel .empty-hint {
  font-size: 12px;
  color: #666;
  padding: 10px 0;
}
.geology-side-panel .depth-header {
  font-size: 12px;
  color: #4A90D9;
  font-weight: 500;
  margin-bottom: 10px;
}
`;

const RESET_BTN_CSS = `
.geology-reset-btn {
  position: absolute;
  top: 24px;
  left: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #4A90D9;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
  z-index: 100;
  padding: 0;
}
.geology-reset-btn:hover {
  box-shadow: 0 4px 16px rgba(74, 144, 217, 0.7);
  transform: scale(1.05);
}
.geology-reset-btn svg {
  width: 20px;
  height: 20px;
  fill: white;
}
`;

const POPUP_CSS = `
.geology-popup-card {
  position: absolute;
  background: rgba(22, 33, 62, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(74, 144, 217, 0.4);
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 240px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: none;
  pointer-events: auto;
  transition: box-shadow 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #E0E0E0;
  box-sizing: border-box;
}
.geology-popup-card:hover {
  box-shadow: 0 8px 32px rgba(74, 144, 217, 0.4);
}
.geology-popup-card .popup-title {
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(74, 144, 217, 0.3);
}
.geology-popup-card .popup-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 13px;
}
.geology-popup-card .popup-label { color: #8892B0; }
.geology-popup-card .popup-value { color: #E0E0E0; font-weight: 500; }
.geology-popup-close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #8892B0;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s ease;
  padding: 0;
}
.geology-popup-close:hover {
  color: #FF6B6B;
  background: rgba(255, 107, 107, 0.1);
}
`;

const INSTRUCTIONS_CSS = `
.geology-instructions {
  position: absolute;
  bottom: 20px;
  left: 24px;
  background: rgba(22, 33, 62, 0.9);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 12px;
  color: #8892B0;
  border: 1px solid rgba(74, 144, 217, 0.2);
  z-index: 90;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.geology-instructions span { color: #4A90D9; font-weight: 500; }
`;

export class SidePanel {
  private container: HTMLElement;
  private handlers: SidePanelHandlers;
  private panelEl: HTMLElement | null = null;
  private sliderEl: HTMLInputElement | null = null;
  private depthDisplayEl: HTMLElement | null = null;
  private layerListEl: HTMLElement | null = null;
  private resetBtnEl: HTMLButtonElement | null = null;
  private popupEl: HTMLElement | null = null;
  private maxDepth = 0;
  private styleEl: HTMLStyleElement | null = null;

  constructor(container: HTMLElement, handlers: SidePanelHandlers) {
    this.container = container;
    this.handlers = handlers;
    this.injectStyles();
    this.createResetButton();
    this.createPanel();
    this.createPopup();
    this.createInstructions();
  }

  private injectStyles(): void {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent =
      PANEL_CSS + RESET_BTN_CSS + POPUP_CSS + INSTRUCTIONS_CSS;
    document.head.appendChild(this.styleEl);
  }

  private createResetButton(): void {
    const btn = document.createElement('button');
    btn.className = 'geology-reset-btn';
    btn.title = '复位视角';
    btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`;
    btn.addEventListener('click', () => this.handlers.onResetView());
    this.container.appendChild(btn);
    this.resetBtnEl = btn;
  }

  private createPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'geology-side-panel';

    panel.innerHTML = `
      <h2>地质断层可视化</h2>
      <div class="subtitle">GEOLOGICAL FAULT VISUALIZER</div>
      <div class="section">
        <div class="section-label">
          <span>深度截面查询</span>
          <span class="depth-value"><span class="depth-display">0</span> m</span>
        </div>
        <input type="range" class="depth-slider" min="0" max="0" step="1" value="0" />
      </div>
      <div class="section layer-info">
        <div class="info-title">深度岩层构成</div>
        <div class="layer-list">
          <div class="empty-hint">拖动滑块查询深度截面</div>
        </div>
      </div>
    `;

    this.container.appendChild(panel);
    this.panelEl = panel;

    this.sliderEl = panel.querySelector('.depth-slider') as HTMLInputElement;
    this.depthDisplayEl = panel.querySelector('.depth-display') as HTMLElement;
    this.layerListEl = panel.querySelector('.layer-list') as HTMLElement;

    this.sliderEl.addEventListener('input', () => {
      const val = parseFloat(this.sliderEl!.value);
      this.updateDepthDisplay(val);
      this.handlers.onDepthInput(val);
    });

    this.sliderEl.addEventListener('change', () => {
      const val = parseFloat(this.sliderEl!.value);
      this.updateDepthDisplay(val);
      this.handlers.onDepthChange(val);
    });
  }

  private createPopup(): void {
    const popup = document.createElement('div');
    popup.className = 'geology-popup-card';
    popup.innerHTML = `
      <button class="geology-popup-close">&times;</button>
      <div class="popup-title">
        <span class="color-dot"></span>
        <span class="popup-name">岩层名称</span>
      </div>
      <div class="popup-row"><span class="popup-label">深度范围</span><span class="popup-depth">-</span></div>
      <div class="popup-row"><span class="popup-label">密&emsp;&emsp;度</span><span class="popup-density">-</span></div>
      <div class="popup-row"><span class="popup-label">估算年代</span><span class="popup-era">-</span></div>
    `;
    this.container.appendChild(popup);
    this.popupEl = popup;

    const closeBtn = popup.querySelector('.geology-popup-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.hidePopup());
  }

  private createInstructions(): void {
    const div = document.createElement('div');
    div.className = 'geology-instructions';
    div.innerHTML = `<span>左键拖拽</span> 旋转 &nbsp;|&nbsp; <span>滚轮</span> 缩放 &nbsp;|&nbsp; <span>点击岩层</span> 查看详情`;
    this.container.appendChild(div);
  }

  setMaxDepth(maxDepth: number): void {
    this.maxDepth = maxDepth;
    if (this.sliderEl) {
      this.sliderEl.max = String(maxDepth);
    }
  }

  setInitialDepth(depth: number): void {
    if (this.sliderEl) {
      this.sliderEl.value = String(Math.round(depth));
    }
    this.updateDepthDisplay(depth);
  }

  private updateDepthDisplay(depth: number): void {
    if (this.depthDisplayEl) {
      this.depthDisplayEl.textContent = String(Math.round(depth));
    }
  }

  updateLayerList(result: CrossSectionResult): void {
    if (!this.layerListEl) return;

    if (result.samples.length === 0) {
      this.layerListEl.innerHTML = `<div class="empty-hint">该深度暂无岩层数据</div>`;
      return;
    }

    const sorted: LayerSample[] = [...result.samples].sort((a, b) => b.thickness - a.thickness);
    const d = Math.round(result.depth);
    const header = `<div class="depth-header">深度 ${d}m &middot; 共 ${sorted.length} 个岩层</div>`;
    const items = sorted
      .map(
        s => `
      <div class="layer-item">
        <div class="row1">
          <span class="name">
            <span class="color-dot" style="background:${s.color}"></span>
            ${s.name}
          </span>
          <span class="thickness">${s.thickness}m</span>
        </div>
        <div class="hex">${s.color.toUpperCase()}</div>
      </div>
    `
      )
      .join('');
    this.layerListEl.innerHTML = header + items;
  }

  showPopup(
    name: string,
    color: string,
    depthRange: string,
    density: string,
    era: string,
    screenPos: { x: number; y: number }
  ): void {
    if (!this.popupEl) return;

    const popup = this.popupEl;
    popup.querySelector('.popup-name')!.textContent = name;
    (popup.querySelector('.color-dot') as HTMLElement).style.background = color;
    popup.querySelector('.popup-depth')!.textContent = depthRange;
    popup.querySelector('.popup-density')!.textContent = density;
    popup.querySelector('.popup-era')!.textContent = era;

    popup.style.display = 'block';

    const cardW = popup.offsetWidth || 260;
    const cardH = popup.offsetHeight || 180;
    const padding = 16;
    const panelWidth = 300;
    const maxX = window.innerWidth - cardW - padding - panelWidth;
    const maxY = window.innerHeight - cardH - padding;

    let x = screenPos.x + 18;
    let y = screenPos.y - 20;
    if (x > maxX) x = Math.max(padding, screenPos.x - cardW - 18);
    if (y > maxY) y = maxY;
    if (y < padding) y = padding;
    if (x < padding) x = padding;

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
  }

  hidePopup(): void {
    if (this.popupEl) {
      this.popupEl.style.display = 'none';
    }
  }

  isPopupVisible(): boolean {
    return this.popupEl ? this.popupEl.style.display !== 'none' : false;
  }

  isClickInsidePopup(target: HTMLElement): boolean {
    return this.popupEl ? this.popupEl.contains(target) : false;
  }

  dispose(): void {
    if (this.styleEl && this.styleEl.parentNode) {
      this.styleEl.parentNode.removeChild(this.styleEl);
    }
    [this.panelEl, this.resetBtnEl, this.popupEl].forEach(el => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    const instr = this.container.querySelector('.geology-instructions');
    if (instr && instr.parentNode) instr.parentNode.removeChild(instr);
  }
}
