import {
  Material,
  MaterialCategory,
  MaterialSelection,
  getMaterialById,
  drawMaterialThumbnail,
} from './materialLibrary';

interface RoomGeometry {
  canvasW: number;
  canvasH: number;
  floorTop: number;
  floorLeft: number;
  floorRight: number;
  floorBottom: number;
  wallLeft: number;
  wallRight: number;
  wallTop: number;
  wallBottom: number;
  windowLeft: number;
  windowRight: number;
  windowTop: number;
  windowBottom: number;
  vanishX: number;
  vanishY: number;
}

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentSelection: MaterialSelection;
  private resizeTimer: number | null = null;
  private renderFrame: number | null = null;
  private patternCache: Map<string, CanvasPattern> = new Map();
  private dpr: number;

  constructor(canvas: HTMLCanvasElement, initialSelection: MaterialSelection) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.currentSelection = initialSelection;
    this.dpr = Math.max(window.devicePixelRatio || 1, 1);

    this.setupCanvasSize();
    this.bindResize();
    this.scheduleRender();
  }

  public setSelection(selection: MaterialSelection): void {
    this.currentSelection = { ...selection };
    this.scheduleRender();
  }

  public getSelection(): MaterialSelection {
    return { ...this.currentSelection };
  }

  public resize(): void {
    this.setupCanvasSize();
    this.scheduleRender();
  }

  private bindResize(): void {
    window.addEventListener('resize', () => {
      if (this.resizeTimer) window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        this.resize();
      }, 300);
    });
  }

  private setupCanvasSize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cssW = Math.max(320, rect.width - 40);
    const cssH = Math.max(240, rect.height - 40);

    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';

    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.patternCache.clear();
  }

  private scheduleRender(): void {
    if (this.renderFrame !== null) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      const t0 = performance.now();
      this.render();
      const elapsed = performance.now() - t0;
      if (elapsed > 100) {
        console.warn(`渲染耗时 ${elapsed.toFixed(1)}ms，超过 100ms 目标`);
      }
    });
  }

  public render(): void {
    const { canvas } = this;
    const cssW = canvas.width / this.dpr;
    const cssH = canvas.height / this.dpr;

    this.ctx.clearRect(0, 0, cssW, cssH);

    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, cssH);
    bgGrad.addColorStop(0, '#F8FAFC');
    bgGrad.addColorStop(1, '#E2E8F0');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, cssW, cssH);

    const geom = this.computeGeometry(cssW, cssH);
    this.drawBackWall(geom);
    this.drawWindowAndCurtains(geom);
    this.drawFloor(geom);
    this.drawSceneBorders(geom);
  }

  private computeGeometry(cw: number, ch: number): RoomGeometry {
    const marginH = cw * 0.06;
    const vanishX = cw * 0.42;
    const vanishY = ch * 0.42;

    const wallLeft = marginH;
    const wallRight = cw - marginH;
    const wallTop = ch * 0.08;
    const wallBottom = ch * 0.55;

    const floorLeft = marginH;
    const floorRight = cw - marginH;
    const floorTop = wallBottom;
    const floorBottom = ch - ch * 0.06;

    const windowW = (wallRight - wallLeft) * 0.28;
    const windowH = (wallBottom - wallTop) * 0.55;
    const windowLeft = wallLeft + (wallRight - wallLeft) * 0.08;
    const windowRight = windowLeft + windowW;
    const windowTop = wallTop + (wallBottom - wallTop) * 0.22;
    const windowBottom = windowTop + windowH;

    return {
      canvasW: cw,
      canvasH: ch,
      floorTop,
      floorLeft,
      floorRight,
      floorBottom,
      wallLeft,
      wallRight,
      wallTop,
      wallBottom,
      windowLeft,
      windowRight,
      windowTop,
      windowBottom,
      vanishX,
      vanishY,
    };
  }

  private drawBackWall(geom: RoomGeometry): void {
    const wallMat = this.getMaterial('wall');

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(geom.wallLeft, geom.wallTop, geom.wallRight - geom.wallLeft, geom.wallBottom - geom.wallTop);
    this.ctx.clip();

    const w = geom.wallRight - geom.wallLeft;
    const h = geom.wallBottom - geom.wallTop;

    this.drawMaterialArea(
      wallMat,
      geom.wallLeft,
      geom.wallTop,
      w,
      h,
      'wall'
    );

    this.ctx.restore();

    this.ctx.save();
    const shadowGrad = this.ctx.createLinearGradient(0, geom.wallTop, 0, geom.wallBottom);
    shadowGrad.addColorStop(0, 'rgba(15,23,42,0.0)');
    shadowGrad.addColorStop(0.85, 'rgba(15,23,42,0.12)');
    shadowGrad.addColorStop(1, 'rgba(15,23,42,0.20)');
    this.ctx.fillStyle = shadowGrad;
    this.ctx.fillRect(geom.wallLeft, geom.wallTop, geom.wallRight - geom.wallLeft, geom.wallBottom - geom.wallTop);
    this.ctx.restore();
  }

  private drawWindowAndCurtains(geom: RoomGeometry): void {
    const curtainMat = this.getMaterial('curtain');

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(geom.windowLeft, geom.windowTop, geom.windowRight - geom.windowLeft, geom.windowBottom - geom.windowTop);
    this.ctx.clip();

    const skyGrad = this.ctx.createLinearGradient(0, geom.windowTop, 0, geom.windowBottom);
    skyGrad.addColorStop(0, '#BAE6FD');
    skyGrad.addColorStop(0.6, '#E0F2FE');
    skyGrad.addColorStop(1, '#FEF3C7');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(geom.windowLeft, geom.windowTop, geom.windowRight - geom.windowLeft, geom.windowBottom - geom.windowTop);

    this.ctx.globalAlpha = 0.45;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(geom.windowLeft + (geom.windowRight - geom.windowLeft) * 0.72, geom.windowTop + (geom.windowBottom - geom.windowTop) * 0.28, 18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 0.25;
    this.ctx.beginPath();
    this.ctx.arc(geom.windowLeft + (geom.windowRight - geom.windowLeft) * 0.72 + 6, geom.windowTop + (geom.windowBottom - geom.windowTop) * 0.28, 26, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    this.ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';
    const midX = (geom.windowLeft + geom.windowRight) / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(midX, geom.windowTop);
    this.ctx.lineTo(midX, geom.windowBottom);
    this.ctx.moveTo(geom.windowLeft, (geom.windowTop + geom.windowBottom) / 2);
    this.ctx.lineTo(geom.windowRight, (geom.windowTop + geom.windowBottom) / 2);
    this.ctx.stroke();

    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(geom.windowLeft, geom.windowTop, geom.windowRight - geom.windowLeft, geom.windowBottom - geom.windowTop);
    this.ctx.restore();

    const curtainW = (geom.windowRight - geom.windowLeft) * 0.42;
    const curtainTop = geom.windowTop - 6;
    const curtainBottom = geom.windowBottom + 10;

    this.drawCurtain(
      geom.windowLeft - 4,
      curtainTop,
      curtainW,
      curtainBottom - curtainTop,
      curtainMat,
      'left'
    );
    this.drawCurtain(
      geom.windowRight + 4 - curtainW,
      curtainTop,
      curtainW,
      curtainBottom - curtainTop,
      curtainMat,
      'right'
    );

    this.ctx.save();
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(geom.windowLeft - 10, curtainTop - 5, geom.windowRight - geom.windowLeft + 20, 5);
    this.ctx.fillStyle = '#1E293B';
    for (let x = geom.windowLeft - 8; x <= geom.windowRight + 8; x += 10) {
      this.ctx.beginPath();
      this.ctx.arc(x, curtainTop - 2.5, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawCurtain(
    x: number,
    y: number,
    w: number,
    h: number,
    material: Material,
    _side: 'left' | 'right'
  ): void {
    this.ctx.save();

    const folds = 6;
    const foldW = w / folds;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    for (let i = 0; i < folds; i++) {
      const cx = x + i * foldW + foldW / 2;
      const cy = y + h / 2;
      const ctrlOffset = foldW * 0.18;

      this.ctx.quadraticCurveTo(cx - ctrlOffset, cy, x + (i + 1) * foldW, y + h);
    }

    this.ctx.lineTo(x, y + h);
    this.ctx.closePath();
    this.ctx.clip();

    this.drawMaterialArea(material, x, y, w, h, 'curtain');

    this.ctx.globalAlpha = 0.35;
    this.ctx.strokeStyle = material.secondaryColor || this.adjustColor(material.baseColor, -30);
    this.ctx.lineWidth = 1.2;

    for (let i = 1; i < folds; i++) {
      const fx = x + i * foldW;
      this.ctx.beginPath();
      this.ctx.moveTo(fx, y);
      for (let py = y; py < y + h; py += 12) {
        const wave = Math.sin(py * 0.04) * (foldW * 0.1);
        this.ctx.lineTo(fx + wave, py);
      }
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 0.18;
    this.ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < folds; i++) {
      const fx = x + i * foldW + foldW * 0.3;
      this.ctx.beginPath();
      this.ctx.moveTo(fx, y);
      for (let py = y; py < y + h; py += 10) {
        const wave = Math.sin(py * 0.05 + 1) * (foldW * 0.08);
        this.ctx.lineTo(fx + wave, py);
      }
      this.ctx.lineTo(fx + 2, y + h);
      this.ctx.lineTo(fx + 2, y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(15,23,42,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    for (let i = 0; i < folds; i++) {
      const cx = x + i * foldW + foldW / 2;
      const cy = y + h / 2;
      const ctrlOffset = foldW * 0.18;
      this.ctx.quadraticCurveTo(cx - ctrlOffset, cy, x + (i + 1) * foldW, y + h);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawFloor(geom: RoomGeometry): void {
    const floorMat = this.getMaterial('floor');

    this.ctx.save();

    this.ctx.beginPath();
    this.ctx.moveTo(geom.floorLeft, geom.floorTop);
    this.ctx.lineTo(geom.floorRight, geom.floorTop);
    this.ctx.lineTo(geom.floorRight, geom.floorBottom);
    this.ctx.lineTo(geom.floorLeft, geom.floorBottom);
    this.ctx.closePath();
    this.ctx.clip();

    this.drawPerspectiveFloorMaterial(floorMat, geom);

    this.ctx.globalAlpha = 0.9;
    this.drawFloorGrid(geom);
    this.ctx.globalAlpha = 1;

    this.ctx.restore();

    this.ctx.save();
    const floorShadow = this.ctx.createLinearGradient(0, geom.floorTop, 0, geom.floorBottom);
    floorShadow.addColorStop(0, 'rgba(15,23,42,0.18)');
    floorShadow.addColorStop(0.2, 'rgba(15,23,42,0.0)');
    floorShadow.addColorStop(0.85, 'rgba(15,23,42,0.0)');
    floorShadow.addColorStop(1, 'rgba(15,23,42,0.12)');
    this.ctx.fillStyle = floorShadow;
    this.ctx.fillRect(geom.floorLeft, geom.floorTop, geom.floorRight - geom.floorLeft, geom.floorBottom - geom.floorTop);
    this.ctx.restore();
  }

  private drawPerspectiveFloorMaterial(material: Material, geom: RoomGeometry): void {
    const { vanishX, vanishY, floorLeft, floorRight, floorTop, floorBottom } = geom;
    const baseW = floorRight - floorLeft;
    const baseH = floorBottom - floorTop;
    const patternSize = Math.max(28, baseW * 0.05);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = patternSize;
    offCanvas.height = patternSize;
    const offCtx = offCanvas.getContext('2d')!;
    drawMaterialThumbnail(offCtx, material, patternSize, patternSize);

    const rows = Math.ceil(baseH / patternSize) + 4;
    for (let row = 0; row < rows; row++) {
      const tTop = row / rows;
      const tBottom = (row + 1) / rows;

      const yTop = floorTop + tTop * baseH;
      const yBottom = floorTop + tBottom * baseH;

      const topScale = this.perspectiveScale(tTop);
      const botScale = this.perspectiveScale(tBottom);

      const rowTopW = baseW * topScale;
      const rowBotW = baseW * botScale;

      const topLeft = vanishX - (vanishX - floorLeft) * topScale;
      const botLeft = vanishX - (vanishX - floorLeft) * botScale;

      const cols = Math.ceil(Math.max(rowTopW, rowBotW) / (patternSize * 0.8)) + 2;

      for (let col = 0; col < cols; col++) {
        const tcL = col / cols;
        const tcR = (col + 1) / cols;

        const xTL = topLeft + tcL * rowTopW;
        const xTR = topLeft + tcR * rowTopW;
        const xBL = botLeft + tcL * rowBotW;
        const xBR = botLeft + tcR * rowBotW;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(xTL, yTop);
        this.ctx.lineTo(xTR, yTop);
        this.ctx.lineTo(xBR, yBottom);
        this.ctx.lineTo(xBL, yBottom);
        this.ctx.closePath();
        this.ctx.clip();

        const cellW = xBR - xBL;
        const cellH = yBottom - yTop;
        const dx = (xTL + xBL) / 2 - patternSize / 2;
        const dy = (yTop + yBottom) / 2 - patternSize / 2;
        const sx = cellW / patternSize;
        const sy = cellH / patternSize;
        this.ctx.drawImage(offCanvas, 0, 0, patternSize, patternSize, dx, dy, patternSize * sx, patternSize * sy);
        this.ctx.restore();
      }
    }

    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillStyle = '#0F172A';
    this.ctx.beginPath();
    this.ctx.moveTo(floorLeft, floorTop);
    this.ctx.lineTo(floorRight, floorTop);
    this.ctx.lineTo(vanishX, vanishY);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  private perspectiveScale(t: number): number {
    const near = 1;
    const far = 0.12;
    const k = Math.pow(t, 0.85);
    return near - (near - far) * k;
  }

  private drawFloorGrid(geom: RoomGeometry): void {
    const { vanishX, vanishY, floorLeft, floorRight, floorTop, floorBottom } = geom;

    this.ctx.strokeStyle = '#CBD5E1';
    this.ctx.lineWidth = 1;

    const hLines = 14;
    for (let i = 1; i <= hLines; i++) {
      const t = i / hLines;
      const y = floorTop + t * (floorBottom - floorTop);
      const s = this.perspectiveScale(t);
      const xL = vanishX - (vanishX - floorLeft) * s;
      const xR = vanishX + (floorRight - vanishX) * s;

      this.ctx.globalAlpha = 0.2 + 0.7 * t;
      this.ctx.beginPath();
      this.ctx.moveTo(xL, y);
      this.ctx.lineTo(xR, y);
      this.ctx.stroke();
    }

    const vLines = 12;
    for (let i = 0; i <= vLines; i++) {
      const t = i / vLines;
      const bx = floorLeft + t * (floorRight - floorLeft);

      this.ctx.globalAlpha = 0.2 + 0.6 * Math.abs(t - 0.5) * 0.6;
      this.ctx.beginPath();
      this.ctx.moveTo(bx, floorBottom);
      this.ctx.lineTo(vanishX, vanishY);
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;
  }

  private drawMaterialArea(
    material: Material,
    x: number,
    y: number,
    w: number,
    h: number,
    category: MaterialCategory
  ): void {
    const cacheKey = `${material.id}_${Math.round(w)}x${Math.round(h)}`;
    let pattern = this.patternCache.get(cacheKey);

    if (!pattern) {
      const size = this.getTileSize(category, w, h);
      const offCanvas = document.createElement('canvas');
      offCanvas.width = size;
      offCanvas.height = size;
      const offCtx = offCanvas.getContext('2d')!;
      drawMaterialThumbnail(offCtx, material, size, size);
      const p = this.ctx.createPattern(offCanvas, 'repeat');
      if (p) {
        pattern = p;
        this.patternCache.set(cacheKey, pattern);
      }
    }

    if (pattern) {
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.fillStyle = pattern;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    } else {
      this.ctx.fillStyle = material.baseColor;
      this.ctx.fillRect(x, y, w, h);
    }
  }

  private getTileSize(category: MaterialCategory, w: number, _h: number): number {
    switch (category) {
      case 'wall':
        return Math.max(28, Math.round(w * 0.06));
      case 'curtain':
        return Math.max(24, Math.round(w * 0.05));
      case 'floor':
      default:
        return Math.max(32, Math.round(w * 0.07));
    }
  }

  private drawSceneBorders(geom: RoomGeometry): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#94A3B8';
    this.ctx.lineWidth = 1.5;
    this.ctx.globalAlpha = 0.6;

    this.ctx.beginPath();
    this.ctx.moveTo(geom.wallLeft, geom.wallTop);
    this.ctx.lineTo(geom.wallLeft, geom.wallBottom);
    this.ctx.lineTo(geom.floorLeft, geom.floorBottom);
    this.ctx.moveTo(geom.wallRight, geom.wallTop);
    this.ctx.lineTo(geom.wallRight, geom.wallBottom);
    this.ctx.lineTo(geom.floorRight, geom.floorBottom);
    this.ctx.moveTo(geom.wallLeft, geom.wallTop);
    this.ctx.lineTo(geom.wallRight, geom.wallTop);
    this.ctx.moveTo(geom.wallLeft, geom.wallBottom);
    this.ctx.lineTo(geom.wallRight, geom.wallBottom);
    this.ctx.stroke();

    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = '#64748B';
    this.ctx.lineWidth = 3;
    this.ctx.globalAlpha = 0.85;
    this.ctx.strokeRect(
      Math.min(geom.wallLeft, geom.floorLeft),
      Math.min(geom.wallTop, geom.floorTop),
      Math.max(geom.wallRight, geom.floorRight) - Math.min(geom.wallLeft, geom.floorLeft),
      Math.max(geom.wallBottom, geom.floorBottom) - Math.min(geom.wallTop, geom.floorTop)
    );
    this.ctx.restore();
  }

  private getMaterial(category: MaterialCategory): Material {
    const id = this.currentSelection[category];
    const mat = getMaterialById(category, id);
    if (!mat) {
      const fallback = getMaterialById(category, getFallbackId(category));
      if (!fallback) throw new Error(`找不到材质：${category}/${id}`);
      return fallback;
    }
    return mat;
  }

  public toDataURL(maxBytes: number = 200 * 1024): string {
    let quality = 0.92;
    let result = this.canvas.toDataURL('image/jpeg', quality);

    while (result.length > maxBytes * 1.35 && quality > 0.3) {
      quality -= 0.08;
      result = this.canvas.toDataURL('image/jpeg', quality);
    }

    if (result.length > maxBytes * 1.35) {
      const tmpCanvas = document.createElement('canvas');
      const scale = 0.75;
      tmpCanvas.width = Math.floor(this.canvas.width * scale);
      tmpCanvas.height = Math.floor(this.canvas.height * scale);
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(this.canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
      result = tmpCanvas.toDataURL('image/jpeg', 0.8);
    }

    return result;
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00ff) + amount;
    let b = (num & 0x0000ff) + amount;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  public destroy(): void {
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    this.patternCache.clear();
  }
}

function getFallbackId(category: MaterialCategory): string {
  switch (category) {
    case 'floor':
      return 'floor-oak';
    case 'wall':
      return 'wall-cream';
    case 'curtain':
      return 'curtain-white-sheer';
  }
}
