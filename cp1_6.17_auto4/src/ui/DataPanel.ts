import type { Simulator, CityData, WeatherType } from '../data/Simulator';

const weatherLabels: Record<WeatherType, string> = {
  sunny: '晴',
  cloudy: '阴',
  rainy: '雨',
  snowy: '雪'
};

export class DataPanel {
  private container: HTMLDivElement;
  private simulator: Simulator;
  private timeValueEl: HTMLSpanElement;
  private densityValueEl: HTMLSpanElement;
  private timeSlider: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private weatherSelect: HTMLSelectElement;

  constructor(parent: HTMLElement, simulator: Simulator) {
    this.simulator = simulator;

    this.container = document.createElement('div');
    this.applyContainerStyles(this.container);

    this.container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 14px; font-weight: 600; color: #00D4FF; margin-bottom: 4px; letter-spacing: 1px;">
          CITY DATA
        </div>
        <div style="font-size: 11px; color: #6b7a99; opacity: 0.8;">实时数据控制面板</div>
      </div>
      <div style="margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="font-size: 12px; color: #a8b5cf;">时间</label>
          <span class="time-value" style="font-size: 13px; color: #FF6B35; font-weight: 600; font-family: monospace;">12:00</span>
        </div>
        <input type="range" class="time-slider" min="0" max="24" step="0.5" value="12" />
      </div>
      <div style="margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="font-size: 12px; color: #a8b5cf;">天气</label>
        </div>
        <select class="weather-select">
          <option value="sunny">晴</option>
          <option value="cloudy">阴</option>
          <option value="rainy">雨</option>
          <option value="snowy">雪</option>
        </select>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="font-size: 12px; color: #a8b5cf;">人口密度</label>
          <span class="density-value" style="font-size: 13px; color: #FF6B35; font-weight: 600; font-family: monospace;">50%</span>
        </div>
        <input type="range" class="density-slider" min="0" max="100" step="1" value="50" />
      </div>
    `;

    this.timeValueEl = this.container.querySelector('.time-value') as HTMLSpanElement;
    this.densityValueEl = this.container.querySelector('.density-value') as HTMLSpanElement;
    this.timeSlider = this.container.querySelector('.time-slider') as HTMLInputElement;
    this.densitySlider = this.container.querySelector('.density-slider') as HTMLInputElement;
    this.weatherSelect = this.container.querySelector('.weather-select') as HTMLSelectElement;

    this.styleInputs();
    this.bindEvents();
    this.updateDisplay(simulator.getData());

    parent.appendChild(this.container);
  }

  private applyContainerStyles(el: HTMLDivElement): void {
    el.style.position = 'absolute';
    el.style.top = '20px';
    el.style.left = '20px';
    el.style.width = '240px';
    el.style.padding = '20px';
    el.style.background = 'rgba(10, 14, 39, 0.75)';
    el.style.backdropFilter = 'blur(12px)';
    el.style.webkitBackdropFilter = 'blur(12px)';
    el.style.borderRadius = '12px';
    el.style.border = '1px solid rgba(0, 212, 255, 0.2)';
    el.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
    el.style.color = '#e0e8ff';
    el.style.zIndex = '100';
    el.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  private styleInputs(): void {
    const sliderStyle = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(0, 212, 255, 0.15);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    `;
    this.timeSlider.style.cssText = sliderStyle;
    this.densitySlider.style.cssText = sliderStyle;

    const thumbStyle = document.createElement('style');
    thumbStyle.textContent = `
      #app input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00D4FF;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
        transition: transform 0.15s;
      }
      #app input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      #app input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00D4FF;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
      }
    `;
    document.head.appendChild(thumbStyle);

    this.weatherSelect.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(0, 212, 255, 0.1);
      color: #e0e8ff;
      border: 1px solid rgba(0, 212, 255, 0.3);
      font-size: 13px;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s;
    `;
    this.weatherSelect.addEventListener('mouseenter', () => {
      this.weatherSelect.style.borderColor = 'rgba(0, 212, 255, 0.7)';
    });
    this.weatherSelect.addEventListener('mouseleave', () => {
      this.weatherSelect.style.borderColor = 'rgba(0, 212, 255, 0.3)';
    });
  }

  private bindEvents(): void {
    this.timeSlider.addEventListener('input', () => {
      const v = parseFloat(this.timeSlider.value);
      this.simulator.setTime(v);
    });
    this.densitySlider.addEventListener('input', () => {
      const v = parseFloat(this.densitySlider.value);
      this.simulator.setPopulationDensity(v);
    });
    this.weatherSelect.addEventListener('change', () => {
      this.simulator.setWeather(this.weatherSelect.value as WeatherType);
    });

    this.simulator.subscribe((data: CityData) => this.updateDisplay(data));
  }

  private updateDisplay(data: CityData): void {
    const hours = Math.floor(data.time);
    const minutes = Math.floor((data.time - hours) * 60);
    this.timeValueEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    this.timeSlider.value = data.time.toString();

    this.densityValueEl.textContent = `${Math.round(data.populationDensity)}%`;
    this.densitySlider.value = data.populationDensity.toString();

    this.weatherSelect.value = data.weather;
    (this.weatherSelect.options as any).forEach((opt: HTMLOptionElement) => {
      opt.style.background = '#0A0E27';
      opt.style.color = '#e0e8ff';
    });
  }
}
