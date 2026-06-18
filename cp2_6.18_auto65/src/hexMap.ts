export type ResourceType = 'iron' | 'crystal' | 'gas' | 'obstacle' | 'empty';

export interface HexCell {
  q: number;
  r: number;
  x: number;
  y: number;
  resource: ResourceType;
  selected: boolean;
  hovered: boolean;
  pulseScale: number;
  pulseTarget: number;
  annualOutput: number;
  exploration: number;
  efficiency: number;
}

export interface HexMapOptions {
  rows: number;
  cols: number;
  hexSize: number;
  canvas: HTMLCanvasElement;
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  iron: '#9ca3af',
  crystal: '#8b5cf6',
  gas: '#a3e635',
  obstacle: '#4b5563',
  empty: '#1f2937',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  iron: '铁矿',
  crystal: '水晶',
  gas: '气体',
  obstacle: '障碍物',
  empty: '空地',
};

export class HexMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rows: number;
  private cols: number;
  private hexSize: number;
  private hexes: HexCell[] = [];
  private selectedHex: HexCell | null = null;
  private hoveredHex: HexCell | null = null;
  private glowRotation = 0;
  private explorationTimer: number | null = null;
  private animationFrameId: number | null = null;
  private lastTime = 0;

  public onSelectionChange?: (hex: HexCell | null) => void;
  public onEfficiencyChange?: (hex: HexCell) => void;
  public onExplorationChange?: (hex: HexCell) => void;

  constructor(options: HexMapOptions) {
    this.canvas = options.canvas;
    this.ctx = options.canvas.getContext('2d')!;
    this.rows = options.rows;
    this.cols = options.cols;
    this.hexSize = options.hexSize;

    this.initGrid();
    this.bindEvents();
    this.startExplorationTimer();
    this.startAnimationLoop();
  }

  private initGrid(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const pos = this.hexToPixel(q, r);
        const resource = this.randomResource();
        const annualOutput = resource === 'obstacle' ? 0 : Math.floor(Math.random() * 151) + 50;

        const hex: HexCell = {
          q,
          r,
          x: pos.x,
          y: pos.y,
          resource,
          selected: false,
          hovered: false,
          pulseScale: 1,
          pulseTarget: 1,
          annualOutput,
          exploration: 0,
          efficiency: 1.0,
        };
        this.hexes.push(hex);
      }
    }

    const centerX = this.getGridWidth() / 2 + this.hexSize;
    const centerY = this.getGridHeight() / 2 + this.hexSize;
    for (const hex of this.hexes) {
      hex.x += this.canvas.width / 2 - centerX;
      hex.y += 300 - centerY;
    }
  }

  private getGridWidth(): number {
    return (this.cols - 1) * this.hexSize * 1.5 + this.hexSize * 2;
  }

  private getGridHeight(): number {
    const rowHeight = this.hexSize * Math.sqrt(3);
    return this.rows * rowHeight + rowHeight / 2;
  }

  private randomResource(): ResourceType {
    const rand = Math.random();
    if (rand < 0.1) return 'obstacle';
    if (rand < 0.45) return 'iron';
    if (rand < 0.75) return 'crystal';
    return 'gas';
  }

  private hexToPixel(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * 1.5 * q;
    const y = this.hexSize * Math.sqrt(3) * (r + (q % 2) * 0.5);
    return { x, y };
  }

  private pixelToHex(px: number, py: number): { q: number; r: number } | null {
    let closest: { q: number; r: number; dist: number } | null = null;
    for (const hex of this.hexes) {
      const dist = Math.sqrt((px - hex.x) ** 2 + (py - hex.y) ** 2);
      if (!closest || dist < closest.dist) {
        closest = { q: hex.q, r: hex.r, dist };
      }
    }
    if (closest && closest.dist < this.hexSize * 0.9) {
      return { q: closest.q, r: closest.r };
    }
    return null;
  }

  private getHexAt(q: number, r: number): HexCell | undefined {
    return this.hexes.find((h) => h.q === q && h.r === r);
  }

  private drawHex(
    x: number,
    y: number,
    size: number,
    fillColor: string,
    strokeColor?: string,
    lineWidth = 2
  ): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const hx = x + size * Math.cos(angle);
      const hy = y + size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  private drawGlowBorder(x: number, y: number, size: number, rotation: number): void {
    const ctx = this.ctx;
    const glowSize = size + 8;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.shadowColor = '#e0f2fe';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    const segments = 60;
    const gapAngle = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
      const angle = i * gapAngle;
      const radius = glowSize + Math.sin(angle * 3) * 2;
      const px = radius * Math.cos(angle);
      const py = radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  private drawResourceIcon(hex: HexCell): void {
    if (hex.resource === 'obstacle' || hex.resource === 'empty') {
      return;
    }

    const ctx = this.ctx;
    const x = hex.x;
    const y = hex.y;
    const iconSize = this.hexSize * 0.35;

    ctx.save();

    if (hex.resource === 'iron') {
      ctx.fillStyle = '#d1d5db';
      ctx.beginPath();
      ctx.moveTo(x - iconSize, y + iconSize * 0.5);
      ctx.lineTo(x - iconSize * 0.5, y - iconSize);
      ctx.lineTo(x + iconSize * 0.5, y - iconSize * 0.5);
      ctx.lineTo(x + iconSize, y + iconSize * 0.8);
      ctx.lineTo(x + iconSize * 0.3, y + iconSize);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      ctx.moveTo(x - iconSize * 0.3, y - iconSize * 0.2);
      ctx.lineTo(x + iconSize * 0.2, y + iconSize * 0.3);
      ctx.lineTo(x - iconSize * 0.1, y + iconSize * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (hex.resource === 'crystal') {
      ctx.fillStyle = '#a78bfa';
      ctx.beginPath();
      ctx.moveTo(x, y - iconSize);
      ctx.lineTo(x + iconSize * 0.7, y - iconSize * 0.2);
      ctx.lineTo(x + iconSize * 0.5, y + iconSize * 0.8);
      ctx.lineTo(x - iconSize * 0.5, y + iconSize * 0.8);
      ctx.lineTo(x - iconSize * 0.7, y - iconSize * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(x, y - iconSize);
      ctx.lineTo(x + iconSize * 0.3, y - iconSize * 0.3);
      ctx.lineTo(x - iconSize * 0.2, y + iconSize * 0.2);
      ctx.closePath();
      ctx.fill();
    } else if (hex.resource === 'gas') {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, iconSize);
      gradient.addColorStop(0, 'rgba(163, 230, 53, 0.8)');
      gradient.addColorStop(0.5, 'rgba(163, 230, 53, 0.4)');
      gradient.addColorStop(1, 'rgba(163, 230, 53, 0.1)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, iconSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x - iconSize * 0.3, y - iconSize * 0.2, iconSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawObstacle(hex: HexCell): void {
    const ctx = this.ctx;
    const x = hex.x;
    const y = hex.y;
    const size = this.hexSize * 0.5;

    ctx.save();
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(x - size, y + size * 0.4);
    ctx.lineTo(x - size * 0.5, y - size * 0.8);
    ctx.lineTo(x + size * 0.3, y - size * 0.6);
    ctx.lineTo(x + size * 0.8, y + size * 0.2);
    ctx.lineTo(x + size * 0.5, y + size * 0.7);
    ctx.lineTo(x - size * 0.3, y + size * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y - size * 0.3);
    ctx.lineTo(x + size * 0.1, y - size * 0.1);
    ctx.lineTo(x - size * 0.1, y + size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private render(deltaTime: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.glowRotation += deltaTime * Math.PI * 2;

    for (const hex of this.hexes) {
      let scale = hex.pulseScale;
      if (hex.hovered && !hex.selected) {
        scale *= 1.05;
      }

      const size = this.hexSize * scale;
      const fillColor = RESOURCE_COLORS[hex.resource];
      const strokeColor = hex.selected ? '#e0f2fe' : '#374151';

      if (hex.hovered && !hex.selected) {
        ctx.save();
        ctx.shadowColor = '#9ca3af';
        ctx.shadowBlur = 10;
        this.drawHex(hex.x, hex.y, size, fillColor, strokeColor, 2);
        ctx.restore();
      } else {
        this.drawHex(hex.x, hex.y, size, fillColor, strokeColor, 2);
      }

      if (hex.selected) {
        this.drawGlowBorder(hex.x, hex.y, size, this.glowRotation);
      }

      if (hex.resource === 'obstacle') {
        this.drawObstacle(hex);
      } else if (hex.resource !== 'empty') {
        this.drawResourceIcon(hex);
      }

      const diff = hex.pulseTarget - hex.pulseScale;
      if (Math.abs(diff) > 0.001) {
        hex.pulseScale += diff * deltaTime * 10;
      } else {
        hex.pulseScale = hex.pulseTarget;
      }
    }
  }

  private startAnimationLoop(): void {
    const loop = (time: number) => {
      const deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0;
      this.lastTime = time;
      this.render(Math.min(deltaTime, 0.1));
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private startExplorationTimer(): void {
    this.explorationTimer = window.setInterval(() => {
      for (const hex of this.hexes) {
        if (hex.selected && hex.exploration < 100) {
          hex.exploration = Math.min(100, hex.exploration + 1);
          if (this.onExplorationChange) {
            this.onExplorationChange(hex);
          }
        }
      }
    }, 2000);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hexCoord = this.pixelToHex(x, y);

    if (this.hoveredHex && (!hexCoord || this.hoveredHex.q !== hexCoord.q || this.hoveredHex.r !== hexCoord.r)) {
      this.hoveredHex.hovered = false;
      this.hoveredHex = null;
    }

    if (hexCoord) {
      const hex = this.getHexAt(hexCoord.q, hexCoord.r);
      if (hex && hex !== this.hoveredHex) {
        hex.hovered = true;
        this.hoveredHex = hex;
      }
    }
  }

  private handleMouseLeave(): void {
    if (this.hoveredHex) {
      this.hoveredHex.hovered = false;
      this.hoveredHex = null;
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hexCoord = this.pixelToHex(x, y);
    if (!hexCoord) return;

    const hex = this.getHexAt(hexCoord.q, hexCoord.r);
    if (!hex || hex.resource === 'obstacle') return;

    hex.pulseScale = 0.9;
    hex.pulseTarget = 1;

    if (hex.selected) {
      hex.selected = false;
      this.selectedHex = null;
    } else {
      if (this.selectedHex) {
        this.selectedHex.selected = false;
      }
      hex.selected = true;
      this.selectedHex = hex;
    }

    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedHex);
    }
  }

  public setEfficiency(hexQ: number, hexR: number, efficiency: number): void {
    const hex = this.getHexAt(hexQ, hexR);
    if (hex) {
      hex.efficiency = efficiency;
      if (this.onEfficiencyChange) {
        this.onEfficiencyChange(hex);
      }
    }
  }

  public getSelectedHex(): HexCell | null {
    return this.selectedHex;
  }

  public getAllHexes(): HexCell[] {
    return this.hexes;
  }

  public getSelectedMineCount(): number {
    return this.hexes.filter((h) => h.selected && h.resource !== 'obstacle').length;
  }

  public getTotalOutputPerSecond(): number {
    let total = 0;
    for (const hex of this.hexes) {
      if (hex.selected && hex.resource !== 'obstacle') {
        total += (hex.annualOutput * hex.efficiency) / 365 / 24 / 3600;
      }
    }
    return total;
  }

  public getTotalEfficiency(): number {
    let total = 0;
    for (const hex of this.hexes) {
      if (hex.selected && hex.resource !== 'obstacle') {
        total += hex.efficiency;
      }
    }
    return total;
  }

  public destroy(): void {
    if (this.explorationTimer) {
      clearInterval(this.explorationTimer);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public static getResourceLabel(type: ResourceType): string {
    return RESOURCE_LABELS[type];
  }

  public static getResourceColor(type: ResourceType): string {
    return RESOURCE_COLORS[type];
  }
}
