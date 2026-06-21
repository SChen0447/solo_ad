import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { HeatPointData } from './HeatmapRenderer';

export interface InfoPanelShowOptions {
  data: HeatPointData;
  worldPosition: THREE.Vector3;
}

export class InfoPanel {
  private sceneManager: SceneManager;
  private cardEl: HTMLElement;
  private closeBtn: HTMLElement;
  private speciesIconEl: HTMLElement;
  private speciesNameEl: HTMLElement;
  private dateEl: HTMLElement;
  private densityEl: HTMLElement;
  private coordsEl: HTMLElement;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;

  private visible: boolean = false;
  private currentWorldPos: THREE.Vector3 | null = null;
  private currentData: HeatPointData | null = null;
  private closing = false;
  private lastScreenPos: { x: number; y: number } | null = null;

  private closeHandlers: Array<() => void> = [];

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.cardEl = document.getElementById('infoCard')!;
    this.closeBtn = document.getElementById('cardClose')!;
    this.speciesIconEl = document.getElementById('cardSpeciesIcon')!;
    this.speciesNameEl = document.getElementById('cardSpeciesName')!;
    this.dateEl = document.getElementById('cardDate')!;
    this.densityEl = document.getElementById('cardDensity')!;
    this.coordsEl = document.getElementById('cardCoords')!;
    this.chartCanvas = document.getElementById('cardChart') as HTMLCanvasElement;
    this.chartCtx = this.chartCanvas.getContext('2d')!;

