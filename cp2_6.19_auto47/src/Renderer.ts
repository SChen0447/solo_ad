import {
  Building,
  BuildingType,
  BUILDING_CONFIGS,
  GRID_SIZE,
  Particle,
  Visitor,
  VisitorColor
} from './types';
import { GameEngine } from './GameEngine';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  engine: GameEngine;
  offsetX: number;
  offsetY: number;
  hoverCellX: number;
  hoverCellY: number;
  dragPreview: { type: BuildingType; x: number; y: number } | null;
  buildingDragPreview: { buildingId: number; x: number; y: number } | null;
  donutAnimProgress: number;
  donutAnimTarget: number;
  lastCoinDisplay: number;
  coinAnim: number;
  sidebarWidth: number;
  toolbarWidth: number;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.engine = engine;
    this.offsetX = 0;
    this.offsetY = 0;
    this.hoverCellX = -1;
    this.hoverCellY = -1;
    this.dragPreview = null;
    this.buildingDragPreview = null;
    this.donutAnimProgress = 0;
    this.donutAnimTarget = 0;
    this.lastCoinDisplay = engine.coins;
    this.coinAnim = 0;
    this.sidebarWidth = 300;
    this.toolbarWidth = 80;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const totalGridW = GRID_SIZE * this.engine.cellSize;
    const totalGridH = GRID_SIZE * this.engine.cellSize;
    let sidebarOffset = 0;
    if (!this.engine.isMobile) {
      sidebarOffset = this.engine.statsPanelAnimProgress * this.sidebarWidth;
    }
    this.offsetX = this.toolbarWidth + (window.innerWidth - this.toolbarWidth - totalGridW - sidebarOffset) / 2;
    this.offsetY = (window.innerHeight - totalGridH) / 2;
    if (this.engine.isMobile) {
      this.offsetY = 60;
      this.offsetX = (window.innerWidth - totalGridW) / 2;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    this.drawBackground();
    this.drawDock();
    this.drawGrid();
    this.drawBuildings();
    this.drawVisitors();
    this.drawParticles();
    this.drawDragPreviews();
    this.drawToolbar();
    this.drawCoinDisplay();
    this.drawStatsButton();
    this.drawUpgradeMenu();

    if (this.engine.statsPanelAnimProgress > 0) {
      if (this.engine.isMobile) {
        this.drawBottomStatsPanel();
      } else {
        this.drawSidebar();
      }
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#FFE4B5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 20; i++) {
      const x = (i * 137 + Date.now() * 0.01) % (window.innerWidth + 100) - 50;
      const y = 50 + (i % 5) * 40;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.arc(x + 12, y + 3, 12, 0, Math.PI * 2);
      ctx.arc(x - 10, y + 5, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDock() {
    const ctx = this.ctx;
    const cell = this.engine.cellSize;
    const dockY = Math.floor(GRID_SIZE / 2);
    const x = this.offsetX - cell;
    const y = this.offsetY + dockY * cell;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);

    ctx.fillStyle = '#A0522D';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 4 + i * 8, y + cell - 8, 6, 8);
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    const cell = this.engine.cellSize;

    ctx.save();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX + i * cell, this.offsetY);
      ctx.lineTo(this.offsetX + i * cell, this.offsetY + GRID_SIZE * cell);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.offsetX, this.offsetY + i * cell);
      ctx.lineTo(this.offsetX + GRID_SIZE * cell, this.offsetY + i * cell);
      ctx.stroke();
    }
    ctx.restore();

    if (this.hoverCellX >= 0 && this.hoverCellY >= 0 &&
        this.hoverCellX < GRID_SIZE && this.hoverCellY < GRID_SIZE) {
      const canPlace = this.engine.grid[this.hoverCellY][this.hoverCellX] === null;
      ctx.fillStyle = canPlace ? 'rgba(100, 255, 100, 0.25)' : 'rgba(255, 100, 100, 0.25)';
      ctx.fillRect(
        this.offsetX + this.hoverCellX * cell,
        this.offsetY + this.hoverCellY * cell,
        cell, cell
      );
    }
  }

  private drawBuildings() {
    for (const b of this.engine.buildings) {
      if (b.isDragging) continue;
      this.drawBuilding(b);
    }
  }

  private drawBuilding(b: Building) {
    const ctx = this.ctx;
    const cell = this.engine.cellSize;
    const cfg = BUILDING_CONFIGS[b.type];

    let drawX = this.offsetX + b.gridX * cell + b.shakeOffset.x;
    let drawY = this.offsetY + b.gridY * cell + b.shakeOffset.y;

    if (this.engine.selectedBuildingId === b.id) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.0)';
      ctx.fillRect(drawX - 2, drawY - 2, cell + 4, cell + 4);
      ctx.restore();
    }

    ctx.save();
    const cx = drawX + cell / 2;
    const cy = drawY + cell / 2;
    ctx.translate(cx, cy);
    ctx.scale(b.scale, b.scale);
    ctx.translate(-cx, -cy);

    const padding = 2;
    const innerW = cell - padding * 2;
    const innerH = cell - padding * 2;

    ctx.fillStyle = cfg.color;
    this.roundRect(ctx, drawX + padding, drawY + padding, innerW, innerH, 4);
    ctx.fill();

    ctx.strokeStyle = this.darkenColor(cfg.color, 0.3);
    ctx.lineWidth = 2;
    this.roundRect(ctx, drawX + padding, drawY + padding, innerW, innerH, 4);
    ctx.stroke();

    this.drawBuildingIcon(ctx, b.type, drawX + padding, drawY + padding, innerW, innerH);

    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < b.level; i++) {
      const starX = drawX + 3 + i * 5;
      const starY = drawY + cell - 6;
      ctx.fillRect(starX, starY, 3, 3);
    }

    ctx.restore();

    if (b.upgrading) {
      const barW = cell - 8;
      const barH = 4;
      const barX = drawX + 4;
      const barY = drawY - 10;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(barX, barY, barW * b.upgradeProgress, barH);
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
    }
  }

  private drawBuildingIcon(ctx: CanvasRenderingContext2D, type: BuildingType, x: number, y: number, w: number, h: number) {
    const px = Math.max(2, Math.floor(w / 8));
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.fillStyle = this.lightenColor(BUILDING_CONFIGS[type].color, 0.2);

    switch (type) {
      case 'fishery':
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(cx - px * 2, cy - px, px * 4, px * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - px * 3, cy, px, px);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx + px, cy - px / 2, px, px);
        break;
      case 'hotel':
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(cx - px * 2, cy - px * 2, px * 4, px * 3);
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(cx - px * 2.5, cy - px * 2);
        ctx.lineTo(cx, cy - px * 3);
        ctx.lineTo(cx + px * 2.5, cy - px * 2);
        ctx.fill();
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(cx - px * 1.2, cy - px, px, px);
        ctx.fillRect(cx + px * 0.2, cy - px, px, px);
        ctx.fillStyle = '#654321';
        ctx.fillRect(cx - px / 2, cy, px, px * 2);
        break;
      case 'restaurant':
        ctx.fillStyle = '#FFF8DC';
        ctx.fillRect(cx - px * 2, cy - px / 2, px * 4, px * 2);
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(cx - px * 2.5, cy - px, px * 5, px / 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - px, cy, px, px * 1.5);
        ctx.fillRect(cx, cy, px, px * 1.5);
        break;
      case 'lighthouse':
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - px, cy - px * 3, px * 2, px * 5);
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(cx - px, cy - px * 2, px * 2, px);
        ctx.fillRect(cx - px, cy, px * 2, px);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy - px * 3, px * 1.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'garden':
        ctx.fillStyle = '#228B22';
        ctx.fillRect(cx - px * 2, cy + px, px * 4, px);
        const flowerColors = ['#FF69B4', '#FF1493', '#FFB6C1', '#FF69B4'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = flowerColors[i];
          ctx.beginPath();
          ctx.arc(cx - px * 1.5 + i * px, cy - px / 2, px * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(cx - px * 1.5 + i * px - 1, cy - px / 2 - 1, 2, 2);
        }
        break;
    }
  }

  private drawVisitors() {
    for (const v of this.engine.visitors) {
      this.drawVisitor(v);
    }
  }

  private drawVisitor(v: Visitor) {
    const ctx = this.ctx;
    const size = Math.max(4, this.engine.cellSize / 4);

    const drawX = this.offsetX + v.x - size;
    const drawY = this.offsetY + v.y - size + v.bobOffset;

    const colors: Record<VisitorColor, string> = {
      red: '#E74C3C',
      yellow: '#F1C40F',
      blue: '#3498DB',
      green: '#2ECC71'
    };

    ctx.fillStyle = colors[v.color];
    ctx.fillRect(drawX, drawY, size, size);

    ctx.fillStyle = this.darkenColor(colors[v.color], 0.3);
    ctx.fillRect(drawX, drawY + size, size / 2, size / 2);
    ctx.fillRect(drawX + size / 2, drawY + size, size / 2, size / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(drawX + 1, drawY + 1, 1, 1);
    ctx.fillRect(drawX + size - 2, drawY + 1, 1, 1);

    if (v.showingCoin && v.coinScale > 0) {
      ctx.save();
      const coinCx = drawX + size / 2;
      const coinCy = drawY - 10;
      ctx.translate(coinCx, coinCy);
      ctx.scale(v.coinScale, v.coinScale);
      ctx.translate(-coinCx, -coinCy);

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(coinCx, coinCy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#B8860B';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', coinCx, coinCy + 1);

      ctx.restore();
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.engine.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(
        this.offsetX + p.x - p.size / 2,
        this.offsetY + p.y - p.size / 2,
        p.size, p.size
      );
      ctx.restore();
    }
  }

  private drawDragPreviews() {
    const ctx = this.ctx;
    const cell = this.engine.cellSize;

    if (this.dragPreview) {
      const cfg = BUILDING_CONFIGS[this.dragPreview.type];
      const previewX = this.dragPreview.x - cell / 2;
      const previewY = this.dragPreview.y - cell / 2;

      ctx.save();
      ctx.globalAlpha = 0.7;

      ctx.fillStyle = cfg.color;
      this.roundRect(ctx, previewX + 2, previewY + 2, cell - 4, cell - 4, 4);
      ctx.fill();
      ctx.strokeStyle = this.darkenColor(cfg.color, 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.globalAlpha = 1;
      this.drawBuildingIcon(ctx, this.dragPreview.type, previewX + 2, previewY + 2, cell - 4, cell - 4);
      ctx.restore();
    }

    if (this.buildingDragPreview) {
      const b = this.engine.buildings.find(x => x.id === this.buildingDragPreview!.buildingId);
      if (b) {
        const previewX = this.buildingDragPreview.x - cell / 2;
        const previewY = this.buildingDragPreview.y - cell / 2;
        const cfg = BUILDING_CONFIGS[b.type];

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = cfg.color;
        this.roundRect(ctx, previewX + 2, previewY + 2, cell - 4, cell - 4, 4);
        ctx.fill();
        ctx.strokeStyle = this.darkenColor(cfg.color, 0.3);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.globalAlpha = 0.8;
        this.drawBuildingIcon(ctx, b.type, previewX + 2, previewY + 2, cell - 4, cell - 4);
        ctx.restore();
      }
    }
  }

  private drawToolbar() {
    const ctx = this.ctx;
    const buildingTypes: BuildingType[] = ['fishery', 'hotel', 'restaurant', 'lighthouse', 'garden'];
    const btnSize = 60;
    const gap = 10;
    const startY = 20;

    ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
    this.roundRect(ctx, 10, 10, this.toolbarWidth - 10, startY + buildingTypes.length * (btnSize + gap) + 20, 8);
    ctx.fill();
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.stroke();

    buildingTypes.forEach((type, i) => {
      const cfg = BUILDING_CONFIGS[type];
      const bx = 15;
      const by = startY + i * (btnSize + gap);
      const isHovered = this.dragPreview?.type === type;

      if (isHovered) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.0)';
        ctx.fillRect(bx - 2, by - 2, btnSize + 4, btnSize + 4);
        ctx.restore();
      }

      ctx.fillStyle = cfg.color;
      this.roundRect(ctx, bx, by, btnSize, btnSize, 6);
      ctx.fill();
      ctx.strokeStyle = this.darkenColor(cfg.color, 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();

      this.drawBuildingIcon(ctx, type, bx + 8, by + 8, btnSize - 16, btnSize - 16);

      ctx.fillStyle = '#333333';
      ctx.font = this.engine.isMobile ? '10px monospace' : '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cfg.name, bx + btnSize / 2, by + btnSize + 12);
    });
  }

  private drawCoinDisplay() {
    const ctx = this.ctx;
    const padding = 15;
    const text = `💰 ${Math.floor(this.engine.coins)}`;
    ctx.font = this.engine.isMobile ? 'bold 18px monospace' : 'bold 22px monospace';
    const textWidth = ctx.measureText(text).width;
    const boxW = textWidth + padding * 2 + 20;
    const boxH = 44;

    let boxX = window.innerWidth - boxW - 20;
    let boxY = 20;
    if (this.engine.isMobile) {
      boxX = window.innerWidth - boxW - 10;
      boxY = 10;
    }
    if (!this.engine.isMobile && this.engine.statsPanelAnimProgress > 0) {
      boxX -= this.engine.statsPanelAnimProgress * this.sidebarWidth;
    }

    if (this.lastCoinDisplay !== this.engine.coins) {
      this.coinAnim = 1;
      this.lastCoinDisplay = this.engine.coins;
    }
    if (this.coinAnim > 0) {
      this.coinAnim -= 0.02;
      if (this.coinAnim < 0) this.coinAnim = 0;
    }

    ctx.save();
    if (this.coinAnim > 0) {
      const scale = 1 + this.coinAnim * 0.15;
      const cx = boxX + boxW / 2;
      const cy = boxY + boxH / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.font = this.engine.isMobile ? 'bold 18px monospace' : 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + padding, boxY + boxH / 2);

    ctx.restore();
  }

  private drawStatsButton() {
    const ctx = this.ctx;
    const btnW = this.engine.isMobile ? 56 : 64;
    const btnH = this.engine.isMobile ? 56 : 64;
    let btnX = window.innerWidth - btnW - 20;
    let btnY = window.innerHeight - btnH - 20;
    if (this.engine.isMobile) {
      btnX = window.innerWidth - btnW - 10;
      btnY = window.innerHeight - btnH - 80;
    }
    if (!this.engine.isMobile && this.engine.statsPanelAnimProgress > 0) {
      btnX -= this.engine.statsPanelAnimProgress * this.sidebarWidth;
    }

    ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.font = this.engine.isMobile ? 'bold 24px Arial' : 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊', btnX + btnW / 2, btnY + btnH / 2 + 2);
  }

  private drawSidebar() {
    const ctx = this.ctx;
    const w = this.sidebarWidth;
    const x = window.innerWidth - w * this.engine.statsPanelAnimProgress;
    const y = 0;
    const h = window.innerHeight;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 253, 240, 0.98)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, h);
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📊 经营统计', x + 20, y + 20);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(`今日游客: ${this.engine.stats.todayVisitors}`, x + 20, y + 55);
    ctx.fillText(`总收入: ${Math.floor(this.engine.stats.totalIncome)} 金币`, x + 20, y + 78);

    this.drawDonutChart(x + w / 2, y + 170, 60, this.donutAnimTarget);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('最近交易:', x + 20, y + 270);

    const listY = y + 295;
    const itemH = 30;
    const listH = h - listY - 20;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 10, listY, w - 20, listH);
    ctx.clip();

    this.engine.stats.recentTransactions.forEach((tx, i) => {
      let itemY = listY + i * itemH;
      if (i === 0 && this.engine.newTransactionAnim >= 0) {
        itemY += (1 - this.engine.newTransactionAnim) * 30;
      }
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 220, 0.6)' : 'transparent';
      ctx.fillRect(x + 10, itemY, w - 20, itemH - 2);

      ctx.fillStyle = '#333333';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${tx.source}`, x + 20, itemY + 8);

      ctx.fillStyle = '#228B22';
      ctx.textAlign = 'right';
      ctx.fillText(`+${tx.amount}`, x + w - 20, itemY + 8);
    });
    ctx.restore();

    ctx.restore();
  }

  private drawBottomStatsPanel() {
    const ctx = this.ctx;
    const h = window.innerHeight * 0.7;
    const y = window.innerHeight - h * this.engine.statsPanelAnimProgress;
    const w = window.innerWidth;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, window.innerHeight);

    ctx.fillStyle = 'rgba(255, 253, 240, 0.98)';
    this.roundRect(ctx, 0, y, w, h, [16, 16, 0, 0] as any);
    ctx.fill();
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📊 经营统计', 20, y + 15);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(`今日游客: ${this.engine.stats.todayVisitors}`, 20, y + 45);
    ctx.fillText(`总收入: ${Math.floor(this.engine.stats.totalIncome)} 金币`, 20, y + 65);

    this.drawDonutChart(w / 2, y + 150, 50, this.donutAnimTarget);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('最近交易:', 20, y + 235);

    const listY = y + 255;
    const itemH = 28;
    const listH = h - 275;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, listY, w, listH);
    ctx.clip();

    this.engine.stats.recentTransactions.forEach((tx, i) => {
      let itemY = listY + i * itemH;
      if (i === 0 && this.engine.newTransactionAnim >= 0) {
        itemY += (1 - this.engine.newTransactionAnim) * 28;
      }
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 220, 0.6)' : 'transparent';
      ctx.fillRect(10, itemY, w - 20, itemH - 2);

      ctx.fillStyle = '#333333';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${tx.source}`, 20, itemY + 7);

      ctx.fillStyle = '#228B22';
      ctx.textAlign = 'right';
      ctx.fillText(`+${tx.amount}`, w - 20, itemY + 7);
    });
    ctx.restore();

    ctx.restore();
  }

  private drawDonutChart(cx: number, cy: number, radius: number, animProgress: number) {
    const ctx = this.ctx;
    const total = Object.values(this.engine.stats.buildingIncome).reduce((a, b) => a + b, 0);
    if (total === 0) {
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    const buildingTypes: BuildingType[] = ['fishery', 'hotel', 'restaurant', 'lighthouse', 'garden'];
    let startAngle = -Math.PI / 2;
    const holeRadius = radius * 0.6;

    buildingTypes.forEach(type => {
      const value = this.engine.stats.buildingIncome[type];
      const portion = (value / total) * animProgress;
      const endAngle = startAngle + Math.PI * 2 * portion;

      ctx.fillStyle = BUILDING_CONFIGS[type].color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.lineTo(cx, cy);
      ctx.fill();

      startAngle = endAngle;
    });

    ctx.fillStyle = 'rgba(255, 253, 240, 0.98)';
    ctx.beginPath();
    ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(total)}`, cx, cy - 6);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666666';
    ctx.fillText('总收入', cx, cy + 10);

    const legendY = cy + radius + 20;
    buildingTypes.forEach((type, i) => {
      const lx = cx - 80;
      const ly = legendY + i * 16;
      ctx.fillStyle = BUILDING_CONFIGS[type].color;
      ctx.fillRect(lx, ly, 10, 10);
      ctx.fillStyle = '#333333';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${BUILDING_CONFIGS[type].name}: ${this.engine.stats.buildingIncome[type]}`, lx + 14, ly + 9);
    });
  }

  private drawUpgradeMenu() {
    if (this.engine.upgradeMenuOpenFor === null) return;
    const b = this.engine.buildings.find(x => x.id === this.engine.upgradeMenuOpenFor);
    if (!b) return;

    const ctx = this.ctx;
    const cfg = BUILDING_CONFIGS[b.type];
    const cell = this.engine.cellSize;

    const menuW = this.engine.isMobile ? 200 : 220;
    const menuH = this.engine.isMobile ? 160 : 170;
    let menuX = this.offsetX + (b.gridX + 1) * cell + 10;
    let menuY = this.offsetY + b.gridY * cell;

    if (menuX + menuW > window.innerWidth - (this.engine.isMobile ? 10 : this.sidebarWidth * this.engine.statsPanelAnimProgress)) {
      menuX = this.offsetX + b.gridX * cell - menuW - 10;
    }
    if (menuY + menuH > window.innerHeight) {
      menuY = window.innerHeight - menuH - 10;
    }

    ctx.fillStyle = 'rgba(255, 253, 240, 0.98)';
    this.roundRect(ctx, menuX, menuY, menuW, menuH, 8);
    ctx.fill();
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.font = this.engine.isMobile ? 'bold 14px monospace' : 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${cfg.name} Lv.${b.level}`, menuX + 15, menuY + 15);

    ctx.font = this.engine.isMobile ? '11px monospace' : '12px monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(`产出: ${this.engine.getCoinRateForBuilding(b).toFixed(1)}/分钟`, menuX + 15, menuY + 40);

    if (b.level < 5) {
      const nextCfg = BUILDING_CONFIGS[b.type];
      const nextRate = nextCfg.baseCoinPerMin + (nextCfg.maxCoinPerMin - nextCfg.baseCoinPerMin) * (b.level / 4);
      ctx.fillStyle = '#228B22';
      ctx.fillText(`升级后: ${nextRate.toFixed(1)}/分钟`, menuX + 15, menuY + 58);

      const btnX = menuX + 15;
      const btnY = menuY + menuH - 90;
      const btnW = menuW - 30;
      const btnH = 32;
      const cost = this.engine.getUpgradeCost(b);
      const canAfford = this.engine.coins >= cost;

      ctx.fillStyle = canAfford ? '#FFD700' : '#CCCCCC';
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 6);
      ctx.fill();
      ctx.strokeStyle = canAfford ? '#B8860B' : '#999999';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = canAfford ? '#333333' : '#666666';
      ctx.font = this.engine.isMobile ? 'bold 12px monospace' : 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`升级 (${cost}金币)`, btnX + btnW / 2, btnY + btnH / 2 + 4);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.font = this.engine.isMobile ? 'bold 12px monospace' : 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⭐ 已达最高等级 ⭐', menuX + menuW / 2, menuY + 65);
    }

    const delX = menuX + 15;
    const delY = menuY + menuH - 48;
    const delW = menuW - 30;
    const delH = 28;
    ctx.fillStyle = '#FF6B6B';
    this.roundRect(ctx, delX, delY, delW, delH, 6);
    ctx.fill();
    ctx.strokeStyle = '#CC5555';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = this.engine.isMobile ? 'bold 11px monospace' : 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('拆除建筑', delX + delW / 2, delY + delH / 2 + 4);
  }

  updateDonutAnim(deltaTime: number) {
    const target = this.engine.statsPanelTargetOpen ? 1 : 0;
    if (this.donutAnimProgress === target) return;
    const diff = target - this.donutAnimProgress;
    const speed = deltaTime / 800;
    if (Math.abs(diff) <= speed) {
      this.donutAnimProgress = target;
    } else {
      this.donutAnimProgress += Math.sign(diff) * speed;
    }
    this.donutAnimTarget = this.donutAnimProgress;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
    let radiusTL: number, radiusTR: number, radiusBR: number, radiusBL: number;
    if (typeof r === 'number') {
      radiusTL = radiusTR = radiusBR = radiusBL = r;
    } else {
      [radiusTL, radiusTR, radiusBR, radiusBL] = r;
    }
    ctx.beginPath();
    ctx.moveTo(x + radiusTL, y);
    ctx.lineTo(x + w - radiusTR, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radiusTR);
    ctx.lineTo(x + w, y + h - radiusBR);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radiusBR, y + h);
    ctx.lineTo(x + radiusBL, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radiusBL);
    ctx.lineTo(x, y + radiusTL);
    ctx.quadraticCurveTo(x, y, x + radiusTL, y);
    ctx.closePath();
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
    const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
    const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.floor((num >> 16) * (1 + amount)));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) * (1 + amount)));
    const b = Math.min(255, Math.floor((num & 0x0000FF) * (1 + amount)));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  getToolbarBuildingAt(x: number, y: number): BuildingType | null {
    const buildingTypes: BuildingType[] = ['fishery', 'hotel', 'restaurant', 'lighthouse', 'garden'];
    const btnSize = 60;
    const gap = 10;
    const startY = 20;

    for (let i = 0; i < buildingTypes.length; i++) {
      const bx = 15;
      const by = startY + i * (btnSize + gap);
      if (x >= bx && x <= bx + btnSize && y >= by && y <= by + btnSize) {
        return buildingTypes[i];
      }
    }
    return null;
  }

  getBuildingAt(x: number, y: number): Building | null {
    const cell = this.engine.cellSize;
    const gx = Math.floor((x - this.offsetX) / cell);
    const gy = Math.floor((y - this.offsetY) / cell);
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return null;
    return this.engine.grid[gy][gx];
  }

  getStatsButtonAt(x: number, y: number): boolean {
    const btnW = this.engine.isMobile ? 56 : 64;
    const btnH = this.engine.isMobile ? 56 : 64;
    let btnX = window.innerWidth - btnW - 20;
    let btnY = window.innerHeight - btnH - 20;
    if (this.engine.isMobile) {
      btnX = window.innerWidth - btnW - 10;
      btnY = window.innerHeight - btnH - 80;
    }
    if (!this.engine.isMobile && this.engine.statsPanelAnimProgress > 0) {
      btnX -= this.engine.statsPanelAnimProgress * this.sidebarWidth;
    }
    return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
  }

  getUpgradeMenuButtonAt(x: number, y: number): 'upgrade' | 'delete' | null {
    if (this.engine.upgradeMenuOpenFor === null) return null;
    const b = this.engine.buildings.find(bx => bx.id === this.engine.upgradeMenuOpenFor);
    if (!b) return null;

    const cell = this.engine.cellSize;
    const menuW = this.engine.isMobile ? 200 : 220;
    const menuH = this.engine.isMobile ? 160 : 170;
    let menuX = this.offsetX + (b.gridX + 1) * cell + 10;
    let menuY = this.offsetY + b.gridY * cell;

    if (menuX + menuW > window.innerWidth - (this.engine.isMobile ? 10 : this.sidebarWidth * this.engine.statsPanelAnimProgress)) {
      menuX = this.offsetX + b.gridX * cell - menuW - 10;
    }
    if (menuY + menuH > window.innerHeight) {
      menuY = window.innerHeight - menuH - 10;
    }

    const btnY = menuY + menuH - 90;
    const btnH = 32;
    if (x >= menuX + 15 && x <= menuX + menuW - 15 && y >= btnY && y <= btnY + btnH) {
      return 'upgrade';
    }

    const delY = menuY + menuH - 48;
    const delH = 28;
    if (x >= menuX + 15 && x <= menuX + menuW - 15 && y >= delY && y <= delY + delH) {
      return 'delete';
    }
    return null;
  }

  screenToGrid(x: number, y: number): { x: number; y: number } {
    const cell = this.engine.cellSize;
    return {
      x: Math.floor((x - this.offsetX) / cell),
      y: Math.floor((y - this.offsetY) / cell)
    };
  }
}
