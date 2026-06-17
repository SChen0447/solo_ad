import { AudioAnalyzer, BeatDetectionResult } from './audioAnalyzer';
import { NeonRing } from './neonRing';

class NeonRhythmVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioAnalyzer: AudioAnalyzer;
  private rings: NeonRing[] = [];
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private fps: number = 60;
  private fpsUpdateTime: number = 0;
  private frameCount: number = 0;
  private isRunning: boolean = false;
  private isFullscreen: boolean = false;
  private centerX: number = 0;
  private centerY: number = 0;
  private baseCanvasSize: number = 600;

  private noteBeatFlash: boolean = false;
  private noteBeatStartTime: number = 0;
  private noteBeatDuration: number = 200;

  private micBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private thresholdSlider: HTMLInputElement;
  private thresholdValue: HTMLSpanElement;
  private statusText: HTMLSpanElement;
  private fpsCounter: HTMLDivElement;
  private fullscreenBtn: HTMLButtonElement;
  private appContainer: HTMLDivElement;

  constructor() {
    this.canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.audioAnalyzer = new AudioAnalyzer();

    this.micBtn = document.getElementById('micBtn') as HTMLButtonElement;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    this.thresholdSlider = document.getElementById('thresholdSlider') as HTMLInputElement;
    this.thresholdValue = document.getElementById('thresholdValue') as HTMLSpanElement;
    this.statusText = document.getElementById('statusText') as HTMLSpanElement;
    this.fpsCounter = document.getElementById('fpsCounter') as HTMLDivElement;
    this.fullscreenBtn = document.getElementById('fullscreenBtn') as HTMLButtonElement;
    this.appContainer = document.getElementById('appContainer') as HTMLDivElement;

    this.initCanvas();
    this.initRings();
    this.bindEvents();
    this.startAnimation();
  }

  private initCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const size = this.baseCanvasSize;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.scale(dpr, dpr);

    this.centerX = size / 2;
    this.centerY = size / 2;
  }

  private initRings(): void {
    this.rings = [];
    const ringCount = 5;
    const ringSpacing = 20;
    const innerMostRadius = 40;

    for (let i = 0; i < ringCount; i++) {
      const radius = innerMostRadius + i * (ringSpacing + 30);
      const hue = i * 60;
      const direction = i % 2 === 0 ? 1 : -1;
      const ring = new NeonRing(this.centerX, this.centerY, radius, hue, direction);
      this.rings.push(ring);
    }
  }

  private bindEvents(): void {
    this.micBtn.addEventListener('click', () => this.handleMicClick());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.playBtn.addEventListener('click', () => this.handlePlayClick());
    this.pauseBtn.addEventListener('click', () => this.handlePauseClick());
    this.thresholdSlider.addEventListener('input', () => this.handleThresholdChange());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    window.addEventListener('resize', () => this.handleResize());
  }

  private async handleMicClick(): Promise<void> {
    if (this.audioAnalyzer.getSourceType() === 'microphone') {
      this.audioAnalyzer.cleanup();
      this.micBtn.classList.remove('active');
      this.playBtn.disabled = true;
      this.pauseBtn.disabled = true;
      this.statusText.textContent = '麦克风已关闭';
      return;
    }

    try {
      this.statusText.textContent = '正在请求麦克风权限...';
      await this.audioAnalyzer.initMicrophone();
      this.micBtn.classList.add('active');
      this.playBtn.disabled = true;
      this.pauseBtn.disabled = true;
      this.statusText.textContent = '麦克风已激活';
      this.audioAnalyzer.play();
    } catch (error) {
      this.statusText.textContent = (error as Error).message;
    }
  }

  private async handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      this.statusText.textContent = '正在加载音频文件...';
      await this.audioAnalyzer.initFromFile(file);
      this.micBtn.classList.remove('active');
      this.playBtn.disabled = false;
      this.pauseBtn.disabled = false;
      this.statusText.textContent = `已加载: ${file.name}`;
    } catch (error) {
      this.statusText.textContent = '加载失败: ' + (error as Error).message;
    }
  }

  private handlePlayClick(): void {
    if (this.audioAnalyzer.isInitialized()) {
      this.audioAnalyzer.play();
      this.statusText.textContent = '正在播放...';
    }
  }

  private handlePauseClick(): void {
    if (this.audioAnalyzer.isInitialized()) {
      this.audioAnalyzer.pause();
      this.statusText.textContent = '已暂停';
    }
  }

  private handleThresholdChange(): void {
    const value = parseFloat(this.thresholdSlider.value);
    this.audioAnalyzer.setBeatThreshold(value);
    this.thresholdValue.textContent = value.toFixed(2);
  }

  private toggleFullscreen(): void {
    if (!this.isFullscreen) {
      this.enterFullscreen();
    } else {
      this.exitFullscreen();
    }
  }

  private enterFullscreen(): void {
    this.isFullscreen = true;
    this.appContainer.classList.add('fullscreen-container');
    this.fullscreenBtn.textContent = '⛶ 退出全屏';

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.centerX = w / 2;
    this.centerY = h / 2;

    const scale = Math.min(w, h) / this.baseCanvasSize;
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].setPosition(this.centerX, this.centerY);
      const innerMostRadius = 40 * scale;
      const ringSpacing = 20 * scale;
      const radius = innerMostRadius + i * (ringSpacing + 30 * scale);
      this.rings[i].setBaseRadius(radius);
    }
  }

  private exitFullscreen(): void {
    this.isFullscreen = false;
    this.appContainer.classList.remove('fullscreen-container');
    this.fullscreenBtn.textContent = '⛶ 全屏';
    this.initCanvas();
    this.initRings();
  }

  private handleResize(): void {
    if (this.isFullscreen) {
      this.enterFullscreen();
    }
  }

  private startAnimation(): void {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      this.updateFpsDisplay();
    }

    let beatResult: BeatDetectionResult | null = null;
    if (this.audioAnalyzer.isInitialized()) {
      beatResult = this.audioAnalyzer.analyze();
      this.updateRings(beatResult, deltaTime);

      if (beatResult.isBeat) {
        this.triggerBeatAnimation();
      }
    } else {
      for (const ring of this.rings) {
        ring.setEnergy(0.1);
        ring.update(deltaTime);
      }
    }

    this.draw(beatResult);

    this.animationId = requestAnimationFrame(this.animate);
  };

  private updateRings(beatResult: BeatDetectionResult, deltaTime: number): void {
    const { bands } = beatResult;
    const energies = [bands.low, bands.midLow, bands.mid, bands.midHigh, bands.high];

    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i].setEnergy(energies[i] || 0);
      this.rings[i].update(deltaTime);
    }
  }

  private triggerBeatAnimation(): void {
    for (const ring of this.rings) {
      ring.triggerBeat();
    }
    this.noteBeatFlash = true;
    this.noteBeatStartTime = performance.now();
  }

  private draw(beatResult: BeatDetectionResult | null): void {
    const ctx = this.ctx;
    const w = this.isFullscreen ? window.innerWidth : this.baseCanvasSize;
    const h = this.isFullscreen ? window.innerHeight : this.baseCanvasSize;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].draw(ctx);
    }

    const avgEnergy = beatResult ? beatResult.averageEnergy : 0.1;
    this.drawCenterNote(ctx, avgEnergy);
  }

  private drawCenterNote(ctx: CanvasRenderingContext2D, energy: number): void {
    const minSize = 32;
    const maxSize = 64;
    const size = minSize + (maxSize - minSize) * energy;

    let color: string;
    if (this.noteBeatFlash) {
      const elapsed = performance.now() - this.noteBeatStartTime;
      if (elapsed >= this.noteBeatDuration) {
        this.noteBeatFlash = false;
        color = 'hsl(180, 90%, 70%)';
      } else {
        const alpha = 1 - elapsed / this.noteBeatDuration;
        color = `rgba(255, 255, 255, ${alpha})`;
      }
    } else {
      color = 'hsl(180, 90%, 70%)';
    }

    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    ctx.shadowBlur = 20;
    ctx.shadowColor = color;

    ctx.fillStyle = color;
    this.drawNoteIcon(ctx, size);

    ctx.restore();
  }

  private drawNoteIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const s = size / 2;
    const pixelSize = size / 16;

    ctx.fillRect(-s + pixelSize * 2, -s + pixelSize * 2, pixelSize * 3, pixelSize * 2);
    ctx.fillRect(-s + pixelSize * 4, -s + pixelSize, pixelSize * 2, pixelSize * 3);
    ctx.fillRect(-s + pixelSize * 5, -s + pixelSize * 2, pixelSize * 6, pixelSize * 2);
    ctx.fillRect(-s + pixelSize * 10, -s + pixelSize, pixelSize * 2, pixelSize * 4);
    ctx.fillRect(-s + pixelSize * 4, -s + pixelSize * 4, pixelSize * 2, pixelSize * 6);
    ctx.fillRect(-s + pixelSize * 10, -s + pixelSize * 4, pixelSize * 2, pixelSize * 5);

    ctx.beginPath();
    ctx.ellipse(-s + pixelSize * 4, -s + pixelSize * 12, pixelSize * 3, pixelSize * 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-s + pixelSize * 10, -s + pixelSize * 11, pixelSize * 3, pixelSize * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private updateFpsDisplay(): void {
    this.fpsCounter.textContent = `${this.fps} FPS`;
    this.fpsCounter.classList.remove('fps-green', 'fps-yellow', 'fps-red');

    if (this.fps >= 45) {
      this.fpsCounter.classList.add('fps-green');
    } else if (this.fps >= 30) {
      this.fpsCounter.classList.add('fps-yellow');
    } else {
      this.fpsCounter.classList.add('fps-red');
    }
  }

  public destroy(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.audioAnalyzer.cleanup();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NeonRhythmVisualizer();
});
