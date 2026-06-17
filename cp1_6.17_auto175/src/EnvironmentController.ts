import {
  EnvironmentParams,
  EcosystemMetrics,
  DEFAULT_ENVIRONMENT,
  clamp
} from './types';

export class EnvironmentController {
  private container: HTMLElement;
  private onParamsChange: (params: EnvironmentParams) => void;
  private currentParams: EnvironmentParams = { ...DEFAULT_ENVIRONMENT };

  private lightSlider!: HTMLInputElement;
  private rainSlider!: HTMLInputElement;
  private windSlider!: HTMLInputElement;
  private tempSlider!: HTMLInputElement;

  private lightValue!: HTMLElement;
  private rainValue!: HTMLElement;
  private windValue!: HTMLElement;
  private tempValue!: HTMLElement;

  private healthValue!: HTMLElement;
  private healthFill!: HTMLElement;
  private biodiversityValue!: HTMLElement;
  private biodiversityFill!: HTMLElement;
  private growthValue!: HTMLElement;
  private growthFill!: HTMLElement;
  private humidityValue!: HTMLElement;
  private treeCountValue!: HTMLElement;

  private resetBtn!: HTMLButtonElement;

  private changeTimeout: number | null = null;
  private readonly DEBOUNCE_MS = 80;

  constructor(container: HTMLElement, onParamsChange: (params: EnvironmentParams) => void) {
    this.container = container;
    this.onParamsChange = onParamsChange;
    this.initializeElements();
    this.bindEvents();
    this.updateSliderVisuals();
    this.updateTempGradient();
  }

  private initializeElements(): void {
    this.lightSlider = this.container.querySelector('#light-slider') as HTMLInputElement;
    this.rainSlider = this.container.querySelector('#rain-slider') as HTMLInputElement;
    this.windSlider = this.container.querySelector('#wind-slider') as HTMLInputElement;
    this.tempSlider = this.container.querySelector('#temp-slider') as HTMLInputElement;

    this.lightValue = this.container.querySelector('#light-value') as HTMLElement;
    this.rainValue = this.container.querySelector('#rain-value') as HTMLElement;
    this.windValue = this.container.querySelector('#wind-value') as HTMLElement;
    this.tempValue = this.container.querySelector('#temp-value') as HTMLElement;

    this.healthValue = this.container.querySelector('#health-value') as HTMLElement;
    this.healthFill = this.container.querySelector('#health-fill') as HTMLElement;
    this.biodiversityValue = this.container.querySelector('#biodiversity-value') as HTMLElement;
    this.biodiversityFill = this.container.querySelector('#biodiversity-fill') as HTMLElement;
    this.growthValue = this.container.querySelector('#growth-value') as HTMLElement;
    this.growthFill = this.container.querySelector('#growth-fill') as HTMLElement;
    this.humidityValue = this.container.querySelector('#humidity-value') as HTMLElement;
    this.treeCountValue = this.container.querySelector('#tree-count-value') as HTMLElement;

    this.resetBtn = this.container.querySelector('#reset-btn') as HTMLButtonElement;
  }

