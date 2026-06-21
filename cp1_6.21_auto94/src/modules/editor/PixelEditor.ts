import type { PixelGrid, PixelColor, ToolType, EditorOptions, HighlightPixel } from '../../types';
import {
  createCanvas,
  getContext,
  drawCheckerboardBackground,
  drawPixelGrid,
  drawGridLines,
  drawCrosshair,
  colorsEqual,
  drawPixelHighlight,
  gridToCanvas,
} from '../../utils/canvas';

export class PixelEditor {
  private container: HTMLElement;
  private options: EditorOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: PixelGrid;
  private tool: ToolType = 'pencil';
  private currentColor: PixelColor = { r: 0, g: 0, b: 0, a: 255 };
  private scale: number;
  private isDrawing: boolean = false;
  private hoverPixel: { x: number; y: number } | null = null;
  private highlights: HighlightPixel[] = [];
  private animationFrameId: number | null = null;
  private pixelChangeCallback: ((grid: PixelGrid) => void) | null = null;
  private lastPixel: { x: number; y: number } | null = null;

  constructor(container: HTMLElement, options: EditorOptions) {
    this.container = container;
    this.options = options;
    this.scale = options.scale;

    this.canvas = createCanvas(
      options.width * this.scale,
      options.height * this.scale
    );
    this.ctx = getContext(this.canvas);

    this.grid = this.createEmptyGrid();
    this.setupCanvas();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private createEmptyGrid(): PixelGrid {
    const grid: PixelGrid = [];
    for (let y = 0; y < this.options.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.options.width; x++) {
        grid[y][x] = null;
      }
    }
    return grid;
  }

  private setupCanvas(): void {
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'none';
    this.canvas.style.imageRendering = 'pixelated';
    this.container.appendChild(this.canvas);
    this.render();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getMousePosition(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / this.scale);
    const y = Math.floor((e.clientY - rect.top) / this.scale);
    return { x, y };
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.options.width && y >= 0 && y < this.options.height;
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getMousePosition(e);
    if (!this.isInBounds(pos.x, pos.y)) return;

    this.isDrawing = true;
    this.lastPixel = pos;
    this.applyTool(pos.x, pos.y);
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getMousePosition(e);
    this.hoverPixel = this.isInBounds(pos.x, pos.y) ? pos : null;

    if (this.isDrawing && this.isInBounds(pos.x, pos.y)) {
      if (this.tool === 'pencil' || this.tool === 'eraser') {
        if (this.lastPixel) {
          this.drawLine(this.lastPixel.x, this.lastPixel.y, pos.x, pos.y);
        } else {
          this.applyTool(pos.x, pos.y);
        }
      }
      this.lastPixel = pos;
    }
  }

  private handleMouseUp(): void {
    this.isDrawing = false;
    this.lastPixel = null;
  }

  private handleMouseLeave(): void {
    this.isDrawing = false;
    this.hoverPixel = null;
    this.lastPixel = null;
  }

