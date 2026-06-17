import { SynthesisRules, type HexCoord } from './synthesis-rules';
import { LifecycleManager } from './lifecycle-manager';

interface CellState {
  coord: HexCoord;
  elementId: string | null;
  isMagicCircle: boolean;
  magicCircleActive: boolean;
  magicCircleProgress: number;
  hoverTime: number;
  isHovered: boolean;
  isHighlighted: boolean;
  highlightTime: number;
  isShaking: boolean;
  shakeTime: number;
  isFlashingRed: boolean;
  flashRedTime: number;
  removeStartTime: number;
  isRemoving: boolean;
  placeStartTime: number;
  isPlacing: boolean;
  compoundRotation: number;
}

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  screenX: number;
  screenY: number;
}

interface SynthesisState {
  isActive: boolean;
  selectedCell: HexCoord | null;
  isAnimating: boolean;
  resultCell: HexCoord | null;
  resultElementId: string | null;
  animationProgress: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rules: SynthesisRules;
  private lifecycle: LifecycleManager;

  private cells: Map<string, CellState> = new Map();
  private hexSize: number = 50;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private gridRadius: number = 3;

  private drag: DragState = {
    isDragging: false,
    elementId: null,
    screenX: 0,
    screenY: 0
  };

  private synthesis: SynthesisState = {
    isActive: false,
    selectedCell: null,
    isAnimating: false,
    resultCell: null,
    resultElementId: null,
    animationProgress: 0
  };

