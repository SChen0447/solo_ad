export interface ControlParams {
  waterClarity: number;
  causticsIntensity: number;
  fishActivity: number;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private params: ControlParams;
  private onResetView: () => void;
  private onRandomizeCreatures: () => void;
  private onChange: (params: ControlParams) => void;

  constructor(
    onResetView: () => void,
    onRandomizeCreatures: () => void,
    onChange: (params: ControlParams) => void,
  ) {
    this.onResetView = onResetView;
    this.onRandomizeCreatures = onRandomizeCreatures;
    this.onChange = onChange;
    this.params = {
      waterClarity: 0.5,
      causticsIntensity: 0.7,
      fishActivity: 0.5,
    };

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed; top: 20px; right: 20px; width: 240px;
      background: rgba(30, 41, 59, 0.85); border-radius: 12px;
      border: 1px solid #334155; padding: 20px; z-index: 100;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #E2E8F0; display: flex; flex-direction: column; gap: 12px;
    `;

    this.createTitle();
    this.createSlider('水清晰度', 'waterClarity', 0.1, 1.0, 0.05);
    this.createSlider('焦散光强度', 'causticsIntensity', 0.0, 1.0, 0.05);
    this.createSlider('鱼群活跃度', 'fishActivity', 0.0, 1.0, 0.05);
    this.createResetButton();
    this.createRandomButton();

    document.body.appendChild(this.container);
  }

  private createTitle(): void {
    const title = document.createElement('div');
    title.textContent = '控制面板';
    title.style.cssText = `
      font-size: 16px; font-weight: 600; text-align: center;
      padding-bottom: 8px; border-bottom: 1px solid #334155;
    `;
    this.container.appendChild(title);
  }

  private createSlider(label: string, key: keyof ControlParams, min: number, max: number, step: number): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; font-size: 13px;';
    const labelText = document.createElement('span');
    labelText.textContent = label;
    const valueText = document.createElement('span');
    valueText.textContent = this.params[key].toFixed(2);
    valueText.style.color = '#38BDF8';
    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(this.params[key]);
    slider.style.cssText = `
      -webkit-appearance: none; appearance: none; width: 100%;
      height: 6px; border-radius: 3px; background: #475569;
      outline: none; cursor: pointer;
    `;

    const thumbStyle = `
      -webkit-appearance: none; appearance: none; width: 16px; height: 16px;
      border-radius: 50%; background: #38BDF8; cursor: pointer;
      box-shadow: 0 0 4px rgba(56, 189, 248, 0.5);
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .slider-${key}::-webkit-slider-thumb { ${thumbStyle} }
      .slider-${key}::-moz-range-thumb { ${thumbStyle} border: none; }
    `;
    document.head.appendChild(styleEl);
    slider.classList.add(`slider-${key}`);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      (this.params[key] as number) = val;
      valueText.textContent = val.toFixed(2);
      this.onChange({ ...this.params });
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);
  }

  private createResetButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '重置视角';
    btn.style.cssText = `
      width: 180px; height: 40px; border: none; border-radius: 20px;
      background: linear-gradient(135deg, #6366F1, #A855F7);
      color: white; font-size: 14px; font-weight: 500; cursor: pointer;
      align-self: center; transition: transform 0.2s ease;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => this.onResetView());
    this.container.appendChild(btn);
  }

  private createRandomButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '生成随机生物';
    btn.style.cssText = `
      width: 180px; height: 40px; border: none; border-radius: 20px;
      background: linear-gradient(135deg, #6366F1, #A855F7);
      color: white; font-size: 14px; font-weight: 500; cursor: pointer;
      align-self: center; transition: transform 0.2s ease;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => this.onRandomizeCreatures());
    this.container.appendChild(btn);
  }

  getParams(): ControlParams {
    return { ...this.params };
  }

  destroy(): void {
    this.container.remove();
  }
}
