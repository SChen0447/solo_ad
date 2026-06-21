import { eventBus, EVENTS, ColorTheme, THEME_COLORS, THEME_TRACK_COLORS } from '@/utils/EventBus';

const THEME_NAMES: Record<ColorTheme, string> = {
  aurora: '极光',
  lava: '熔岩',
  starry: '星空',
  neon: '霓虹'
};

export class ControlPanel {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  private header: HTMLDivElement;
  private content: HTMLDivElement;
  private collapseBtn!: HTMLButtonElement;
  private isCollapsed: boolean = false;

  private densitySlider: HTMLDivElement;
  private densityValue: HTMLSpanElement;
  private gravitySlider: HTMLDivElement;
  private gravityValue: HTMLSpanElement;
  private dampingSlider: HTMLDivElement;
  private dampingValue: HTMLSpanElement;

  private themeButtons: HTMLButtonElement[] = [];
  private autoRotateBtn!: HTMLButtonElement;
  private isAutoRotate: boolean = false;

  private currentTheme: ColorTheme = 'aurora';
  private trackColor: string = THEME_TRACK_COLORS.aurora;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      width: 300px;
    `;

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      background: #1E1E2E;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease-out;
      overflow: hidden;
    `;

    this.header = this.createHeader();
    this.content = document.createElement('div');
    this.content.style.cssText = `
      transition: max-height 0.3s ease-out, opacity 0.3s ease-out, margin 0.3s ease-out;
      overflow: hidden;
      max-height: 2000px;
      opacity: 1;
    `;

    this.densitySlider = this.createSlider('粒子密度', 5000, 20000, 500, 8000, (v) => {
      this.densityValue.textContent = v.toString();
    });
    this.densityValue = this.densitySlider.querySelector('.value') as HTMLSpanElement;

    this.gravitySlider = this.createSlider('引力量级', 0, 5, 0.1, 1.5, (v) => {
      this.gravityValue.textContent = v.toFixed(1);
    });
    this.gravityValue = this.gravitySlider.querySelector('.value') as HTMLSpanElement;

    this.dampingSlider = this.createSlider('速度阻尼', 0.9, 1.0, 0.01, 0.995, (v) => {
      this.dampingValue.textContent = v.toFixed(3);
    });
    this.dampingValue = this.dampingSlider.querySelector('.value') as HTMLSpanElement;

    const themeSection = this.createThemeSection();
    const autoRotateSection = this.createAutoRotateSection();

    this.content.appendChild(this.densitySlider);
    this.content.appendChild(this.gravitySlider);
    this.content.appendChild(this.dampingSlider);
    this.content.appendChild(themeSection);
    this.content.appendChild(autoRotateSection);

    this.panel.appendChild(this.header);
    this.panel.appendChild(this.content);
    this.container.appendChild(this.panel);

    this.setupEventListeners();
    this.injectStyles();
    this.updateSliderTrackColors();
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    `;

    const title = document.createElement('h2');
    title.textContent = '星系控制台';
    title.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.5px;
    `;

    this.collapseBtn = document.createElement('button');
    this.collapseBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    this.collapseBtn.style.cssText = `
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    this.collapseBtn.addEventListener('mouseenter', () => {
      this.collapseBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      this.collapseBtn.style.color = '#ffffff';
    });
    this.collapseBtn.addEventListener('mouseleave', () => {
      this.collapseBtn.style.background = 'transparent';
      this.collapseBtn.style.color = 'rgba(255, 255, 255, 0.6)';
    });
    this.collapseBtn.addEventListener('click', () => this.toggleCollapse());

    header.appendChild(title);
    header.appendChild(this.collapseBtn);
    return header;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    onInput: (value: number) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.style.cssText = `
      margin-bottom: 24px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      font-weight: 500;
    `;

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = step >= 1 ? defaultValue.toString() : defaultValue.toFixed(step < 0.1 ? 3 : 1);
    valueEl.style.cssText = `
      color: ${this.trackColor};
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    `;

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();
    slider.className = 'custom-slider';
    slider.style.cssText = `
      width: 100%;
      height: 24px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
    `;

    const eventMap: Record<string, string> = {
      '粒子密度': EVENTS.DENSITY_CHANGED,
      '引力量级': EVENTS.GRAVITY_CHANGED,
      '速度阻尼': EVENTS.DAMPING_CHANGED
    };

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      onInput(value);
      valueEl.style.color = this.trackColor;
      const eventName = eventMap[label];
      if (eventName) {
        eventBus.emit(eventName, value);
      }
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    return wrapper;
  }

  private createThemeSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 24px;
    `;

