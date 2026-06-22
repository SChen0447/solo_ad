import type { ClayData, VertexRow } from './clay-editor';

export interface GlazeColor {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
}

export interface GlazeLayer {
  color: GlazeColor;
  centerY: number;
  spread: number;
  intensity: number;
  timestamp: number;
}

export interface GlazeData {
  layers: GlazeLayer[];
  appliedGlazes: GlazeColor[];
}

export const GLAZE_COLORS: GlazeColor[] = [
  { name: '青瓷釉', hex: '#7FB3A0', rgb: { r: 127, g: 179, b: 160 } },
  { name: '霁蓝釉', hex: '#2E4A6B', rgb: { r: 46, g: 74, b: 107 } },
  { name: '珊瑚红', hex: '#E06B5B', rgb: { r: 224, g: 107, b: 91 } },
  { name: '鹅黄釉', hex: '#F2D160', rgb: { r: 242, g: 209, b: 96 } },
  { name: '翠绿釉', hex: '#5A9E6F', rgb: { r: 90, g: 158, b: 111 } },
  { name: '酱釉紫', hex: '#6B4E6D', rgb: { r: 107, g: 78, b: 109 } },
  { name: '月白釉', hex: '#D6E0E8', rgb: { r: 214, g: 224, b: 232 } },
  { name: '桃花粉', hex: '#E8A5B8', rgb: { r: 232, g: 165, b: 184 } },
  { name: '琥珀金', hex: '#C9A24E', rgb: { r: 201, g: 162, b: 78 } },
  { name: '墨玉黑', hex: '#2C2C34', rgb: { r: 44, g: 44, b: 52 } },
  { name: '象牙白', hex: '#F0E6D2', rgb: { r: 240, g: 230, b: 210 } },
  { name: '钧窑紫', hex: '#7B4D7E', rgb: { r: 123, g: 77, b: 126 } }
];

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const BG_COLOR = '#D4B896';
const CLAY_BASE = { r: 193, g: 154, b: 107 };
const CLAY_EDGE = { r: 160, g: 118, b: 74 };

export class GlazeModule {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private clayData: ClayData;
  private selectedColor: GlazeColor | null = null;
  private layers: GlazeLayer[] = [];
  private appliedGlazes: GlazeColor[] = [];
  private isPainting = false;
  private frameId: number | null = null;
  private onDataChange?: (data: GlazeData) => void;
  private paletteContainer: HTMLElement | null = null;
  private infoContainer: HTMLElement | null = null;

