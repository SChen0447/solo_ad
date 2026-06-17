import { Simulation, SimulationStats, SimulationParams } from './simulation';

interface SliderConfig {
  key: keyof SimulationParams;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  format?: (v: number) => string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: 'foodSpawnInterval',
    label: '食物生成周期',
    min: 10,
    max: 30,
    step: 1,
    defaultValue: 15,
    unit: '秒',
  },
  {
    key: 'moveSpeed',
    label: '生物移动速度',
    min: 1,
    max: 5,
    step: 0.5,
    defaultValue: 2,
    unit: 'px/帧',
  },
  {
    key: 'mutationRate',
    label: '变异率',
    min: 0,
    max: 0.1,
    step: 0.005,
    defaultValue: 0.02,
    format: (v) => `${(v * 100).toFixed(1)}%`,
  },
];

interface SmoothValue {
  current: number;
  target: number;
  start: number;
  startTime: number;
  duration: number;
  transitioning: boolean;
}

export class UI {
  private simulation: Simulation;
  private container: HTMLElement;
  private infoPanel!: HTMLElement;
  private panelRedCount!: HTMLElement;
  private panelBlueCount!: HTMLElement;
  private panelGreenCount!: HTMLElement;
  private panelAvgEnergy!: HTMLElement;
  private panelElapsed!: HTMLElement;
  private sliderContainers: Map<keyof SimulationParams, HTMLElement> = new Map();
  private sliderInputs: Map<keyof SimulationParams, HTMLInputElement> = new Map();
  private valueDisplays: Map<keyof SimulationParams, HTMLElement> = new Map();
  private foodCountDisplay!: HTMLElement;
  private smoothValues: Map<keyof SimulationParams, SmoothValue> = new Map();
  private readonly SMOOTH_DURATION = 200;
  private lastFrameTime = performance.now();

  constructor(simulation: Simulation, container: HTMLElement) {
    this.simulation = simulation;
    this.container = container;
    this.build();
    this.initSmoothValues();
  }

  private build(): void {
    this.createInfoPanel();
    this.createControlPanel();
    this.injectStyles();
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'eco-info-panel';
    this.infoPanel.innerHTML = `
      <div class="eco-info-row"><span style="color:#ef4444;">●</span> 红色生物: <span class="eco-val" data-field="red">0</span></div>
      <div class="eco-info-row"><span style="color:#3b82f6;">●</span> 蓝色生物: <span class="eco-val" data-field="blue">0</span></div>
      <div class="eco-info-row"><span style="color:#22c55e;">●</span> 绿色生物: <span class="eco-val" data-field="green">0</span></div>
      <div class="eco-info-row">平均能量: <span class="eco-val" data-field="energy">0</span></div>
      <div class="eco-info-row">存活时间: <span class="eco-val" data-field="time">0</span>秒</div>
    `;
    this.container.appendChild(this.infoPanel);

    this.panelRedCount = this.infoPanel.querySelector('[data-field="red"]')!;
    this.panelBlueCount = this.infoPanel.querySelector('[data-field="blue"]')!;
    this.panelGreenCount = this.infoPanel.querySelector('[data-field="green"]')!;
    this.panelAvgEnergy = this.infoPanel.querySelector('[data-field="energy"]')!;
    this.panelElapsed = this.infoPanel.querySelector('[data-field="time"]')!;
  }

  private createControlPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'eco-control-panel';

    for (const cfg of SLIDERS) {
      const sliderWrap = document.createElement('div');
      sliderWrap.className = 'eco-slider-wrap';

      const labelRow = document.createElement('div');
      labelRow.className = 'eco-slider-label-row';

      const label = document.createElement('span');
      label.className = 'eco-slider-label';
      label.textContent = cfg.label;

      const valDisplay = document.createElement('span');
      valDisplay.className = 'eco-slider-value';
      valDisplay.textContent = this.formatValue(cfg, cfg.defaultValue);

      labelRow.appendChild(label);
      labelRow.appendChild(valDisplay);

      const input = document.createElement('input');
      input.type = 'range';
      input.className = 'eco-slider';
      input.min = String(cfg.min);
      input.max = String(cfg.max);
      input.step = String(cfg.step);
      input.value = String(cfg.defaultValue);

      sliderWrap.appendChild(labelRow);
      sliderWrap.appendChild(input);
      panel.appendChild(sliderWrap);

      this.sliderContainers.set(cfg.key, sliderWrap);
      this.sliderInputs.set(cfg.key, input);
      this.valueDisplays.set(cfg.key, valDisplay);

      input.addEventListener('input', () => {
        const value = parseFloat(input.value);
        this.setTargetValue(cfg.key, value);
      });
    }