  private drawLine(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      this.applyTool(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private applyTool(x: number, y: number): void {
    switch (this.tool) {
      case 'pencil':
        this.setPixel(x, y, this.currentColor);
        this.setMirrorPixels(x, y, this.currentColor);
        this.addHighlight(x, y);
        break;
      case 'eraser':
        this.setPixel(x, y, null);
        this.setMirrorPixels(x, y, null);
        this.addHighlight(x, y);
        break;
      case 'bucket':
        this.floodFill(x, y);
        break;
      case 'eyedropper':
        const color = this.grid[y][x];
        if (color) {
          this.currentColor = { ...color };
        }
        break;
    }
  }

  private setMirrorPixels(x: number, y: number, color: PixelColor | null): void {
    const w = this.options.width - 1;
    const h = this.options.height - 1;

    if (x === 0 && w - x !== x) {
      this.setPixelInternal(w - x, y, color);
      this.addHighlight(w - x, y);
    }
    if (x === w && w - x !== x) {
      this.setPixelInternal(0, y, color);
      this.addHighlight(0, y);
    }
    if (y === 0 && h - y !== y) {
      this.setPixelInternal(x, h - y, color);
      this.addHighlight(x, h - y);
    }
    if (y === h && h - y !== y) {
      this.setPixelInternal(x, 0, color);
      this.addHighlight(x, 0);
    }

    if (x === 0 && y === 0) {
      this.setPixelInternal(w, h, color);
      this.addHighlight(w, h);
    }
    if (x === w && y === 0) {
      this.setPixelInternal(0, h, color);
      this.addHighlight(0, h);
    }
    if (x === 0 && y === h) {
      this.setPixelInternal(w, 0, color);
      this.addHighlight(w, 0);
    }
    if (x === w && y === h) {
      this.setPixelInternal(0, 0, color);
      this.addHighlight(0, 0);
    }
  }

  private setPixelInternal(x: number, y: number, color: PixelColor | null): void {
    if (this.isInBounds(x, y)) {
      this.grid[y][x] = color ? { ...color } : null;
    }
  }

  private setPixel(x: number, y: number, color: PixelColor | null): void {
    if (this.isInBounds(x, y)) {
      this.grid[y][x] = color ? { ...color } : null;
      this.notifyChange();
    }
  }

  private floodFill(x: number, y: number): void {
    const targetColor = this.grid[y][x];
    if (colorsEqual(targetColor, this.currentColor)) return;

    const stack: { x: number; y: number }[] = [{ x, y }];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const key = `${pos.x},${pos.y}`;

      if (visited.has(key)) continue;
      if (!this.isInBounds(pos.x, pos.y)) continue;
      if (!colorsEqual(this.grid[pos.y][pos.x], targetColor)) continue;

      visited.add(key);
      this.setPixel(pos.x, pos.y, this.currentColor);
      this.addHighlight(pos.x, pos.y);

      stack.push({ x: pos.x + 1, y: pos.y });
      stack.push({ x: pos.x - 1, y: pos.y });
      stack.push({ x: pos.x, y: pos.y + 1 });
      stack.push({ x: pos.x, y: pos.y - 1 });
    }
  }

  private addHighlight(x: number, y: number): void {
    const existing = this.highlights.find((h) => h.x === x && h.y === y);
    if (!existing) {
      this.highlights.push({ x, y, startTime: performance.now() });
    } else {
      existing.startTime = performance.now();
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      const now = performance.now();
      this.highlights = this.highlights.filter(
        (h) => now - h.startTime < 300
      );
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private render(): void {
    const width = this.options.width * this.scale;
    const height = this.options.height * this.scale;

    drawCheckerboardBackground(this.ctx, width, height, 8);
    drawPixelGrid(this.ctx, this.grid, this.scale);

    const now = performance.now();
    for (const highlight of this.highlights) {
      const elapsed = now - highlight.startTime;
      const alpha = 1 - elapsed / 300;
      if (alpha > 0) {
        drawPixelHighlight(this.ctx, highlight.x, highlight.y, this.scale, alpha * 0.5);
      }
    }

    drawGridLines(this.ctx, width, height, this.scale, 'rgba(255, 255, 255, 0.15)');

    if (this.hoverPixel) {
      const crosshairX = this.hoverPixel.x * this.scale + this.scale / 2;
      const crosshairY = this.hoverPixel.y * this.scale + this.scale / 2;
      drawCrosshair(this.ctx, crosshairX, crosshairY, this.scale * 2, '#ffffff');
    }
  }

  private notifyChange(): void {
    if (this.pixelChangeCallback) {
      this.pixelChangeCallback(this.grid);
    }
  }

  public getPixelData(): PixelGrid {
    return this.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }

  public setPixelData(grid: PixelGrid): void {
    this.grid = grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
    this.notifyChange();
  }

  public setTool(tool: ToolType): void {
    this.tool = tool;
  }

  public getTool(): ToolType {
    return this.tool;
  }

  public setColor(color: PixelColor): void {
    this.currentColor = { ...color };
  }

  public getColor(): PixelColor {
    return { ...this.currentColor };
  }

  public setScale(scale: number): void {
    this.scale = Math.max(1, Math.min(8, scale));
    this.canvas.width = this.options.width * this.scale;
    this.canvas.height = this.options.height * this.scale;
  }

  public getScale(): number {
    return this.scale;
  }

  public clear(): void {
    this.grid = this.createEmptyGrid();
    this.notifyChange();
  }

  public onPixelChange(callback: (grid: PixelGrid) => void): void {
    this.pixelChangeCallback = callback;
  }

  public getSourceCanvas(): HTMLCanvasElement {
    return gridToCanvas(this.grid);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.container.removeChild(this.canvas);
  }
}
