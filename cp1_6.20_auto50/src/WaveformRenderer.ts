export interface WaveformViewport {
  zoom: number;
  offsetX: number;
  targetZoom: number;
  targetOffsetX: number;
  isDark: boolean;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const EASE_DURATION = 200;

export class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewport: WaveformViewport = {
    zoom: 1,
    offsetX: 0,
    targetZoom: 1,
    targetOffsetX: 0,
    isDark: true,
  };
  private lastZoomChange: number = 0;
  private prevZoom: number = 1;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartOffset: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupZoom();
    this.setupPan();
  }

  private setupZoom(): void {
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      this.viewport.targetZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.viewport.targetZoom + delta));
      this.prevZoom = this.viewport.zoom;
      this.lastZoomChange = performance.now();
    }, { passive: false });
  }

  private setupPan(): void {
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartOffset = this.viewport.targetOffsetX;
    });
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.panStartX;
      this.viewport.targetOffsetX = this.panStartOffset + dx / this.viewport.zoom;
    });
    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });
  }

  private easeValue(current: number, target: number, elapsed: number): number {
    if (elapsed >= EASE_DURATION) return target;
    const t = elapsed / EASE_DURATION;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    return current + (target - current) * ease;
  }

  private lerpColor(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number, t: number): string {
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
  }

  private getAmplitudeColor(amplitude: number, isDark: boolean): string {
    const absAmp = Math.abs(amplitude);
    if (isDark) {
      if (absAmp < 0.33) {
        return this.lerpColor(0, 229, 255, 170, 0, 255, absAmp / 0.33);
      } else if (absAmp < 0.66) {
        return this.lerpColor(170, 0, 255, 255, 23, 68, (absAmp - 0.33) / 0.33);
      } else {
        return '#ff1744';
      }
    } else {
      if (absAmp < 0.33) {
        return this.lerpColor(0, 150, 180, 120, 0, 180, absAmp / 0.33);
      } else if (absAmp < 0.66) {
        return this.lerpColor(120, 0, 180, 200, 10, 50, (absAmp - 0.33) / 0.33);
      } else {
        return '#c41040';
      }
    }
  }

  render(
    pcmData: Float32Array | null,
    currentTime: number,
    duration: number,
    sampleRate: number
  ): void {
    const now = performance.now();
    const elapsed = now - this.lastZoomChange;
    this.viewport.zoom = this.easeValue(this.viewport.zoom, this.viewport.targetZoom, elapsed);
    this.viewport.offsetX = this.easeValue(this.viewport.offsetX, this.viewport.targetOffsetX, elapsed);

    const { width, height } = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx.scale(dpr, dpr);
    }

    const w = width;
    const h = height;

    const bg1 = this.viewport.isDark ? '#0f0c29' : '#e8e8f0';
    const bg2 = this.viewport.isDark ? '#302b63' : '#c0c0d8';
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bg1);
    grad.addColorStop(1, bg2);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    if (!pcmData || pcmData.length === 0) return;

    const zoom = this.viewport.zoom;
    const offset = this.viewport.offsetX;
    const totalSamples = pcmData.length;
    const samplesPerPx = totalSamples / (w * zoom);
    const startSample = Math.max(0, Math.floor(offset * samplesPerPx + (totalSamples - w * zoom * samplesPerPx / 2)));
    const midLine = h / 2;

    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const step = Math.max(1, Math.floor(samplesPerPx));
    let prevY = midLine;

    for (let x = 0; x < w; x++) {
      const sampleIdx = Math.floor(startSample + x * samplesPerPx);
      if (sampleIdx < 0 || sampleIdx >= totalSamples) continue;

      let sum = 0;
      let count = 0;
      for (let j = 0; j < step && sampleIdx + j < totalSamples; j++) {
        sum += pcmData[sampleIdx + j];
        count++;
      }
      const avg = count > 0 ? sum / count : 0;
      const y = midLine + avg * midLine * 0.9;

      this.ctx.strokeStyle = this.getAmplitudeColor(avg, this.viewport.isDark);
      this.ctx.beginPath();
      this.ctx.moveTo(x - 1, prevY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      prevY = y;
    }

    if (duration > 0) {
      const timeScaleY = h - 20;
      const textColor = this.viewport.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
      this.ctx.fillStyle = textColor;
      this.ctx.font = '10px "Fira Code", monospace';
      this.ctx.textAlign = 'center';

      const pixelsPerSecond = (w * zoom) / duration;
      let tickInterval = 1;
      if (pixelsPerSecond < 20) tickInterval = 10;
      else if (pixelsPerSecond < 50) tickInterval = 5;
      else if (pixelsPerSecond < 100) tickInterval = 2;

      const startSec = Math.floor(currentTime - (w / 2) / pixelsPerSecond);
      const endSec = Math.ceil(currentTime + (w / 2) / pixelsPerSecond);

      for (let s = Math.max(0, startSec); s <= Math.min(duration, endSec); s += tickInterval) {
        const x = ((s - currentTime) * pixelsPerSecond) + w / 2;
        if (x < 0 || x > w) continue;
        const min = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        this.ctx.fillText(`${min}:${sec}`, x, timeScaleY + 12);
        this.ctx.strokeStyle = this.viewport.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, timeScaleY);
        this.ctx.lineTo(x, timeScaleY + 5);
        this.ctx.stroke();
      }
    }

    const posLineX = w / 2;
    this.ctx.strokeStyle = this.viewport.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(posLineX, 0);
    this.ctx.lineTo(posLineX, h);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  setTheme(isDark: boolean): void {
    this.viewport.isDark = isDark;
  }

  getZoom(): number {
    return this.viewport.zoom;
  }

  getOffsetX(): number {
    return this.viewport.offsetX;
  }

  destroy(): void {
    // cleanup if needed
  }
}
