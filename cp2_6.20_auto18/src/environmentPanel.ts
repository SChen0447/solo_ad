import type { EnvironmentParams } from './plantSystem';

type ParamChangeCallback = (params: Partial<EnvironmentParams>) => void;
type TimelineSeekCallback = (time: number) => void;
type TimelinePlayPauseCallback = () => boolean;

interface SliderConfig {
  key: keyof EnvironmentParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  default: number;
  icon: string;
}

export class EnvironmentPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private toggleBtn: HTMLElement | null = null;
  private timelineProgress: HTMLElement | null = null;
  private timelineFill: HTMLElement | null = null;
  private playBtn: HTMLButtonElement | null = null;
  private timeLabel: HTMLElement | null = null;
  private sliders: Map<keyof EnvironmentParams, {
    input: HTMLInputElement;
    fill: HTMLElement;
    valueDisplay: HTMLElement;
    track: HTMLElement;
    thumb: HTMLElement;
  }> = new Map();
  private onParamChange: ParamChangeCallback;
  private onSeek: TimelineSeekCallback;
  private onPlayPause: TimelinePlayPauseCallback;
  private isPanelVisible = true;
  private currentTime = 0;
  private readonly TOTAL_DURATION = 40;
  private readonly sliderConfigs: SliderConfig[] = [
    { key: 'light', label: '光照强度', unit: '%', min: 0, max: 100, default: 60, icon: '☀' },
    { key: 'water', label: '水分含量', unit: '%', min: 0, max: 100, default: 70, icon: '💧' },
    { key: 'temperature', label: '温度', unit: '°C', min: 10, max: 40, default: 25, icon: '🌡' }
  ];

  constructor(
    appContainer: HTMLElement,
    paramCallback: ParamChangeCallback,
    seekCallback: TimelineSeekCallback,
    playPauseCallback: TimelinePlayPauseCallback
  ) {
    this.container = appContainer;
    this.onParamChange = paramCallback;
    this.onSeek = seekCallback;
    this.onPlayPause = playPauseCallback;
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);
    this.createStyles();
    this.setupResponsive();
    this.setupInteractionEffects();
  }

  private createStyles(): void {
    const styleId = 'env-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes elasticBounce {
        0% { transform: scale(1); }
        30% { transform: scale(0.95); }
        60% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateX(-100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(-100%); }
      }
      .env-panel {
        position: fixed;
        left: 20px;
        top: 100px;
        width: 280px;
        padding: 24px 20px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        color: white;
        z-index: 100;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .env-panel.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateX(-120%);
      }
      .env-panel-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(255, 255, 255, 0.95);
        letter-spacing: 0.5px;
      }
      .env-panel-title::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 20px;
        background: linear-gradient(180deg, #4ade80, #22c55e);
        border-radius: 2px;
      }
      .slider-group {
        margin-bottom: 22px;
      }
      .slider-group:last-child {
        margin-bottom: 0;
      }
      .slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.9);
      }
      .slider-label-icon {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .slider-value {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        font-variant-numeric: tabular-nums;
      }
      .slider-track-wrapper {
        position: relative;
        height: 6px;
        cursor: pointer;
        padding: 6px 0;
      }
      .slider-track {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 6px;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        overflow: hidden;
        transition: filter 0.1s ease;
      }
      .slider-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        border-radius: 3px;
        transition: width 0.05s linear;
        background: linear-gradient(90deg,
          #3b82f6 0%,
          #6366f1 30%,
          #8b5cf6 60%,
          #f97316 100%
        );
      }
      .slider-fill::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 20px;
        height: 100%;
        background: radial-gradient(circle at right center,
          rgba(255, 255, 255, 0.6) 0%,
          transparent 70%
        );
      }
      .slider-thumb {
        position: absolute;
        top: 50%;
        width: 18px;
        height: 18px;
        background: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.1);
        transition: transform 0.1s ease, box-shadow 0.1s ease;
        z-index: 2;
        cursor: grab;
      }
      .slider-thumb:active {
        cursor: grabbing;
      }
      .slider-track-wrapper.hovered .slider-track {
        filter: brightness(1.1);
      }
      .slider-track-wrapper.hovered .slider-thumb {
        transform: translate(-50%, -50%) scale(1.05);
        box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.2);
      }
      .slider-track-wrapper.elastic .slider-thumb {
        animation: elasticBounce 0.15s ease;
      }
      input[type="range"].native-slider {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        margin: 0;
      }
      .panel-toggle-btn {
        position: fixed;
        left: 16px;
        top: 100px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 22px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 101;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        transition: transform 0.1s ease, background 0.1s ease;
      }
      .panel-toggle-btn:hover {
        transform: scale(1.05);
        background: rgba(255, 255, 255, 0.15);
      }
      .panel-toggle-btn:active {
        animation: elasticBounce 0.15s ease;
      }
      .panel-toggle-btn.visible {
        display: flex;
      }
      .timeline-container {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }
      .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
      }
      .timeline-title {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .timeline-time-label {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.95);
        font-size: 13px;
      }
      .timeline-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .timeline-play-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
        border: none;
        color: white;
        font-size: 14px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(74, 222, 128, 0.4);
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .timeline-play-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 3px 12px rgba(74, 222, 128, 0.5);
      }
      .timeline-play-btn:active {
        animation: elasticBounce 0.15s ease;
      }
      .timeline-track-wrapper {
        flex: 1;
        position: relative;
        height: 6px;
        cursor: pointer;
        padding: 6px 0;
      }
      .timeline-track {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 6px;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        overflow: hidden;
      }
      .timeline-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        border-radius: 3px;
        background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
        transition: width 0.05s linear;
      }
      .timeline-fill::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 12px;
        height: 100%;
        background: radial-gradient(circle at right center,
          rgba(255, 255, 255, 0.6) 0%,
          transparent 70%
        );
      }
      .timeline-thumb {
        position: absolute;
        top: 50%;
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.1s ease;
        z-index: 2;
        cursor: grab;
      }
      .timeline-track-wrapper:hover .timeline-thumb {
        transform: translate(-50%, -50%) scale(1.15);
      }
      .timeline-thumb:active {
        cursor: grabbing;
      }
      @media (max-width: 768px) {
        .env-panel {
          left: 0;
          top: 0;
          height: 100vh;
          border-radius: 0 16px 16px 0;
          width: 260px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'env-panel';

    const title = document.createElement('div');
    title.className = 'env-panel-title';
    title.textContent = '植物生长模拟器';
    panel.appendChild(title);

    this.sliderConfigs.forEach(config => {
      const group = this.createSliderGroup(config);
      panel.appendChild(group);
    });

    const timeline = this.createTimeline();
    panel.appendChild(timeline);

    return panel;
  }

  private formatTime(seconds: number): string {
    const s = Math.max(0, Math.min(this.TOTAL_DURATION, seconds));
    const fixed = s.toFixed(1);
    return `${fixed}s / ${this.TOTAL_DURATION.toFixed(1)}s`;
  }

  private createTimeline(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'timeline-container';

    const header = document.createElement('div');
    header.className = 'timeline-header';
    const title = document.createElement('span');
    title.className = 'timeline-title';
    title.innerHTML = `<span>🌱</span><span>生长回放</span>`;
    this.timeLabel = document.createElement('span');
    this.timeLabel.className = 'timeline-time-label';
    this.timeLabel.textContent = this.formatTime(0);
    header.appendChild(title);
    header.appendChild(this.timeLabel);
    container.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'timeline-controls';

    this.playBtn = document.createElement('button');
    this.playBtn.className = 'timeline-play-btn';
    this.playBtn.innerHTML = '❚❚';
    this.playBtn.title = '暂停';
    this.playBtn.addEventListener('click', () => {
      const nowPlaying = this.onPlayPause();
      if (this.playBtn) {
        this.playBtn.innerHTML = nowPlaying ? '❚❚' : '▶';
        this.playBtn.title = nowPlaying ? '暂停' : '播放';
      }
    });
    controls.appendChild(this.playBtn);

    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'timeline-track-wrapper';
    this.timelineProgress = trackWrapper;

    const track = document.createElement('div');
    track.className = 'timeline-track';
    this.timelineFill = document.createElement('div');
    this.timelineFill.className = 'timeline-fill';
    this.timelineFill.style.width = '0%';
    track.appendChild(this.timelineFill);
    trackWrapper.appendChild(track);

    const thumb = document.createElement('div');
    thumb.className = 'timeline-thumb';
    thumb.style.left = '0%';
    trackWrapper.appendChild(thumb);

    let isDragging = false;
    const getTimeFromEvent = (ev: MouseEvent | TouchEvent): number => {
      const rect = trackWrapper.getBoundingClientRect();
      const clientX = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      return ratio * this.TOTAL_DURATION;
    };
    const applyTime = (t: number) => {
      this.currentTime = t;
      if (this.timelineFill) this.timelineFill.style.width = `${(t / this.TOTAL_DURATION) * 100}%`;
      thumb.style.left = `${(t / this.TOTAL_DURATION) * 100}%`;
      if (this.timeLabel) this.timeLabel.textContent = this.formatTime(t);
      this.onSeek(t);
    };
    const onDown = (ev: MouseEvent | TouchEvent) => {
      isDragging = true;
      ev.preventDefault();
      applyTime(getTimeFromEvent(ev));
    };
    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      ev.preventDefault();
      applyTime(getTimeFromEvent(ev));
    };
    const onUp = () => { isDragging = false; };
    trackWrapper.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    trackWrapper.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    controls.appendChild(trackWrapper);
    container.appendChild(controls);

    return container;
  }

  public updateTimeline(time: number): void {
    const t = Math.max(0, Math.min(this.TOTAL_DURATION, time));
    if (Math.abs(t - this.currentTime) < 1e-3) return;
    this.currentTime = t;
    if (this.timelineFill) this.timelineFill.style.width = `${(t / this.TOTAL_DURATION) * 100}%`;
    if (this.timelineProgress) {
      const thumb = this.timelineProgress.querySelector('.timeline-thumb') as HTMLElement | null;
      if (thumb) thumb.style.left = `${(t / this.TOTAL_DURATION) * 100}%`;
    }
    if (this.timeLabel) this.timeLabel.textContent = this.formatTime(t);
  }

  public updatePlayState(playing: boolean): void {
    if (this.playBtn) {
      this.playBtn.innerHTML = playing ? '❚❚' : '▶';
      this.playBtn.title = playing ? '暂停' : '播放';
    }
  }

  private createSliderGroup(config: SliderConfig): HTMLElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const label = document.createElement('div');
    label.className = 'slider-label';

    const labelIcon = document.createElement('span');
    labelIcon.className = 'slider-label-icon';
    labelIcon.innerHTML = `<span>${config.icon}</span><span>${config.label}</span>`;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    valueDisplay.textContent = `${config.default}${config.unit}`;

    label.appendChild(labelIcon);
    label.appendChild(valueDisplay);

    const trackWrapper = document.createElement('div');
    trackWrapper.className = 'slider-track-wrapper';

    const track = document.createElement('div');
    track.className = 'slider-track';

    const fill = document.createElement('div');
    fill.className = 'slider-fill';
    const initialPercent = ((config.default - config.min) / (config.max - config.min)) * 100;
    fill.style.width = `${initialPercent}%`;
    track.appendChild(fill);

    const thumb = document.createElement('div');
    thumb.className = 'slider-thumb';
    thumb.style.left = `${initialPercent}%`;
    track.appendChild(thumb);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'native-slider';
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = config.key === 'temperature' ? '0.5' : '1';
    input.value = String(config.default);

    trackWrapper.appendChild(track);
    trackWrapper.appendChild(input);

    this.sliders.set(config.key, { input, fill, valueDisplay, track, thumb });

    input.addEventListener('input', () => {
      this.handleSliderChange(config);
    });

    input.addEventListener('pointerdown', () => {
      trackWrapper.classList.add('elastic');
      setTimeout(() => trackWrapper.classList.remove('elastic'), 150);
    });

    group.appendChild(label);
    group.appendChild(trackWrapper);

    return group;
  }

  private handleSliderChange(config: SliderConfig): void {
    const slider = this.sliders.get(config.key);
    if (!slider) return;

    const value = parseFloat(slider.input.value);
    const percent = ((value - config.min) / (config.max - config.min)) * 100;

    slider.fill.style.width = `${percent}%`;
    slider.thumb.style.left = `${percent}%`;

    const displayValue = config.key === 'temperature'
      ? value.toFixed(1)
      : Math.round(value).toString();
    slider.valueDisplay.textContent = `${displayValue}${config.unit}`;

    this.onParamChange({ [config.key]: value });
  }

  private setupInteractionEffects(): void {
    this.sliders.forEach(({ track }, key) => {
      const config = this.sliderConfigs.find(c => c.key === key);
      if (!config) return;

      const wrapper = track.parentElement;
      if (!wrapper) return;

      wrapper.addEventListener('mouseenter', () => {
        wrapper.classList.add('hovered');
      });

      wrapper.addEventListener('mouseleave', () => {
        wrapper.classList.remove('hovered');
      });
    });
  }

  private setupResponsive(): void {
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'panel-toggle-btn';
    this.toggleBtn.innerHTML = '⚙';
    this.toggleBtn.title = '显示控制面板';
    this.toggleBtn.setAttribute('aria-label', '切换控制面板');
    this.container.appendChild(this.toggleBtn);

    let isAnimating = false;

    const checkWidth = () => {
      const isNarrow = window.innerWidth < 768;
      if (isNarrow) {
        this.toggleBtn?.classList.add('visible');
        if (!this.isPanelVisible) {
          this.panel.classList.add('hidden');
        } else if (this.panel.classList.contains('hidden')) {
          this.panel.classList.remove('hidden');
        }
      } else {
        this.toggleBtn?.classList.remove('visible');
        this.panel.classList.remove('hidden');
        this.panel.style.animation = '';
        this.isPanelVisible = true;
      }
    };

    const animatePanel = (show: boolean) => {
      if (isAnimating) return;
      isAnimating = true;

      if (show) {
        this.isPanelVisible = true;
        this.panel.classList.remove('hidden');
        this.panel.style.animation = 'none';
        void this.panel.offsetWidth;
        this.panel.style.animation = 'fadeSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        if (this.toggleBtn) this.toggleBtn.innerHTML = '✕';
        setTimeout(() => {
          isAnimating = false;
        }, 300);
      } else {
        this.isPanelVisible = false;
        this.panel.style.animation = 'none';
        void this.panel.offsetWidth;
        this.panel.style.animation = 'fadeSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        if (this.toggleBtn) this.toggleBtn.innerHTML = '⚙';
        setTimeout(() => {
          if (!this.isPanelVisible) {
            this.panel.classList.add('hidden');
          }
          isAnimating = false;
        }, 300);
      }
    };

    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      animatePanel(!this.isPanelVisible);
    });

    document.addEventListener('click', (e) => {
      const isNarrow = window.innerWidth < 768;
      if (!isNarrow || !this.isPanelVisible) return;
      const target = e.target as Node;
      if (this.panel.contains(target) || (this.toggleBtn && this.toggleBtn.contains(target))) return;
      animatePanel(false);
    });

    window.addEventListener('resize', checkWidth);
    checkWidth();
    if (window.innerWidth < 768) {
      this.isPanelVisible = false;
      this.panel.classList.add('hidden');
    }
  }

  public getParams(): EnvironmentParams {
    const params: Partial<EnvironmentParams> = {};
    this.sliderConfigs.forEach(config => {
      const slider = this.sliders.get(config.key);
      if (slider) {
        params[config.key] = parseFloat(slider.input.value);
      }
    });
    return params as EnvironmentParams;
  }

  public setParams(params: Partial<EnvironmentParams>): void {
    Object.entries(params).forEach(([key, value]) => {
      const config = this.sliderConfigs.find(c => c.key === key);
      const slider = this.sliders.get(key as keyof EnvironmentParams);
      if (config && slider && value !== undefined) {
        slider.input.value = String(value);
        this.handleSliderChange(config);
      }
    });
  }
}
