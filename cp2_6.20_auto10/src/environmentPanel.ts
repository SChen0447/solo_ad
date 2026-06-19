export interface EnvironmentParams {
  light: number;
  moisture: number;
  temperature: number;
}

export type ParamsChangeListener = (params: EnvironmentParams) => void;

export class EnvironmentPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private lightSlider: HTMLInputElement;
  private moistureSlider: HTMLInputElement;
  private tempSlider: HTMLInputElement;
  private lightValue: HTMLElement;
  private moistureValue: HTMLElement;
  private tempValue: HTMLElement;
  private toggleBtn: HTMLElement | null = null;
  private listeners: ParamsChangeListener[] = [];
  private params: EnvironmentParams = { light: 60, moisture: 70, temperature: 25 };
  private pendingRAF: number | null = null;
  private panelVisible = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.panel = document.createElement('div');
    this.lightSlider = document.createElement('input');
    this.moistureSlider = document.createElement('input');
    this.tempSlider = document.createElement('input');
    this.lightValue = document.createElement('span');
    this.moistureValue = document.createElement('span');
    this.tempValue = document.createElement('span');
    this.build();
    this.handleResponsive();
    window.addEventListener('resize', () => this.handleResponsive());
  }

  public addChangeListener(listener: ParamsChangeListener): void {
    this.listeners.push(listener);
    listener({ ...this.params });
  }

  public getParams(): EnvironmentParams {
    return { ...this.params };
  }

  private build(): void {
    this.panel.className = 'env-panel';
    Object.assign(this.panel.style, {
      position: 'fixed',
      left: '20px',
      top: '100px',
      width: '280px',
      padding: '24px 20px',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      zIndex: '100',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
    } as unknown as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = '环境参数控制';
    Object.assign(title.style, {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '20px',
      letterSpacing: '0.5px',
      color: 'rgba(255,255,255,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      paddingBottom: '12px',
    } as unknown as CSSStyleDeclaration);
    this.panel.appendChild(title);

    this.panel.appendChild(this.createSliderGroup(
      'light', '☀️ 光照强度', 0, 100, 60, '%',
      this.lightSlider, this.lightValue
    ));
    this.panel.appendChild(this.createSliderGroup(
      'moisture', '💧 水分含量', 0, 100, 70, '%',
      this.moistureSlider, this.moistureValue
    ));
    this.panel.appendChild(this.createSliderGroup(
      'temperature', '🌡️ 温度', 10, 40, 25, '°C',
      this.tempSlider, this.tempValue
    ));

    this.injectSliderStyles();
    this.container.appendChild(this.panel);

    this.lightSlider.addEventListener('input', () => this.emitChange());
    this.moistureSlider.addEventListener('input', () => this.emitChange());
    this.tempSlider.addEventListener('input', () => this.emitChange());
  }

  private createSliderGroup(
    key: string,
    labelText: string,
    min: number,
    max: number,
    defaultValue: number,
    unit: string,
    slider: HTMLInputElement,
    valueSpan: HTMLElement
  ): HTMLElement {
    const group = document.createElement('div');
    Object.assign(group.style, {
      marginBottom: '22px',
    } as unknown as CSSStyleDeclaration);

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      fontSize: '14px',
    } as unknown as CSSStyleDeclaration);

    const label = document.createElement('span');
    label.textContent = labelText;
    Object.assign(label.style, {
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
    } as unknown as CSSStyleDeclaration);

    Object.assign(valueSpan.style, {
      color: '#f1c40f',
      fontWeight: '600',
      minWidth: '52px',
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
    } as unknown as CSSStyleDeclaration);
    valueSpan.textContent = `${defaultValue}${unit}`;
    valueSpan.dataset.unit = unit;
    valueSpan.dataset.key = key;

    header.appendChild(label);
    header.appendChild(valueSpan);

    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = key === 'temperature' ? '0.5' : '1';
    slider.value = String(defaultValue);
    slider.className = 'custom-slider';
    Object.assign(slider.style, {
      width: '100%',
      cursor: 'pointer',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'transparent',
      height: '28px',
      margin: '0',
      padding: '0',
    } as unknown as CSSStyleDeclaration);

    const addBounceAnim = (el: HTMLElement) => {
      const events: { type: string; scale: string }[] = [
        { type: 'mouseenter', scale: '1.05' },
        { type: 'mouseleave', scale: '1' },
      ];
      events.forEach(({ type, scale }) => {
        el.addEventListener(type, () => {
          el.style.transition = 'transform 0.1s ease';
          el.style.transform = `scale(${scale})`;
          if (type === 'mouseenter') {
            el.style.filter = 'brightness(1.1)';
          } else {
            el.style.filter = '';
          }
        });
      });
      el.addEventListener('mousedown', () => {
        el.animate(
          [
            { transform: 'scale(0.95)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' },
          ],
          { duration: 150, easing: 'ease-out' }
        );
      });
    };
    addBounceAnim(slider);

    group.appendChild(header);
    group.appendChild(slider);
    return group;
  }

  private emitChange(): void {
    this.params = {
      light: Number(this.lightSlider.value),
      moisture: Number(this.moistureSlider.value),
      temperature: Number(this.tempSlider.value),
    };
    this.lightValue.textContent = `${this.params.light}${this.lightValue.dataset.unit}`;
    this.moistureValue.textContent = `${this.params.moisture}${this.moistureValue.dataset.unit}`;
    this.tempValue.textContent = `${this.params.temperature}${this.tempValue.dataset.unit}`;
    this.updateSliderGradients();
    if (this.pendingRAF !== null) cancelAnimationFrame(this.pendingRAF);
    this.pendingRAF = requestAnimationFrame(() => {
      this.pendingRAF = null;
      const snapshot = { ...this.params };
      this.listeners.forEach(l => l(snapshot));
    });
  }

  private updateSliderGradients(): void {
    const apply = (slider: HTMLInputElement) => {
      const min = Number(slider.min);
      const max = Number(slider.max);
      const v = (Number(slider.value) - min) / (max - min);
      const pct = Math.round(v * 100);
      slider.style.background =
        `linear-gradient(to right, #3498db ${pct}%, rgba(255,255,255,0.15) ${pct}%)`;
    };
    apply(this.lightSlider);
    apply(this.moistureSlider);
    apply(this.tempSlider);
  }

  private injectSliderStyles(): void {
    if (document.getElementById('env-panel-slider-styles')) return;
    const style = document.createElement('style');
    style.id = 'env-panel-slider-styles';
    style.textContent = `
      .custom-slider {
        -webkit-appearance: none;
        appearance: none;
        height: 6px !important;
        border-radius: 3px;
        outline: none;
        padding: 0 !important;
        margin: 8px 0 !important;
      }
      .custom-slider::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: 3px;
        background: transparent;
      }
      .custom-slider::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: transparent;
      }
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffffff;
        border: none;
        cursor: pointer;
        margin-top: -6px;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.2), 0 3px 8px rgba(0,0,0,0.4);
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 0 0 2px rgba(241,196,15,0.5), 0 3px 12px rgba(0,0,0,0.5);
      }
      .custom-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #ffffff;
        border: none;
        cursor: pointer;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.2), 0 3px 8px rgba(0,0,0,0.4);
      }
    `;
    document.head.appendChild(style);
    this.updateSliderGradients();
  }

  private handleResponsive(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      this.panelVisible = false;
      this.panel.style.transform = 'translateX(-320px)';
      this.panel.style.opacity = '0';
      this.panel.style.pointerEvents = 'none';
      if (!this.toggleBtn) this.createToggleButton();
    } else {
      this.panelVisible = true;
      this.panel.style.transform = 'translateX(0)';
      this.panel.style.opacity = '1';
      this.panel.style.pointerEvents = '';
      if (this.toggleBtn) {
        this.toggleBtn.remove();
        this.toggleBtn = null;
      }
    }
  }

  private createToggleButton(): void {
    this.toggleBtn = document.createElement('button');
    Object.assign(this.toggleBtn.style, {
      position: 'fixed',
      top: '24px',
      left: '16px',
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      color: '#fff',
      fontSize: '20px',
      cursor: 'pointer',
      zIndex: '101',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'transform 0.1s ease',
    } as unknown as CSSStyleDeclaration);
    this.toggleBtn.textContent = '⚙️';
    this.toggleBtn.addEventListener('click', () => {
      this.panelVisible = !this.panelVisible;
      if (this.panelVisible) {
        this.panel.style.transform = 'translateX(0)';
        this.panel.style.opacity = '1';
        this.panel.style.pointerEvents = '';
        this.panel.style.top = '80px';
      } else {
        this.panel.style.transform = 'translateX(-320px)';
        this.panel.style.opacity = '0';
        this.panel.style.pointerEvents = 'none';
      }
    });
    this.container.appendChild(this.toggleBtn);
  }
}
