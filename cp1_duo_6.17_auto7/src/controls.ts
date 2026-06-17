import type { VisualizerParams, GradientMode, RenderMode } from './visualizer';

export type ParamsChangeCallback = (params: Partial<VisualizerParams>) => void;
export type PlayToggleCallback = () => void;
export type SeekCallback = (fraction: number) => void;

interface SliderConfig {
  slider: HTMLInputElement;
  tooltip: HTMLElement;
  valueLabel: HTMLElement;
  formatter: (v: number) => string;
  paramKey: keyof VisualizerParams;
  lastValue: number;
}

export class Controls {
  private onParamsChange: ParamsChangeCallback | null = null;
  private onPlayToggle: PlayToggleCallback | null = null;
  private onSeek: SeekCallback | null = null;

  private sliders: Map<string, SliderConfig> = new Map();
  private gradientBtns: NodeListOf<HTMLButtonElement>;
  private modeBtns: NodeListOf<HTMLButtonElement>;
  private btnPlay: HTMLButtonElement;
  private playIcon: SVGElement;
  private pauseIcon: SVGElement;
  private progressBar: HTMLElement;
  private progressFill: HTMLElement;
  private timeDisplay: HTMLElement;
  private togglePanel: HTMLButtonElement;
  private controlPanel: HTMLElement;

  private targetBlur = 10;
  private currentBlur = 10;
  private targetBorderAlpha = 0.08;
  private currentBorderAlpha = 0.08;
  private targetSpot = 0.06;
  private currentSpot = 0.06;

  private hideTooltipTimers: Map<string, number> = new Map();

  constructor() {
    const sliderRadius = document.getElementById('slider-radius') as HTMLInputElement;
    const sliderSize = document.getElementById('slider-size') as HTMLInputElement;
    const sliderRotation = document.getElementById('slider-rotation') as HTMLInputElement;
    const sliderParticles = document.getElementById('slider-particles') as HTMLInputElement;

    const valRadius = document.getElementById('val-radius')!;
    const valSize = document.getElementById('val-size')!;
    const valRotation = document.getElementById('val-rotation')!;
    const valParticles = document.getElementById('val-particles')!;

    const tipRadius = document.getElementById('tip-radius')!;
    const tipSize = document.getElementById('tip-size')!;
    const tipRotation = document.getElementById('tip-rotation')!;
    const tipParticles = document.getElementById('tip-particles')!;

    this.sliders.set('radius', {
      slider: sliderRadius,
      tooltip: tipRadius,
      valueLabel: valRadius,
      formatter: (v) => v.toFixed(1),
      paramKey: 'spreadRadius',
      lastValue: parseFloat(sliderRadius.value),
    });
    this.sliders.set('size', {
      slider: sliderSize,
      tooltip: tipSize,
      valueLabel: valSize,
      formatter: (v) => v.toFixed(1),
      paramKey: 'sizeScale',
      lastValue: parseFloat(sliderSize.value),
    });
    this.sliders.set('rotation', {
      slider: sliderRotation,
      tooltip: tipRotation,
      valueLabel: valRotation,
      formatter: (v) => v.toFixed(0),
      paramKey: 'rotationSpeed',
      lastValue: parseFloat(sliderRotation.value),
    });
    this.sliders.set('particles', {
      slider: sliderParticles,
      tooltip: tipParticles,
      valueLabel: valParticles,
      formatter: (v) => v.toFixed(0),
      paramKey: 'particleCount',
      lastValue: parseFloat(sliderParticles.value),
    });

    this.gradientBtns = document.querySelectorAll('.gradient-btn');
    this.modeBtns = document.querySelectorAll('.mode-btn');
    this.btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
    this.playIcon = document.getElementById('play-icon') as unknown as SVGElement;
    this.pauseIcon = document.getElementById('pause-icon') as unknown as SVGElement;
    this.progressBar = document.getElementById('progress-bar')!;
    this.progressFill = document.getElementById('progress-fill')!;
    this.timeDisplay = document.getElementById('time-display')!;
    this.togglePanel = document.getElementById('toggle-panel') as HTMLButtonElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;

    this.bindSliders();
    this.bindGradientButtons();
    this.bindModeButtons();
    this.bindPlayButton();
    this.bindProgressBar();
    this.bindTogglePanel();
    this.bindPanelDynamicGlass();
    this.startPanelAnimation();

    this.sliders.forEach((cfg) => {
      this.positionTooltip(cfg);
    });
  }

