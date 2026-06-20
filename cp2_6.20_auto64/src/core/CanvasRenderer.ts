import { TextElement, DecorationElement, DecorationType, BackgroundConfig, CardElement } from '../types';

const CANVAS_W = 800;
const CANVAS_H = 600;
const DEFAULT_BG_COLOR = '#FFF8F0';

type ElementMap = Map<string, CardElement>;

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private elements: ElementMap = new Map();
  private background: BackgroundConfig = { type: 'solid', value: DEFAULT_BG_COLOR };
  private selectedId: string | null = null;
  private bgImage: HTMLImageElement | null = null;
  private bgImageLoading = false;
  private needsRender = true;
  private rafId: number | null = null;
  private dashOffset = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.startLoop();
  }

  private startLoop() {
    const loop = () => {
      this.dashOffset = (this.dashOffset + 0.3) % 16;
      if (this.needsRender || this.selectedId) {
        this.doRender();
        this.needsRender = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }

  markDirty() {
    this.needsRender = true;
  }

  setBackground(bg: BackgroundConfig) {
    this.background = bg;
    this.bgImage = null;
    this.bgImageLoading = false;
    if (bg.type === 'image') {
      this.loadBgImage(bg.value);
    }
    this.needsRender = true;
  }

  private loadBgImage(url: string) {
    this.bgImageLoading = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.bgImage = img;
      this.bgImageLoading = false;
      this.needsRender = true;
    };
    img.onerror = () => {
      this.bgImageLoading = false;
      this.needsRender = true;
    };
    img.src = url;
  }

  addText(text: TextElement) {
    this.elements.set(text.id, text);
    this.needsRender = true;
  }

  updateText(id: string, updates: Partial<TextElement>) {
    const el = this.elements.get(id);
    if (el && el.type === 'text') {
      this.elements.set(id, { ...el, ...updates } as TextElement);
      this.needsRender = true;
    }
  }

  addDecoration(deco: DecorationElement) {
    this.elements.set(deco.id, deco);
    this.needsRender = true;
  }

  updateDecoration(id: string, updates: Partial<DecorationElement>) {
    const el = this.elements.get(id);
    if (el && el.type === 'decoration') {
      this.elements.set(id, { ...el, ...updates } as DecorationElement);
      this.needsRender = true;
    }
  }

  removeElement(id: string) {
    this.elements.delete(id);
    if (this.selectedId === id) this.selectedId = null;
    this.needsRender = true;
  }

  setSelected(id: string | null) {
    this.selectedId = id;
    this.needsRender = true;
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  hitTest(x: number, y: number): string | null {
    const els = Array.from(this.elements.values()).reverse();
    for (const el of els) {
      const bounds = this.getElementBounds(el);
      if (x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h) {
        return el.id;
      }
    }
    return null;
  }

  private getElementBounds(el: CardElement): { x: number; y: number; w: number; h: number } {
    if (el.type === 'text') {
      this.ctx.font = `${el.fontSize}px ${el.fontFamily}`;
      const metrics = this.ctx.measureText(el.content);
      const w = metrics.width;
      const h = el.fontSize * 1.3;
      return { x: el.x - w / 2, y: el.y - h / 2, w, h };
    } else {
      const baseSize = 40;
      const size = baseSize * el.scale;
      return { x: el.x - size / 2, y: el.y - size / 2, w: size, h: size };
    }
  }

  render() {
    this.needsRender = true;
  }

  getCanvasDataURL(type = 'image/png'): string {
    const prevSel = this.selectedId;
    this.selectedId = null;
    this.doRender();
    const data = this.canvas.toDataURL(type);
    this.selectedId = prevSel;
    return data;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private doRender() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    this.drawBackground(ctx);

    const sortedEls = Array.from(this.elements.values());
    for (const el of sortedEls) {
      if (el.type === 'text') {
        this.drawText(ctx, el);
      } else {
        this.drawDecoration(ctx, el);
      }
    }

    if (this.selectedId) {
      const sel = this.elements.get(this.selectedId);
      if (sel) this.drawSelection(ctx, sel);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    if (this.background.type === 'solid') {
      ctx.fillStyle = this.background.value;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    } else if (this.background.type === 'gradient') {
      const gradStr = this.background.value;
      const parsed = this.parseGradient(gradStr);
      if (parsed) {
        const grad = ctx.createLinearGradient(parsed.x0, parsed.y0, parsed.x1, parsed.y1);
        for (const stop of parsed.stops) {
          grad.addColorStop(stop.offset, stop.color);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      } else {
        ctx.fillStyle = DEFAULT_BG_COLOR;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    } else if (this.background.type === 'image') {
      if (this.bgImage) {
        const iw = this.bgImage.width;
        const ih = this.bgImage.height;
        const scale = Math.max(CANVAS_W / iw, CANVAS_H / ih);
        const sw = iw * scale;
        const sh = ih * scale;
        ctx.drawImage(this.bgImage, (CANVAS_W - sw) / 2, (CANVAS_H - sh) / 2, sw, sh);
      } else if (this.bgImageLoading) {
        ctx.fillStyle = DEFAULT_BG_COLOR;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#999';
        ctx.font = '18px Noto Sans SC';
        ctx.textAlign = 'center';
        ctx.fillText('背景加载中...', CANVAS_W / 2, CANVAS_H / 2);
      } else {
        ctx.fillStyle = DEFAULT_BG_COLOR;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
    }
  }

  private parseGradient(gradStr: string) {
    const colorStopRegex = /rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|\w+\([^)]+\)/g;
    const angleMatch = gradStr.match(/(\d+)deg/);
    const colors = gradStr.match(colorStopRegex);
    if (!colors || colors.length < 2) return null;

    const angle = angleMatch ? parseInt(angleMatch[1]) : 135;
    const rad = (angle * Math.PI) / 180;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const len = Math.sqrt(CANVAS_W * CANVAS_W + CANVAS_H * CANVAS_H) / 2;
    const x0 = cx - Math.cos(rad) * len;
    const y0 = cy - Math.sin(rad) * len;
    const x1 = cx + Math.cos(rad) * len;
    const y1 = cy + Math.sin(rad) * len;

    const stops = colors.map((color, i) => ({
      offset: colors.length === 1 ? 0 : i / (colors.length - 1),
      color: color.trim(),
    }));

    return { x0, y0, x1, y1, stops };
  }

  private drawText(ctx: CanvasRenderingContext2D, el: TextElement) {
    ctx.save();
    ctx.font = `${el.fontSize}px ${el.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (el.shadowBlur > 0) {
      ctx.shadowBlur = el.shadowBlur;
      ctx.shadowColor = el.shadowColor;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    if (el.strokeWidth > 0) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineJoin = 'round';
      ctx.strokeText(el.content, el.x, el.y);
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = el.color;
    ctx.fillText(el.content, el.x, el.y);

    ctx.restore();
  }

  private drawDecoration(ctx: CanvasRenderingContext2D, el: DecorationElement) {
    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.scale(el.scale, el.scale);

    switch (el.shape) {
      case 'flower': this.drawFlower(ctx, el.color); break;
      case 'star': this.drawStar(ctx, el.color); break;
      case 'heart': this.drawHeart(ctx, el.color); break;
      case 'balloon': this.drawBalloon(ctx, el.color); break;
      case 'confetti': this.drawConfetti(ctx, el.color); break;
    }

    ctx.restore();
  }

  private drawFlower(ctx: CanvasRenderingContext2D, color: string) {
    const petals = 6;
    const petalR = 12;
    const centerR = 8;
    for (let i = 0; i < petals; i++) {
      const angle = (i * 2 * Math.PI) / petals;
      const px = Math.cos(angle) * 14;
      const py = Math.sin(angle) * 14;
      ctx.beginPath();
      ctx.ellipse(px, py, petalR, petalR * 0.6, angle, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, color: string) {
    const outerR = 18;
    const innerR = 8;
    const points = 5;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, color: string) {
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.bezierCurveTo(-20, -22, -28, 2, 0, 20);
    ctx.moveTo(0, -6);
    ctx.bezierCurveTo(20, -22, 28, 2, 0, 20);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawBalloon(ctx: CanvasRenderingContext2D, color: string) {
    ctx.beginPath();
    ctx.ellipse(0, -8, 12, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-3, 8);
    ctx.lineTo(0, 12);
    ctx.lineTo(3, 8);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.quadraticCurveTo(2, 20, -1, 28);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawConfetti(ctx: CanvasRenderingContext2D, color: string) {
    const pieces = 7;
    for (let i = 0; i < pieces; i++) {
      ctx.save();
      const ox = (Math.random() - 0.5) * 30;
      const oy = (Math.random() - 0.5) * 30;
      ctx.translate(ox, oy);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? color : this.lightenColor(color, 40);
      ctx.globalAlpha = 0.9;
      if (i % 3 === 0) {
        ctx.fillRect(-4, -2, 8, 4);
      } else if (i % 3 === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  private drawSelection(ctx: CanvasRenderingContext2D, el: CardElement) {
    const bounds = this.getElementBounds(el);
    const pad = 6;

    ctx.save();
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -this.dashOffset;
    ctx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.w + pad * 2, bounds.h + pad * 2);
    ctx.setLineDash([]);

    const cpSize = 6;
    const corners = [
      { x: bounds.x - pad, y: bounds.y - pad },
      { x: bounds.x + bounds.w + pad, y: bounds.y - pad },
      { x: bounds.x - pad, y: bounds.y + bounds.h + pad },
      { x: bounds.x + bounds.w + pad, y: bounds.y + bounds.h + pad },
    ];
    for (const c of corners) {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 1.5;
      ctx.fillRect(c.x - cpSize / 2, c.y - cpSize / 2, cpSize, cpSize);
      ctx.strokeRect(c.x - cpSize / 2, c.y - cpSize / 2, cpSize, cpSize);
    }

    ctx.restore();
  }
}

export { CANVAS_W, CANVAS_H };
