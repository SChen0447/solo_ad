import type { AudioEngine } from './audioEngine';
import type { WaveRenderer, HitResult } from './waveRenderer';
import type { ColorMode } from './waveRenderer';

export interface UIControllerOptions {
  container: HTMLElement;
  audioEngine: AudioEngine;
  waveRenderer: WaveRenderer;
}

export interface InfoBoxData {
  time: number;
  low: number;
  mid: number;
  high: number;
}

export class UIController {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private waveRenderer: WaveRenderer;
  
  private uploadBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private playIcon: HTMLElement;
  private progressContainer: HTMLDivElement;
  private progressBar: HTMLDivElement;
  private currentTimeEl: HTMLElement;
  private totalTimeEl: HTMLElement;
  private volumeSlider: HTMLInputElement;
  private colorToggle: HTMLDivElement;
  private uploadPrompt: HTMLDivElement;
  private infoBox: HTMLDivElement;
  private infoClose: HTMLButtonElement;
  
  private isDraggingProgress: boolean = false;
  private colorMode: ColorMode = 'frequency';
  
  private boundOnFileChange: (e: Event) => void;
  private boundOnUploadClick: () => void;
  private boundOnPlayClick: () => void;
  private boundOnProgressMouseDown: (e: MouseEvent) => void;
  private boundOnDocumentMouseMove: (e: MouseEvent) => void;
  private boundOnDocumentMouseUp: () => void;
  private boundOnVolumeChange: () => void;
  private boundOnColorToggle: () => void;
  private boundOnInfoClose: () => void;
  private boundOnStateChange: (isPlaying: boolean) => void;
  private boundOnProgress: (current: number, duration: number) => void;
  private boundOnWaveClick: (result: HitResult) => void;

  constructor(options: UIControllerOptions) {
    this.container = options.container;
    this.audioEngine = options.audioEngine;
    this.waveRenderer = options.waveRenderer;
    
    this.uploadBtn = this.getElementById('upload-btn') as HTMLButtonElement;
    this.fileInput = this.getElementById('file-input') as HTMLInputElement;
    this.playBtn = this.getElementById('play-btn') as HTMLButtonElement;
    this.playIcon = this.getElementById('play-icon') as HTMLElement;
    this.progressContainer = this.getElementById('progress-container') as HTMLDivElement;
    this.progressBar = this.getElementById('progress-bar') as HTMLDivElement;
    this.currentTimeEl = this.getElementById('current-time') as HTMLElement;
    this.totalTimeEl = this.getElementById('total-time') as HTMLElement;
    this.volumeSlider = this.getElementById('volume-slider') as HTMLInputElement;
    this.colorToggle = this.getElementById('color-toggle') as HTMLDivElement;
    this.uploadPrompt = this.getElementById('upload-prompt') as HTMLDivElement;
    this.infoBox = this.getElementById('info-box') as HTMLDivElement;
    this.infoClose = this.getElementById('info-close') as HTMLButtonElement;
    
    this.boundOnFileChange = this.onFileChange.bind(this);
    this.boundOnUploadClick = this.onUploadClick.bind(this);
    this.boundOnPlayClick = this.onPlayClick.bind(this);
    this.boundOnProgressMouseDown = this.onProgressMouseDown.bind(this);
    this.boundOnDocumentMouseMove = this.onDocumentMouseMove.bind(this);
    this.boundOnDocumentMouseUp = this.onDocumentMouseUp.bind(this);
    this.boundOnVolumeChange = this.onVolumeChange.bind(this);
    this.boundOnColorToggle = this.onColorToggle.bind(this);
    this.boundOnInfoClose = this.onInfoClose.bind(this);
    this.boundOnStateChange = this.onStateChange.bind(this);
    this.boundOnProgress = this.onProgress.bind(this);
    this.boundOnWaveClick = this.onWaveClick.bind(this);
    
    this.setupEventListeners();
    this.updatePlayButton(false);
  }

