export interface ControlParams {
  waterClarity: number;
  causticsIntensity: number;
  fishActivity: number;
}

interface ControlPanelOptions {
  onParamsChange: (params: ControlParams) => void;
  onResetView: () => void;
  onRandomizeCreatures: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private params: ControlParams = {
    waterClarity: 0.5,
    causticsIntensity: 0.6,
    fishActivity: 0.5,
  };
  private options: ControlPanelOptions;

  constructor(options: ControlPanelOptions) {
    this.options = options;
    this.container = document.createElement('div');
    this.createPanel();
    document.body.appendChild(this.container);
  }

  private createPanel(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 240px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #ffffff;
      backdrop-filter: blur(10px);
      z-index: 1000;
      user-select: none;
    `;

    const title = document.createElement('h2');
    title.textContent = '控制面板';
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #e2e8f0;
    `;
    this.container.appendChild(title);

    this.createSlider('水清晰度', 'waterClarity', 0.1, 1.0, 0.05, this.params.waterClarity);
    this.createSlider('焦散光强度', 'causticsIntensity', 0.0, 1.0, 0.01, this.params.causticsIntensity);
    this.createSlider('鱼群活跃度', 'fishActivity', 0.0, 1.0, 0.01, this.params.fishActivity);

    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      background: #334155;
      margin: 4px 0;
    `;
    this.container.appendChild(separator);

    this.createButton('重置视角', this.options.onResetView, false);
    this.createButton('生成随机生物', this.options.onRandomizeCreatures, true);
  }

  private createSlider(
    label: string,
    paramKey: keyof ControlParams,
    min: number,
    max: number,
    step: number,
    defaultValue: number
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.cssText = `
      font-size: 14px;
      color: #cbd5e1;
    `;

    const valueElement = document.createElement('span');
    valueElement.textContent = defaultValue.toFixed(2);
    valueElement.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #38bdf8;
      min-width: 36px;
      text-align: right;
    `;

    labelRow.appendChild(labelElement);
    labelRow.appendChild(valueElement);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();

    slider.style.cssText = `
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #475569;
      outline: none;
      cursor: pointer;
    `;

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #38BDF8;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(56, 189, 248, 0.4);
        transition: transform 0.15s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #38BDF8;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(56, 189, 248, 0.4);
      }
    `;
    this.container.appendChild(sliderStyle);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.params[paramKey] = value;
      valueElement.textContent = value.toFixed(2);
      this.options.onParamsChange(this.params);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);
  }

  private createButton(label: string, onClick: () => void, isGradient: boolean): void {
    const button = document.createElement('button');
    button.textContent = label;

    const bgStyle = isGradient
      ? 'background: linear-gradient(135deg, #6366F1 0%, #A855F7 100%);'
      : 'background: linear-gradient(135deg, #6366F1 0%, #A855F7 100%);';

    button.style.cssText = `
      ${bgStyle}
      color: white;
      border: none;
      width: 180px;
      height: 40px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      align-self: center;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    });

    button.addEventListener('click', onClick);

    this.container.appendChild(button);
  }

  getParams(): ControlParams {
    return { ...this.params };
  }
}
