import * as d3 from 'd3';
import { CityParams, ColorTheme } from '@/core/CityGenerator';

const THEME_LABELS: Record<ColorTheme, string> = {
  sunset: '日落',
  cyberpunk: '赛博朋克',
  ice: '冰雪'
};

const THEME_COLORS: Record<ColorTheme, string> = {
  sunset: '#FF8C00',
  cyberpunk: '#FF00FF',
  ice: '#87CEEB'
};

export interface ParamPanelCallbacks {
  onParamsChange: (params: CityParams) => void;
}

export class ParamPanel {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;
  private params: CityParams;
  private callbacks: ParamPanelCallbacks;
  private debounceTimer: number | null = null;
  private rebuildDelay: number = 2000;

  constructor(containerId: string, initialParams: CityParams, callbacks: ParamPanelCallbacks) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = d3.select(el);
    this.params = { ...initialParams };
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.html('');

    this.container.append('div')
      .attr('class', 'panel-title')
      .text('城市参数控制');

    this.renderDensitySlider();
    this.renderHeightSlider();
    this.renderThemeSelect();

    this.renderInstructions();
  }

  private renderDensitySlider(): void {
    const group = this.container.append('div')
      .attr('class', 'param-group');

    const labelRow = group.append('div')
      .attr('class', 'param-label');

    labelRow.append('span')
      .text('建筑密度');

    const valueSpan = labelRow.append('span')
      .attr('class', 'param-value')
      .text(this.params.density.toFixed(1));

    const slider = group.append('input')
      .attr('type', 'range')
      .attr('min', '0.2')
      .attr('max', '1.0')
      .attr('step', '0.1')
      .attr('value', this.params.density.toString());

    slider.on('input', (event: Event) => {
      const value = parseFloat((event.target as HTMLInputElement).value);
      this.params.density = value;
      valueSpan.text(value.toFixed(1));
      this.scheduleRebuild();
    });
  }

  private renderHeightSlider(): void {
    const group = this.container.append('div')
      .attr('class', 'param-group');

    const labelRow = group.append('div')
      .attr('class', 'param-label');

    labelRow.append('span')
      .text('高度变化');

    const valueSpan = labelRow.append('span')
      .attr('class', 'param-value')
      .text(this.params.heightVariation.toFixed(1));

    const slider = group.append('input')
      .attr('type', 'range')
      .attr('min', '0.5')
      .attr('max', '2.0')
      .attr('step', '0.1')
      .attr('value', this.params.heightVariation.toString());

    slider.on('input', (event: Event) => {
      const value = parseFloat((event.target as HTMLInputElement).value);
      this.params.heightVariation = value;
      valueSpan.text(value.toFixed(1));
      this.scheduleRebuild();
    });
  }

  private renderThemeSelect(): void {
    const group = this.container.append('div')
      .attr('class', 'param-group');

    group.append('div')
      .attr('class', 'param-label')
      .append('span')
      .text('颜色主题');

    const select = group.append('select');

    const options: ColorTheme[] = ['sunset', 'cyberpunk', 'ice'];
    options.forEach(theme => {
      select.append('option')
        .attr('value', theme)
        .attr('selected', theme === this.params.colorTheme ? 'selected' : null)
        .text(THEME_LABELS[theme]);
    });

    select.on('change', (event: Event) => {
      const value = (event.target as HTMLSelectElement).value as ColorTheme;
      this.params.colorTheme = value;
      this.scheduleRebuild();
    });
  }

  private renderInstructions(): void {
    const info = this.container.append('div')
      .style('margin-top', '16px')
      .style('padding-top', '12px')
      .style('border-top', '1px solid rgba(255,255,255,0.1)')
      .style('font-size', '12px')
      .style('color', '#888888')
      .style('line-height', '1.6');

    info.append('div').text('⌨️ 快捷键:');
    info.append('div').style('padding-left', '8px').text('1 - 俯瞰视角');
    info.append('div').style('padding-left', '8px').text('2 - 街道视角');
    info.append('div').style('margin-top', '8px').text('🖱️ 操作:');
    info.append('div').style('padding-left', '8px').text('拖拽 - 旋转视角');
    info.append('div').style('padding-left', '8px').text('滚轮 - 缩放');
  }

  private scheduleRebuild(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.callbacks.onParamsChange({ ...this.params });
      this.debounceTimer = null;
    }, this.rebuildDelay);
  }

  public setParams(params: CityParams): void {
    this.params = { ...params };
    this.render();
  }

  public getParams(): CityParams {
    return { ...this.params };
  }

  public updateThemeColors(theme: ColorTheme): void {
    const accentColor = THEME_COLORS[theme];
    const panel = document.getElementById('param-panel');
    if (panel) {
      panel.style.transition = 'background 0.8s ease-in-out';
    }

    d3.selectAll('#param-panel input[type="range"]::-webkit-slider-thumb')
      .style('background', accentColor);

    d3.selectAll('#param-panel .param-value')
      .style('color', accentColor)
      .style('transition', 'color 0.8s ease-in-out');
  }
}
