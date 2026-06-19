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
    this.requestRender();
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
      this.lastPanPoint = { x: e.clientX, y: e.clientY };
      this.requestRender();
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

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));

    const scaleRatio = newScale / this.scale;
    this.offsetX = mouseX - (mouseX - this.offsetX) * scaleRatio;
    this.offsetY = mouseY - (mouseY - this.offsetY) * scaleRatio;
    this.scale = newScale;

    this.requestRender();
    this.notifyListeners();
  };

  private startRenderLoop(): void {
    const render = () => {
      this.updateAnimations();
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  private updateAnimations(): void {
    let needsUpdate = false;

    for (const pathId of this.activePaths) {
      const path = this.paths.get(pathId);
      if (path && path.isComplete) {
        path.glowProgress += 1 / 12;
        if (path.glowProgress >= 1) {
          this.activePaths.delete(pathId);
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.notifyListeners();
    }
  }

  private requestRender(): void {
    // Render is handled by the animation loop
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, width, height);
    this.drawGrid();

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawImages();
    this.drawPaths();

    ctx.restore();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const gridSize = 50 * this.scale;
    const offsetX = this.offsetX % gridSize;
    const offsetY = this.offsetY % gridSize;

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
        const glowIntensity = 1 - path.glowProgress;
        ctx.save();
        ctx.globalAlpha = glowIntensity * 0.8;
        ctx.shadowColor = path.color;
        ctx.shadowBlur = 20 * glowIntensity;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width * 0.5;

        const totalLength = this.getPathLength(path.points);
        const currentLength = totalLength * path.glowProgress;
        let drawnLength = 0;

        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);

        for (let i = 1; i < path.points.length; i++) {
          const dx = path.points[i].x - path.points[i - 1].x;
          const dy = path.points[i].y - path.points[i - 1].y;
          const segLength = Math.sqrt(dx * dx + dy * dy);

          if (drawnLength + segLength <= currentLength) {
            const xc = (path.points[i].x + path.points[i - 1].x) / 2;
            const yc = (path.points[i].y + path.points[i - 1].y) / 2;
            ctx.quadraticCurveTo(path.points[i - 1].x, path.points[i - 1].y, xc, yc);
            drawnLength += segLength;
          } else {
            const remaining = currentLength - drawnLength;
            const ratio = remaining / segLength;
            const endX = path.points[i - 1].x + dx * ratio;
            const endY = path.points[i - 1].y + dy * ratio;
            ctx.lineTo(endX, endY);
            break;
          }
        }

        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
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
        ctx.font = '12px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(img.label, img.x + img.width / 2, labelY + labelHeight / 2);
        ctx.restore();
      }
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
    return this.scale;
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
        point.x >= img.x &&
        point.x <= img.x + img.width &&
        point.y >= img.y &&
        point.y <= img.y + img.height
      ) {
        return img;
      }
    }
    return null;
  }

  public getResizeHandleAtPoint(point: Point): { imageId: string; handle: string } | null {
    const handleSize = 10;
    for (const img of this.images.values()) {
      const handles = [
        { name: 'nw', x: img.x - handleSize / 2, y: img.y - handleSize / 2 },
        { name: 'ne', x: img.x + img.width - handleSize / 2, y: img.y - handleSize / 2 },
        { name: 'sw', x: img.x - handleSize / 2, y: img.y + img.height - handleSize / 2 },
        { name: 'se', x: img.x + img.width - handleSize / 2, y: img.y + img.height - handleSize / 2 },
      ];
      for (const handle of handles) {
        if (
          point.x >= handle.x &&
          point.x <= handle.x + handleSize &&
          point.y >= handle.y &&
          point.y <= handle.y + handleSize
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
