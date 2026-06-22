export interface VertexRow {
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
}

export interface ClayData {
  rows: VertexRow[];
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const CLAY_BASE_COLOR = '#C19A6B';
const CLAY_EDGE_COLOR = '#A0764A';
const BG_COLOR = '#D4B896';
const INITIAL_RADIUS = 120;
const INITIAL_HEIGHT = 160;
const ROW_COUNT = 32;

type ToolMode = 'pinch' | 'stretch';

export class ClayEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rows: VertexRow[] = [];
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastMoveTime = 0;
  private toolMode: ToolMode = 'pinch';
  private brushRadius = 40;
  private frameId: number | null = null;
  private shakeStartTime = 0;
  private shakeIntensity = 0;
  private onDataChange?: (data: ClayData) => void;
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;
  private currentMouseX = 0;
  private currentMouseY = 0;
  private currentSpeed = 0;
  private rippleFadeStart = 0;
  private rippleWasActive = false;
  private isHovering = false;
  private hoverStartTime = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'clayCanvas';
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    container.appendChild(this.canvas);

    this.initClay();
    this.bindEvents();
    this.animate();
  }

  private initClay(): void {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const topY = centerY - INITIAL_HEIGHT / 2;
    const bottomY = centerY + INITIAL_HEIGHT / 2;

    this.rows = [];
    for (let i = 0; i < ROW_COUNT; i++) {
      const t = i / (ROW_COUNT - 1);
      const y = topY + t * (bottomY - topY);
      const edgeFactor = Math.sin(t * Math.PI);
      const radius = INITIAL_RADIUS * (0.92 + 0.08 * edgeFactor);
      this.rows.push({
        y,
        baseRadius: radius,
        currentRadius: radius,
        targetRadius: radius
      });
    }
  }

  private bindEvents(): void {
    const getMousePos = (e: MouseEvent | TouchEvent) => {
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
      const pos = getMousePos(e);
      this.isDragging = true;
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      this.lastMoveTime = performance.now();
      this.currentMouseX = pos.x;
      this.currentMouseY = pos.y;
      this.currentSpeed = 0;
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const pos = getMousePos(e);
      this.currentMouseX = pos.x;
      this.currentMouseY = pos.y;

      if (!this.isHovering) {
        this.isHovering = true;
        this.hoverStartTime = performance.now();
      }

      if (!this.isDragging) return;
      e.preventDefault();
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMoveTime);
      const dx = pos.x - this.lastMouseX;
      const dy = pos.y - this.lastMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      this.currentSpeed = speed;
      this.applyDeformation(pos.x, pos.y, speed);
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      this.lastMoveTime = now;
      this.shakeStartTime = now;
      this.shakeIntensity = Math.min(1, speed * 2);
    };

    const onUp = () => {
      if (this.isDragging) {
        this.rippleFadeStart = performance.now();
        this.rippleWasActive = true;
      }
      this.isDragging = false;
      this.currentSpeed = 0;
      this.notifyDataChange();
    };

    this.canvas.addEventListener('mousedown', onDown);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.canvas.addEventListener('touchstart', onDown, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onUp);

    this.canvas.addEventListener('mouseleave', () => {
      this.isHovering = false;
    });
  }

  private applyDeformation(mouseX: number, mouseY: number, speed: number): void {
    const baseForce = this.toolMode === 'pinch' ? -1 : 1;
    const pressureMultiplier = 0.5 + speed * 4;
    const maxDeform = 35 * pressureMultiplier;
    const centerX = CANVAS_WIDTH / 2;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const dx = mouseX - centerX;
      const dy = mouseY - row.y;
      const distToCenter = Math.sqrt(dx * dx + dy * dy);

      const leftSurfaceX = centerX - row.currentRadius;
      const rightSurfaceX = centerX + row.currentRadius;
      const distToLeft = Math.sqrt((mouseX - leftSurfaceX) ** 2 + (mouseY - row.y) ** 2);
      const distToRight = Math.sqrt((mouseX - rightSurfaceX) ** 2 + (mouseY - row.y) ** 2);
      const minSurfaceDist = Math.min(distToLeft, distToRight);

      const falloff = Math.max(0, 1 - minSurfaceDist / this.brushRadius);
      if (falloff <= 0) continue;

      const deformAmount = baseForce * maxDeform * falloff * falloff;
      let newRadius = row.currentRadius + deformAmount;
      newRadius = Math.max(30, Math.min(INITIAL_RADIUS * 1.4, newRadius));
      row.targetRadius = newRadius;
    }
  }

  private drawShakeOffset(): { x: number; y: number } {
    const elapsed = performance.now() - this.shakeStartTime;
    const duration = 300;
    if (elapsed >= duration) return { x: 0, y: 0 };
    const t = 1 - elapsed / duration;
    const intensity = this.shakeIntensity * t;
    return {
      x: (Math.random() - 0.5) * 3 * intensity,
      y: (Math.random() - 0.5) * 3 * intensity
    };
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 500) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    const shake = this.drawShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    const centerX = CANVAS_WIDTH / 2;
    const lerpFactor = 0.25;
    for (const row of this.rows) {
      row.currentRadius += (row.targetRadius - row.currentRadius) * lerpFactor;
    }

    this.drawBody(ctx, centerX);
    this.drawHighlight(ctx, centerX);
    this.drawEdgeLines(ctx, centerX);
    this.drawRipple(ctx);
    ctx.restore();
    this.drawToolIndicator(ctx);
  }

  private drawBody(ctx: CanvasRenderingContext2D, centerX: number): void {
    const grad = ctx.createLinearGradient(centerX - INITIAL_RADIUS, 0, centerX + INITIAL_RADIUS, 0);
    grad.addColorStop(0, CLAY_EDGE_COLOR);
    grad.addColorStop(0.25, CLAY_BASE_COLOR);
    grad.addColorStop(0.5, '#D4A574');
    grad.addColorStop(0.75, CLAY_BASE_COLOR);
    grad.addColorStop(1, CLAY_EDGE_COLOR);

    ctx.fillStyle = grad;
    ctx.beginPath();

    ctx.moveTo(centerX - this.rows[0].currentRadius, this.rows[0].y);
    for (let i = 1; i < this.rows.length; i++) {
      const row = this.rows[i];
      const prevRow = this.rows[i - 1];
      const cpx = centerX - (prevRow.currentRadius + row.currentRadius) / 2;
      const cpy = (prevRow.y + row.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX - row.currentRadius, row.y);
    }

    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i];
      const nextRow = this.rows[Math.min(i + 1, this.rows.length - 1)];
      const cpx = centerX + (row.currentRadius + nextRow.currentRadius) / 2;
      const cpy = (row.y + nextRow.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX + row.currentRadius, row.y);
    }
    ctx.closePath();
    ctx.fill();

    const topRow = this.rows[0];
    const ellipseGrad = ctx.createRadialGradient(
      centerX, topRow.y - 2, 0,
      centerX, topRow.y, topRow.currentRadius
    );
    ellipseGrad.addColorStop(0, '#E8C99B');
    ellipseGrad.addColorStop(0.7, '#CBA87E');
    ellipseGrad.addColorStop(1, CLAY_EDGE_COLOR);

    ctx.fillStyle = ellipseGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, topRow.y, topRow.currentRadius, topRow.currentRadius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHighlight(ctx: CanvasRenderingContext2D, centerX: number): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - this.rows[0].currentRadius, this.rows[0].y);
    for (let i = 1; i < this.rows.length; i++) {
      const row = this.rows[i];
      const prevRow = this.rows[i - 1];
      const cpx = centerX - (prevRow.currentRadius + row.currentRadius) / 2;
      const cpy = (prevRow.y + row.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX - row.currentRadius, row.y);
    }
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i];
      const nextRow = this.rows[Math.min(i + 1, this.rows.length - 1)];
      const cpx = centerX + (row.currentRadius + nextRow.currentRadius) / 2;
      const cpy = (row.y + nextRow.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX + row.currentRadius, row.y);
    }
    ctx.closePath();
    ctx.clip();

    const highlightGrad = ctx.createLinearGradient(centerX - 80, 0, centerX + 20, 0);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.4, 'rgba(255,240,210,0.35)');
    highlightGrad.addColorStop(0.55, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = highlightGrad;
    ctx.fillRect(centerX - INITIAL_RADIUS - 20, this.rows[0].y - 20, INITIAL_RADIUS * 2 + 40, INITIAL_HEIGHT + 40);

    const shadowGrad = ctx.createLinearGradient(centerX + 20, 0, centerX + INITIAL_RADIUS, 0);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(80,50,20,0.15)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(centerX - INITIAL_RADIUS - 20, this.rows[0].y - 20, INITIAL_RADIUS * 2 + 40, INITIAL_HEIGHT + 40);

    ctx.restore();
  }

  private drawEdgeLines(ctx: CanvasRenderingContext2D, centerX: number): void {
    const avgRadius = this.rows.reduce((s, r) => s + r.currentRadius, 0) / this.rows.length;
    const deformation = Math.abs(avgRadius - INITIAL_RADIUS) / INITIAL_RADIUS;
    if (deformation < 0.08) return;

    const edgeAlpha = Math.min(0.5, deformation * 2);
    ctx.strokeStyle = `rgba(120, 75, 40, ${edgeAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    ctx.moveTo(centerX - this.rows[0].currentRadius, this.rows[0].y);
    for (let i = 1; i < this.rows.length; i++) {
      const row = this.rows[i];
      const prevRow = this.rows[i - 1];
      const cpx = centerX - (prevRow.currentRadius + row.currentRadius) / 2;
      const cpy = (prevRow.y + row.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX - row.currentRadius, row.y);
    }
    for (let i = this.rows.length - 1; i >= 0; i--) {
      const row = this.rows[i];
      const nextRow = this.rows[Math.min(i + 1, this.rows.length - 1)];
      const cpx = centerX + (row.currentRadius + nextRow.currentRadius) / 2;
      const cpy = (row.y + nextRow.y) / 2;
      ctx.quadraticCurveTo(cpx, cpy, centerX + row.currentRadius, row.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private drawRipple(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    let alpha = 0;
    let radius = 0;
    const speedFactor = Math.min(1, this.currentSpeed * 3);

    if (this.isDragging && speedFactor > 0.02) {
      alpha = 0.15 + speedFactor * 0.35;
      radius = this.brushRadius * 0.6 + speedFactor * this.brushRadius * 1.2;
      this.rippleWasActive = true;
    } else if (this.rippleWasActive && this.rippleFadeStart > 0) {
      const fadeElapsed = now - this.rippleFadeStart;
      const fadeDuration = 200;
      if (fadeElapsed < fadeDuration) {
        const fadeT = 1 - fadeElapsed / fadeDuration;
        alpha = fadeT * 0.3;
        radius = (this.brushRadius * 0.6 + this.brushRadius * 1.2) + fadeElapsed * 0.15;
      } else {
        this.rippleWasActive = false;
        this.rippleFadeStart = 0;
        return;
      }
    } else {
      return;
    }

    if (alpha <= 0.01 || radius <= 1) return;

    const x = this.currentMouseX;
    const y = this.currentMouseY;
    const safeRadius = Math.max(1, radius);

    const rippleGrad = ctx.createRadialGradient(x, y, 0, x, y, safeRadius);
    rippleGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
    rippleGrad.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.35})`);
    rippleGrad.addColorStop(0.6, `rgba(255, 255, 255, ${alpha * 0.15})`);
    rippleGrad.addColorStop(0.85, `rgba(255, 255, 255, ${alpha * 0.05})`);
    rippleGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.fillStyle = rippleGrad;
    ctx.beginPath();
    ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
    ctx.fill();

    if (this.isDragging && speedFactor > 0.05) {
      const ringAlpha = alpha * 0.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, safeRadius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      if (speedFactor > 0.3) {
        const outerRingAlpha = alpha * 0.25;
        ctx.strokeStyle = `rgba(255, 255, 255, ${outerRingAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, safeRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawToolIndicator(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    const hoverElapsed = this.isHovering ? now - this.hoverStartTime : 0;
    const indicatorVisible = this.isHovering && hoverElapsed > 300;
    if (!indicatorVisible && !this.isDragging) return;

    let alpha: number;
    if (this.isDragging) {
      alpha = 0.85;
    } else if (indicatorVisible) {
      const fadeIn = Math.min(1, (hoverElapsed - 300) / 200);
      alpha = fadeIn * 0.75;
    } else {
      return;
    }

    const isPinch = this.toolMode === 'pinch';
    const icon = isPinch ? '✋' : '👐';
    const label = isPinch ? '挤压' : '拉伸';
    const accentColor = isPinch ? 'rgba(212, 139, 76,' : 'rgba(90, 158, 111,';

    const padding = 10;
    const iconSize = 16;
    const fontSize = 13;
    const barWidth = 30;
    const barHeight = 4;
    const totalWidth = iconSize + 6 + fontSize * 2.2 + 8 + barWidth + padding * 2;
    const totalHeight = iconSize + padding * 2 + barHeight + 6;
    const x = 14;
    const y = CANVAS_HEIGHT - totalHeight - 14;

    ctx.save();
    ctx.globalAlpha = alpha;

    const cornerRadius = 10;
    ctx.fillStyle = `rgba(60, 40, 25, 0.55)`;
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + totalWidth - cornerRadius, y);
    ctx.quadraticCurveTo(x + totalWidth, y, x + totalWidth, y + cornerRadius);
    ctx.lineTo(x + totalWidth, y + totalHeight - cornerRadius);
    ctx.quadraticCurveTo(x + totalWidth, y + totalHeight, x + totalWidth - cornerRadius, y + totalHeight);
    ctx.lineTo(x + cornerRadius, y + totalHeight);
    ctx.quadraticCurveTo(x, y + totalHeight, x, y + totalHeight - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `${accentColor}0.4)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `${iconSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(icon, x + padding, y + padding + iconSize / 2 - 3);

    ctx.font = `600 ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(label, x + padding + iconSize + 6, y + padding + iconSize / 2 - 3);

    const barX = x + padding + iconSize + 6 + fontSize * 2.2 + 2;
    const barY = y + padding + iconSize / 2 - barHeight / 2 - 3;
    const safeBarW = Math.max(1, barWidth);
    const safeBarH = Math.max(1, barHeight);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, safeBarW, safeBarH, 2);
    ctx.fill();

    const speedFill = Math.min(1, this.currentSpeed * 3);
    const fillW = Math.max(1, safeBarW * speedFill);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + safeBarW, 0);
    fillGrad.addColorStop(0, `${accentColor}0.9)`);
    fillGrad.addColorStop(1, `${accentColor}0.5)`);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, safeBarH, 2);
    ctx.fill();

    ctx.restore();
  }

  private animate = (): void => {
    this.draw();
    this.frameId = requestAnimationFrame(this.animate);
  };

  setToolMode(mode: ToolMode): void {
    this.toolMode = mode;
  }

  setBrushRadius(radius: number): void {
    this.brushRadius = radius;
  }

  reset(): void {
    this.initClay();
    this.notifyDataChange();
  }

  getData(): ClayData {
    return {
      rows: this.rows.map(r => ({ ...r })),
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      centerX: CANVAS_WIDTH / 2,
      centerY: CANVAS_HEIGHT / 2
    };
  }

  setOnDataChange(callback: (data: ClayData) => void): void {
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
