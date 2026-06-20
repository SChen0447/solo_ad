import { ParticleSystem } from './particleSystem';

interface SliderExtras {
  _valueSpan: HTMLSpanElement;
  _formatValue: (v: string) => string;
  _sliderWrap: HTMLDivElement;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private panel: HTMLDivElement;
  private particleSystem: ParticleSystem;
  private countSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private pulseSlider: HTMLInputElement;
  private countValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;
  private pulseValue: HTMLSpanElement;
  private isExpanded: boolean;
  private isSmallScreen: boolean;
  private countBgTimeout: number | null;
  private speedBgTimeout: number | null;
  private pulseBgTimeout: number | null;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
    this.isExpanded = true;
    this.isSmallScreen = false;
    this.countBgTimeout = null;
    this.speedBgTimeout = null;
    this.pulseBgTimeout = null;

    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.left = '20px';
    this.container.style.bottom = '20px';
    this.container.style.zIndex = '1000';
    this.container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.container.style.color = '#fff';

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.textContent = '⚙';
    this.toggleBtn.style.display = 'none';
    this.toggleBtn.style.width = '48px';
    this.toggleBtn.style.height = '48px';
    this.toggleBtn.style.borderRadius = '50%';
    this.toggleBtn.style.border = '1px solid rgba(255,255,255,0.2)';
    this.toggleBtn.style.background = 'rgba(255,255,255,0.1)';
    this.toggleBtn.style.backdropFilter = 'blur(10px)';
    this.toggleBtn.style.color = '#fff';
    this.toggleBtn.style.fontSize = '22px';
    this.toggleBtn.style.cursor = 'pointer';
    this.toggleBtn.addEventListener('click', () => this.togglePanel());

    this.panel = document.createElement('div');
    this.panel.style.width = '280px';
    this.panel.style.padding = '20px';
    this.panel.style.borderRadius = '12px';
    this.panel.style.background = 'rgba(255,255,255,0.1)';
    this.panel.style.border = '1px solid rgba(255,255,255,0.2)';
    this.panel.style.backdropFilter = 'blur(10px)';
    (this.panel.style as any).webkitBackdropFilter = 'blur(10px)';

    const title = document.createElement('div');
    title.textContent = '星云参数控制';
    title.style.fontSize = '16px';
    title.style.fontWeight = '600';
    title.style.marginBottom = '16px';
    title.style.letterSpacing = '0.5px';
    this.panel.appendChild(title);

    const maxCount = this.getMaxCount();
    this.countValue = document.createElement('span');
    this.countSlider = this.createSlider('粒子数量', 500, maxCount, 100, 2000, (v) => `${v}`, this.countValue);
    this.speedValue = document.createElement('span');
    this.speedSlider = this.createSlider('旋转速度', 0, 0.1, 0.01, 0.02, (v) => `${Number(v).toFixed(2)} 弧度/秒`, this.speedValue);
    this.pulseValue = document.createElement('span');
    this.pulseSlider = this.createSlider('颜色脉动', 0, 10, 1, 5, (v) => `${v} 秒/周期`, this.pulseValue);

    this.container.appendChild(this.toggleBtn);
    this.container.appendChild(this.panel);
    document.body.appendChild(this.container);

    this.countSlider.addEventListener('input', () => this.onCountInput());
    this.speedSlider.addEventListener('input', () => this.onSpeedInput());
    this.pulseSlider.addEventListener('input', () => this.onPulseInput());

    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private getMaxCount(): number {
    return window.innerWidth < 768 ? 3000 : 5000;
  }