  constructor(container: HTMLElement, paletteContainer: HTMLElement, infoContainer: HTMLElement, clayData: ClayData) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'glazeCanvas';
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);

    this.paletteContainer = paletteContainer;
    this.infoContainer = infoContainer;
    this.clayData = clayData;

    this.buildPalette();
    this.bindEvents();
    this.animate();
  }

  private buildPalette(): void {
    if (!this.paletteContainer) return;
    this.paletteContainer.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'palette-grid';

    GLAZE_COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'glaze-swatch';
      swatch.style.background = this.createGlazeGradient(color);
      swatch.dataset.index = String(index);

      const tooltip = document.createElement('div');
      tooltip.className = 'swatch-tooltip';
      tooltip.textContent = color.name;
      swatch.appendChild(tooltip);

      swatch.addEventListener('click', () => {
        this.selectColor(color, swatch);
      });

      grid.appendChild(swatch);
    });

    this.paletteContainer.appendChild(grid);
    this.updateInfo();
  }

  private createGlazeGradient(color: GlazeColor): string {
    const { r, g, b } = color.rgb;
    const lighter = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
    const darker = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
    const rgbColor = `rgb(${r}, ${g}, ${b})`;
    return `linear-gradient(145deg, ${lighter} 0%, ${rgbColor} 40%, ${darker} 100%)`;
  }

  private selectColor(color: GlazeColor, element: HTMLElement): void {
    this.selectedColor = color;

    if (this.paletteContainer) {
      this.paletteContainer.querySelectorAll('.glaze-swatch').forEach(el => {
        el.classList.remove('selected');
      });
      element.classList.add('selected');
    }

    if (!this.appliedGlazes.find(g => g.name === color.name)) {
      this.appliedGlazes.push(color);
    }

    this.updateInfo();
  }

  private updateInfo(): void {
    if (!this.infoContainer) return;
    const color = this.selectedColor;

    this.infoContainer.innerHTML = '';

    const currentDiv = document.createElement('div');
    currentDiv.className = 'current-glaze';

    const preview = document.createElement('div');
    preview.className = 'current-glaze-preview';
    preview.style.background = color ? this.createGlazeGradient(color) : '#ccc';
    currentDiv.appendChild(preview);

    const info = document.createElement('div');
    info.className = 'current-glaze-info';

    const name = document.createElement('div');
    name.className = 'current-glaze-name';
    name.textContent = color ? color.name : '请选择釉色';
    info.appendChild(name);

    const hint = document.createElement('div');
    hint.className = 'current-glaze-hint';
    hint.textContent = color ? '点击陶器表面上釉，可叠加多种颜色' : '从上方色盘中选择一种釉色';
    info.appendChild(hint);

    currentDiv.appendChild(info);
    this.infoContainer.appendChild(currentDiv);
  }

  private bindEvents(): void {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? (e as TouchEvent).changedTouches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / rect.width),
        y: (clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!this.selectedColor) return;
      this.isPainting = true;
      const pos = getPos(e);
      this.applyGlaze(pos.x, pos.y);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isPainting || !this.selectedColor) return;
      e.preventDefault();
      const pos = getPos(e);
      this.applyGlaze(pos.x, pos.y);
    };

    const onUp = () => {
      if (this.isPainting) {
        this.isPainting = false;
        this.notifyDataChange();
      }
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onUp);
  }

  private applyGlaze(x: number, y: number): void {
    if (!this.selectedColor) return;
    if (!this.isInsideClay(x, y)) return;

    this.layers.push({
      color: this.selectedColor,
      centerY: y,
      spread: 50 + Math.random() * 30,
      intensity: 0.35 + Math.random() * 0.25,
      timestamp: Date.now() + Math.random()
    });

    this.notifyDataChange();
  }

  private isInsideClay(x: number, y: number): boolean {
    const { centerX } = this.clayData;
    for (const row of this.clayData.rows) {
      if (Math.abs(y - row.y) < 8) {
        return Math.abs(x - centerX) < row.currentRadius;
      }
    }
    const topRow = this.clayData.rows[0];
    const bottomRow = this.clayData.rows[this.clayData.rows.length - 1];
    if (y >= topRow.y - 10 && y <= bottomRow.y + 10) {
      let closestRow: VertexRow | null = null;
      let minDist = Infinity;
      for (const row of this.clayData.rows) {
        const d = Math.abs(y - row.y);
        if (d < minDist) {
          minDist = d;
          closestRow = row;
        }
      }
      if (closestRow) {
        return Math.abs(x - centerX) < closestRow.currentRadius;
      }
    }
    return false;
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

  private blendGlazeColor(y: number, baseR: number, baseG: number, baseB: number): { r: number; g: number; b: number } {
    let r = baseR, g = baseG, b = baseB;
    let totalWeight = 1;

    for (const layer of this.layers) {
      const dist = Math.abs(y - layer.centerY);
      const falloff = Math.max(0, 1 - dist / layer.spread);
      if (falloff <= 0) continue;

      const weight = layer.intensity * falloff * falloff;
      const { r: gr, g: gg, b: gb } = layer.color.rgb;

      r = (r * totalWeight + gr * weight) / (totalWeight + weight);
      g = (g * totalWeight + gg * weight) / (totalWeight + weight);
      b = (b * totalWeight + gb * weight) / (totalWeight + weight);
      totalWeight += weight;
    }

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  private draw(): void {
    const ctx = this.ctx;
    const { centerX, rows } = this.clayData;

    ctx.fillStyle = BG_COLOR;
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
      const normalizedX = (py - topY) / (bottomY - topY);
      const edgeFactor = Math.sin(normalizedX * Math.PI);
      const edgeMix = 1 - edgeFactor * 0.5;

      let baseR = CLAY_BASE.r * edgeMix + CLAY_EDGE.r * (1 - edgeMix);
      let baseG = CLAY_BASE.g * edgeMix + CLAY_EDGE.g * (1 - edgeMix);
      let baseB = CLAY_BASE.b * edgeMix + CLAY_EDGE.b * (1 - edgeMix);

      const blended = this.blendGlazeColor(py, baseR, baseG, baseB);

      const grad = ctx.createLinearGradient(centerX - radiusAtY, 0, centerX + radiusAtY, 0);
      const edgeR = Math.max(0, blended.r - 35);
      const edgeG = Math.max(0, blended.g - 35);
      const edgeB = Math.max(0, blended.b - 35);
      const lightR = Math.min(255, blended.r + 25);
      const lightG = Math.min(255, blended.g + 25);
      const lightB = Math.min(255, blended.b + 25);

      grad.addColorStop(0, `rgb(${edgeR}, ${edgeG}, ${edgeB})`);
      grad.addColorStop(0.3, `rgb(${blended.r}, ${blended.g}, ${blended.b})`);
      grad.addColorStop(0.5, `rgb(${lightR}, ${lightG}, ${lightB})`);
      grad.addColorStop(0.7, `rgb(${blended.r}, ${blended.g}, ${blended.b})`);
      grad.addColorStop(1, `rgb(${edgeR}, ${edgeG}, ${edgeB})`);

      ctx.fillStyle = grad;
      ctx.fillRect(centerX - radiusAtY - 2, py - 1, radiusAtY * 2 + 4, 3);
    }

    const highlightGrad = ctx.createLinearGradient(centerX - 80, 0, centerX + 30, 0);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    highlightGrad.addColorStop(0.65, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = highlightGrad;
    ctx.fillRect(centerX - 200, topY - 30, 400, bottomY - topY + 60);

    const shineGrad = ctx.createRadialGradient(
      centerX - 30, topY + 40, 0,
      centerX - 30, topY + 40, 80
    );
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
    shineGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    ctx.fillRect(centerX - 150, topY - 20, 250, 160);

    const shadowGrad = ctx.createLinearGradient(centerX + 20, 0, centerX + 140, 0);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(40,20,10,0.25)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(centerX - 200, topY - 30, 400, bottomY - topY + 60);

    ctx.restore();

    const topRow = rows[0];
    let topR = CLAY_BASE.r, topG = CLAY_BASE.g, topB = CLAY_BASE.b;
    let count = 0;
    for (let i = 0; i < 5; i++) {
      const blended = this.blendGlazeColor(topRow.y + i * 4, CLAY_BASE.r, CLAY_BASE.g, CLAY_BASE.b);
      topR += blended.r; topG += blended.g; topB += blended.b;
      count++;
    }
    topR = Math.round(topR / count); topG = Math.round(topG / count); topB = Math.round(topB / count);

    const topGrad = ctx.createRadialGradient(
      centerX, topRow.y - 2, 0,
      centerX, topRow.y, topRow.currentRadius
    );
    topGrad.addColorStop(0, `rgb(${Math.min(255, topR + 35)}, ${Math.min(255, topG + 35)}, ${Math.min(255, topB + 35)})`);
    topGrad.addColorStop(0.6, `rgb(${topR}, ${topG}, ${topB})`);
    topGrad.addColorStop(1, `rgb(${Math.max(0, topR - 25)}, ${Math.max(0, topG - 25)}, ${Math.max(0, topB - 25)})`);

    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, topRow.y, topRow.currentRadius, topRow.currentRadius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (this.layers.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 8; i++) {
        const yy = topY + (bottomY - topY) * (i / 8);
        const rad = this.getRadiusAtY(yy);
        ctx.beginPath();
        ctx.moveTo(centerX - rad, yy);
        ctx.bezierCurveTo(
          centerX - rad * 0.5, yy - 2,
          centerX + rad * 0.5, yy + 2,
          centerX + rad, yy
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private animate = (): void => {
    this.draw();
    this.frameId = requestAnimationFrame(this.animate);
  };

  updateClayData(data: ClayData): void {
    this.clayData = data;
  }

  getData(): GlazeData {
    return {
      layers: [...this.layers],
      appliedGlazes: [...this.appliedGlazes]
    };
  }

  setOnDataChange(callback: (data: GlazeData) => void): void {
    this.onDataChange = callback;
  }

  private notifyDataChange(): void {
    if (this.onDataChange) {
      this.onDataChange(this.getData());
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
    }
  }
}