  private bindEvents(): void {
    const handleSliderInput = () => {
      this.readSliderValues();
      this.updateSliderVisuals();
      this.updateTempGradient();
      this.updateDisplayValues();
      this.scheduleChange();
    };

    this.lightSlider.addEventListener('input', handleSliderInput);
    this.rainSlider.addEventListener('input', handleSliderInput);
    this.windSlider.addEventListener('input', handleSliderInput);
    this.tempSlider.addEventListener('input', handleSliderInput);

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefault();
    });

    [this.lightSlider, this.rainSlider, this.windSlider, this.tempSlider, this.resetBtn].forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.setGlowOutline(el, true);
      });
      el.addEventListener('mouseleave', () => {
        this.setGlowOutline(el, false);
      });
      el.addEventListener('focus', () => {
        this.setGlowOutline(el, true);
      });
      el.addEventListener('blur', () => {
        this.setGlowOutline(el, false);
      });
    });
  }

  private setGlowOutline(el: Element, active: boolean): void {
    const htmlEl = el as HTMLElement;
    if (active) {
      const color = this.getDominantColor();
      htmlEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
      htmlEl.style.boxShadow = `0 0 16px ${color}66, 0 0 0 1px ${color}99`;
    } else {
      htmlEl.style.boxShadow = '';
    }
  }

  private getDominantColor(): string {
    const t = this.currentParams.temp;
    if (t < 5) return '#1E90FF';
    if (t > 30) return '#FF8C00';
    return '#66BB6A';
  }

  private readSliderValues(): void {
    this.currentParams = {
      light: parseInt(this.lightSlider.value, 10),
      rain: parseInt(this.rainSlider.value, 10),
      wind: parseInt(this.windSlider.value, 10),
      temp: parseInt(this.tempSlider.value, 10)
    };
  }

  private updateSliderVisuals(): void {
    this.setSliderProgress(this.lightSlider, this.currentParams.light, 0, 100);
    this.setSliderProgress(this.rainSlider, this.currentParams.rain, 0, 100);
    this.setSliderProgress(this.windSlider, this.currentParams.wind, 0, 100);
    this.setSliderProgress(this.tempSlider, this.currentParams.temp, -10, 40);
  }

  private setSliderProgress(slider: HTMLInputElement, value: number, min: number, max: number): void {
    const progress = ((value - min) / (max - min)) * 100;
    slider.style.setProperty('--slider-progress', `${progress}%`);
  }

  private updateTempGradient(): void {
    const tempNorm = clamp((this.currentParams.temp + 10) / 50, 0, 1);
    const coldColor = new RGB(30, 144, 255);
    const warmColor = new RGB(255, 140, 0);
    const mixed = coldColor.lerp(warmColor, tempNorm);
    const cssColor = `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;

    const controlPanel = this.container.querySelector('#control-panel') as HTMLElement;
    if (controlPanel) {
      controlPanel.style.background = `linear-gradient(160deg, rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0.14) 0%, rgba(13, 27, 42, 0.2) 100%)`;
      controlPanel.style.borderColor = `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0.25)`;
    }

    this.tempSlider.style.setProperty('--slider-fill-color', cssColor);
    this.tempSlider.style.setProperty('--slider-glow-color', `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, 0.5)`);
  }

  private updateDisplayValues(): void {
    this.lightValue.textContent = `${this.currentParams.light}%`;
    this.rainValue.textContent = `${this.currentParams.rain}%`;
    this.windValue.textContent = `${this.currentParams.wind}%`;
    this.tempValue.textContent = `${this.currentParams.temp}°C`;
  }

  private scheduleChange(): void {
    if (this.changeTimeout !== null) {
      window.clearTimeout(this.changeTimeout);
    }
    this.changeTimeout = window.setTimeout(() => {
      this.onParamsChange({ ...this.currentParams });
      this.changeTimeout = null;
    }, this.DEBOUNCE_MS);
  }

  public updateMetrics(metrics: EcosystemMetrics): void {
    this.healthValue.textContent = `${metrics.healthIndex}`;
    this.healthFill.style.width = `${metrics.healthIndex}%`;

    this.biodiversityValue.textContent = `${metrics.biodiversity}`;
    this.biodiversityFill.style.width = `${metrics.biodiversity}%`;

    this.growthValue.textContent = `${metrics.growthActivity}`;
    this.growthFill.style.width = `${metrics.growthActivity}%`;

    this.humidityValue.innerHTML = `${metrics.humidity}<small>%</small>`;
    this.treeCountValue.textContent = `${metrics.treeCount}`;
  }

  public resetToDefault(): void {
    this.currentParams = { ...DEFAULT_ENVIRONMENT };

    this.lightSlider.value = String(DEFAULT_ENVIRONMENT.light);
    this.rainSlider.value = String(DEFAULT_ENVIRONMENT.rain);
    this.windSlider.value = String(DEFAULT_ENVIRONMENT.wind);
    this.tempSlider.value = String(DEFAULT_ENVIRONMENT.temp);

    this.updateSliderVisuals();
    this.updateTempGradient();
    this.updateDisplayValues();
    this.onParamsChange({ ...this.currentParams });
  }

  public getCurrentParams(): EnvironmentParams {
    return { ...this.currentParams };
  }
}

class RGB {
  constructor(public r: number, public g: number, public b: number) {}

  lerp(other: RGB, t: number): RGB {
    return new RGB(
      Math.round(this.r + (other.r - this.r) * t),
      Math.round(this.g + (other.g - this.g) * t),
      Math.round(this.b + (other.b - this.b) * t)
    );
  }
}
