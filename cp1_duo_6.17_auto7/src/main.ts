import { AudioVisualizer } from './visualizer';
import { Controls } from './controls';

class App {
  private visualizer: AudioVisualizer;
  private controls: Controls;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private isAudioLoaded = false;
  private currentPlaybackFraction = 0;

  constructor() {
    const container = document.getElementById('three-container')!;
    this.visualizer = new AudioVisualizer(container);
    this.controls = new Controls();

    this.waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.waveformCtx = this.waveformCanvas.getContext('2d')!;

    this.setupWaveformCanvas();
    this.setupFileUpload();
    this.setupControls();
    this.startWaveformLoop();
  }

  private setupWaveformCanvas(): void {
    const container = this.waveformCanvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    this.waveformCanvas.width = rect.width * dpr;
    this.waveformCanvas.height = rect.height * dpr;
    this.waveformCtx.scale(dpr, dpr);

    window.addEventListener('resize', () => {
      const newRect = container.getBoundingClientRect();
      const newDpr = window.devicePixelRatio || 1;
      this.waveformCanvas.width = newRect.width * newDpr;
      this.waveformCanvas.height = newRect.height * newDpr;
      this.waveformCtx.scale(newDpr, newDpr);
    });
  }

  private setupFileUpload(): void {
    const dropZone = document.getElementById('drop-zone')!;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer?.files[0];
      if (file) this.handleFile(file);
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) this.handleFile(file);
    });
  }

  private async handleFile(file: File): Promise<void> {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && ext !== 'mp3' && ext !== 'wav') {
      return;
    }

    try {
      await this.visualizer.loadAudio(file);

      const overlay = document.getElementById('upload-overlay')!;
      overlay.classList.add('hidden');

      this.controls.showUI();
      this.drawStaticWaveform();
      this.isAudioLoaded = true;
    } catch (err) {
      console.error('Failed to load audio:', err);
    }
  }

  private drawStaticWaveform(): void {
    const data = this.visualizer.getWaveformData();
    if (data.length === 0) return;

    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    const step = Math.ceil(data.length / w);
    const halfH = h / 2;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(123, 47, 255, 0.5)';
    ctx.lineWidth = 1;

    for (let x = 0; x < w; x++) {
      const idx = Math.floor(x * data.length / w);
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const val = data[idx + j] ?? 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const yMin = halfH + min * halfH;
      const yMax = halfH + max * halfH;
      ctx.moveTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    ctx.stroke();
  }

  private drawPlayingWaveform(): void {
    const data = this.visualizer.getWaveformData();
    if (data.length === 0) return;

    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    const step = Math.ceil(data.length / w);
    const halfH = h / 2;
    const playedX = this.currentPlaybackFraction * w;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(123, 47, 255, 0.3)';
    ctx.lineWidth = 1;

    for (let x = 0; x < w; x++) {
      if (x <= playedX) continue;
      const idx = Math.floor(x * data.length / w);
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const val = data[idx + j] ?? 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const yMin = halfH + min * halfH;
      const yMax = halfH + max * halfH;
      ctx.moveTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, playedX, 0);
    gradient.addColorStop(0, 'rgba(123, 47, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0.8)');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;

    for (let x = 0; x < playedX; x++) {
      const idx = Math.floor(x * data.length / w);
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const val = data[idx + j] ?? 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const yMin = halfH + min * halfH;
      const yMax = halfH + max * halfH;
      ctx.moveTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.moveTo(playedX, 0);
    ctx.lineTo(playedX, h);
    ctx.stroke();
  }

  private startWaveformLoop(): void {
    const loop = () => {
      requestAnimationFrame(loop);
      if (!this.isAudioLoaded) return;

      const duration = this.visualizer.getAudioDuration();
      const current = this.visualizer.getCurrentTime();
      this.currentPlaybackFraction = duration > 0 ? current / duration : 0;

      if (this.visualizer.getIsPlaying()) {
        this.drawPlayingWaveform();
      }
    };
    loop();
  }

  private setupControls(): void {
    this.controls.setParamsChangeListener((params) => {
      this.visualizer.updateParams(params);
    });

    this.controls.setPlayToggleListener(() => {
      const isPlaying = this.visualizer.togglePlay();
      this.controls.updatePlayState(isPlaying);
    });

    this.controls.setSeekListener((fraction) => {
      this.visualizer.seekTo(fraction);
    });

    this.visualizer.setOnTimeUpdate((currentTime, duration) => {
      this.controls.updateProgress(currentTime, duration);
    });
  }
}

new App();
