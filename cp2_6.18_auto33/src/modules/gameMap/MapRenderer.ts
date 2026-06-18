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
          this.drawMountainTile(tile, px, py);
        } else if (tile.biome === 'water') {
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          this.drawWaterWaves(px, py, t + x * 0.7 + y * 0.5);
        }
      }
    }
  }

  private drawMountainTile(tile: MapTile, px: number, py: number): void {
    const ctx = this.ctx;
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.clip();

    const baseGrad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, TILE_SIZE / 1.4);
    baseGrad.addColorStop(0, '#a77a56');
    baseGrad.addColorStop(0.6, '#8b5e3c');
    baseGrad.addColorStop(1, '#6b4528');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    const elev = tile.elevation;
    if (elev && elev.length >= 3) {
      const peaks: Array<{ x: number; y: number; h: number }> = [];
      for (let i = 0; i < elev.length; i++) {
        const angle = (i / elev.length) * Math.PI * 2 - Math.PI / 2;
        const r = 8 + elev[i] * 0.8;
        peaks.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          h: elev[i]
        });
      }

      const avgH = peaks.reduce((s, p) => s + p.h, 0) / peaks.length;
      const numContours = Math.max(3, Math.min(6, Math.floor(avgH / 4)));
      const sortedPeaks = [...peaks].sort((a, b) => b.h - a.h);

      for (let ring = 0; ring < numContours; ring++) {
        const ratio = 1 - ring / numContours;
        const alpha = 0.08 + ring * 0.05;

        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = Math.max(0.6, 1.4 - ring * 0.2);
        ctx.beginPath();

        const contourR = 14 + avgH * 0.5;
        const scale = ratio;

        for (let i = 0; i <= peaks.length; i++) {
          const p = peaks[i % peaks.length];
          const nextP = peaks[(i + 1) % peaks.length];

          const localScale = scale * (0.8 + (p.h / avgH) * 0.4);
          const sx = cx + (p.x - cx) * localScale;
          const sy = cy + (p.y - cy) * localScale;

          if (i === 0) {
            ctx.moveTo(sx, sy);
          } else {
            const prevP = peaks[i - 1];
            const prevLocalScale = scale * (0.8 + (prevP.h / avgH) * 0.4);
            const prevX = cx + (prevP.x - cx) * prevLocalScale;
            const prevY = cy + (prevP.y - cy) * prevLocalScale;
            const cpx = (prevX + sx) / 2 + Math.sin(ring + i) * 2;
            const cpy = (prevY + sy) / 2 + Math.cos(ring + i) * 2;
            ctx.quadraticCurveTo(cpx, cpy, sx, sy);
          }
        }
        ctx.closePath();
        ctx.stroke();

        if (ring === 0) {
          ctx.fillStyle = `rgba(255, 255, 255, 0.06)`;
          ctx.fill();
        }
      }

      const highest = sortedPeaks[0];
      const highGrad = ctx.createRadialGradient(highest.x, highest.y, 1, highest.x, highest.y, 8 + highest.h * 0.5);
      highGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
      highGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = highGrad;
      ctx.beginPath();
      ctx.arc(highest.x, highest.y, 8 + highest.h * 0.5, 0, Math.PI * 2);
      ctx.fill();

      const lowest = sortedPeaks[sortedPeaks.length - 1];
      const lowGrad = ctx.createRadialGradient(lowest.x, lowest.y, 1, lowest.x, lowest.y, 10);
      lowGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
      lowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lowGrad;
      ctx.beginPath();
      ctx.arc(lowest.x, lowest.y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < peaks.length; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(peaks[i].x, peaks[i].y);
        ctx.stroke();
      }

      for (const p of peaks) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 + p.h * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = p.h > avgH ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
        ctx.fill();
      }
    } else {
      ctx.fillStyle = COLORS.mountain;
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 10 + i * 12);
        ctx.lineTo(px + TILE_SIZE - 4, py + 14 + i * 12);
        ctx.stroke();
      }
    }

    ctx.restore();
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

      if (age < 200) {
        const pulseR = 18 + (age / 200) * 10;
        const pulseAlpha = 0.6 - (age / 200) * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 68, 68, ${pulseAlpha * 0.3})`;
        ctx.fill();
      }

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

      const fillGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, side);
      fillGrad.addColorStop(0, `rgba(255, 100, 100, ${0.55 + flashAlpha * 0.35})`);
      fillGrad.addColorStop(1, `rgba(180, 30, 30, ${0.45 + flashAlpha * 0.35})`);
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 120, 120, ${0.9 + flashAlpha * 0.1})`;
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

      const end = u.path[u.path.length - 1];
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(end.x, end.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawUnits(units: GameState['units']): void {
    const ctx = this.ctx;
    for (const u of units) {
      if (u.selected) {
        const pulse = 1 + Math.sin(this.animationTime * 0.01) * 0.05;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 15 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.selected;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const shadowGrad = ctx.createRadialGradient(u.x, u.y + 4, 2, u.x, u.y + 4, 14);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 8, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(u.x, u.y, UNIT_RADIUS, 0, Math.PI * 2);
      const bodyGrad = ctx.createRadialGradient(u.x - 3, u.y - 3, 2, u.x, u.y, UNIT_RADIUS);
      bodyGrad.addColorStop(0, '#7aaaff');
      bodyGrad.addColorStop(1, COLORS.unit);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const barW = 24;
      const barH = 4;
      const barX = u.x - barW / 2;
      const barY = u.y - UNIT_RADIUS - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      const hpRatio = Math.max(0, u.hp / u.maxHp);
      const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, hpRatio > 0.3 ? COLORS.hpBar : '#ef4444');
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
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hover.x * TILE_SIZE + 0.5, hover.y * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
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
    ctx.strokeStyle = 'rgba(68, 136, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
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
        if (tile.obstacle) miniCtx.fillStyle = COLORS.obstacle;
        else if (tile.biome === 'plain') miniCtx.fillStyle = COLORS.plain;
        else if (tile.biome === 'mountain') miniCtx.fillStyle = COLORS.mountain;
        else miniCtx.fillStyle = COLORS.water;
        miniCtx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }
    const t = this.animationTime * 0.008;
    for (const u of state.units) {
      const flick = u.selected ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(t + u.x * 0.01 + u.y * 0.01));
      const color = u.selected ? 'rgba(0, 255, 0, 1)' : `rgba(255, 0, 0, ${flick})`;
      miniCtx.fillStyle = color;
      const mx = (u.x / TILE_SIZE) * sx;
      const my = (u.y / TILE_SIZE) * sy;
      miniCtx.beginPath();
      miniCtx.arc(mx, my, Math.max(u.selected ? 2.5 : 1.8, sx * 0.4), 0, Math.PI * 2);
      miniCtx.fill();
    }

    miniCtx.strokeStyle = 'rgba(255,255,255,0.35)';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(0.5, 0.5, mw - 1, mh - 1);

    miniCtx.fillStyle = 'rgba(0,0,0,0.5)';
    miniCtx.fillRect(4, mh - 14, 48, 10);
    miniCtx.fillStyle = '#ffffff';
    miniCtx.font = '8px sans-serif';
    miniCtx.fillText('小地图', 6, mh - 6);
  }
}