  private createSlider(
    labelText: string,
    min: number,
    max: number,
    step: number,
    value: number,
    formatValue: (v: string) => string,
    valueSpan: HTMLSpanElement
  ): HTMLInputElement {
    const row = document.createElement('div');
    row.style.marginBottom = '14px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '6px';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.fontSize = '13px';
    label.style.color = 'rgba(255,255,255,0.9)';

    valueSpan.textContent = formatValue(String(value));
    valueSpan.style.fontSize = '12px';
    valueSpan.style.color = 'rgba(255,255,255,0.7)';
    valueSpan.style.minWidth = '90px';
    valueSpan.style.textAlign = 'right';

    header.appendChild(label);
    header.appendChild(valueSpan);
    row.appendChild(header);

    const sliderWrap = document.createElement('div');
    sliderWrap.style.position = 'relative';
    sliderWrap.style.padding = '4px 0';
    sliderWrap.style.transition = 'background-color 0.15s ease';
    sliderWrap.style.borderRadius = '4px';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.width = '100%';
    slider.style.height = '24px';
    slider.style.appearance = 'none';
    slider.style.webkitAppearance = 'none';
    slider.style.background = 'transparent';
    slider.style.cursor = 'pointer';
    slider.style.position = 'relative';
    slider.style.zIndex = '2';
    slider.style.margin = '0';
    slider.style.padding = '0';

    const styleId = `slider-style-${Math.random().toString(36).slice(2, 9)}`;
    const style = document.createElement('style');
    style.textContent = `
      #${styleId}::-webkit-slider-runnable-track {
        height: 2px;
        background: rgba(255,255,255,0.4);
        border-radius: 1px;
      }
      #${styleId}::-moz-range-track {
        height: 2px;
        background: rgba(255,255,255,0.4);
        border-radius: 1px;
      }
      #${styleId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #fff;
        border-radius: 4px;
        cursor: pointer;
        margin-top: -6px;
        transition: transform 0.15s ease;
      }
      #${styleId}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      #${styleId}::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      #${styleId}::-moz-range-thumb:hover {
        transform: scale(1.2);
      }
    `;
    document.head.appendChild(style);
    slider.id = styleId;

    sliderWrap.appendChild(slider);
    row.appendChild(sliderWrap);
    this.panel.appendChild(row);

    const extras = slider as HTMLInputElement & SliderExtras;
    extras._valueSpan = valueSpan;
    extras._formatValue = formatValue;
    extras._sliderWrap = sliderWrap;

    return slider;
  }

  private computeBgColor(slider: HTMLInputElement): string {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const val = Number(slider.value);
    const ratio = (val - min) / (max - min);
    const hue = 200 + ratio * 130;
    return `hsla(${hue}, 80%, 60%, 0.12)`;
  }

  private scheduleBgUpdate(slider: HTMLInputElement, timeoutRef: { current: number | null }): void {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      const extras = slider as HTMLInputElement & SliderExtras;
      extras._sliderWrap.style.backgroundColor = this.computeBgColor(slider);
      timeoutRef.current = null;
    }, 50);
  }

  private onCountInput(): void {
    const extras = this.countSlider as HTMLInputElement & SliderExtras;
    const val = Number(this.countSlider.value);
    extras._valueSpan.textContent = extras._formatValue(String(val));
    this.particleSystem.setCount(val);
    const ref = { current: this.countBgTimeout };
    this.scheduleBgUpdate(this.countSlider, ref);
    this.countBgTimeout = ref.current;
  }

  private onSpeedInput(): void {
    const extras = this.speedSlider as HTMLInputElement & SliderExtras;
    const val = Number(this.speedSlider.value);
    extras._valueSpan.textContent = extras._formatValue(String(val));
    this.particleSystem.setRotationSpeed(val);
    const ref = { current: this.speedBgTimeout };
    this.scheduleBgUpdate(this.speedSlider, ref);
    this.speedBgTimeout = ref.current;
  }

  private onPulseInput(): void {
    const extras = this.pulseSlider as HTMLInputElement & SliderExtras;
    const val = Number(this.pulseSlider.value);
    extras._valueSpan.textContent = extras._formatValue(String(val));
    this.particleSystem.setColorPulseSpeed(val);
    const ref = { current: this.pulseBgTimeout };
    this.scheduleBgUpdate(this.pulseSlider, ref);
    this.pulseBgTimeout = ref.current;
  }

  private togglePanel(): void {
    this.isExpanded = !this.isExpanded;
    this.panel.style.display = this.isExpanded ? 'block' : 'none';
    this.toggleBtn.textContent = this.isExpanded ? '✕' : '⚙';
  }

  private checkResponsive(): void {
    const small = window.innerWidth < 768;
    if (small !== this.isSmallScreen) {
      this.isSmallScreen = small;
      if (small) {
        this.toggleBtn.style.display = 'block';
        this.panel.style.display = 'none';
        this.isExpanded = false;
        const newMax = 3000;
        this.countSlider.max = String(newMax);
        this.particleSystem.setMaxParticles(newMax);
        if (Number(this.countSlider.value) > newMax) {
          this.countSlider.value = String(newMax);
          const extras = this.countSlider as HTMLInputElement & SliderExtras;
          this.particleSystem.setCount(newMax);
          extras._valueSpan.textContent = extras._formatValue(String(newMax));
        }
      } else {
        this.toggleBtn.style.display = 'none';
        this.panel.style.display = 'block';
        this.isExpanded = true;
        this.countSlider.max = '5000';
        this.particleSystem.setMaxParticles(5000);
      }
    }
  }
}
