export interface ControlParams {
  rotationSpeed: number;
  distortionStrength: number;
  colorOffset: number;
  particleDensity: number;
}

export type DataSourceType = 'simulation' | 'json';

interface SliderConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export class UIControls {
  private container: HTMLElement;
  private params: ControlParams;
  private dataSource: DataSourceType = 'simulation';
  private onParamChange: (params: Partial<ControlParams>) => void;
  private onDataSourceChange: (source: DataSourceType, data?: number[]) => void;
  private onResetView: () => void;
  private onScreenshot: () => void;

  constructor(
    containerId: string,
    initialParams: ControlParams,
    callbacks: {
      onParamChange: (params: Partial<ControlParams>) => void;
      onDataSourceChange: (source: DataSourceType, data?: number[]) => void;
      onResetView: () => void;
      onScreenshot: () => void;
    }
  ) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;

    this.params = { ...initialParams };
    this.onParamChange = callbacks.onParamChange;
    this.onDataSourceChange = callbacks.onDataSourceChange;
    this.onResetView = callbacks.onResetView;
    this.onScreenshot = callbacks.onScreenshot;

    this.buildUI();
    this.bindBottomButtons();
    this.bindMobileToggle();
  }

  private buildUI(): void {
    const sliders: SliderConfig[] = [
      { id: 'rotationSpeed', label: '旋转速度', min: 0, max: 2, step: 0.1, defaultValue: this.params.rotationSpeed, unit: 'x' },
      { id: 'distortionStrength', label: '顶点扭曲强度', min: 0, max: 5, step: 0.1, defaultValue: this.params.distortionStrength },
      { id: 'colorOffset', label: '颜色映射偏移', min: 0, max: 1, step: 0.01, defaultValue: this.params.colorOffset },
      { id: 'particleDensity', label: '粒子化程度', min: 0, max: 100, step: 1, defaultValue: this.params.particleDensity, unit: '%' },
    ];

    sliders.forEach(slider => {
      this.createSlider(slider);
    });

    this.createDataSourceButtons();
  }

  private createSlider(config: SliderConfig): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.dataset.sliderId = config.id;

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label-row';

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = config.label;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.id = `${config.id}-value`;
    valueDisplay.textContent = `${config.defaultValue.toFixed(config.step < 0.1 ? 2 : 1)}${config.unit || ''}`;

    labelRow.appendChild(label);
    labelRow.appendChild(valueDisplay);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(config.defaultValue);
    input.className = 'custom-slider';
    input.id = config.id;

    input.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      valueDisplay.textContent = `${value.toFixed(config.step < 0.1 ? 2 : 1)}${config.unit || ''}`;
      this.updateParam(config.id as keyof ControlParams, value);
    });

    sliderContainer.appendChild(input);
    wrapper.appendChild(labelRow);
    wrapper.appendChild(sliderContainer);
    this.container.appendChild(wrapper);
  }

  private createDataSourceButtons(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'button-group';

    const label = document.createElement('div');
    label.className = 'slider-label';
    label.textContent = '数据源';
    wrapper.appendChild(label);

    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'buttons-row';

    const simBtn = document.createElement('button');
    simBtn.className = 'source-btn active';
    simBtn.dataset.source = 'simulation';
    simBtn.textContent = '模拟数据';
    simBtn.addEventListener('click', () => this.switchDataSource('simulation'));

    const jsonBtn = document.createElement('button');
    jsonBtn.className = 'source-btn';
    jsonBtn.dataset.source = 'json';
    jsonBtn.textContent = 'JSON上传';
    jsonBtn.addEventListener('click', () => this.triggerJsonUpload());

    buttonsRow.appendChild(simBtn);
    buttonsRow.appendChild(jsonBtn);
    wrapper.appendChild(buttonsRow);
    this.container.appendChild(wrapper);

    const fileInput = document.getElementById('json-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleJsonUpload(e));
    }
  }

  private switchDataSource(source: DataSourceType): void {
    this.dataSource = source;
    
    document.querySelectorAll('.source-btn').forEach(btn => {
      if ((btn as HTMLElement).dataset.source === source) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.onDataSourceChange(source);
  }

  private triggerJsonUpload(): void {
    const fileInput = document.getElementById('json-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  private handleJsonUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const data = this.extractDataFromJson(json);
        this.switchDataSource('json');
        this.onDataSourceChange('json', data);
      } catch (err) {
        console.error('Invalid JSON file:', err);
        alert('请上传有效的 JSON 文件');
      }
    };
    reader.readAsText(file);

    input.value = '';
  }

  private extractDataFromJson(json: any): number[] {
    if (Array.isArray(json)) {
      return json.map(v => typeof v === 'number' ? v : parseFloat(v) || 0).slice(0, 100);
    }
    if (json.data && Array.isArray(json.data)) {
      return json.data.map((v: any) => typeof v === 'number' ? v : parseFloat(v) || 0).slice(0, 100);
    }
    if (json.values && Array.isArray(json.values)) {
      return json.values.map((v: any) => typeof v === 'number' ? v : parseFloat(v) || 0).slice(0, 100);
    }
    return [];
  }

  private updateParam(key: keyof ControlParams, value: number): void {
    this.params[key] = value;
    this.onParamChange({ [key]: value } as Partial<ControlParams>);
  }

  private bindBottomButtons(): void {
    const resetBtn = document.getElementById('reset-view-btn');
    const screenshotBtn = document.getElementById('screenshot-btn');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.onResetView());
    }
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => this.onScreenshot());
    }
  }

  private bindMobileToggle(): void {
    const toggleBtn = document.getElementById('mobile-toggle');
    const controlPanel = document.getElementById('control-panel');

    if (toggleBtn && controlPanel) {
      toggleBtn.addEventListener('click', () => {
        const isExpanded = controlPanel.classList.contains('mobile-expanded');
        const arrow = toggleBtn.querySelector('.arrow-icon');

        if (isExpanded) {
          controlPanel.classList.remove('mobile-expanded');
          if (arrow) arrow.textContent = '▲';
        } else {
          controlPanel.classList.add('mobile-expanded');
          if (arrow) arrow.textContent = '▼';
        }
      });
    }
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }

  public getDataSource(): DataSourceType {
    return this.dataSource;
  }

  public updateValueDisplay(key: keyof ControlParams, value: number): void {
    const valueEl = document.getElementById(`${key}-value`);
    if (valueEl) {
      const slider = document.getElementById(key) as HTMLInputElement;
      const step = slider ? parseFloat(slider.step) : 0.1;
      valueEl.textContent = value.toFixed(step < 0.1 ? 2 : 1);
    }
  }
}
