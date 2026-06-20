const NUM_BANDS = 128;
const HEATMAP_COLS = 64;
const HEATMAP_ROWS = 8;

function getLogFrequencyBands(sampleRate: number, numBands: number, fftSize: number): { binStart: number; binEnd: number }[] {
  const nyquist = sampleRate / 2;
  const minFreq = 20;
  const maxFreq = Math.min(20000, nyquist);
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const bands: { binStart: number; binEnd: number }[] = [];
  const binCount = fftSize / 2;

  for (let i = 0; i < numBands; i++) {
    const f1 = Math.pow(10, logMin + (logMax - logMin) * (i / numBands));
    const f2 = Math.pow(10, logMin + (logMax - logMin) * ((i + 1) / numBands));
    const binStart = Math.round((f1 / nyquist) * binCount);
    const binEnd = Math.round((f2 / nyquist) * binCount);
    bands.push({ binStart, binEnd: Math.max(binEnd, binStart + 1) });
  }
  return bands;
}

function heatColor(value: number, isDark: boolean): string {
  const t = Math.max(0, Math.min(1, value));
  if (isDark) {
    const r = Math.round(26 + (255 - 26) * t);
    const g = Math.round(35 + (50 - 35) * t * (1 - t) * 4);
    const b = Math.round(126 + (0 - 126) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const r = Math.round(50 + (220 - 50) * t);
    const g = Math.round(50 + (30 - 50) * t);
    const b = Math.round(150 + (20 - 150) * t);
    return `rgb(${r},${g},${b})`;
  }
}

export class SpectrumRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bands: { binStart: number; binEnd: number }[] = [];
  private isDark: boolean = true;
  private heatmapHistory: number[][] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setSampleRate(sampleRate: number, fftSize: number): void {
    this.bands = getLogFrequencyBands(sampleRate, NUM_BANDS, fftSize);
  }

  setTheme(isDark: boolean): void {
    this.isDark = isDark;
  }

  render(frequencyData: Uint8Array | null, sampleRate: number): void {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = this.canvas;
    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.ctx.scale(dpr, dpr);
    }

    const w = width;
    const h = height;
    const heatmapH = 48;
    const barAreaH = h - heatmapH - 10;

    const bgColor = this.isDark ? '#0a0a1a' : '#e0e0e8';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    if (!frequencyData || this.bands.length === 0) {
      this.ctx.fillStyle = this.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      this.ctx.font = '14px "Fira Code", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('No audio data', w / 2, h / 2);
      return;
    }

    const barWidth = (w - 20) / NUM_BANDS;
    const gap = Math.max(1, barWidth * 0.15);
    const actualBarWidth = barWidth - gap;
    const barAreaTop = 5;

    const bandEnergies: number[] = [];
    for (let i = 0; i < NUM_BANDS; i++) {
      const band = this.bands[i];
      if (!band) { bandEnergies.push(0); continue; }
      let sum = 0;
      let count = 0;
      for (let b = band.binStart; b < band.binEnd && b < frequencyData.length; b++) {
        sum += frequencyData[b];
        count++;
      }
      const energy = count > 0 ? sum / count / 255 : 0;
      bandEnergies.push(energy);
    }

    this.heatmapHistory.push([...bandEnergies]);
    if (this.heatmapHistory.length > HEATMAP_ROWS) {
      this.heatmapHistory.shift();
    }

    for (let i = 0; i < NUM_BANDS; i++) {
      const energy = bandEnergies[i];
      const barH = Math.max(1, energy * barAreaH);
      const x = 10 + i * barWidth;
      const y = barAreaTop + barAreaH - barH;

      const grad = this.ctx.createLinearGradient(x, y + barH, x, y);
      if (this.isDark) {
        grad.addColorStop(0, '#1a237e');
        grad.addColorStop(1, '#ff9100');
      } else {
        grad.addColorStop(0, '#283593');
        grad.addColorStop(1, '#ffab40');
      }
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(x, y, actualBarWidth, barH);

      if (i % 16 === 0) {
        const freq = 20 * Math.pow(1000, i / NUM_BANDS);
        this.ctx.fillStyle = this.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
        this.ctx.font = '9px "Fira Code", monospace';
        this.ctx.textAlign = 'center';
        const label = freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${Math.round(freq)}`;
        this.ctx.fillText(label, x + actualBarWidth / 2, barAreaTop + barAreaH + 12);
      }
    }

    const heatmapTop = barAreaTop + barAreaH + 20;
    const cellW = (w - 20) / HEATMAP_COLS;
    const cellH = (heatmapH) / HEATMAP_ROWS;

    for (let row = 0; row < this.heatmapHistory.length; row++) {
      const rowData = this.heatmapHistory[row];
      for (let col = 0; col < HEATMAP_COLS; col++) {
        const bandIdx = Math.floor((col / HEATMAP_COLS) * NUM_BANDS);
        const val = rowData[bandIdx] ?? 0;
        this.ctx.fillStyle = heatColor(val, this.isDark);
        this.ctx.fillRect(10 + col * cellW, heatmapTop + row * cellH, cellW - 0.5, cellH - 0.5);
      }
    }

    this.ctx.fillStyle = this.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    this.ctx.font = '9px "Fira Code", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Spectrum Energy', 10, heatmapTop - 3);
  }

  destroy(): void {
    this.heatmapHistory = [];
  }
}
