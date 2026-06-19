import {
  Point,
  ElementType,
  MapElements,
  MazeGrid,
  AppEvent,
  EventBus
} from './types';

const COLORS = {
  bg: '#2a2a2a',
  border: '#f0d060',
  floor: '#f5e6c8',
  wall: '#1a1a1a',
  start: '#4ade80',
  end: '#f87171',
  monster: '#a855f7',
  wallHighlight: '#2a2a2a',
  floorHighlight: '#fff8e7'
};

interface AnimationState {
  rowAnimations: Map<number, { startTime: number; duration: number }>;
  elementAnimations: Map<string, {
    type: 'fadeIn' | 'fadeOut';
    startTime: number;
    duration: number;
    elementType: ElementType;
    point: Point;
  }>;
  hoverHighlight: { x: number; y: number; w: number; h: number } | null;
}

export class Renderer {
  private mazeCanvas: HTMLCanvasElement;
  private mazeCtx: CanvasRenderingContext2D;
  private thumbnailCanvas: HTMLCanvasElement;
  private thumbnailCtx: CanvasRenderingContext2D;
  private mazeWrapper: HTMLElement;

  private grid: MazeGrid | null = null;
  private mazeWidth = 0;
  private mazeHeight = 0;
  private cellSize = 16;
  private elements: MapElements = {
    starts: [],
    ends: [],
    monsters: []
  };

  private animationState: AnimationState = {
    rowAnimations: new Map(),
    elementAnimations: new Map(),
    hoverHighlight: null
  };

  private isAnimating = false;
  private thumbnailDirty = true;
  private messageEl: HTMLDivElement | null = null;