  private getElementById(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Element with id "${id}" not found`);
    }
    return el;
  }

  private setupEventListeners(): void {
    this.fileInput.addEventListener('change', this.boundOnFileChange);
    this.uploadBtn.addEventListener('click', this.boundOnUploadClick);
    this.playBtn.addEventListener('click', this.boundOnPlayClick);
    this.progressContainer.addEventListener('mousedown', this.boundOnProgressMouseDown);
    this.volumeSlider.addEventListener('input', this.boundOnVolumeChange);
    this.colorToggle.addEventListener('click', this.boundOnColorToggle);
    this.infoClose.addEventListener('click', this.boundOnInfoClose);
    
    document.addEventListener('mousemove', this.boundOnDocumentMouseMove, { passive: false });
    document.addEventListener('mouseup', this.boundOnDocumentMouseUp);
    
    this.audioEngine.onStateChange(this.boundOnStateChange);
    this.audioEngine.onProgress(this.boundOnProgress);
    this.waveRenderer.onWaveClick(this.boundOnWaveClick);
  }

  private onUploadClick(): void {
    this.fileInput.click();
  }

  private async onFileChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    try {
      this.uploadBtn.disabled = true;
      this.uploadBtn.querySelector('span')!.textContent = '加载中...';
      
      await this.audioEngine.loadFile(file);
      
      const duration = this.audioEngine.getDuration();
      this.waveRenderer.setTotalDuration(duration);
      this.waveRenderer.clearHistory();
      
      this.totalTimeEl.textContent = this.formatTime(duration);
      this.hideUploadPrompt();
      this.playBtn.disabled = false;
      
      this.audioEngine.play();
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('无法加载音频文件，请尝试其他格式。');
    } finally {
      this.uploadBtn.disabled = false;
      this.uploadBtn.querySelector('span')!.textContent = '📁 上传音乐';
      target.value = '';
    }
  }

  private onPlayClick(): void {
    if (this.audioEngine.isPlaying()) {
      this.audioEngine.pause();
    } else {
      this.audioEngine.play();
    }
  }

  private onProgressMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingProgress = true;
    this.updateProgressFromMouseEvent(event);
  }

  private onDocumentMouseMove(event: MouseEvent): void {
    if (this.isDraggingProgress) {
      event.preventDefault();
      this.updateProgressFromMouseEvent(event);
    }
  }

  private onDocumentMouseUp(): void {
    if (this.isDraggingProgress) {
      this.isDraggingProgress = false;
    }
  }

  private updateProgressFromMouseEvent(event: MouseEvent): void {
    const rect = this.progressContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const duration = this.audioEngine.getDuration();
    const time = ratio * duration;
    
    this.audioEngine.seek(time);
    this.updateProgressUI(time, duration);
  }

  private onVolumeChange(): void {
    const volume = parseInt(this.volumeSlider.value, 10) / 100;
    this.audioEngine.setVolume(volume);
  }

  private onColorToggle(): void {
    this.colorMode = this.colorMode === 'frequency' ? 'rainbow' : 'frequency';
    this.colorToggle.classList.toggle('active', this.colorMode === 'rainbow');
    this.waveRenderer.setColorMode(this.colorMode);
  }

  private onInfoClose(): void {
    this.hideInfoBox();
  }

  private onStateChange(isPlaying: boolean): void {
    this.updatePlayButton(isPlaying);
  }

  private onProgress(current: number, duration: number): void {
    if (!this.isDraggingProgress) {
      this.updateProgressUI(current, duration);
    }
  }

  private onWaveClick(result: HitResult): void {
    this.audioEngine.pause();
    this.showInfoBox({
      time: result.time,
      low: result.low,
      mid: result.mid,
      high: result.high
    });
  }

  private updatePlayButton(isPlaying: boolean): void {
    this.playIcon.textContent = isPlaying ? '⏸' : '▶';
  }

  private updateProgressUI(current: number, duration: number): void {
    const progress = duration > 0 ? (current / duration) * 100 : 0;
    this.progressBar.style.width = `${progress}%`;
    this.currentTimeEl.textContent = this.formatTime(current);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private formatTimeMs(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  showInfoBox(data: InfoBoxData): void {
    const lowBar = this.getElementById('freq-low-bar') as HTMLDivElement;
    const midBar = this.getElementById('freq-mid-bar') as HTMLDivElement;
    const highBar = this.getElementById('freq-high-bar') as HTMLDivElement;
    const lowValue = this.getElementById('freq-low-value') as HTMLElement;
    const midValue = this.getElementById('freq-mid-value') as HTMLElement;
    const highValue = this.getElementById('freq-high-value') as HTMLElement;
    const timeEl = this.getElementById('info-time') as HTMLElement;
    
    requestAnimationFrame(() => {
      lowBar.style.width = `${(data.low / 255) * 100}%`;
      midBar.style.width = `${(data.mid / 255) * 100}%`;
      highBar.style.width = `${(data.high / 255) * 100}%`;
      lowValue.textContent = Math.round(data.low).toString();
      midValue.textContent = Math.round(data.mid).toString();
      highValue.textContent = Math.round(data.high).toString();
      timeEl.textContent = this.formatTimeMs(data.time);
    });
    
    this.infoBox.classList.add('visible');
  }

  hideInfoBox(): void {
    this.infoBox.classList.remove('visible');
  }

  updateProgress(current: number, duration: number): void {
    if (!this.isDraggingProgress) {
      this.updateProgressUI(current, duration);
    }
  }

  private hideUploadPrompt(): void {
    this.uploadPrompt.classList.add('hidden');
  }

  destroy(): void {
    this.fileInput.removeEventListener('change', this.boundOnFileChange);
    this.uploadBtn.removeEventListener('click', this.boundOnUploadClick);
    this.playBtn.removeEventListener('click', this.boundOnPlayClick);
    this.progressContainer.removeEventListener('mousedown', this.boundOnProgressMouseDown);
    this.volumeSlider.removeEventListener('input', this.boundOnVolumeChange);
    this.colorToggle.removeEventListener('click', this.boundOnColorToggle);
    this.infoClose.removeEventListener('click', this.boundOnInfoClose);
    
    document.removeEventListener('mousemove', this.boundOnDocumentMouseMove);
    document.removeEventListener('mouseup', this.boundOnDocumentMouseUp);
  }
}
