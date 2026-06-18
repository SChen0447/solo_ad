export type VisualizerMode = 'wave' | 'particle' | 'mix';

export interface RenderParams {
  colorSensitivity: number;
  particleDensity: number;
  waveThickness: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  frequencyIndex: number;
}

class ParticlePool {
  private pool: Particle[] = [];
  private maxParticles: number;

  constructor(maxParticles: number) {
    this.maxParticles = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 0,
      hue: 0,
      frequencyIndex: 0,
    };
  }

  getParticle(): Particle | null {
    for (const p of this.pool) {
      if (p.life <= 0) {
        return p;
      }
    }
    return null;
  }

  getActiveParticles(): Particle[] {
    return this.pool.filter(p => p.life > 0);
  }

  setMaxParticles(max: number): void {
    this.maxParticles = max;
    if (this.pool.length < max) {
      for (let i = this.pool.length; i < max; i++) {
        this.pool.push(this.createParticle());
      }
    }
  }
}

export class VisualizerRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private mode: VisualizerMode = 'wave';
  private nextMode: VisualizerMode | null = null;
  private transitionProgress = 1;
  private transitionDuration = 500;
  private transitionStartTime = 0;
  private params: RenderParams = {
    colorSensitivity: 50,
    particleDensity: 50,
    waveThickness: 50,
  };

  private particlePool: ParticlePool;
  private waveHistory: number[][] = [];
  private maxWaveHistory = 180;
  private barHeights: number[] = [];
  private barTargets: number[] = [];
  private time = 0;

  constructor() {
    this.particlePool = new ParticlePool(500);
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize(canvas.width, canvas.height);
  }

  setMode(mode: VisualizerMode): void {
    if (this.mode === mode) return;
    this.nextMode = mode;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();
  }

  setParams(params: Partial<RenderParams>): void {
    this.params = { ...this.params, ...params };
    const particleCount = Math.floor(100 + this.params.particleDensity * 9);
    this.particlePool.setMaxParticles(particleCount);
  }

  resize(width: number, height: number): void {
    if (!this.canvas || !this.ctx) return;
    
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    
    this.barHeights = new Array(64).fill(0);
    this.barTargets = new Array(64).fill(0);
    this.waveHistory = [];
  }

  renderFrame(waveform: Float32Array, frequency: Uint8Array, deltaTime: number): void {
    if (!this.ctx || !this.canvas) return;

    this.time += deltaTime;

    this.updateTransition();
    this.updateBars(frequency);
    this.updateParticles(frequency, deltaTime);
    this.updateWaveHistory(waveform);

    this.drawBackground();

    if (this.nextMode && this.transitionProgress < 1) {
      this.drawMode(this.mode, waveform, frequency, 1 - this.transitionProgress);
      this.drawMode(this.nextMode, waveform, frequency, this.transitionProgress);
    } else {
      if (this.nextMode) {
        this.mode = this.nextMode;
        this.nextMode = null;
      }
      this.drawMode(this.mode, waveform, frequency, 1);
    }
  }

  private updateTransition(): void {
    if (!this.nextMode || this.transitionProgress >= 1) return;
    
    const elapsed = performance.now() - this.transitionStartTime;
    this.transitionProgress = Math.min(1, elapsed / this.transitionDuration);
  }

  private updateBars(frequency: Uint8Array): void {
    const barCount = this.barTargets.length;
    const freqStep = Math.floor(frequency.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < freqStep; j++) {
        sum += frequency[i * freqStep + j] || 0;
      }
      this.barTargets[i] = sum / freqStep / 255;
      
      const diff = this.barTargets[i] - this.barHeights[i];
      this.barHeights[i] += diff * 0.15;
      
      if (this.barHeights[i] < 0.01) {
        this.barHeights[i] = 0.01;
      }
    }
  }

  private updateWaveHistory(waveform: Float32Array): void {
    const samples = 256;
    const step = Math.floor(waveform.length / samples);
    const frame: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      frame.push(waveform[i * step] || 0);
    }
    
    this.waveHistory.unshift(frame);
    if (this.waveHistory.length > this.maxWaveHistory) {
      this.waveHistory.pop();
    }
  }

  private updateParticles(frequency: Uint8Array, deltaTime: number): void {
    const activeParticles = this.particlePool.getActiveParticles();
    
    for (const p of activeParticles) {
      p.x += p.vx * deltaTime * 0.06;
      p.y += p.vy * deltaTime * 0.06;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime / (p.maxLife * 1000);
    }

    const spawnRate = this.params.particleDensity / 50;
    const spawnCount = Math.floor(2 + spawnRate * 5);
    const freqBins = 64;
    const binSize = Math.floor(frequency.length / freqBins);

    for (let i = 0; i < spawnCount; i++) {
      const particle = this.particlePool.getParticle();
      if (!particle) break;

      const freqIndex = Math.floor(Math.random() * freqBins);
      const freqValue = frequency[freqIndex * binSize] / 255;

      if (freqValue < 0.1 && Math.random() > 0.3) continue;

      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + freqValue * 8;
      const sizeMultiplier = 1 + this.params.particleDensity / 100;

      particle.x = centerX + Math.cos(angle) * 20;
      particle.y = centerY + Math.sin(angle) * 20;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 1;
      particle.maxLife = 0.5 + Math.random() * 1.5;
      particle.size = (2 + freqValue * 8) * sizeMultiplier;
      particle.hue = 120 - freqIndex * (120 / freqBins);
      particle.frequencyIndex = freqIndex;
    }
  }

  private drawBackground(): void {
    if (!this.ctx) return;

    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#130825');
    gradient.addColorStop(1, '#0d1b3e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();
  }

  private drawGrid(): void {
    if (!this.ctx) return;
    
    this.ctx.strokeStyle = 'rgba(0, 255, 157, 0.05)';
    this.ctx.lineWidth = 1;

    const gridSize = 50;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawMode(mode: VisualizerMode, waveform: Float32Array, frequency: Uint8Array, alpha: number): void {
    if (!this.ctx) return;
    
    this.ctx.globalAlpha = alpha;

    switch (mode) {
      case 'wave':
        this.drawWaveMode(waveform);
        break;
      case 'particle':
        this.drawParticleMode(frequency);
        break;
      case 'mix':
        this.drawMixMode(waveform, frequency);
        break;
    }

    this.ctx.globalAlpha = 1;
  }

  private drawWaveMode(waveform: Float32Array): void {
    if (!this.ctx) return;

    this.drawSpectrumBars();
    this.drawWaveFlow(waveform);
  }

  private drawParticleMode(frequency: Uint8Array): void {
    if (!this.ctx) return;

    this.drawParticles();
  }

  private drawMixMode(waveform: Float32Array, frequency: Uint8Array): void {
    if (!this.ctx) return;

    this.drawSpectrumBars();
    this.drawWaveFlow(waveform);
    this.drawParticles();
  }

  private drawSpectrumBars(): void {
    if (!this.ctx) return;

    const barCount = this.barHeights.length;
    const barWidth = (this.width * 0.9) / barCount;
    const barGap = barWidth * 0.2;
    const startX = this.width * 0.05;
    const maxHeight = this.height * 0.35;
    const baseY = this.height * 0.85;

    const colorShift = this.params.colorSensitivity / 100;

    for (let i = 0; i < barCount; i++) {
      const height = this.barHeights[i] * maxHeight;
      const x = startX + i * barWidth;
      const y = baseY - height;
      const width = barWidth - barGap;

      const breathScale = 1 + Math.sin(this.time * 0.003 + i * 0.1) * 0.05;
      const drawHeight = height * breathScale;
      const drawY = baseY - drawHeight;

      const hue = 180 - i * (120 / barCount) + colorShift * 60;
      const saturation = 80 + this.barHeights[i] * 20;
      const lightness = 40 + this.barHeights[i] * 30;

      const gradient = this.ctx.createLinearGradient(x, drawY, x, baseY);
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.9)`);
      gradient.addColorStop(0.5, `hsla(${hue + 20}, ${saturation}%, ${lightness}%, 0.8)`);
      gradient.addColorStop(1, `hsla(${hue + 40}, ${saturation - 10}%, ${lightness - 20}%, 0.3)`);

      this.ctx.fillStyle = gradient;
      this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.5)`;
      this.ctx.shadowBlur = 10 + this.barHeights[i] * 15;

      const radius = width * 0.3;
      this.ctx.beginPath();
      this.ctx.roundRect(x, drawY, width, drawHeight, [radius, radius, 0, 0]);
      this.ctx.fill();

      this.ctx.shadowBlur = 0;
    }
  }

  private drawWaveFlow(waveform: Float32Array): void {
    if (!this.ctx || this.waveHistory.length < 2) return;

    const waveWidth = this.width;
    const waveHeight = this.height * 0.3;
    const centerY = this.height * 0.4;
    const baseThickness = 1 + this.params.waveThickness / 20;
    const colorShift = this.params.colorSensitivity / 100;

    for (let layer = 0; layer < Math.min(8, this.waveHistory.length); layer++) {
      const frame = this.waveHistory[layer];
      if (!frame) continue;

      const layerAlpha = 1 - layer / 8;
      const offsetY = -layer * 2;
      const thickness = baseThickness * (1 - layer * 0.08);

      const hue = 140 + layer * 10 + colorShift * 80;
      const saturation = 90;
      const lightness = 60 - layer * 3;

      const gradient = this.ctx.createLinearGradient(0, centerY - waveHeight, 0, centerY + waveHeight);
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness + 20}%, ${layerAlpha * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${hue + 30}, ${saturation}%, ${lightness}%, ${layerAlpha * 0.9})`);
      gradient.addColorStop(1, `hsla(${hue + 60}, ${saturation - 10}%, ${lightness - 20}%, ${layerAlpha * 0.3})`);

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = thickness;
      this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${layerAlpha * 0.5})`;
      this.ctx.shadowBlur = 8 + layer;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();

      const step = waveWidth / (frame.length - 1);
      for (let i = 0; i < frame.length; i++) {
        const x = i * step;
        const amplitude = frame[i] * waveHeight * 0.8;
        const y = centerY + offsetY + amplitude;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    this.drawGlowLine(waveform, centerY, waveHeight, baseThickness, colorShift);
  }

  private drawGlowLine(
    waveform: Float32Array,
    centerY: number,
    waveHeight: number,
    thickness: number,
    colorShift: number
  ): void {
    if (!this.ctx) return;

    const samples = 512;
    const step = Math.floor(waveform.length / samples);
    const waveWidth = this.width;
    const xStep = waveWidth / (samples - 1);

    const hue = 160 + colorShift * 100;

    for (let glow = 3; glow >= 0; glow--) {
      const glowAlpha = 0.1 + glow * 0.15;
      const glowWidth = thickness + glow * 2;

      this.ctx.beginPath();
      this.ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${glowAlpha})`;
      this.ctx.lineWidth = glowWidth;
      this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${glowAlpha})`;
      this.ctx.shadowBlur = glow * 5;

      for (let i = 0; i < samples; i++) {
        const value = waveform[i * step] || 0;
        const x = i * xStep;
        const y = centerY + value * waveHeight * 0.8;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;
  }

  private drawParticles(): void {
    if (!this.ctx) return;

    const particles = this.particlePool.getActiveParticles();
    const colorShift = this.params.colorSensitivity / 100;

    for (const p of particles) {
      const alpha = p.life * 0.8;
      const hue = (p.hue + colorShift * 60 + 180) % 360;
      const size = p.size * p.life;

      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${alpha})`);
      gradient.addColorStop(0.3, `hsla(${hue + 20}, 100%, 60%, ${alpha * 0.8})`);
      gradient.addColorStop(1, `hsla(${hue + 40}, 100%, 40%, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${alpha * 0.5})`;
      this.ctx.shadowBlur = size * 2;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `hsla(${hue}, 100%, 90%, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getCurrentMode(): VisualizerMode {
    return this.mode;
  }

  getParams(): RenderParams {
    return { ...this.params };
  }
}

export const visualizerRenderer = new VisualizerRenderer();
