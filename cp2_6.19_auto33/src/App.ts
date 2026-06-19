import { AudioLoader } from './audio/AudioLoader';
import { Renderer } from './render/Renderer';
import { ThemeType } from './render/ThemeManager';

class App {
  private audioLoader: AudioLoader;
  private renderer: Renderer;

  private source: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private audioUpdateFrameId: number | null = null;

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

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
    });

    let dragCounter = 0;

    this.uploadZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      this.uploadZone.classList.add('drag-over');
    });

    this.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadZone.classList.add('drag-over');
    });

    this.uploadZone.addEventListener('dragleave', () => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        this.uploadZone.classList.remove('drag-over');
      }
    });

    this.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
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
        this.seek(percent * duration);
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
      this.stopPlayback();
      await this.audioLoader.loadFile(file);
      this.renderer.setSpectrumAnalyzer(this.audioLoader.getSpectrumAnalyzer());
      this.startPlayback();
      this.showControls();
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('音频文件加载失败，请尝试其他文件');
    }
  }

  private startPlayback(offset?: number): void {
    const audioContext = this.audioLoader.getAudioContext();
    const audioBuffer = this.audioLoader.getAudioBuffer();
    const analyzer = this.audioLoader.getSpectrumAnalyzer();

    if (!audioContext || !audioBuffer || !analyzer) return;

    this.stopSource();

    this.source = audioContext.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(analyzer.getAnalyserNode());

    this.source.onended = () => {
      if (this.isPlaying && this.source) {
        this.isPlaying = false;
        this.pausedAt = 0;
        try {
          this.source.disconnect();
        } catch (e) {}
        this.source = null;
        this.updatePlayUI();
      }
    };

    const startOffset = offset !== undefined ? offset : this.pausedAt;
    this.startTime = audioContext.currentTime - startOffset;
    this.source.start(0, startOffset);
    this.isPlaying = true;
    this.updatePlayUI();
    this.startUIUpdateLoop();
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (e) {}
      try {
        this.source.disconnect();
      } catch (e) {}
      this.source = null;
    }
  }

  private pausePlayback(): void {
    const audioContext = this.audioLoader.getAudioContext();
    if (this.isPlaying && audioContext) {
      this.pausedAt = audioContext.currentTime - this.startTime;
      this.stopSource();
      this.isPlaying = false;
      this.updatePlayUI();
    }
  }

  private stopPlayback(): void {
    this.stopSource();
    this.isPlaying = false;
    this.pausedAt = 0;
    if (this.audioUpdateFrameId) {
      cancelAnimationFrame(this.audioUpdateFrameId);
      this.audioUpdateFrameId = null;
    }
  }

  private seek(time: number): void {
    const duration = this.audioLoader.getDuration();
    if (duration <= 0) return;

    this.pausedAt = Math.max(0, Math.min(time, duration));

    if (this.isPlaying) {
      this.startPlayback(this.pausedAt);
    } else {
      this.updateTimeDisplay();
    }
  }

  private togglePlayPause(): void {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  private startUIUpdateLoop(): void {
    const updateUI = () => {
      if (!this.isPlaying) {
        this.audioUpdateFrameId = null;
        return;
      }
      this.updateTimeDisplay();
      this.audioUpdateFrameId = requestAnimationFrame(updateUI);
    };
    if (!this.audioUpdateFrameId) {
      updateUI();
    }
  }

  private updatePlayUI(): void {
    this.playStatusIcon.textContent = this.isPlaying ? '⏸' : '▶';
    this.playPauseBtn.textContent = this.isPlaying ? '⏸' : '▶';

    if (!this.isPlaying && this.audioUpdateFrameId) {
      cancelAnimationFrame(this.audioUpdateFrameId);
      this.audioUpdateFrameId = null;
    }
  }

  private updateTimeDisplay(): void {
    const audioContext = this.audioLoader.getAudioContext();
    const duration = this.audioLoader.getDuration();
    const currentTime = this.isPlaying && audioContext
      ? audioContext.currentTime - this.startTime
      : this.pausedAt;

    if (duration > 0) {
      const percent = (currentTime / duration) * 100;
      this.progress.style.width = `${percent}%`;
    }

    this.timeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
  }

  private showControls(): void {
    this.uploadZone.classList.add('hidden');
    this.audioInfo.classList.add('visible');
    this.playStatus.classList.add('visible');
    this.controls.classList.add('visible');

    this.audioName.textContent = this.audioLoader.getFileName();
    this.audioDuration.textContent = `时长: ${this.formatTime(this.audioLoader.getDuration())}`;
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

  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '0:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private dispose(): void {
    this.stopPlayback();
    this.audioLoader.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