    const label = document.createElement('label');
    label.textContent = '颜色主题';
    label.style.cssText = `
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      font-weight: 500;
      display: block;
      margin-bottom: 12px;
    `;

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    `;

    const themes: ColorTheme[] = ['aurora', 'lava', 'starry', 'neon'];

    themes.forEach((theme) => {
      const colors = THEME_COLORS[theme];
      const btn = document.createElement('button');
      btn.textContent = THEME_NAMES[theme];
      btn.dataset.theme = theme;
      btn.style.cssText = `
        height: 36px;
        border: none;
        border-radius: 16px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 0 16px;
        background: linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]});
        transition: all 0.2s;
        opacity: 0.7;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      `;

      if (theme === this.currentTheme) {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.02)';
        btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
      }

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.theme !== this.currentTheme) {
          btn.style.opacity = '0.9';
        }
        btn.style.transform = 'scale(1.02)';
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.theme !== this.currentTheme) {
          btn.style.opacity = '0.7';
        }
        btn.style.transform = btn.dataset.theme === this.currentTheme ? 'scale(1.02)' : 'scale(1)';
      });

      btn.addEventListener('click', () => {
        this.setTheme(theme);
      });

      this.themeButtons.push(btn);
      btnContainer.appendChild(btn);
    });

    section.appendChild(label);
    section.appendChild(btnContainer);
    return section;
  }

  private createAutoRotateSection(): HTMLDivElement {
    const section = document.createElement('div');

    this.autoRotateBtn = document.createElement('button');
    this.updateAutoRotateBtnStyle();
    this.autoRotateBtn.textContent = '自动旋转：关';
    this.autoRotateBtn.style.cssText += `
      width: 100%;
      height: 40px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: all 0.2s;
    `;

    this.autoRotateBtn.addEventListener('click', () => {
      this.isAutoRotate = !this.isAutoRotate;
      this.autoRotateBtn.textContent = `自动旋转：${this.isAutoRotate ? '开' : '关'}`;
      this.updateAutoRotateBtnStyle();
      eventBus.emit(EVENTS.AUTO_ROTATE_CHANGED, this.isAutoRotate);
    });

    this.autoRotateBtn.addEventListener('mouseenter', () => {
      if (this.isAutoRotate) {
        this.autoRotateBtn.style.filter = 'brightness(1.1)';
      } else {
        this.autoRotateBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      }
    });
    this.autoRotateBtn.addEventListener('mouseleave', () => {
      this.updateAutoRotateBtnStyle();
    });

    section.appendChild(this.autoRotateBtn);
    return section;
  }

  private updateAutoRotateBtnStyle(): void {
    if (this.isAutoRotate) {
      this.autoRotateBtn.style.background = `linear-gradient(135deg, ${THEME_COLORS[this.currentTheme][0]}, ${THEME_COLORS[this.currentTheme][2]})`;
      this.autoRotateBtn.style.color = '#ffffff';
      this.autoRotateBtn.style.border = 'none';
      this.autoRotateBtn.style.filter = 'brightness(1)';
    } else {
      this.autoRotateBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      this.autoRotateBtn.style.color = 'rgba(255, 255, 255, 0.85)';
      this.autoRotateBtn.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      this.autoRotateBtn.style.filter = 'none';
    }
  }

  private setTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme) return;

    this.currentTheme = theme;
    this.trackColor = THEME_TRACK_COLORS[theme];

    this.themeButtons.forEach((btn) => {
      if (btn.dataset.theme === theme) {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.02)';
        btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
      } else {
        btn.style.opacity = '0.7';
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
      }
    });

    this.updateSliderTrackColors();
    this.updateAutoRotateBtnStyle();
    eventBus.emit(EVENTS.THEME_CHANGED, theme);
  }

  private updateSliderTrackColors(): void {
    const values = this.container.querySelectorAll('.value');
    values.forEach((v) => {
      (v as HTMLSpanElement).style.color = this.trackColor;
    });
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      this.content.style.maxHeight = '0px';
      this.content.style.opacity = '0';
      this.content.style.marginTop = '-20px';
      this.content.style.marginBottom = '0px';
      this.panel.style.padding = '10px 20px';
      this.collapseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;

      this.setControlsDisabled(true);

      setTimeout(() => {
        if (this.isCollapsed) {
          this.content.style.visibility = 'hidden';
          this.content.style.pointerEvents = 'none';
        }
      }, 300);
    } else {
      this.content.style.visibility = 'visible';
      this.content.style.pointerEvents = 'auto';
      this.content.style.maxHeight = '2000px';
      this.content.style.opacity = '1';
      this.content.style.marginTop = '0';
      this.content.style.marginBottom = '0';
      this.panel.style.padding = '20px';
      this.collapseBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
      `;

      this.setControlsDisabled(false);
    }
  }

  private setControlsDisabled(disabled: boolean): void {
    const inputs = this.content.querySelectorAll('input');
    inputs.forEach((input) => {
      (input as HTMLInputElement).disabled = disabled;
    });

    const buttons = this.content.querySelectorAll('button');
    buttons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = disabled;
    });
  }

  private setupEventListeners(): void {
    eventBus.on(EVENTS.THEME_CHANGED, (theme: ColorTheme) => {
      if (theme !== this.currentTheme) {
        this.setTheme(theme);
      }
    });
  }

  private injectStyles(): void {
    const styleId = 'control-panel-slider-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .custom-slider::-webkit-slider-runnable-track {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, ${this.trackColor} 0%, ${this.trackColor} var(--progress, 50%), rgba(255,255,255,0.15) var(--progress, 50%), rgba(255,255,255,0.15) 100%);
      }
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        margin-top: -9px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: transform 0.15s;
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .custom-slider::-webkit-slider-thumb:active {
        transform: scale(0.95);
      }
      .custom-slider::-moz-range-track {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.15);
      }
      .custom-slider::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);

    this.updateSliderProgress();

    const sliders = this.container.querySelectorAll('.custom-slider');
    sliders.forEach((slider) => {
      slider.addEventListener('input', () => this.updateSliderProgress());
    });
  }

  private updateSliderProgress(): void {
    const sliders = this.container.querySelectorAll('.custom-slider');
    sliders.forEach((sliderEl) => {
      const slider = sliderEl as HTMLInputElement;
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const val = parseFloat(slider.value);
      const progress = ((val - min) / (max - min)) * 100;
      slider.style.setProperty('--progress', `${progress}%`);
    });
  }

  mount(parent: HTMLElement = document.body): void {
    parent.appendChild(this.container);
    requestAnimationFrame(() => {
      this.updateSliderProgress();
    });
  }

  unmount(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
