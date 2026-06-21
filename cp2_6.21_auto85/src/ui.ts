export type Dimension = 'population' | 'traffic' | 'greenery';

export const DIMENSION_LABELS: Record<Dimension, string> = {
  population: '人口密度',
  traffic: '交通流量',
  greenery: '绿化率',
};

export const DIMENSION_COLORS: Record<Dimension, string> = {
  population: '#FF4500',
  traffic: '#1E90FF',
  greenery: '#22C55E',
};

export interface UICallbacks {
  onDimensionChange: (dim: Dimension) => void;
  onTimeChange: (hour: number) => void;
  onPlayToggle: () => void;
  onViewChange: (view: 'top' | 'angle' | 'free') => void;
}

export class UIController {
  private panel: HTMLElement;
  private callbacks: UICallbacks;
  private timeSlider!: HTMLInputElement;
  private timeLabel!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private isPlaying: boolean = false;
  private infoArea!: HTMLElement;
  private currentDimension: Dimension = 'population';
  private legendScaleSpans: HTMLSpanElement[] = [];
  private legendContainer: HTMLElement | null = null;

  constructor(panelId: string, callbacks: UICallbacks) {
    this.panel = document.getElementById(panelId)!;
    this.callbacks = callbacks;
    this.build();
  }

  private build(): void {
    this.panel.innerHTML = '';

    const title = this.createTitle('城市热力分布控制');
    this.panel.appendChild(title);

    const viewSection = this.createSection('视角切换');
    const viewBtns = this.createViewButtons();
    viewSection.appendChild(viewBtns);
    this.panel.appendChild(viewSection);

    const dimSection = this.createSection('数据维度');
    const dimSelect = this.createDimensionSelect();
    dimSection.appendChild(dimSelect);
    this.panel.appendChild(dimSection);

    const legendSection = this.createSection('颜色图例');
    const legend = this.createColorLegend();
    legendSection.appendChild(legend);
    this.panel.appendChild(legendSection);

    const timeSection = this.createSection('时间轴');
    const timeControls = this.createTimeControls();
    timeSection.appendChild(timeControls);
    this.panel.appendChild(timeSection);

    this.infoArea = document.createElement('div');
    this.infoArea.style.cssText =
      'flex:1; min-height:160px; background:#111827; border-radius:8px; padding:12px; font-size:14px; color:#9CA3AF; transition:opacity 0.3s;';
    this.infoArea.innerHTML = '<div style="color:#6B7280; font-size:13px;">点击街区查看详细信息</div>';
    this.panel.appendChild(this.infoArea);
  }

  private createTitle(text: string): HTMLElement {
    const el = document.createElement('h2');
    el.textContent = text;
    el.style.cssText =
      'font-size:18px; font-weight:600; color:#F9FAFB; margin:0; padding:4px 0; border-bottom:1px solid #1F2937; padding-bottom:12px;';
    return el;
  }

