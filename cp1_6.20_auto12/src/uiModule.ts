import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { DataPoint, METRICS, MetricKey, MetricInfo } from './dataModule';

export interface UIEventCallbacks {
  onTimelineChange: (dayIndex: number) => void;
  onMetricToggle: (metric: MetricKey, visible: boolean) => void;
  onLegendClose?: () => void;
  onLegendOpen?: () => void;
}

export class UIModule {
  private labelRenderer: CSS2DRenderer;
  private labelContainer: HTMLElement;
  private dataLabels: CSS2DObject[] = [];
  private callbacks: UIEventCallbacks;

  private legendPanel!: HTMLElement;
  private timelineContainer!: HTMLElement;
  private timelineSlider!: HTMLInputElement;
  private timelineValue!: HTMLElement;
  private toggleBtn!: HTMLElement;
  private legendContent!: HTMLElement;

  private dayCount: number;

  constructor(
    container: HTMLElement,
    dayCount: number,
    callbacks: UIEventCallbacks
  ) {
    this.dayCount = dayCount;
    this.callbacks = callbacks;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    this.labelContainer = container;

    this.legendPanel = this.createLegendPanel();
    this.timelineContainer = this.createTimeline();
    this.toggleBtn = this.createToggleButton();
    this.legendContent = this.legendPanel.querySelector('.legend-content') as HTMLElement;

    window.addEventListener('resize', this.handleResize.bind(this));
    this.checkMobileLayout();
  }

