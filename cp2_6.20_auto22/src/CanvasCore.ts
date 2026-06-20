import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BrushPath {
  id: string;
  points: Point[];
  color: string;
  thickness: number;
  opacity: number;
  createdAt: number;
  animationProgress: number;
  glowProgress: number;
  isComplete: boolean;
  memberId?: string;
}

export interface ImageElementData {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  caption: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface BrushSettings {
  color: string;
  thickness: number;
  opacity: number;
}

type Listener = () => void;

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const GRID_SIZE = 50;
const INK_SPREAD_DURATION = 200;
const GLOW_DURATION = 200;

export class CanvasCore {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewport: Viewport = { x: 0, y: 0, scale: 1 };
  private targetViewport: Viewport = { x: 0, y: 0, scale: 1 };
  private paths: BrushPath[] = [];
  private images: ImageElementData[] = [];
  private currentPath: BrushPath | null = null;
  private brushSettings: BrushSettings = {
    color: '#0ea5e9',
    thickness: 4,
    opacity: 1
  };
  private isDrawing = false;
  private isPanning = false;
  private spacePressed = false;
  private lastMousePos = { x: 0, y: 0 };
  private animationFrameId: number | null = null;
  private listeners: Set<Listener> = new Set();
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.resize();
    this.bindEvents();
    this.startRenderLoop();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleResize = () => {
    this.resize();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      this.spacePressed = true;
      this.canvas.style.cursor = 'grab';
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      this.spacePressed = false;
      this.canvas.style.cursor = 'crosshair';
    }
  };