  private createSection(label: string): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = 'font-size:13px; color:#9CA3AF; font-weight:500;';
    section.appendChild(lbl);
    return section;
  }

  private createViewButtons(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; gap:8px;';

    const views: { key: 'top' | 'angle' | 'free'; label: string }[] = [
      { key: 'top', label: '俯视图' },
      { key: 'angle', label: '45°视图' },
      { key: 'free', label: '自由旋转' },
    ];

    views.forEach((v) => {
      const btn = document.createElement('button');
      btn.textContent = v.label;
      btn.dataset.view = v.key;
      btn.style.cssText = this.buttonStyle(v.key === 'free');
      btn.addEventListener('click', () => {
        this.callbacks.onViewChange(v.key);
        container.querySelectorAll('button').forEach((b) => {
          b.style.background = '#1F2937';
        });
        btn.style.background = '#374151';
      });
      if (v.key === 'free') btn.style.background = '#374151';
      container.appendChild(btn);
    });

    return container;
  }

  private buttonStyle(active: boolean = false): string {
    return `flex:1; padding:8px 0; border:none; border-radius:8px; cursor:pointer; font-size:13px; color:#E5E7EB; background:${active ? '#374151' : '#1F2937'}; transition:background 0.2s; outline:none;`;
  }

  private createDimensionSelect(): HTMLElement {
    const select = document.createElement('select');
    select.style.cssText =
      'width:100%; padding:8px 12px; border-radius:8px; border:1px solid #374151; background:#1F2937; color:#E5E7EB; font-size:14px; cursor:pointer; outline:none; transition:border-color 0.2s, background 0.2s;';

    const dims: Dimension[] = ['population', 'traffic', 'greenery'];
    dims.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = DIMENSION_LABELS[d];
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      this.currentDimension = select.value as Dimension;
      this.callbacks.onDimensionChange(this.currentDimension);
    });

    select.addEventListener('mouseenter', () => {
      select.style.background = '#374151';
      select.style.borderColor = '#4B5563';
    });
    select.addEventListener('mouseleave', () => {
      select.style.background = '#1F2937';
      select.style.borderColor = '#374151';
    });

    return select;
  }

  private createColorLegend(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:4px; padding:0 8px; transition:opacity 0.3s;';
    this.legendContainer = container;

    const barWrapper = document.createElement('div');
    barWrapper.style.cssText = 'position:relative; height:16px;';

    const bar = document.createElement('div');
    bar.style.cssText =
      'height:16px; border-radius:4px; background:linear-gradient(to right, #1E90FF, #FFD700, #FF4500); position:relative;';

    const tickMarks = document.createElement('div');
    tickMarks.style.cssText =
      'position:absolute; top:0; left:0; right:0; bottom:0; pointer-events:none;';
    [0, 0.5, 1].forEach((pos) => {
      const tick = document.createElement('div');
      tick.style.cssText = `position:absolute; left:${pos * 100}%; top:0; height:100%; border-left:1px solid rgba(255,255,255,0.2);`;
      tickMarks.appendChild(tick);
    });
    bar.appendChild(tickMarks);
    barWrapper.appendChild(bar);
    container.appendChild(barWrapper);

    const scaleRow = document.createElement('div');
    scaleRow.style.cssText =
      'display:flex; justify-content:space-between; font-size:10px; color:#9CA3AF; position:relative;';

    this.legendScaleSpans = [];
    const positions = [0, 0.5, 1];
    positions.forEach((pos, i) => {
      const span = document.createElement('span');
      span.textContent = '0.0';
      span.style.cssText =
        i === 0
          ? ''
          : i === positions.length - 1
            ? ''
            : 'position:absolute; left:50%; transform:translateX(-50%);';
      span.style.transition = 'opacity 0.3s';
      this.legendScaleSpans.push(span);
      scaleRow.appendChild(span);
    });
    container.appendChild(scaleRow);

    return container;
  }

  updateLegendValues(min: number, median: number, max: number): void {
    if (!this.legendContainer) return;
    this.legendContainer.style.opacity = '0.3';
    setTimeout(() => {
      this.legendScaleSpans[0].textContent = min.toFixed(1);
      this.legendScaleSpans[1].textContent = median.toFixed(1);
      this.legendScaleSpans[2].textContent = max.toFixed(1);
      this.legendContainer!.style.opacity = '1';
    }, 150);
  }

  private createTimeControls(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:8px;';

    this.timeLabel = document.createElement('div');
    this.timeLabel.textContent = '12:00';
    this.timeLabel.style.cssText = 'text-align:center; font-size:16px; font-weight:600; color:#F9FAFB;';
    container.appendChild(this.timeLabel);

    this.timeSlider = document.createElement('input');
    this.timeSlider.type = 'range';
    this.timeSlider.min = '0';
    this.timeSlider.max = '23';
    this.timeSlider.value = '12';
    this.timeSlider.step = '1';
    this.timeSlider.style.cssText = this.sliderStyle();
    this.timeSlider.addEventListener('input', () => {
      const hour = parseInt(this.timeSlider.value, 10);
      this.timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
      this.callbacks.onTimeChange(hour);
    });
    container.appendChild(this.timeSlider);

    this.playBtn = document.createElement('button');
    this.playBtn.textContent = '播放';
    this.playBtn.style.cssText =
      'width:80px; height:36px; border:none; border-radius:8px; background:#1D4ED8; color:#fff; font-size:14px; cursor:pointer; align-self:center; transition:background 0.2s;';
    this.playBtn.addEventListener('mouseenter', () => {
      this.playBtn.style.background = '#2563EB';
    });
    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn.style.background = '#1D4ED8';
    });
    this.playBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.playBtn.textContent = this.isPlaying ? '暂停' : '播放';
      this.callbacks.onPlayToggle();
    });
    container.appendChild(this.playBtn);

    return container;
  }

  private sliderStyle(): string {
    return `width:100%; -webkit-appearance:none; appearance:none; height:6px; border-radius:3px; background:linear-gradient(to right, #333333, #555555); outline:none; cursor:pointer;`;
  }

  setTime(hour: number): void {
    this.timeSlider.value = hour.toString();
    this.timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setIsPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.playBtn.textContent = playing ? '暂停' : '播放';
  }

  getCurrentDimension(): Dimension {
    return this.currentDimension;
  }

  updateSelectedBlockInfo(
    blockId: string,
    value: number,
    percentile: number,
    dimension: Dimension,
    allValues: Record<Dimension, number>
  ): void {
    const dims: Dimension[] = ['population', 'traffic', 'greenery'];
    const barChartsHtml = dims
      .map((d) => {
        const val = allValues[d];
        const pct = Math.max(0, Math.min(100, val * 100));
        const color = DIMENSION_COLORS[d];
        const isActive = d === dimension;
        const labelColor = isActive ? '#F9FAFB' : '#9CA3AF';
        const fontWeight = isActive ? '600' : '400';
        return `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="width:56px; font-size:12px; color:${labelColor}; font-weight:${fontWeight}; white-space:nowrap;">${DIMENSION_LABELS[d]}</span>
            <div style="flex:1; height:10px; background:#1F2937; border-radius:3px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px; transition:width 0.5s ease;"></div>
            </div>
            <span style="width:32px; text-align:right; font-size:12px; color:${labelColor}; font-weight:${fontWeight};">${val.toFixed(1)}</span>
          </div>
        `;
      })
      .join('');

    this.infoArea.style.opacity = '0.3';
    setTimeout(() => {
      this.infoArea.innerHTML = `
        <div style="font-weight:600; color:#F9FAFB; font-size:15px; margin-bottom:10px;">街区 #${blockId}</div>
        <div style="margin-bottom:4px;">
          ${DIMENSION_LABELS[dimension]}:
          <span style="color:#FFD700; font-weight:600;">${value.toFixed(1)}</span>
        </div>
        <div style="margin-bottom:12px;">
          全城百分位:
          <span style="color:#1E90FF; font-weight:600;">${percentile.toFixed(1)}%</span>
        </div>
        <div style="border-top:1px solid #1F2937; padding-top:10px;">
          <div style="font-size:12px; color:#6B7280; margin-bottom:8px;">各维度对比</div>
          ${barChartsHtml}
        </div>
      `;
      this.infoArea.style.opacity = '1';
    }, 150);
  }

  clearSelectedBlockInfo(): void {
    this.infoArea.style.opacity = '0.3';
    setTimeout(() => {
      this.infoArea.innerHTML = '<div style="color:#6B7280; font-size:13px;">点击街区查看详细信息</div>';
      this.infoArea.style.opacity = '1';
    }, 150);
  }
}
