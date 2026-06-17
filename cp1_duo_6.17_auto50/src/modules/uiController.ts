import type { TerrainManager, SkylineMode, BuildingSnapshot } from './terrainManager';
import type { SunSimulator } from './sunSimulator';

export class UIController {
  private terrainManager: TerrainManager;
  private sunSimulator: SunSimulator;
  private panel!: HTMLElement;
  private isCollapsed = false;
  private isCompareMode = false;
  private snapshot: BuildingSnapshot | null = null;

  private readonly COLOR_SCHEME_A = 0x3388ff;
  private readonly COLOR_SCHEME_B = 0xff8833;

  constructor(terrainManager: TerrainManager, sunSimulator: SunSimulator) {
    this.terrainManager = terrainManager;
    this.sunSimulator = sunSimulator;
    this.createPanel();
    this.bindEvents();
  }

  private createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">天际线控制</span>
        <button class="toggle-btn" id="panel-toggle">◀</button>
      </div>
      <div class="panel-body" id="panel-body">
        <div class="control-group">
          <label class="control-label">生成模式</label>
          <select id="mode-select" class="control-select">
            <option value="center-decay">中心递减式</option>
            <option value="linear-rise">线性递增式</option>
            <option value="jagged-wave">参差波动式</option>
            <option value="uniform">均匀分布式</option>
          </select>
        </div>
        <div class="control-group">
          <label class="control-label">日光模拟 <span id="time-display">12:00</span></label>
          <input type="range" id="time-slider" class="control-slider" min="0" max="24" step="0.1" value="12" />
          <div class="slider-labels">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
        <div class="control-group">
          <button id="snapshot-btn" class="control-btn btn-primary">保存快照</button>
          <button id="compare-btn" class="control-btn btn-secondary" disabled>对比模式</button>
        </div>
        <div class="control-group info-section">
          <div class="info-row"><span>建筑体块</span><span id="info-buildings">-</span></div>
          <div class="info-row"><span>控制点</span><span id="info-cps">-</span></div>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        left: 16px;
        top: 16px;
        width: 280px;
        background: rgba(20, 20, 35, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        z-index: 100;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #d0d0e0;
        transition: transform 0.3s ease, width 0.3s ease;
        overflow: hidden;
      }

