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
  clickScale: number;
  clickAnimTime: number;
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
  private events: HexMapEvents;
  private lastTime = 0;
  private explorationTimer = 0;
  private rotationTime = 0;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement, events: HexMapEvents = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.events = events;
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
          clickScale: 1,
          clickAnimTime: -1,
        };
        this.cells.push(cell);
      }
    }
    this.updatePositions();
  }

  private updatePositions(): void {
    const mapWidth = COLS * HEX_WIDTH * 0.75 + HEX_WIDTH * 0.25;
    const mapHeight = ROWS * HEX_HEIGHT + HEX_HEIGHT * 0.5;
    this.offsetX = (this.canvas.width - mapWidth) / 2 + HEX_RADIUS;
    this.offsetY = (this.canvas.height - mapHeight) / 2 + HEX_HEIGHT / 2;

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
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.updatePositions();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('resize', () => this.resize());
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = this.findCellAt(x, y);
    const newId = cell ? cell.id : null;
    if (newId !== this.hoveredId) {
      this.hoveredId = newId;
    }
  }

  private onMouseLeave(): void {
    this.hoveredId = null;
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = this.findCellAt(x, y);
    if (!cell || cell.resource === 'obstacle') return;

    cell.clickAnimTime = 0;

    if (this.selectedId === cell.id) {
      cell.isSelected = false;
      this.selectedId = null;
      this.events.onSelect?.(null);
    } else {
      const prevSelected = this.cells.find((c) => c.id === this.selectedId);
      if (prevSelected) prevSelected.isSelected = false;
      cell.isSelected = true;
      this.selectedId = cell.id;
      this.events.onSelect?.(cell);
    }
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

  private drawHexagon(
    cx: number,
    cy: number,
    radius: number,
    scale: number = 1
  ): void {
    const r = radius * scale;
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
  }

  private drawGlowRing(
    cx: number,
    cy: number,
    rotation: number
  ): void {
    const ringRadius = HEX_RADIUS + 10;
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.shadowColor = '#e0f2fe';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const totalArc = Math.PI * 1.2;
    const start = 0;
    const end = start + totalArc;

    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, start, end);
    ctx.stroke();

    ctx.restore();
  }

  update(deltaTime: number): void {
    this.rotationTime += deltaTime;

    for (const cell of this.cells) {
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
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const cell of this.cells) {
      const isHovered = this.hoveredId === cell.id;
      const targetHoverScale = isHovered ? 1.05 : 1;
      cell.hoverScale += (targetHoverScale - cell.hoverScale) * 0.2;

      const totalScale = cell.hoverScale * cell.clickScale;

      if (isHovered && cell.resource !== 'obstacle') {
        ctx.save();
        ctx.shadowColor = '#9ca3af';
        ctx.shadowBlur = 10;
        this.drawHexagon(cell.centerX, cell.centerY, HEX_RADIUS, totalScale);
        ctx.fillStyle = RESOURCE_COLORS[cell.resource];
        ctx.fill();
        ctx.restore();
      } else {
        this.drawHexagon(cell.centerX, cell.centerY, HEX_RADIUS, totalScale);
        ctx.fillStyle = RESOURCE_COLORS[cell.resource];
        ctx.fill();
      }

      ctx.save();
      ctx.strokeStyle = cell.isSelected ? '#e0f2fe' : '#1f2937';
      ctx.lineWidth = 2;
      this.drawHexagon(cell.centerX, cell.centerY, HEX_RADIUS, totalScale);
      ctx.stroke();
      ctx.restore();

      if (cell.resource !== 'obstacle') {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(RESOURCE_NAMES[cell.resource], cell.centerX, cell.centerY);
        ctx.restore();
      }

      if (cell.isSelected) {
        this.drawGlowRing(cell.centerX, cell.centerY, this.rotationTime * 2);
      }
    }
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
