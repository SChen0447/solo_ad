import { GameManager } from './gameManager';
import { GridRenderer } from './gridRenderer';
import {
  CropType,
  DecorationType,
  CROP_CONFIGS,
  DECORATION_CONFIGS,
  COLORS,
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  TILE_SIZE_SMALL,
  TOOLBAR_HEIGHT,
  TOOLBAR_HEIGHT_SMALL,
} from './types';

interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  pressed: number;
  onClick: () => void;
}

export class UIManager {
  ctx: CanvasRenderingContext2D;
  gameManager: GameManager;
  gridRenderer: GridRenderer;
  canvas: HTMLCanvasElement;
  width: number = 0;
  height: number = 0;
  isSmall: boolean = false;
  tileSize: number = TILE_SIZE;
  toolbarHeight: number = TOOLBAR_HEIGHT;
  gridOffsetX: number = 0;
  gridOffsetY: number = 0;

  buttons: Button[] = [];
  cropPanelButtons: Button[] = [];
  shopPanelButtons: Button[] = [];

  panelPressedButton: string | null = null;
  panelPressTimer: number = 0;

  time: number = 0;

  constructor(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    gameManager: GameManager,
    gridRenderer: GridRenderer
  ) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.gameManager = gameManager;
    this.gridRenderer = gridRenderer;
    this.ctx.imageSmoothingEnabled = false;
    this.bindEvents();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.isSmall = width < 768;
    this.tileSize = this.isSmall ? TILE_SIZE_SMALL : TILE_SIZE;
    this.toolbarHeight = this.isSmall ? TOOLBAR_HEIGHT_SMALL : TOOLBAR_HEIGHT;

    const gridHeight = GRID_ROWS * this.tileSize;
    const availableHeight = this.height - this.toolbarHeight - 60;

    if (gridHeight > availableHeight) {
      const scale = availableHeight / gridHeight;
      this.tileSize = Math.floor(this.tileSize * scale);
    }

    const finalGridWidth = GRID_COLS * this.tileSize;
    const finalGridHeight = GRID_ROWS * this.tileSize;
    this.gridOffsetX = Math.floor((this.width - finalGridWidth) / 2);
    this.gridOffsetY = Math.floor((this.height - this.toolbarHeight - finalGridHeight) / 2 + 30);

