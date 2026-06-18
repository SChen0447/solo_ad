export type ResourceType = 'iron' | 'crystal' | 'gas' | 'obstacle' | 'empty';

export interface HexTile {
  id: string;
  q: number;
  r: number;
  x: number;
  y: number;
  resource: ResourceType;
  annualOutput: number;
  exploration: number;
  efficiency: number;
  selected: boolean;
  hovered: boolean;
  pulseScale: number;
  glowRotation: number;
}

export interface HexMapState {
  tiles: HexTile[];
  selectedTile: HexTile | null;
}

export interface HexMapCallbacks {
  onTileSelect: (tile: HexTile | null) => void;
  onEfficiencyChange?: (tileId: string, efficiency: number) => void;
}

const HEX_SIZE = 40;
const HEX_SIDE = 34;
const GRID_COLS = 6;
const GRID_ROWS = 8;

const RESOURCE_COLORS: Record<ResourceType, string> = {
  iron: '#9ca3af',
  crystal: '#8b5cf6',
  gas: '#a3e635',
  obstacle: '#4b5563',
  empty: '#1e293b'
};

const GLOW_COLOR = '#e0f2fe';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

function drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function pointInHex(px: number, py: number, hx: number, hy: number, size: number): boolean {
  const dx = Math.abs(px - hx);
  const dy = Math.abs(py - hy);
  if (dx > size || dy > size * Math.sqrt(3) / 2) return false;
  return size * Math.sqrt(3) / 2 - dy >= (dx - size / 2) / Math.sqrt(3) * 2;
}

