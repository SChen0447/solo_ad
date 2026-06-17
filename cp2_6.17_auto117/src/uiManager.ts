import { BuildingInfo } from './sceneManager';
import { BuildingData } from './buildingFactory';

export class UIManager {
  private container: HTMLElement;
  private buildingPanel: HTMLElement;
  private timeSlider: HTMLInputElement;
  private timeLabel: HTMLElement;
  private growthBtn: HTMLElement;
  private buildingCountEl: HTMLElement;
  private densityEl: HTMLElement;
  private timeElapsedEl: HTMLElement;
  private buildingInfoFloors: HTMLElement;
  private buildingInfoHeight: HTMLElement;
  private buildingInfoArea: HTMLElement;
  private buildingInfoDistance: HTMLElement;
  private buildingInfoColor: HTMLElement;
  private buildingInfoColorSwatch: HTMLElement;
  private buildingInfoPosition: HTMLElement;
  private closeBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private exportBtn: HTMLElement;
  private randomBtn: HTMLElement;
  private hidePanelTimer: number | null = null;
  private isPanelPinned: boolean = false;

  onTimeChange?: (hour: number) => void;
  onGrowthToggle?: (isGrowing: boolean) => void;
  onReset?: () => void;
  onExport?: () => BuildingData[];
  onRandomize?: () => void;
  onClosePanel?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this.injectStyles();
    this.createNavbar();
    this.createStatsPanel();
    this.createGrowthButton();
    this.createTimeSlider();
    this.createBuildingPanel();

    this.buildingPanel = document.getElementById('building-panel')!;
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.timeLabel = document.getElementById('time-label')!;
    this.growthBtn = document.getElementById('growth-btn')!;
    this.buildingCountEl = document.getElementById('building-count')!;
    this.densityEl = document.getElementById('density')!;
    this.timeElapsedEl = document.getElementById('time-elapsed')!;
    this.buildingInfoFloors = document.getElementById('info-floors')!;
    this.buildingInfoHeight = document.getElementById('info-height')!;
    this.buildingInfoArea = document.getElementById('info-area')!;
    this.buildingInfoDistance = document.getElementById('info-distance')!;
    this.buildingInfoColor = document.getElementById('info-color')!;
    this.buildingInfoColorSwatch = document.getElementById('info-color-swatch')!;
    this.buildingInfoPosition = document.getElementById('info-position')!;
    this.closeBtn = document.getElementById('close-btn')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.exportBtn = document.getElementById('export-btn')!;
    this.randomBtn = document.getElementById('random-btn')!;

