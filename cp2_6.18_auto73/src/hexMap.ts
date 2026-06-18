import {
  HexCell,
  ResourceType,
  EventListener,
  GameEvent,
  HEX_SIZE,
  GRID_COLS,
  GRID_ROWS,
  COLORS,
} from './types';

export class HexMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: HexCell[] = [];
  private listeners: EventListener[] = [];
  private hexVertices: { x: number; y: number }[] = [];
  private animationFrameId: number | null = null;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.precomputeHexVertices();
    this.resizeCanvas();
    this.generateMap();
    this.bindEvents();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      this.calculateOffsets(rect.width, rect.height);
    }
  }

  private calculateOffsets(containerWidth: number, containerHeight: number): void {
    const gridPixelWidth = (GRID_COLS - 1) * HEX_SIZE * 1.5 + HEX_SIZE * 2;
    const gridPixelHeight = (GRID_ROWS - 1) * HEX_SIZE * Math.sqrt(3) + HEX_SIZE * 2;
    this.offsetX = (containerWidth - gridPixelWidth) / 2;
    this.offsetY = (containerHeight - gridPixelHeight) / 2;
    this.updateCellPositions();
  }

  private updateCellPositions(): void {
    for (const cell of this.cells) {
      const pos = this.hexToPixel(cell.q, cell.r);
      cell.x = pos.x;
      cell.y = pos.y;
    }
  }

  private precomputeHexVertices(): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      this.hexVertices.push({
        x: HEX_SIZE * Math.cos(angle),
        y: HEX_SIZE * Math.sin(angle),
      });
    }
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = HEX_SIZE * (3 / 2) * q;
    const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return {
      x: x + this.offsetX + HEX_SIZE,
      y: y + this.offsetY + HEX_SIZE,
    };
  }

  private generateMap(): void {
    this.cells = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let q = 0; q < GRID_COLS; q++) {
        const type = this.getRandomResourceType();
        const pos = this.hexToPixel(q, r);
        const cell: HexCell = {
          id: `${q}-${r}`,
          q,
          r,
          x: pos.x,
          y: pos.y,
          type,
          selected: false,
          explored: Math.floor(Math.random() * 30),
          efficiency: 1.0,
          annualOutput: type === 'obstacle' ? 0 : Math.floor(Math.random() * 151) + 50,
          hovered: false,
          pulseScale: 1,
          rotationAngle: 0,
        };
        this.cells.push(cell);
      }
    }
  }

  private getRandomResourceType(): ResourceType {
    const rand = Math.random();
    if (rand < 0.1) return 'obstacle';
    if (rand < 0.4) return 'iron';
    if (rand < 0.7) return 'crystal';
    return 'gas';
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
  }

  private getMousePosition(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private getCellAtPosition(x: number, y: number): HexCell | null {
    for (const cell of this.cells) {
      const dx = x - cell.x;
      const dy = y - cell.y;
      if (Math.sqrt(dx * dx + dy * dy) <= HEX_SIZE) {
        return cell;
      }
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getMousePosition(e);
    const hoveredCell = this.getCellAtPosition(pos.x, pos.y);
    
    for (const cell of this.cells) {
      cell.hovered = cell === hoveredCell;
    }
  }

  private handleMouseLeave(): void {
    for (const cell of this.cells) {
      cell.hovered = false;
    }
  }

  private handleClick(e: MouseEvent): void {
    const pos = this.getMousePosition(e);
    const clickedCell = this.getCellAtPosition(pos.x, pos.y);
    
    if (!clickedCell || clickedCell.type === 'obstacle') return;

    const wasSelected = clickedCell.selected;

    for (const cell of this.cells) {
      cell.selected = false;
    }

    if (!wasSelected) {
      clickedCell.selected = true;
      clickedCell.pulseScale = 0.9;
      this.emit({ type: 'cell-selected', data: clickedCell });
    } else {
      this.emit({ type: 'cell-deselected' });
    }
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public addEventListener(listener: EventListener): void {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: EventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  public getCells(): HexCell[] {
    return this.cells;
  }

  public getSelectedCell(): HexCell | null {
    return this.cells.find((c) => c.selected) || null;
  }

  public updateExploration(): void {
    let updated = false;
    for (const cell of this.cells) {
      if (cell.selected && cell.explored < 100) {
        cell.explored = Math.min(100, cell.explored + 1);
        updated = true;
      }
    }
    if (updated) {
      this.emit({ type: 'exploration-updated', data: this.getSelectedCell() });
    }
  }

  public updateEfficiency(cellId: string, efficiency: number): void {
    const cell = this.cells.find((c) => c.id === cellId);
    if (cell) {
      cell.efficiency = efficiency;
      this.emit({ type: 'efficiency-changed', data: cell });
    }
  }

  public render(deltaTime: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (const cell of this.cells) {
      if (cell.selected) {
        cell.rotationAngle += deltaTime * Math.PI * 2;
        if (cell.rotationAngle >= Math.PI * 2) {
          cell.rotationAngle -= Math.PI * 2;
        }
      }

      if (cell.pulseScale !== 1) {
        cell.pulseScale += (1 - cell.pulseScale) * deltaTime * 5;
        if (Math.abs(cell.pulseScale - 1) < 0.001) {
          cell.pulseScale = 1;
        }
      }

      this.drawHex(cell);
    }
  }

  private drawHex(cell: HexCell): void {
    const ctx = this.ctx;
    let scale = 1;
    
    if (cell.hovered) scale = 1.05;
    if (cell.pulseScale !== 1) scale = cell.pulseScale;

    ctx.save();
    ctx.translate(cell.x, cell.y);
    ctx.scale(scale, scale);

    if (cell.hovered && cell.type !== 'obstacle') {
      ctx.shadowColor = COLORS.hoverGlow;
      ctx.shadowBlur = 15;
    }

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const v = this.hexVertices[i];
      if (i === 0) {
        ctx.moveTo(v.x, v.y);
      } else {
        ctx.lineTo(v.x, v.y);
      }
    }
    ctx.closePath();

    const fillColor = cell.type === 'obstacle' 
      ? COLORS.obstacle 
      : COLORS[cell.type as Exclude<ResourceType, 'obstacle'>];
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (cell.selected) {
      this.drawGlowRing(cell);
    }

    ctx.restore();
  }

  private drawGlowRing(cell: HexCell): void {
    const ctx = this.ctx;
    const ringRadius = HEX_SIZE + 8;
    const arcLength = Math.PI / 3;
    const gap = Math.PI / 6;

    ctx.save();
    ctx.rotate(cell.rotationAngle);

    for (let i = 0; i < 4; i++) {
      const startAngle = i * (arcLength + gap);
      const endAngle = startAngle + arcLength;

      const gradient = ctx.createRadialGradient(0, 0, ringRadius - 4, 0, 0, ringRadius + 4);
      gradient.addColorStop(0, 'rgba(224, 242, 254, 0)');
      gradient.addColorStop(0.5, 'rgba(224, 242, 254, 0.8)');
      gradient.addColorStop(1, 'rgba(224, 242, 254, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, startAngle, endAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.shadowColor = COLORS.glow;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  public startAnimationLoop(onUpdate?: (deltaTime: number) => void): void {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      this.render(deltaTime);
      if (onUpdate) {
        onUpdate(deltaTime);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.stopAnimationLoop();
    this.listeners = [];
  }
}