  screenToWorld(screenX: number, screenY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.viewport.x) / this.viewport.scale;
    const y = (screenY - rect.top - this.viewport.y) / this.viewport.scale;
    return { x, y };
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (this.spacePressed) {
      this.isPanning = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    this.isDrawing = true;
    const point = this.screenToWorld(e.clientX, e.clientY);
    this.currentPath = {
      id: uuidv4(),
      points: [point],
      color: this.brushSettings.color,
      thickness: this.brushSettings.thickness,
      opacity: this.brushSettings.opacity,
      createdAt: performance.now(),
      animationProgress: 0,
      glowProgress: -1,
      isComplete: false
    };
    this.paths.push(this.currentPath);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.targetViewport.x += dx;
      this.targetViewport.y += dy;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.isDrawing && this.currentPath) {
      const point = this.screenToWorld(e.clientX, e.clientY);
      const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];
      const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
      if (dist > 1.5) {
        this.currentPath.points.push(point);
      }
    }
  };

  private handleMouseUp = () => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.spacePressed ? 'grab' : 'crosshair';
    }
    if (this.isDrawing && this.currentPath) {
      this.currentPath.isComplete = true;
      this.currentPath.glowProgress = 0;
      this.currentPath = null;
      this.isDrawing = false;
      this.notify();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * 0.001;
    const oldScale = this.viewport.scale;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (1 + delta)));

    const worldX = (mouseX - this.viewport.x) / oldScale;
    const worldY = (mouseY - this.viewport.y) / oldScale;

    const newX = mouseX - worldX * newScale;
    const newY = mouseY - worldY * newScale;

    this.viewport.x = newX;
    this.viewport.y = newY;
    this.viewport.scale = newScale;
    this.targetViewport.x = newX;
    this.targetViewport.y = newY;
    this.targetViewport.scale = newScale;
  };

  setBrushSettings(settings: Partial<BrushSettings>) {
    this.brushSettings = { ...this.brushSettings, ...settings };
    this.notify();
  }

  getBrushSettings(): BrushSettings {
    return { ...this.brushSettings };
  }

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  getPaths(): BrushPath[] {
    return [...this.paths];
  }

  addRemotePath(path: Omit<BrushPath, 'animationProgress' | 'glowProgress' | 'isComplete'>) {
    this.paths.push({
      ...path,
      animationProgress: 0,
      glowProgress: 0,
      isComplete: true
    });
  }

  addImageElement(img: ImageElementData) {
    this.images.push(img);
    this.loadImage(img.src);
    this.notify();
  }

  updateImageElement(id: string, updates: Partial<ImageElementData>) {
    const idx = this.images.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.images[idx] = { ...this.images[idx], ...updates };
      this.notify();
    }
  }

  getImages(): ImageElementData[] {
    return [...this.images];
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const cached = this.imageCache.get(src);
      if (cached) {
        resolve(cached);
        return;
      }
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  private startRenderLoop = () => {
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      this.update(dt);
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  };

  private update(dt: number) {
    const lerpFactor = 0.2;
    this.viewport.x += (this.targetViewport.x - this.viewport.x) * lerpFactor;
    this.viewport.y += (this.targetViewport.y - this.viewport.y) * lerpFactor;
    this.viewport.scale += (this.targetViewport.scale - this.viewport.scale) * lerpFactor;

    for (const path of this.paths) {
      if (path.animationProgress < 1) {
        path.animationProgress = Math.min(1, path.animationProgress + dt / INK_SPREAD_DURATION);
      }
      if (path.glowProgress >= 0 && path.glowProgress < 1) {
        path.glowProgress = Math.min(1, path.glowProgress + dt / GLOW_DURATION);
      }
    }
  }

  private render() {
    const { ctx, canvas } = this;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.save();
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    this.drawGrid();

    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.scale, this.viewport.scale);

    this.drawImages();
    this.drawPaths();

    ctx.restore();
  }

  private drawGrid() {
    const { ctx, viewport, canvas } = this;
    const gridSize = GRID_SIZE * viewport.scale;
    if (gridSize < 8) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
    ctx.lineWidth = 1;

    const offsetX = viewport.x % gridSize;
    const offsetY = viewport.y % gridSize;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawPaths() {
    const { ctx } = this;

    for (const path of this.paths) {
      if (path.points.length < 2) continue;

      ctx.save();
      ctx.globalAlpha = path.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = path.color;

      const spread = 1 + (1 - path.animationProgress) * 0.5;
      ctx.lineWidth = path.thickness * spread;

      if (path.glowProgress >= 0 && path.glowProgress < 1) {
        ctx.shadowColor = path.color;
        ctx.shadowBlur = 25 * (1 - path.glowProgress);
      }

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        const p0 = path.points[i - 1];
        const p1 = path.points[i];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      const last = path.points[path.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();

      if (path.glowProgress >= 0 && path.glowProgress < 1) {
        this.drawFlowGlow(path);
      }
    }
  }

  private drawFlowGlow(path: BrushPath) {
    const { ctx } = this;
    if (path.points.length < 2) return;

    const totalLen = this.getPathLength(path.points);
    if (totalLen === 0) return;

    const progress = path.glowProgress;
    const headPos = progress * totalLen;
    const glowWidth = totalLen * 0.25;
    const tailPos = Math.max(0, headPos - glowWidth);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t1 = tailPos + (headPos - tailPos) * (i / steps);
      const t2 = tailPos + (headPos - tailPos) * ((i + 1) / steps);
      const p1 = this.getPointAtLength(path.points, t1, totalLen);
      const p2 = this.getPointAtLength(path.points, t2, totalLen);

      if (!p1 || !p2) continue;

      const segT = i / steps;
      const alpha = (1 - progress) * Math.sin(segT * Math.PI) * 0.9;
      const width = path.thickness * (1.5 + Math.sin(segT * Math.PI) * 1.5) * (1 - progress * 0.5);

      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.shadowColor = path.color;
      ctx.shadowBlur = 15 * (1 - progress);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    if (headPos > 0) {
      const tipPoint = this.getPointAtLength(path.points, headPos, totalLen);
      if (tipPoint) {
        const tipRadius = path.thickness * (2 + (1 - progress) * 2);
        const gradient = ctx.createRadialGradient(
          tipPoint.x, tipPoint.y, 0,
          tipPoint.x, tipPoint.y, tipRadius
        );
        gradient.addColorStop(0, path.color);
        gradient.addColorStop(0.4, path.color + '80');
        gradient.addColorStop(1, path.color + '00');
        ctx.globalAlpha = (1 - progress) * 0.8;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(tipPoint.x, tipPoint.y, tipRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private getPathLength(points: Point[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return len;
  }

  private getPointAtLength(points: Point[], targetLen: number, totalLen: number): Point | null {
    if (points.length === 0 || totalLen === 0) return null;
    if (targetLen <= 0) return { ...points[0] };
    let accumulated = 0;
    for (let i = 1; i < points.length; i++) {
      const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (accumulated + segLen >= targetLen) {
        const t = segLen > 0 ? (targetLen - accumulated) / segLen : 0;
        return {
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
        };
      }
      accumulated += segLen;
    }
    return { ...points[points.length - 1] };
  }

  private drawImages() {
    const { ctx } = this;

    for (const img of this.images) {
      const cachedImg = this.imageCache.get(img.src);
      if (!cachedImg) continue;

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(cachedImg, img.x, img.y, img.width, img.height);
      ctx.restore();

      if (img.caption) {
        const padding = 8;
        const fontSize = 14;
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const textWidth = ctx.measureText(img.caption).width;
        const labelWidth = textWidth + padding * 2;
        const labelHeight = fontSize + padding;
        const labelX = img.x + (img.width - labelWidth) / 2;
        const labelY = img.y + img.height + 6;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        this.roundRect(ctx, labelX, labelY, labelWidth, labelHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(img.caption, img.x + img.width / 2, labelY + labelHeight / 2);
        ctx.restore();
      }
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
