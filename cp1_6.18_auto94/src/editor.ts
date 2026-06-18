import {
  Cell,
  CellPosition,
  CellType,
  CELL_COLORS,
  EditorMode,
  FadeOutCell,
  LevelData,
  RippleEffect
} from './types.js';

export class LevelEditor {
  private level: LevelData;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectedTool: CellType = CellType.Normal;
  private selectedIntensity: number = 2;
  private ripples: RippleEffect[] = [];
  private fadeOutCells: FadeOutCell[] = [];
  private isMouseDown: boolean = false;
  private lastPlacedCell: CellPosition | null = null;
  private portalIdCounter: number = 0;
  private pendingPortal: CellPosition | null = null;
  private onLevelChange?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    initialLevel?: LevelData,
    onLevelChange?: () => void
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available');
    this.ctx = ctx;
    this.onLevelChange = onLevelChange;

    if (initialLevel) {
      this.level = initialLevel;
    } else {
      this.level = this.createDefaultLevel();
    }
  }

  private createDefaultLevel(): LevelData {
    const cols = 20;
    const rows = 14;
    const cellSize = 50;
    const grid: (Cell | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = null;
      }
    }

    const startRow = Math.floor(rows / 2);
    grid[startRow][2] = { type: CellType.Start, intensity: 1 };

    for (let c = 3; c < cols - 3; c++) {
      grid[startRow][c] = { type: CellType.Normal, intensity: 1 };
    }
    grid[startRow][cols - 3] = { type: CellType.Goal, intensity: 1 };

    for (let c = 0; c < cols; c++) {
      grid[0][c] = { type: CellType.Wall, intensity: 1 };
      grid[rows - 1][c] = { type: CellType.Wall, intensity: 1 };
    }
    for (let r = 0; r < rows; r++) {
      grid[r][0] = { type: CellType.Wall, intensity: 1 };
      grid[r][cols - 1] = { type: CellType.Wall, intensity: 1 };
    }

    return {
      cols,
      rows,
      cellSize,
      grid,
      gravity: 0.5,
      friction: 0.02,
      minSteps: 20
    };
  }

  getLevel(): LevelData {
    return { ...this.level, grid: this.level.grid.map(row => [...row]) };
  }

  setLevel(level: LevelData): void {
    this.level = level;
    this.ripples = [];
    this.fadeOutCells = [];
    this.pendingPortal = null;
    this.portalIdCounter = 0;
    this.notifyChange();
  }

  clearLevel(): void {
    const { cols, rows } = this.level;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this.level.grid[r][c];
        if (cell && cell.type !== CellType.Empty) {
          this.fadeOutCells.push({
            col: c,
            row: r,
            scale: 1,
            alpha: 1,
            type: cell.type
          });
        }
        this.level.grid[r][c] = null;
      }
    }
    this.pendingPortal = null;
    this.notifyChange();
  }

  getSelectedTool(): CellType {
    return this.selectedTool;
  }

  setSelectedTool(tool: CellType): void {
    this.selectedTool = tool;
    if (tool !== CellType.Portal) {
      this.pendingPortal = null;
    }
  }

  getSelectedIntensity(): number {
    return this.selectedIntensity;
  }

  setSelectedIntensity(v: number): void {
    this.selectedIntensity = Math.max(1, Math.min(3, Math.round(v)));
  }

  setGravity(g: number): void {
    this.level.gravity = g;
    this.notifyChange();
  }

  setFriction(f: number): void {
    this.level.friction = f;
    this.notifyChange();
  }

  setMinSteps(s: number): void {
    this.level.minSteps = Math.max(1, Math.min(100, Math.round(s)));
    this.notifyChange();
  }

  resizeCanvas(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  getGridOffset(): { offsetX: number; offsetY: number } {
    const { cols, rows, cellSize } = this.level;
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const rect = this.canvas.getBoundingClientRect();
    return {
      offsetX: Math.floor((rect.width - totalW) / 2),
      offsetY: Math.floor((rect.height - totalH) / 2)
    };
  }

  screenToGrid(screenX: number, screenY: number): CellPosition | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    const { offsetX, offsetY } = this.getGridOffset();
    const { cellSize, cols, rows } = this.level;

    const col = Math.floor((x - offsetX) / cellSize);
    const row = Math.floor((y - offsetY) / cellSize);

    if (col < 0 || col >= cols || row < 0 || row >= rows) {
      return null;
    }
    return { col, row };
  }

  handleMouseDown(x: number, y: number, button: number): boolean {
    if (button === 2) {
      return true;
    }

    this.isMouseDown = true;
    const pos = this.screenToGrid(x, y);
    if (!pos) return false;

    this.tryPlaceOrErase(pos);
    return true;
  }

  handleMouseMove(x: number, y: number): boolean {
    if (!this.isMouseDown) return false;
    const pos = this.screenToGrid(x, y);
    if (!pos) return false;
    this.tryPlaceOrErase(pos);
    return true;
  }

  handleMouseUp(): void {
    this.isMouseDown = false;
    this.lastPlacedCell = null;
  }

  handleDelete(): boolean {
    if (this.selectedTool === CellType.Empty) return false;
    return false;
  }

  deleteCell(pos: CellPosition): boolean {
    const cell = this.level.grid[pos.row][pos.col];
    if (!cell) return false;

    this.fadeOutCells.push({
      col: pos.col,
      row: pos.row,
      scale: 1,
      alpha: 1,
      type: cell.type
    });

    if (cell.type === CellType.Portal && cell.portalPairId) {
      for (let r = 0; r < this.level.rows; r++) {
        for (let c = 0; c < this.level.cols; c++) {
          const other = this.level.grid[r][c];
          if (other && other.type === CellType.Portal && other.portalPairId === cell.portalPairId) {
            if (!(r === pos.row && c === pos.col)) {
              this.fadeOutCells.push({
                col: c,
                row: r,
                scale: 1,
                alpha: 1,
                type: other.type
              });
              this.level.grid[r][c] = null;
            }
          }
        }
      }
      this.pendingPortal = null;
    }

    this.level.grid[pos.row][pos.col] = null;
    this.notifyChange();
    return true;
  }

  deleteArea(pos: CellPosition): void {
    const radius = 2;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const col = pos.col + dc;
        const row = pos.row + dr;
        if (col >= 0 && col < this.level.cols && row >= 0 && row < this.level.rows) {
          const cell = this.level.grid[row][col];
          if (cell && cell.type !== CellType.Wall) {
            this.deleteCell({ col, row });
          }
        }
      }
    }
  }

  private tryPlaceOrErase(pos: CellPosition): void {
    if (this.lastPlacedCell &&
        this.lastPlacedCell.col === pos.col &&
        this.lastPlacedCell.row === pos.row) {
      return;
    }

    if (this.selectedTool === CellType.Empty) {
      this.deleteCell(pos);
    } else {
      this.placeCell(pos);
    }
    this.lastPlacedCell = pos;
  }

  placeCell(pos: CellPosition): void {
    const type = this.selectedTool;
    const cellSize = this.level.cellSize;
    const { offsetX, offsetY } = this.getGridOffset();

    if (type === CellType.Start || type === CellType.Goal) {
      for (let r = 0; r < this.level.rows; r++) {
        for (let c = 0; c < this.level.cols; c++) {
          const cell = this.level.grid[r][c];
          if (cell && cell.type === type) {
            this.fadeOutCells.push({ col: c, row: r, scale: 1, alpha: 1, type });
            this.level.grid[r][c] = null;
          }
        }
      }
    }

    let newCell: Cell = { type, intensity: this.selectedIntensity };

    if (type === CellType.Portal) {
      if (this.pendingPortal) {
        const pairId = `portal_${this.portalIdCounter++}`;
        newCell.portalPairId = pairId;
        const pendingCell = this.level.grid[this.pendingPortal.row][this.pendingPortal.col];
        if (pendingCell && pendingCell.type === CellType.Portal) {
          pendingCell.portalPairId = pairId;
        }
        this.pendingPortal = null;
      } else {
        const pairId = `portal_pending_${this.portalIdCounter}`;
        newCell.portalPairId = pairId;
        this.pendingPortal = { ...pos };
      }
    }

    if (type === CellType.MovingPlatform) {
      newCell.platformPath = [
        { x: 0, y: 0 },
        { x: 0, y: -1.5 },
        { x: 0, y: 0 },
        { x: 0, y: 1.5 }
      ];
      newCell.platformSpeed = 0.8;
    }

    this.level.grid[pos.row][pos.col] = newCell;

    const centerX = offsetX + pos.col * cellSize + cellSize / 2;
    const centerY = offsetY + pos.row * cellSize + cellSize / 2;
    const colors = CELL_COLORS[type];

    this.ripples.push({
      x: centerX,
      y: centerY,
      radius: 2,
      maxRadius: cellSize * 0.95,
      alpha: 0.8,
      color: colors.glow
    });

    this.notifyChange();
  }

  update(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 6 * dt;
      r.alpha = 0.8 * (1 - r.radius / r.maxRadius);
      if (r.alpha < 0.02 || r.radius >= r.maxRadius * 0.98) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.fadeOutCells.length - 1; i >= 0; i--) {
      const f = this.fadeOutCells[i];
      f.scale -= 3.5 * dt;
      f.alpha -= 3 * dt;
      if (f.scale <= 0 || f.alpha <= 0) {
        this.fadeOutCells.splice(i, 1);
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    const { cols, rows, cellSize, grid } = this.level;
    const { offsetX, offsetY } = this.getGridOffset();
    const rect = this.canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    ctx.strokeStyle = 'rgba(136, 146, 176, 0.12)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize + 0.5, 0);
      ctx.lineTo(c * cellSize + 0.5, rows * cellSize);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize + 0.5);
      ctx.lineTo(cols * cellSize, r * cellSize + 0.5);
      ctx.stroke();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        if (cell) {
          this.renderCell(c, r, cell, cellSize);
        }
      }
    }

    for (const f of this.fadeOutCells) {
      this.renderFadeOutCell(f, cellSize);
    }

    ctx.restore();

    for (const ripple of this.ripples) {
      ctx.save();
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = ripple.alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.renderPortalConnections(cellSize, offsetX, offsetY);
  }

  private renderCell(col: number, row: number, cell: Cell, s: number): void {
    const ctx = this.ctx;
    const colors = CELL_COLORS[cell.type];
    const x = col * s;
    const y = row * s;
    const padding = 3;

    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8;

    const radius = Math.min(8, s * 0.15);
    this.roundRect(ctx, x + padding, y + padding, s - padding * 2, s - padding * 2, radius);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.border;
    this.roundRect(ctx, x + padding, y + padding, s - padding * 2, s - padding * 2, radius);
    ctx.stroke();

    this.renderCellIcon(col, row, cell, s);
    this.renderIntensityBar(cell, x, y, s);

    ctx.restore();
  }

  private renderFadeOutCell(f: FadeOutCell, s: number): void {
    const ctx = this.ctx;
    const colors = CELL_COLORS[f.type];
    const x = f.col * s;
    const y = f.row * s;
    const padding = 3;
    const size = (s - padding * 2) * Math.max(0, f.scale);
    const cx = x + s / 2;
    const cy = y + s / 2;

    ctx.save();
    ctx.globalAlpha = Math.max(0, f.alpha);
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 8 * f.alpha;

    const radius = Math.min(8, size * 0.15);
    this.roundRect(ctx, cx - size / 2, cy - size / 2, size, size, radius);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    ctx.restore();
  }

  private renderCellIcon(col: number, row: number, cell: Cell, s: number): void {
    const ctx = this.ctx;
    const cx = col * s + s / 2;
    const cy = row * s + s / 2;
    const colors = CELL_COLORS[cell.type];

    ctx.save();
    ctx.fillStyle = colors.glow;
    ctx.strokeStyle = colors.glow;
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const iconSize = s * 0.38;

    switch (cell.type) {
      case CellType.Start: {
        ctx.beginPath();
        ctx.moveTo(cx - iconSize * 0.5, cy - iconSize * 0.7);
        ctx.lineTo(cx + iconSize * 0.6, cy);
        ctx.lineTo(cx - iconSize * 0.5, cy + iconSize * 0.7);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case CellType.Goal: {
        this.drawStar(ctx, cx, cy, 5, iconSize * 0.8, iconSize * 0.35);
        ctx.fill();
        break;
      }
      case CellType.Wall: {
        ctx.fillStyle = 'rgba(50, 55, 70, 0.9)';
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.8)';
        const brickH = s * 0.18;
        const brickW = s * 0.38;
        for (let br = 0; br < 4; br++) {
          const offset = br % 2 === 0 ? 0 : brickW * 0.5;
          for (let bc = -1; bc < 3; bc++) {
            const bx = col * s + s * 0.12 + bc * brickW + offset;
            const by = row * s + s * 0.12 + br * brickH;
            this.roundRect(ctx, bx, by, brickW - 2, brickH - 2, 2);
            ctx.fill();
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
        break;
      }
      case CellType.Accelerator: {
        const arrows = 3;
        for (let i = 0; i < arrows; i++) {
          const ay = cy + (i - 1) * iconSize * 0.4;
          ctx.beginPath();
          ctx.moveTo(cx - iconSize * 0.4, ay - iconSize * 0.15);
          ctx.lineTo(cx + iconSize * 0.1, ay - iconSize * 0.15);
          ctx.lineTo(cx + iconSize * 0.1, ay - iconSize * 0.3);
          ctx.lineTo(cx + iconSize * 0.5, ay);
          ctx.lineTo(cx + iconSize * 0.1, ay + iconSize * 0.3);
          ctx.lineTo(cx + iconSize * 0.1, ay + iconSize * 0.15);
          ctx.lineTo(cx - iconSize * 0.4, ay + iconSize * 0.15);
          ctx.closePath();
          ctx.globalAlpha = 0.5 + i * 0.2;
          ctx.fill();
        }
        break;
      }
      case CellType.Decelerator: {
        ctx.strokeStyle = colors.glow;
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          const ly = cy - iconSize * 0.5 + i * iconSize * 0.33;
          ctx.beginPath();
          ctx.moveTo(cx - iconSize * 0.55, ly);
          ctx.lineTo(cx + iconSize * 0.55, ly);
          ctx.stroke();
        }
        break;
      }
      case CellType.Bouncer: {
        ctx.strokeStyle = colors.glow;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - iconSize * 0.6, cy + iconSize * 0.3);
        ctx.quadraticCurveTo(cx - iconSize * 0.3, cy - iconSize * 0.6, cx, cy + iconSize * 0.1);
        ctx.quadraticCurveTo(cx + iconSize * 0.3, cy - iconSize * 0.6, cx + iconSize * 0.6, cy + iconSize * 0.3);
        ctx.stroke();
        ctx.fillStyle = colors.glow;
        ctx.beginPath();
        ctx.arc(cx, cy + iconSize * 0.45, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case CellType.Portal: {
        const time = performance.now() * 0.003;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, iconSize * (0.4 + i * 0.15) * (0.9 + 0.1 * Math.sin(time + i)), 0, Math.PI * 2);
          ctx.globalAlpha = 0.7 - i * 0.2;
          ctx.strokeStyle = colors.glow;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.globalAlpha = 0.5;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, iconSize * 0.5);
        grd.addColorStop(0, colors.glow);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, iconSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case CellType.MovingPlatform: {
        const time = performance.now() * 0.002;
        ctx.fillStyle = colors.glow;
        ctx.globalAlpha = 0.8;
        this.roundRect(ctx, cx - iconSize * 0.6, cy - iconSize * 0.25, iconSize * 1.2, iconSize * 0.5, 4);
        ctx.fill();
        ctx.fillStyle = '#0a192f';
        const offsetX = Math.sin(time) * iconSize * 0.25;
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.glow;
        ctx.globalAlpha = 0.7;
        this.drawArrow(ctx, cx - iconSize * 0.9, cy, -1, iconSize * 0.2);
        this.drawArrow(ctx, cx + iconSize * 0.9, cy, 1, iconSize * 0.2);
        break;
      }
      case CellType.Normal: {
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, iconSize * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.5);
    ctx.lineTo(x + dir * size, y);
    ctx.lineTo(x, y + size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private renderIntensityBar(cell: Cell, x: number, y: number, s: number): void {
    if (cell.intensity <= 1) return;
    if (cell.type !== CellType.Accelerator &&
        cell.type !== CellType.Decelerator &&
        cell.type !== CellType.Bouncer) return;

    const ctx = this.ctx;
    const colors = CELL_COLORS[cell.type];
    const barW = s * 0.7;
    const barH = 4;
    const bx = x + (s - barW) / 2;
    const by = y + s - 8;
    const segments = 3;
    const filled = Math.min(3, Math.max(1, cell.intensity));

    ctx.save();
    for (let i = 0; i < segments; i++) {
      const segW = (barW - (segments - 1) * 2) / segments;
      const sx = bx + i * (segW + 2);
      ctx.fillStyle = i < filled ? colors.glow : 'rgba(255,255,255,0.1)';
      this.roundRect(ctx, sx, by, segW, barH, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderPortalConnections(s: number, offsetX: number, offsetY: number): void {
    const ctx = this.ctx;
    const pairs: Map<string, { col: number; row: number }[]> = new Map();

    for (let r = 0; r < this.level.rows; r++) {
      for (let c = 0; c < this.level.cols; c++) {
        const cell = this.level.grid[r][c];
        if (cell && cell.type === CellType.Portal && cell.portalPairId) {
          if (!pairs.has(cell.portalPairId)) {
            pairs.set(cell.portalPairId, []);
          }
          pairs.get(cell.portalPairId)!.push({ col: c, row: r });
        }
      }
    }

    const time = performance.now() * 0.004;
    ctx.save();
    ctx.translate(offsetX, offsetY);

    for (const [, list] of pairs) {
      if (list.length < 2) continue;
      const a = list[0];
      const b = list[1];
      const ax = a.col * s + s / 2;
      const ay = a.row * s + s / 2;
      const bx = b.col * s + s / 2;
      const by = b.row * s + s / 2;

      const grd = ctx.createLinearGradient(ax, ay, bx, by);
      grd.addColorStop(0, 'rgba(184, 41, 240, 0.4)');
      grd.addColorStop(0.5, 'rgba(100, 255, 218, 0.4)');
      grd.addColorStop(1, 'rgba(184, 41, 240, 0.4)');

      ctx.strokeStyle = grd;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time * 20;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number): void {
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
    }
    ctx.closePath();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private notifyChange(): void {
    this.onLevelChange?.();
  }
}