      #control-panel.collapsed {
        width: 48px;
      }

      #control-panel.collapsed .panel-body {
        opacity: 0;
        pointer-events: none;
        max-height: 0;
      }

      #control-panel.collapsed .panel-title {
        opacity: 0;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .panel-title {
        font-weight: 600;
        font-size: 15px;
        color: #ffffff;
        letter-spacing: 0.3px;
        transition: opacity 0.2s ease;
      }

      .toggle-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: rgba(255, 255, 255, 0.06);
        color: #b0b0c0;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .toggle-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .panel-body {
        padding: 16px;
        transition: opacity 0.3s ease, max-height 0.3s ease;
        max-height: 600px;
        overflow: hidden;
      }

      .control-group {
        margin-bottom: 18px;
      }

      .control-group:last-child {
        margin-bottom: 0;
      }

      .control-label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 500;
        color: #b0b0c0;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .control-select {
        width: 100%;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #e0e0f0;
        font-size: 14px;
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23b0b0c0' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        transition: all 0.2s ease;
      }

      .control-select:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.18);
      }

      .control-select:focus {
        outline: none;
        border-color: rgba(51, 136, 255, 0.5);
        box-shadow: 0 0 0 2px rgba(51, 136, 255, 0.15);
      }

      .control-select option {
        background: #1a1a2e;
        color: #e0e0f0;
      }

      .control-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .control-slider:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .control-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        background: #3388ff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(51, 136, 255, 0.4);
        transition: all 0.2s ease;
      }

      .control-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 2px 10px rgba(51, 136, 255, 0.6);
      }

      .control-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #3388ff;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(51, 136, 255, 0.4);
      }

      .slider-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 10px;
        color: rgba(176, 176, 192, 0.6);
      }

      #time-display {
        color: #3388ff;
        font-weight: 600;
        margin-left: 4px;
      }

      .control-btn {
        width: 100%;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 8px;
      }

      .control-btn:last-child {
        margin-bottom: 0;
      }

      .control-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .control-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .btn-primary {
        background: rgba(51, 136, 255, 0.2);
        color: #5599ff;
        border: 1px solid rgba(51, 136, 255, 0.25);
      }

      .btn-primary:hover:not(:disabled) {
        background: rgba(51, 136, 255, 0.3);
        box-shadow: 0 4px 12px rgba(51, 136, 255, 0.2);
      }

      .btn-secondary {
        background: rgba(255, 136, 51, 0.15);
        color: #ff9955;
        border: 1px solid rgba(255, 136, 51, 0.2);
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(255, 136, 51, 0.25);
        box-shadow: 0 4px 12px rgba(255, 136, 51, 0.15);
      }

      .btn-secondary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .btn-secondary.active {
        background: rgba(255, 136, 51, 0.35);
        border-color: rgba(255, 136, 51, 0.5);
        box-shadow: 0 0 12px rgba(255, 136, 51, 0.2);
      }

      .info-section {
        padding-top: 14px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 12px;
        color: rgba(176, 176, 192, 0.7);
      }

      .info-row span:last-child {
        color: #e0e0f0;
        font-weight: 500;
      }

      @media (max-width: 767px) {
        #control-panel {
          left: 8px;
          right: 8px;
          top: auto;
          bottom: 0;
          width: auto;
          border-radius: 12px 12px 0 0;
          max-height: 60vh;
          transition: transform 0.3s ease;
        }

        #control-panel.collapsed {
          transform: translateY(calc(100% - 48px));
          width: auto;
        }

        #control-panel.collapsed .panel-body {
          opacity: 1;
          pointer-events: auto;
          max-height: 600px;
        }

        #control-panel.collapsed .panel-title {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);
    this.panel = panel;

    const infoBuildings = document.getElementById('info-buildings');
    const infoCps = document.getElementById('info-cps');
    if (infoBuildings) infoBuildings.textContent = String(this.terrainManager.getBuildingCount());
    if (infoCps) infoCps.textContent = String(this.terrainManager.getControlPointCount());
  }

  private bindEvents(): void {
    const toggleBtn = document.getElementById('panel-toggle');
    toggleBtn?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      this.panel.classList.toggle('collapsed', this.isCollapsed);
      toggleBtn.textContent = this.isCollapsed ? '▶' : '◀';
    });

    const modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
    modeSelect?.addEventListener('change', () => {
      this.terrainManager.applyMode(modeSelect.value as SkylineMode);
    });

    const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    const timeDisplay = document.getElementById('time-display');
    timeSlider?.addEventListener('input', () => {
      const hour = parseFloat(timeSlider.value);
      this.sunSimulator.setTime(hour);
      if (timeDisplay) {
        const h = Math.floor(hour);
        const m = Math.floor((hour - h) * 60);
        timeDisplay.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    });

    const snapshotBtn = document.getElementById('snapshot-btn');
    const compareBtn = document.getElementById('compare-btn') as HTMLButtonElement;

    snapshotBtn?.addEventListener('click', () => {
      this.saveSnapshot();
      if (compareBtn) compareBtn.disabled = false;
      if (snapshotBtn) {
        snapshotBtn.textContent = '快照已保存 ✓';
        snapshotBtn.classList.add('btn-saved');
        setTimeout(() => {
          snapshotBtn.textContent = '保存快照';
          snapshotBtn.classList.remove('btn-saved');
        }, 1500);
      }
    });

    compareBtn?.addEventListener('click', () => {
      if (!this.hasSnapshot()) return;
      this.toggleCompare();
      compareBtn.classList.toggle('active', this.isCompareMode);
      compareBtn.textContent = this.isCompareMode ? '退出对比' : '对比模式';
    });
  }

  private saveSnapshot(): void {
    this.snapshot = this.terrainManager.getCurrentSnapshot();
  }

  private hasSnapshot(): boolean {
    return this.snapshot !== null;
  }

  private toggleCompare(): boolean {
    if (this.isCompareMode) {
      this.terrainManager.hideComparison();
      this.isCompareMode = false;
      return false;
    } else if (this.snapshot) {
      this.terrainManager.showComparison(
        this.snapshot,
        this.COLOR_SCHEME_A,
        this.COLOR_SCHEME_B
      );
      this.isCompareMode = true;
      return true;
    }
    return false;
  }
}