    this.gridRenderer.setLayout(this.gridOffsetX, this.gridOffsetY, this.tileSize);
    this.buildButtons();
  }

  private buildButtons(): void {
    this.buttons = [];
    const btnW = this.isSmall ? 100 : 140;
    const btnH = this.isSmall ? 44 : 52;
    const shopX = this.width / 2 - btnW / 2;
    const shopY = this.height - this.toolbarHeight + (this.toolbarHeight - btnH) / 2;
    this.buttons.push({
      x: shopX,
      y: shopY,
      w: btnW,
      h: btnH,
      pressed: 0,
      onClick: () => this.gameManager.toggleShop(),
    });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.handleClick({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    }, { passive: false });
  }

  private getCanvasPos(e: MouseEvent | { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private handleClick(e: MouseEvent | { clientX: number; clientY: number }): void {
    const pos = this.getCanvasPos(e);

    if (this.gameManager.showCropPanel) {
      const result = this.handleCropPanelClick(pos.x, pos.y);
      if (result) return;
    }

    if (this.gameManager.showShopPanel) {
      const result = this.handleShopPanelClick(pos.x, pos.y);
      if (result) return;
    }

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        btn.pressed = 0.15;
        btn.onClick();
        return;
      }
    }

    const gridPos = this.gridRenderer.getGridPos(pos.x, pos.y);
    if (gridPos) {
      this.gameManager.handleTileClick(gridPos.col, gridPos.row);
    } else {
      if (!this.gameManager.showCropPanel && !this.gameManager.showShopPanel) {
        this.gameManager.closePanels();
      }
    }
  }

  private handleCropPanelClick(x: number, y: number): boolean {
    const panel = this.getCropPanelRect();
    if (x < panel.x || x > panel.x + panel.w || y < panel.y || y > panel.y + panel.h) {
      this.gameManager.closePanels();
      return false;
    }
    const crops: CropType[] = ['carrot', 'wheat', 'tomato', 'sunflower'];
    const itemH = panel.h / 4;
    for (let i = 0; i < crops.length; i++) {
      const iy = panel.y + i * itemH;
      if (y >= iy && y <= iy + itemH) {
        if (x >= panel.x + panel.w - 90 && x <= panel.x + panel.w - 10 && y >= iy + itemH / 2 - 14 && y <= iy + itemH / 2 + 14) {
          this.panelPressedButton = `crop_${crops[i]}`;
          this.panelPressTimer = 0.15;
          this.gameManager.selectCrop(crops[i]);
          return true;
        }
      }
    }
    return true;
  }

  private handleShopPanelClick(x: number, y: number): boolean {
    const panel = this.getShopPanelRect();
    if (x < panel.x || x > panel.x + panel.w || y < panel.y || y > panel.y + panel.h) {
      this.gameManager.closePanels();
      return false;
    }

    const closeBtn = this.getShopCloseButton();
    if (x >= closeBtn.x && x <= closeBtn.x + closeBtn.w && y >= closeBtn.y && y <= closeBtn.y + closeBtn.h) {
      this.gameManager.closePanels();
      return true;
    }

    const seeds: CropType[] = ['carrot', 'wheat', 'tomato', 'sunflower'];
    const seedAreaY = panel.y + 50;
    for (let i = 0; i < seeds.length; i++) {
      const btnRect = {
        x: panel.x + 15 + i * ((panel.w - 30) / 4),
        y: seedAreaY + 30,
        w: (panel.w - 30) / 4 - 8,
        h: 80,
      };
      if (x >= btnRect.x && x <= btnRect.x + btnRect.w && y >= btnRect.y + 50 && y <= btnRect.y + 78) {
        this.panelPressedButton = `shop_seed_${seeds[i]}`;
        this.panelPressTimer = 0.15;
        this.gameManager.buySeed(seeds[i]);
        return true;
      }
    }

    const decos: DecorationType[] = ['scarecrow', 'fence', 'windmill'];
    const decoAreaY = seedAreaY + 130;
    for (let i = 0; i < decos.length; i++) {
      const btnRect = {
        x: panel.x + 15 + i * ((panel.w - 30) / 3),
        y: decoAreaY + 30,
        w: (panel.w - 30) / 3 - 10,
        h: 100,
      };
      if (x >= btnRect.x && x <= btnRect.x + btnRect.w && y >= btnRect.y + 60 && y <= btnRect.y + 92) {
        this.panelPressedButton = `shop_deco_${decos[i]}`;
        this.panelPressTimer = 0.15;
        this.gameManager.buyDecoration(decos[i]);
        return true;
      }
    }

    return true;
  }

  private getCropPanelRect(): { x: number; y: number; w: number; h: number } {
    const w = this.isSmall ? 280 : 360;
    const h = this.isSmall ? 240 : 280;
    return {
      x: this.width / 2 - w / 2,
      y: this.height / 2 - h / 2 - 20,
      w,
      h,
    };
  }

  private getShopPanelRect(): { x: number; y: number; w: number; h: number } {
    const w = this.isSmall ? Math.min(this.width - 20, 420) : 560;
    const h = this.isSmall ? 420 : 500;
    return {
      x: this.width / 2 - w / 2,
      y: this.height / 2 - h / 2,
      w,
      h,
    };
  }

  private getShopCloseButton(): { x: number; y: number; w: number; h: number } {
    const panel = this.getShopPanelRect();
    return {
      x: panel.x + panel.w - 40,
      y: panel.y + 8,
      w: 30,
      h: 30,
    };
  }

  update(dt: number): void {
    this.time += dt;
    for (const btn of this.buttons) {
      if (btn.pressed > 0) btn.pressed = Math.max(0, btn.pressed - dt);
    }
    if (this.panelPressTimer > 0) {
      this.panelPressTimer = Math.max(0, this.panelPressTimer - dt);
      if (this.panelPressTimer <= 0) this.panelPressedButton = null;
    }
  }

  render(dt: number): void {
    this.update(dt);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawBackgroundTexture();

    this.gridRenderer.render(this.gameManager.cropSystem.tiles, dt);
    if (this.gameManager.selectedTile) {
      this.gridRenderer.renderSelectedTile(this.gameManager.selectedTile.col, this.gameManager.selectedTile.row);
    }
    this.gridRenderer.renderParticles(this.gameManager.cropSystem.particles);
    this.gridRenderer.renderFloatingTexts(this.gameManager.cropSystem.floatingTexts);
    this.gridRenderer.renderSoundTexts(this.gameManager.cropSystem.soundTexts);

    this.drawCoins();
    this.drawToolbar();

    if (this.gameManager.showCropPanel) {
      this.drawCropPanel();
    }
    if (this.gameManager.showShopPanel) {
      this.drawShopPanel();
    }
  }

  private drawBackgroundTexture(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.grassDark;
    for (let y = 0; y < this.height; y += 16) {
      for (let x = 0; x < this.width; x += 16) {
        if (((x / 16) + (y / 16)) % 2 === 0) {
          ctx.globalAlpha = 0.1;
          ctx.fillRect(x, y, 8, 8);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  private drawCoins(): void {
    const ctx = this.ctx;
    const x = this.isSmall ? 12 : 20;
    const y = this.isSmall ? 12 : 18;
    const fontSize = this.isSmall ? 14 : 18;

    const coinSize = fontSize + 4;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x, y, coinSize, coinSize);
    ctx.fillStyle = COLORS.goldDark;
    ctx.fillRect(x, y + coinSize - 3, coinSize, 3);
    ctx.fillRect(x + coinSize - 3, y, 3, coinSize);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x + 2, y + 2, 3, 3);
    ctx.fillStyle = COLORS.black;
    ctx.font = `bold ${Math.floor(fontSize * 0.7)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('$', x + coinSize / 2, y + coinSize / 2 + Math.floor(fontSize * 0.25));
    ctx.textAlign = 'left';

    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = COLORS.gold;
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 3;
    const text = `${this.gameManager.coins}`;
    ctx.strokeText(text, x + coinSize + 12, y + coinSize - 4);
    ctx.fillText(text, x + coinSize + 12, y + coinSize - 4);
  }

  private drawToolbar(): void {
    const ctx = this.ctx;
    const y = this.height - this.toolbarHeight;

    ctx.fillStyle = COLORS.toolbar;
    ctx.fillRect(0, y, this.width, this.toolbarHeight);
    ctx.fillStyle = COLORS.toolbarLight;
    ctx.fillRect(0, y, this.width, 4);

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      this.drawPixelButton(btn.x, btn.y, btn.w, btn.h, btn.pressed > 0, '商店');
    }

    const hintFontSize = this.isSmall ? 8 : 10;
    ctx.font = `${hintFontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#a0aec0';
    ctx.textAlign = 'center';
    const hint = this.isSmall ? '点击田地种植/浇水/收获' : '点击田地：空格种植 / 作物浇水 / 成熟收获';
    ctx.fillText(hint, this.width / 2, y + this.toolbarHeight - 10);
    ctx.textAlign = 'left';
  }

  private drawPixelButton(x: number, y: number, w: number, h: number, pressed: boolean, text: string): void {
    const ctx = this.ctx;
    const borderW = 4;
    const offsetY = pressed ? 2 : 0;

    ctx.fillStyle = COLORS.btnGreenBorder;
    ctx.fillRect(x, y + offsetY, w, h);

    ctx.fillStyle = pressed ? COLORS.btnGreenPressed : COLORS.btnGreen;
    ctx.fillRect(x + borderW, y + borderW + offsetY, w - borderW * 2, h - borderW * 2);

    ctx.fillStyle = pressed ? '#68d391' : '#9ae6b4';
    ctx.fillRect(x + borderW, y + borderW + offsetY, w - borderW * 2, 3);
    ctx.fillRect(x + borderW, y + borderW + offsetY, 3, h - borderW * 2);

    const fontSize = Math.min(16, Math.floor(h * 0.4));
    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + offsetY + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawCropPanel(): void {
    const ctx = this.ctx;
    const panel = this.getCropPanelRect();

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawPanelFrame(panel.x, panel.y, panel.w, panel.h);

    const titleFont = this.isSmall ? 12 : 16;
    ctx.font = `bold ${titleFont}px 'Press Start 2P', monospace`;
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.fillText('选择作物', panel.x + panel.w / 2, panel.y + 30);
    ctx.textAlign = 'left';

    const crops: CropType[] = ['carrot', 'wheat', 'tomato', 'sunflower'];
    const itemH = (panel.h - 50) / 4;
    for (let i = 0; i < crops.length; i++) {
      this.drawCropPanelItem(crops[i], panel.x + 15, panel.y + 45 + i * itemH, panel.w - 30, itemH - 8);
    }
  }

  private drawCropPanelItem(crop: CropType, x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const config = CROP_CONFIGS[crop];
    const seedCount = this.gameManager.getSeedCount(crop);

    ctx.fillStyle = COLORS.toolbar;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.toolbarLight;
    ctx.fillRect(x, y, w, 2);

    const iconSize = Math.floor(h * 0.7);
    this.drawCropIcon(crop, x + 10, y + h / 2 - iconSize / 2, iconSize);

    const nameSize = this.isSmall ? 10 : 12;
    ctx.font = `bold ${nameSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = COLORS.white;
    ctx.fillText(config.name, x + 10 + iconSize + 12, y + h / 2 - 6);

    const infoSize = this.isSmall ? 8 : 10;
    ctx.font = `${infoSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#cbd5e0';
    const seedText = seedCount < 0 ? '∞' : `${seedCount}`;
    ctx.fillText(`种子:${seedText} 时间:${config.growthTime}s`, x + 10 + iconSize + 12, y + h / 2 + 12);

    const btnW = 80;
    const btnH = 28;
    const btnX = x + w - btnW - 10;
    const btnY = y + h / 2 - btnH / 2;
    const canAfford = this.gameManager.coins >= config.seedPrice && seedCount !== 0;
    const isPressed = this.panelPressedButton === `crop_${crop}`;
    this.drawSmallPixelButton(btnX, btnY, btnW, btnH, isPressed, `$${config.seedPrice}`, canAfford);
  }

  private drawCropIcon(type: CropType, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const config = CROP_CONFIGS[type];
    const cx = x + size / 2;
    const cy = y + size / 2;

    if (type === 'carrot') {
      ctx.fillStyle = config.color;
      ctx.fillRect(Math.floor(cx - size * 0.15), Math.floor(cy - size * 0.2), Math.floor(size * 0.3), Math.floor(size * 0.5));
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(Math.floor(cx - 2), Math.floor(cy - size * 0.4), 4, Math.floor(size * 0.25));
    } else if (type === 'wheat') {
      ctx.fillStyle = config.color;
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(Math.floor(x + size * 0.2 + i * size * 0.2), Math.floor(cy - size * 0.2), Math.floor(size * 0.15), Math.floor(size * 0.5));
      }
      ctx.fillStyle = '#a16207';
      ctx.fillRect(Math.floor(cx - 1), Math.floor(y + size * 0.2), 2, Math.floor(size * 0.6));
    } else if (type === 'tomato') {
      const r = size * 0.3;
      ctx.fillStyle = config.color;
      ctx.fillRect(Math.floor(cx - r), Math.floor(cy - r * 0.6), Math.floor(r * 2), Math.floor(r * 1.4));
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(Math.floor(cx - 3), Math.floor(cy - r * 0.6 - 4), 6, 4);
    } else if (type === 'sunflower') {
      ctx.fillStyle = config.color;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const r = size * 0.3;
        ctx.fillRect(
          Math.floor(cx + Math.cos(angle) * r - size * 0.06),
          Math.floor(cy + Math.sin(angle) * r - size * 0.1 - size * 0.05),
          Math.floor(size * 0.12),
          Math.floor(size * 0.12)
        );
      }
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.floor(cx - size * 0.1), Math.floor(cy - size * 0.15), Math.floor(size * 0.2), Math.floor(size * 0.2));
    }
  }

  private drawShopPanel(): void {
    const ctx = this.ctx;
    const panel = this.getShopPanelRect();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawPanelFrame(panel.x, panel.y, panel.w, panel.h);

    const titleFont = this.isSmall ? 14 : 18;
    ctx.font = `bold ${titleFont}px 'Press Start 2P', monospace`;
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'center';
    ctx.fillText('商店', panel.x + panel.w / 2, panel.y + 35);
    ctx.textAlign = 'left';

    const closeBtn = this.getShopCloseButton();
    ctx.font = 'bold 16px "Press Start 2P", monospace';
    ctx.fillStyle = '#fc8181';
    ctx.textAlign = 'center';
    ctx.fillText('✕', closeBtn.x + closeBtn.w / 2, closeBtn.y + 22);
    ctx.textAlign = 'left';

    const sectionFont = this.isSmall ? 10 : 12;
    ctx.font = `bold ${sectionFont}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#9ae6b4';
    ctx.fillText('种子商店', panel.x + 15, panel.y + 70);

    const seeds: CropType[] = ['carrot', 'wheat', 'tomato', 'sunflower'];
    const seedItemW = (panel.w - 30) / 4 - 8;
    for (let i = 0; i < seeds.length; i++) {
      const ix = panel.x + 15 + i * (seedItemW + 8);
      const iy = panel.y + 80;
      this.drawSeedShopItem(seeds[i], ix, iy, seedItemW, 110);
    }

    ctx.font = `bold ${sectionFont}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#f6ad55';
    ctx.fillText('农场装饰', panel.x + 15, panel.y + 210);

    const decos: DecorationType[] = ['scarecrow', 'fence', 'windmill'];
    const decoItemW = (panel.w - 30) / 3 - 10;
    for (let i = 0; i < decos.length; i++) {
      const ix = panel.x + 15 + i * (decoItemW + 10);
      const iy = panel.y + 220;
      this.drawDecoShopItem(decos[i], ix, iy, decoItemW, 130);
    }
  }

  private drawSeedShopItem(crop: CropType, x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const config = CROP_CONFIGS[crop];
    const seedCount = this.gameManager.getSeedCount(crop);

    ctx.fillStyle = COLORS.toolbar;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.toolbarLight;
    ctx.fillRect(x, y, w, 2);

    this.drawCropIcon(crop, x + w / 2 - 18, y + 8, 36);

    const nameSize = this.isSmall ? 8 : 10;
    ctx.font = `bold ${nameSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.fillText(config.name, x + w / 2, y + 58);
    ctx.textAlign = 'left';

    ctx.font = `${this.isSmall ? 7 : 9}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#a0aec0';
    ctx.textAlign = 'center';
    const stockText = seedCount < 0 ? '库存: ∞' : `库存: ${seedCount}`;
    ctx.fillText(stockText, x + w / 2, y + 72);
    ctx.textAlign = 'left';

    const btnH = 26;
    const canAfford = this.gameManager.coins >= config.seedPrice;
    const isPressed = this.panelPressedButton === `shop_seed_${crop}`;
    this.drawSmallPixelButton(x + 6, y + h - btnH - 6, w - 12, btnH, isPressed, `购买 $${config.seedPrice}`, canAfford);
  }

  private drawDecoShopItem(deco: DecorationType, x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const config = DECORATION_CONFIGS[deco];

    ctx.fillStyle = COLORS.toolbar;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.toolbarLight;
    ctx.fillRect(x, y, w, 2);

    this.drawDecoIcon(deco, x + w / 2 - 22, y + 8, 44);

    const nameSize = this.isSmall ? 8 : 10;
    ctx.font = `bold ${nameSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = 'center';
    ctx.fillText(config.name, x + w / 2, y + 66);
    ctx.textAlign = 'left';

    const btnH = 28;
    const canAfford = this.gameManager.coins >= config.price;
    const isPressed = this.panelPressedButton === `shop_deco_${deco}`;
    this.drawSmallPixelButton(x + 6, y + h - btnH - 6, w - 12, btnH, isPressed, `购买 $${config.price}`, canAfford);
  }

  private drawDecoIcon(type: DecorationType, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const cx = x + size / 2;
    const cy = y + size / 2;

    if (type === 'scarecrow') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.floor(cx - 1), Math.floor(y + 6), 3, size - 12);
      ctx.fillRect(Math.floor(x + 4), Math.floor(cy - 2), size - 8, 4);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(Math.floor(cx - size * 0.15), Math.floor(y + 4), Math.floor(size * 0.3), Math.floor(size * 0.2));
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(Math.floor(x + 4), Math.floor(cy + 3), Math.floor(size * 0.4), Math.floor(size * 0.3));
    } else if (type === 'fence') {
      ctx.fillStyle = '#92400e';
      for (let i = 0; i < 3; i++) {
        const px = x + 4 + i * (size - 8) / 3;
        ctx.fillRect(Math.floor(px), Math.floor(y + 4), Math.floor((size - 8) / 3 * 0.4), size - 8);
      }
      ctx.fillStyle = '#b45309';
      ctx.fillRect(Math.floor(x + 2), Math.floor(cy - 4), size - 4, 4);
      ctx.fillRect(Math.floor(x + 2), Math.floor(cy + 6), size - 4, 4);
    } else if (type === 'windmill') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(Math.floor(cx - size * 0.15), Math.floor(cy), Math.floor(size * 0.3), Math.floor(size * 0.45));
      const angle = this.time * 2;
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = angle + (Math.PI * 2 * i) / 4;
        const bladeLen = size * 0.35;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 2);
        ctx.lineTo(cx + Math.cos(a) * bladeLen, cy - 2 + Math.sin(a) * bladeLen);
        ctx.stroke();
      }
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.floor(cx - 2), Math.floor(cy - 4), 4, 4);
    }
  }

  private drawPanelFrame(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.panelBorder;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(x + 4, y + 4, w - 8, 2);
    ctx.fillRect(x + 4, y + 4, 2, h - 8);
  }

  private drawSmallPixelButton(x: number, y: number, w: number, h: number, pressed: boolean, text: string, enabled: boolean = true): void {
    const ctx = this.ctx;
    const borderW = 3;
    const offsetY = pressed ? 2 : 0;

    if (!enabled) {
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(x, y + offsetY, w, h);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x + borderW, y + borderW + offsetY, w - borderW * 2, h - borderW * 2);
    } else {
      ctx.fillStyle = COLORS.btnGreenBorder;
      ctx.fillRect(x, y + offsetY, w, h);
      ctx.fillStyle = pressed ? COLORS.btnGreenPressed : COLORS.btnGreen;
      ctx.fillRect(x + borderW, y + borderW + offsetY, w - borderW * 2, h - borderW * 2);
      ctx.fillStyle = pressed ? '#68d391' : '#9ae6b4';
      ctx.fillRect(x + borderW, y + borderW + offsetY, w - borderW * 2, 2);
    }

    const fontSize = Math.max(8, Math.min(12, Math.floor(h * 0.4)));
    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = enabled ? '#ffffff' : '#a0aec0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + offsetY + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
