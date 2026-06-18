import {
  MapTile,
  GameState,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  COLORS,
  UNIT_RADIUS
} from './types';

export interface SelectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RenderData {
  hoverTile: { x: number; y: number } | null;
  selectionBox: SelectionBox | null;
}

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private animationTime = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(state: GameState, renderData: RenderData, zoom: number): void {
    this.animationTime += 16;
    const ctx = this.ctx;
    const totalW = MAP_WIDTH * TILE_SIZE;
    const totalH = MAP_HEIGHT * TILE_SIZE;
    const offsetX = (this.width - totalW * zoom) / 2;
    const offsetY = (this.height - totalH * zoom) / 2;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    this.drawTiles(state.tiles);
    this.drawGrid();
    this.drawObstacles(state.obstacles);
    this.drawUnitPaths(state.units);
    this.drawUnits(state.units);
    this.drawHoverHighlight(renderData.hoverTile, state.units);
    this.drawSelectionBox(renderData.selectionBox);

    ctx.restore();
  }

  private drawTiles(tiles: MapTile[][]): void {
    const ctx = this.ctx;
    const t = this.animationTime * 0.003;

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile.biome === 'plain') {
          ctx.fillStyle = COLORS.plain;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile.biome === 'mountain') {
          ctx.fillStyle = COLORS.mountain;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          this.drawMountainElevation(tile.elevation, px, py);
        } else if (tile.biome === 'water') {
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          this.drawWaterWaves(px, py, t + x * 0.7 + y * 0.5);
        }
      }
    }
  }

  private drawMountainElevation(elevation: number[] | undefined, px: number, py: number): void {
    if (!elevation || elevation.length < 2) return;
    const ctx = this.ctx;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;

    for (let i = 0; i < elevation.length; i++) {
      const angle1 = (i / elevation.length) * Math.PI * 2;
      const angle2 = ((i + 1) / elevation.length) * Math.PI * 2;
      const r1 = 4 + elevation[i] * 0.6;
      const r2 = 4 + elevation[(i + 1) % elevation.length] * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle1) * r1, cy + Math.sin(angle1) * r1);
      ctx.lineTo(cx + Math.cos(angle2) * r2, cy + Math.sin(angle2) * r2);
      ctx.stroke();
    }
  }

  private drawWaterWaves(px: number, py: number, t: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    const lines = 2;
    for (let i = 0; i < lines; i++) {
      const waveY = py + (TILE_SIZE * (i + 1)) / (lines + 1) + Math.sin(t + i) * 3;
      ctx.beginPath();
      ctx.moveTo(px + 4, waveY);
      for (let x = 0; x <= TILE_SIZE - 8; x += 4) {
        const yOff = Math.sin(t + x * 0.15 + i) * 2;
        ctx.lineTo(px + 4 + x, waveY + yOff);
      }
      ctx.stroke();
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(224, 224, 224, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= MAP_WIDTH; x++) {
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
    }
    for (let y = 0; y <= MAP_HEIGHT; y++) {
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(MAP_WIDTH * TILE_SIZE, y * TILE_SIZE);
    }
    ctx.stroke();
  }

  private drawObstacles(obstacles: GameState['obstacles']): void {
    const ctx = this.ctx;
    const now = performance.now();
    for (const ob of obstacles) {
      const age = now - ob.createdAt;
      const flashAlpha = age < 200 ? 0.8 - (age / 200) * 0.6 : 0.2;
      const cx = ob.gridX * TILE_SIZE + TILE_SIZE / 2;
      const cy = ob.gridY * TILE_SIZE + TILE_SIZE / 2;
      const side = 12;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * side;
        const y = Math.sin(angle) * side;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 68, 68, ${0.5 + flashAlpha * 0.3})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 68, 68, ${0.9 + flashAlpha * 0.1})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawUnitPaths(units: GameState['units']): void {
    const ctx = this.ctx;
    for (const u of units) {
      if (u.state !== 'moving' || u.path.length < 2) continue;
      ctx.strokeStyle = COLORS.path;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      for (let i = u.pathIndex; i < u.path.length; i++) {
        ctx.lineTo(u.path[i].x, u.path[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawUnits(units: GameState['units']): void {
    const ctx = this.ctx;
    for (const u of units) {
      if (u.selected) {
        ctx.beginPath();
        ctx.arc(u.x, u.y, 15, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.selected;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(u.x, u.y, UNIT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.unit;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const barW = 24;
      const barH = 4;
      const barX = u.x - barW / 2;
      const barY = u.y - UNIT_RADIUS - 10;
      ctx.fillStyle = '#333333';
      ctx.fillRect(barX, barY, barW, barH);
      const hpRatio = Math.max(0, u.hp / u.maxHp);
      const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, COLORS.hpBar);
      grad.addColorStop(1, '#86efac');
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }
  }

  private drawHoverHighlight(hover: { x: number; y: number } | null, units: GameState['units']): void {
    if (!hover) return;
    const ctx = this.ctx;
    const hasSelected = units.some((u) => u.selected);
    if (hasSelected) {
      ctx.fillStyle = 'rgba(255,255,255,0.314)';
      ctx.fillRect(hover.x * TILE_SIZE, hover.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  private drawSelectionBox(box: SelectionBox | null): void {
    if (!box) return;
    const ctx = this.ctx;
    const x = Math.min(box.x1, box.x2);
    const y = Math.min(box.y1, box.y2);
    const w = Math.abs(box.x2 - box.x1);
    const h = Math.abs(box.y2 - box.y1);
    ctx.fillStyle = COLORS.selectionBox;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  drawMinimap(
    miniCtx: CanvasRenderingContext2D,
    mw: number,
    mh: number,
    state: GameState
  ): void {
    miniCtx.fillStyle = COLORS.bg;
    miniCtx.fillRect(0, 0, mw, mh);
    const sx = mw / MAP_WIDTH;
    const sy = mh / MAP_HEIGHT;
    for (let y = 0; y < state.tiles.length; y++) {
      for (let x = 0; x < state.tiles[y].length; x++) {
        const tile = state.tiles[y][x];
        if (tile.biome === 'plain') miniCtx.fillStyle = COLORS.plain;
        else if (tile.biome === 'mountain') miniCtx.fillStyle = COLORS.mountain;
        else miniCtx.fillStyle = COLORS.water;
        miniCtx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }
    const t = this.animationTime * 0.01;
    for (const u of state.units) {
      const flick = 0.5 + 0.5 * Math.abs(Math.sin(t + u.x * 0.01));
      miniCtx.fillStyle = `rgba(255, 0, 0, ${flick})`;
      const mx = (u.x / TILE_SIZE) * sx;
      const my = (u.y / TILE_SIZE) * sy;
      miniCtx.beginPath();
      miniCtx.arc(mx, my, Math.max(1.5, sx * 0.4), 0, Math.PI * 2);
      miniCtx.fill();
    }
  }
}
