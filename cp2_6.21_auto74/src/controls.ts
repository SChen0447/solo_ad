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
    title.style.cssText = `
      font-size: 16px; font-weight: 600;
      padding-bottom: 8px; border-bottom: 1px solid #334155;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    `;

    const gearIcon = document.createElement('span');
    gearIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    gearIcon.style.display = 'flex';
    gearIcon.style.animation = 'spin 8s linear infinite';

    const titleText = document.createElement('span');
    titleText.textContent = '环境控制';

    const waveIcon = document.createElement('span');
    waveIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
        <path d="M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      </svg>
    `;
    waveIcon.style.display = 'flex';

    title.appendChild(gearIcon);
    title.appendChild(titleText);
    title.appendChild(waveIcon);

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(styleEl);

    this.container.appendChild(title);
  }

  private createSlider(label: string, key: keyof ControlParams, min: number, max: number, step: number): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display: flex; justify-content: space-between; font-size: 13px; align-items: center;';
    const labelText = document.createElement('span');
    labelText.textContent = label;
    const valueText = document.createElement('span');
    valueText.textContent = this.params[key].toFixed(2);
    valueText.style.cssText = `
      background: rgba(56, 189, 248, 0.15);
      color: #38BDF8;
      padding: 2px 10px;
      border-radius: 10px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      min-width: 42px;
      text-align: center;
      transition: background 0.2s ease;
    `;
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
      transition: box-shadow 0.2s ease, transform 0.15s ease;
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .slider-${key}::-webkit-slider-thumb { ${thumbStyle} }
      .slider-${key}::-moz-range-thumb { ${thumbStyle} border: none; }
      .slider-${key}:active::-webkit-slider-thumb { transform: scale(1.2); box-shadow: 0 0 10px rgba(56, 189, 248, 0.8); }
      .slider-${key}:active::-moz-range-thumb { transform: scale(1.2); box-shadow: 0 0 10px rgba(56, 189, 248, 0.8); }
    `;
    document.head.appendChild(styleEl);
    slider.classList.add(`slider-${key}`);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      (this.params[key] as number) = val;
      valueText.textContent = val.toFixed(2);
      valueText.style.background = 'rgba(56, 189, 248, 0.3)';
      setTimeout(() => { valueText.style.background = 'rgba(56, 189, 248, 0.15)'; }, 150);
      this.onChange({ ...this.params });
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);
  }

  private createResetButton(): void {
    const btn = document.createElement('button');
    const btnText = document.createElement('span');
    btnText.textContent = '重置视角';
    btn.appendChild(btnText);
    btn.style.cssText = `
      box-sizing: border-box; flex-shrink: 0;
      width: 180px; height: 40px; padding: 0;
      border: none; border-radius: 20px;
      background: linear-gradient(135deg, #6366F1, #A855F7);
      color: white; font-size: 14px; font-weight: 500; cursor: pointer;
      align-self: center; transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      line-height: 40px; display: inline-flex;
      align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      user-select: none;
    `;
    btn.addEventListener('mouseenter', () => { if (!btn.dataset.pressing) btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', () => { if (!btn.dataset.pressing) btn.style.transform = 'scale(1)'; });
    btn.addEventListener('mousedown', () => {
      btn.dataset.pressing = '1';
      btn.style.transform = 'scale(0.95)';
      btn.style.boxShadow = '0 1px 4px rgba(99, 102, 241, 0.2)';
    });
    btn.addEventListener('mouseup', () => {
      delete btn.dataset.pressing;
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
    });
    btn.addEventListener('click', () => {
      btnText.style.color = '#FDE68A';
      btnText.style.textShadow = '0 0 8px rgba(253, 230, 138, 0.8)';
      setTimeout(() => {
        btnText.style.color = '';
        btnText.style.textShadow = '';
      }, 300);
      this.onResetView();
    });
    this.container.appendChild(btn);
  }

  private createRandomButton(): void {
    const btn = document.createElement('button');
    const btnText = document.createElement('span');
    btnText.textContent = '生成随机生物';
    btn.appendChild(btnText);
    btn.style.cssText = `
      box-sizing: border-box; flex-shrink: 0;
      width: 180px; height: 40px; padding: 0;
      border: none; border-radius: 20px;
      background: linear-gradient(135deg, #6366F1, #A855F7);
      color: white; font-size: 14px; font-weight: 500; cursor: pointer;
      align-self: center; transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      line-height: 40px; display: inline-flex;
      align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      user-select: none;
    `;
    btn.addEventListener('mouseenter', () => { if (!btn.dataset.pressing) btn.style.transform = 'scale(1.05)'; });
    btn.addEventListener('mouseleave', () => { if (!btn.dataset.pressing) btn.style.transform = 'scale(1)'; });
    btn.addEventListener('mousedown', () => {
      btn.dataset.pressing = '1';
      btn.style.transform = 'scale(0.95)';
      btn.style.boxShadow = '0 1px 4px rgba(99, 102, 241, 0.2)';
    });
    btn.addEventListener('mouseup', () => {
      delete btn.dataset.pressing;
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
    });
    btn.addEventListener('click', () => {
      btnText.style.color = '#FDE68A';
      btnText.style.textShadow = '0 0 8px rgba(253, 230, 138, 0.8)';
      setTimeout(() => {
        btnText.style.color = '';
        btnText.style.textShadow = '';
      }, 300);
      this.onRandomizeCreatures();
    });
    this.container.appendChild(btn);
  }

  getParams(): ControlParams {
    return { ...this.params };
  }

  destroy(): void {
    this.container.remove();
  }
}
