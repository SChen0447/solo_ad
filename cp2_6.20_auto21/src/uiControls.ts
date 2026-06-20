import { HeatmapManager, TimePeriod } from './heatmapManager';

interface TimePeriodOption {
  key: TimePeriod;
  label: string;
}

export class UIControls {
  private container: HTMLElement;
  private heatmapManager: HeatmapManager;
  private onPeriodChange: ((period: string) => void) | null = null;
  private timePeriods: TimePeriodOption[] = [
    { key: 'morning', label: '早' },
    { key: 'noon', label: '中' },
    { key: 'evening', label: '晚' }
  ];
  private controlPanel: HTMLDivElement | null = null;
  private infoDisplay: HTMLDivElement | null = null;
  private activeIndex: number = 1;

  constructor(container: HTMLElement, heatmapManager: HeatmapManager) {
    this.container = container;
    this.heatmapManager = heatmapManager;
    this.createControlPanel();
    this.createInfoDisplay();
    this.createStyleSheet();
    this.updateInfoDisplay();
  }

  private createStyleSheet(): void {
    const style = document.createElement('style');
    style.textContent = `
      .time-control-panel {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        background: rgba(26, 26, 46, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 12px;
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 100;
      }
      .time-btn {
        position: relative;
        padding: 10px 28px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 8px;
        transition: color 0.3s ease;
        font-family: inherit;
      }
      .time-btn:hover {
        color: rgba(255, 255, 255, 0.9);
      }
      .time-btn.active {
        color: #00d2ff;
      }
      .time-btn .underline {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%);
        border-radius: 2px;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .time-btn.active .underline {
        width: 60%;
      }
      .info-display {
        position: fixed;
        top: 24px;
        right: 24px;
        background: rgba(26, 26, 46, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 12px;
        padding: 16px 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 100;
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        color: white;
        min-width: 160px;
      }
      .info-display.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .info-display .period-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 4px;
        font-weight: 500;
      }
      .info-display .period-name {
        font-size: 20px;
        font-weight: 600;
        background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 8px;
      }
      .info-display .avg-temp {
        display: flex;
        align-items: baseline;
        gap: 4px;
      }
      .info-display .avg-temp-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }
      .info-display .avg-temp-value {
        font-size: 24px;
        font-weight: 700;
        color: #ff9800;
      }
      .info-display .avg-temp-unit {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }
      .hint-text {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
        z-index: 100;
        background: rgba(26, 26, 46, 0.5);
        backdrop-filter: blur(10px);
        padding: 8px 16px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .hint-text kbd {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 12px;
        margin: 0 2px;
      }
    `;
    document.head.appendChild(style);
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'time-control-panel';

    this.timePeriods.forEach((period, index) => {
      const button = document.createElement('button');
      button.className = `time-btn ${index === this.activeIndex ? 'active' : ''}`;
      button.dataset.period = period.key;
      button.innerHTML = `
        ${period.label}
        <span class="underline"></span>
      `;

      button.addEventListener('click', () => {
        this.handlePeriodClick(period.key, index);
      });

      this.controlPanel?.appendChild(button);
    });

    this.container.appendChild(this.controlPanel);
  }

  private createInfoDisplay(): void {
    this.infoDisplay = document.createElement('div');
    this.infoDisplay.className = 'info-display';
    this.container.appendChild(this.infoDisplay);

    setTimeout(() => {
      this.infoDisplay?.classList.add('visible');
    }, 100);

    this.createHintText();
  }

  private createHintText(): void {
    const hint = document.createElement('div');
    hint.className = 'hint-text';
    hint.innerHTML = `
      <kbd>左键点击</kbd> 查看详情
      <kbd>右键拖拽</kbd> 旋转视角
      <kbd>滚轮</kbd> 缩放
    `;
    this.container.appendChild(hint);
  }

  private handlePeriodClick(period: TimePeriod, index: number): void {
    if (index === this.activeIndex) return;

    this.activeIndex = index;
    this.updateActiveButton();

    if (this.onPeriodChange) {
      this.onPeriodChange(period);
    }

    this.updateInfoDisplay();
  }

  private updateActiveButton(): void {
    const buttons = this.controlPanel?.querySelectorAll('.time-btn');
    buttons?.forEach((btn, index) => {
      if (index === this.activeIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private getPeriodName(period: string): string {
    const names: Record<string, string> = {
      morning: '早晨',
      noon: '中午',
      evening: '傍晚'
    };
    return names[period] || period;
  }

  public updateInfoDisplay(): void {
    if (!this.infoDisplay) return;

    const currentPeriod = this.heatmapManager.getCurrentPeriod();
    const avgTemp = this.heatmapManager.getAverageTemperature();

    this.infoDisplay.innerHTML = `
      <div class="period-label">当前时段</div>
      <div class="period-name">${this.getPeriodName(currentPeriod)}</div>
      <div class="avg-temp">
        <span class="avg-temp-label">平均温度</span>
        <span class="avg-temp-value">${avgTemp}</span>
        <span class="avg-temp-unit">°C</span>
      </div>
    `;

    this.infoDisplay.classList.remove('visible');
    void this.infoDisplay.offsetWidth;
    this.infoDisplay.classList.add('visible');
  }

  public setOnPeriodChange(callback: (period: string) => void): void {
    this.onPeriodChange = callback;
  }

  public dispose(): void {
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
    if (this.infoDisplay) {
      this.infoDisplay.remove();
      this.infoDisplay = null;
    }
    const hint = document.querySelector('.hint-text');
    if (hint) {
      hint.remove();
    }
  }
}