  private animationFrame: number = 0;
  private lastTime: number = 0;
  private pulseTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    rules: SynthesisRules,
    lifecycle: LifecycleManager
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.rules = rules;
    this.lifecycle = lifecycle;
  }

  init(): void {
    const config = this.rules.getWorkshopConfig();
    this.hexSize = config.hexSize;
    this.gridRadius = config.gridRadius;

    this.resize();
    this.initCells(config.magicCirclePositions);
    this.startGameLoop();
    window.addEventListener('resize', this.resize.bind(this));
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.scale(dpr, dpr);

    this.offsetX = w / 2;
    this.offsetY = h / 2;
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  getHexSize(): number {
    return this.hexSize;
  }

  private initCells(magicPositions: HexCoord[]): void {
    this.cells.clear();
    const magicSet = new Set(magicPositions.map(p => `${p.q},${p.r}`));

    for (let q = -this.gridRadius; q <= this.gridRadius; q++) {
      for (let r = -this.gridRadius; r <= this.gridRadius; r++) {
        if (Math.abs(q + r) <= this.gridRadius) {
          const key = `${q},${r}`;
          this.cells.set(key, {
            coord: { q, r },
            elementId: null,
            isMagicCircle: magicSet.has(key),
            magicCircleActive: false,
            magicCircleProgress: 0,
            hoverTime: 0,
            isHovered: false,
            isHighlighted: false,
            highlightTime: 0,
            isShaking: false,
            shakeTime: 0,
            isFlashingRed: false,
            flashRedTime: 0,
            removeStartTime: 0,
            isRemoving: false,
            placeStartTime: 0,
            isPlacing: false,
            compoundRotation: 0
          });
        }
      }
    }
  }

  private getCell(coord: HexCoord): CellState | undefined {
    return this.cells.get(`${coord.q},${coord.r}`);
  }

  private isValidCell(coord: HexCoord): boolean {
    return this.cells.has(`${coord.q},${coord.r}`);
  }

  pixelToHex(x: number, y: number): HexCoord | null {
    const px = x - this.offsetX;
    const py = y - this.offsetY;

    const size = this.hexSize;
    const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / size;
    const r = ((2 / 3) * py) / size;

    const rounded = this.roundHex(q, r);
    if (this.isValidCell(rounded)) {
      return rounded;
    }
    return null;
  }

  private roundHex(q: number, r: number): HexCoord {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  hexToPixel(q: number, r: number): { x: number; y: number } {
    const size = this.hexSize;
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * ((3 / 2) * r);
    return {
      x: x + this.offsetX,
      y: y + this.offsetY
    };
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const dt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    this.pulseTime += dt;

    for (const cell of this.cells.values()) {
      if (cell.isMagicCircle && cell.magicCircleActive && cell.magicCircleProgress < 1) {
        cell.magicCircleProgress = Math.min(1, cell.magicCircleProgress + dt / 2);
      }

      if (cell.isHighlighted) {
        cell.highlightTime += dt;
        if (cell.highlightTime > 0.3) {
          cell.isHighlighted = false;
          cell.highlightTime = 0;
        }
      }

      if (cell.isShaking) {
        cell.shakeTime += dt;
        if (cell.shakeTime > 0.1) {
          cell.isShaking = false;
          cell.shakeTime = 0;
        }
      }

      if (cell.isFlashingRed) {
        cell.flashRedTime += dt;
        if (cell.flashRedTime > 0.2) {
          cell.isFlashingRed = false;
          cell.flashRedTime = 0;
        }
      }

      if (cell.elementId) {
        const info = this.rules.getElementInfo(cell.elementId);
        if (info && info.isCompound) {
          cell.compoundRotation += dt * 30;
        }
      }
    }

    if (this.synthesis.isAnimating) {
      this.synthesis.animationProgress += dt;
      if (this.synthesis.animationProgress >= 1) {
        this.finishSynthesisAnimation();
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground();

    for (const cell of this.cells.values()) {
      this.drawHexCell(cell);
    }

    for (const cell of this.cells.values()) {
      if (cell.elementId && !cell.isRemoving) {
        this.drawElement(cell);
      } else if (cell.isRemoving && cell.elementId) {
        this.drawRemovingElement(cell);
      }
    }

    if (this.synthesis.isAnimating && this.synthesis.resultCell && this.synthesis.resultElementId) {
      this.drawSynthesisResult();
    }

    if (this.drag.isDragging && this.drag.elementId) {
      this.drawDragElement();
    }

    if (this.synthesis.isActive && this.synthesis.selectedCell) {
      this.drawSelectedCell();
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#3a3a3a');
    gradient.addColorStop(1, '#252525');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < h; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i + Math.sin(i * 0.1) * 2);
      ctx.stroke();
    }
  }

  private drawHexCell(cell: CellState): void {
    const ctx = this.ctx;
    const pos = this.hexToPixel(cell.coord.q, cell.coord.r);
    const size = this.hexSize;

    let offsetX = 0;
    let offsetY = 0;
    if (cell.isShaking) {
      const shakeAmount = 3;
      offsetX = (Math.random() - 0.5) * shakeAmount * 2;
      offsetY = (Math.random() - 0.5) * shakeAmount * 2;
    }

    const cx = pos.x + offsetX;
    const cy = pos.y + offsetY;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();

    let fillColor = 'rgba(176, 176, 176, 0.3)';

    if (cell.isHovered) {
      fillColor = 'rgba(255, 255, 255, 0.5)';
    }

    if (cell.isHighlighted) {
      fillColor = 'rgba(255, 255, 255, 0.6)';
    }

    if (cell.isFlashingRed) {
      const flashIntensity = Math.sin(cell.flashRedTime * 30) * 0.5 + 0.5;
      fillColor = `rgba(255, 50, 50, ${0.4 + flashIntensity * 0.4})`;
    }

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.lineWidth = 1;
    if (cell.isHighlighted) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    }
    ctx.stroke();

    if (cell.isMagicCircle) {
      this.drawMagicCircle(cell, cx, cy);
    }
  }

  private drawMagicCircle(cell: CellState, cx: number, cy: number): void {
    const ctx = this.ctx;
    const size = this.hexSize * 0.8;

    ctx.save();
    ctx.translate(cx, cy);

    const progress = cell.magicCircleProgress;

    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = Math.max(0, Math.min(1, progress * 3 - ring));
      const ringSize = size * (0.6 + ring * 0.15);

      ctx.beginPath();
      const segments = 6;
      for (let i = 0; i <= segments; i++) {
        const segProgress = i / segments;
        if (segProgress > ringProgress) break;

        const angle = (Math.PI * 2 / segments) * i - Math.PI / 2;
        const x = Math.cos(angle) * ringSize;
        const y = Math.sin(angle) * ringSize;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + progress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10 * progress;
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const segProgress = (i + 0.5) / 6;
        if (segProgress > ringProgress) break;

        const angle = (Math.PI * 2 / 6) * i;
        const x = Math.cos(angle) * ringSize;
        const y = Math.sin(angle) * ringSize;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + progress * 0.5})`;
        ctx.fill();
      }
    }

    if (progress > 0.5) {
      const innerGlow = (progress - 0.5) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
      glowGrad.addColorStop(0, `rgba(255, 215, 0, ${0.6 * innerGlow})`);
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    ctx.restore();
  }

  private drawElement(cell: CellState): void {
    if (!cell.elementId) return;

    const ctx = this.ctx;
    const info = this.rules.getElementInfo(cell.elementId);
    if (!info) return;

    const pos = this.hexToPixel(cell.coord.q, cell.coord.r);
    const size = this.hexSize;
    let radius = size * 0.55;

    if (info.isCompound) {
      radius *= 1.2;
    }

    let scale = 1;
    if (cell.isPlacing) {
      const placeProgress = Math.min(1, (performance.now() / 1000 - cell.placeStartTime) / 0.3);
      scale = this.easeOutElastic(placeProgress);
    }

    if (cell.isHovered) {
      scale *= 1.3;
    }

    const actualRadius = radius * scale;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const pulsePhase = (this.pulseTime % 2) / 2;
    const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.08;

    const glowRadius = actualRadius * 1.5 * pulseScale;
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glowGrad.addColorStop(0, this.hexToRgba(info.color1, 0.4));
    glowGrad.addColorStop(0.5, this.hexToRgba(info.color2, 0.2));
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const sphereGrad = ctx.createRadialGradient(-actualRadius * 0.3, -actualRadius * 0.3, 0, 0, 0, actualRadius);
    sphereGrad.addColorStop(0, info.color2);
    sphereGrad.addColorStop(0.7, info.color1);
    sphereGrad.addColorStop(1, this.darkenColor(info.color1, 0.3));
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, actualRadius * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    const highlightGrad = ctx.createRadialGradient(-actualRadius * 0.25, -actualRadius * 0.25, 0, -actualRadius * 0.25, -actualRadius * 0.25, actualRadius * 0.4);
    highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.arc(0, 0, actualRadius * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    if (info.isCompound) {
      ctx.rotate((cell.compoundRotation * Math.PI) / 180);
      ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const r1 = actualRadius * 1.1;
        const r2 = actualRadius * 1.25;
        const x1 = Math.cos(angle) * r1;
        const y1 = Math.sin(angle) * r1;
        const x2 = Math.cos(angle) * r2;
        const y2 = Math.sin(angle) * r2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    ctx.restore();

    if (cell.isHovered) {
      ctx.save();
      ctx.font = '14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(info.name, pos.x, pos.y - actualRadius - 8);
      ctx.restore();
    }
  }

  private drawRemovingElement(cell: CellState): void {
    if (!cell.elementId) return;

    const ctx = this.ctx;
    const info = this.rules.getElementInfo(cell.elementId);
    if (!info) return;

    const pos = this.hexToPixel(cell.coord.q, cell.coord.r);
    const size = this.hexSize;
    const radius = size * 0.55;
    const elapsed = (performance.now() / 1000 - cell.removeStartTime) / 0.2;
    const scale = Math.max(0, 1 - elapsed);
    const actualRadius = radius * scale;

    if (actualRadius <= 0) return;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = scale;

    const sphereGrad = ctx.createRadialGradient(-actualRadius * 0.3, -actualRadius * 0.3, 0, 0, 0, actualRadius);
    sphereGrad.addColorStop(0, info.color2);
    sphereGrad.addColorStop(0.7, info.color1);
    sphereGrad.addColorStop(1, this.darkenColor(info.color1, 0.3));
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, actualRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawDragElement(): void {
    if (!this.drag.elementId) return;

    const ctx = this.ctx;
    const info = this.rules.getElementInfo(this.drag.elementId);
    if (!info) return;

    const radius = this.hexSize * 0.55;

    ctx.save();
    ctx.translate(this.drag.screenX, this.drag.screenY);
    ctx.globalAlpha = 0.85;

    const pulsePhase = (this.pulseTime % 2) / 2;
    const pulseScale = 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.08;

    const glowRadius = radius * 1.5 * pulseScale;
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glowGrad.addColorStop(0, this.hexToRgba(info.color1, 0.4));
    glowGrad.addColorStop(0.5, this.hexToRgba(info.color2, 0.2));
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const sphereGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    sphereGrad.addColorStop(0, info.color2);
    sphereGrad.addColorStop(0.7, info.color1);
    sphereGrad.addColorStop(1, this.darkenColor(info.color1, 0.3));
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSynthesisResult(): void {
    if (!this.synthesis.resultCell || !this.synthesis.resultElementId) return;

    const ctx = this.ctx;
    const info = this.rules.getElementInfo(this.synthesis.resultElementId);
    if (!info) return;

    const pos = this.hexToPixel(this.synthesis.resultCell.q, this.synthesis.resultCell.r);
    const progress = this.synthesis.animationProgress;
    const size = this.hexSize;
    const baseRadius = size * 0.55 * 1.2;

    const easedProgress = this.easeOutBack(progress);
    const currentRadius = baseRadius * easedProgress;
    const floatY = -size * 0.3 * progress;

    ctx.save();
    ctx.translate(pos.x, pos.y + floatY);
    ctx.globalAlpha = Math.min(1, progress * 2);

    const pulseScale = 1 + Math.sin(progress * Math.PI * 4) * 0.1 * (1 - progress);
    const glowRadius = currentRadius * 2 * pulseScale;
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glowGrad.addColorStop(0, this.hexToRgba(info.color1, 0.6));
    glowGrad.addColorStop(0.5, this.hexToRgba(info.color2, 0.3));
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const sphereGrad = ctx.createRadialGradient(-currentRadius * 0.3, -currentRadius * 0.3, 0, 0, 0, currentRadius);
    sphereGrad.addColorStop(0, info.color2);
    sphereGrad.addColorStop(0.7, info.color1);
    sphereGrad.addColorStop(1, this.darkenColor(info.color1, 0.3));
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSelectedCell(): void {
    if (!this.synthesis.selectedCell) return;

    const ctx = this.ctx;
    const cell = this.getCell(this.synthesis.selectedCell);
    if (!cell) return;

    const pos = this.hexToPixel(cell.coord.q, cell.coord.r);
    const size = this.hexSize * 1.1;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const pulse = Math.sin(this.pulseTime * 4) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = size * Math.cos(angle);
      const py = size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  startDrag(elementId: string, screenX: number, screenY: number): void {
    if (this.lifecycle.getElementCount(elementId) <= 0) return;

    this.drag.isDragging = true;
    this.drag.elementId = elementId;
    this.drag.screenX = screenX;
    this.drag.screenY = screenY;
  }

  updateDragPosition(screenX: number, screenY: number): void {
    this.drag.screenX = screenX;
    this.drag.screenY = screenY;
  }

  endDrag(hexCoord: HexCoord | null): boolean {
    const elementId = this.drag.elementId;
    this.drag.isDragging = false;
    this.drag.elementId = null;

    if (hexCoord && elementId) {
      const cell = this.getCell(hexCoord);
      if (cell && !cell.elementId && this.lifecycle.consumeElement(elementId)) {
        cell.elementId = elementId;
        cell.isPlacing = true;
        cell.placeStartTime = performance.now() / 1000;
        cell.isHighlighted = true;
        cell.highlightTime = 0;
        return true;
      }
    }
    return false;
  }

  handleCellClick(coord: HexCoord, button: number): void {
    const cell = this.getCell(coord);
    if (!cell) return;

    if (button === 2 && cell.elementId && !cell.isRemoving) {
      this.removeElement(cell);
      return;
    }

    if (button === 0 && this.synthesis.isActive && cell.elementId && !this.synthesis.isAnimating) {
      this.handleSynthesisClick(coord);
    }
  }

  private handleSynthesisClick(coord: HexCoord): void {
    if (!this.synthesis.selectedCell) {
      this.synthesis.selectedCell = coord;
      return;
    }

    const firstCoord = this.synthesis.selectedCell;
    if (firstCoord.q === coord.q && firstCoord.r === coord.r) {
      this.synthesis.selectedCell = null;
      return;
    }

    if (!this.rules.areElementsAdjacent(firstCoord, coord)) {
      const cell1 = this.getCell(firstCoord);
      const cell2 = this.getCell(coord);
      if (cell1) { cell1.isFlashingRed = true; cell1.flashRedTime = 0; cell1.isShaking = true; cell1.shakeTime = 0; }
      if (cell2) { cell2.isFlashingRed = true; cell2.flashRedTime = 0; cell2.isShaking = true; cell2.shakeTime = 0; }
      this.lifecycle.onSynthesisFailed(firstCoord, coord);
      this.synthesis.selectedCell = null;
      return;
    }

    const cell1 = this.getCell(firstCoord);
    const cell2 = this.getCell(coord);
    if (!cell1 || !cell2 || !cell1.elementId || !cell2.elementId) return;

    const result = this.rules.checkSynthesis(cell1.elementId, cell2.elementId);
    if (!result) {
      cell1.isFlashingRed = true;
      cell1.flashRedTime = 0;
      cell1.isShaking = true;
      cell1.shakeTime = 0;
      cell2.isFlashingRed = true;
      cell2.flashRedTime = 0;
      cell2.isShaking = true;
      cell2.shakeTime = 0;
      this.lifecycle.onSynthesisFailed(firstCoord, coord);
      this.synthesis.selectedCell = null;
      return;
    }

    this.startSynthesisAnimation(firstCoord, coord, result);
  }

  private startSynthesisAnimation(cell1Coord: HexCoord, cell2Coord: HexCoord, resultId: string): void {
    const cell1 = this.getCell(cell1Coord);
    const cell2 = this.getCell(cell2Coord);
    if (!cell1 || !cell2) return;

    const midQ = (cell1Coord.q + cell2Coord.q) / 2;
    const midR = (cell1Coord.r + cell2Coord.r) / 2;
    const resultCoord = { q: Math.round(midQ), r: Math.round(midR) };

    cell1.elementId = null;
    cell2.elementId = null;

    this.synthesis.isAnimating = true;
    this.synthesis.resultCell = resultCoord;
    this.synthesis.resultElementId = resultId;
    this.synthesis.animationProgress = 0;
    this.synthesis.selectedCell = null;

    this.lifecycle.onSynthesisSuccess(resultId);
  }

  private finishSynthesisAnimation(): void {
    if (!this.synthesis.resultCell || !this.synthesis.resultElementId) return;

    const cell = this.getCell(this.synthesis.resultCell);
    if (cell && !cell.elementId) {
      cell.elementId = this.synthesis.resultElementId;
      cell.isPlacing = true;
      cell.placeStartTime = performance.now() / 1000;

      if (cell.isMagicCircle) {
        const recipe = this.rules.getMagicCircleRecipe(this.synthesis.resultElementId);
        if (recipe) {
          cell.magicCircleActive = true;
          cell.magicCircleProgress = 0;
          this.lifecycle.onMagicCircleActivated(this.synthesis.resultElementId);
        }
      }
    }

    this.synthesis.isAnimating = false;
    this.synthesis.resultCell = null;
    this.synthesis.resultElementId = null;
    this.synthesis.animationProgress = 0;
  }

  private removeElement(cell: CellState): void {
    if (!cell.elementId) return;

    cell.isRemoving = true;
    cell.removeStartTime = performance.now() / 1000;

    const elementId = cell.elementId;
    setTimeout(() => {
      if (cell.isRemoving && cell.elementId === elementId) {
        cell.elementId = null;
        cell.isRemoving = false;
      }
    }, 200);
  }

  toggleSynthesisMode(): boolean {
    this.synthesis.isActive = !this.synthesis.isActive;
    this.synthesis.selectedCell = null;
    return this.synthesis.isActive;
  }

  isSynthesisModeActive(): boolean {
    return this.synthesis.isActive;
  }

  handleMouseMove(screenX: number, screenY: number): void {
    const coord = this.pixelToHex(screenX, screenY);

    for (const cell of this.cells.values()) {
      cell.isHovered = false;
    }

    if (coord) {
      const cell = this.getCell(coord);
      if (cell) {
        cell.isHovered = true;
      }
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private darkenColor(hex: string, amount: number): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) * (1 - amount));
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) * (1 - amount));
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) * (1 - amount));
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  private easeOutElastic(t: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize.bind(this));
  }
}
