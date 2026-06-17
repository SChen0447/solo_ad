import { LevelManager, LevelElement, ElementType, ELEMENT_CONFIGS } from './level';
import { PathResult } from './pathfinder';

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  targetScale: number;
  targetOffsetX: number;
  targetOffsetY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}

export interface DragPreview {
  type: ElementType | null;
  gridX: number;
  gridY: number;
  visible: boolean;
}

export interface SnapMarker {
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  visible: boolean;
}

export interface PulseAnimation {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  active: boolean;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelManager;
  private viewport: Viewport;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private gridDirty: boolean = true;

  constructor(canvas: HTMLCanvasElement, level: LevelManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.level = level;
    this.viewport = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      targetScale: 1,
      targetOffsetX: 0,
      targetOffsetY: 0
    };
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.gridDirty = true;
  }

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  setViewport(viewport: Partial<Viewport>): void {
    Object.assign(this.viewport, viewport);
    this.gridDirty = true;
  }

  smoothZoom(targetScale: number, centerX: number, centerY: number): void {
    const clampedScale = Math.max(0.5, Math.min(3, targetScale));
    const worldX = (centerX - this.viewport.offsetX) / this.viewport.scale;
    const worldY = (centerY - this.viewport.offsetY) / this.viewport.scale;
    
    this.viewport.targetScale = clampedScale;
    this.viewport.targetOffsetX = centerX - worldX * clampedScale;
    this.viewport.targetOffsetY = centerY - worldY * clampedScale;
  }

  setTargetOffset(offsetX: number, offsetY: number): void {
    this.viewport.targetOffsetX = offsetX;
    this.viewport.targetOffsetY = offsetY;
  }

  updateViewport(deltaTime: number): void {
    const lerpFactor = 1 - Math.pow(0.001, deltaTime / 1000);
    this.viewport.scale += (this.viewport.targetScale - this.viewport.scale) * lerpFactor;
    this.viewport.offsetX += (this.viewport.targetOffsetX - this.viewport.offsetX) * lerpFactor;
    this.viewport.offsetY += (this.viewport.targetOffsetY - this.viewport.offsetY) * lerpFactor;
    
    if (Math.abs(this.viewport.scale - this.viewport.targetScale) > 0.001 ||
        Math.abs(this.viewport.offsetX - this.viewport.targetOffsetX) > 0.1 ||
        Math.abs(this.viewport.offsetY - this.viewport.targetOffsetY) > 0.1) {
      this.gridDirty = true;
    }
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewport.offsetX) / this.viewport.scale,
      y: (screenY - this.viewport.offsetY) / this.viewport.scale
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.viewport.scale + this.viewport.offsetX,
      y: worldY * this.viewport.scale + this.viewport.offsetY
    };
  }

  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const gridSize = this.level.getGridSize();
    const world = this.screenToWorld(screenX, screenY);
    return {
      x: Math.floor(world.x / gridSize),
      y: Math.floor(world.y / gridSize)
    };
  }

  private renderGrid(): void {
    const gridSize = this.level.getGridSize() * this.viewport.scale;
    const { width, height } = this.canvas.getBoundingClientRect();
    
    this.offscreenCtx.clearRect(0, 0, width, height);
    
    const gradient = this.offscreenCtx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#E8F8F5');
    gradient.addColorStop(1, '#D1F2EB');
    this.offscreenCtx.fillStyle = gradient;
    this.offscreenCtx.fillRect(0, 0, width, height);

    const startX = -(this.viewport.offsetX % gridSize);
    const startY = -(this.viewport.offsetY % gridSize);

    this.offscreenCtx.strokeStyle = '#2C3E50';
    this.offscreenCtx.lineWidth = 0.5;

    for (let x = startX; x < width; x += gridSize) {
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(x, 0);
      this.offscreenCtx.lineTo(x, height);
      this.offscreenCtx.stroke();
    }

    for (let y = startY; y < height; y += gridSize) {
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(0, y);
      this.offscreenCtx.lineTo(width, y);
      this.offscreenCtx.stroke();
    }

    const levelDims = this.level.getDimensions();
    const levelWidth = levelDims.width * this.level.getGridSize() * this.viewport.scale;
    const levelHeight = levelDims.height * this.level.getGridSize() * this.viewport.scale;
    const borderX = this.viewport.offsetX;
    const borderY = this.viewport.offsetY;

    this.offscreenCtx.strokeStyle = '#2C3E50';
    this.offscreenCtx.lineWidth = 2;
    this.offscreenCtx.strokeRect(borderX, borderY, levelWidth, levelHeight);

    this.gridDirty = false;
  }

  private drawElementShape(ctx: CanvasRenderingContext2D, element: LevelElement, x: number, y: number, w: number, h: number, alpha: number = 1): void {
    const config = ELEMENT_CONFIGS[element.type];
    ctx.save();
    ctx.globalAlpha = alpha;

    const centerX = x + w / 2;
    const centerY = y + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    ctx.fillStyle = config.color;

    switch (element.type) {
      case ElementType.GROUND:
      case ElementType.MOVING_PLATFORM:
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = this.darkenColor(config.color, 20);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        break;

      case ElementType.SPIKE:
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
        ctx.fill();
        break;

      case ElementType.SPRING:
        ctx.fillRect(x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.7);
        ctx.fillStyle = this.lightenColor(config.color, 20);
        ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.3);
        break;

      case ElementType.PORTAL:
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.lightenColor(config.color, 30);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 3, h / 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case ElementType.COIN:
        this.drawStar(ctx, x + w / 2, y + h / 2, 5, w / 2, w / 4, config.color);
        break;

      case ElementType.FLAG:
        ctx.fillStyle = '#7F8C8D';
        ctx.fillRect(x + w * 0.35, y, w * 0.3, h);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.65, y);
        ctx.lineTo(x + w * 1.2, y + h * 0.2);
        ctx.lineTo(x + w * 0.65, y + h * 0.4);
        ctx.closePath();
        ctx.fill();
        break;

      case ElementType.HIDDEN_BLOCK:
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillRect(x, y, w, h);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        break;
    }

    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number, color: string): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.darkenColor(color, 20);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min((num >> 16) + amt, 255);
    const G = Math.min(((num >> 8) & 0x00FF) + amt, 255);
    const B = Math.min((num & 0x0000FF) + amt, 255);
    return `rgb(${R}, ${G}, ${B})`;
  }

  render(
    pathResult: PathResult | null,
    selectionBox: SelectionBox,
    dragPreview: DragPreview,
    snapMarker: SnapMarker,
    pulseAnimation: PulseAnimation,
    mousePos: { x: number; y: number } | null,
    showMask: boolean
  ): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (this.gridDirty) {
      this.renderGrid();
    }

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, width, height);

    const gridSize = this.level.getGridSize() * this.viewport.scale;

    if (showMask && pathResult) {
      this.renderMask(pathResult);
    }

    const elements = this.level.getElements();
    const selectedIds = this.level.getSelectedIds();

    for (const element of elements) {
      const screenPos = this.worldToScreen(element.x * this.level.getGridSize(), element.y * this.level.getGridSize());
      const w = element.width * gridSize;
      const h = element.height * gridSize;

      if (selectedIds.includes(element.id)) {
        this.ctx.save();
        this.ctx.strokeStyle = '#F1C40F';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(screenPos.x - 2, screenPos.y - 2, w + 4, h + 4);
        this.ctx.restore();
      }

      this.drawElementShape(this.ctx, element, screenPos.x, screenPos.y, w, h);
    }

    this.renderStartEndMarkers();

    if (selectionBox.active) {
      this.renderSelectionBox(selectionBox);
    }

    if (dragPreview.visible && dragPreview.type !== null) {
      this.renderDragPreview(dragPreview);
    }

    if (snapMarker.visible) {
      this.renderSnapMarker(snapMarker);
    }

    if (pulseAnimation.active) {
      this.renderPulseAnimation(pulseAnimation);
    }

    if (mousePos) {
      this.renderCrosshair(mousePos.x, mousePos.y);
    }

    if (pathResult && showMask) {
      this.renderPathResultInfo(pathResult);
    }
  }

  private renderMask(pathResult: PathResult): void {
    const gridSize = this.level.getGridSize() * this.viewport.scale;
    const { reachable } = pathResult;

    for (let y = 0; y < reachable.length; y++) {
      for (let x = 0; x < reachable[y].length; x++) {
        if (!reachable[y][x]) {
          const collisionGrid = this.level.getCollisionGrid();
          if (!collisionGrid[y]?.[x]) {
            const screenPos = this.worldToScreen(x * this.level.getGridSize(), y * this.level.getGridSize());
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
            this.ctx.fillRect(screenPos.x, screenPos.y, gridSize, gridSize);
          }
        }
      }
    }

    if (pathResult.endReachable) {
      this.ctx.fillStyle = 'rgba(39, 174, 96, 0.15)';
      const dims = this.level.getDimensions();
      const levelWidth = dims.width * this.level.getGridSize() * this.viewport.scale;
      const levelHeight = dims.height * this.level.getGridSize() * this.viewport.scale;
      this.ctx.fillRect(this.viewport.offsetX, this.viewport.offsetY, levelWidth, levelHeight);
    }
  }

  private renderStartEndMarkers(): void {
    const gridSize = this.level.getGridSize() * this.viewport.scale;
    const startPos = this.level.getStartPos();
    const endPos = this.level.getEndPos();

    const startScreen = this.worldToScreen(startPos.x * this.level.getGridSize(), startPos.y * this.level.getGridSize());
    this.ctx.fillStyle = 'rgba(39, 174, 96, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(startScreen.x + gridSize / 2, startScreen.y + gridSize / 2, gridSize * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFF';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('S', startScreen.x + gridSize / 2, startScreen.y + gridSize / 2);

    const endScreen = this.worldToScreen(endPos.x * this.level.getGridSize(), endPos.y * this.level.getGridSize());
    this.ctx.fillStyle = 'rgba(231, 76, 60, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(endScreen.x + gridSize / 2, endScreen.y + gridSize / 2, gridSize * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFF';
    this.ctx.fillText('E', endScreen.x + gridSize / 2, endScreen.y + gridSize / 2);
  }

  private renderSelectionBox(selectionBox: SelectionBox): void {
    const startScreen = this.worldToScreen(
      selectionBox.startX * this.level.getGridSize(),
      selectionBox.startY * this.level.getGridSize()
    );
    const endScreen = this.worldToScreen(
      selectionBox.endX * this.level.getGridSize(),
      selectionBox.endY * this.level.getGridSize()
    );

    const x = Math.min(startScreen.x, endScreen.x);
    const y = Math.min(startScreen.y, endScreen.y);
    const w = Math.abs(endScreen.x - startScreen.x);
    const h = Math.abs(endScreen.y - startScreen.y);

    this.ctx.save();
    this.ctx.strokeStyle = '#3498DB';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = 'rgba(52, 152, 219, 0.1)';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.restore();
  }

  private renderDragPreview(dragPreview: DragPreview): void {
    if (!dragPreview.type) return;

    const config = ELEMENT_CONFIGS[dragPreview.type];
    const gridSize = this.level.getGridSize() * this.viewport.scale;
    const screenPos = this.worldToScreen(
      dragPreview.gridX * this.level.getGridSize(),
      dragPreview.gridY * this.level.getGridSize()
    );

    const tempElement: LevelElement = {
      id: 'preview',
      type: dragPreview.type,
      x: dragPreview.gridX,
      y: dragPreview.gridY,
      width: config.defaultWidth,
      height: config.defaultHeight,
      rotation: 0,
      passable: config.passable
    };

    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    this.drawElementShape(
      this.ctx,
      tempElement,
      screenPos.x,
      screenPos.y,
      config.defaultWidth * gridSize,
      config.defaultHeight * gridSize,
      0.5
    );
    this.ctx.restore();
  }

  private renderSnapMarker(snapMarker: SnapMarker): void {
    const elapsed = Date.now() - snapMarker.startTime;
    if (elapsed > 200) return;

    const alpha = 1 - elapsed / 200;
    const gridSize = this.level.getGridSize() * this.viewport.scale;
    const screenPos = this.worldToScreen(snapMarker.x, snapMarker.y);

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = '#3498DB';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeRect(
      screenPos.x,
      screenPos.y,
      snapMarker.width * gridSize,
      snapMarker.height * gridSize
    );
    this.ctx.restore();
  }

  private renderPulseAnimation(pulseAnimation: PulseAnimation): void {
    const elapsed = Date.now() - pulseAnimation.startTime;
    if (elapsed > pulseAnimation.duration) return;

    const progress = elapsed / pulseAnimation.duration;
    const alpha = 1 - progress;
    const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.5;
    const radius = maxRadius * progress;

    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.5;
    this.ctx.strokeStyle = '#27AE60';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(pulseAnimation.x, pulseAnimation.y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderCrosshair(x: number, y: number): void {
    const size = 10;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(44, 62, 80, 0.8)';
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - size, y);
    this.ctx.lineTo(x + size, y);
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x, y + size);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderPathResultInfo(pathResult: PathResult): void {
    const padding = 16;
    const boxWidth = 180;
    const boxHeight = 80;
    const x = this.canvas.getBoundingClientRect().width - boxWidth - padding;
    const y = padding;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, boxWidth, boxHeight, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFF';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('路径检测结果', x + 12, y + 24);

    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = pathResult.endReachable ? '#27AE60' : '#E74C3C';
    this.ctx.fillText(`通关概率: ${pathResult.passRate}%`, x + 12, y + 46);

    this.ctx.fillStyle = '#FFF';
    if (pathResult.endReachable && pathResult.shortestJumps >= 0) {
      this.ctx.fillText(`最短跳跃次数: ${pathResult.shortestJumps}`, x + 12, y + 66);
    } else {
      this.ctx.fillStyle = '#E74C3C';
      this.ctx.fillText('终点不可达', x + 12, y + 66);
    }
    this.ctx.restore();
  }
}
