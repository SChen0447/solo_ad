import * as d3 from 'd3';

export interface PanelParams {
  density: number;
  heightVariation: number;
  theme: 'sunset' | 'cyberpunk' | 'ice';
}

export class ParamPanel {
  private containerId: string;
  private onParamsChange: (params: PanelParams) => void;
  private params: PanelParams;
  private panel: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;
  private styleTag: HTMLStyleElement | null = null;

  private themeColors: Record<PanelParams['theme'], string> = {
    sunset: '#FF6B35',
    cyberpunk: '#00BFFF',
    ice: '#87CEEB'
  };

  constructor(containerId: string, onParamsChange: (params: PanelParams) => void) {
    this.containerId = containerId;
    this.onParamsChange = onParamsChange;
    this.params = {
      density: 0.6,
      heightVariation: 1.0,
      theme: 'cyberpunk'
    };
    this.init();
  }

  private injectStyles(): void {
    this.styleTag = document.createElement('style');
    const color = this.themeColors[this.params.theme];
    this.styleTag.textContent = `
      .param-panel {
        position: fixed;
        top: 16px;
        left: 16px;
        width: 280px;
        padding: 16px;
        background: rgba(20, 20, 30, 0.85);
        border-radius: 12px;
        color: #CCCCCC;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 1000;
        backdrop-filter: blur(8px);
      }
      .panel-title {
        font-size: 16px;
        font-weight: bold;
        color: #FFFFFF;
        margin-bottom: 12px;
      }
      .slider-container {
        margin-bottom: 16px;
      }
      .slider-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .slider-value {
        color: ${color};
        font-family: 'Courier New', Courier, monospace;
        transition: color 0.8s ease-in-out;
      }
      .slider-input {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: #333;
        outline: none;
      }
      .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        transition: background 0.8s ease-in-out;
      }
      .slider-input::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        border: none;
        transition: background 0.8s ease-in-out;
      }
      .theme-select {
        width: 100%;
        padding: 6px 8px;
        background: #333;
        color: #CCCCCC;
        border: 1px solid #555;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        outline: none;
      }
      .theme-select:focus {
        border-color: ${color};
        transition: border-color 0.8s ease-in-out;
      }
    `;
    document.head.appendChild(this.styleTag);
  }

  private updateThemeColors(): void {
    const color = this.themeColors[this.params.theme];
    if (this.styleTag) {
      const currentText = this.styleTag.textContent || '';
      const updatedText = currentText
        .replace(/\.slider-value\s*\{\s*color:\s*#[0-9A-Fa-f]+;/, `.slider-value { color: ${color};`)
        .replace(/\.slider-input::-webkit-slider-thumb\s*\{([^}]*?)background:\s*#[0-9A-Fa-f]+;/s, `.slider-input::-webkit-slider-thumb {$1background: ${color};`)
        .replace(/\.slider-input::-moz-range-thumb\s*\{([^}]*?)background:\s*#[0-9A-Fa-f]+;/s, `.slider-input::-moz-range-thumb {$1background: ${color};`)
        .replace(/\.theme-select:focus\s*\{([^}]*?)border-color:\s*#[0-9A-Fa-f]+;/s, `.theme-select:focus {$1border-color: ${color};`);
      this.styleTag.textContent = updatedText;
    }
  }

  private notifyChange(): void {
    this.onParamsChange({ ...this.params });
  }

  private buildUI(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container with id "${this.containerId}" not found`);
      return;
    }

    this.panel = d3.select(container)
      .append('div')
      .attr('class', 'param-panel');

    this.panel.append('div')
      .attr('class', 'panel-title')
      .text('城市参数控制');

    this.createSlider(
      '密度',
      'Density',
      'density',
      0.2,
      1.0,
      0.1,
      this.params.density
    );

    this.createSlider(
      '高度变化',
      'Height Variation',
      'heightVariation',
      0.5,
      2.0,
      0.1,
      this.params.heightVariation
    );

    this.createThemeSelect();
  }

  private createSlider(
    labelCn: string,
    labelEn: string,
    paramKey: keyof PanelParams,
    min: number,
    max: number,
    step: number,
    initialValue: number
  ): void {
    if (!this.panel) return;

    const sliderContainer = this.panel.append('div')
      .attr('class', 'slider-container');

    const labelRow = sliderContainer.append('div')
      .attr('class', 'slider-label');

    labelRow.append('span').text(`${labelCn} (${labelEn})`);

    const valueSpan = labelRow.append('span')
      .attr('class', 'slider-value')
      .text(initialValue.toFixed(1));

    const input = sliderContainer.append('input')
      .attr('class', 'slider-input')
      .attr('type', 'range')
      .attr('min', min.toString())
      .attr('max', max.toString())
      .attr('step', step.toString())
      .attr('value', initialValue.toString());

    input.on('input', (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = parseFloat(target.value);
      (this.params as any)[paramKey] = value;
      valueSpan.text(value.toFixed(1));
      this.notifyChange();
    });
  }

  private createThemeSelect(): void {
    if (!this.panel) return;

    const container = this.panel.append('div')
      .attr('class', 'slider-container');

    container.append('div')
      .attr('class', 'slider-label')
      .append('span')
      .text('颜色主题 (Color Theme)');

    const select = container.append('select')
      .attr('class', 'theme-select');

    const themes: Array<{ value: PanelParams['theme']; label: string }> = [
      { value: 'sunset', label: '日落 (sunset)' },
      { value: 'cyberpunk', label: '赛博朋克 (cyberpunk)' },
      { value: 'ice', label: '冰雪 (ice)' }
    ];

    select.selectAll('option')
      .data(themes)
      .enter()
      .append('option')
      .attr('value', d => d.value)
      .property('selected', d => d.value === this.params.theme)
      .text(d => d.label);

    select.on('change', (event: Event) => {
      const target = event.target as HTMLSelectElement;
      this.params.theme = target.value as PanelParams['theme'];
      this.updateThemeColors();
      this.notifyChange();
    });
  }

  private init(): void {
    this.injectStyles();
    this.buildUI();
    this.notifyChange();
  }

  public getParams(): PanelParams {
    return { ...this.params };
  }

  public destroy(): void {
    if (this.styleTag && this.styleTag.parentNode) {
      this.styleTag.parentNode.removeChild(this.styleTag);
    }
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}