export class HexMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tiles: HexTile[] = [];
  private selectedTile: HexTile | null = null;
  private callbacks: HexMapCallbacks;
  private offsetX = 0;
  private offsetY = 0;
  private animationId: number | null = null;
  private lastTime = 0;
  private explorationTimer = 0;
  private hoveredTileId: string | null = null;
  private dpr = 1;
  private displayWidth = 0;
  private displayHeight = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: HexMapCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.callbacks = callbacks;
    this.generateTiles();
    this.bindEvents();
    this.startAnimation();
  }

  private generateTiles(): void {
    this.tiles = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let q = 0; q < GRID_COLS; q++) {
        const { x, y } = hexToPixel(q, r);
        const rand = Math.random();
        let resource: ResourceType;
        if (rand < 0.1) {
          resource = 'obstacle';
        } else if (rand < 0.4) {
          resource = 'iron';
        } else if (rand < 0.7) {
          resource = 'crystal';
        } else {
          resource = 'gas';
        }

        const annualOutput = resource === 'obstacle' ? 0 : randomInt(50, 200);

        this.tiles.push({
          id: `${q}-${r}`,
          q,
          r,
          x,
          y,
          resource,
          annualOutput,
          exploration: 0,
          efficiency: 1.0,
          selected: false,
          hovered: false,
          pulseScale: 1,
          glowRotation: 0
        });
      }
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left - this.offsetX;
    const py = e.clientY - rect.top - this.offsetY;

    let found = false;
    for (const tile of this.tiles) {
      if (tile.resource === 'obstacle') continue;
      const isInside = pointInHex(px, py, tile.x, tile.y, HEX_SIZE);
      tile.hovered = isInside;
      if (isInside) {
        this.hoveredTileId = tile.id;
        found = true;
      }
    }
    if (!found) {
      this.hoveredTileId = null;
    }
    this.canvas.style.cursor = this.hoveredTileId ? 'pointer' : 'default';
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left - this.offsetX;
    const py = e.clientY - rect.top - this.offsetY;

    for (const tile of this.tiles) {
      if (tile.resource === 'obstacle') continue;
      if (pointInHex(px, py, tile.x, tile.y, HEX_SIZE)) {
        this.toggleTile(tile);
        return;
      }
    }
  }

  private toggleTile(tile: HexTile): void {
    if (tile.selected) {
      tile.selected = false;
      tile.pulseScale = 0.9;
      if (this.selectedTile?.id === tile.id) {
        this.selectedTile = null;
      }
    } else {
      if (this.selectedTile) {
        this.selectedTile.selected = false;
      }
      tile.selected = true;
      tile.pulseScale = 0.9;
      this.selectedTile = tile;
    }
    this.callbacks.onTileSelect(this.selectedTile);
  }

  public setEfficiency(tileId: string, efficiency: number): void {
    const tile = this.tiles.find(t => t.id === tileId);
    if (tile) {
      tile.efficiency = efficiency;
    }
  }

  public getSelectedTile(): HexTile | null {
    return this.selectedTile;
  }

  public getAllMines(): HexTile[] {
    return this.tiles.filter(t => t.selected && t.resource !== 'obstacle');
  }

  public getTotalOutputPerSecond(): number {
    let total = 0;
    for (const tile of this.tiles) {
      if (tile.selected && tile.resource !== 'obstacle') {
        const explorationFactor = tile.exploration / 100;
        total += (tile.annualOutput / 365 / 24 / 3600) * tile.efficiency * explorationFactor * 100000;
      }
    }
    return total;
  }

  public resize(width: number, height: number): void {
    this.displayWidth = width;
    this.displayHeight = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.calculateOffset();
  }

  private calculateOffset(): void {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const tile of this.tiles) {
      minX = Math.min(minX, tile.x - HEX_SIZE);
      maxX = Math.max(maxX, tile.x + HEX_SIZE);
      minY = Math.min(minY, tile.y - HEX_SIZE);
      maxY = Math.max(maxY, tile.y + HEX_SIZE);
    }
    const gridWidth = maxX - minX;
    const gridHeight = maxY - minY;
    this.offsetX = (this.displayWidth - gridWidth) / 2 - minX;
    this.offsetY = (this.displayHeight - gridHeight) / 2 - minY;
  }

  private startAnimation(): void {
    const animate = (time: number) => {
      const deltaTime = (time - this.lastTime) / 1000;
      this.lastTime = time;

      this.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private update(deltaTime: number): void {
    for (const tile of this.tiles) {
      if (tile.selected) {
        tile.glowRotation += deltaTime * Math.PI * 2;
      }
      if (tile.pulseScale < 1) {
        tile.pulseScale += deltaTime * (1 / 0.3);
        if (tile.pulseScale > 1) tile.pulseScale = 1;
      }
    }

    this.explorationTimer += deltaTime;
    if (this.explorationTimer >= 2) {
      this.explorationTimer = 0;
      for (const tile of this.tiles) {
        if (tile.selected && tile.exploration < 100) {
          tile.exploration = Math.min(100, tile.exploration + 1);
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    for (const tile of this.tiles) {
      this.drawTile(tile);
    }

    ctx.restore();
  }

  private drawTile(tile: HexTile): void {
    const ctx = this.ctx;
    const scale = tile.pulseScale < 1
      ? 0.9 + (1 - tile.pulseScale) * 0.1
      : tile.hovered ? 1.05 : 1;

    ctx.save();
    ctx.translate(tile.x, tile.y);
    ctx.scale(scale, scale);

    if (tile.hovered && tile.resource !== 'obstacle') {
      ctx.shadowColor = '#9ca3af';
      ctx.shadowBlur = 15;
    }

    drawHexPath(ctx, 0, 0, HEX_SIZE);
    ctx.fillStyle = RESOURCE_COLORS[tile.resource];
    ctx.fill();

    if (tile.selected) {
      ctx.shadowColor = 'transparent';
      this.drawGlowRing(tile);
    }

    ctx.restore();
  }

  private drawGlowRing(tile: HexTile): void {
    const ctx = this.ctx;
    const ringRadius = HEX_SIZE + 6;

    ctx.save();
    ctx.rotate(tile.glowRotation);

    ctx.strokeStyle = GLOW_COLOR;
    ctx.lineWidth = 3;
    ctx.shadowColor = GLOW_COLOR;
    ctx.shadowBlur = 20;

    const gapAngle = Math.PI / 3;
    for (let i = 0; i < 6; i++) {
      const startAngle = i * (Math.PI / 3) + gapAngle / 4;
      const endAngle = startAngle + gapAngle / 2;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, startAngle, endAngle);
      ctx.stroke();
    }

    ctx.restore();
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
