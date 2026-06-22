import { Subtitle, EffectConfig, RenderState, ExportState } from '../types';
import { EffectProcessor } from './effectProcessor';
import { eventBus } from '../utils/eventBus';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const FPS = 60;

export class SubtitleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;
  private effectProcessor: EffectProcessor;
  private subtitles: Subtitle[] = [];
  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private exportState: ExportState = {
    isExporting: false,
    progress: 0,
    downloadUrl: null,
  };

  constructor(canvas: HTMLCanvasElement, effectConfig: EffectConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = new OffscreenCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.effectProcessor = new EffectProcessor(effectConfig);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('effect:update', (config) => {
      this.effectProcessor.updateConfig(config);
    });
  }

  setSubtitles(subtitles: Subtitle[]): void {
    this.subtitles = subtitles;
  }

  getTotalDuration(): number {
    if (this.subtitles.length === 0) return 0;
    const lastSubtitle = this.subtitles.reduce((prev, curr) => {
      const prevEnd = prev.startTime + prev.duration;
      const currEnd = curr.startTime + curr.duration;
      return prevEnd > currEnd ? prev : curr;
    });
    return lastSubtitle.startTime + lastSubtitle.duration + 0.5;
  }

  getRenderState(): RenderState {
    const totalDuration = this.getTotalDuration();
    const currentTime = this.isPaused
      ? this.pausedTime
      : (performance.now() - this.startTime) / 1000;
    const clampedTime = Math.min(currentTime, totalDuration);
    return {
      isPlaying: this.animationFrameId !== null && !this.isPaused,
      currentTime: clampedTime,
      totalDuration,
      progress: totalDuration > 0 ? clampedTime / totalDuration : 0,
    };
  }

  start(): void {
    if (this.animationFrameId !== null) {
      this.cancelAnimationFrame();
    }
    this.startTime = performance.now() - this.pausedTime * 1000;
    this.isPaused = false;
    this.animationLoop();
  }

  pause(): void {
    if (this.animationFrameId !== null) {
      this.pausedTime = (performance.now() - this.startTime) / 1000;
      this.isPaused = true;
    }
  }

  stop(): void {
    this.cancelAnimationFrame();
    this.pausedTime = 0;
    this.isPaused = false;
    this.clearCanvas();
  }

  seek(time: number): void {
    this.pausedTime = Math.max(0, Math.min(time, this.getTotalDuration()));
    this.startTime = performance.now() - this.pausedTime * 1000;
    this.renderFrame(this.pausedTime);
  }

  private cancelAnimationFrame(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animationLoop = (): void => {
    const state = this.getRenderState();
    
    if (state.currentTime >= state.totalDuration && state.totalDuration > 0) {
      this.stop();
      eventBus.emit('player:pause', undefined);
      return;
    }

    this.renderFrame(state.currentTime);
    this.animationFrameId = requestAnimationFrame(this.animationLoop);
  };

  private renderFrame(currentTime: number): void {
    this.offscreenCtx.fillStyle = '#0f3460';
    this.offscreenCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = this.offscreenCtx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      0,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH / 2
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f3460');
    this.offscreenCtx.fillStyle = gradient;
    this.offscreenCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const subtitle of this.subtitles) {
      const matrix = this.effectProcessor.getTransformMatrix(
        subtitle,
        currentTime,
        CANVAS_HEIGHT
      );

      if (matrix.opacity <= 0) continue;

      this.offscreenCtx.save();
      this.offscreenCtx.globalAlpha = matrix.opacity;
      this.offscreenCtx.translate(
        CANVAS_WIDTH / 2 + matrix.translateX,
        CANVAS_HEIGHT / 2 + matrix.translateY
      );
      this.offscreenCtx.scale(matrix.scaleX, matrix.scaleY);

      this.offscreenCtx.font = `bold ${subtitle.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      this.offscreenCtx.textAlign = 'center';
      this.offscreenCtx.textBaseline = 'middle';

      this.offscreenCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.offscreenCtx.shadowBlur = 20;
      this.offscreenCtx.shadowOffsetX = 2;
      this.offscreenCtx.shadowOffsetY = 2;

      this.offscreenCtx.fillStyle = subtitle.color;
      this.offscreenCtx.fillText(subtitle.text, 0, 0);

      this.offscreenCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      this.offscreenCtx.lineWidth = 4;
      this.offscreenCtx.strokeText(subtitle.text, 0, 0);

      this.offscreenCtx.restore();
    }

    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.canvas.width, this.canvas.height);
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  async startExport(): Promise<string> {
    if (this.exportState.isExporting) {
      throw new Error('Export already in progress');
    }

    this.exportState = {
      isExporting: true,
      progress: 0,
      downloadUrl: null,
    };
    eventBus.emit('export:start', undefined);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_WIDTH;
    exportCanvas.height = CANVAS_HEIGHT;
    const exportCtx = exportCanvas.getContext('2d')!;

    const stream = exportCanvas.captureStream(FPS);
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: this.getSupportedMimeType(),
      videoBitsPerSecond: 5000000,
    });

    this.recordedChunks = [];
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        this.exportState = {
          isExporting: false,
          progress: 100,
          downloadUrl: url,
        };
        eventBus.emit('export:complete', url);
        resolve(url);
      };

      this.mediaRecorder.onerror = (event) => {
        this.exportState.isExporting = false;
        reject(event);
      };

      this.mediaRecorder.start();

      const totalDuration = this.getTotalDuration();
      const totalFrames = Math.ceil(totalDuration * FPS);
      let currentFrame = 0;

      const exportFrame = () => {
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
          return;
        }

        const currentTime = currentFrame / FPS;
        
        exportCtx.fillStyle = '#0f3460';
        exportCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const gradient = exportCtx.createRadialGradient(
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2,
          0,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2,
          CANVAS_WIDTH / 2
        );
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f3460');
        exportCtx.fillStyle = gradient;
        exportCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        for (const subtitle of this.subtitles) {
          const matrix = this.effectProcessor.getTransformMatrix(
            subtitle,
            currentTime,
            CANVAS_HEIGHT
          );

          if (matrix.opacity <= 0) continue;

          exportCtx.save();
          exportCtx.globalAlpha = matrix.opacity;
          exportCtx.translate(
            CANVAS_WIDTH / 2 + matrix.translateX,
            CANVAS_HEIGHT / 2 + matrix.translateY
          );
          exportCtx.scale(matrix.scaleX, matrix.scaleY);

          exportCtx.font = `bold ${subtitle.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`;
          exportCtx.textAlign = 'center';
          exportCtx.textBaseline = 'middle';

          exportCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          exportCtx.shadowBlur = 20;
          exportCtx.shadowOffsetX = 2;
          exportCtx.shadowOffsetY = 2;

          exportCtx.fillStyle = subtitle.color;
          exportCtx.fillText(subtitle.text, 0, 0);

          exportCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          exportCtx.lineWidth = 4;
          exportCtx.strokeText(subtitle.text, 0, 0);

          exportCtx.restore();
        }

        this.ctx.drawImage(exportCanvas, 0, 0, this.canvas.width, this.canvas.height);

        currentFrame++;
        const progress = Math.round((currentFrame / totalFrames) * 100);
        this.exportState.progress = Math.min(progress, 100);
        eventBus.emit('export:progress', this.exportState.progress);

        if (currentFrame < totalFrames) {
          requestAnimationFrame(exportFrame);
        } else {
          setTimeout(() => {
            this.mediaRecorder?.stop();
          }, 100);
        }
      };

      requestAnimationFrame(exportFrame);
    });
  }

  getExportState(): ExportState {
    return { ...this.exportState };
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm';
  }

  destroy(): void {
    this.cancelAnimationFrame();
    if (this.exportState.downloadUrl) {
      URL.revokeObjectURL(this.exportState.downloadUrl);
    }
    eventBus.clear();
  }
}
