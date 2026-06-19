import {
  GameEngine, BuildingType, Building,
  BUILDING_TYPES, BUILDING_COLORS, BUILDING_NAMES, BUILDING_DARK_COLORS,
  GRID_SIZE, DOCK_COLUMN, TOURIST_COLORS,
} from './GameEngine';
import { InputManager } from './InputManager';

const STATS_SIDEBAR_WIDTH = 280;
const TOOLBAR_WIDTH_DESKTOP = 90;
const TOOLBAR_WIDTH_MOBILE = 60;

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutElasticSmall(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c4 = (2 * Math.PI) / 2.5;
  return Math.pow(2, -8 * t) * Math.sin((t * 8 - 0.75) * c4) + 1;
}

function easeOutProgress(t: number): number {
  if (t < 0.3) {
    return (t / 0.3) * 0.7;
  } else {
    const rem = (t - 0.3) / 0.7;
    return 0.7 + 0.3 * (1 - Math.pow(1 - rem, 3));
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private input: InputManager | null = null;

  cellSize = 32;
  toolbarWidth = TOOLBAR_WIDTH_DESKTOP;
  gridOffsetX = 0;
  gridOffsetY = 0;
  isMobile = false;
  private sidebarWidth = STATS_SIDEBAR_WIDTH;
  private pixelFont = '"Press Start 2P", monospace';

  upgradeMenuRect = { x: 0, y: 0, w: 0, h: 0 };
  statsButtonRect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.isMobile = window.innerWidth < 768;
    this.resize();
  }

  setInputManager(input: InputManager): void {
    this.input = input;
  }

  resize(): void {
    this.isMobile = window.innerWidth < 768;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.toolbarWidth = this.isMobile ? TOOLBAR_WIDTH_MOBILE : TOOLBAR_WIDTH_DESKTOP;
    const availableW = window.innerWidth - this.toolbarWidth - (this.engine.showStats ? this.sidebarWidth : 0);
    const availableH = window.innerHeight;
    const maxCellW = Math.floor(availableW / GRID_SIZE);
    const maxCellH = Math.floor(availableH / GRID_SIZE);
    const baseSize = this.isMobile ? 24 : 32;
    this.cellSize = Math.min(maxCellW, maxCellH, baseSize);
    this.cellSize = Math.max(this.cellSize, 16);

    const gridW = GRID_SIZE * this.cellSize;
    const gridH = GRID_SIZE * this.cellSize;
    this.gridOffsetX = this.toolbarWidth + Math.max(0, (availableW - gridW) / 2);
    this.gridOffsetY = Math.max(0, (window.innerHeight - gridH) / 2);

    if (this.input) {
      this.input.setLayout(this.toolbarWidth, this.gridOffsetX, this.gridOffsetY, this.cellSize);
    }
  }

  render(currentTime: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    this.drawBackground(w, h);
    this.drawGrid();
    this.drawDock(currentTime);
    this.drawBuildings(currentTime);
    this.drawUpgradeProgressBars(currentTime);
    this.drawTourists(currentTime);
    this.drawCoinBubbles(currentTime);
    this.drawParticles();
    this.drawToolbar(currentTime);
    this.drawGoldCounter(w);
    this.drawStatsButton(w, h);
    if (this.engine.showStats) this.drawStatsSidebar(w, h, currentTime);
    if (this.engine.showUpgradeMenu) this.drawUpgradeMenu(currentTime);
    this.drawDragPreview(currentTime);
  }

  private drawBackground(w: number, h: number): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.6, '#B0E0E6');
    grad.addColorStop(1, '#FFFACD');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = this.gridOffsetX + i * this.cellSize;
      const y = this.gridOffsetY + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.gridOffsetY);
      ctx.lineTo(x, this.gridOffsetY + GRID_SIZE * this.cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.gridOffsetX, y);
      ctx.lineTo(this.gridOffsetX + GRID_SIZE * this.cellSize, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDock(currentTime: number): void {
    const ctx = this.ctx;
    const x = this.gridOffsetX;
    const y = this.gridOffsetY;
    const dockW = this.cellSize;
    const dockH = GRID_SIZE * this.cellSize;

    ctx.fillStyle = 'rgba(139, 119, 101, 0.3)';
    ctx.fillRect(x, y, dockW, dockH);

    ctx.fillStyle = 'rgba(101, 67, 33, 0.5)';
    for (let i = 0; i < GRID_SIZE; i++) {
      const cy = y + i * this.cellSize + this.cellSize / 2;
      ctx.fillRect(x + 2, cy - 1, dockW - 4, 2);
    }

    const wavePhase = currentTime / 800;
    ctx.strokeStyle = 'rgba(70, 130, 180, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const wy = y + i * (dockH / 4) + Math.sin(wavePhase + i) * 3;
      ctx.beginPath();
      ctx.moveTo(x - 8, wy);
      for (let px = 0; px < 16; px++) {
        ctx.lineTo(x - 8 + px, wy + Math.sin(wavePhase + px * 0.5 + i) * 2);
      }
      ctx.stroke();
    }

    ctx.font = `${Math.max(6, this.cellSize * 0.25)}px ${this.pixelFont}`;
    ctx.fillStyle = 'rgba(80, 60, 40, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('码头', x + dockW / 2, y + dockH - 4);
  }

  private drawBuildings(currentTime: number): void {
    this.engine.buildings.forEach(b => {
      this.drawBuilding(b, currentTime);
    });
  }

  private drawBuilding(b: Building, currentTime: number, overrideX?: number, overrideY?: number, alpha?: number, scaleOverride?: number): void {
    const ctx = this.ctx;
    const elapsed = currentTime - b.placeAnimStartTime;
    const animDuration = 300;
    let scale = 1;
    let shakeX = 0;
    let shakeY = 0;

    if (elapsed < animDuration) {
      const progress = elapsed / animDuration;
      scale = 1 + 0.2 * (1 - easeOutElasticSmall(Math.min(progress, 1)));
      const shakeIntensity = (1 - Math.min(progress * 1.5, 1)) * 2;
      shakeX = Math.sin(progress * Math.PI * 8) * shakeIntensity;
      shakeY = Math.cos(progress * Math.PI * 10) * shakeIntensity * 0.5;
    }

    if (scaleOverride !== undefined) {
      scale = scaleOverride;
    }

    const cx = overrideX !== undefined ? overrideX : this.gridOffsetX + b.gridX * this.cellSize + this.cellSize / 2;
    const cy = overrideY !== undefined ? overrideY : this.gridOffsetY + b.gridY * this.cellSize + this.cellSize / 2;

    ctx.save();
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;
    ctx.translate(cx + shakeX, cy + shakeY);
    ctx.scale(scale, scale);

    if (b.selected) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
    }

    const halfCell = this.cellSize / 2;
    const s = this.cellSize / 16;

    this.drawBuildingArt(b.type, b.level, s, halfCell);

    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.max(7, s * 2.5)}px ${this.pixelFont}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const lvlText = `Lv${b.level}`;
    ctx.strokeText(lvlText, 0, halfCell - 1);
    ctx.fillText(lvlText, 0, halfCell - 1);

    ctx.restore();
  }

  private drawBuildingArt(type: BuildingType, level: number, s: number, halfCell: number): void {
    const ctx = this.ctx;

    switch (type) {
      case 'fisherman': {
        ctx.fillStyle = BUILDING_COLORS.fisherman;
        ctx.fillRect(-4 * s, -2 * s, 8 * s, 8 * s);
        ctx.fillStyle = BUILDING_DARK_COLORS.fisherman;
        ctx.beginPath();
        ctx.moveTo(-5 * s, -2 * s);
        ctx.lineTo(0, -7 * s);
        ctx.lineTo(5 * s, -2 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#4A2800';
        ctx.fillRect(-1 * s, 2 * s, 2 * s, 4 * s);
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-3 * s, 0, 2 * s, 2 * s);
        ctx.fillRect(1 * s, 0, 2 * s, 2 * s);
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(5 * s, -1 * s);
        ctx.lineTo(7 * s, -3 * s);
        ctx.lineTo(7 * s, 1 * s);
        ctx.stroke();
        break;
      }
      case 'hotel': {
        ctx.fillStyle = BUILDING_COLORS.hotel;
        ctx.fillRect(-4 * s, -6 * s, 8 * s, 12 * s);
        ctx.fillStyle = BUILDING_DARK_COLORS.hotel;
        ctx.fillRect(-5 * s, -7 * s, 10 * s, 2 * s);
        for (let floor = 0; floor < 3; floor++) {
          const fy = -5 * s + floor * 4 * s;
          ctx.fillStyle = '#FFE4B5';
          ctx.fillRect(-3 * s, fy + 0.5 * s, 2 * s, 2 * s);
          ctx.fillRect(1 * s, fy + 0.5 * s, 2 * s, 2 * s);
        }
        ctx.fillStyle = BUILDING_DARK_COLORS.hotel;
        ctx.fillRect(-1.5 * s, 2 * s, 3 * s, 4 * s);
        break;
      }
      case 'restaurant': {
        ctx.fillStyle = BUILDING_COLORS.restaurant;
        ctx.fillRect(-4 * s, -2 * s, 8 * s, 8 * s);
        ctx.fillStyle = BUILDING_DARK_COLORS.restaurant;
        ctx.fillRect(-5 * s, -3 * s, 10 * s, 2 * s);
        ctx.fillRect(3 * s, -6 * s, 2 * s, 4 * s);
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(4 * s, -6.5 * s, s, 0, Math.PI * 2);
        ctx.arc(3.5 * s, -7.5 * s, 0.7 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BUILDING_DARK_COLORS.restaurant;
        ctx.fillRect(-1.5 * s, 2 * s, 3 * s, 4 * s);
        ctx.fillStyle = '#FFE4B5';
        ctx.fillRect(-3 * s, 0, 2 * s, 2 * s);
        ctx.fillRect(1 * s, 0, 2 * s, 2 * s);
        break;
      }
      case 'lighthouse': {
        ctx.fillStyle = BUILDING_COLORS.lighthouse;
        ctx.fillRect(-2 * s, -6 * s, 4 * s, 12 * s);
        for (let stripe = 0; stripe < 3; stripe++) {
          ctx.fillStyle = '#CC4444';
          ctx.fillRect(-2 * s, -6 * s + stripe * 4 * s, 4 * s, 2 * s);
        }
        ctx.fillStyle = '#FFEE00';
        ctx.fillRect(-3 * s, -7 * s, 6 * s, 2 * s);
        ctx.fillStyle = 'rgba(255, 238, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(-3 * s, -6 * s);
        ctx.lineTo(-8 * s, -2 * s);
        ctx.lineTo(8 * s, -2 * s);
        ctx.lineTo(3 * s, -6 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#666';
        ctx.fillRect(-3.5 * s, 4 * s, 7 * s, 2 * s);
        break;
      }
      case 'garden': {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s);
        ctx.strokeStyle = BUILDING_DARK_COLORS.garden;
        ctx.lineWidth = 1;
        ctx.strokeRect(-5 * s, -5 * s, 10 * s, 10 * s);
        const flowerColors = ['#FF69B4', '#FFD700', '#FF6347', '#9370DB', '#FF69B4', '#FFD700'];
        const flowerPositions = [[-3, -3], [0, -2], [3, -3], [-2, 1], [2, 1], [0, 3]];
        for (let i = 0; i < flowerPositions.length; i++) {
          ctx.fillStyle = flowerColors[i % flowerColors.length];
          ctx.fillRect(flowerPositions[i][0] * s - 0.5 * s, flowerPositions[i][1] * s - 0.5 * s, s, s);
          ctx.fillStyle = '#006400';
          ctx.fillRect(flowerPositions[i][0] * s, flowerPositions[i][1] * s + 0.5 * s, 0.3 * s, s);
        }
        break;
      }
    }
  }

  private drawUpgradeProgressBars(currentTime: number): void {
    const ctx = this.ctx;
    this.engine.buildings.forEach(b => {
      if (!b.isUpgrading) return;
      const x = this.gridOffsetX + b.gridX * this.cellSize;
      const y = this.gridOffsetY + b.gridY * this.cellSize;
      const barW = this.cellSize - 4;
      const barH = 4;
      const barX = x + 2;
      const barY = y - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#44FF44';
      const visualProgress = easeOutProgress(b.upgradeProgress);
      ctx.fillRect(barX, barY, barW * visualProgress, barH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    });
  }

  private drawTourists(currentTime: number): void {
    const ctx = this.ctx;
    for (const t of this.engine.tourists) {
      if (!t.alive && !t.fadeOut && !t.coinBubble) continue;

      const px = this.gridOffsetX + t.x * this.cellSize;
      const py = this.gridOffsetY + t.y * this.cellSize;
      const bobOffset = Math.sin(t.bobPhase) * 1.5;

      ctx.save();
      let alpha = 1;
      if (t.fadeOut) {
        alpha = Math.max(0, 1 - t.fadeTimer * 2);
      }
      ctx.globalAlpha = alpha;

      const color = TOURIST_COLORS[t.color];
      ctx.fillStyle = color;

      const ts = Math.max(2, this.cellSize * 0.12);
      ctx.fillRect(px - ts, py - ts + bobOffset, ts * 2, ts * 2);

      ctx.fillStyle = '#000';
      ctx.fillRect(px - ts, py - ts + bobOffset, ts * 0.5, ts * 0.5);
      ctx.fillRect(px + ts * 0.5, py - ts + bobOffset, ts * 0.5, ts * 0.5);

      ctx.fillStyle = color;
      ctx.fillRect(px - ts * 0.8, py - ts * 1.5 + bobOffset, ts * 1.6, ts * 0.6);

      ctx.restore();
    }
  }

  private drawCoinBubbles(currentTime: number): void {
    const ctx = this.ctx;
    for (const t of this.engine.tourists) {
      if (!t.coinBubble) continue;
      const elapsed = currentTime - t.coinBubble.startTime;
      const progress = Math.min(elapsed / 250, 1);

      let scale: number;
      if (progress < 0.4) {
        const p = progress / 0.4;
        scale = 0.3 + 0.9 * easeOutCubic(p);
      } else {
        const p = (progress - 0.4) / 0.6;
        scale = 1.2 - 0.2 * easeOutBack(p);
      }

      const px = this.gridOffsetX + t.x * this.cellSize;
      const py = this.gridOffsetY + t.y * this.cellSize - this.cellSize * 0.45;

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      ctx.globalAlpha = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#8B6914';
      ctx.font = `bold 7px ${this.pixelFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);

      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.engine.particles) {
      const px = this.gridOffsetX + p.x * this.cellSize;
      const py = this.gridOffsetY + p.y * this.cellSize;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      const size = p.size * (this.cellSize / 32);
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
      ctx.restore();
    }
  }

  private drawToolbar(currentTime: number): void {
    const ctx = this.ctx;
    const tw = this.toolbarWidth;
    const h = window.innerHeight;

    ctx.fillStyle = 'rgba(44, 24, 16, 0.85)';
    ctx.fillRect(0, 0, tw, h);

    ctx.strokeStyle = 'rgba(139, 90, 43, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tw, 0);
    ctx.lineTo(tw, h);
    ctx.stroke();

    ctx.font = `${Math.max(7, tw * 0.09)}px ${this.pixelFont}`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText('建筑', tw / 2, 20);

    const cardH = Math.min(65, (h - 40) / 5);
    const cardPadding = 4;
    const cardW = tw - cardPadding * 2;

    for (let i = 0; i < BUILDING_TYPES.length; i++) {
      const type = BUILDING_TYPES[i];
      const cy = 30 + i * (cardH + 3);
      const cx = cardPadding;

      const isHovered = this.input && this.input.isDraggingFromToolbar() && this.input.getDragBuildingType() === type;

      ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(60, 40, 25, 0.6)';
      this.roundRect(cx, cy, cardW, cardH, 4);
      ctx.fill();
      ctx.strokeStyle = BUILDING_COLORS[type];
      ctx.lineWidth = 2;
      this.roundRect(cx, cy, cardW, cardH, 4);
      ctx.stroke();

      ctx.fillStyle = BUILDING_COLORS[type];
      ctx.fillRect(cx + 4, cy + 4, cardW - 8, cardH * 0.4);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${Math.max(6, tw * 0.07)}px ${this.pixelFont}`;
      ctx.textAlign = 'center';
      ctx.fillText(BUILDING_NAMES[type], tw / 2, cy + cardH * 0.72);

      ctx.fillStyle = '#AAAAAA';
      ctx.font = `${Math.max(5, tw * 0.055)}px ${this.pixelFont}`;
      const rate = type === 'hotel' ? '容量+3' : `${[5, 0, 8, 0, 3][i]}金/分`;
      ctx.fillText(rate, tw / 2, cy + cardH * 0.92);
    }
  }

  private drawGoldCounter(w: number): void {
    const ctx = this.ctx;
    const rightOffset = this.engine.showStats ? this.sidebarWidth : 0;
    const x = w - rightOffset - 150;
    const y = 10;

    ctx.fillStyle = 'rgba(44, 24, 16, 0.8)';
    this.roundRect(x, y, 140, 36, 6);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    this.roundRect(x, y, 140, 36, 6);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = `11px ${this.pixelFont}`;
    ctx.textAlign = 'left';
    ctx.fillText('💰', x + 8, y + 23);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `10px ${this.pixelFont}`;
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(this.engine.gold).toString(), x + 132, y + 23);
  }

  private drawStatsButton(w: number, h: number): void {
    const ctx = this.ctx;
    const rightOffset = this.engine.showStats ? this.sidebarWidth : 0;
    const bw = 50;
    const bh = 50;
    const bx = w - rightOffset - bw - 10;
    const by = h - bh - 10;

    this.statsButtonRect = { x: bx, y: by, w: bw, h: bh };

    ctx.fillStyle = this.engine.showStats ? 'rgba(255, 215, 0, 0.9)' : 'rgba(44, 24, 16, 0.85)';
    this.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    this.roundRect(bx, by, bw, bh, 8);
    ctx.stroke();

    ctx.fillStyle = this.engine.showStats ? '#000' : '#FFD700';
    ctx.font = `8px ${this.pixelFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('统计', bx + bw / 2, by + bh / 2 + 3);

    if (this.input) {
      this.input.setStatsButtonArea(bx, by, bw, bh);
    }
  }

  private drawStatsSidebar(w: number, h: number, currentTime: number): void {
    const ctx = this.ctx;
    const sw = this.sidebarWidth;
    const sx = w - sw;

    ctx.fillStyle = 'rgba(44, 24, 16, 0.92)';
    ctx.fillRect(sx, 0, sw, h);
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = `11px ${this.pixelFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('📊 统计面板', sx + sw / 2, 30);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `8px ${this.pixelFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(`今日游客: ${this.engine.todayTourists}`, sx + 15, 55);
    ctx.fillText(`总收入: ${Math.floor(this.engine.totalIncome)}金`, sx + 15, 75);

    this.drawDonutChart(sx + sw / 2, 160, 60, currentTime);

    ctx.fillStyle = '#FFD700';
    ctx.font = `9px ${this.pixelFont}`;
    ctx.textAlign = 'center';
    ctx.fillText('交易记录', sx + sw / 2, 240);

    const txStartY = 255;
    const txH = 28;
    const transactions = this.engine.transactions;
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const slideOffset = (1 - easeOutCubic(tx.slideProgress)) * 30;
      const ty = txStartY + i * txH + slideOffset;
      const alpha = tx.slideProgress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(60, 40, 25, 0.5)';
      this.roundRect(sx + 10, ty, sw - 20, txH - 3, 3);
      ctx.fill();

      ctx.fillStyle = TOURIST_COLORS[tx.touristColor];
      ctx.fillRect(sx + 16, ty + 5, 8, 8);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `7px ${this.pixelFont}`;
      ctx.textAlign = 'left';
      ctx.fillText(BUILDING_NAMES[tx.buildingType], sx + 30, ty + 13);

      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'right';
      ctx.fillText(`+${tx.amount}金`, sx + sw - 18, ty + 13);

      ctx.restore();
    }
  }

  private drawDonutChart(cx: number, cy: number, radius: number, currentTime: number): void {
    const ctx = this.ctx;
    const production = this.engine.getBuildingProductionByType();
    const total = Object.values(production).reduce((s, v) => s + v, 0);

    if (total === 0) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.font = `7px ${this.pixelFont}`;
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', cx, cy + 3);
      return;
    }

    const animProgress = easeOutCubic(Math.min(1, (currentTime - this.engine.statsOpenTime) / 800));

    let startAngle = -Math.PI / 2;
    const innerRadius = radius * 0.55;

    for (const type of BUILDING_TYPES) {
      const value = production[type];
      if (value <= 0) continue;
      const sliceAngle = (value / total) * Math.PI * 2 * animProgress;

      ctx.fillStyle = BUILDING_COLORS[type];
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(44, 24, 16, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (animProgress >= 0.5) {
        const midAngle = startAngle + sliceAngle / 2;
        const labelR = (radius + innerRadius) / 2;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.fillStyle = '#FFF';
        ctx.font = `6px ${this.pixelFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(BUILDING_NAMES[type], lx, ly);
      }

      startAngle += sliceAngle;
    }

    ctx.fillStyle = 'rgba(44, 24, 16, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = `8px ${this.pixelFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(total)}/分`, cx, cy);
  }

  private drawUpgradeMenu(currentTime: number): void {
    const ctx = this.ctx;
    const b = this.engine.buildings.get(this.engine.upgradeMenuBuildingId);
    if (!b) { this.engine.closeUpgradeMenu(); return; }

    const bx = this.gridOffsetX + b.gridX * this.cellSize + this.cellSize;
    const by = this.gridOffsetY + b.gridY * this.cellSize - 20;
    const mw = 140;
    const mh = 90;

    const finalX = Math.min(bx, window.innerWidth - mw - 5);
    const finalY = Math.max(5, Math.min(by, window.innerHeight - mh - 5));

    this.upgradeMenuRect = { x: finalX, y: finalY, w: mw, h: mh };

    ctx.fillStyle = 'rgba(44, 24, 16, 0.95)';
    this.roundRect(finalX, finalY, mw, mh, 6);
    ctx.fill();
    ctx.strokeStyle = BUILDING_COLORS[b.type];
    ctx.lineWidth = 2;
    this.roundRect(finalX, finalY, mw, mh, 6);
    ctx.stroke();

    ctx.fillStyle = BUILDING_COLORS[b.type];
    ctx.font = `8px ${this.pixelFont}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${BUILDING_NAMES[b.type]} Lv${b.level}`, finalX + 10, finalY + 18);

    ctx.fillStyle = '#CCCCCC';
    ctx.font = `6px ${this.pixelFont}`;
    const rate = this.engine.getBuildingGoldRate(b);
    ctx.fillText(`产出: ${rate.toFixed(1)}金/分`, finalX + 10, finalY + 34);

    if (b.level < 5) {
      const cost = this.engine.getUpgradeCost(b.id);
      const canAfford = this.engine.gold >= cost;
      ctx.fillStyle = canAfford ? '#44FF44' : '#FF6666';
      ctx.font = `6px ${this.pixelFont}`;
      ctx.fillText(`升级费: ${cost}金`, finalX + 10, finalY + 48);

      const btnX = finalX + 10;
      const btnY = finalY + 56;
      const btnW = mw - 20;
      const btnH = 24;

      ctx.fillStyle = canAfford ? 'rgba(68, 255, 68, 0.3)' : 'rgba(255, 68, 68, 0.2)';
      this.roundRect(btnX, btnY, btnW, btnH, 4);
      ctx.fill();
      ctx.strokeStyle = canAfford ? '#44FF44' : '#FF6666';
      ctx.lineWidth = 1.5;
      this.roundRect(btnX, btnY, btnW, btnH, 4);
      ctx.stroke();

      ctx.fillStyle = canAfford ? '#FFFFFF' : '#999999';
      ctx.font = `7px ${this.pixelFont}`;
      ctx.textAlign = 'center';
      ctx.fillText(`升级 → Lv${b.level + 1}`, btnX + btnW / 2, btnY + 16);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.font = `7px ${this.pixelFont}`;
      ctx.textAlign = 'center';
      ctx.fillText('已达最高等级!', finalX + mw / 2, finalY + 65);
    }

    if (this.input) {
      this.input.setUpgradeMenuRect(this.upgradeMenuRect);
    }
  }

  private drawDragPreview(currentTime: number): void {
    if (!this.input || !this.input.isDragging()) return;
    const dragType = this.input.getDragBuildingType();
    if (!dragType) return;

    const mousePos = this.input.getMousePosition();
    const ctx = this.ctx;

    const fakeBuilding: Building = {
      id: -1, type: dragType,
      gridX: 0, gridY: 0, level: 1,
      isUpgrading: false, upgradeProgress: 0,
      upgradeStartTime: 0, placeAnimStartTime: currentTime - 300,
      selected: false,
    };

    ctx.save();
    ctx.globalAlpha = 0.6;
    this.drawBuilding(fakeBuilding, currentTime, mousePos.x, mousePos.y, 0.6);

    const gridPos = this.screenToGrid(mousePos.x, mousePos.y);
    if (gridPos && this.engine.canPlaceBuilding(gridPos.gx, gridPos.gy)) {
      const highlightX = this.gridOffsetX + gridPos.gx * this.cellSize;
      const highlightY = this.gridOffsetY + gridPos.gy * this.cellSize;
      ctx.fillStyle = 'rgba(68, 255, 68, 0.25)';
      ctx.fillRect(highlightX, highlightY, this.cellSize, this.cellSize);
      ctx.strokeStyle = 'rgba(68, 255, 68, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(highlightX, highlightY, this.cellSize, this.cellSize);
    }
    ctx.restore();
  }

  screenToGrid(sx: number, sy: number): { gx: number; gy: number } | null {
    const gx = Math.floor((sx - this.gridOffsetX) / this.cellSize);
    const gy = Math.floor((sy - this.gridOffsetY) / this.cellSize);
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return null;
    return { gx, gy };
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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
}
