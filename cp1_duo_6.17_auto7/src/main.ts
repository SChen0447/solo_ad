import { AudioVisualizer } from './visualizer';
import { Controls } from './controls';

class App {
  private visualizer: AudioVisualizer;
  private controls: Controls;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private isAudioLoaded = false;
  private currentPlaybackFraction = 0;
  private waveformData: Float32Array = new Float32Array(0);
  private cachedWaveform: { min: number; max: number }[] = [];

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
      if (this.cachedWaveform.length > 0) {
        this.buildCachedWaveform();
      }
    });

    this.waveformCanvas.addEventListener('click', (e) => {
      if (!this.isAudioLoaded) return;
      const rect = this.waveformCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = x / rect.width;
      const centerX = 0.5;
      const offset = (fraction - centerX) * 2;
      const targetFraction = Math.max(0, Math.min(1, this.currentPlaybackFraction + offset * 0.5));
      this.visualizer.seekTo(targetFraction);
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
      this.waveformData = this.visualizer.getWaveformData();
      this.buildCachedWaveform();
      this.isAudioLoaded = true;
      this.drawStaticWaveform();
    } catch (err) {
      console.error('Failed to load audio:', err);
    }
  }

  private buildCachedWaveform(): void {
    if (this.waveformData.length === 0) return;

    const canvas = this.waveformCanvas;
    const w = canvas.clientWidth;
    const samples = Math.floor(w * 1.5);
    this.cachedWaveform = [];

    const blockSize = Math.floor(this.waveformData.length / samples);
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      let min = 1;
      let max = -1;
      for (let j = 0; j < blockSize; j++) {
        const val = this.waveformData[start + j] ?? 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      this.cachedWaveform.push({ min, max });
    }
  }

  private drawStaticWaveform(): void {
    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const halfH = h / 2;

    ctx.clearRect(0, 0, w, h);

    if (this.cachedWaveform.length === 0) return;

    const sampleCount = this.cachedWaveform.length;
    const xStep = w / sampleCount;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(123, 47, 255, 0.6)';
    ctx.lineWidth = 1;

    for (let i = 0; i < sampleCount; i++) {
      const x = i * xStep;
      const s = this.cachedWaveform[i]!;
      const yMin = halfH + s.min * halfH;
      const yMax = halfH + s.max * halfH;
      ctx.moveTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    ctx.stroke();
  }

  private drawPlayingScrollingWaveform(): void {
    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const halfH = h / 2;

    ctx.clearRect(0, 0, w, h);

    if (this.cachedWaveform.length === 0) return;

    const totalSamples = this.cachedWaveform.length;
    const currentSample = Math.floor(this.currentPlaybackFraction * totalSamples);
    const centerX = w * 0.5;
    const samplesPerPixel = totalSamples / w;

    const gradient = ctx.createLinearGradient(0, 0, centerX, 0);
    gradient.addColorStop(0, 'rgba(123, 47, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(180, 100, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0.9)');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;

    for (let px = 0; px < centerX; px++) {
      const sampleIdx = Math.floor(currentSample - (centerX - px) * samplesPerPixel);
      if (sampleIdx < 0 || sampleIdx >= totalSamples) continue;
      const s = this.cachedWaveform[sampleIdx]!;
      const yMin = halfH + s.min * halfH;
      const yMax = halfH + s.max * halfH;
      ctx.moveTo(px, yMin);
      ctx.lineTo(px, yMax);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(123, 47, 255, 0.25)';
    ctx.lineWidth = 1;

    for (let px = centerX; px < w; px++) {
      const sampleIdx = Math.floor(currentSample + (px - centerX) * samplesPerPixel);
      if (sampleIdx < 0 || sampleIdx >= totalSamples) continue;
      const s = this.cachedWaveform[sampleIdx]!;
      const yMin = halfH + s.min * halfH;
      const yMax = halfH + s.max * halfH;
      ctx.moveTo(px, yMin);
      ctx.lineTo(px, yMax);
    }
    ctx.stroke();

    ctx.beginPath();
    const playheadGrad = ctx.createLinearGradient(centerX, 0, centerX, h);
    playheadGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    playheadGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
    playheadGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.9)');
    playheadGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.strokeStyle = playheadGrad;
    ctx.lineWidth = 2;
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 107, 53, 0.9)';
    ctx.arc(centerX, halfH, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(255, 107, 53, 0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 107, 53, 1)';
    ctx.arc(centerX, halfH, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawPausedScrollingWaveform(): void {
    const canvas = this.waveformCanvas;
    const ctx = this.waveformCtx;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const halfH = h / 2;

    ctx.clearRect(0, 0, w, h);

    if (this.cachedWaveform.length === 0) return;

    const totalSamples = this.cachedWaveform.length;
    const currentSample = Math.floor(this.currentPlaybackFraction * totalSamples);
    const centerX = w * 0.5;
    const samplesPerPixel = totalSamples / w;

    const gradient = ctx.createLinearGradient(0, 0, centerX, 0);
    gradient.addColorStop(0, 'rgba(123, 47, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0.7)');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.2;

    for (let px = 0; px < centerX; px++) {
      const sampleIdx = Math.floor(currentSample - (centerX - px) * samplesPerPixel);
      if (sampleIdx < 0 || sampleIdx >= totalSamples) continue;
      const s = this.cachedWaveform[sampleIdx]!;
      const yMin = halfH + s.min * halfH;
      const yMax = halfH + s.max * halfH;
      ctx.moveTo(px, yMin);
      ctx.lineTo(px, yMax);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(123, 47, 255, 0.2)';
    ctx.lineWidth = 1;

    for (let px = centerX; px < w; px++) {
      const sampleIdx = Math.floor(currentSample + (px - centerX) * samplesPerPixel);
      if (sampleIdx < 0 || sampleIdx >= totalSamples) continue;
      const s = this.cachedWaveform[sampleIdx]!;
      const yMin = halfH + s.min * halfH;
      const yMax = halfH + s.max * halfH;
      ctx.moveTo(px, yMin);
      ctx.lineTo(px, yMax);
    }
    ctx.stroke();

    ctx.beginPath();
    const playheadGrad = ctx.createLinearGradient(centerX, 0, centerX, h);
    playheadGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    playheadGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    playheadGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
    playheadGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.strokeStyle = playheadGrad;
    ctx.lineWidth = 2;
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, h);
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
        this.drawPlayingScrollingWaveform();
      } else {
        this.drawPausedScrollingWaveform();
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
