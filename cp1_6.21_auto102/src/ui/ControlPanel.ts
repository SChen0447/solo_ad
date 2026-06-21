import { MATERIALS, MaterialKey } from '../modules/BuildingModule';
import { SunlightParams } from '../core/ShadowSystem';

export interface ControlPanelCallbacks {
  onSunAzimuthChange: (value: number) => void;
  onSunAltitudeChange: (value: number) => void;
  onStartPlacing: () => void;
  onCancelPlacing: () => void;
  onSizeChange: (width: number, depth: number, height: number) => void;
  onMaterialChange: (key: MaterialKey) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onSaveScheme: () => void;
  onToggleDrawer: () => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlPanelCallbacks;

  private bottomToolbar!: HTMLElement;
  private drawer!: HTMLElement;
  private drawerToggle!: HTMLElement;
  private rightPanel!: HTMLElement;
  private schemeCardsContainer!: HTMLElement;

  private azimuthSlider!: HTMLInputElement;
  private altitudeSlider!: HTMLInputElement;
  private azimuthValueEl!: HTMLElement;
  private altitudeValueEl!: HTMLElement;

  private widthSlider!: HTMLInputElement;
  private depthSlider!: HTMLInputElement;
  private heightSlider!: HTMLInputElement;
  private widthValueEl!: HTMLElement;
  private depthValueEl!: HTMLElement;
  private heightValueEl!: HTMLElement;

  private placeBtn!: HTMLButtonElement;
  private deleteBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private saveBtn!: HTMLButtonElement;

  private materialBtns: Map<MaterialKey, HTMLButtonElement> = new Map();
  private statusText!: HTMLElement;

  private placingMode: boolean = false;
  private selectedBuildingId: string | null = null;
  private buildingCount: number = 0;