    this.bindEvents();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #1a1a2e;
        color: #e0e0e0;
        overflow: hidden;
      }

      #app {
        width: 100vw;
        height: 100vh;
        position: relative;
      }

      canvas {
        display: block;
      }

      .navbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 56px;
        background: #1a1a2e;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        z-index: 100;
        border-bottom: 1px solid #16213e;
      }

      .navbar-title {
        font-size: 20px;
        font-weight: bold;
        color: #e0e0e0;
        font-family: sans-serif;
      }

      .navbar-buttons {
        display: flex;
        gap: 12px;
      }

      .nav-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: #0f3460;
        color: #e0e0e0;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
        font-family: inherit;
      }

      .nav-btn:hover {
        background: #e94560;
        transform: translateY(-2px);
      }

      .nav-btn:active::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(255,255,255,0.4);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: ripple 0.4s ease-out;
      }

      @keyframes ripple {
        to {
          width: 200px;
          height: 200px;
          opacity: 0;
        }
      }

      #stats-panel {
        position: fixed;
        top: 76px;
        left: 20px;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 16px;
        font-family: monospace;
        font-size: 14px;
        z-index: 50;
        min-width: 180px;
      }

      .stat-row {
        margin-bottom: 8px;
      }

      .stat-row:last-child {
        margin-bottom: 0;
      }

      .stat-label {
        opacity: 0.8;
      }

      .stat-value {
        font-weight: bold;
        color: #f1c40f;
      }

      #growth-btn {
        position: fixed;
        top: 76px;
        right: 20px;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        background: #0f3460;
        color: #e0e0e0;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 50;
        font-family: inherit;
        font-weight: bold;
      }

      #growth-btn:hover {
        background: #e94560;
        transform: translateY(-2px);
      }

      #growth-btn.growing {
        background: #e94560;
      }

      .time-container {
        position: fixed;
        bottom: 30px;
        left: 20px;
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      #time-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 200px;
        height: 6px;
        background: #2c3e50;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }

      #time-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #f1c40f;
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.1s ease;
      }

      #time-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      #time-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #f1c40f;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: transform 0.1s ease;
      }

      #time-label {
        font-family: monospace;
        font-size: 14px;
        color: #e0e0e0;
      }

      #building-panel {
        position: fixed;
        top: 50%;
        left: 20px;
        transform: translateY(-50%) translateX(-100%);
        width: 240px;
        background: rgba(44, 62, 80, 0.88);
        border-radius: 8px;
        padding: 16px;
        z-index: 60;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
      }

      #building-panel.visible {
        transform: translateY(-50%) translateX(0);
        opacity: 1;
        pointer-events: auto;
      }

      .panel-title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 12px;
        color: #e0e0e0;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        padding-bottom: 8px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
      }

      .info-label {
        color: #a0a0a0;
      }

      .info-value {
        color: #f1c40f;
        font-weight: bold;
        font-family: monospace;
      }

      .color-swatch-container {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
      }

      #close-btn {
        position: absolute;
        bottom: 12px;
        right: 12px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }

      #close-btn:hover {
        background: #e94560;
      }

      #close-btn::before,
      #close-btn::after {
        content: '';
        position: absolute;
        width: 12px;
        height: 2px;
        background: white;
      }

      #close-btn::before {
        transform: rotate(45deg);
      }

      #close-btn::after {
        transform: rotate(-45deg);
      }

      .confirm-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      .confirm-dialog.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .confirm-box {
        background: #16213e;
        border-radius: 12px;
        padding: 24px;
        min-width: 300px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }

      .confirm-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 12px;
        color: #e0e0e0;
      }

      .confirm-message {
        font-size: 14px;
        color: #a0a0a0;
        margin-bottom: 20px;
      }

      .confirm-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .confirm-btn {
        padding: 8px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .confirm-btn.cancel {
        background: #2c3e50;
        color: #e0e0e0;
      }

      .confirm-btn.cancel:hover {
        background: #34495e;
      }

      .confirm-btn.confirm {
        background: #e94560;
        color: white;
      }

      .confirm-btn.confirm:hover {
        background: #ff5773;
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }

  createNavbar() {
    const navbar = document.createElement('div');
    navbar.className = 'navbar';

    const title = document.createElement('div');
    title.className = 'navbar-title';
    title.textContent = '天际线模拟器';

    const buttons = document.createElement('div');
    buttons.className = 'navbar-buttons';

    const resetBtn = document.createElement('button');
    resetBtn.id = 'reset-btn';
    resetBtn.className = 'nav-btn';
    resetBtn.textContent = '重置场景';

    const exportBtn = document.createElement('button');
    exportBtn.id = 'export-btn';
    exportBtn.className = 'nav-btn';
    exportBtn.textContent = '导出场景';

    const randomBtn = document.createElement('button');
    randomBtn.id = 'random-btn';
    randomBtn.className = 'nav-btn';
    randomBtn.textContent = '随机化';

    buttons.appendChild(resetBtn);
    buttons.appendChild(exportBtn);
    buttons.appendChild(randomBtn);

    navbar.appendChild(title);
    navbar.appendChild(buttons);

    this.container.appendChild(navbar);
  }

  createStatsPanel() {
    const panel = document.createElement('div');
    panel.id = 'stats-panel';

    const row1 = document.createElement('div');
    row1.className = 'stat-row';
    row1.innerHTML = '<span class="stat-label">建筑数量: </span><span class="stat-value" id="building-count">0</span>';

    const row2 = document.createElement('div');
    row2.className = 'stat-row';
    row2.innerHTML = '<span class="stat-label">城市密度: </span><span class="stat-value" id="density">0%</span>';

    const row3 = document.createElement('div');
    row3.className = 'stat-row';
    row3.innerHTML = '<span class="stat-label">生长时长: </span><span class="stat-value" id="time-elapsed">0s</span>';

    panel.appendChild(row1);
    panel.appendChild(row2);
    panel.appendChild(row3);

    this.container.appendChild(panel);
  }

  createGrowthButton() {
    const btn = document.createElement('button');
    btn.id = 'growth-btn';
    btn.textContent = '快速生长';
    this.container.appendChild(btn);
  }

  createTimeSlider() {
    const container = document.createElement('div');
    container.className = 'time-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'time-slider';
    slider.min = '6';
    slider.max = '24';
    slider.step = '0.5';
    slider.value = '12';

    const label = document.createElement('div');
    label.id = 'time-label';
    label.textContent = '12:00';

    container.appendChild(slider);
    container.appendChild(label);

    this.container.appendChild(container);
  }

  createBuildingPanel() {
    const panel = document.createElement('div');
    panel.id = 'building-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '建筑信息';

    const row1 = document.createElement('div');
    row1.className = 'info-row';
    row1.innerHTML = '<span class="info-label">层数:</span><span class="info-value" id="info-floors">-</span>';

    const row2 = document.createElement('div');
    row2.className = 'info-row';
    row2.innerHTML = '<span class="info-label">高度:</span><span class="info-value" id="info-height">-</span>';

    const row3 = document.createElement('div');
    row3.className = 'info-row';
    row3.innerHTML = '<span class="info-label">颜色:</span><span class="info-value color-swatch-container"><span class="color-swatch" id="info-color-swatch"></span><span id="info-color">-</span></span>';

    const row4 = document.createElement('div');
    row4.className = 'info-row';
    row4.innerHTML = '<span class="info-label">位置:</span><span class="info-value" id="info-position">-</span>';

    const row5 = document.createElement('div');
    row5.className = 'info-row';
    row5.innerHTML = '<span class="info-label">占地面积:</span><span class="info-value" id="info-area">-</span>';

    const row6 = document.createElement('div');
    row6.className = 'info-row';
    row6.innerHTML = '<span class="info-label">距中心:</span><span class="info-value" id="info-distance">-</span>';

    const closeBtn = document.createElement('button');
    closeBtn.id = 'close-btn';

    panel.appendChild(title);
    panel.appendChild(row1);
    panel.appendChild(row2);
    panel.appendChild(row3);
    panel.appendChild(row4);
    panel.appendChild(row5);
    panel.appendChild(row6);
    panel.appendChild(closeBtn);

    this.container.appendChild(panel);
  }

  bindEvents() {
    this.timeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateTimeLabel(value);
      if (this.onTimeChange) {
        this.onTimeChange(value);
      }
    });

    this.growthBtn.addEventListener('click', () => {
      const isGrowing = !this.growthBtn.classList.contains('growing');
      this.setGrowthButtonState(isGrowing);
      if (this.onGrowthToggle) {
        this.onGrowthToggle(isGrowing);
      }
    });

    this.closeBtn.addEventListener('click', () => {
      this.hideBuildingPanel();
      if (this.onClosePanel) {
        this.onClosePanel();
      }
    });

    this.resetBtn.addEventListener('click', () => {
      this.showConfirmDialog(
        '确认重置',
        '确定要重置整个场景吗？所有建筑都将被清除。',
        () => {
          if (this.onReset) {
            this.onReset();
          }
        }
      );
    });

    this.exportBtn.addEventListener('click', () => {
      if (this.onExport) {
        const data = this.onExport();
        this.exportJSON(data);
      }
    });

    this.randomBtn.addEventListener('click', () => {
      if (this.onRandomize) {
        this.onRandomize();
      }
    });
  }

  updateTimeLabel(hour: number) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    this.timeLabel.textContent = timeStr;
  }

  setGrowthButtonState(isGrowing: boolean) {
    if (isGrowing) {
      this.growthBtn.classList.add('growing');
      this.growthBtn.textContent = '停止生长';
    } else {
      this.growthBtn.classList.remove('growing');
      this.growthBtn.textContent = '快速生长';
    }
  }

  updateStats(count: number, density: number) {
    this.buildingCountEl.textContent = count.toString();
    this.densityEl.textContent = `${density}%`;
  }

  updateElapsedTime(seconds: number) {
    this.timeElapsedEl.textContent = `${seconds}s`;
  }

  showBuildingPanel(info: BuildingInfo) {
    this.clearHideTimer();
    this.buildingInfoFloors.textContent = `${info.floors} 层`;
    this.buildingInfoHeight.textContent = `${info.height} 米`;
    this.buildingInfoColor.textContent = info.color.toUpperCase();
    this.buildingInfoColorSwatch.style.background = info.color;
    this.buildingInfoPosition.textContent = `(${info.gridX}, ${info.gridZ})`;
    this.buildingInfoArea.textContent = `${info.area} m²`;
    this.buildingInfoDistance.textContent = `${info.distanceFromCenter} 格`;
    this.buildingPanel.classList.add('visible');
  }

  pinBuildingPanel(info: BuildingInfo | null) {
    this.clearHideTimer();
    if (info) {
      this.isPanelPinned = true;
      this.showBuildingPanel(info);
    } else {
      this.isPanelPinned = false;
      this.scheduleHidePanel();
    }
  }

  requestHidePanel() {
    if (this.isPanelPinned) return;
    this.scheduleHidePanel();
  }

  private scheduleHidePanel() {
    this.clearHideTimer();
    this.hidePanelTimer = window.setTimeout(() => {
      this.hideBuildingPanel();
    }, 500);
  }

  private clearHideTimer() {
    if (this.hidePanelTimer !== null) {
      clearTimeout(this.hidePanelTimer);
      this.hidePanelTimer = null;
    }
  }

  hideBuildingPanel() {
    this.clearHideTimer();
    this.isPanelPinned = false;
    this.buildingPanel.classList.remove('visible');
  }

  showConfirmDialog(title: string, message: string, onConfirm: () => void) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const titleEl = document.createElement('div');
    titleEl.className = 'confirm-title';
    titleEl.textContent = title;

    const msgEl = document.createElement('div');
    msgEl.className = 'confirm-message';
    msgEl.textContent = message;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'confirm-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn cancel';
    cancelBtn.textContent = '取消';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn confirm';
    confirmBtn.textContent = '确认';

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);

    box.appendChild(titleEl);
    box.appendChild(msgEl);
    box.appendChild(btnContainer);

    dialog.appendChild(box);
    this.container.appendChild(dialog);

    requestAnimationFrame(() => {
      dialog.classList.add('visible');
    });

    const close = () => {
      dialog.classList.remove('visible');
      setTimeout(() => dialog.remove(), 200);
    };

    cancelBtn.addEventListener('click', close);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close();
    });
    confirmBtn.addEventListener('click', () => {
      onConfirm();
      close();
    });
  }

  exportJSON(data: BuildingData[]) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `city-skyline-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
