import type { VisualizerParams, GradientMode, RenderMode } from './visualizer';

export type ParamsChangeCallback = (params: Partial<VisualizerParams>) => void;
export type PlayToggleCallback = () => void;
export type SeekCallback = (fraction: number) => void;

export class Controls {
  private onParamsChange: ParamsChangeCallback | null = null;
  private onPlayToggle: PlayToggleCallback | null = null;
  private onSeek: SeekCallback | null = null;

  private sliderRadius: HTMLInputElement;
  private sliderSize: HTMLInputElement;
  private sliderRotation: HTMLInputElement;
  private sliderParticles: HTMLInputElement;
  private valRadius: HTMLElement;
  private valSize: HTMLElement;
  private valRotation: HTMLElement;
  private valParticles: HTMLElement;
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

  constructor() {
    this.sliderRadius = document.getElementById('slider-radius') as HTMLInputElement;
    this.sliderSize = document.getElementById('slider-size') as HTMLInputElement;
    this.sliderRotation = document.getElementById('slider-rotation') as HTMLInputElement;
    this.sliderParticles = document.getElementById('slider-particles') as HTMLInputElement;
    this.valRadius = document.getElementById('val-radius')!;
    this.valSize = document.getElementById('val-size')!;
    this.valRotation = document.getElementById('val-rotation')!;
    this.valParticles = document.getElementById('val-particles')!;
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
  }

  private bindSliders(): void {
    this.sliderRadius.addEventListener('input', () => {
      const val = parseFloat(this.sliderRadius.value);
      this.valRadius.textContent = val.toFixed(1);
      this.emitParams({ spreadRadius: val });
    });

    this.sliderSize.addEventListener('input', () => {
      const val = parseFloat(this.sliderSize.value);
      this.valSize.textContent = val.toFixed(1);
      this.emitParams({ sizeScale: val });
    });

    this.sliderRotation.addEventListener('input', () => {
      const val = parseInt(this.sliderRotation.value, 10);
      this.valRotation.textContent = val.toString();
      this.emitParams({ rotationSpeed: val });
    });

    this.sliderParticles.addEventListener('input', () => {
      const val = parseInt(this.sliderParticles.value, 10);
      this.valParticles.textContent = val.toString();
      this.emitParams({ particleCount: val });
    });
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