  private bindSliders(): void {
    this.sliders.forEach((cfg, key) => {
      const { slider, tooltip, valueLabel, formatter, paramKey } = cfg;

      const handleInput = () => {
        const val = parseFloat(slider.value);
        const text = formatter(val);

        tooltip.textContent = text;
        valueLabel.textContent = text;

        if (val !== cfg.lastValue) {
          cfg.lastValue = val;
          this.bumpElement(tooltip);
          this.bumpElement(valueLabel);
        }

        this.positionTooltip(cfg);

        const params: Partial<VisualizerParams> = {};
        (params as Record<string, number>)[paramKey] = val;
        this.emitParams(params);
      };

      const showTooltip = () => {
        const existingTimer = this.hideTooltipTimers.get(key);
        if (existingTimer !== undefined) {
          window.clearTimeout(existingTimer);
          this.hideTooltipTimers.delete(key);
        }
        tooltip.classList.add('visible');
        this.positionTooltip(cfg);
      };

      const hideTooltip = () => {
        const timer = window.setTimeout(() => {
          tooltip.classList.remove('visible');
          this.hideTooltipTimers.delete(key);
        }, 800);
        this.hideTooltipTimers.set(key, timer);
      };

      slider.addEventListener('input', handleInput);
      slider.addEventListener('pointerdown', showTooltip);
      slider.addEventListener('pointermove', showTooltip);
      slider.addEventListener('pointerup', hideTooltip);
      slider.addEventListener('pointerleave', hideTooltip);
    });
  }

  private positionTooltip(cfg: SliderConfig): void {
    const { slider, tooltip } = cfg;
    const val = parseFloat(slider.value);
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const fraction = Math.max(0, Math.min(1, (val - min) / (max - min)));
    const percent = fraction * 100;
    tooltip.style.left = `${percent}%`;
  }

  private bumpElement(el: HTMLElement): void {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    window.setTimeout(() => el.classList.remove('bump'), 160);
  }

  private bindGradientButtons(): void {
    this.gradientBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.gradientBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.gradient as GradientMode;
        this.emitParams({ gradientMode: mode });
      });
    });
  }

  private bindModeButtons(): void {
    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode as RenderMode;
        this.emitParams({ renderMode: mode });
      });
    });
  }

  private bindPlayButton(): void {
    this.btnPlay.addEventListener('click', () => {
      if (this.onPlayToggle) {
        this.onPlayToggle();
      }
    });
  }

  private bindProgressBar(): void {
    const handleSeek = (e: MouseEvent) => {
      const rect = this.progressBar.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (this.onSeek) {
        this.onSeek(fraction);
      }
    };

    this.progressBar.addEventListener('click', handleSeek);
  }

  private bindTogglePanel(): void {
    this.togglePanel.addEventListener('click', () => {
      this.controlPanel.classList.toggle('collapsed');
    });
  }

  private bindPanelDynamicGlass(): void {
    let breath = 0;

    const tickBreath = () => {
      breath += 0.02;
      const breathOffset = Math.sin(breath) * 0.5;
      this.targetSpot = 0.06 + breathOffset * 0.015;
      requestAnimationFrame(tickBreath);
    };
    tickBreath();

    this.controlPanel.addEventListener('pointerenter', () => {
      this.targetBlur = 12;
      this.targetBorderAlpha = 0.12;
    });

    this.controlPanel.addEventListener('pointerleave', () => {
      this.targetBlur = 10;
      this.targetBorderAlpha = 0.08;
    });

    this.controlPanel.addEventListener('pointermove', (e) => {
      const rect = this.controlPanel.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      this.controlPanel.style.setProperty('--mx', `${x}%`);
      this.controlPanel.style.setProperty('--my', `${y}%`);

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dist = Math.hypot(e.clientX - rect.left - cx, e.clientY - rect.top - cy);
      const maxDist = Math.hypot(cx, cy);
      const proximity = 1 - dist / maxDist;
      this.targetBlur = 10 + proximity * 2;
      this.targetBorderAlpha = 0.08 + proximity * 0.06;
      this.targetSpot = 0.06 + proximity * 0.06;
    });
  }

  private startPanelAnimation(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      this.currentBlur += (this.targetBlur - this.currentBlur) * 0.08;
      this.currentBorderAlpha += (this.targetBorderAlpha - this.currentBorderAlpha) * 0.08;
      this.currentSpot += (this.targetSpot - this.currentSpot) * 0.08;

      this.controlPanel.style.setProperty('--panel-blur', `${this.currentBlur.toFixed(2)}px`);
      this.controlPanel.style.setProperty('--panel-border-alpha', this.currentBorderAlpha.toFixed(3));
      this.controlPanel.style.setProperty('--panel-spot', this.currentSpot.toFixed(3));
    };
    animate();
  }

  private emitParams(params: Partial<VisualizerParams>): void {
    if (this.onParamsChange) {
      this.onParamsChange(params);
    }
  }

  setParamsChangeListener(callback: ParamsChangeCallback): void {
    this.onParamsChange = callback;
  }

  setPlayToggleListener(callback: PlayToggleCallback): void {
    this.onPlayToggle = callback;
  }

  setSeekListener(callback: SeekCallback): void {
    this.onSeek = callback;
  }

  updatePlayState(isPlaying: boolean): void {
    if (isPlaying) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    } else {
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
    }
  }

  updateProgress(currentTime: number, duration: number): void {
    const fraction = duration > 0 ? currentTime / duration : 0;
    this.progressFill.style.width = `${fraction * 100}%`;
    this.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
  }

  showUI(): void {
    const waveformContainer = document.getElementById('waveform-container')!;
    const playbackBar = document.getElementById('playback-bar')!;
    const controlPanel = document.getElementById('control-panel')!;

    waveformContainer.classList.add('visible');
    playbackBar.classList.add('visible');
    controlPanel.classList.add('visible');
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