  private createLegendPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'legend-panel';
    Object.assign(panel.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '16px 20px',
      background: 'rgba(20, 24, 36, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      zIndex: '100',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      minWidth: '240px',
      fontFamily: 'inherit',
      color: '#e0e4ef',
      transition: 'all 0.3s ease'
    } as unknown as CSSStyleDeclaration);

    const header = document.createElement('div');
    header.className = 'legend-header';
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '14px',
      paddingBottom: '10px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
    } as unknown as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = '图例面板';
    Object.assign(title.style, {
      fontSize: '15px',
      fontWeight: '600',
      color: '#00d4ff',
      letterSpacing: '0.5px'
    } as unknown as CSSStyleDeclaration);

    const hamburger = document.createElement('div');
    hamburger.className = 'hamburger-btn';
    hamburger.textContent = '☰';
    Object.assign(hamburger.style, {
      display: 'none',
      cursor: 'pointer',
      fontSize: '20px',
      color: '#00d4ff',
      padding: '4px 8px',
      borderRadius: '4px',
      transition: 'background 0.2s'
    } as unknown as CSSStyleDeclaration);
    hamburger.addEventListener('click', () => {
      this.toggleLegend();
    });

    header.appendChild(title);
    header.appendChild(hamburger);

    const content = document.createElement('div');
    content.className = 'legend-content';

    const gradientLabel = document.createElement('div');
    Object.assign(gradientLabel.style, {
      fontSize: '12px',
      opacity: '0.8',
      marginBottom: '8px',
      marginTop: '4px'
    } as unknown as CSSStyleDeclaration);
    gradientLabel.textContent = '颜色映射（冷暖渐变）';

    const gradientBar = document.createElement('div');
    Object.assign(gradientBar.style, {
      width: '100%',
      height: '10px',
      borderRadius: '5px',
      background: 'linear-gradient(to right, #0066ff, #8844ff, #ff4466)',
      marginBottom: '16px',
      boxShadow: '0 0 10px rgba(0, 212, 255, 0.3)'
    } as unknown as CSSStyleDeclaration);

    const gradientLabels = document.createElement('div');
    Object.assign(gradientLabels.style, {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      opacity: '0.6',
      marginTop: '-12px',
      marginBottom: '18px'
    } as unknown as CSSStyleDeclaration);
    gradientLabels.innerHTML = '<span>冷/低</span><span>暖/高</span>';

    content.appendChild(gradientLabel);
    content.appendChild(gradientBar);
    content.appendChild(gradientLabels);

    const metricsTitle = document.createElement('div');
    Object.assign(metricsTitle.style, {
      fontSize: '12px',
      opacity: '0.8',
      marginBottom: '10px'
    } as unknown as CSSStyleDeclaration);
    metricsTitle.textContent = '指标开关（控制河宽）';
    content.appendChild(metricsTitle);

    for (const metric of METRICS) {
      const item = this.createLegendItem(metric);
      content.appendChild(item);
    }

    panel.appendChild(header);
    panel.appendChild(content);
    document.body.appendChild(panel);

    return panel;
  }

  private createLegendItem(metric: MetricInfo): HTMLElement {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.dataset.metric = metric.key;
    Object.assign(item.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 0',
      cursor: 'pointer',
      borderRadius: '6px',
      transition: 'background 0.2s',
      userSelect: 'none'
    } as unknown as CSSStyleDeclaration);

    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(0, 212, 255, 0.1)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });

    const colorDot = document.createElement('div');
    Object.assign(colorDot.style, {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: metric.color,
      marginRight: '10px',
      boxShadow: `0 0 8px ${metric.color}80`,
      flexShrink: '0'
    } as unknown as CSSStyleDeclaration);

    const label = document.createElement('div');
    Object.assign(label.style, {
      flex: '1',
      fontSize: '13px',
      display: 'flex',
      justifyContent: 'space-between'
    } as unknown as CSSStyleDeclaration);
    label.innerHTML = `<span>${metric.name}</span><span style="opacity:0.6;font-size:11px">${metric.unit}</span>`;

    const toggle = document.createElement('label');
    Object.assign(toggle.style, {
      position: 'relative',
      display: 'inline-block',
      width: '36px',
      height: '18px',
      marginLeft: '10px',
      flexShrink: '0'
    } as unknown as CSSStyleDeclaration);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    Object.assign(checkbox.style, {
      opacity: '0',
      width: '0',
      height: '0'
    } as unknown as CSSStyleDeclaration);

    const slider = document.createElement('span');
    Object.assign(slider.style, {
      position: 'absolute',
      cursor: 'pointer',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      transition: '0.3s',
      borderRadius: '18px'
    } as unknown as CSSStyleDeclaration);

    const knob = document.createElement('span');
    Object.assign(knob.style, {
      position: 'absolute',
      content: '""',
      height: '14px',
      width: '14px',
      left: '2px',
      bottom: '2px',
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '50%'
    } as unknown as CSSStyleDeclaration);
    slider.appendChild(knob);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        slider.style.backgroundColor = '#00d4ff';
        knob.style.transform = 'translateX(18px)';
        colorDot.style.opacity = '1';
        label.style.opacity = '1';
      } else {
        slider.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        knob.style.transform = 'translateX(0)';
        colorDot.style.opacity = '0.3';
        label.style.opacity = '0.4';
      }
      this.callbacks.onMetricToggle(metric.key, checkbox.checked);
    });

    slider.style.backgroundColor = '#00d4ff';
    knob.style.transform = 'translateX(18px)';

    toggle.appendChild(checkbox);
    toggle.appendChild(slider);

    item.appendChild(colorDot);
    item.appendChild(label);
    item.appendChild(toggle);

    return item;
  }

  private createToggleButton(): HTMLElement {
    const btn = document.createElement('div');
    btn.className = 'mobile-toggle';
    btn.textContent = '☰';
    Object.assign(btn.style, {
      display: 'none',
      position: 'absolute',
      top: '15px',
      left: '15px',
      width: '40px',
      height: '40px',
      background: 'rgba(20, 24, 36, 0.8)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      zIndex: '200',
      color: '#00d4ff',
      fontSize: '20px',
      textAlign: 'center',
      lineHeight: '38px',
      cursor: 'pointer',
      transition: 'all 0.3s'
    } as unknown as CSSStyleDeclaration);
    btn.addEventListener('click', () => this.toggleLegend());
    document.body.appendChild(btn);
    return btn;
  }

  private createTimeline(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'timeline-container';
    Object.assign(container.style, {
      position: 'absolute',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(85%, 800px)',
      padding: '16px 24px',
      background: 'rgba(20, 24, 36, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '12px',
      zIndex: '100',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    } as unknown as CSSStyleDeclaration);

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    } as unknown as CSSStyleDeclaration);

    const label = document.createElement('div');
    label.textContent = '时间轴';
    Object.assign(label.style, {
      fontSize: '13px',
      fontWeight: '600',
      color: '#00d4ff',
      letterSpacing: '0.5px'
    } as unknown as CSSStyleDeclaration);

    this.timelineValue = document.createElement('div');
    this.timelineValue.className = 'timeline-value';
    this.timelineValue.textContent = `第 1 天 / 2024-01-01`;
    Object.assign(this.timelineValue.style, {
      fontSize: '12px',
      opacity: '0.85',
      fontVariantNumeric: 'tabular-nums'
    } as unknown as CSSStyleDeclaration);

    header.appendChild(label);
    header.appendChild(this.timelineValue);

    const sliderContainer = document.createElement('div');
    Object.assign(sliderContainer.style, {
      position: 'relative',
      padding: '4px 0'
    } as unknown as CSSStyleDeclaration);

    this.timelineSlider = document.createElement('input');
    this.timelineSlider.type = 'range';
    this.timelineSlider.min = '0';
    this.timelineSlider.max = String(this.dayCount - 1);
    this.timelineSlider.value = '0';
    Object.assign(this.timelineSlider.style, {
      width: '100%',
      height: '6px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'linear-gradient(to right, #00d4ff 0%, #8844ff 100%)',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer'
    } as unknown as CSSStyleDeclaration);

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #00d4ff;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.8), 0 0 4px rgba(255, 255, 255, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.9);
        transition: transform 0.15s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #00d4ff;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.9);
      }
      .data-label {
        animation: fadeInLabel 0.3s ease-out;
      }
      @keyframes fadeInLabel {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);

    this.timelineSlider.addEventListener('input', (e) => {
      const dayIndex = parseInt((e.target as HTMLInputElement).value);
      this.callbacks.onTimelineChange(dayIndex);
    });

    sliderContainer.appendChild(this.timelineSlider);

    const ticks = document.createElement('div');
    Object.assign(ticks.style, {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      opacity: '0.5',
      marginTop: '6px',
      fontVariantNumeric: 'tabular-nums'
    } as unknown as CSSStyleDeclaration);
    const months = ['1月', '3月', '5月', '7月', '9月', '11月', '12月'];
    for (const m of months) {
      const span = document.createElement('span');
      span.textContent = m;
      ticks.appendChild(span);
    }

    container.appendChild(header);
    container.appendChild(sliderContainer);
    container.appendChild(ticks);

    document.body.appendChild(container);
    return container;
  }

  private toggleLegend(): void {
    const content = this.legendContent;
    if (content.style.display === 'none') {
      content.style.display = 'block';
      this.legendPanel.style.padding = '16px 20px';
      this.callbacks.onLegendOpen?.();
    } else {
      content.style.display = 'none';
      this.legendPanel.style.padding = '12px 16px';
      this.callbacks.onLegendClose?.();
    }
  }

  private checkMobileLayout(): void {
    const isMobile = window.innerWidth <= 768;
    const hamburger = this.legendPanel.querySelector('.hamburger-btn') as HTMLElement;
    const headerTitle = this.legendPanel.querySelector('.legend-header > div:first-child') as HTMLElement;

    if (isMobile) {
      hamburger.style.display = 'block';
      this.toggleBtn.style.display = 'block';
      this.legendPanel.style.left = '10px';
      this.legendPanel.style.top = '10px';
      this.legendPanel.style.minWidth = 'unset';
      this.legendPanel.style.width = 'calc(100% - 20px)';
      headerTitle.textContent = '图例';
      this.legendContent.style.display = 'none';
      this.legendPanel.style.padding = '12px 16px';

      this.timelineContainer.style.width = 'calc(100% - 20px)';
      this.timelineContainer.style.bottom = '12px';
      this.timelineContainer.style.padding = '12px 16px';
    } else {
      hamburger.style.display = 'none';
      this.toggleBtn.style.display = 'none';
      this.legendPanel.style.left = '20px';
      this.legendPanel.style.top = '20px';
      this.legendPanel.style.minWidth = '240px';
      this.legendPanel.style.width = 'auto';
      headerTitle.textContent = '图例面板';
      this.legendContent.style.display = 'block';
      this.legendPanel.style.padding = '16px 20px';

      this.timelineContainer.style.width = 'min(85%, 800px)';
      this.timelineContainer.style.bottom = '24px';
      this.timelineContainer.style.padding = '16px 24px';
    }
  }

  private handleResize(): void {
    this.labelRenderer.setSize(
      this.labelContainer.clientWidth,
      this.labelContainer.clientHeight
    );
    this.checkMobileLayout();
  }

  showDataLabel(position: { x: number; y: number; z: number }, data: DataPoint): void {
    this.clearDataLabels();

    const div = document.createElement('div');
    div.className = 'data-label';
    Object.assign(div.style, {
      padding: '14px 18px',
      background: 'rgba(15, 18, 28, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      borderRadius: '10px',
      color: '#e0e4ef',
      fontSize: '12px',
      lineHeight: '1.8',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 212, 255, 0.15)',
      maxWidth: '280px'
    } as unknown as CSSStyleDeclaration);

    let html = `<div style="font-size:13px;font-weight:600;color:#00d4ff;margin-bottom:8px;letter-spacing:0.3px">${data.date}</div>`;
    for (const metric of METRICS) {
      const value = data[metric.key];
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
          <span style="display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:${metric.color};box-shadow:0 0 6px ${metric.color}80"></span>
            ${metric.name}
          </span>
          <span style="font-weight:500;font-variant-numeric:tabular-nums;opacity:0.95">${value} ${metric.unit}</span>
        </div>
      `;
    }
    div.innerHTML = html;

    const label = new CSS2DObject(div);
    label.position.set(position.x, position.y + 4, position.z);
    this.dataLabels.push(label);
    this.labelRenderer.domElement.parentElement?.appendChild(this.labelRenderer.domElement);
  }

  clearDataLabels(): void {
    for (const label of this.dataLabels) {
      label.removeFromParent();
      if (label.element && label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
    }
    this.dataLabels = [];
  }

  updateTimelineValue(dayIndex: number, date: string): void {
    this.timelineValue.textContent = `第 ${dayIndex + 1} 天 / ${date}`;
    if (this.timelineSlider.value !== String(dayIndex)) {
      this.timelineSlider.value = String(dayIndex);
    }
  }

  getLabelRenderer(): CSS2DRenderer {
    return this.labelRenderer;
  }

  getLabels(): CSS2DObject[] {
    return this.dataLabels;
  }

  setMetricToggle(metric: MetricKey, visible: boolean): void {
    const item = this.legendPanel.querySelector(`.legend-item[data-metric="${metric}"] input[type="checkbox"]`) as HTMLInputElement;
    if (item && item.checked !== visible) {
      item.checked = visible;
      item.dispatchEvent(new Event('change'));
    }
  }
}