    this.bindEvents();
    this.sceneManager.addRenderCallback(this.updatePosition.bind(this));
  }

  private bindEvents(): void {
    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    this.cardEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) {
        this.hide();
      }
    });

    window.addEventListener('resize', () => {
      if (this.visible && this.currentWorldPos) {
        this.recomputePosition();
      }
    });
  }

  public show(options: InfoPanelShowOptions): void {
    if (this.closing) return;
    this.currentData = options.data;
    this.currentWorldPos = options.worldPosition.clone();
    this.populateData();
    this.drawChart(options.data.trend || []);
    this.visible = true;
    this.closing = false;
    this.cardEl.classList.remove('hidden', 'closing');
    this.cardEl.classList.add('visible');
    this.recomputePosition();
  }

  public hide(): void {
    if (!this.visible || this.closing) return;
    this.closing = true;
    this.cardEl.classList.remove('visible');
    this.cardEl.classList.add('closing');
    const onEnd = () => {
      this.cardEl.removeEventListener('animationend', onEnd);
      if (!this.closing) return;
      this.cardEl.classList.remove('closing');
      this.cardEl.classList.add('hidden');
      this.visible = false;
      this.closing = false;
      this.currentData = null;
      this.currentWorldPos = null;
      this.emitClose();
    };
    this.cardEl.addEventListener('animationend', onEnd);
    setTimeout(() => {
      if (this.closing && this.cardEl.classList.contains('closing')) {
        onEnd();
      }
    }, 350);
  }

  private populateData(): void {
    if (!this.currentData) return;
    const d = this.currentData;

    this.speciesIconEl.textContent = d.speciesIcon || '🦓';
    this.speciesNameEl.textContent = d.speciesName || '未知物种';
    this.dateEl.textContent = d.date || '-';

    this.densityEl.textContent = String(Math.round(d.density));
    this.densityEl.classList.remove('high', 'mid', 'low');
    if (d.density >= 70) this.densityEl.classList.add('high');
    else if (d.density >= 40) this.densityEl.classList.add('mid');
    else this.densityEl.classList.add('low');

    const lat = d.lat.toFixed(2);
    const lon = d.lon.toFixed(2);
    const latSymbol = d.lat >= 0 ? 'N' : 'S';
    const lonSymbol = d.lon >= 0 ? 'E' : 'W';
    this.coordsEl.textContent = `${Math.abs(parseFloat(lat))}°${latSymbol}, ${Math.abs(parseFloat(lon))}°${lonSymbol}`;
  }

  private drawChart(values: number[]): void {
    const canvas = this.chartCanvas;
    const ctx = this.chartCtx;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 200;
    const cssH = canvas.clientHeight || 50;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssW, cssH);

    const data = values.length > 0 ? values : this.generateDummyTrend();

    const paddingL = 4;
    const paddingR = 4;
    const paddingT = 6;
    const paddingB = 6;
    const chartW = cssW - paddingL - paddingR;
    const chartH = cssH - paddingT - paddingB;

    const minV = Math.max(0, Math.min(...data) - 10);
    const maxV = Math.min(100, Math.max(...data) + 10);
    const range = Math.max(1, maxV - minV);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = paddingT + (chartH * i) / 4;
      ctx.moveTo(paddingL, y);
      ctx.lineTo(paddingL + chartW, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const points: { x: number; y: number; v: number }[] = [];
    for (let i = 0; i < data.length; i++) {
      const t = data.length === 1 ? 0.5 : i / (data.length - 1);
      const x = paddingL + t * chartW;
      const y = paddingT + chartH - ((data[i] - minV) / range) * chartH;
      points.push({ x, y, v: data[i] });
    }

    if (points.length === 1) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[0].x + 0.5, points[0].y);
      ctx.stroke();
    } else if (points.length === 2) {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const cpx1 = p0.x + (p1.x - p0.x) * 0.5;
        const cpy1 = p0.y;
        const cpx2 = p1.x - (p2.x - p0.x) * 0.2;
        const cpy2 = p1.y;
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, p1.x, p1.y);
      }
      const lastIdx = points.length - 1;
      const pPrev = points[lastIdx - 1];
      const pLast = points[lastIdx];
      const cpx1 = pPrev.x + (pLast.x - pPrev.x) * 0.5;
      ctx.bezierCurveTo(cpx1, pPrev.y, pLast.x, pLast.y, pLast.x, pLast.y);
      ctx.stroke();
    }

    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 4);
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#dbeafe';
      ctx.fill();
    }

    if (points.length > 0) {
      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      const halo = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 7);
      halo.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      halo.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = halo;
      ctx.fill();
    }
  }

  private generateDummyTrend(): number[] {
    const arr: number[] = [];
    let v = 40 + Math.random() * 30;
    for (let i = 0; i < 90; i += 3) {
      v += (Math.random() - 0.5) * 15;
      v = Math.max(10, Math.min(95, v));
      arr.push(Math.round(v));
    }
    return arr;
  }

  private recomputePosition(): void {
    if (!this.currentWorldPos) return;
    const inFront = this.sceneManager.isInFrontOfCamera(this.currentWorldPos);
    if (!inFront) {
      this.cardEl.style.opacity = '0';
      this.cardEl.style.pointerEvents = 'none';
      return;
    }
    this.cardEl.style.opacity = '';
    this.cardEl.style.pointerEvents = 'auto';

    const screen = this.sceneManager.projectToScreen(this.currentWorldPos);
    this.lastScreenPos = screen;
    this.positionCard(screen.x, screen.y);
  }

  private positionCard(screenX: number, screenY: number): void {
    const rect = this.cardEl.getBoundingClientRect();
    const w = rect.width || 240;
    const h = rect.height || 200;

    let left = screenX - w / 2;
    let top = screenY - h - 24;

    const margin = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bottomBarH = window.innerWidth <= 768 ? 80 : 60;
    const rightPanelW = window.innerWidth <= 768 ? 232 : 284;

    left = Math.max(margin, Math.min(vw - w - margin, left));

    if (top < 70) {
      top = screenY + 36;
      if (top + h > vh - bottomBarH - margin) {
        top = Math.min(top, vh - bottomBarH - h - margin);
      }
    }

    if (left + w > vw - rightPanelW - margin) {
      left = Math.max(margin, vw - rightPanelW - w - margin - 12);
    }

    this.cardEl.style.left = `${left}px`;
    this.cardEl.style.top = `${top}px`;
  }

  private updatePosition(_delta: number): void {
    if (!this.visible || this.closing) return;
    if (!this.currentWorldPos) return;

    const inFront = this.sceneManager.isInFrontOfCamera(this.currentWorldPos);
    if (!inFront) {
      this.cardEl.style.opacity = '0';
      this.cardEl.style.pointerEvents = 'none';
      this.lastScreenPos = null;
      return;
    }

    const screen = this.sceneManager.projectToScreen(this.currentWorldPos);
    if (this.lastScreenPos) {
      const dx = Math.abs(screen.x - this.lastScreenPos.x);
      const dy = Math.abs(screen.y - this.lastScreenPos.y);
      if (dx < 1.5 && dy < 1.5) return;
    }
    this.lastScreenPos = screen;
    this.cardEl.style.opacity = '';
    this.cardEl.style.pointerEvents = 'auto';
    this.positionCard(screen.x, screen.y);
  }

  private emitClose(): void {
    for (const h of this.closeHandlers) {
      try { h(); } catch (e) { console.error(e); }
    }
  }

  public onClose(handler: () => void): void {
    if (this.closeHandlers.indexOf(handler) === -1) {
      this.closeHandlers.push(handler);
    }
  }

  public offClose(handler: () => void): void {
    const i = this.closeHandlers.indexOf(handler);
    if (i > -1) this.closeHandlers.splice(i, 1);
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public dispose(): void {
    this.sceneManager.removeRenderCallback(this.updatePosition.bind(this));
    this.hide();
  }
}
