export interface Marker {
  id: string;
  time: number;
  note: string;
}

export interface WaveformOptions {
  canvas: HTMLCanvasElement;
  audioBuffer: AudioBuffer;
  markers?: Marker[];
  colorStart?: string;
  colorEnd?: string;
  backgroundColor?: string;
  waveHeightRatio?: number;
}

export class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioBuffer: AudioBuffer | null = null;
  private markers: Marker[] = [];
  private colorStart: string;
  private colorEnd: string;
  private backgroundColor: string;
  private waveHeightRatio: number;
  private playheadPosition: number = 0;
  private animationId: number | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private startPosition: number = 0;
  private audioContext: AudioContext | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private onPlayEnd: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;
    this.colorStart = '#3b82f6';
    this.colorEnd = '#8b5cf6';
    this.backgroundColor = '#1e1e2e';
    this.waveHeightRatio = 0.8;
  }

  setAudioBuffer(audioBuffer: AudioBuffer) {
    this.audioBuffer = audioBuffer;
    this.renderWaveform();
  }

  setMarkers(markers: Marker[]) {
    this.markers = markers;
    this.renderWaveform();
  }

  setOnTimeUpdate(callback: (time: number) => void) {
    this.onTimeUpdate = callback;
  }

  setOnPlayEnd(callback: () => void) {
    this.onPlayEnd = callback;
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  getCurrentTime(): number {
    return this.playheadPosition;
  }

  renderWaveform() {
    if (!this.audioBuffer) return;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const waveTop = height * (1 - this.waveHeightRatio) / 2;
    const waveBottom = height - waveTop;
    const waveHeight = waveBottom - waveTop;
    const centerY = (waveTop + waveBottom) / 2;
    const maxAmplitude = waveHeight / 2;

    const channelData = this.audioBuffer.getChannelData(0);
    const samples = channelData.length;
    const barWidth = 2;
    const gap = 1;
    const bars = Math.floor(width / (barWidth + gap));
    const samplesPerBar = Math.floor(samples / bars);

    let globalPeak = 0;
    for (let i = 0; i < samples; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > globalPeak) globalPeak = abs;
    }
    const normalizationFactor = globalPeak > 0 ? 1 / globalPeak : 1;

    const gradient = ctx.createLinearGradient(0, waveTop, 0, waveBottom);
    gradient.addColorStop(0, this.colorStart);
    gradient.addColorStop(1, this.colorEnd);

    ctx.fillStyle = gradient;

    for (let i = 0; i < bars; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, samples);
      let min = 0;
      let max = 0;

      for (let j = start; j < end; j++) {
        const sample = channelData[j] * normalizationFactor;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      const x = i * (barWidth + gap);
      const normalizedRange = (max - min);
      const barHeight = Math.max(normalizedRange * maxAmplitude, 1);
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth, barHeight);
    }

    this.renderMarkersToCanvas(ctx, width, height, this.audioBuffer.duration, this.markers, false);
    this.renderPlayhead();
  }

  private renderMarkersToCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    duration: number,
    markers: Marker[],
    forExport: boolean
  ) {
    const triangleSize = forExport ? 12 : 10;
    const fontSize = forExport ? 14 : 12;
    const bottomOffset = forExport ? 15 : 10;
    const textOffset = forExport ? 25 : 20;

    markers.forEach(marker => {
      const x = (marker.time / duration) * width;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, height - bottomOffset);
      ctx.lineTo(x - triangleSize / 2, height - bottomOffset - triangleSize);
      ctx.lineTo(x + triangleSize / 2, height - bottomOffset - triangleSize);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const timeText = formatTime(marker.time);
      ctx.fillText(timeText, x, height - textOffset - triangleSize);

      if (forExport && marker.note) {
        const noteX = x;
        const noteY = height - 50 - triangleSize;
        const padding = 8;
        const maxWidth = 200;
        
        ctx.font = '14px sans-serif';
        ctx.textBaseline = 'alphabetic';
        const textMetrics = ctx.measureText(marker.note);
        const textWidth = Math.min(textMetrics.width, maxWidth);
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = 30;
        const bubbleX = noteX - bubbleWidth / 2;
        const bubbleY = noteY - bubbleHeight - 5;

        ctx.fillStyle = '#2a2a3e';
        ctx.beginPath();
        roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.note, noteX, bubbleY + bubbleHeight / 2);
      }
    });
  }

  private renderMarkers() {
    if (!this.audioBuffer) return;
    this.renderMarkersToCanvas(
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      this.audioBuffer.duration,
      this.markers,
      false
    );
  }

  private renderPlayhead() {
    if (!this.audioBuffer) return;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const duration = this.audioBuffer.duration;
    const x = (this.playheadPosition / duration) * width;

    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.restore();
  }

  updatePlayhead(time: number) {
    this.playheadPosition = Math.max(0, Math.min(time, this.getDuration()));
    this.renderWaveform();
  }

  async play(startTime?: number) {
    if (!this.audioBuffer) return;

    this.stop();

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.audioContext.destination);

    const startPos = startTime !== undefined ? startTime : this.playheadPosition;
    source.start(0, startPos);
    this.audioSource = source;

    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.startPosition = startPos;
    this.playheadPosition = startPos;

    source.onended = () => {
      this.isPlaying = false;
      this.playheadPosition = 0;
      this.renderWaveform();
      if (this.onPlayEnd) {
        this.onPlayEnd();
      }
    };

    this.animatePlayhead();
  }

  pause() {
    if (this.audioSource) {
      this.audioSource.stop();
      this.audioSource = null;
    }
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  stop() {
    if (this.audioSource) {
      try {
        this.audioSource.stop();
      } catch (e) {
        // ignore
      }
      this.audioSource = null;
    }
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animatePlayhead = () => {
    if (!this.isPlaying || !this.audioContext) return;

    const elapsed = this.audioContext.currentTime - this.startTime;
    this.playheadPosition = Math.min(this.startPosition + elapsed, this.getDuration());

    this.renderWaveform();

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.playheadPosition);
    }

    if (this.playheadPosition < this.getDuration()) {
      this.animationId = requestAnimationFrame(this.animatePlayhead);
    }
  };

  seek(time: number) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.playheadPosition = Math.max(0, Math.min(time, this.getDuration()));
    this.renderWaveform();
    if (wasPlaying) {
      this.play(this.playheadPosition);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  exportAsPNG(width: number = 1280, height: number = 720): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建导出画布');
    }

    const originalBuffer = this.audioBuffer;

    if (!originalBuffer) {
      return exportCanvas.toDataURL('image/png');
    }

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const waveTop = height * (1 - this.waveHeightRatio) / 2;
    const waveBottom = height - waveTop;
    const waveHeight = waveBottom - waveTop;
    const centerY = (waveTop + waveBottom) / 2;
    const maxAmplitude = waveHeight / 2;

    const channelData = originalBuffer.getChannelData(0);
    const samples = channelData.length;
    const barWidth = 2;
    const gap = 1;
    const bars = Math.floor(width / (barWidth + gap));
    const samplesPerBar = Math.floor(samples / bars);

    let globalPeak = 0;
    for (let i = 0; i < samples; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > globalPeak) globalPeak = abs;
    }
    const normalizationFactor = globalPeak > 0 ? 1 / globalPeak : 1;

    const gradient = ctx.createLinearGradient(0, waveTop, 0, waveBottom);
    gradient.addColorStop(0, this.colorStart);
    gradient.addColorStop(1, this.colorEnd);

    ctx.fillStyle = gradient;

    for (let i = 0; i < bars; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, samples);
      let min = 0;
      let max = 0;

      for (let j = start; j < end; j++) {
        const sample = channelData[j] * normalizationFactor;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }

      const x = i * (barWidth + gap);
      const normalizedRange = (max - min);
      const barHeight = Math.max(normalizedRange * maxAmplitude, 1);
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth, barHeight);
    }

    this.renderMarkersToCanvas(ctx, width, height, originalBuffer.duration, this.markers, true);

    return exportCanvas.toDataURL('image/png');
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderWaveform();
  }

  getTimeFromPosition(x: number): number {
    if (!this.audioBuffer) return 0;
    const rect = this.canvas.getBoundingClientRect();
    const ratio = (x - rect.left) / rect.width;
    return Math.max(0, Math.min(ratio * this.audioBuffer.duration, this.audioBuffer.duration));
  }

  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();
  return audioBuffer;
}
