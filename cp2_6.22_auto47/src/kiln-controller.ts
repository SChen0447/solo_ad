import type { ClayData } from './clay-editor';
import type { GlazeData, GlazeLayer } from './glaze-module';

export interface FiringResult {
  success: boolean;
  temperature: number;
  duration: number;
  finalColors: Map<number, { r: number; g: number; b: number }>;
  kilnData: KilnFinalData;
}

export interface KilnFinalData {
  temperature: number;
  duration: number;
  fired: boolean;
  colorLayers: { y: number; color: { r: number; g: number; b: number } }[];
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CLAY_BASE = { r: 193, g: 154, b: 107 };
const CLAY_EDGE = { r: 160, g: 118, b: 74 };
const FIRED_RED = { r: 139, g: 69, b: 19 };

export class KilnController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private clayData: ClayData;
  private glazeData: GlazeData;
  private frameId: number | null = null;

  private targetTemp = 1100;
  private currentTemp = 0;
  private duration = 30;
  private isRunning = false;
  private isCooling = false;
  private isComplete = false;
  private progress = 0;
  private startTime = 0;
  private firingPhase: 0 | 1 | 2 | 3 = 0;

  private finalColors: Map<number, { r: number; g: number; b: number }> = new Map();
  private onComplete?: (result: FiringResult) => void;
  private onProgress?: (data: {
    progress: number;
    currentTemp: number;
    isRunning: boolean;
    isCooling: boolean;
    isComplete: boolean;
    phaseText: string;
  }) => void;

  private controlsContainer: HTMLElement | null = null;

  constructor(
    canvasContainer: HTMLElement,
    controlsContainer: HTMLElement,
    clayData: ClayData,
    glazeData: GlazeData
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'kilnCanvas';
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    canvasContainer.appendChild(this.canvas);

    this.controlsContainer = controlsContainer;
    this.clayData = clayData;
    this.glazeData = glazeData;

    this.buildControls();
    this.animate();
  }

