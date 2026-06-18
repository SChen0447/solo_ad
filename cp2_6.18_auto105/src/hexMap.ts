export type ResourceType = 'iron' | 'crystal' | 'gas' | 'obstacle';

export interface HexCell {
  id: string;
  col: number;
  row: number;
  centerX: number;
  centerY: number;
  resource: ResourceType;
  isSelected: boolean;
  annualOutput: number;
  exploration: number;
  efficiency: number;
  hoverScale: number;
  targetHoverScale: number;
  clickScale: number;
  clickAnimTime: number;
  isDirty: boolean;
  prevHoverScale: number;
  prevClickScale: number;
  prevIsSelected: boolean;
}

export interface HexMapState {
  cells: HexCell[];
  selectedId: string | null;
}

export interface HexMapEvents {
  onSelect?: (cell: HexCell | null) => void;
  onUpdate?: (cell: HexCell) => void;
  onEfficiencyChange?: (cell: HexCell) => void;
}

const HEX_RADIUS = 40;
const HEX_SIDE = 34;
const HEX_WIDTH = 2 * HEX_RADIUS;
const HEX_HEIGHT = Math.sqrt(3) * HEX_RADIUS;
const COLS = 6;
const ROWS = 8;
const OBSTACLE_RATIO = 0.1;

const RESOURCE_COLORS: Record<ResourceType, string> = {
  iron: '#9ca3af',
  crystal: '#8b5cf6',
  gas: '#a3e635',
  obstacle: '#4b5563',
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
  iron: '铁矿',
  crystal: '水晶',
  gas: '气体',
  obstacle: '障碍物',
};