    const foodDisplayWrap = document.createElement('div');
    foodDisplayWrap.className = 'eco-food-display';
    const foodLabel = document.createElement('span');
    foodLabel.className = 'eco-food-label';
    foodLabel.textContent = '食物总数';
    this.foodCountDisplay = document.createElement('span');
    this.foodCountDisplay.className = 'eco-food-count';
    this.foodCountDisplay.textContent = '30';
    foodDisplayWrap.appendChild(foodLabel);
    foodDisplayWrap.appendChild(this.foodCountDisplay);
    panel.appendChild(foodDisplayWrap);

    this.container.appendChild(panel);
  }

  private initSmoothValues(): void {
    for (const cfg of SLIDERS) {
      this.smoothValues.set(cfg.key, {
        current: cfg.defaultValue,
        target: cfg.defaultValue,
        start: cfg.defaultValue,
        startTime: 0,
        duration: this.SMOOTH_DURATION,
        transitioning: false,
      });
    }
    this.applyParams();
  }

  private setTargetValue(key: keyof SimulationParams, value: number): void {
    const sv = this.smoothValues.get(key)!;
    sv.target = value;
    sv.start = sv.current;
    sv.startTime = performance.now();
    sv.transitioning = true;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  update(): void {
    const now = performance.now();

    let needsApply = false;
    for (const cfg of SLIDERS) {
      const sv = this.smoothValues.get(cfg.key)!;
      if (sv.transitioning) {
        const elapsed = now - sv.startTime;
        const t = Math.min(1, elapsed / sv.duration);
        const eased = this.easeOutCubic(t);
        sv.current = sv.start + (sv.target - sv.start) * eased;

        if (t >= 1) {
          sv.current = sv.target;
          sv.transitioning = false;
        }
        needsApply = true;
        this.updateValueDisplay(cfg, sv.current);
      }
    }

    if (needsApply) {
      this.applyParams();
    }

    this.lastFrameTime = now;
  }

  private applyParams(): void {
    const params: Partial<SimulationParams> = {};
    for (const cfg of SLIDERS) {
      const sv = this.smoothValues.get(cfg.key)!;
      params[cfg.key] = sv.current;
    }
    this.simulation.setParams(params);
  }

  private formatValue(cfg: SliderConfig, value: number): string {
    if (cfg.format) {
      return cfg.format(value);
    }
    let display = value.toFixed(cfg.step < 1 ? 1 : 0);
    if (cfg.unit) {
      display += cfg.unit;
    }
    return display;
  }

  private updateValueDisplay(cfg: SliderConfig, value: number): void {
    const display = this.valueDisplays.get(cfg.key);
    if (display) {
      display.textContent = this.formatValue(cfg, value);
    }
  }

  updateStats(stats: SimulationStats): void {
    this.panelRedCount.textContent = String(stats.redCount);
    this.panelBlueCount.textContent = String(stats.blueCount);
    this.panelGreenCount.textContent = String(stats.greenCount);
    this.panelAvgEnergy.textContent = stats.averageEnergy.toFixed(1);
    this.panelElapsed.textContent = stats.elapsedTime.toFixed(0);
    this.foodCountDisplay.textContent = String(stats.foodCount);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .eco-info-panel {
        position: absolute;
        top: 58px;
        left: calc(50% - 510px);
        background: rgba(0, 0, 0, 0.55);
        border-radius: 8px;
        padding: 8px;
        font-size: 12px;
        color: #ffffff;
        line-height: 1.7;
        z-index: 10;
        transition: transform 0.15s ease, background-color 0.15s ease;
        transform-origin: top left;
        pointer-events: auto;
        min-width: 140px;
      }
      .eco-info-panel:hover {
        transform: scale(1.1);
        background: rgba(0, 0, 0, 0.8);
      }
      .eco-info-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .eco-info-row .eco-val {
        font-weight: 600;
        min-width: 40px;
        text-align: right;
      }

      .eco-control-panel {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 80px;
        background: #4e342e;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 36px;
        padding: 0 28px;
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
      }
      .eco-slider-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 200px;
      }
      .eco-slider-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #fff;
        font-size: 12px;
      }
      .eco-slider-label {
        font-weight: 500;
      }
      .eco-slider-value {
        font-weight: 600;
        color: #c5e1a5;
        min-width: 56px;
        text-align: right;
      }

      .eco-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, #8bc34a 0%, #558b2f 100%);
        outline: none;
        cursor: pointer;
      }
      .eco-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid #cccccc;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        transition: transform 0.1s ease;
      }
      .eco-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      .eco-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid #cccccc;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      .eco-food-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding-left: 20px;
        border-left: 1px solid rgba(255, 255, 255, 0.15);
      }
      .eco-food-label {
        color: #fff;
        font-size: 12px;
        font-weight: 500;
      }
      .eco-food-count {
        color: #ff8a65;
        font-size: 20px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
      }
    `;
    document.head.appendChild(style);
  }
}
