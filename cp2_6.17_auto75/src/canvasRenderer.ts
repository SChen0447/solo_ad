import { v4 as uuidv4 } from 'uuid';
import type {
  Point,
  Path,
  Rect,
  Text,
  StickyNote,
  ImageElement,
  DrawElement,
  ToolType,
  BoardState,
  UserInfo
} from './types';
import { STICKY_COLORS } from './types';

const CANVAS_WIDTH = 8000;
const CANVAS_HEIGHT = 8000;
const GRID_SIZE = 50;
const GRID_COLOR = '#d0d0d0';
const BG_COLOR = '#f5f5f5';
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export interface CanvasRendererOptions {
  canvas: HTMLCanvasElement;
  userInfo: UserInfo;
  onLocalDraw: (element: DrawElement) => void;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private userInfo: UserInfo;
  private onLocalDraw: (element: DrawElement) => void;

  private elements: DrawElement[] = [];
  private pan: Point = { x: 0, y: 0 };
  private zoom: number = 1;
  private tool: ToolType = 'pen';
  private penColor: string = '#333333';
  private penWidth: number = 2;

  private isPanning: boolean = false;
  private isDrawing: boolean = false;
  private lastMousePos: Point = { x: 0, y: 0 };
  private currentPath: Point[] = [];
  private currentRect: { x: number; y: number; width: number; height: number } | null = null;
  private tempElement: DrawElement | null = null;

  private pendingImageData: string | null = null;
  private pendingImageSize: { width: number; height: number } | null = null;

  private imageCache = new Map<string, HTMLImageElement>();

  private animationFrameId: number | null = null;
  private needsRender: boolean = true;

  constructor(options: CanvasRendererOptions) {
    this.canvas = options.canvas;
    this.ctx = options.canvas.getContext('2d')!;
    this.userInfo = options.userInfo;
    this.onLocalDraw = options.onLocalDraw;
    this.resize();
    this.bindEvents();
    this.centerCanvas();
    this.startRenderLoop();
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.needsRender = true;
  };

  private centerCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pan.x = (rect.width - CANVAS_WIDTH) / 2;
    this.pan.y = (rect.height - CANVAS_HEIGHT) / 2;
    this.needsRender = true;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  public unbindEvents(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private getWorldPos(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.pan.x) / this.zoom;
    const y = (clientY - rect.top - this.pan.y) / this.zoom;
    return { x, y };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const worldPos = this.getWorldPos(e.clientX, e.clientY);

    if (this.tool === 'image' && this.pendingImageData && this.pendingImageSize) {
      this.placeImage(worldPos);
      return;
    }

    this.isDrawing = true;

    switch (this.tool) {
      case 'pen':
        this.currentPath = [worldPos];
        break;
      case 'rect':
        this.currentRect = { x: worldPos.x, y: worldPos.y, width: 0, height: 0 };
        break;
      case 'text':
        this.createTextElement(worldPos);
        this.isDrawing = false;
        break;
      case 'sticky':
        this.createStickyNote(worldPos);
        this.isDrawing = false;
        break;
    }
    this.needsRender = true;
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.pan.x += dx;
      this.pan.y += dy;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.needsRender = true;
      return;
    }

    if (!this.isDrawing) return;

    const worldPos = this.getWorldPos(e.clientX, e.clientY);

    switch (this.tool) {
      case 'pen':
        this.currentPath.push(worldPos);
        this.updateTempPath();
        break;
      case 'rect':
        if (this.currentRect) {
          const startX = this.currentRect.x;
          const startY = this.currentRect.y;
          this.currentRect.width = worldPos.x - startX;
          this.currentRect.height = worldPos.y - startY;
          this.updateTempRect();
        }
        break;
    }
    this.needsRender = true;
  };

  private handleMouseUp = (): void => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    switch (this.tool) {
      case 'pen':
        if (this.currentPath.length > 1) {
          this.finalizePath();
        }
        this.currentPath = [];
        break;
      case 'rect':
        if (this.currentRect && Math.abs(this.currentRect.width) > 2 && Math.abs(this.currentRect.height) > 2) {
          this.finalizeRect();
        }
        this.currentRect = null;
        break;
    }
    this.tempElement = null;
    this.needsRender = true;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * delta));

    if (newZoom !== this.zoom) {
      const scaleRatio = newZoom / this.zoom;
      this.pan.x = mouseX - (mouseX - this.pan.x) * scaleRatio;
      this.pan.y = mouseY - (mouseY - this.pan.y) * scaleRatio;
      this.zoom = newZoom;
      this.needsRender = true;
    }
  };

  private updateTempPath(): void {
    if (this.currentPath.length > 1) {
      this.tempElement = {
        id: 'temp',
        type: 'path',
        points: [...this.currentPath],
        color: this.penColor,
        width: this.penWidth,
        userId: this.userInfo.id,
        userName: this.userInfo.name
      } as Path;
    }
  }

  private updateTempRect(): void {
    if (this.currentRect) {
      const { x, y, width, height } = this.currentRect;
      this.tempElement = {
        id: 'temp',
        type: 'rect',
        x: width >= 0 ? x : x + width,
        y: height >= 0 ? y : y + height,
        width: Math.abs(width),
        height: Math.abs(height),
        color: this.userInfo.color,
        userId: this.userInfo.id,
        userName: this.userInfo.name
      } as Rect;
    }
  }

  private finalizePath(): void {
    const path: Path = {
      id: uuidv4(),
      type: 'path',
      points: [...this.currentPath],
      color: this.penColor,
      width: this.penWidth,
      userId: this.userInfo.id,
      userName: this.userInfo.name
    };
    this.elements.push(path);
    this.onLocalDraw(path);
  }

  private finalizeRect(): void {
    if (!this.currentRect) return;
    const { x, y, width, height } = this.currentRect;
    const rect: Rect = {
      id: uuidv4(),
      type: 'rect',
      x: width >= 0 ? x : x + width,
      y: height >= 0 ? y : y + height,
      width: Math.abs(width),
      height: Math.abs(height),
      color: this.userInfo.color,
      userId: this.userInfo.id,
      userName: this.userInfo.name
    };
    this.elements.push(rect);
    this.onLocalDraw(rect);
  }

  private createTextElement(pos: Point): void {
    const content = prompt("\u8F93\u5165\u6587\u5B57\u5185\u5BB9:");
    if (content) {
      const text: Text = {
        id: uuidv4(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        content,
        color: this.userInfo.color,
        fontSize: 16,
        userId: this.userInfo.id,
        userName: this.userInfo.name
      };
      this.elements.push(text);
      this.onLocalDraw(text);
      this.needsRender = true;
    }
  }

  private createStickyNote(pos: Point): void {
    const content = prompt("\u8F93\u5165\u4FBF\u7B7E\u5185\u5BB9:");
    if (content) {
      const sticky: StickyNote = {
        id: uuidv4(),
        type: 'sticky',
        x: pos.x,
        y: pos.y,
        width: 200,
        height: 150,
        content,
        color: '#333333',
        bgColor: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
        userId: this.userInfo.id,
        userName: this.userInfo.name
      };
      this.elements.push(sticky);
      this.onLocalDraw(sticky);
      this.needsRender = true;
    }
  }

  public addImageElement(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxSize = 300;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        this.pendingImageData = imageData;
        this.pendingImageSize = { width: img.width * scale, height: img.height * scale };
        this.tool = 'image';
        this.canvas.style.cursor = 'copy';
      };
      img.onerror = () => {
        console.error("Failed to load image for placement");
      };
      img.src = imageData;
    };
    reader.readAsDataURL(file);
  }

  private placeImage(pos: Point): void {
    if (!this.pendingImageData || !this.pendingImageSize) return;
    const image: ImageElement = {
      id: uuidv4(),
      type: 'image',
      x: pos.x - this.pendingImageSize.width / 2,
      y: pos.y - this.pendingImageSize.height / 2,
      width: this.pendingImageSize.width,
      height: this.pendingImageSize.height,
      imageData: this.pendingImageData,
      userId: this.userInfo.id,
      userName: this.userInfo.name
    };
    this.elements.push(image);
    this.onLocalDraw(image);
    this.pendingImageData = null;
    this.pendingImageSize = null;
    this.canvas.style.cursor = 'crosshair';
    this.needsRender = true;
  }

  private getOrLoadImage(src: string): HTMLImageElement | null {
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)!;
    }
    const img = new Image();
    img.onload = () => {
      this.needsRender = true;
    };
    img.onerror = () => {
      this.imageCache.set(src + '__error', img);
      this.needsRender = true;
    };
    img.src = src;
    this.imageCache.set(src, img);
    return null;
  }

  public handleRemoteDraw(element: DrawElement): void {
    const existingIndex = this.elements.findIndex(el => el.id === element.id);
    if (existingIndex >= 0) {
      this.elements[existingIndex] = element;
    } else {
      this.elements.push(element);
    }
    this.needsRender = true;
  }

  public setElements(elements: DrawElement[]): void {
    this.elements = [...elements];
    this.needsRender = true;
  }

  public getElements(): DrawElement[] {
    return [...this.elements];
  }

  public getBoardState(): BoardState {
    return {
      elements: [...this.elements],
      pan: { ...this.pan },
      zoom: this.zoom
    };
  }

  public setTool(tool: ToolType): void {
    this.tool = tool;
    if (tool !== 'image') {
      this.pendingImageData = null;
      this.pendingImageSize = null;
    }
  }

  public getTool(): ToolType {
    return this.tool;
  }

  public setPenColor(color: string): void {
    this.penColor = color;
  }

  public setPenWidth(width: number): void {
    this.penWidth = width;
  }

  public hasPendingImage(): boolean {
    return this.pendingImageData !== null;
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.restore();

    ctx.save();
    ctx.translate(this.pan.x, this.pan.y);
    ctx.scale(this.zoom, this.zoom);

    this.drawBackground(ctx);
    this.drawGrid(ctx);

    for (const element of this.elements) {
      this.drawElement(ctx, element);
    }

    if (this.tempElement) {
      ctx.globalAlpha = 0.7;
      this.drawElement(ctx, this.tempElement);
      ctx.globalAlpha = 1;
    }

    if (this.tool === 'image' && this.pendingImageData && this.pendingImageSize) {
      ctx.globalAlpha = 0.5;
      const mouseX = this.lastMousePos.x;
      const mouseY = this.lastMousePos.y;
      const worldPos = this.getWorldPos(mouseX, mouseY);
      ctx.fillStyle = '#cccccc';
      this.roundRect(ctx, worldPos.x - this.pendingImageSize.width / 2, worldPos.y - this.pendingImageSize.height / 2, this.pendingImageSize.width, this.pendingImageSize.height, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const adjustedGridSize = GRID_SIZE * Math.round(1 / this.zoom) || GRID_SIZE;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1 / this.zoom;

    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += adjustedGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += adjustedGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2 / this.zoom;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawElement(ctx: CanvasRenderingContext2D, element: DrawElement): void {
    switch (element.type) {
      case 'path':
        this.drawPath(ctx, element);
        break;
      case 'rect':
        this.drawRect(ctx, element);
        break;
      case 'text':
        this.drawText(ctx, element);
        break;
      case 'sticky':
        this.drawStickyNote(ctx, element);
        break;
      case 'image':
        this.drawImage(ctx, element);
        break;
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D, path: Path): void {
    if (path.points.length < 2) return;
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  }

  private drawRect(ctx: CanvasRenderingContext2D, rect: Rect): void {
    ctx.strokeStyle = rect.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.drawAuthorLabel(ctx, rect.x + rect.width, rect.y, rect.userName);
  }

  private drawText(ctx: CanvasRenderingContext2D, text: Text): void {
    ctx.fillStyle = text.color;
    ctx.font = `${text.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(text.content, text.x, text.y);
    this.drawAuthorLabel(ctx, text.x, text.y - text.fontSize - 15, text.userName);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private drawStickyNote(ctx: CanvasRenderingContext2D, sticky: StickyNote): void {
    const radius = 8;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    this.roundRect(ctx, sticky.x + 4, sticky.y + 4, sticky.width, sticky.height, radius);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = sticky.bgColor;
    this.roundRect(ctx, sticky.x, sticky.y, sticky.width, sticky.height, radius);
    ctx.fill();

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    this.roundRect(ctx, sticky.x, sticky.y, sticky.width, sticky.height, radius);
    ctx.stroke();

    ctx.fillStyle = sticky.color;
    ctx.font = "14px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
    const padding = 10;
    const maxWidth = sticky.width - padding * 2;
    const lineHeight = 20;
    const words = sticky.content.split('');
    let line = '';
    let y = sticky.y + padding + 14;

    for (const word of words) {
      const testLine = line + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length > 0) {
        ctx.fillText(line, sticky.x + padding, y);
        line = word;
        y += lineHeight;
        if (y > sticky.y + sticky.height - padding) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, sticky.x + padding, y);

    ctx.font = "10px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
    ctx.fillStyle = '#999999';
    const authorMetrics = ctx.measureText(sticky.userName);
    ctx.fillText(sticky.userName, sticky.x + sticky.width - authorMetrics.width - 6, sticky.y + 14);
  }

  private drawImage(ctx: CanvasRenderingContext2D, image: ImageElement): void {
    const cached = this.imageCache.get(image.imageData);
    const isError = this.imageCache.has(image.imageData + '__error');

    if (isError) {
      ctx.fillStyle = '#e0e0e0';
      this.roundRect(ctx, image.x, image.y, image.width, image.height, 4);
      ctx.fill();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      this.roundRect(ctx, image.x, image.y, image.width, image.height, 4);
      ctx.stroke();

      ctx.fillStyle = '#999999';
      ctx.font = "14px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("\u56FE\u7247\u52A0\u8F7D\u5931\u8D25", image.x + image.width / 2, image.y + image.height / 2);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    } else if (cached && cached.complete && cached.naturalWidth > 0) {
      ctx.drawImage(cached, image.x, image.y, image.width, image.height);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(image.x, image.y, image.width, image.height);
    } else {
      this.getOrLoadImage(image.imageData);

      ctx.fillStyle = '#f0f0f0';
      this.roundRect(ctx, image.x, image.y, image.width, image.height, 4);
      ctx.fill();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      this.roundRect(ctx, image.x, image.y, image.width, image.height, 4);
      ctx.stroke();
    }

    this.drawAuthorLabel(ctx, image.x + image.width, image.y, image.userName);
  }

  private drawAuthorLabel(ctx: CanvasRenderingContext2D, x: number, y: number, author: string): void {
    ctx.font = "10px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
    const metrics = ctx.measureText(author);
    const padding = 4;
    const labelWidth = metrics.width + padding * 2;
    const labelHeight = 16;

    ctx.fillStyle = 'rgba(150, 150, 150, 0.9)';
    this.roundRect(ctx, x - labelWidth, y - labelHeight, labelWidth, labelHeight, 3);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(author, x - labelWidth + padding, y - labelHeight + 12);
  }

  public generateThumbnail(): string {
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 200;
    thumbCanvas.height = 200;
    const thumbCtx = thumbCanvas.getContext('2d')!;

    const scale = 200 / CANVAS_WIDTH;
    thumbCtx.fillStyle = BG_COLOR;
    thumbCtx.fillRect(0, 0, 200, 200);
    thumbCtx.scale(scale, scale);

    for (const element of this.elements) {
      this.drawElement(thumbCtx, element);
    }

    return thumbCanvas.toDataURL('image/png');
  }
}
