import type { GameEngine } from './GameEngine';
import type { Organism, HoverInfo } from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private rafId: number | null = null;
  private startTime = 0;
  private hoverHandler: ((info: HoverInfo) => void) | null = null;
  private mouseX = -9999;
  private mouseY = -9999;
  private lastHoveredId: string | null = null;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.engine = engine;
    this.startTime = performance.now();
    this.setupResize();
    this.setupMouse();
  }

  setHoverHandler(handler: (info: HoverInfo) => void): void {
    this.hoverHandler = handler;
  }

  private setupResize(): void {
    const resize = () => {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = Math.floor(rect.width * this.dpr);
      this.canvas.height = Math.floor(rect.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.engine.setCanvasSize(rect.width, rect.height);
    };
    resize();
    window.addEventListener('resize', resize);
  }

  private setupMouse(): void {
    const onMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };
    const onLeave = () => {
      this.mouseX = -9999;
      this.mouseY = -9999;
      if (this.lastHoveredId !== null) {
        this.lastHoveredId = null;
        if (this.hoverHandler) {
          this.hoverHandler({ organism: null, screenX: 0, screenY: 0 });
        }
        this.engine.setHovered({ organism: null, screenX: 0, screenY: 0 });
      }
    };
    this.canvas.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseleave', onLeave);
  }

  start(): void {
    if (this.rafId !== null) return;
    const loop = (t: number) => {
      this.render(t);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
  }

  private render(time: number): void {
    const state = this.engine.getState();
    const rect = this.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const elapsed = (time - this.startTime) / 1000;

    this.ctx.clearRect(0, 0, W, H);
    this.drawBackground(elapsed, W, H, state.environment.temperature);
    this.drawEcoGrid(W, H, elapsed);
    this.drawOrganisms(state.population, elapsed);
    this.drawEvolutionTree(state.evolutionTree, W, H);
    this.checkHover(W, H);
  }

  private drawBackground(
    t: number,
    W: number,
    H: number,
    temperature: number
  ): void {
    const tempNorm = (temperature + 10) / 60;
    const hueShift = Math.sin(t * 0.1) * 8;

    const gridCols = 10;
    const gridRows = 8;
    const cw = W / gridCols;
    const ch = H / gridRows;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const noise = Math.sin(c * 1.3 + r * 0.7 + t * 0.04) * 0.5 + 0.5;
        const hueBase = 140 + (r / gridRows) * 180;
        const hue = hueBase + noise * 25 + hueShift - tempNorm * 40;
        const sat = 35 + noise * 15;
        const light = 10 + (r / gridRows) * 15 + tempNorm * 5;
        this.ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        this.ctx.fillRect(c * cw - 1, r * ch - 1, cw + 2, ch + 2);
      }
    }

    const vGrad = this.ctx.createLinearGradient(0, 0, 0, H);
    vGrad.addColorStop(0, 'rgba(15, 23, 42, 0.65)');
    vGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.15)');
    vGrad.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
    this.ctx.fillStyle = vGrad;
    this.ctx.fillRect(0, 0, W, H);
  }

  private drawEcoGrid(W: number, H: number, t: number): void {
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
    this.ctx.lineWidth = 1;
    const spacing = 60;
    const offset = (t * 8) % spacing;
    this.ctx.beginPath();
    for (let x = -offset; x < W; x += spacing) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, H);
    }
    for (let y = -offset; y < H; y += spacing) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(W, y);
    }
    this.ctx.stroke();
  }

  private drawOrganisms(population: Organism[], t: number): void {
    const n = population.length;
    for (let i = 0; i < n; i++) {
      const org = population[i];
      const size = 10 + org.traits.bodySize * 30;
      const half = size / 2;

      const hue = org.colorHue;
      const sat = 55 + org.fitness * 25;
      const light = 45 + org.fitness * 20;
      const alpha = 0.75 + org.fitness * 0.25;

      const pulse = 1 + Math.sin(t * 2 + i * 0.5) * 0.04 * org.fitness;
      const w = half * 1.15 * pulse;
      const h = half * pulse;

      const glowGrad = this.ctx.createRadialGradient(
        org.x,
        org.y,
        0,
        org.x,
        org.y,
        size * 1.8
      );
      glowGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${alpha * 0.35})`);
      glowGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
      this.ctx.fillStyle = glowGrad;
      this.ctx.beginPath();
      this.ctx.arc(org.x, org.y, size * 1.8, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.ellipse(org.x, org.y, w, h, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
      this.ctx.fill();

      this.ctx.strokeStyle = `hsla(${hue}, ${sat + 10}%, ${light + 15}%, ${alpha})`;
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();

      if (org.fitness > 0.8) {
        this.ctx.fillStyle = `hsla(${hue}, 80%, 75%, 0.85)`;
        this.ctx.beginPath();
        this.ctx.arc(org.x - w * 0.3, org.y - h * 0.15, 1.8, 0, Math.PI * 2);
        this.ctx.arc(org.x + w * 0.3, org.y - h * 0.15, 1.8, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawEvolutionTree(
    nodes: GameEngine['prototype'] extends GameEngine ? any : any,
    W: number,
    H: number
  ): void {
    const panelW = 280;
    const panelH = 340;
    const px = W - panelW - 16;
    const py = H - panelH - 16;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1;
    this.roundRect(px, py, panelW, panelH, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.rect(px + 1, py + 1, panelW - 2, panelH - 2);
    this.ctx.clip();

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = '500 12px -apple-system, sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('进化树 (最近50代)', px + 12, py + 10);

    this.ctx.fillStyle = 'rgba(226, 232, 240, 0.5)';
    this.ctx.font = '10px -apple-system, sans-serif';
    this.ctx.fillText('节点大小 = 适应度 · 连线粗细 = 基因相似度', px + 12, py + 28);

    const contentX = px + 12;
    const contentY = py + panelH - 24;
    const contentW = panelW - 24;
    const contentH = panelH - 60;

    const state = this.engine.getState();
    const treeNodes = state.evolutionTree;
    const nodeById = new Map<string, any>();
    for (const n of treeNodes) nodeById.set(n.organismId, n);

    for (const node of treeNodes) {
      if (node.parentId) {
        const parent = nodeById.get(node.parentId);
        if (parent) {
          const sx = contentX + (parent.x / 270) * contentW;
          const sy = contentY - (320 - parent.y) * (contentH / 300);
          const ex = contentX + (node.x / 270) * contentW;
          const ey = contentY - (320 - node.y) * (contentH / 300);
          const lineWidth = 0.15 + node.similarity * 1.4;
          const lineHue = 180 + node.similarity * 60;
          this.ctx.beginPath();
          this.ctx.moveTo(sx, sy);
          this.ctx.lineTo(ex, ey);
          this.ctx.strokeStyle = `hsla(${lineHue}, 65%, 55%, ${0.3 + node.similarity * 0.5})`;
          this.ctx.lineWidth = lineWidth;
          this.ctx.stroke();
        }
      }
    }

    for (const node of treeNodes) {
      const nx = contentX + (node.x / 270) * contentW;
      const ny = contentY - (320 - node.y) * (contentH / 300);
      const radius = 1.5 + node.fitness * 6;
      const nodeHue = 180 + (1 - node.fitness) * 90;
      const grad = this.ctx.createRadialGradient(nx, ny, 0, nx, ny, radius * 2);
      grad.addColorStop(0, `hsla(${nodeHue}, 70%, 60%, 0.9)`);
      grad.addColorStop(1, `hsla(${nodeHue}, 70%, 45%, 0)`);
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(nx, ny, radius * 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `hsl(${nodeHue}, 75%, 60%)`;
      this.ctx.beginPath();
      this.ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  private checkHover(_W: number, _H: number): void {
    if (this.mouseX < 0 || this.mouseY < 0) return;
    const state = this.engine.getState();
    const pop = state.population;
    let closest: Organism | null = null;
    let closestDist = Infinity;
    for (let i = 0; i < pop.length; i++) {
      const org = pop[i];
      const size = 10 + org.traits.bodySize * 30;
      const dx = this.mouseX - org.x;
      const dy = this.mouseY - org.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const hitR = size * 0.9;
      if (d <= hitR && d < closestDist) {
        closestDist = d;
        closest = org;
      }
    }
    if (closest) {
      if (closest.id !== this.lastHoveredId) {
        this.lastHoveredId = closest.id;
        const info: HoverInfo = {
          organism: closest,
          screenX: this.mouseX,
          screenY: this.mouseY
        };
        if (this.hoverHandler) this.hoverHandler(info);
        this.engine.setHovered(info);
      }
    } else if (this.lastHoveredId !== null) {
      this.lastHoveredId = null;
      const info: HoverInfo = { organism: null, screenX: 0, screenY: 0 };
      if (this.hoverHandler) this.hoverHandler(info);
      this.engine.setHovered(info);
    }
  }
}
