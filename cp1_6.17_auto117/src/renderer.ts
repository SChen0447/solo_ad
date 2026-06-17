import {
  Board,
  Gem,
  PowerUpType,
  COLOR_HEX,
  RockObstacle,
  BlockedCell
} from './board';
import {
  AnimationManager,
  Particle,
  FloatingText,
  SelectionHalo
} from './animation';

export interface BoardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  cellSize: number;
  padding: number;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  animation: AnimationManager;

  constructor(canvas: HTMLCanvasElement, animation: AnimationManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.animation = animation;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(): void {
    const { ctx, canvas } = this;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 40; i++) {
      const sx = (Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
      const sy = (Math.sin(i * 269.5 + 183.3) * 43758.5453) % 1;
      const x = Math.abs(sx) * w;
      const y = Math.abs(sy) * h;
      const r = 0.5 + Math.abs((Math.sin(i * 73.1) * 2)) % 1.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSplitLine(y: number, width: number): void {
    const { ctx } = this;
    ctx.save();

    const glowGrad = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    glowGrad.addColorStop(0, 'rgba(0, 255, 255, 0)');
    glowGrad.addColorStop(0.45, 'rgba(0, 255, 255, 0.15)');
    glowGrad.addColorStop(0.5, 'rgba(255, 0, 229, 0.4)');
    glowGrad.addColorStop(0.55, 'rgba(255, 0, 229, 0.15)');
    glowGrad.addColorStop(1, 'rgba(255, 0, 229, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, y - 30, width, 60);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 0, 229, 0.6)';
    ctx.shadowColor = '#ff00e5';
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(width, y + 1);
    ctx.stroke();

    ctx.restore();
  }

  computeLayout(
    areaX: number,
    areaY: number,
    areaWidth: number,
    areaHeight: number,
    boardSize: number = 8
  ): BoardLayout {
    const padding = 20;
    const maxBoardW = areaWidth - padding * 2;
    const maxBoardH = areaHeight - padding * 2;
    const cellSize = Math.floor(Math.min(maxBoardW / boardSize, maxBoardH / boardSize));
    const boardPixel = cellSize * boardSize;
    const x = areaX + Math.floor((areaWidth - boardPixel) / 2);
    const y = areaY + Math.floor((areaHeight - boardPixel) / 2);
    return { x, y, width: boardPixel, height: boardPixel, cellSize, padding };
  }

  drawBoard(
    board: Board,
    layout: BoardLayout,
    playerId: number
  ): void {
    this.drawBoardGrid(layout);
    this.drawBlockedCells(board.blocked, layout);
    this.drawRocks(board.rocks, layout);
    this.drawGems(board, layout, playerId);
  }

  drawBoardGrid(layout: BoardLayout): void {
    const { ctx } = this;
    const { x, y, width, height, cellSize } = layout;
    const size = width / cellSize;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 4;

    for (let i = 0; i <= size; i++) {
      const gx = x + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();

      const gy = y + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    const boardGrad = ctx.createLinearGradient(x, y, x + width, y + height);
    boardGrad.addColorStop(0, 'rgba(0, 255, 255, 0.08)');
    boardGrad.addColorStop(1, 'rgba(119, 0, 255, 0.06)');
    ctx.fillStyle = boardGrad;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  drawBlockedCells(blocked: BlockedCell[], layout: BoardLayout): void {
    const { ctx } = this;
    const { x, y, cellSize } = layout;
    for (const b of blocked) {
      const cx = x + b.x * cellSize;
      const cy = y + b.y * cellSize;
      const remaining = 1 - b.elapsed / b.duration;
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + 0.2 * remaining})`;
      ctx.fillRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4);
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 + 0.4 * remaining})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 3, cy + 3, cellSize - 6, cellSize - 6);
      ctx.restore();
    }
  }

  drawRocks(rocks: RockObstacle[], layout: BoardLayout): void {
    const { ctx } = this;
    const { x, y, cellSize } = layout;
    for (const r of rocks) {
      const cx = x + r.x * cellSize + cellSize / 2;
      const cy = y + r.y * cellSize + cellSize / 2;
      const s = cellSize * 0.42;

      ctx.save();
      ctx.translate(cx, cy);

      const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.4);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 4, s * 1.4, 0, Math.PI * 2);
      ctx.fill();

      const grad = ctx.createLinearGradient(-s, -s, s, s);
      grad.addColorStop(0, '#8a8a8a');
      grad.addColorStop(0.4, '#606060');
      grad.addColorStop(1, '#3a3a3a');
      ctx.fillStyle = grad;

      ctx.beginPath();
      const pts = 7;
      for (let i = 0; i < pts; i++) {
        const angle = (Math.PI * 2 * i) / pts - Math.PI / 2;
        const r2 = s * (0.8 + 0.2 * Math.sin(i * 2.3));
        const px = Math.cos(angle) * r2;
        const py = Math.sin(angle) * r2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.3, -s * 0.3, s * 0.18, s * 0.1, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(cellSize * 0.32)}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(r.hp), 0, 2);

      ctx.restore();
    }
  }

  drawGems(board: Board, layout: BoardLayout, _playerId: number): void {
    const { ctx } = this;
    const { x, y, cellSize } = layout;
    const size = board.size;

    for (let by = 0; by < size; by++) {
      for (let bx = 0; bx < size; bx++) {
        const gem = board.grid[by][bx];
        if (!gem) continue;

        let drawY = by;
        let alpha = 1;
        let scale = 1;

        if (gem.isFalling) {
          const startY = gem.fallProgress < 1 ? (by - (1 - gem.fallProgress) * (by + 3)) : by;
          drawY = gem.fallProgress >= 1 ? by : startY;
          const eased = easeOutBack(gem.fallProgress);
          const actualStart = gem.isNew ? -(by + 1) : by;
          drawY = actualStart + (by - actualStart) * eased;
        }

        if (gem.isNew && gem.spawnDelay > 0) {
          alpha = 0;
        }

        const centerX = x + bx * cellSize + cellSize / 2;
        const centerY = y + drawY * cellSize + cellSize / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);

        this.drawGemShape(gem, cellSize);

        if (gem.powerUp) {
          this.drawPowerUpBadge(gem.powerUp, cellSize);
        }

        ctx.restore();
      }
    }
  }

  drawGemShape(gem: Gem, cellSize: number): void {
    const { ctx } = this;
    const color = COLOR_HEX[gem.color];
    const s = cellSize * 0.38;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    switch (gem.shape) {
      case 'diamond':
        this.drawDiamond(s, color);
        break;
      case 'triangle':
        this.drawTriangle(s, color);
        break;
      case 'square':
        this.drawSquare(s, color);
        break;
      case 'hexagon':
        this.drawHexagon(s, color);
        break;
      case 'star':
        this.drawStar(s, color);
        break;
      case 'circle':
        this.drawCircleGem(s, color);
        break;
    }

    ctx.restore();
  }

  private drawDiamond(s: number, color: string): void {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, -s, 0, s);
    grad.addColorStop(0, this.lighten(color, 0.4));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darken(color, 0.4));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.85, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.85, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.darken(color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.5);
    ctx.lineTo(-s * 0.05, -s * 0.8);
    ctx.lineTo(s * 0.15, -s * 0.55);
    ctx.lineTo(-s * 0.05, -s * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  private drawTriangle(s: number, color: string): void {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(0, -s, 0, s * 0.8);
    grad.addColorStop(0, this.lighten(color, 0.4));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darken(color, 0.4));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.95, s * 0.8);
    ctx.lineTo(-s * 0.95, s * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.darken(color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.2);
    ctx.lineTo(-s * 0.1, -s * 0.55);
    ctx.lineTo(s * 0.05, -s * 0.3);
    ctx.lineTo(-s * 0.1, -s * 0.05);
    ctx.closePath();
    ctx.fill();
  }

  private drawSquare(s: number, color: string): void {
    const { ctx } = this;
    const grad = ctx.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, this.lighten(color, 0.4));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darken(color, 0.4));
    ctx.fillStyle = grad;

    const r = s * 0.2;
    roundRect(ctx, -s * 0.85, -s * 0.85, s * 1.7, s * 1.7, r);
    ctx.fill();

    ctx.strokeStyle = this.darken(color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    roundRect(ctx, -s * 0.6, -s * 0.6, s * 0.5, s * 0.35, r * 0.6);
    ctx.fill();
  }

  private drawHexagon(s: number, color: string): void {
    const { ctx } = this;
    const grad = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s);
    grad.addColorStop(0, this.lighten(color, 0.4));
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, this.darken(color, 0.4));
    ctx.fillStyle = grad;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const px = Math.cos(angle) * s;
      const py = Math.sin(angle) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.darken(color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, -s * 0.3, s * 0.25, s * 0.15, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(s: number, color: string): void {
    const { ctx } = this;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    grad.addColorStop(0, this.lighten(color, 0.5));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darken(color, 0.4));
    ctx.fillStyle = grad;

    ctx.beginPath();
    const spikes = 5;
    const outerR = s;
    const innerR = s * 0.45;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.darken(color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.3, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCircleGem(s: number, color: string): void {
    const { ctx } = this;
    const grad = ctx.createRadialGradient(-s * 0.25, -s * 0.25, 0, 0, 0, s);
    grad.addColorStop(0, this.lighten(color, 0.5));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darken(color, 0.4));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.darken(color, 0.2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.3, -s * 0.3, s * 0.3, s * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPowerUpBadge(type: PowerUpType, cellSize: number): void {
    const { ctx } = this;
    const s = cellSize * 0.28;
    ctx.save();
    ctx.translate(0, 0);

    const badgeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2);
    badgeGrad.addColorStop(0, '#fff8dc');
    badgeGrad.addColorStop(0.5, '#ffd700');
    badgeGrad.addColorStop(1, '#b8860b');

    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#4a3a00';
    ctx.font = `bold ${Math.floor(s * 1.1)}px 'Segoe UI Symbol', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (type === 'bomb') {
      ctx.font = `bold ${Math.floor(s * 1.2)}px Arial`;
      ctx.fillText('💣', 0, 1);
    } else if (type === 'lightning') {
      ctx.font = `bold ${Math.floor(s * 1.3)}px Arial`;
      ctx.fillText('⚡', 0, 1);
    } else if (type === 'rainbow') {
      ctx.font = `bold ${Math.floor(s * 1.1)}px Arial`;
      ctx.fillText('🌈', 0, 1);
    }

    ctx.restore();
  }

  drawSelectionHalo(halo: SelectionHalo, layout: BoardLayout): void {
    const { ctx } = this;
    const { x, y, cellSize } = layout;
    const cx = x + halo.x * cellSize + cellSize / 2;
    const cy = y + halo.y * cellSize + cellSize / 2;

    const t = halo.time / halo.period;
    const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2;

    const baseScale = 1.2;
    const scaleVariation = 0.08 * pulse;
    const scale = baseScale + scaleVariation;
    const gemRadius = cellSize * 0.45 * scale;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;

    const outerR = 50 * (1 + 0.1 * pulse);
    const innerR = 40 * (1 + 0.05 * pulse);

    const ringGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
    ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    ringGrad.addColorStop(0.4, `rgba(255, 255, 255, ${0.6 + 0.2 * pulse})`);
    ringGrad.addColorStop(0.5, `rgba(200, 240, 255, ${0.8 + 0.2 * pulse})`);
    ringGrad.addColorStop(0.6, `rgba(255, 255, 255, ${0.6 + 0.2 * pulse})`);
    ringGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = outerR - innerR;
    ctx.beginPath();
    ctx.arc(0, 0, (innerR + outerR) / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + 0.2 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, gemRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawParticles(particles: Particle[]): void {
    const { ctx } = this;
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.rotation !== undefined) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.type === 'firework' ? 15 : 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawFloatingTexts(texts: FloatingText[]): void {
    const { ctx } = this;
    for (const t of texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${t.fontSize}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);

      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillText(t.text, t.x, t.y);

      ctx.restore();
    }
  }

  drawDimOverlay(layout: BoardLayout, progress: number): void {
    if (progress <= 0) return;
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = `rgba(50, 50, 60, ${0.65 * progress})`;
    ctx.fillRect(layout.x - 10, layout.y - 10, layout.width + 20, layout.height + 20);
    ctx.restore();
  }

  drawVictoryGlow(layout: BoardLayout, progress: number): void {
    if (progress <= 0) return;
    const { ctx } = this;
    const cx = layout.x + layout.width / 2;
    const cy = layout.y + layout.height / 2;
    const r = Math.max(layout.width, layout.height) * 0.8;

    ctx.save();
    ctx.globalAlpha = 0.5 * progress;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    grad.addColorStop(0.5, 'rgba(255, 200, 50, 0.15)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  private lighten(hex: string, amount: number): string {
    return this.adjustColor(hex, amount);
  }

  private darken(hex: string, amount: number): string {
    return this.adjustColor(hex, -amount);
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.round(r + 255 * amount)));
    g = Math.max(0, Math.min(255, Math.round(g + 255 * amount)));
    b = Math.max(0, Math.min(255, Math.round(b + 255 * amount)));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