  constructor(
    private eventBus: EventBus,
    mazeCanvasId: string,
    thumbnailCanvasId: string,
    mazeWrapperId: string
  ) {
    const mazeCanvas = document.getElementById(mazeCanvasId) as HTMLCanvasElement;
    const thumbnailCanvas = document.getElementById(thumbnailCanvasId) as HTMLCanvasElement;
    const mazeWrapper = document.getElementById(mazeWrapperId) as HTMLElement;

    if (!mazeCanvas || !thumbnailCanvas || !mazeWrapper) {
      throw new Error('Canvas elements not found');
    }

    this.mazeCanvas = mazeCanvas;
    this.mazeCtx = mazeCanvas.getContext('2d')!;
    this.thumbnailCanvas = thumbnailCanvas;
    this.thumbnailCtx = thumbnailCanvas.getContext('2d')!;
    this.mazeWrapper = mazeWrapper;

    this.setupContexts();
    this.setupEventListeners();
    this.createMessageElement();
    this.startAnimationLoop();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private setupContexts(): void {
    this.mazeCtx.imageSmoothingEnabled = false;
    this.thumbnailCtx.imageSmoothingEnabled = false;
  }

  private setupEventListeners(): void {
    this.eventBus.on(AppEvent.MAZE_GENERATED, (payload) => {
      this.grid = payload.grid;
      this.mazeWidth = payload.width;
      this.mazeHeight = payload.height;
      this.elements = { starts: [], ends: [], monsters: [] };
      this.animationState.rowAnimations.clear();
      this.animationState.elementAnimations.clear();
      this.startRowAnimation();
      this.handleResize();
    });

    this.eventBus.on(AppEvent.ELEMENT_PLACED, (payload) => {
      this.addElement(payload.type, payload.point);
      this.startElementAnimation('fadeIn', payload.type, payload.point);
    });

    this.eventBus.on(AppEvent.ELEMENT_REMOVED, (payload) => {
      this.startElementAnimation('fadeOut', payload.type, payload.point);
      setTimeout(() => {
        this.removeElement(payload.type, payload.point);
      }, 300);
    });

    this.eventBus.on(AppEvent.RENDER_UPDATE, () => {
      this.thumbnailDirty = true;
    });

    this.eventBus.on(AppEvent.THUMBNAIL_HOVER, (payload) => {
      this.animationState.hoverHighlight = payload.rect;
    });

    this.eventBus.on(AppEvent.SHOW_MESSAGE, (payload) => {
      this.showMessage(payload.text, payload.type);
    });

    this.mazeCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.thumbnailCanvas.addEventListener('mousemove', (e) => this.handleThumbnailHover(e));
    this.thumbnailCanvas.addEventListener('mouseleave', () => {
      this.eventBus.emit(AppEvent.THUMBNAIL_HOVER, { rect: null });
    });
  }

  private createMessageElement(): void {
    this.messageEl = document.createElement('div');
    this.messageEl.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(26, 26, 26, 0.95);
      border: 2px solid #f0d060;
      color: #f0d060;
      padding: 12px 24px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(this.messageEl);
  }

  private showMessage(text: string, type: 'info' | 'warning' | 'error'): void {
    if (!this.messageEl) return;

    const colors = {
      info: '#f0d060',
      warning: '#fbbf24',
      error: '#f87171'
    };

    this.messageEl.textContent = text;
    this.messageEl.style.borderColor = colors[type];
    this.messageEl.style.color = colors[type];
    this.messageEl.style.opacity = '1';

    setTimeout(() => {
      if (this.messageEl) {
        this.messageEl.style.opacity = '0';
      }
    }, 2500);
  }

  private handleResize(): void {
    if (!this.grid) return;

    const wrapperRect = this.mazeWrapper.getBoundingClientRect();
    const padding = 0;
    const maxWidth = wrapperRect.width - padding * 2;
    const maxHeight = wrapperRect.height - padding * 2;

    const cellByWidth = Math.floor(maxWidth / this.mazeWidth);
    const cellByHeight = Math.floor(maxHeight / this.mazeHeight);
    this.cellSize = Math.max(8, Math.min(cellByWidth, cellByHeight));

    const canvasWidth = this.mazeWidth * this.cellSize;
    const canvasHeight = this.mazeHeight * this.cellSize;

    this.mazeCanvas.width = canvasWidth;
    this.mazeCanvas.height = canvasHeight;
    this.mazeCanvas.style.width = `${canvasWidth}px`;
    this.mazeCanvas.style.height = `${canvasHeight}px`;

    const thumbSize = Math.min(150, Math.max(100, Math.min(window.innerWidth * 0.15, 180)));
    this.thumbnailCanvas.width = thumbSize;
    this.thumbnailCanvas.height = thumbSize;
    this.thumbnailCanvas.style.width = `${thumbSize}px`;
    this.thumbnailCanvas.style.height = `${thumbSize}px`;

    this.setupContexts();
    this.thumbnailDirty = true;
  }

  private startRowAnimation(): void {
    if (!this.grid) return;

    const rowCount = this.mazeHeight;
    const totalDuration = Math.min(1000, rowCount * 200);
    const rowDuration = totalDuration / rowCount;

    for (let i = 0; i < rowCount; i++) {
      this.animationState.rowAnimations.set(i, {
        startTime: performance.now() + i * rowDuration,
        duration: rowDuration
      });
    }

    this.isAnimating = true;
  }

  private startElementAnimation(type: 'fadeIn' | 'fadeOut', elementType: ElementType, point: Point): void {
    const key = `${elementType}-${point.x}-${point.y}`;
    this.animationState.elementAnimations.set(key, {
      type,
      startTime: performance.now(),
      duration: 300,
      elementType,
      point
    });
    this.isAnimating = true;
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.mazeCanvas.getBoundingClientRect();
    const scaleX = this.mazeCanvas.width / rect.width;
    const scaleY = this.mazeCanvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const cellX = Math.floor(canvasX / this.cellSize);
    const cellY = Math.floor(canvasY / this.cellSize);

    if (cellX >= 0 && cellX < this.mazeWidth && cellY >= 0 && cellY < this.mazeHeight) {
      this.eventBus.emit('cell:click' as any, { x: cellX, y: cellY });
    }
  }

  private handleThumbnailHover(e: MouseEvent): void {
    if (!this.grid) return;

    const rect = this.thumbnailCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const thumbWidth = this.thumbnailCanvas.width;
    const thumbHeight = this.thumbnailCanvas.height;

    const viewPortion = 0.25;
    const viewWidth = thumbWidth * viewPortion;
    const viewHeight = thumbHeight * viewPortion;

    let viewX = x - viewWidth / 2;
    let viewY = y - viewHeight / 2;

    viewX = Math.max(0, Math.min(viewX, thumbWidth - viewWidth));
    viewY = Math.max(0, Math.min(viewY, thumbHeight - viewHeight));

    const scaleX = this.mazeWidth / thumbWidth;
    const scaleY = this.mazeHeight / thumbHeight;

    const mazeRect = {
      x: Math.floor(viewX * scaleX),
      y: Math.floor(viewY * scaleY),
      w: Math.ceil(viewWidth * scaleX),
      h: Math.ceil(viewHeight * scaleY)
    };

    this.eventBus.emit(AppEvent.THUMBNAIL_HOVER, { rect: mazeRect });
  }

  private addElement(type: ElementType, point: Point): void {
    switch (type) {
      case 'start':
        if (!this.elements.starts.some((p) => p.x === point.x && p.y === point.y)) {
          this.elements.starts.push(point);
        }
        break;
      case 'end':
        if (!this.elements.ends.some((p) => p.x === point.x && p.y === point.y)) {
          this.elements.ends.push(point);
        }
        break;
      case 'monster':
        if (!this.elements.monsters.some((p) => p.x === point.x && p.y === point.y)) {
          this.elements.monsters.push(point);
        }
        break;
    }
    this.thumbnailDirty = true;
  }

  private removeElement(type: ElementType, point: Point): void {
    let list: Point[] | null = null;
    switch (type) {
      case 'start':
        list = this.elements.starts;
        break;
      case 'end':
        list = this.elements.ends;
        break;
      case 'monster':
        list = this.elements.monsters;
        break;
    }
    if (list) {
      const index = list.findIndex((p) => p.x === point.x && p.y === point.y);
      if (index !== -1) {
        list.splice(index, 1);
      }
    }
    this.thumbnailDirty = true;
  }

  private startAnimationLoop(): void {
    const loop = (timestamp: number) => {
      if (this.isAnimating || this.thumbnailDirty || this.animationState.hoverHighlight) {
        this.render();
        this.updateAnimations(timestamp);
      }

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private updateAnimations(timestamp: number): void {
    let hasActiveAnimations = false;

    for (const [, anim] of this.animationState.rowAnimations) {
      if (timestamp < anim.startTime + anim.duration) {
        hasActiveAnimations = true;
      }
    }

    for (const [key, anim] of this.animationState.elementAnimations) {
      if (timestamp < anim.startTime + anim.duration) {
        hasActiveAnimations = true;
      } else {
        this.animationState.elementAnimations.delete(key);
      }
    }

    this.isAnimating = hasActiveAnimations;
  }

  private render(): void {
    if (!this.grid) return;

    const ctx = this.mazeCtx;
    const now = performance.now();

    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, this.mazeCanvas.width, this.mazeCanvas.height);

    for (let y = 0; y < this.mazeHeight; y++) {
      const rowAnim = this.animationState.rowAnimations.get(y);
      let rowAlpha = 1;

      if (rowAnim) {
        const elapsed = now - rowAnim.startTime;
        if (elapsed < 0) continue;
        rowAlpha = Math.min(1, elapsed / rowAnim.duration);
      }

      for (let x = 0; x < this.mazeWidth; x++) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        if (this.grid[y][x] === 0) {
          ctx.globalAlpha = rowAlpha;
          this.drawFloor(ctx, px, py);
        } else {
          ctx.globalAlpha = 1;
          this.drawWall(ctx, px, py);
        }
      }
    }

    ctx.globalAlpha = 1;

    for (let y = 0; y < this.mazeHeight; y++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        if (this.grid[y][x] === 0) {
          const px = x * this.cellSize;
          const py = y * this.cellSize;
          this.drawFloorTexture(ctx, px, py);
        }
      }
    }

    const allElements = [
      ...this.elements.starts.map((p) => ({ type: 'start' as ElementType, point: p })),
      ...this.elements.ends.map((p) => ({ type: 'end' as ElementType, point: p })),
      ...this.elements.monsters.map((p) => ({ type: 'monster' as ElementType, point: p }))
    ];

    for (const elem of allElements) {
      const key = `${elem.type}-${elem.point.x}-${elem.point.y}`;
      const anim = this.animationState.elementAnimations.get(key);
      let alpha = 1;

      if (anim) {
        const elapsed = now - anim.startTime;
        const progress = Math.min(1, elapsed / anim.duration);
        alpha = anim.type === 'fadeIn' ? progress : 1 - progress;
      }

      if (alpha > 0) {
        ctx.globalAlpha = alpha;
        const px = elem.point.x * this.cellSize;
        const py = elem.point.y * this.cellSize;
        this.drawElement(ctx, elem.type, px, py);
      }
    }

    ctx.globalAlpha = 1;

    if (this.animationState.hoverHighlight) {
      const rect = this.animationState.hoverHighlight;
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(
        rect.x * this.cellSize,
        rect.y * this.cellSize,
        rect.w * this.cellSize,
        rect.h * this.cellSize
      );
      ctx.setLineDash([]);
    }

    if (this.thumbnailDirty) {
      this.renderThumbnail();
      this.thumbnailDirty = false;
    }
  }