  private buildControls(): void {
    if (!this.controlsContainer) return;
    this.controlsContainer.innerHTML = '';

    const tempGroup = document.createElement('div');
    tempGroup.className = 'control-group';
    tempGroup.innerHTML = `
      <div class="control-group-title">🌡️ 烧制温度</div>
      <div class="slider-label">
        <span>目标温度</span>
        <span id="tempValue">${this.targetTemp}°C</span>
      </div>
      <div class="temp-slider-wrap">
        <input type="range" id="tempSlider" min="800" max="1300" step="10" value="${this.targetTemp}" class="brush-size-slider">
        <div class="temp-scale">
          <span>800°C</span>
          <span>低温</span>
          <span>1050°C</span>
          <span>高温</span>
          <span>1300°C</span>
        </div>
      </div>
    `;
    this.controlsContainer.appendChild(tempGroup);

    const durationGroup = document.createElement('div');
    durationGroup.className = 'control-group';
    const durations = [10, 20, 30, 40, 50, 60];
    durationGroup.innerHTML = `
      <div class="control-group-title">⏱️ 烧制时长</div>
      <div class="duration-buttons" id="durationButtons">
        ${durations.map(d => `<button class="duration-btn ${d === this.duration ? 'active' : ''}" data-value="${d}">${d}秒</button>`).join('')}
      </div>
    `;
    this.controlsContainer.appendChild(durationGroup);

    const progressGroup = document.createElement('div');
    progressGroup.className = 'control-group';
    progressGroup.innerHTML = `
      <div class="control-group-title">🔥 烧制进度 <span class="kiln-status" id="kilnStatus">待开始</span></div>
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill" style="width: 0%"></div>
        </div>
        <div class="progress-info">
          <span id="phaseText">准备就绪</span>
          <span id="progressText">0%</span>
        </div>
      </div>
    `;
    this.controlsContainer.appendChild(progressGroup);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '12px';
    btnRow.style.marginTop = '8px';
    btnRow.innerHTML = `
      <button class="action-btn primary" id="startBtn" style="flex:1">🔥 开始烧制</button>
      <button class="action-btn secondary" id="resetBtn" style="flex:1">↺ 重置</button>
    `;
    this.controlsContainer.appendChild(btnRow);

    const tempSlider = this.controlsContainer.querySelector('#tempSlider') as HTMLInputElement;
    const tempValue = this.controlsContainer.querySelector('#tempValue') as HTMLElement;
    tempSlider.addEventListener('input', () => {
      this.targetTemp = parseInt(tempSlider.value);
      tempValue.textContent = `${this.targetTemp}°C`;
      if (!this.isRunning) this.currentTemp = 0;
    });

    const durBtns = this.controlsContainer.querySelectorAll('.duration-btn');
    durBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isRunning) return;
        const v = parseInt((btn as HTMLElement).dataset.value || '30');
        this.duration = v;
        durBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const startBtn = this.controlsContainer.querySelector('#startBtn') as HTMLButtonElement;
    const resetBtn = this.controlsContainer.querySelector('#resetBtn') as HTMLButtonElement;
    startBtn.addEventListener('click', () => this.startFiring());
    resetBtn.addEventListener('click', () => this.reset());
  }

  startFiring(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isCooling = false;
    this.isComplete = false;
    this.progress = 0;
    this.currentTemp = 20;
    this.firingPhase = 0;
    this.startTime = performance.now();
    this.finalColors.clear();

    const startBtn = this.controlsContainer?.querySelector('#startBtn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = '🔥 烧制中...';
    }

    this.updateStatusUI();
  }

  reset(): void {
    this.isRunning = false;
    this.isCooling = false;
    this.isComplete = false;
    this.progress = 0;
    this.currentTemp = 0;
    this.firingPhase = 0;
    this.finalColors.clear();

    const startBtn = this.controlsContainer?.querySelector('#startBtn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = '🔥 开始烧制';
    }

    this.updateStatusUI();
  }

  private updateStatusUI(): void {
    const status = this.controlsContainer?.querySelector('#kilnStatus') as HTMLElement;
    const phaseText = this.controlsContainer?.querySelector('#phaseText') as HTMLElement;
    const progressFill = this.controlsContainer?.querySelector('#progressFill') as HTMLElement;
    const progressText = this.controlsContainer?.querySelector('#progressText') as HTMLElement;

    if (!status || !phaseText || !progressFill || !progressText) return;

    status.className = 'kiln-status';
    let phaseStr = '准备就绪';

    if (this.isComplete) {
      status.classList.add('done');
      status.textContent = '✓ 完成';
      phaseStr = '烧制完成';
    } else if (this.isCooling) {
      status.classList.add('cooling');
      status.textContent = '❄ 冷却中';
      phaseStr = '冷却降温中...';
    } else if (this.isRunning) {
      status.classList.add('heating');
      status.textContent = '🔥 烧制中';
      if (this.firingPhase === 0) phaseStr = '升温阶段...';
      else if (this.firingPhase === 1) phaseStr = '保温阶段...';
      else phaseStr = '高温反应中...';
    } else {
      status.textContent = '待开始';
    }

    phaseText.textContent = phaseStr;
    const pct = Math.round(this.progress * 100);
    progressFill.style.width = `${pct}%`;
    progressText.textContent = `${pct}%`;
  }

  private updateFiring(dt: number): void {
    if (!this.isRunning && !this.isCooling) return;

    const durationMs = this.duration * 1000;
    const elapsed = performance.now() - this.startTime;

    if (this.isRunning && !this.isCooling) {
      if (elapsed < durationMs * 0.35) {
        this.firingPhase = 0;
        const t = elapsed / (durationMs * 0.35);
        this.currentTemp = 20 + t * (this.targetTemp * 0.9 - 20);
        this.progress = (elapsed / durationMs) * 0.9;
      } else if (elapsed < durationMs * 0.75) {
        this.firingPhase = 1;
        const t = (elapsed - durationMs * 0.35) / (durationMs * 0.4);
        this.currentTemp = this.targetTemp * 0.9 + t * (this.targetTemp - this.targetTemp * 0.9);
        this.progress = 0.315 + t * 0.585;
      } else if (elapsed < durationMs) {
        this.firingPhase = 2;
        const t = (elapsed - durationMs * 0.75) / (durationMs * 0.25);
        this.currentTemp = this.targetTemp + Math.sin(t * Math.PI * 4) * 15;
        this.progress = 0.9 + t * 0.1;
      } else {
        this.isRunning = false;
        this.isCooling = true;
        this.startTime = performance.now();
        this.progress = 1;
        this.computeFinalColors();
      }
    } else if (this.isCooling) {
      const coolDuration = 3000;
      const t = Math.min(1, elapsed / coolDuration);
      this.currentTemp = this.targetTemp * (1 - t) + 30 * t;
      this.progress = 1;
      if (t >= 1) {
        this.isCooling = false;
        this.isComplete = true;
        this.currentTemp = 30;
        this.triggerComplete();
      }
    }

    this.updateStatusUI();
    this.updateKilnVisual();
  }

  private computeFinalColors(): void {
    this.finalColors.clear();
    const { rows } = this.clayData;
    const layers = this.glazeData.layers;
    const tempFactor = Math.min(1, (this.targetTemp - 800) / 500);

    for (let i = 0; i < rows.length; i++) {
      const y = rows[i].y;
      let color = this.computeFiredColorAtY(y, layers, tempFactor);
      this.finalColors.set(i, color);
    }
  }

  private blendGlazeAtY(y: number, layers: GlazeLayer[], baseR: number, baseG: number, baseB: number): { r: number; g: number; b: number } {
    let r = baseR, g = baseG, b = baseB;
    let totalWeight = 1;

    for (const layer of layers) {
      const dist = Math.abs(y - layer.centerY);
      const falloff = Math.max(0, 1 - dist / layer.spread);
      if (falloff <= 0) continue;

      const weight = layer.intensity * falloff * falloff * 1.5;
      const { r: gr, g: gg, b: gb } = layer.color.rgb;

      r = (r * totalWeight + gr * weight) / (totalWeight + weight);
      g = (g * totalWeight + gg * weight) / (totalWeight + weight);
      b = (b * totalWeight + gb * weight) / (totalWeight + weight);
      totalWeight += weight;
    }

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  private computeFiredColorAtY(y: number, layers: GlazeLayer[], tempFactor: number): { r: number; g: number; b: number } {
    const raw = this.blendGlazeAtY(y, layers, CLAY_BASE.r, CLAY_BASE.g, CLAY_BASE.b);

    const fireMix = 0.2 + tempFactor * 0.25;
    let r = raw.r * (1 - fireMix) + FIRED_RED.r * fireMix;
    let g = raw.g * (1 - fireMix) + FIRED_RED.g * fireMix;
    let b = raw.b * (1 - fireMix) + FIRED_RED.b * fireMix;

    const saturationBoost = 1 + tempFactor * 0.35;
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * saturationBoost;
    g = avg + (g - avg) * saturationBoost;
    b = avg + (b - avg) * saturationBoost;

    const brightness = 0.9 + tempFactor * 0.2;
    r *= brightness; g *= brightness; b *= brightness;

    return {
      r: Math.max(0, Math.min(255, Math.round(r))),
      g: Math.max(0, Math.min(255, Math.round(g))),
      b: Math.max(0, Math.min(255, Math.round(b)))
    };
  }

  private getRadiusAtY(y: number): number {
    const rows = this.clayData.rows;
    if (y <= rows[0].y) return rows[0].currentRadius;
    if (y >= rows[rows.length - 1].y) return rows[rows.length - 1].currentRadius;
    for (let i = 0; i < rows.length - 1; i++) {
      if (y >= rows[i].y && y <= rows[i + 1].y) {
        const t = (y - rows[i].y) / (rows[i + 1].y - rows[i].y);
        return rows[i].currentRadius + (rows[i + 1].currentRadius - rows[i].currentRadius) * t;
      }
    }
    return 100;
  }

  private getColorAtY(y: number): { r: number; g: number; b: number } {
    const { rows } = this.clayData;
    const layers = this.glazeData.layers;
    const topY = rows[0].y;
    const bottomY = rows[rows.length - 1].y;
    const norm = Math.max(0, Math.min(1, (y - topY) / Math.max(1, bottomY - topY)));
    const edgeFactor = Math.sin(norm * Math.PI);
    const edgeMix = 1 - edgeFactor * 0.4;

    let baseR = CLAY_BASE.r * edgeMix + CLAY_EDGE.r * (1 - edgeMix);
    let baseG = CLAY_BASE.g * edgeMix + CLAY_EDGE.g * (1 - edgeMix);
    let baseB = CLAY_BASE.b * edgeMix + CLAY_EDGE.b * (1 - edgeMix);

    const heatFactor = Math.min(1, this.currentTemp / Math.max(1, this.targetTemp));
    if (!this.isComplete) {
      if (this.currentTemp > 300) {
        const heatMix = Math.min(1, (this.currentTemp - 300) / 600);
        baseR = baseR * (1 - heatMix * 0.5) + FIRED_RED.r * heatMix * 0.7;
        baseG = baseG * (1 - heatMix * 0.7) + FIRED_RED.g * heatMix * 0.5;
        baseB = baseB * (1 - heatMix * 0.8) + FIRED_RED.b * heatMix * 0.3;
      }

      const blended = this.blendGlazeAtY(y, layers, baseR, baseG, baseB);

      if (this.isRunning && this.currentTemp > 500) {
        const glowMix = Math.min(0.5, (this.currentTemp - 500) / 1500);
        blended.r = blended.r * (1 - glowMix) + 255 * glowMix;
        blended.g = blended.g * (1 - glowMix) + 140 * glowMix;
        blended.b = blended.b * (1 - glowMix) + 40 * glowMix;
      }
      if (this.isCooling && this.finalColors.size > 0) {
        let closestIdx = 0, closestDist = Infinity;
        for (let i = 0; i < rows.length; i++) {
          const d = Math.abs(rows[i].y - y);
          if (d < closestDist) { closestDist = d; closestIdx = i; }
        }
        const fc = this.finalColors.get(closestIdx) || blended;
        const coolT = Math.max(0, Math.min(1, (this.targetTemp - this.currentTemp) / Math.max(1, this.targetTemp - 100)));
        return {
          r: Math.round(blended.r * (1 - coolT) + fc.r * coolT),
          g: Math.round(blended.g * (1 - coolT) + fc.g * coolT),
          b: Math.round(blended.b * (1 - coolT) + fc.b * coolT)
        };
      }

      return {
        r: Math.max(0, Math.min(255, Math.round(blended.r))),
        g: Math.max(0, Math.min(255, Math.round(blended.g))),
        b: Math.max(0, Math.min(255, Math.round(blended.b)))
      };
    }

    let closestIdx = 0, closestDist = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const d = Math.abs(rows[i].y - y);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    const fc = this.finalColors.get(closestIdx);
    if (fc) return fc;

    const tempFactor = Math.min(1, (this.targetTemp - 800) / 500);
    return this.computeFiredColorAtY(y, layers, tempFactor);
  }

  private updateKilnVisual(): void {
    const wrapper = this.canvas.parentElement?.parentElement as HTMLElement | null;
    if (!wrapper) return;

    const heatLevel = Math.min(1, this.currentTemp / Math.max(1, this.targetTemp));
    const glowAlpha = this.isRunning || this.isCooling ? heatLevel * 0.5 : 0;
    const glowR = 239;
    const glowG = Math.round(100 + heatLevel * 58);
    const glowB = Math.round(20 + heatLevel * 20);

    wrapper.style.setProperty('--glow-color', `rgba(${glowR}, ${glowG}, ${glowB}, ${glowAlpha})`);

    const tempDisplay = wrapper.querySelector('.temp-value') as HTMLElement | null;
    if (tempDisplay) {
      tempDisplay.textContent = `${Math.round(this.currentTemp)}`;
      const tc = heatLevel < 0.3 ? '#F59E0B' : heatLevel < 0.7 ? '#EF4444' : '#F87171';
      wrapper.style.setProperty('--temp-color', tc);
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const { centerX, rows } = this.clayData;

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(centerX - rows[0].currentRadius, rows[0].y);
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const prevRow = rows[i - 1];
      const cpx = centerX - (prevRow.currentRadius + row.currentRadius) / 2;
      const cpy = (prevRow.y + row.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX - row.currentRadius, row.y);
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      const nextRow = rows[Math.min(i + 1, rows.length - 1)];
      const cpx = centerX + (row.currentRadius + nextRow.currentRadius) / 2;
      const cpy = (row.y + nextRow.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX + row.currentRadius, row.y);
    }
    ctx.closePath();
    ctx.clip();

    const topY = rows[0].y;
    const bottomY = rows[rows.length - 1].y;

    for (let py = Math.floor(topY); py <= Math.ceil(bottomY); py += 2) {
      const radiusAtY = this.getRadiusAtY(py);
      const color = this.getColorAtY(py);

      const grad = ctx.createLinearGradient(centerX - radiusAtY, 0, centerX + radiusAtY, 0);
      const edgeR = Math.max(0, color.r - 40);
      const edgeG = Math.max(0, color.g - 40);
      const edgeB = Math.max(0, color.b - 40);
      const lightR = Math.min(255, color.r + 30);
      const lightG = Math.min(255, color.g + 30);
      const lightB = Math.min(255, color.b + 30);

      grad.addColorStop(0, `rgb(${edgeR}, ${edgeG}, ${edgeB})`);
      grad.addColorStop(0.3, `rgb(${color.r}, ${color.g}, ${color.b})`);
      grad.addColorStop(0.5, `rgb(${lightR}, ${lightG}, ${lightB})`);
      grad.addColorStop(0.7, `rgb(${color.r}, ${color.g}, ${color.b})`);
      grad.addColorStop(1, `rgb(${edgeR}, ${edgeG}, ${edgeB})`);

      ctx.fillStyle = grad;
      ctx.fillRect(centerX - radiusAtY - 2, py - 1, radiusAtY * 2 + 4, 3);
    }

    const highlightGrad = ctx.createLinearGradient(centerX - 90, 0, centerX + 20, 0);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    highlightGrad.addColorStop(0.55, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGrad;
    ctx.fillRect(centerX - 200, topY - 30, 400, bottomY - topY + 60);

    const shineGrad = ctx.createRadialGradient(centerX - 35, topY + 50, 0, centerX - 35, topY + 50, 70);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
    shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    ctx.fillRect(centerX - 150, topY - 20, 250, 160);

    if ((this.isRunning && this.currentTemp > 500) || this.isCooling) {
      const heatAlpha = Math.min(0.35, (this.currentTemp - 500) / 2000);
      ctx.fillStyle = `rgba(255, 120, 30, ${heatAlpha})`;
      ctx.fillRect(centerX - 200, topY - 30, 400, bottomY - topY + 60);
    }

    ctx.restore();

    const topRow = rows[0];
    const topColor = this.getColorAtY(topRow.y + 5);
    const topGrad = ctx.createRadialGradient(
      centerX, topRow.y - 2, 0,
      centerX, topRow.y, topRow.currentRadius
    );
    topGrad.addColorStop(0, `rgb(${Math.min(255, topColor.r + 40)}, ${Math.min(255, topColor.g + 40)}, ${Math.min(255, topColor.b + 40)})`);
    topGrad.addColorStop(0.6, `rgb(${topColor.r}, ${topColor.g}, ${topColor.b})`);
    topGrad.addColorStop(1, `rgb(${Math.max(0, topColor.r - 30)}, ${Math.max(0, topColor.g - 30)}, ${Math.max(0, topColor.b - 30)})`);

    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, topRow.y, topRow.currentRadius, topRow.currentRadius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.isComplete) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 215, 100, 0.8)';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = 'rgba(255, 240, 180, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    if (this.isRunning || this.isCooling) {
      const heatLevel = Math.min(1, this.currentTemp / Math.max(1, this.targetTemp));
      if (heatLevel > 0.4) {
        ctx.save();
        const flickerAlpha = (heatLevel - 0.4) * 0.25 * (0.7 + 0.3 * Math.random());
        ctx.fillStyle = `rgba(255, 100, 20, ${flickerAlpha})`;
        ctx.beginPath();
        ctx.ellipse(centerX, (topY + bottomY) / 2, 180, (bottomY - topY) / 2 + 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private lastTime = performance.now();
  private animate = (): void => {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.updateFiring(dt);
    this.draw();
    this.frameId = requestAnimationFrame(this.animate);
  };

  setOnComplete(callback: (result: FiringResult) => void): void {
    this.onComplete = callback;
  }

  setOnProgress(callback: KilnController['onProgress']): void {
    this.onProgress = callback;
  }

  private triggerComplete(): void {
    const startBtn = this.controlsContainer?.querySelector('#startBtn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = '🔥 重新烧制';
    }

    const colorLayers: KilnFinalData['colorLayers'] = [];
    for (const [idx, color] of this.finalColors) {
      colorLayers.push({ y: this.clayData.rows[idx].y, color });
    }

    const result: FiringResult = {
      success: true,
      temperature: this.targetTemp,
      duration: this.duration,
      finalColors: new Map(this.finalColors),
      kilnData: {
        temperature: this.targetTemp,
        duration: this.duration,
        fired: true,
        colorLayers
      }
    };

    if (this.onComplete) this.onComplete(result);
  }

  getResult(): FiringResult | null {
    if (!this.isComplete) return null;
    const colorLayers: KilnFinalData['colorLayers'] = [];
    for (const [idx, color] of this.finalColors) {
      colorLayers.push({ y: this.clayData.rows[idx].y, color });
    }
    return {
      success: true,
      temperature: this.targetTemp,
      duration: this.duration,
      finalColors: new Map(this.finalColors),
      kilnData: {
        temperature: this.targetTemp,
        duration: this.duration,
        fired: true,
        colorLayers
      }
    };
  }

  updateData(clayData: ClayData, glazeData: GlazeData): void {
    this.clayData = clayData;
    this.glazeData = glazeData;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
  }
}