export class HexMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: HexCell[] = [];
  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private prevHoveredId: string | null = null;
  private events: HexMapEvents;
  private lastTime = 0;
  private explorationTimer = 0;
  private rotationTime = 0;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;

  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private offscreenValid = false;
  private canvasWidth = 0;
  private canvasHeight = 0;

  private dirtyCells: Set<string> = new Set();
  private globalDirty = true;

  private boundResize: () => void;

  constructor(canvas: HTMLCanvasElement, events: HexMapEvents = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.events = events;
    this.boundResize = () => this.resize();
    this.generateMap();
    this.bindEvents();
    this.resize();
  }

  getState(): HexMapState {
    return { cells: [...this.cells], selectedId: this.selectedId };
  }

  getSelectedCell(): HexCell | null {
    if (!this.selectedId) return null;
    return this.cells.find((c) => c.id === this.selectedId) || null;
  }

  getDeployedCells(): HexCell[] {
    return this.cells.filter((c) => c.isSelected && c.resource !== 'obstacle');
  }

  setEfficiency(id: string, efficiency: number): void {
    const cell = this.cells.find((c) => c.id === id);
    if (cell) {
      cell.efficiency = Math.max(0.5, Math.min(2.0, efficiency));
      this.events.onEfficiencyChange?.(cell);
    }
  }

  private generateMap(): void {
    const resources: ResourceType[] = ['iron', 'crystal', 'gas'];
    this.cells = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const isObstacle = Math.random() < OBSTACLE_RATIO;
        const resource: ResourceType = isObstacle
          ? 'obstacle'
          : resources[Math.floor(Math.random() * resources.length)];
        const annualOutput =
          resource === 'obstacle' ? 0 : 50 + Math.floor(Math.random() * 151);
        const cell: HexCell = {
          id: `hex-${col}-${row}`,
          col,
          row,
          centerX: 0,
          centerY: 0,
          resource,
          isSelected: false,
          annualOutput,
          exploration: 0,
          efficiency: 1.0,
          hoverScale: 1,
          targetHoverScale: 1,
          clickScale: 1,
          clickAnimTime: -1,
          isDirty: true,
          prevHoverScale: 0,
          prevClickScale: 0,
          prevIsSelected: false,
        };
        this.cells.push(cell);
      }
    }
    this.globalDirty = true;
    this.offscreenValid = false;
  }

  private updatePositions(): void {
    const mapWidth = COLS * HEX_WIDTH * 0.75 + HEX_WIDTH * 0.25;
    const mapHeight = ROWS * HEX_HEIGHT + HEX_HEIGHT * 0.5;
    const cssWidth = this.canvas.getBoundingClientRect().width;
    const cssHeight = this.canvas.getBoundingClientRect().height;
    this.offsetX = (cssWidth - mapWidth) / 2 + HEX_RADIUS;
    this.offsetY = (cssHeight - mapHeight) / 2 + HEX_HEIGHT / 2;

    for (const cell of this.cells) {
      const x = this.offsetX + cell.col * HEX_WIDTH * 0.75;
      const y =
        this.offsetY +
        cell.row * HEX_HEIGHT +
        (cell.col % 2 === 1 ? HEX_HEIGHT / 2 : 0);
      cell.centerX = x;
      cell.centerY = y;
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (this.offscreenCtx) {
      this.offscreenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    this.updatePositions();
    this.globalDirty = true;
    this.offscreenValid = false;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('resize', this.boundResize);
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = this.findCellAt(x, y);
    const newId = cell ? cell.id : null;
    if (newId !== this.hoveredId) {
      if (this.hoveredId) {
        const prevCell = this.cells.find((c) => c.id === this.hoveredId);
        if (prevCell) {
          prevCell.targetHoverScale = 1;
          prevCell.isDirty = true;
          this.dirtyCells.add(prevCell.id);
        }
      }
      this.hoveredId = newId;
      if (newId) {
        const newCell = this.cells.find((c) => c.id === newId);
        if (newCell) {
          newCell.targetHoverScale = 1.05;
          newCell.isDirty = true;
          this.dirtyCells.add(newCell.id);
        }
      }
      this.globalDirty = true;
    }
  }

  private onMouseLeave(): void {
    if (this.hoveredId) {
      const prevCell = this.cells.find((c) => c.id === this.hoveredId);
      if (prevCell) {
        prevCell.targetHoverScale = 1;
        prevCell.isDirty = true;
        this.dirtyCells.add(prevCell.id);
      }
      this.hoveredId = null;
      this.globalDirty = true;
    }
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = this.findCellAt(x, y);
    if (!cell || cell.resource === 'obstacle') return;

    cell.clickAnimTime = 0;
    cell.isDirty = true;
    this.dirtyCells.add(cell.id);

    if (this.selectedId === cell.id) {
      cell.isSelected = false;
      this.selectedId = null;
      this.events.onSelect?.(null);
    } else {
      const prevSelected = this.cells.find((c) => c.id === this.selectedId);
      if (prevSelected) {
        prevSelected.isSelected = false;
        prevSelected.isDirty = true;
        this.dirtyCells.add(prevSelected.id);
      }
      cell.isSelected = true;
      this.selectedId = cell.id;
      this.events.onSelect?.(cell);
    }
    this.globalDirty = true;
  }

  private findCellAt(x: number, y: number): HexCell | null {
    for (const cell of this.cells) {
      const dx = x - cell.centerX;
      const dy = y - cell.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HEX_SIDE) return cell;
    }
    return null;
  }

  private drawHexagonPath(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    scale: number = 1
  ): void {
    const r = radius * scale;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawStaticLayer(): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;
    const ctx = this.offscreenCtx;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    for (const cell of this.cells) {
      ctx.save();
      this.drawHexagonPath(ctx, cell.centerX, cell.centerY, HEX_RADIUS, 1);
      ctx.fillStyle = RESOURCE_COLORS[cell.resource];
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (cell.resource !== 'obstacle') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          RESOURCE_NAMES[cell.resource],
          cell.centerX,
          cell.centerY
        );
        ctx.restore();
      }
    }

    ctx.restore();
    this.offscreenValid = true;
  }

  private getCellBBox(cell: HexCell): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    const padding = 20;
    const maxRadius = HEX_RADIUS * 1.1 + padding;
    return {
      x: Math.floor(cell.centerX - maxRadius),
      y: Math.floor(cell.centerY - maxRadius),
      w: Math.ceil(maxRadius * 2),
      h: Math.ceil(maxRadius * 2),
    };
  }

  private drawGlowRing(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rotation: number
  ): void {
    const ringRadius = HEX_RADIUS + 10;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.shadowColor = '#e0f2fe';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const totalArc = Math.PI * 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, totalArc);
    ctx.stroke();

    ctx.restore();
  }

  private redrawCellOverlays(cell: HexCell): void {
    const ctx = this.ctx;
    const totalScale = cell.hoverScale * cell.clickScale;

    if (cell.hoverScale !== 1 || cell.clickScale !== 1) {
      const bbox = this.getCellBBox(cell);
      ctx.save();
      if (cell.hoverScale > 1 && cell.resource !== 'obstacle') {
        ctx.shadowColor = '#9ca3af';
        ctx.shadowBlur = 10;
      }
      this.drawHexagonPath(ctx, cell.centerX, cell.centerY, HEX_RADIUS, totalScale);
      ctx.fillStyle = RESOURCE_COLORS[cell.resource];
      ctx.fill();
      ctx.restore();

      ctx.save();
      this.drawHexagonPath(ctx, cell.centerX, cell.centerY, HEX_RADIUS, totalScale);
      ctx.strokeStyle = cell.isSelected ? '#e0f2fe' : '#1f2937';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (cell.resource !== 'obstacle') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          RESOURCE_NAMES[cell.resource],
          cell.centerX,
          cell.centerY
        );
        ctx.restore();
      }
      void bbox;
    }

    if (cell.isSelected) {
      this.drawGlowRing(ctx, cell.centerX, cell.centerY, this.rotationTime * 2);
    }
  }

  update(deltaTime: number): void {
    this.rotationTime += deltaTime;

    for (const cell of this.cells) {
      let changed = false;

      if (cell.clickAnimTime >= 0) {
        cell.clickAnimTime += deltaTime;
        const t = Math.min(cell.clickAnimTime / 0.3, 1);
        if (t < 0.5) {
          cell.clickScale = 1 - 0.1 * (t / 0.5);
        } else {
          cell.clickScale = 0.9 + 0.1 * ((t - 0.5) / 0.5);
        }
        if (t >= 1) {
          cell.clickAnimTime = -1;
          cell.clickScale = 1;
        }
        changed = true;
      }

      if (cell.hoverScale !== cell.targetHoverScale) {
        const diff = cell.targetHoverScale - cell.hoverScale;
        cell.hoverScale += diff * 0.2;
        if (Math.abs(cell.hoverScale - cell.targetHoverScale) < 0.001) {
          cell.hoverScale = cell.targetHoverScale;
        }
        changed = true;
      }

      if (
        changed ||
        cell.hoverScale !== cell.prevHoverScale ||
        cell.clickScale !== cell.prevClickScale ||
        cell.isSelected !== cell.prevIsSelected
      ) {
        cell.isDirty = true;
        this.dirtyCells.add(cell.id);
        cell.prevHoverScale = cell.hoverScale;
        cell.prevClickScale = cell.clickScale;
        cell.prevIsSelected = cell.isSelected;
      }
    }

    this.explorationTimer += deltaTime;
    if (this.explorationTimer >= 2) {
      this.explorationTimer = 0;
      for (const cell of this.cells) {
        if (cell.isSelected && cell.exploration < 100) {
          cell.exploration = Math.min(100, cell.exploration + 1);
          this.events.onUpdate?.(cell);
        }
      }
    }
  }

  render(): void {
    const ctx = this.ctx;

    if (!this.offscreenValid) {
      this.drawStaticLayer();
    }

    if (this.dirtyCells.size === 0 && !this.globalDirty) {
      if (this.selectedId) {
        const selected = this.cells.find((c) => c.id === this.selectedId);
        if (selected) {
          const bbox = this.getCellBBox(selected);
          ctx.clearRect(bbox.x - 2, bbox.y - 2, bbox.w + 4, bbox.h + 4);
          if (this.offscreenCanvas) {
            ctx.drawImage(
              this.offscreenCanvas,
              (bbox.x - 2) * this.dpr,
              (bbox.y - 2) * this.dpr,
              (bbox.w + 4) * this.dpr,
              (bbox.h + 4) * this.dpr,
              bbox.x - 2,
              bbox.y - 2,
              bbox.w + 4,
              bbox.h + 4
            );
          }
          this.drawGlowRing(
            ctx,
            selected.centerX,
            selected.centerY,
            this.rotationTime * 2
          );
        }
      }
      return;
    }

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    if (this.offscreenCanvas) {
      ctx.drawImage(
        this.offscreenCanvas,
        0,
        0,
        this.canvasWidth,
        this.canvasHeight
      );
    }

    const affectedCells: Set<string> = new Set();
    for (const id of this.dirtyCells) {
      affectedCells.add(id);
    }
    if (this.selectedId) {
      affectedCells.add(this.selectedId);
    }
    if (this.prevHoveredId) {
      affectedCells.add(this.prevHoveredId);
    }

    const bboxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const id of affectedCells) {
      const cell = this.cells.find((c) => c.id === id);
      if (cell) {
        bboxes.push(this.getCellBBox(cell));
        cell.isDirty = false;
      }
    }

    for (const bbox of bboxes) {
      if (this.offscreenCanvas) {
        ctx.clearRect(bbox.x - 2, bbox.y - 2, bbox.w + 4, bbox.h + 4);
        ctx.drawImage(
          this.offscreenCanvas,
          (bbox.x - 2) * this.dpr,
          (bbox.y - 2) * this.dpr,
          (bbox.w + 4) * this.dpr,
          (bbox.h + 4) * this.dpr,
          bbox.x - 2,
          bbox.y - 2,
          bbox.w + 4,
          bbox.h + 4
        );
      }
    }

    for (const id of affectedCells) {
      const cell = this.cells.find((c) => c.id === id);
      if (cell) {
        this.redrawCellOverlays(cell);
      }
    }

    this.dirtyCells.clear();
    this.prevHoveredId = this.hoveredId;
    this.globalDirty = false;
  }

  startLoop(): void {
    const loop = (time: number): void => {
      const dt = this.lastTime === 0 ? 0 : (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