  private renderThumbnail(): void {
    if (!this.grid) return;

    const ctx = this.thumbnailCtx;
    const w = this.thumbnailCanvas.width;
    const h = this.thumbnailCanvas.height;
    const cellW = w / this.mazeWidth;
    const cellH = h / this.mazeHeight;

    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < this.mazeHeight; y++) {
      for (let x = 0; x < this.mazeWidth; x++) {
        if (this.grid[y][x] === 0) {
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    const drawPoints = (points: Point[], color: string) => {
      ctx.fillStyle = color;
      for (const p of points) {
        const px = p.x * cellW + cellW / 2;
        const py = p.y * cellH + cellH / 2;
        const r = Math.max(2, Math.min(cellW, cellH) * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawPoints(this.elements.starts, COLORS.start);
    drawPoints(this.elements.ends, COLORS.end);
    drawPoints(this.elements.monsters, COLORS.monster);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }

  private drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(x, y, this.cellSize, this.cellSize);
  }

  private drawFloorTexture(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const s = this.cellSize;
    ctx.fillStyle = 'rgba(0,0,0,0.08)';

    const pixelSize = Math.max(1, Math.floor(s / 16));

    for (let py = 0; py < 16; py++) {
      for (let px = 0; px < 16; px++) {
        if ((px + py) % 7 === 0 && (px * py) % 11 > 7) {
          ctx.fillRect(
            x + px * pixelSize,
            y + py * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, s, pixelSize);
    ctx.fillRect(x, y, pixelSize, s);
  }

  private drawWall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const s = this.cellSize;
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x, y, s, s);

    const pixelSize = Math.max(1, Math.floor(s / 16));

    ctx.fillStyle = '#252525';
    for (let py = 0; py < 16; py++) {
      for (let px = 0; px < 16; px++) {
        if ((px < 2 || px > 13 || py < 2 || py > 13) && (px + py) % 3 !== 0) {
          ctx.fillRect(
            x + px * pixelSize,
            y + py * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y + s - pixelSize, s, pixelSize);
    ctx.fillRect(x + s - pixelSize, y, pixelSize, s);
  }

  private drawElement(ctx: CanvasRenderingContext2D, type: ElementType, x: number, y: number): void {
    const s = this.cellSize;
    const padding = Math.max(2, Math.floor(s * 0.15));
    const size = s - padding * 2;

    switch (type) {
      case 'start':
        this.drawStartSprite(ctx, x + padding, y + padding, size);
        break;
      case 'end':
        this.drawEndSprite(ctx, x + padding, y + padding, size);
        break;
      case 'monster':
        this.drawMonsterSprite(ctx, x + padding, y + padding, size);
        break;
    }
  }

  private drawStartSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const p = Math.max(1, Math.floor(size / 16));

    const startPattern = [
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0],
      [0, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0],
      [1, 1, 2, 2, 3, 3, 3, 4, 4, 3, 3, 3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 3, 3, 3, 2, 2, 1],
      [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 3, 3, 3, 2, 2, 1],
      [1, 1, 2, 2, 3, 3, 3, 4, 4, 3, 3, 3, 2, 2, 1, 1],
      [0, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0],
      [0, 0, 1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
    ];

    const colors = ['transparent', '#166534', '#15803d', '#22c55e', '#4ade80'];
    this.drawPixelPattern(ctx, startPattern, colors, x, y, p);
  }

  private drawEndSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const p = Math.max(1, Math.floor(size / 16));

    const endPattern = [
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0],
      [0, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1, 1, 0],
      [1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 1],
      [1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 2, 1],
      [1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
      [1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
      [1, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 2, 1],
      [1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 1],
      [1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1],
      [0, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2, 1, 1, 0],
      [0, 0, 1, 1, 2, 2, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]
    ];

    const colors = ['transparent', '#7f1d1d', '#991b1b', '#ef4444', '#f87171'];
    this.drawPixelPattern(ctx, endPattern, colors, x, y, p);
  }

  private drawMonsterSprite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const p = Math.max(1, Math.floor(size / 16));

    const monsterPattern = [
      [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 2, 2, 2, 3, 3, 2, 2, 2, 1, 1, 0, 0],
      [0, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0],
      [1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3, 4, 0, 4, 4, 0, 4, 3, 3, 2, 2, 1],
      [1, 2, 3, 3, 4, 4, 0, 4, 4, 0, 4, 4, 3, 3, 2, 1],
      [1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1],
      [1, 2, 3, 4, 0, 4, 4, 3, 3, 4, 4, 0, 4, 3, 2, 1],
      [1, 2, 3, 4, 4, 0, 3, 3, 3, 3, 0, 4, 4, 3, 2, 1],
      [1, 1, 2, 3, 4, 4, 3, 0, 0, 3, 4, 4, 3, 2, 1, 1],
      [0, 1, 1, 2, 3, 4, 4, 4, 4, 4, 4, 3, 2, 1, 1, 0],
      [0, 0, 1, 1, 2, 3, 3, 4, 4, 3, 3, 2, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 2, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0]
    ];

    const colors = ['transparent', '#581c87', '#7e22ce', '#a855f7', '#c084fc'];
    this.drawPixelPattern(ctx, monsterPattern, colors, x, y, p);
  }

  private drawPixelPattern(
    ctx: CanvasRenderingContext2D,
    pattern: number[][],
    colors: string[],
    x: number,
    y: number,
    pixelSize: number
  ): void {
    for (let py = 0; py < pattern.length; py++) {
      for (let px = 0; px < pattern[py].length; px++) {
        const colorIndex = pattern[py][px];
        if (colorIndex !== 0) {
          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(
            x + px * pixelSize,
            y + py * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }
}
