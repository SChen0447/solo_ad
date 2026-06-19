import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  userId: string;
  createdAt: number;
  glowProgress: number;
  isComplete: boolean;
}

export interface ImageItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: HTMLImageElement;
  label: string;
  userId: string;
}

export interface BrushSettings {
  color: string;
  width: number;
  opacity: number;
}

type ToolType = 'brush' | 'select' | 'pan';

export class CanvasCore {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private targetScale: number = 1;
  private targetOffsetX: number = 0;
  private targetOffsetY: number = 0;
  private minScale: number = 0.25;
  private maxScale: number = 4;

  private paths: Map<string, Path> = new Map();
  private images: Map<string, ImageItem> = new Map();

  private isPanning: boolean = false;
  private isDrawing: boolean = false;
  private isSpacePressed: boolean = false;
  private lastPanPoint: Point | null = null;
  private currentPathId: string | null = null;

  private brushSettings: BrushSettings = {
    color: '#0ea5e9',
    width: 3,
    opacity: 1,
  };

  private currentTool: ToolType = 'brush';
  private userId: string;

  private animationFrameId: number | null = null;
  private listeners: Set<() => void> = new Set();
  private activePaths: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, userId: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.userId = userId;
    this.resize();
    this.bindEvents();
    this.startRenderLoop();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public destroy(): void {
    window.removeEventListener('resize', () => this.resize());
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && !this.isSpacePressed) {
      this.isSpacePressed = true;
      this.canvas.style.cursor = 'grab';
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space') {
      this.isSpacePressed = false;
      this.canvas.style.cursor = this.currentTool === 'brush' ? 'crosshair' : 'default';
    }
  };

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.offsetX) / this.scale;
    const y = (clientY - rect.top - this.offsetY) / this.scale;
    return { x, y };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const point = this.getCanvasPoint(e.clientX, e.clientY);

    if (this.isSpacePressed || this.currentTool === 'pan') {
      this.isPanning = true;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.currentTool === 'brush') {
      this.isDrawing = true;
      const pathId = uuidv4();
      this.currentPathId = pathId;
      const path: Path = {
        id: pathId,
        points: [point],
        color: this.brushSettings.color,
        width: this.brushSettings.width,
        opacity: this.brushSettings.opacity,
        userId: this.userId,
        createdAt: Date.now(),
        glowProgress: 0,
        isComplete: false,
      };
      this.paths.set(pathId, path);
      this.activePaths.add(pathId);
      this.notifyListeners();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isPanning && this.lastPanPoint) {
      const dx = e.clientX - this.lastPanPoint.x;
      const dy = e.clientY - this.lastPanPoint.y;
      this.offsetX += dx;
      this.offsetY += dy;
      this.targetOffsetX = this.offsetX;
      this.targetOffsetY = this.offsetY;
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.isDrawing && this.currentPathId) {
      const point = this.getCanvasPoint(e.clientX, e.clientY);
      const path = this.paths.get(this.currentPathId);
      if (path) {
        path.points.push(point);
        this.notifyListeners();
      }
    }
  };

  private handleMouseUp = (): void => {
    if (this.isPanning) {
      this.isPanning = false;
      this.lastPanPoint = null;
      this.canvas.style.cursor = this.isSpacePressed ? 'grab' : 'crosshair';
    }

    if (this.isDrawing && this.currentPathId) {
      const path = this.paths.get(this.currentPathId);
      if (path) {
        path.isComplete = true;
        path.glowProgress = 0;
      }
      this.isDrawing = false;
      this.currentPathId = null;
      this.notifyListeners();
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.offsetX) / this.scale;
    const worldY = (mouseY - this.offsetY) / this.scale;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));

    const newOffsetX = mouseX - worldX * newScale;
    const newOffsetY = mouseY - worldY * newScale;

    this.targetScale = newScale;
    this.targetOffsetX = newOffsetX;
    this.targetOffsetY = newOffsetY;

    this.notifyListeners();
  };

  private startRenderLoop(): void {
    const render = () => {
      this.updateViewTransform();
      this.updateAnimations();
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  private updateViewTransform(): void {
    const scaleLerp = 0.25;
    const offsetLerp = 0.25;

    const scaleDiff = this.targetScale - this.scale;
    if (Math.abs(scaleDiff) > 0.001) {
      this.scale += scaleDiff * scaleLerp;
    } else {
      this.scale = this.targetScale;
    }

    const offsetXDiff = this.targetOffsetX - this.offsetX;
    if (Math.abs(offsetXDiff) > 0.1) {
      this.offsetX += offsetXDiff * offsetLerp;
    } else {
      this.offsetX = this.targetOffsetX;
    }

    const offsetYDiff = this.targetOffsetY - this.offsetY;
    if (Math.abs(offsetYDiff) > 0.1) {
      this.offsetY += offsetYDiff * offsetLerp;
    } else {
      this.offsetY = this.targetOffsetY;
    }
  }

  private updateAnimations(): void {
    let needsUpdate = false;
    const glowFrames = 12;

    for (const pathId of this.activePaths) {
      const path = this.paths.get(pathId);
      if (path && path.isComplete) {
        path.glowProgress += 1 / glowFrames;
        if (path.glowProgress >= 1) {
          path.glowProgress = 1;
          this.activePaths.delete(pathId);
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.notifyListeners();
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);
    this.drawGrid(width, height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawImages();
    this.drawPaths();

    ctx.restore();
  }

  private drawGrid(width: number, height: number): void {
    const ctx = this.ctx;

    const gridSize = 50 * this.scale;
    const offsetX = ((this.offsetX % gridSize) + gridSize) % gridSize;
    const offsetY = ((this.offsetY % gridSize) + gridSize) % gridSize;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = offsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawPaths(): void {
    const ctx = this.ctx;

    for (const path of this.paths.values()) {
      if (path.points.length < 2) continue;

      ctx.save();
      ctx.globalAlpha = path.opacity;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);

      for (let i = 1; i < path.points.length; i++) {
        const xc = (path.points[i].x + path.points[i - 1].x) / 2;
        const yc = (path.points[i].y + path.points[i - 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i - 1].x, path.points[i - 1].y, xc, yc);
      }

      ctx.stroke();

      if (path.isComplete && path.glowProgress < 1) {
        const t = path.glowProgress;

        const totalLength = this.getPathLength(path.points);
        const glowHeadLength = Math.min(totalLength * 0.2, 80);
        const currentHead = totalLength * t;
        const currentTail = Math.max(0, currentHead - glowHeadLength);
        let drawnLength = 0;

        for (let layer = 0; layer < 3; layer++) {
          ctx.save();
          const layerIntensity = (1 - t) * (1 - layer * 0.25);
          ctx.globalAlpha = layerIntensity * (0.9 - layer * 0.2);
          ctx.shadowColor = path.color;
          ctx.shadowBlur = (35 - layer * 8) * (1 - t * 0.5);
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width * (1.0 - layer * 0.2);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          let isDrawing = false;
          let subStart: Point | null = null;
          drawnLength = 0;

          ctx.beginPath();

          for (let i = 1; i < path.points.length; i++) {
            const prev = path.points[i - 1];
            const curr = path.points[i];
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const segLength = Math.sqrt(dx * dx + dy * dy);

            const segStart = drawnLength;
            const segEnd = drawnLength + segLength;

            if (segEnd < currentTail || segStart > currentHead) {
              drawnLength += segLength;
              continue;
            }

            const localTail = Math.max(0, currentTail - segStart);
            const localHead = Math.min(segLength, currentHead - segStart);

            const tailRatio = localTail / segLength;
            const headRatio = localHead / segLength;

            const tailX = prev.x + dx * tailRatio;
            const tailY = prev.y + dy * tailRatio;
            const headX = prev.x + dx * headRatio;
            const headY = prev.y + dy * headRatio;

            if (!isDrawing) {
              subStart = { x: tailX, y: tailY };
              ctx.moveTo(tailX, tailY);
              isDrawing = true;
            }

            const xc = (headX + tailX) / 2;
            const yc = (headY + tailY) / 2;
            ctx.quadraticCurveTo(tailX, tailY, xc, yc);
            ctx.lineTo(headX, headY);

            drawnLength += segLength;
          }

          ctx.stroke();

          if (layer === 0 && subStart) {
            const endPoint = this.getPointAtLength(path.points, currentHead);
            if (endPoint) {
              ctx.beginPath();
              const particleSize = path.width * 2.2 * (1 - t * 0.4);
              const gradient = ctx.createRadialGradient(
                endPoint.x, endPoint.y, 0,
                endPoint.x, endPoint.y, particleSize * 2.5
              );
              gradient.addColorStop(0, path.color);
              gradient.addColorStop(0.4, path.color + '99');
              gradient.addColorStop(1, path.color + '00');
              ctx.fillStyle = gradient;
              ctx.globalAlpha = (1 - t);
              ctx.shadowColor = path.color;
              ctx.shadowBlur = 30;
              ctx.arc(endPoint.x, endPoint.y, particleSize * 2.5, 0, Math.PI * 2);
              ctx.fill();

              ctx.beginPath();
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = (1 - t) * 0.95;
              ctx.shadowBlur = 20;
              ctx.arc(endPoint.x, endPoint.y, particleSize * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  private getPointAtLength(points: Point[], targetLength: number): Point | null {
    if (points.length < 2) return points[0] || null;
    let accumulated = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segLen >= targetLength) {
        const remaining = targetLength - accumulated;
        const ratio = segLen > 0 ? remaining / segLen : 0;
        return {
          x: prev.x + dx * ratio,
          y: prev.y + dy * ratio,
        };
      }
      accumulated += segLen;
    }
    return points[points.length - 1];
  }

  private getPathLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private drawImages(): void {
    const ctx = this.ctx;

    for (const img of this.images.values()) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img.image, img.x, img.y, img.width, img.height);
      ctx.restore();

      if (img.label) {
        const labelHeight = 28;
        const labelY = img.y + img.height + 4;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        this.roundRect(ctx, img.x, labelY, img.width, labelHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(img.label, img.x + img.width / 2, labelY + labelHeight / 2);
        ctx.restore();
      }

      this.drawImageHandles(img, ctx);
    }
  }

  private drawImageHandles(img: ImageItem, ctx: CanvasRenderingContext2D): void {
    const handleSize = 10;
    const handleRadius = handleSize / 2;
    const border = 2;

    ctx.save();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(img.x - border, img.y - border, img.width + border * 2, img.height + border * 2);
    ctx.restore();

    const corners = [
      { x: img.x, y: img.y, cursor: 'nw' },
      { x: img.x + img.width, y: img.y, cursor: 'ne' },
      { x: img.x, y: img.y + img.height, cursor: 'sw' },
      { x: img.x + img.width, y: img.y + img.height, cursor: 'se' },
    ];

    for (const corner of corners) {
      ctx.save();

      ctx.beginPath();
      ctx.shadowColor = '#0ea5e9';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#16213e';
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 1.5;
      ctx.arc(corner.x, corner.y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = '#0ea5e9';
      ctx.shadowBlur = 0;
      ctx.arc(corner.x, corner.y, handleRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  public setTool(tool: ToolType): void {
    this.currentTool = tool;
    this.canvas.style.cursor = tool === 'brush' ? 'crosshair' : 'default';
  }

  public getTool(): ToolType {
    return this.currentTool;
  }

  public setBrushSettings(settings: Partial<BrushSettings>): void {
    this.brushSettings = { ...this.brushSettings, ...settings };
  }

  public getBrushSettings(): BrushSettings {
    return { ...this.brushSettings };
  }

  public getScale(): number {
    return this.targetScale;
  }

  public getOffset(): Point {
    return { x: this.offsetX, y: this.offsetY };
  }

  public addImage(imageItem: ImageItem): void {
    this.images.set(imageItem.id, imageItem);
    this.notifyListeners();
  }

  public updateImage(id: string, updates: Partial<ImageItem>): void {
    const img = this.images.get(id);
    if (img) {
      Object.assign(img, updates);
      this.notifyListeners();
    }
  }

  public getImages(): ImageItem[] {
    return Array.from(this.images.values());
  }

  public getImageAtPoint(point: Point): ImageItem | null {
    for (const img of this.images.values()) {
      if (
        point.x >= img.x - 4 &&
        point.x <= img.x + img.width + 4 &&
        point.y >= img.y - 4 &&
        point.y <= img.y + img.height + 4
      ) {
        return img;
      }
    }
    return null;
  }

  public getResizeHandleAtPoint(point: Point): { imageId: string; handle: string } | null {
    const handleSize = 14;
    const half = handleSize / 2;
    for (const img of this.images.values()) {
      const handles = [
        { name: 'nw', cx: img.x, cy: img.y },
        { name: 'ne', cx: img.x + img.width, cy: img.y },
        { name: 'sw', cx: img.x, cy: img.y + img.height },
        { name: 'se', cx: img.x + img.width, cy: img.y + img.height },
      ];
      for (const handle of handles) {
        if (
          point.x >= handle.cx - half &&
          point.x <= handle.cx + half &&
          point.y >= handle.cy - half &&
          point.y <= handle.cy + half
        ) {
          return { imageId: img.id, handle: handle.name };
        }
      }
    }
    return null;
  }

  public addPath(path: Path): void {
    this.paths.set(path.id, path);
    if (!path.isComplete || path.glowProgress < 1) {
      this.activePaths.add(path.id);
    }
    this.notifyListeners();
  }

  public getPaths(): Path[] {
    return Array.from(this.paths.values());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public screenToWorld(screenX: number, screenY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.offsetX) / this.scale,
      y: (screenY - rect.top - this.offsetY) / this.scale,
    };
  }

  public worldToScreen(worldX: number, worldY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: worldX * this.scale + this.offsetX + rect.left,
      y: worldY * this.scale + this.offsetY + rect.top,
    };
  }
}
