import { AudioLoader } from './audio/AudioLoader';
import { Renderer } from './render/Renderer';
import { ThemeType } from './render/ThemeManager';

class App {
  private audioLoader: AudioLoader;
  private renderer: Renderer;
  
  private uploadZone: HTMLElement;
  private fileInput: HTMLInputElement;
  private audioInfo: HTMLElement;
  private audioName: HTMLElement;
  private audioDuration: HTMLElement;
  private playStatus: HTMLElement;
  private playStatusIcon: HTMLElement;
  private controls: HTMLElement;
  private themeButtons: NodeListOf<HTMLElement>;
  private playPauseBtn: HTMLButtonElement;
  private progressBar: HTMLElement;
  private progress: HTMLElement;
  private timeDisplay: HTMLElement;

  constructor() {
    this.audioLoader = new AudioLoader();
    
    const container = document.getElementById('canvas-container')!;
    this.renderer = new Renderer(container);
    
    this.uploadZone = document.getElementById('upload-zone')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.audioInfo = document.getElementById('audio-info')!;
    this.audioName = document.getElementById('audio-name')!;
    this.audioDuration = document.getElementById('audio-duration')!;
    this.playStatus = document.getElementById('play-status')!;
    this.playStatusIcon = document.getElementById('play-status-icon')!;
    this.controls = document.getElementById('controls')!;
    this.themeButtons = document.querySelectorAll('.theme-btn');
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.progressBar = document.getElementById('progress-bar')!;
    this.progress = document.getElementById('progress')!;
    this.timeDisplay = document.getElementById('time-display')!;
    
    this.setupAudioCallbacks();
    this.setupEventListeners();
    this.renderer.start();
  }

  private setupAudioCallbacks(): void {
    this.audioLoader.setSpectrumCallback((spectrum) => {
      this.renderer.setSpectrumData(spectrum);
    });
    
    this.audioLoader.setAudioInfoCallback((info) => {
      this.updateAudioInfo(info);
    });
  }

  private setupEventListeners(): void {
    this.uploadZone.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleFile(target.files[0]);
      }
    });
    
    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('drag-over');
    });
    
    this.uploadZone.addEventListener('dragleave', () => {
      this.uploadZone.classList.remove('drag-over');
    });
    
    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadZone.classList.remove('drag-over');
      
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (this.isValidAudioFile(file)) {
          this.handleFile(file);
        }
      }
    });
    
    this.playStatus.addEventListener('click', () => {
      this.togglePlayPause();
    });
    
    this.playPauseBtn.addEventListener('click', () => {
      this.togglePlayPause();
    });
    
    this.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme as ThemeType;
        if (theme) {
          this.switchTheme(theme);
        }
      });
    });
    
    this.progressBar.addEventListener('click', (e) => {
      const rect = this.progressBar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const duration = this.audioLoader.getDuration();
      if (duration > 0) {
        this.audioLoader.seek(percent * duration);
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.audioLoader.getDuration() > 0) {
        e.preventDefault();
        this.togglePlayPause();
      }
    });
    
    window.addEventListener('beforeunload', () => {
      this.dispose();
    });
  }

  private isValidAudioFile(file: File): boolean {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'];
    const validExtensions = ['.mp3', '.wav'];
    
    if (validTypes.includes(file.type)) {
      return true;
    }
    
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    return validExtensions.includes(extension);
  }

  private async handleFile(file: File): Promise<void> {
    if (!this.isValidAudioFile(file)) {
      alert('请上传 MP3 或 WAV 格式的音频文件');
      return;
    }
    
    try {
      await this.audioLoader.loadFile(file);
      this.renderer.setSpectrumAnalyzer(this.audioLoader.getSpectrumAnalyzer());
      this.showControls();
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('音频文件加载失败，请尝试其他文件');
    }
  }

  private showControls(): void {
    this.uploadZone.classList.add('hidden');
    this.audioInfo.classList.add('visible');
    this.playStatus.classList.add('visible');
    this.controls.classList.add('visible');
  }

  private togglePlayPause(): void {
    if (this.audioLoader.getIsPlaying()) {
      this.audioLoader.pause();
    } else {
      this.audioLoader.play();
    }
  }

  private switchTheme(theme: ThemeType): void {
    this.themeButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.theme === theme) {
        btn.classList.add('active');
      }
    });
    
    this.renderer.switchTheme(theme);
  }

  private updateAudioInfo(info: {
    name: string;
    duration: number;
    currentTime: number;
    isPlaying: boolean;
  }): void {
    this.audioName.textContent = info.name;
    this.audioDuration.textContent = `时长: ${this.formatTime(info.duration)}`;
    
    this.playStatusIcon.textContent = info.isPlaying ? '⏸' : '▶';
    this.playPauseBtn.textContent = info.isPlaying ? '⏸' : '▶';
    
    if (info.duration > 0) {
      const percent = (info.currentTime / info.duration) * 100;
      this.progress.style.width = `${percent}%`;
    }
    
    this.timeDisplay.textContent = `${this.formatTime(info.currentTime)} / ${this.formatTime(info.duration)}`;
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private dispose(): void {
    this.audioLoader.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
