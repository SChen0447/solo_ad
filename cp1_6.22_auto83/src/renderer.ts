import { GameEngine, ITEM_DATABASE, RECIPES, Item } from './gameEngine';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private noiseCanvas: HTMLCanvasElement | null = null;
  private time: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private fps: number = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.createNoiseTexture();
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private createNoiseTexture(): void {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.noiseCanvas = c;
  }

  render(engine: GameEngine, dt: number): void {
    this.time += dt;
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }
    this.calculateLayout(engine);

    this.ctx.fillStyle = '#2b1d14';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.renderNoise();
    this.renderTopMenu(engine);
    this.renderGrid(engine);
    this.renderCauldron(engine);
    this.renderCodex(engine);
    this.renderInventory(engine);
    this.renderChainArrows(engine);
    this.renderParticles(engine);
    this.renderDragItem(engine);
    this.renderAnimationEffects(engine);
    this.renderResetDialog(engine);
    this.renderToast(engine);
    this.renderNewCardAnimation(engine);
    this.renderFPS();
  }

  private calculateLayout(engine: GameEngine): void {
    const w = this.width;
    const h = this.height;
    const responsive = w < 768;
    engine.isResponsive = responsive;

    const topBarH = 56;
    const inventoryH = 140;
    let codexW = 290;
    let mainStartX = 20;
    let mainEndX = w - codexW - 20;

    if (responsive) {
      codexW = w - 40;
      mainStartX = 20;
      mainEndX = w - 20;
    }

    const mainW = mainEndX - mainStartX;
    const mainAreaH = h - topBarH - inventoryH - 40;

    const gridCell = Math.min(58, Math.max(40, Math.floor((Math.min(mainW * 0.45, 360)) / 6)));
    const gridW = gridCell * 6;
    const gridH = gridCell * 6;
    engine.ui.gridRect = {
      x: mainStartX,
      y: topBarH + 20 + Math.max(0, (mainAreaH - gridH) / 2),
      cellSize: gridCell,
      cols: 6,
      rows: 6,
    };

    const gridRight = mainStartX + gridW;
    const cauldronAreaLeft = gridRight + 30;
    const cauldronAreaRight = responsive ? mainEndX : (w - codexW - 30);
    const cauldronCX = cauldronAreaLeft + (cauldronAreaRight - cauldronAreaLeft) / 2;
    const cauldronCY = topBarH + 20 + mainAreaH / 2;
    engine.ui.cauldronRect = { x: cauldronCX, y: cauldronCY, radius: 80 };

    engine.ui.cauldronSlots[0] = { x: cauldronCX - 45, y: cauldronCY - 5, size: 40 };
    engine.ui.cauldronSlots[1] = { x: cauldronCX + 5, y: cauldronCY - 5, size: 40 };

    if (responsive) {
      const codexH = 260;
      engine.ui.codexRect = { x: 20, y: h - inventoryH - codexH - 20, width: codexW, height: codexH };
      engine.ui.codexCols = Math.max(2, Math.floor(codexW / (engine.ui.codexCardSize.width + 10)));
    } else {
      engine.ui.codexRect = { x: w - codexW - 10, y: topBarH + 10, width: codexW, height: h - topBarH - inventoryH - 30 };
      engine.ui.codexCols = 2;
    }

    const invCell = 50;
    const invCols = Math.max(8, Math.floor((w - 40 - 8) / (invCell + 4)));
    engine.ui.inventoryRect = {
      x: 20,
      y: h - inventoryH + 15,
      cellSize: invCell,
      cols: invCols,
      rows: 2,
    };

    engine.ui.saveBtnRect = { x: Math.max(w - 210, 350), y: 12, width: 80, height: 32 };
    engine.ui.resetBtnRect = { x: Math.max(w - 110, 450), y: 12, width: 80, height: 32 };
  }

  private renderNoise(): void {
    if (!this.noiseCanvas) return;
    this.ctx.save();
    this.ctx.globalAlpha = 0.06;
    const pattern = this.ctx.createPattern(this.noiseCanvas, 'repeat');
    if (pattern) {
      this.ctx.fillStyle = pattern;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    this.ctx.restore();
  }

  private renderTopMenu(engine: GameEngine): void {
    this.ctx.fillStyle = '#1a0f08';
    this.ctx.fillRect(0, 0, this.width, 56);
    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 56);
    this.ctx.lineTo(this.width, 56);
    this.ctx.stroke();

    this.ctx.fillStyle = '#d4a84b';
    this.ctx.font = 'bold 22px Courier New, monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('ALCHEMY', 24, 28);

    this.ctx.font = '11px Courier New, monospace';
    this.ctx.fillStyle = '#c9a96e';
    this.ctx.fillText(`合成:${engine.combineCount} 配方:${engine.discoveredRecipes.size}/${RECIPES.length}`, 160, 28);

    this.renderPixelButton(engine.ui.saveBtnRect, 'SAVE', engine.hoveredButton === 'save', '#3c2f1f', '#5c4a30');
    this.renderPixelButton(engine.ui.resetBtnRect, 'RESET', engine.hoveredButton === 'reset', '#3c2f1f', '#5c4a30');
  }

  private renderPixelButton(rect: { x: number; y: number; width: number; height: number }, text: string, hovered: boolean, baseColor: string, hoverColor: string): void {
    this.ctx.fillStyle = hovered ? hoverColor : baseColor;
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.ctx.fillStyle = hovered ? '#ffffff' : '#f5e6c8';
    this.ctx.font = 'bold 13px Courier New, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  private renderGrid(engine: GameEngine): void {
    const g = engine.ui.gridRect;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        const idx = r * g.cols + c;
        const x = g.x + c * g.cellSize;
        const y = g.y + r * g.cellSize;
        const itemId = engine.getBasicGridItem(idx);
        this.ctx.fillStyle = idx % 2 === 0 ? '#3c2a1a' : '#322215';
        this.ctx.fillRect(x + 1, y + 1, g.cellSize - 2, g.cellSize - 2);
        this.ctx.strokeStyle = '#4a3728';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 1, y + 1, g.cellSize - 2, g.cellSize - 2);
        if (itemId) {
          const item = ITEM_DATABASE[itemId];
          if (item) {
            const iconSize = Math.min(g.cellSize * 0.6, 36);
            this.drawItemIcon(item, x + g.cellSize / 2, y + g.cellSize / 2, iconSize, 1);
          }
        }
      }
    }
    this.ctx.fillStyle = '#d4a84b';
    this.ctx.font = 'bold 12px Courier New, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MATERIALS', g.x + (g.cols * g.cellSize) / 2, g.y - 14);
  }

  private renderCauldron(engine: GameEngine): void {
    const { x: cx, y: cy, radius } = engine.ui.cauldronRect;
    let shakeX = 0, shakeY = 0;
    if (engine.animationState.shakeTime > 0) {
      const t = engine.animationState.shakeTime / 0.3;
      shakeX = (Math.random() - 0.5) * 8 * t;
      shakeY = (Math.random() - 0.5) * 6 * t;
    }
    const gx = cx + shakeX;
    const gy = cy + shakeY;

    this.ctx.save();
    const grad = this.ctx.createRadialGradient(gx, gy + 10, 10, gx, gy, radius);
    grad.addColorStop(0, '#6b1a1a');
    grad.addColorStop(0.5, '#3d0e0e');
    grad.addColorStop(1, '#1a0505');
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(gx, gy, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    this.ctx.fillStyle = '#8b2500';
    this.ctx.beginPath();
    this.ctx.ellipse(gx, gy + 8, radius * 0.85, radius * 0.18, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(gx, gy + 5, radius * 0.55, radius * 0.1, 0, 0, Math.PI * 2);
    this.ctx.fill();

    if (engine.dragState.isDragging && engine.dragState.itemId) {
      const dx = engine.dragState.mouseX - gx;
      const dy = engine.dragState.mouseY - gy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius) {
        this.ctx.strokeStyle = `rgba(212, 168, 75, ${0.5 + Math.sin(this.time * 8) * 0.3})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(gx, gy, radius - 4, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();

    for (let i = 0; i < 2; i++) {
      const slot = engine.ui.cauldronSlots[i];
      this.ctx.save();
      this.ctx.translate(shakeX, shakeY);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      this.roundRectFill(slot.x - slot.size / 2, slot.y - slot.size / 2, slot.size, slot.size, 4);
      this.ctx.strokeStyle = '#d4a84b';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 3]);
      this.roundRectStroke(slot.x - slot.size / 2, slot.y - slot.size / 2, slot.size, slot.size, 4);
      this.ctx.setLineDash([]);
      const s = engine.cauldronSlots[i];
      if (s.itemId) {
        const item = ITEM_DATABASE[s.itemId];
        if (item) {
          let alpha = 1;
          if (engine.animationState.combineTime > 0 && engine.animationState.shakeTime === 0) {
            alpha = Math.max(0, engine.animationState.combineTime / 0.8);
          }
          this.drawItemIcon(item, slot.x, slot.y, slot.size * 0.7, alpha);
        }
      }
      this.ctx.restore();
    }
    this.ctx.fillStyle = '#d4a84b';
    this.ctx.font = 'bold 12px Courier New, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CAULDRON', cx, cy - radius - 20);

    if (Math.random() < 0.2) {
      engine.spawnAmbientParticles(1, cx, cy, radius);
    }
  }

  private renderCodex(engine: GameEngine): void {
    const cr = engine.ui.codexRect;
    const cw = engine.ui.codexCardSize.width;
    const ch = engine.ui.codexCardSize.height;
    const gap = 8;
    const cols = Math.max(1, engine.ui.codexCols);
    const padX = 10;
    const padY = 36;

    this.ctx.fillStyle = 'rgba(26, 15, 8, 0.92)';
    this.ctx.fillRect(cr.x, cr.y, cr.width, cr.height);
    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(cr.x, cr.y, cr.width, cr.height);

    this.ctx.fillStyle = '#d4a84b';
    this.ctx.font = 'bold 14px Courier New, monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('RECIPES', cr.x + 12, cr.y + 18);

    this.ctx.fillStyle = '#c9a96e';
    this.ctx.font = '11px Courier New, monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${engine.discoveredRecipes.size}/${RECIPES.length}`, cr.x + cr.width - 12, cr.y + 18);

    const contentW = cr.width - padX * 2;
    const discovered = engine.getDiscoveredRecipes();
    const undiscovered = engine.getUndiscoveredRecipes();
    const allRecipes = [...discovered, ...undiscovered];

    const rows = Math.ceil(allRecipes.length / cols);
    const totalH = rows * (ch + gap);
    const viewH = cr.height - padY - 8;
    const maxScroll = Math.max(0, totalH - viewH);
    engine.ui.codexScroll = Math.min(maxScroll, Math.max(0, engine.ui.codexScroll));
    const scroll = engine.ui.codexScroll;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(cr.x + padX, cr.y + padY, cr.width - padX * 2, viewH);
    this.ctx.clip();

    for (let i = 0; i < allRecipes.length; i++) {
      const r = allRecipes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cr.x + padX + col * (cw + gap);
      const y = cr.y + padY + row * (ch + gap) - scroll;
      if (y + ch < cr.y + padY || y > cr.y + padY + viewH) continue;
      const isDiscovered = engine.discoveredRecipes.has(r.id);
      this.renderCodexCard(x, y, cw, ch, r, isDiscovered, engine.hoveredCodexIndex === i);
    }
    this.ctx.restore();

    if (maxScroll > 0) {
      const barW = 6;
      const barX = cr.x + cr.width - barW - 4;
      const barY = cr.y + padY;
      const trackH = viewH;
      const thumbH = Math.max(28, trackH * (viewH / totalH));
      const thumbY = barY + (trackH - thumbH) * (scroll / maxScroll);
      this.ctx.fillStyle = '#2a1a0d';
      this.ctx.fillRect(barX, barY, barW, trackH);
      this.ctx.fillStyle = '#d4a84b';
      this.ctx.fillRect(barX, thumbY, barW, thumbH);
    }
  }

  private renderCodexCard(x: number, y: number, w: number, h: number, recipe: any, discovered: boolean, hovered: boolean): void {
    if (hovered) {
      this.ctx.save();
      this.ctx.shadowColor = '#d4a84b';
      this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = '#3c2f1f';
      this.roundRectFill(x - 3, y - 3, w + 6, h + 6, 10);
      this.ctx.restore();
    }
    if (discovered) {
      const grad = this.ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#4a3728');
      grad.addColorStop(1, '#c9a96e');
      this.ctx.fillStyle = grad;
    } else {
      this.ctx.fillStyle = '#1a0f08';
    }
    this.roundRectFill(x, y, w, h, 8);
    this.ctx.strokeStyle = discovered ? '#d4a84b' : '#3c2f1f';
    this.ctx.lineWidth = 2;
    this.roundRectStroke(x, y, w, h, 8);

    if (discovered) {
      const outItem = ITEM_DATABASE[recipe.output];
      if (outItem) {
        this.drawItemIcon(outItem, x + w / 2, y + 52, 44, 1);
      }
      this.ctx.fillStyle = '#f5e6c8';
      this.ctx.font = 'bold 13px Courier New, monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(outItem?.name || '???', x + w / 2, y + 96);
      const in1 = ITEM_DATABASE[recipe.input1];
      const in2 = ITEM_DATABASE[recipe.input2];
      this.ctx.font = '10px Courier New, monospace';
      this.ctx.fillStyle = '#d4a84b';
      this.ctx.fillText(`${in1?.name || '?'}+${in2?.name || '?'}=${outItem?.name || '?'}`, x + w / 2, y + h - 14);
    } else {
      this.ctx.save();
      this.ctx.globalAlpha = 0.3;
      this.ctx.fillStyle = '#4a3728';
      this.ctx.beginPath();
      this.ctx.arc(x + w / 2, y + 50, 26, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      this.ctx.fillStyle = '#5c4a30';
      this.ctx.font = '30px Courier New, monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('?', x + w / 2, y + 54);
      this.ctx.fillStyle = '#5c4a30';
      this.ctx.font = '11px Courier New, monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('LOCKED', x + w / 2, y + 96);
      this.ctx.font = '9px Courier New, monospace';
      this.ctx.fillStyle = '#4a3728';
      this.ctx.fillText('? + ? = ?', x + w / 2, y + h - 14);
    }
  }

  private renderInventory(engine: GameEngine): void {
    const ir = engine.ui.inventoryRect;
    const cellPad = 4;
    const invCols = Math.min(ir.cols, Math.ceil(48 / ir.rows));
    const totalColsFor48 = Math.ceil(48 / ir.rows);
    const contentW = this.width - 40;
    const actualW = contentW;

    this.ctx.fillStyle = 'rgba(26, 15, 8, 0.94)';
    this.ctx.fillRect(ir.x, ir.y, actualW, ir.rows * (ir.cellSize + cellPad) + 44);
    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(ir.x, ir.y, actualW, ir.rows * (ir.cellSize + cellPad) + 44);

    this.ctx.fillStyle = '#d4a84b';
    this.ctx.font = 'bold 13px Courier New, monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('INVENTORY', ir.x + 12, ir.y + 20);

    const used = engine.getInventoryUsedCount();
    this.ctx.fillStyle = '#c9a96e';
    this.ctx.font = '11px Courier New, monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${used}/48`, ir.x + actualW - 12, ir.y + 20);

    const contentX = ir.x + 8;
    const contentY = ir.y + 38;
    const cellFull = ir.cellSize + cellPad;
    const visibleCols = Math.max(1, Math.floor((actualW - 16) / cellFull));
    const maxScroll = Math.max(0, (totalColsFor48 - visibleCols) * cellFull);
    engine.ui.inventoryScroll = Math.min(maxScroll, Math.max(0, engine.ui.inventoryScroll));
    const scroll = engine.ui.inventoryScroll;

    for (let slot = 0; slot < 48; slot++) {
      const col = slot % totalColsFor48;
      const row = Math.floor(slot / totalColsFor48);
      if (row >= ir.rows) continue;
      const x = contentX + col * cellFull - scroll;
      const y = contentY + row * cellFull;
      if (x + ir.cellSize < contentX || x > contentX + actualW - 16) continue;

      this.ctx.fillStyle = 'rgba(45, 45, 45, 0.8)';
      this.roundRectFill(x, y, ir.cellSize, ir.cellSize, 4);
      this.ctx.strokeStyle = '#4a3728';
      this.ctx.lineWidth = 2;
      this.roundRectStroke(x, y, ir.cellSize, ir.cellSize, 4);

      const itemId = engine.inventory[slot];
      if (itemId) {
        const item = ITEM_DATABASE[itemId];
        if (item) {
          const float = Math.sin(this.time * Math.PI + slot * 0.5) * 3;
          this.drawItemIcon(item, x + ir.cellSize / 2, y + ir.cellSize / 2 + float, ir.cellSize * 0.65, 1);
        }
      }
    }

    if (maxScroll > 0) {
      const barY = ir.y + ir.rows * (ir.cellSize + cellPad) + 38;
      const barW = actualW - 20;
      const barX = ir.x + 10;
      const thumbW = Math.max(40, barW * (visibleCols / totalColsFor48));
      const thumbX = barX + (barW - thumbW) * (scroll / maxScroll);
      this.ctx.fillStyle = '#2a1a0d';
      this.ctx.fillRect(barX, barY, barW, 6);
      this.ctx.fillStyle = '#d4a84b';
      this.ctx.fillRect(thumbX, barY, thumbW, 6);
    }
  }

  private renderChainArrows(engine: GameEngine): void {
    const arrows = engine.ui.chainArrows;
    if (arrows.length === 0) return;
    const cauldron = engine.ui.cauldronRect;

    for (let ai = 0; ai < arrows.length; ai++) {
      const arrow = arrows[ai];
      const recipe = RECIPES.find(r => r.id === arrow.toRecipeId);
      if (!recipe) continue;
      const sx = cauldron.x + cauldron.radius + 40;
      const sy = cauldron.y + (ai - arrows.length / 2 + 0.5) * 48;

      const undisc = engine.getUndiscoveredRecipes();
      const recipeIdxInUndis = undisc.findIndex(r => r.id === recipe.id);
      const cr = engine.ui.codexRect;
      const cw = engine.ui.codexCardSize.width;
      const ch = engine.ui.codexCardSize.height;
      const gap = 8;
      const cols = Math.max(1, engine.ui.codexCols);
      const disc = engine.getDiscoveredRecipes();
      const totalIdx = disc.length + recipeIdxInUndis;
      const col = totalIdx % cols;
      const row = Math.floor(totalIdx / cols);
      const padX = 10;
      const padY = 36;
      const ex = cr.x + padX + col * (cw + gap) + cw / 2;
      const ey = cr.y + padY + row * (ch + gap) - engine.ui.codexScroll + ch / 2;

      if (ey < cr.y + padY || ey > cr.y + padY + cr.height) continue;

      const hovered = engine.hoveredChainArrowIndex === ai;
      const tPhase = ((engine.animationState.arrowAnimTime + ai * 0.25) % 1.5) / 1.5;

      this.ctx.save();
      this.ctx.strokeStyle = hovered ? '#ffd700' : '#d4a84b';
      this.ctx.lineWidth = hovered ? 3 : 2;
      this.ctx.setLineDash([7, 5]);
      this.ctx.lineDashOffset = -engine.animationState.arrowAnimTime * 30;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, sy);
      const mx = (sx + ex) / 2;
      const my = Math.min(sy, ey) - 40;
      this.ctx.quadraticCurveTo(mx, my, ex, ey);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      const mt = tPhase;
      const cx2 = (1 - mt) * (1 - mt) * sx + 2 * (1 - mt) * mt * mx + mt * mt * ex;
      const cy2 = (1 - mt) * (1 - mt) * sy + 2 * (1 - mt) * mt * my + mt * mt * ey;
      const txAng = Math.atan2(
        2 * (my - sy) + 2 * (ey - my) * mt,
        2 * (mx - sx) + 2 * (ex - mx) * mt
      );

      this.ctx.fillStyle = hovered ? '#ffd700' : '#d4a84b';
      this.ctx.beginPath();
      this.ctx.moveTo(cx2, cy2);
      this.ctx.lineTo(cx2 - 11 * Math.cos(txAng - 0.45), cy2 - 11 * Math.sin(txAng - 0.45));
      this.ctx.lineTo(cx2 - 11 * Math.cos(txAng + 0.45), cy2 - 11 * Math.sin(txAng + 0.45));
      this.ctx.closePath();
      this.ctx.fill();

      if (hovered) {
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        this.ctx.beginPath();
        this.ctx.arc(cx2, cy2, 18, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const hintY = sy - 16;
      this.ctx.fillStyle = hovered ? '#ffd700' : '#c9a96e';
      this.ctx.font = 'bold 10px Courier New, monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('Click to combine!', sx + 4, hintY);
      this.ctx.restore();
    }
  }

  private renderParticles(engine: GameEngine): void {
    for (const p of engine.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderDragItem(engine: GameEngine): void {
    if (!engine.dragState.isDragging || !engine.dragState.itemId) return;
    const item = ITEM_DATABASE[engine.dragState.itemId];
    if (!item) return;
    this.ctx.save();
    this.ctx.shadowColor = '#d4a84b';
    this.ctx.shadowBlur = 15;
    this.drawItemIcon(item, engine.dragState.mouseX, engine.dragState.mouseY, 42, 0.7);
    this.ctx.restore();
  }

  private renderAnimationEffects(engine: GameEngine): void {
    if (engine.animationState.successFlash > 0) {
      const a = engine.animationState.successFlash / 0.15;
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.85})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }
  }

  private renderResetDialog(engine: GameEngine): void {
    if (!engine.showResetDialog) return;
    const dw = 360;
    const dh = 200;
    const dx = (this.width - dw) / 2;
    const dy = (this.height - dh) / 2;
    engine.ui.resetDialogRect = { x: dx, y: dy, width: dw, height: dh };

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.fillStyle = '#1a1a1a';
    this.roundRectFill(dx, dy, dw, dh, 8);
    if (this.noiseCanvas) {
      this.ctx.globalAlpha = 0.08;
      const pat = this.ctx.createPattern(this.noiseCanvas, 'repeat');
      if (pat) {
        this.ctx.fillStyle = pat;
        this.roundRectFill(dx, dy, dw, dh, 8);
      }
    }
    this.ctx.restore();

    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 2;
    this.roundRectStroke(dx, dy, dw, dh, 8);

    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.font = 'bold 20px Courier New, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('CONFIRM RESET?', this.width / 2, dy + 38);

    this.ctx.fillStyle = '#f5e6c8';
    this.ctx.font = '13px Courier New, monospace';
    this.ctx.fillText('All progress, recipes and items', this.width / 2, dy + 76);
    this.ctx.fillText('will be permanently deleted!', this.width / 2, dy + 98);
    this.ctx.fillStyle = '#c9a96e';
    this.ctx.font = '11px Courier New, monospace';
    this.ctx.fillText('(This action cannot be undone)', this.width / 2, dy + 122);

    const bw = 120;
    const bh = 40;
    const by = dy + dh - 54;
    engine.ui.resetConfirmRect = { x: dx + 36, y: by, width: bw, height: bh };
    engine.ui.resetCancelRect = { x: dx + dw - bw - 36, y: by, width: bw, height: bh };

    this.renderPixelButton(engine.ui.resetConfirmRect, 'RESET', engine.hoveredButton === 'confirm', '#5c2f2f', '#8b4040');
    this.renderPixelButton(engine.ui.resetCancelRect, 'CANCEL', engine.hoveredButton === 'cancel', '#3c2f1f', '#5c4a30');
  }

  private renderToast(engine: GameEngine): void {
    if (engine.ui.toastTime <= 0 || !engine.ui.toastText) return;
    const a = Math.min(1, engine.ui.toastTime * 2);
    const tw = Math.min(420, Math.max(260, engine.ui.toastText.length * 14 + 60));
    const th = 46;
    const tx = (this.width - tw) / 2;
    const ty = 76;
    engine.ui.toastRect = { x: tx, y: ty, width: tw, height: th };

    this.ctx.save();
    this.ctx.globalAlpha = a;
    this.ctx.fillStyle = 'rgba(26, 15, 8, 0.96)';
    this.roundRectFill(tx, ty, tw, th, 6);
    this.ctx.strokeStyle = '#d4a84b';
    this.ctx.lineWidth = 2;
    this.roundRectStroke(tx, ty, tw, th, 6);
    this.ctx.fillStyle = '#f5e6c8';
    this.ctx.font = 'bold 14px Courier New, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(engine.ui.toastText, this.width / 2, ty + th / 2);
    this.ctx.restore();
  }

  private renderNewCardAnimation(engine: GameEngine): void {
    if (engine.animationState.newCardTime <= 0 || !engine.animationState.newCardItemId) return;
    const t = 1.2 - engine.animationState.newCardTime;
    const item = ITEM_DATABASE[engine.animationState.newCardItemId];
    if (!item) return;

    let scale: number, rot: number, alpha: number;
    if (t < 0.35) {
      const k = t / 0.35;
      scale = 0.15 + k * 1.15;
      rot = (1 - k) * 720 * Math.PI / 180;
      alpha = Math.min(1, k * 1.5);
    } else if (t < 0.9) {
      scale = 1.3;
      rot = 0;
      alpha = 1;
    } else {
      const k = (t - 0.9) / 0.3;
      scale = 1.3 - k * 0.5;
      alpha = 1 - k;
    }

    const cx = this.width / 2;
    const cy = this.height / 2;

    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.5;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rot);
    this.ctx.scale(scale, scale);

    const w = 220, h = 280;
    const grad = this.ctx.createLinearGradient(-w / 2, -h / 2, -w / 2, h / 2);
    grad.addColorStop(0, '#4a3728');
    grad.addColorStop(1, '#c9a96e');
    this.ctx.fillStyle = grad;
    this.roundRectFill(-w / 2, -h / 2, w, h, 10);

    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 5;
    this.roundRectStroke(-w / 2, -h / 2, w, h, 10);

    this.drawItemIcon(item, 0, -42, 88, 1);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 26px Courier New, monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(item.name, 0, 58);

    this.ctx.fillStyle = '#ffd700';
    this.ctx.font = 'bold 18px Courier New, monospace';
    this.ctx.fillText('*** NEW DISCOVERY ***', 0, 100);

    this.ctx.fillStyle = '#f5e6c8';
    this.ctx.font = '13px Courier New, monospace';
    this.ctx.fillText(`TIER ${item.tier} COMPOUND`, 0, 126);

    this.ctx.restore();
  }

  private renderFPS(): void {
    this.ctx.fillStyle = 'rgba(212, 168, 75, 0.6)';
    this.ctx.font = '10px Courier New, monospace';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`FPS:${this.fps}`, this.width - 8, 8);
  }

  private roundRectFill(x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + rr, y);
    this.ctx.lineTo(x + w - rr, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.ctx.lineTo(x + w, y + h - rr);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.ctx.lineTo(x + rr, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.ctx.lineTo(x, y + rr);
    this.ctx.quadraticCurveTo(x, y, x + rr, y);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private roundRectStroke(x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + rr, y);
    this.ctx.lineTo(x + w - rr, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    this.ctx.lineTo(x + w, y + h - rr);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    this.ctx.lineTo(x + rr, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    this.ctx.lineTo(x, y + rr);
    this.ctx.quadraticCurveTo(x, y, x + rr, y);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  private drawItemIcon(item: Item, x: number, y: number, size: number, alpha: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    const r = size / 2;
    switch (item.icon) {
      case 'water':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.quadraticCurveTo(x + r, y, x, y + r * 0.9);
        this.ctx.quadraticCurveTo(x - r, y, x, y - r);
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'fire':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.bezierCurveTo(x + r * 0.3, y - r * 0.5, x + r, y - r * 0.2, x + r * 0.7, y + r * 0.3);
        this.ctx.quadraticCurveTo(x + r * 0.4, y + r, x, y + r * 0.9);
        this.ctx.quadraticCurveTo(x - r * 0.4, y + r, x - r * 0.7, y + r * 0.3);
        this.ctx.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.3, y - r * 0.5, x, y - r);
        this.ctx.fill();
        this.ctx.fillStyle = item.secondaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r * 0.4);
        this.ctx.quadraticCurveTo(x + r * 0.4, y, x + r * 0.2, y + r * 0.4);
        this.ctx.quadraticCurveTo(x, y + r * 0.6, x - r * 0.2, y + r * 0.4);
        this.ctx.quadraticCurveTo(x - r * 0.4, y, x, y - r * 0.4);
        this.ctx.fill();
        break;
      case 'earth':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - r, y + r * 0.5);
        this.ctx.lineTo(x - r * 0.6, y - r * 0.6);
        this.ctx.lineTo(x + r * 0.1, y - r);
        this.ctx.lineTo(x + r * 0.7, y - r * 0.5);
        this.ctx.lineTo(x + r, y + r * 0.5);
        this.ctx.lineTo(x + r * 0.2, y + r);
        this.ctx.lineTo(x - r * 0.5, y + r * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = item.secondaryColor;
        this.ctx.fillRect(x - r * 0.5, y - r * 0.2, r * 0.4, r * 0.3);
        this.ctx.fillRect(x + r * 0.1, y, r * 0.35, r * 0.25);
        break;
      case 'air':
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.9, y - r * 0.3);
        this.ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.8, x - r * 0.1, y - r * 0.5);
        this.ctx.quadraticCurveTo(x + r * 0.5, y - r * 0.85, x + r * 0.85, y - r * 0.1);
        this.ctx.moveTo(x - r * 0.8, y + r * 0.2);
        this.ctx.quadraticCurveTo(x - r * 0.3, y - r * 0.1, x + r * 0.4, y + r * 0.1);
        this.ctx.quadraticCurveTo(x + r * 0.85, y + r * 0.25, x + r * 0.6, y + r * 0.55);
        this.ctx.moveTo(x - r * 0.6, y + r * 0.6);
        this.ctx.quadraticCurveTo(x, y + r * 0.4, x + r * 0.3, y + r * 0.7);
        this.ctx.stroke();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        break;
      case 'lava':
        this.ctx.fillStyle = item.secondaryColor;
        this.roundRectFill(x - r, y - r * 0.3, r * 2, r * 1.3, 5);
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - r, y);
        this.ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.8, x - r * 0.2, y - r * 0.4);
        this.ctx.quadraticCurveTo(x + r * 0.2, y - r, x + r * 0.5, y - r * 0.5);
        this.ctx.quadraticCurveTo(x + r, y - r * 0.2, x + r, y);
        this.ctx.lineTo(x + r, y + r);
        this.ctx.lineTo(x - r, y + r);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.3, y + r * 0.2, r * 0.12, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.3, y + r * 0.4, r * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'mist':
      case 'cloud':
      case 'snow':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.55, y + r * 0.1, r * 0.48, 0, Math.PI * 2);
        this.ctx.arc(x, y - r * 0.2, r * 0.58, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.55, y + r * 0.1, r * 0.48, 0, Math.PI * 2);
        this.ctx.arc(x - r * 0.15, y + r * 0.4, r * 0.42, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.25, y + r * 0.35, r * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        if (item.icon === 'snow') {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = `${Math.floor(r * 0.5)}px Courier New, monospace`;
          this.ctx.textAlign = 'center';
          this.ctx.fillText('*', x - r * 0.3, y + r * 0.6);
          this.ctx.fillText('*', x + r * 0.3, y - r * 0.1);
          this.ctx.fillText('*', x, y + r * 0.1);
        }
        break;
      case 'mud':
        this.ctx.fillStyle = item.secondaryColor;
        this.roundRectFill(x - r, y - r * 0.4, r * 2, r * 1.4, 6);
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.ellipse(x - r * 0.3, y - r * 0.1, r * 0.28, r * 0.18, -0.3, 0, Math.PI * 2);
        this.ctx.ellipse(x + r * 0.2, y + r * 0.1, r * 0.22, r * 0.14, 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#3a2410';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.4, y + r * 0.3, r * 0.1, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.35, y + r * 0.35, r * 0.08, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.05, y - r * 0.2, r * 0.06, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'dust':
      case 'sand':
        this.ctx.fillStyle = item.color;
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2 + i * 0.3;
          const rr = r * (0.4 + ((i * 13) % 6) * 0.08);
          const px = x + Math.cos(ang) * rr;
          const py = y + Math.sin(ang) * rr;
          const ps = 3 + (i % 3);
          this.ctx.fillRect(px - ps / 2, py - ps / 2, ps, ps);
        }
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'steam':
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          this.ctx.beginPath();
          const bx = x + i * r * 0.38;
          this.ctx.moveTo(bx, y + r * 0.8);
          this.ctx.bezierCurveTo(bx - r * 0.2, y + r * 0.3, bx + r * 0.25, y - r * 0.2, bx, y - r * 0.7);
          this.ctx.stroke();
        }
        break;
      case 'energy':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.lineTo(x + r * 0.15, y - r * 0.1);
        this.ctx.lineTo(x + r * 0.7, y - r * 0.05);
        this.ctx.lineTo(x - r * 0.1, y + r);
        this.ctx.lineTo(x - r * 0.2, y + r * 0.15);
        this.ctx.lineTo(x - r * 0.7, y + r * 0.1);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        break;
      case 'obsidian':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.lineTo(x + r * 0.8, y - r * 0.3);
        this.ctx.lineTo(x + r * 0.65, y + r * 0.8);
        this.ctx.lineTo(x - r * 0.5, y + r);
        this.ctx.lineTo(x - r * 0.85, y - r * 0.1);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.strokeStyle = 'rgba(120, 60, 220, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.3, y - r * 0.5);
        this.ctx.lineTo(x + r * 0.2, y + r * 0.4);
        this.ctx.moveTo(x - r * 0.1, y - r * 0.6);
        this.ctx.lineTo(x + r * 0.35, y - r * 0.1);
        this.ctx.stroke();
        break;
      case 'clay':
      case 'brick':
        this.ctx.fillStyle = item.color;
        this.ctx.fillRect(x - r, y - r * 0.7, r * 2, r * 1.4);
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - r, y - r * 0.7, r * 2, r * 1.4);
        this.ctx.beginPath();
        this.ctx.moveTo(x - r, y);
        this.ctx.lineTo(x + r, y);
        this.ctx.moveTo(x, y - r * 0.7);
        this.ctx.lineTo(x, y);
        this.ctx.moveTo(x - r * 0.5, y);
        this.ctx.lineTo(x - r * 0.5, y + r * 0.7);
        this.ctx.moveTo(x + r * 0.5, y);
        this.ctx.lineTo(x + r * 0.5, y + r * 0.7);
        this.ctx.stroke();
        break;
      case 'lightning':
        this.ctx.save();
        this.ctx.shadowColor = item.secondaryColor;
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x + r * 0.2, y - r);
        this.ctx.lineTo(x - r * 0.4, y - r * 0.1);
        this.ctx.lineTo(x + r * 0.1, y - r * 0.1);
        this.ctx.lineTo(x - r * 0.3, y + r);
        this.ctx.lineTo(x + r * 0.2, y + r * 0.1);
        this.ctx.lineTo(x - r * 0.1, y + r * 0.1);
        this.ctx.stroke();
        this.ctx.restore();
        break;
      case 'metal':
      case 'sword':
        if (item.icon === 'sword') {
          this.ctx.save();
          this.ctx.translate(x, y);
          this.ctx.rotate(-Math.PI / 4);
          this.ctx.fillStyle = '#5c3a1a';
          this.ctx.fillRect(-r * 0.15, r * 0.3, r * 0.3, r * 0.6);
          this.ctx.fillStyle = '#d4a84b';
          this.ctx.fillRect(-r * 0.5, r * 0.15, r, r * 0.18);
          this.ctx.fillStyle = item.color;
          this.ctx.beginPath();
          this.ctx.moveTo(-r * 0.12, r * 0.15);
          this.ctx.lineTo(r * 0.12, r * 0.15);
          this.ctx.lineTo(r * 0.06, -r);
          this.ctx.lineTo(0, -r * 1.08);
          this.ctx.lineTo(-r * 0.06, -r);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.strokeStyle = item.secondaryColor;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
          this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
          this.ctx.fillRect(-r * 0.04, -r * 0.8, r * 0.03, r * 0.8);
          this.ctx.restore();
        } else {
          this.ctx.fillStyle = item.color;
          this.roundRectFill(x - r, y - r * 0.4, r * 2, r * 0.8, 5);
          this.ctx.strokeStyle = item.secondaryColor;
          this.ctx.lineWidth = 2;
          this.roundRectStroke(x - r, y - r * 0.4, r * 2, r * 0.8, 5);
          this.ctx.fillStyle = 'rgba(255,255,255,0.45)';
          this.ctx.fillRect(x - r * 0.8, y - r * 0.28, r * 0.35, r * 0.22);
          this.ctx.fillRect(x - r * 0.3, y - r * 0.1, r * 0.15, r * 0.35);
        }
        break;
      case 'life':
      case 'tree':
        this.ctx.fillStyle = '#5c3a1a';
        this.ctx.fillRect(x - r * 0.12, y + r * 0.1, r * 0.24, r * 0.7);
        this.ctx.strokeStyle = '#3c2510';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - r * 0.12, y + r * 0.1, r * 0.24, r * 0.7);
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.lineTo(x + r * 0.7, y + r * 0.1);
        this.ctx.lineTo(x + r * 0.4, y + r * 0.2);
        this.ctx.lineTo(x + r * 0.6, y + r * 0.45);
        this.ctx.lineTo(x - r * 0.6, y + r * 0.45);
        this.ctx.lineTo(x - r * 0.4, y + r * 0.2);
        this.ctx.lineTo(x - r * 0.7, y + r * 0.1);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        if (item.icon === 'tree') {
          this.ctx.fillStyle = '#8b2500';
          this.ctx.beginPath();
          this.ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.08, 0, Math.PI * 2);
          this.ctx.arc(x + r * 0.25, y + r * 0.1, r * 0.08, 0, Math.PI * 2);
          this.ctx.arc(x + r * 0.05, y - r * 0.1, r * 0.07, 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
      case 'rain':
      case 'storm':
        this.ctx.fillStyle = item.icon === 'storm' ? '#3d3d6b' : '#6070a0';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.5, y - r * 0.2, r * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x, y - r * 0.4, r * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.5, y - r * 0.2, r * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = item.color;
        for (let i = -1; i <= 1; i++) {
          const rx = x + i * r * 0.35;
          this.ctx.beginPath();
          this.ctx.moveTo(rx, y + r * 0.1);
          this.ctx.lineTo(rx + r * 0.12, y + r * 0.75);
          this.ctx.lineTo(rx - r * 0.06, y + r * 0.8);
          this.ctx.closePath();
          this.ctx.fill();
        }
        if (item.icon === 'storm') {
          this.ctx.save();
          this.ctx.shadowColor = '#ffff00';
          this.ctx.shadowBlur = 8;
          this.ctx.strokeStyle = '#ffff66';
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          this.ctx.moveTo(x + r * 0.3, y - r * 0.6);
          this.ctx.lineTo(x + r * 0.05, y);
          this.ctx.lineTo(x + r * 0.2, y);
          this.ctx.lineTo(x, y + r * 0.5);
          this.ctx.stroke();
          this.ctx.restore();
        }
        break;
      case 'glass':
      case 'crystal':
      case 'ice':
        this.ctx.fillStyle = item.icon === 'ice' ? 'rgba(176, 224, 230, 0.85)' :
          item.icon === 'crystal' ? 'rgba(200, 255, 255, 0.85)' : 'rgba(173, 216, 230, 0.8)';
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        if (item.icon === 'crystal') {
          this.ctx.moveTo(x, y - r);
          this.ctx.lineTo(x + r * 0.6, y - r * 0.1);
          this.ctx.lineTo(x + r * 0.4, y + r);
          this.ctx.lineTo(x - r * 0.4, y + r);
          this.ctx.lineTo(x - r * 0.6, y - r * 0.1);
        } else if (item.icon === 'ice') {
          this.ctx.moveTo(x, y - r);
          this.ctx.lineTo(x + r * 0.9, y);
          this.ctx.lineTo(x, y + r);
          this.ctx.lineTo(x - r * 0.9, y);
        } else {
          this.ctx.moveTo(x - r * 0.9, y - r * 0.35);
          this.ctx.lineTo(x + r * 0.9, y - r * 0.45);
          this.ctx.lineTo(x + r * 0.7, y + r * 0.5);
          this.ctx.lineTo(x - r * 0.7, y + r * 0.5);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(255,255,255,0.65)';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.45, y - r * 0.25);
        this.ctx.lineTo(x - r * 0.1, y - r * 0.3);
        this.ctx.lineTo(x - r * 0.2, y + r * 0.05);
        this.ctx.closePath();
        this.ctx.fill();
        if (item.icon === 'ice') {
          this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          this.ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(ang) * r * 0.7, y + Math.sin(ang) * r * 0.7);
            this.ctx.stroke();
          }
        }
        break;
      case 'volcano':
        this.ctx.fillStyle = '#2d2d2d';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r, y + r);
        this.ctx.lineTo(x - r * 0.4, y - r * 0.6);
        this.ctx.lineTo(x, y - r);
        this.ctx.lineTo(x + r * 0.4, y - r * 0.6);
        this.ctx.lineTo(x + r, y + r);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#1a1a1a';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.35, y - r * 0.55);
        this.ctx.lineTo(x, y - r * 0.9);
        this.ctx.lineTo(x + r * 0.35, y - r * 0.55);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ff5500';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.1, y - r * 0.95, r * 0.14, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.15, y - r, r * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.05, y - r * 0.9, r * 0.06, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'rainbow':
        const rcolors = ['#ff0000', '#ff8800', '#ffff00', '#00cc00', '#0088ff', '#8800dd'];
        for (let i = 0; i < rcolors.length; i++) {
          this.ctx.strokeStyle = rcolors[i];
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          const rr = r * (1 - i * 0.13);
          this.ctx.arc(x, y + r * 0.5, rr, Math.PI, 0);
          this.ctx.stroke();
        }
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.7, y + r * 0.5, r * 0.18, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.7, y + r * 0.5, r * 0.18, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'golem':
        this.ctx.fillStyle = item.color;
        this.ctx.fillRect(x - r * 0.5, y - r * 0.25, r, r * 0.9);
        this.ctx.fillRect(x - r * 0.42, y - r, r * 0.84, r * 0.75);
        this.ctx.fillRect(x - r * 0.82, y - r * 0.05, r * 0.32, r * 0.6);
        this.ctx.fillRect(x + r * 0.5, y - r * 0.05, r * 0.32, r * 0.6);
        this.ctx.fillRect(x - r * 0.4, y + r * 0.6, r * 0.3, r * 0.4);
        this.ctx.fillRect(x + r * 0.1, y + r * 0.6, r * 0.3, r * 0.4);
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - r * 0.5, y - r * 0.25, r, r * 0.9);
        this.ctx.strokeRect(x - r * 0.42, y - r, r * 0.84, r * 0.75);
        this.ctx.fillStyle = '#ff4400';
        this.ctx.fillRect(x - r * 0.25, y - r * 0.65, r * 0.15, r * 0.12);
        this.ctx.fillRect(x + r * 0.1, y - r * 0.65, r * 0.15, r * 0.12);
        break;
      case 'phoenix':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r);
        this.ctx.quadraticCurveTo(x + r * 0.8, y - r * 0.3, x + r * 0.6, y + r * 0.2);
        this.ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.5, x + r * 0.5, y + r);
        this.ctx.quadraticCurveTo(x, y + r * 0.7, x - r * 0.5, y + r);
        this.ctx.quadraticCurveTo(x - r * 0.9, y + r * 0.5, x - r * 0.6, y + r * 0.2);
        this.ctx.quadraticCurveTo(x - r * 0.8, y - r * 0.3, x, y - r);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - r * 0.6);
        this.ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.2, x + r * 0.2, y + r * 0.3);
        this.ctx.quadraticCurveTo(x, y + r * 0.1, x - r * 0.2, y + r * 0.3);
        this.ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.2, x, y - r * 0.6);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.1, y - r * 0.3, r * 0.08, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.1, y - r * 0.3, r * 0.08, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.1, y - r * 0.3, r * 0.04, 0, Math.PI * 2);
        this.ctx.arc(x + r * 0.1, y - r * 0.3, r * 0.04, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'unicorn':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y + r * 0.2, r * 0.7, 0, Math.PI * 2);
        this.ctx.arc(x - r * 0.25, y - r * 0.5, r * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = item.secondaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.25, y - r * 0.9);
        this.ctx.lineTo(x - r * 0.1, y - r * 0.45);
        this.ctx.lineTo(x - r * 0.4, y - r * 0.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ff69b4';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.25, y - r * 0.9);
        this.ctx.lineTo(x - r * 0.18, y - r * 0.55);
        this.ctx.lineTo(x - r * 0.32, y - r * 0.58);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.1, y - r * 0.55, r * 0.05, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r * 0.5, y + r * 0.2);
        this.ctx.quadraticCurveTo(x + r * 0.95, y + r * 0.1, x + r * 0.9, y - r * 0.2);
        this.ctx.stroke();
        this.ctx.fillStyle = item.secondaryColor;
        for (let i = 0; i < 4; i++) {
          const lx = x + (i - 1.5) * r * 0.25;
          this.ctx.fillRect(lx, y + r * 0.8, r * 0.1, r * 0.25);
        }
        break;
      case 'dragon':
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + r * 0.1, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
        this.ctx.arc(x - r * 0.4, y - r * 0.4, r * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = item.secondaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.65, y - r * 0.65);
        this.ctx.lineTo(x - r * 0.5, y - r * 0.25);
        this.ctx.lineTo(x - r * 0.25, y - r * 0.5);
        this.ctx.closePath();
        this.ctx.moveTo(x - r * 0.35, y - r * 0.7);
        this.ctx.lineTo(x - r * 0.25, y - r * 0.35);
        this.ctx.lineTo(x - r * 0.1, y - r * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.48, y - r * 0.45, r * 0.07, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(x - r * 0.48, y - r * 0.45, r * 0.035, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = item.secondaryColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x + r * 0.2, y - r * 0.1);
        this.ctx.quadraticCurveTo(x + r * 0.8, y - r * 0.8, x + r, y - r * 0.2);
        this.ctx.quadraticCurveTo(x + r * 0.7, y, x + r * 0.4, y + r * 0.05);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(x + r * 0.5, y + r * 0.25);
        this.ctx.quadraticCurveTo(x + r * 1.05, y + r * 0.4, x + r * 1.05, y + r * 0.1);
        this.ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.2, x + r * 0.5, y + r * 0.35);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#ff3300';
        this.ctx.beginPath();
        this.ctx.moveTo(x - r * 0.75, y - r * 0.3);
        this.ctx.quadraticCurveTo(x - r * 1.0, y - r * 0.5, x - r * 1.05, y - r * 0.25);
        this.ctx.quadraticCurveTo(x - r * 0.95, y - r * 0.35, x - r * 0.8, y - r * 0.2);
        this.ctx.closePath();
        this.ctx.fill();
        for (let i = 0; i < 4; i++) {
          this.ctx.fillStyle = item.secondaryColor;
          const lx = x + (i - 1.5) * r * 0.2;
          this.ctx.fillRect(lx - r * 0.05, y + r * 0.45, r * 0.1, r * 0.35);
        }
        break;
      case 'philosopher':
        this.ctx.save();
        this.ctx.shadowColor = item.color;
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const rr = i % 2 === 0 ? r : r * 0.5;
          const px = x + Math.cos(ang) * rr;
          const py = y + Math.sin(ang) * rr;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `bold ${Math.floor(r * 0.5)}px Courier New, monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('S', x, y + 2);
        break;
      case 'time':
        this.ctx.save();
        this.ctx.rotate(this.time * 0.5);
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
        this.ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
          this.ctx.strokeStyle = i % 3 === 0 ? item.color : item.secondaryColor;
          this.ctx.lineWidth = i % 3 === 0 ? 3 : 1;
          this.ctx.beginPath();
          this.ctx.moveTo(x + Math.cos(ang) * r * 0.7, y + Math.sin(ang) * r * 0.7);
          this.ctx.lineTo(x + Math.cos(ang) * r * 0.85, y + Math.sin(ang) * r * 0.85);
          this.ctx.stroke();
        }
        this.ctx.restore();
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y - r * 0.55);
        this.ctx.stroke();
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + r * 0.35, y);
        this.ctx.stroke();
        this.ctx.fillStyle = item.color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      default:
        this.ctx.fillStyle = item.color;
        this.ctx.fillRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
        this.ctx.strokeStyle = item.secondaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
    }
    this.ctx.restore();
  }
}