  constructor(containerId: string, callbacks: ControlPanelCallbacks) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`);
    }
    this.container = container;
    this.callbacks = callbacks;

    this.injectStyles();
    this.createUI();
    this.bindEvents();
  }

  private injectStyles(): void {
    if (document.getElementById('cp-styles')) return;
    const style = document.createElement('style');
    style.id = 'cp-styles';
    style.textContent = `
      .cp-toolbar {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 14px 22px;
        display: flex;
        align-items: center;
        gap: 28px;
        color: #fff;
        z-index: 50;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      .cp-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .cp-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        min-width: 44px;
      }
      .cp-value {
        font-size: 13px;
        font-weight: 600;
        color: #85C1E9;
        min-width: 38px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .cp-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 140px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      .cp-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #85C1E9;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(133, 193, 233, 0.6);
        transition: transform 0.15s ease;
      }
      .cp-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .cp-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #85C1E9;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(133, 193, 233, 0.6);
      }
      .cp-btn {
        background: rgba(133, 193, 233, 0.2);
        border: 1px solid rgba(133, 193, 233, 0.35);
        color: #fff;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .cp-btn:hover {
        background: rgba(133, 193, 233, 0.35);
        transform: scale(1.05);
      }
      .cp-btn.active {
        background: #85C1E9;
        color: #1A252F;
        border-color: #85C1E9;
      }
      .cp-btn.danger {
        background: rgba(192, 57, 43, 0.2);
        border-color: rgba(192, 57, 43, 0.4);
      }
      .cp-btn.danger:hover {
        background: rgba(192, 57, 43, 0.4);
      }
      .cp-btn.success {
        background: rgba(39, 174, 96, 0.2);
        border-color: rgba(39, 174, 96, 0.4);
      }
      .cp-btn.success:hover {
        background: rgba(39, 174, 96, 0.4);
      }
      .cp-divider {
        width: 1px;
        height: 30px;
        background: rgba(255, 255, 255, 0.15);
      }
      .cp-status {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        padding-left: 10px;
      }
      .cp-drawer-toggle {
        position: absolute;
        top: 20px;
        left: 0;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-left: none;
        border-radius: 0 10px 10px 0;
        color: #fff;
        padding: 12px 10px;
        cursor: pointer;
        z-index: 40;
        transition: all 0.2s ease;
        font-size: 18px;
      }
      .cp-drawer-toggle:hover {
        background: rgba(255, 255, 255, 0.18);
        padding-left: 14px;
      }
      .cp-drawer {
        position: absolute;
        top: 0;
        left: -340px;
        width: 340px;
        height: 100%;
        background: rgba(26, 37, 47, 0.92);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: 24px 20px;
        transition: left 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 45;
        overflow-y: auto;
        box-shadow: 8px 0 32px rgba(0, 0, 0, 0.3);
      }
      .cp-drawer.open {
        left: 0;
      }
      .cp-drawer-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 18px;
        color: #85C1E9;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cp-cards-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .cp-card-empty {
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        padding: 40px 0;
        font-size: 13px;
      }
      .cp-right-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 280px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        color: #fff;
        padding: 18px;
        z-index: 50;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      .cp-panel-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 14px;
        color: #85C1E9;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .cp-panel-section {
        margin-bottom: 18px;
      }
      .cp-panel-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .cp-panel-val {
        color: #fff;
        font-weight: 600;
      }
      .cp-material-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .cp-material-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 10px 4px;
        border-radius: 10px;
        border: 2px solid transparent;
        background: rgba(255, 255, 255, 0.06);
        cursor: pointer;
        transition: all 0.15s ease;
        color: rgba(255, 255, 255, 0.7);
        font-size: 10px;
      }
      .cp-material-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: scale(1.05);
      }
      .cp-material-btn.active {
        border-color: #85C1E9;
        background: rgba(133, 193, 233, 0.15);
        color: #fff;
      }
      .cp-material-swatch {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .cp-hint {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        line-height: 1.5;
        margin-top: 6px;
      }
      .cp-drawer::-webkit-scrollbar {
        width: 6px;
      }
      .cp-drawer::-webkit-scrollbar-track {
        background: transparent;
      }
      .cp-drawer::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  private createUI(): void {
    this.bottomToolbar = document.createElement('div');
    this.bottomToolbar.className = 'cp-toolbar';
    this.bottomToolbar.innerHTML = `
      <div class="cp-group">
        <span class="cp-label">方位角</span>
        <input type="range" class="cp-slider" id="cp-azimuth" min="0" max="360" step="1" value="45" />
        <span class="cp-value" id="cp-azimuth-val">45°</span>
      </div>
      <div class="cp-group">
        <span class="cp-label">高度角</span>
        <input type="range" class="cp-slider" id="cp-altitude" min="5" max="85" step="1" value="45" />
        <span class="cp-value" id="cp-altitude-val">45°</span>
      </div>
      <div class="cp-divider"></div>
      <button class="cp-btn" id="cp-place">放置体块</button>
      <button class="cp-btn success" id="cp-save">保存方案</button>
      <button class="cp-btn danger" id="cp-clear">清空</button>
      <div class="cp-divider"></div>
      <span class="cp-status" id="cp-status">体块数量: 0 / 40</span>
    `;
    this.container.appendChild(this.bottomToolbar);

    this.drawerToggle = document.createElement('button');
    this.drawerToggle.className = 'cp-drawer-toggle';
    this.drawerToggle.innerHTML = '&#9776;';
    this.drawerToggle.title = '方案列表';
    this.container.appendChild(this.drawerToggle);

    this.drawer = document.createElement('div');
    this.drawer.className = 'cp-drawer';
    this.drawer.innerHTML = `
      <div class="cp-drawer-title">📋 方案列表</div>
      <div class="cp-cards-list" id="cp-cards"></div>
    `;
    this.container.appendChild(this.drawer);

    this.rightPanel = document.createElement('div');
    this.rightPanel.className = 'cp-right-panel';
    this.rightPanel.innerHTML = `
      <div class="cp-panel-title" id="cp-panel-title">体块属性</div>
      <div class="cp-panel-section">
        <div class="cp-panel-label">
          <span>宽度 (W)</span>
          <span class="cp-panel-val" id="cp-width-val">4m</span>
        </div>
        <input type="range" class="cp-slider" id="cp-width" min="2" max="6" step="1" value="4" style="width:100%" />
      </div>
      <div class="cp-panel-section">
        <div class="cp-panel-label">
          <span>进深 (D)</span>
          <span class="cp-panel-val" id="cp-depth-val">4m</span>
        </div>
        <input type="range" class="cp-slider" id="cp-depth" min="2" max="6" step="1" value="4" style="width:100%" />
      </div>
      <div class="cp-panel-section">
        <div class="cp-panel-label">
          <span>高度 (H)</span>
          <span class="cp-panel-val" id="cp-height-val">6m</span>
        </div>
        <input type="range" class="cp-slider" id="cp-height" min="3" max="15" step="1" value="6" style="width:100%" />
      </div>
      <div class="cp-panel-section">
        <div class="cp-panel-label"><span>材质</span></div>
        <div class="cp-material-grid" id="cp-materials"></div>
      </div>
      <div class="cp-panel-section" id="cp-selected-actions" style="display:none">
        <button class="cp-btn danger" id="cp-delete" style="width:100%">删除选中体块</button>
      </div>
      <div class="cp-hint" id="cp-hint">
        点击「放置体块」，在地面上单击放置。<br/>
        可调整尺寸和材质后放置。
      </div>
    `;
    this.container.appendChild(this.rightPanel);

    this.azimuthSlider = this.bottomToolbar.querySelector('#cp-azimuth') as HTMLInputElement;
    this.altitudeSlider = this.bottomToolbar.querySelector('#cp-altitude') as HTMLInputElement;
    this.azimuthValueEl = this.bottomToolbar.querySelector('#cp-azimuth-val') as HTMLElement;
    this.altitudeValueEl = this.bottomToolbar.querySelector('#cp-altitude-val') as HTMLElement;

    this.widthSlider = this.rightPanel.querySelector('#cp-width') as HTMLInputElement;
    this.depthSlider = this.rightPanel.querySelector('#cp-depth') as HTMLInputElement;
    this.heightSlider = this.rightPanel.querySelector('#cp-height') as HTMLInputElement;
    this.widthValueEl = this.rightPanel.querySelector('#cp-width-val') as HTMLElement;
    this.depthValueEl = this.rightPanel.querySelector('#cp-depth-val') as HTMLElement;
    this.heightValueEl = this.rightPanel.querySelector('#cp-height-val') as HTMLElement;

    this.placeBtn = this.bottomToolbar.querySelector('#cp-place') as HTMLButtonElement;
    this.deleteBtn = this.rightPanel.querySelector('#cp-delete') as HTMLButtonElement;
    this.clearBtn = this.bottomToolbar.querySelector('#cp-clear') as HTMLButtonElement;
    this.saveBtn = this.bottomToolbar.querySelector('#cp-save') as HTMLButtonElement;

    this.statusText = this.bottomToolbar.querySelector('#cp-status') as HTMLElement;
    this.schemeCardsContainer = this.drawer.querySelector('#cp-cards') as HTMLElement;

    const materialsContainer = this.rightPanel.querySelector('#cp-materials') as HTMLElement;
    (Object.keys(MATERIALS) as MaterialKey[]).forEach((key) => {
      const info = MATERIALS[key];
      const btn = document.createElement('button');
      btn.className = 'cp-material-btn';
      btn.dataset.material = key;
      btn.innerHTML = `
        <div class="cp-material-swatch" style="background:${info.color}"></div>
        <span>${info.name}</span>
      `;
      materialsContainer.appendChild(btn);
      this.materialBtns.set(key, btn);
    });
    this.setActiveMaterial('concrete');
  }

  private bindEvents(): void {
    this.azimuthSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.azimuthValueEl.textContent = val + '°';
      this.callbacks.onSunAzimuthChange(val);
    });

    this.altitudeSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.altitudeValueEl.textContent = val + '°';
      this.callbacks.onSunAltitudeChange(val);
    });

    const emitSize = () => {
      const w = parseInt(this.widthSlider.value, 10);
      const d = parseInt(this.depthSlider.value, 10);
      const h = parseInt(this.heightSlider.value, 10);
      this.callbacks.onSizeChange(w, d, h);
    };
    this.widthSlider.addEventListener('input', (e) => {
      this.widthValueEl.textContent = (e.target as HTMLInputElement).value + 'm';
      emitSize();
    });
    this.depthSlider.addEventListener('input', (e) => {
      this.depthValueEl.textContent = (e.target as HTMLInputElement).value + 'm';
      emitSize();
    });
    this.heightSlider.addEventListener('input', (e) => {
      this.heightValueEl.textContent = (e.target as HTMLInputElement).value + 'm';
      emitSize();
    });

    this.materialBtns.forEach((btn, key) => {
      btn.addEventListener('click', () => {
        this.setActiveMaterial(key);
        this.callbacks.onMaterialChange(key);
      });
    });

    this.placeBtn.addEventListener('click', () => {
      if (this.placingMode) {
        this.setPlacingMode(false);
        this.callbacks.onCancelPlacing();
      } else {
        this.setPlacingMode(true);
        this.callbacks.onStartPlacing();
      }
    });

    this.deleteBtn.addEventListener('click', () => {
      this.callbacks.onDeleteSelected();
    });

    this.clearBtn.addEventListener('click', () => {
      if (confirm('确定清空所有体块吗？')) {
        this.callbacks.onClearAll();
      }
    });

    this.saveBtn.addEventListener('click', () => {
      this.callbacks.onSaveScheme();
    });

    this.drawerToggle.addEventListener('click', () => {
      this.toggleDrawer();
      this.callbacks.onToggleDrawer();
    });
  }

  public setActiveMaterial(key: MaterialKey): void {
    this.materialBtns.forEach((btn, k) => {
      btn.classList.toggle('active', k === key);
    });
  }

  public setPlacingMode(active: boolean): void {
    this.placingMode = active;
    this.placeBtn.classList.toggle('active', active);
    this.placeBtn.textContent = active ? '取消放置' : '放置体块';

    const hint = this.rightPanel.querySelector('#cp-hint') as HTMLElement;
    const title = this.rightPanel.querySelector('#cp-panel-title') as HTMLElement;
    if (active) {
      hint.innerHTML = '🖱️ 在地面上单击放置体块<br/>按 Esc 或再次点击按钮取消';
      title.textContent = '放置参数';
    } else if (this.selectedBuildingId) {
      hint.innerHTML = '已选体块，可调整参数或删除';
      title.textContent = '编辑体块';
    } else {
      hint.innerHTML = '点击「放置体块」，在地面上单击放置。<br/>点击已放置体块进行编辑。';
      title.textContent = '体块属性';
    }
  }

  public setSunlightParams(params: SunlightParams): void {
    this.azimuthSlider.value = String(params.azimuth);
    this.azimuthValueEl.textContent = params.azimuth + '°';
    this.altitudeSlider.value = String(params.altitude);
    this.altitudeValueEl.textContent = params.altitude + '°';
  }

  public setSizeValues(w: number, d: number, h: number): void {
    this.widthSlider.value = String(w);
    this.widthValueEl.textContent = w + 'm';
    this.depthSlider.value = String(d);
    this.depthValueEl.textContent = d + 'm';
    this.heightSlider.value = String(h);
    this.heightValueEl.textContent = h + 'm';
  }

  public setSelectedBuilding(
    id: string | null,
    size?: { width: number; depth: number; height: number },
    materialKey?: MaterialKey
  ): void {
    this.selectedBuildingId = id;
    const actionsEl = this.rightPanel.querySelector('#cp-selected-actions') as HTMLElement;
    const hint = this.rightPanel.querySelector('#cp-hint') as HTMLElement;
    const title = this.rightPanel.querySelector('#cp-panel-title') as HTMLElement;

    if (id) {
      actionsEl.style.display = 'block';
      if (size) this.setSizeValues(size.width, size.depth, size.height);
      if (materialKey) this.setActiveMaterial(materialKey);
      hint.innerHTML = '✅ 已选中体块，调整参数实时更新';
      title.textContent = '编辑体块';
    } else {
      actionsEl.style.display = 'none';
      if (!this.placingMode) {
        hint.innerHTML = '点击「放置体块」，在地面上单击放置。<br/>点击已放置体块进行编辑。';
        title.textContent = '体块属性';
      }
    }
  }

  public setBuildingCount(count: number): void {
    this.buildingCount = count;
    this.statusText.textContent = `体块数量: ${count} / 40`;
    this.statusText.style.color = count >= 35 ? '#E74C3C' : 'rgba(255,255,255,0.6)';
  }

  public toggleDrawer(): void {
    this.drawer.classList.toggle('open');
    if (this.drawer.classList.contains('open')) {
      this.drawerToggle.innerHTML = '&times;';
    } else {
      this.drawerToggle.innerHTML = '&#9776;';
    }
  }

  public openDrawer(): void {
    this.drawer.classList.add('open');
    this.drawerToggle.innerHTML = '&times;';
  }

  public closeDrawer(): void {
    this.drawer.classList.remove('open');
    this.drawerToggle.innerHTML = '&#9776;';
  }

  public getSchemeCardsContainer(): HTMLElement {
    return this.schemeCardsContainer;
  }

  public dispose(): void {
    this.bottomToolbar.remove();
    this.drawer.remove();
    this.drawerToggle.remove();
    this.rightPanel.remove();
    const style = document.getElementById('cp-styles');
    if (style) style.remove();
  }
}
