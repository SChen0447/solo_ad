import * as PIXI from 'pixi.js';
import {
  Commodity,
  KlineCandle,
  getCommodityById,
} from './commodityData';
import { MarketManager, TradeResult } from './marketManager';

interface PlayerState {
  gold: number;
  inventory: Map<string, number>;
}

type ButtonState = 'normal' | 'hover' | 'disabled';

interface CommodityRow {
  container: PIXI.Container;
  commodity: Commodity;
  bg: PIXI.Graphics;
  icon: PIXI.Graphics;
  nameText: PIXI.Text;
  priceText: PIXI.Text;
  trendArrow: PIXI.Graphics;
  quantityText: PIXI.Text;
  buyButton: PIXI.Container;
  buyButtonBg: PIXI.Graphics;
  buyButtonText: PIXI.Text;
  sellButton: PIXI.Container;
  sellButtonBg: PIXI.Graphics;
  sellButtonText: PIXI.Text;
  buyState: ButtonState;
  sellState: ButtonState;
}

const BG_COLOR = 0x4a3728;
const CARD_COLOR = 0xf5deb3;
const CARD_BORDER_COLOR = 0x8b6914;
const TEXT_COLOR = 0x000000;
const TEXT_STROKE_COLOR = 0x000000;
const GREEN_COLOR = 0x2e8b57;
const RED_COLOR = 0xb22222;
const UP_COLOR = 0x00ff00;
const DOWN_COLOR = 0xff0000;
const FLAT_COLOR = 0xffffff;
const DISABLED_COLOR = 0x666666;

const ROW_HEIGHT = 60;
const ROW_PADDING = 8;

export class UIController {
  private app: PIXI.Application;
  private marketManager: MarketManager;
  private player: PlayerState;

  private rootContainer: PIXI.Container;
  private walletDisplay: PIXI.Container;
  private goldText: PIXI.Text;
  private inventoryText: PIXI.Text;
  private commodityListContainer: PIXI.Container;
  private klineContainer: PIXI.Container;
  private klineCanvas: HTMLCanvasElement;
  private klineSprite: PIXI.Sprite;
  private flashOverlay: PIXI.Graphics;
  private messageText: PIXI.Text;

  private commodityRows: Map<string, CommodityRow> = new Map();
  private audioContext: AudioContext | null = null;
  private flashAlpha: number = 0;
  private flashColor: number = 0xff0000;
  private flashStartTime: number = 0;
  private flashDuration: number = 300;
  private isFlashing: boolean = false;
  private isSmallScreen: boolean = false;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor(app: PIXI.Application, marketManager: MarketManager) {
    this.app = app;
    this.marketManager = marketManager;
    this.player = {
      gold: 100,
      inventory: new Map<string, number>(),
    };

    for (const commodity of marketManager.getCommodities()) {
      this.player.inventory.set(commodity.id, 0);
    }

    this.rootContainer = new PIXI.Container();
    this.app.stage.addChild(this.rootContainer);

    this.walletDisplay = new PIXI.Container();
    this.commodityListContainer = new PIXI.Container();
    this.klineContainer = new PIXI.Container();
    this.flashOverlay = new PIXI.Graphics();

    this.goldText = this.createPixelText('', 16);
    this.inventoryText = this.createPixelText('', 12);
    this.messageText = this.createPixelText('', 14);

    this.klineCanvas = document.createElement('canvas');
    this.klineCanvas.width = 300;
    this.klineCanvas.height = 150;
    this.klineSprite = PIXI.Sprite.from(this.klineCanvas);

    this.initAudio();
    this.buildUI();
    this.setupMarketCallbacks();
    this.setupResizeHandler();
    this.handleResize();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      this.audioContext = null;
    }
  }

  private playSound(type: 'click' | 'up' | 'down' | 'error'): void {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    let freq = 440;
    let waveType: OscillatorType = 'square';

    switch (type) {
      case 'click':
        freq = 440;
        waveType = 'square';
        break;
      case 'up':
        freq = 660;
        waveType = 'triangle';
        break;
      case 'down':
        freq = 220;
        waveType = 'triangle';
        break;
      case 'error':
        freq = 100;
        waveType = 'square';
        break;
    }

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(freq, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  private createPixelText(text: string, fontSize: number): PIXI.Text {
    return new PIXI.Text(text, {
      fontFamily: '"Courier New", monospace',
      fontSize,
      fill: TEXT_COLOR,
      stroke: TEXT_STROKE_COLOR,
      strokeThickness: 1,
      align: 'left',
    });
  }

  private buildUI(): void {
    this.drawBackground();
    this.buildWalletDisplay();
    this.buildCommodityList();
    this.buildKlineChart();
    this.buildFlashOverlay();
    this.buildMessageDisplay();
  }

  private drawBackground(): void {
    const bg = new PIXI.Graphics();
    bg.beginFill(BG_COLOR);
    bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    bg.endFill();
    this.rootContainer.addChild(bg);

    const woodLines = new PIXI.Graphics();
    woodLines.lineStyle(1, 0x3a2718, 0.5);
    for (let y = 0; y < this.app.screen.height; y += 20) {
      woodLines.moveTo(0, y);
      woodLines.lineTo(this.app.screen.width, y);
    }
    for (let x = 0; x < this.app.screen.width; x += 80) {
      woodLines.moveTo(x, 0);
      woodLines.lineTo(x, this.app.screen.height);
    }
    this.rootContainer.addChild(woodLines);
  }

  private buildWalletDisplay(): void {
    this.walletDisplay.x = this.app.screen.width - 220;
    this.walletDisplay.y = 16;

    const card = new PIXI.Graphics();
    card.beginFill(CARD_COLOR);
    card.lineStyle(2, CARD_BORDER_COLOR);
    card.drawRoundedRect(0, 0, 200, 70, 4);
    card.endFill();
    this.walletDisplay.addChild(card);

    this.goldText.text = '💰 金币: 100';
    this.goldText.x = 10;
    this.goldText.y = 8;
    this.walletDisplay.addChild(this.goldText);

    this.inventoryText.text = '📦 背包';
    this.inventoryText.x = 10;
    this.inventoryText.y = 36;
    this.walletDisplay.addChild(this.inventoryText);

    this.rootContainer.addChild(this.walletDisplay);
  }

  private buildCommodityList(): void {
    this.commodityListContainer.x = 20;
    this.commodityListContainer.y = 100;

    const commodities = this.marketManager.getCommodities();
    commodities.forEach((commodity, index) => {
      const row = this.createCommodityRow(commodity, index);
      this.commodityRows.set(commodity.id, row);
      this.commodityListContainer.addChild(row.container);
    });

    this.rootContainer.addChild(this.commodityListContainer);
  }

  private createCommodityRow(commodity: Commodity, index: number): CommodityRow {
    const container = new PIXI.Container();
    container.y = index * (ROW_HEIGHT + 8);
    container.eventMode = 'static';

    const rowWidth = this.getRowWidth();

    const bg = new PIXI.Graphics();
    bg.beginFill(CARD_COLOR);
    bg.lineStyle(2, CARD_BORDER_COLOR);
    bg.drawRoundedRect(0, 0, rowWidth, ROW_HEIGHT, 4);
    bg.endFill();
    container.addChild(bg);

    const icon = this.createCommodityIcon(commodity);
    icon.x = ROW_PADDING + 15;
    icon.y = ROW_HEIGHT / 2;
    container.addChild(icon);

    const nameText = this.createPixelText(commodity.name, 16);
    nameText.x = 55;
    nameText.y = ROW_HEIGHT / 2 - nameText.height / 2;
    container.addChild(nameText);

    const priceText = this.createPixelText('0', 18);
    priceText.x = this.isSmallScreen ? 140 : 160;
    priceText.y = ROW_HEIGHT / 2 - priceText.height / 2;
    container.addChild(priceText);

    const trendArrow = new PIXI.Graphics();
    trendArrow.x = 240;
    trendArrow.y = ROW_HEIGHT / 2;
    trendArrow.visible = !this.isSmallScreen;
    container.addChild(trendArrow);

    const quantityText = this.createPixelText('x0', 14);
    quantityText.x = this.isSmallScreen ? 210 : 280;
    quantityText.y = ROW_HEIGHT / 2 - quantityText.height / 2;
    quantityText.visible = !this.isSmallScreen;
    container.addChild(quantityText);

    const buyButton = this.createTradeButton('买', GREEN_COLOR, true);
    buyButton.x = rowWidth - 150;
    buyButton.y = ROW_HEIGHT / 2 - buyButton.height / 2;
    container.addChild(buyButton);

    const sellButton = this.createTradeButton('卖', RED_COLOR, true);
    sellButton.x = rowWidth - 75;
    sellButton.y = ROW_HEIGHT / 2 - sellButton.height / 2;
    container.addChild(sellButton);

    const row: CommodityRow = {
      container,
      commodity,
      bg,
      icon,
      nameText,
      priceText,
      trendArrow,
      quantityText,
      buyButton,
      buyButtonBg: buyButton.getChildAt(0) as PIXI.Graphics,
      buyButtonText: buyButton.getChildAt(1) as PIXI.Text,
      sellButton,
      sellButtonBg: sellButton.getChildAt(0) as PIXI.Graphics,
      sellButtonText: sellButton.getChildAt(1) as PIXI.Text,
      buyState: 'normal',
      sellState: 'normal',
    };

    this.setupButtonEvents(row, 'buy');
    this.setupButtonEvents(row, 'sell');

    return row;
  }

  private getRowWidth(): number {
    if (this.isSmallScreen) {
      return Math.min(this.screenWidth - 40, 420);
    }
    return Math.min(this.screenWidth - 280, 700);
  }

  private createCommodityIcon(commodity: Commodity): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const size = 24;

    g.beginFill(commodity.color);
    g.lineStyle(2, 0x000000);

    switch (commodity.iconShape) {
      case 'triangle':
        g.moveTo(0, -size / 2);
        g.lineTo(size / 2, size / 2);
        g.lineTo(-size / 2, size / 2);
        g.closePath();
        break;
      case 'square':
        g.drawRect(-size / 2, -size / 2, size, size);
        break;
      case 'circle':
        g.drawCircle(0, 0, size / 2);
        break;
      case 'diamond':
        g.moveTo(0, -size / 2);
        g.lineTo(size / 2, 0);
        g.lineTo(0, size / 2);
        g.lineTo(-size / 2, 0);
        g.closePath();
        break;
      case 'star':
        this.drawStar(g, 0, 0, 5, size / 2, size / 4);
        break;
    }

    g.endFill();
    return g;
  }

  private drawStar(g: PIXI.Graphics, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    g.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      g.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      g.lineTo(x, y);
      rot += step;
    }
    g.lineTo(cx, cy - outerRadius);
    g.closePath();
  }

  private createTradeButton(label: string, color: number, _enabled: boolean): PIXI.Container {
    const container = new PIXI.Container();
    container.eventMode = 'static';
    container.cursor = 'pointer';

    const width = 65;
    const height = 36;

    const bg = new PIXI.Graphics();
    bg.beginFill(color);
    bg.lineStyle(2, 0x000000);
    bg.drawRect(0, 0, width, height);
    bg.endFill();
    container.addChild(bg);

    const text = this.createPixelText(label, 16);
    text.x = width / 2 - text.width / 2;
    text.y = height / 2 - text.height / 2;
    container.addChild(text);

    return container;
  }

  private setupButtonEvents(row: CommodityRow, buttonType: 'buy' | 'sell'): void {
    const button = buttonType === 'buy' ? row.buyButton : row.sellButton;

    button.on('pointerover', () => {
      const state = buttonType === 'buy' ? row.buyState : row.sellState;
      if (state === 'normal') {
        button.scale.set(1.2);
        button.pivot.set(button.width / (2 * 1.2), button.height / (2 * 1.2));
        button.x += button.width * 0.1;
        button.y += button.height * 0.1;
        if (buttonType === 'buy') row.buyState = 'hover';
        else row.sellState = 'hover';
        this.playSound('click');
      }
    });

    button.on('pointerout', () => {
      const state = buttonType === 'buy' ? row.buyState : row.sellState;
      if (state === 'hover') {
        button.scale.set(1);
        button.pivot.set(0, 0);
        button.x -= button.width * 0.1;
        button.y -= button.height * 0.1;
        if (buttonType === 'buy') row.buyState = 'normal';
        else row.sellState = 'normal';
      }
    });

    button.on('pointertap', () => {
      const state = buttonType === 'buy' ? row.buyState : row.sellState;
      if (state === 'disabled') {
        this.playSound('error');
        this.showMessage(buttonType === 'buy' ? '金币不足！' : '背包中无此商品！');
        return;
      }

      let result: TradeResult;
      if (buttonType === 'buy') {
        result = this.marketManager.buy(row.commodity.id, this.player.gold);
      } else {
        result = this.marketManager.sell(row.commodity.id, this.player.inventory.get(row.commodity.id) || 0);
      }

      if (result.success) {
        if (buttonType === 'buy') {
          const price = this.marketManager.getPriceState(row.commodity.id)?.previousPrice || 0;
          this.player.gold -= price;
          const qty = this.player.inventory.get(row.commodity.id) || 0;
          this.player.inventory.set(row.commodity.id, qty + 1);
          this.playSound('up');
        } else {
          const price = this.marketManager.getPriceState(row.commodity.id)?.previousPrice || 0;
          this.player.gold += price;
          const qty = this.player.inventory.get(row.commodity.id) || 0;
          this.player.inventory.set(row.commodity.id, Math.max(0, qty - 1));
          this.playSound('down');
        }
        this.showMessage(result.message);
      } else {
        this.playSound('error');
        this.showMessage(result.message);
      }

      this.updateWalletDisplay();
      this.updateButtonStates();
    });
  }

  private buildKlineChart(): void {
    this.klineContainer.x = 20;
    this.klineContainer.y = this.app.screen.height - 180;

    const card = new PIXI.Graphics();
    card.beginFill(CARD_COLOR);
    card.lineStyle(2, CARD_BORDER_COLOR);
    card.drawRoundedRect(0, 0, 320, 170, 4);
    card.endFill();
    this.klineContainer.addChild(card);

    const title = this.createPixelText('📈 价格走势 (最近5分钟)', 12);
    title.x = 10;
    title.y = 6;
    this.klineContainer.addChild(title);

    this.klineSprite.x = 10;
    this.klineSprite.y = 25;
    this.klineContainer.addChild(this.klineSprite);

    this.rootContainer.addChild(this.klineContainer);
  }

  private buildFlashOverlay(): void {
    this.flashOverlay.beginFill(0xff0000, 0);
    this.flashOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    this.flashOverlay.endFill();
    this.rootContainer.addChild(this.flashOverlay);
  }

  private buildMessageDisplay(): void {
    this.messageText.anchor.set(0.5);
    this.messageText.x = this.app.screen.width / 2;
    this.messageText.y = 50;
    this.rootContainer.addChild(this.messageText);
  }

  private showMessage(msg: string): void {
    this.messageText.text = msg;
    this.messageText.visible = true;
    this.messageText.alpha = 1;

    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed < 2000) {
        this.messageText.alpha = Math.max(0, 1 - elapsed / 2000);
        requestAnimationFrame(animate);
      } else {
        this.messageText.visible = false;
      }
    };
    requestAnimationFrame(animate);
  }

  private setupMarketCallbacks(): void {
    this.marketManager.onPriceUpdate((_states) => {
      this.updateCommodityDisplay();
      this.updateButtonStates();
      this.drawKline();
    });

    this.marketManager.onThresholdBreach((_commodityId, type) => {
      this.triggerFlash(type);
      this.playSound(type === 'up' ? 'up' : 'down');
    });
  }

  private updateCommodityDisplay(): void {
    const states = this.marketManager.getPriceStates();

    for (const state of states) {
      const row = this.commodityRows.get(state.commodityId);
      if (!row) continue;

      const priceRounded = Math.round(state.currentPrice);
      row.priceText.text = `${priceRounded} 💰`;

      switch (state.trend) {
        case 'up':
          row.priceText.style.fill = UP_COLOR;
          this.drawTrendArrow(row.trendArrow, 'up');
          break;
        case 'down':
          row.priceText.style.fill = DOWN_COLOR;
          this.drawTrendArrow(row.trendArrow, 'down');
          break;
        default:
          row.priceText.style.fill = FLAT_COLOR;
          this.drawTrendArrow(row.trendArrow, 'flat');
      }

      const qty = this.player.inventory.get(state.commodityId) || 0;
      row.quantityText.text = `x${qty}`;
    }
  }

  private drawTrendArrow(g: PIXI.Graphics, trend: 'up' | 'down' | 'flat'): void {
    g.clear();
    g.lineStyle(2, 0x000000);

    if (trend === 'up') {
      g.beginFill(UP_COLOR);
      g.moveTo(0, -10);
      g.lineTo(8, 4);
      g.lineTo(-8, 4);
      g.closePath();
      g.endFill();
    } else if (trend === 'down') {
      g.beginFill(DOWN_COLOR);
      g.moveTo(0, 10);
      g.lineTo(8, -4);
      g.lineTo(-8, -4);
      g.closePath();
      g.endFill();
    } else {
      g.beginFill(FLAT_COLOR);
      g.drawRect(-8, -2, 16, 4);
      g.endFill();
    }
  }

  private updateWalletDisplay(): void {
    this.goldText.text = `💰 金币: ${Math.round(this.player.gold)}`;

    const invParts: string[] = [];
    for (const [id, qty] of this.player.inventory) {
      if (qty > 0) {
        const commodity = getCommodityById(id);
        if (commodity) {
          invParts.push(`${commodity.name}x${qty}`);
        }
      }
    }
    this.inventoryText.text = invParts.length > 0 ? `📦 ${invParts.join(' ')}` : '📦 背包空空';
  }

  private updateButtonStates(): void {
    for (const [id, row] of this.commodityRows) {
      const state = this.marketManager.getPriceState(id);
      if (!state) continue;

      const canBuy = this.player.gold >= state.currentPrice;
      this.setButtonState(row, 'buy', canBuy);

      const qty = this.player.inventory.get(id) || 0;
      const canSell = qty > 0;
      this.setButtonState(row, 'sell', canSell);
    }
  }

  private setButtonState(row: CommodityRow, buttonType: 'buy' | 'sell', enabled: boolean): void {
    const bg = buttonType === 'buy' ? row.buyButtonBg : row.sellButtonBg;
    const currentState = buttonType === 'buy' ? row.buyState : row.sellState;

    if (enabled && currentState === 'disabled') {
      bg.tint = 0xffffff;
      if (buttonType === 'buy') row.buyState = 'normal';
      else row.sellState = 'normal';
    } else if (!enabled && currentState !== 'disabled') {
      bg.tint = DISABLED_COLOR;
      if (buttonType === 'buy') row.buyState = 'disabled';
      else row.sellState = 'disabled';
    }
  }

  private triggerFlash(type: 'up' | 'down'): void {
    this.flashColor = type === 'up' ? 0x00ff00 : 0xff0000;
    this.flashStartTime = performance.now();
    this.isFlashing = true;
    this.flashAlpha = 0.5;
    this.updateFlashOverlay();
  }

  private updateFlashOverlay(): void {
    this.flashOverlay.clear();
    this.flashOverlay.beginFill(this.flashColor, this.flashAlpha);
    this.flashOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    this.flashOverlay.endFill();
  }

  private drawKline(): void {
    if (this.isSmallScreen) return;

    const ctx = this.klineCanvas.getContext('2d');
    if (!ctx) return;

    const width = this.klineCanvas.width;
    const height = this.klineCanvas.height;

    ctx.fillStyle = '#2a1a0a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const states = this.marketManager.getPriceStates();
    if (states.length === 0) return;

    const colors = ['#ff4444', '#f5deb3', '#888888', '#d8bfd8', '#ff8c00'];

    states.forEach((state, idx) => {
      if (state.history.length < 1) return;

      let minPrice = Infinity;
      let maxPrice = -Infinity;
      for (const candle of state.history) {
        minPrice = Math.min(minPrice, candle.low);
        maxPrice = Math.max(maxPrice, candle.high);
      }
      if (state.currentCandle) {
        minPrice = Math.min(minPrice, state.currentCandle.low);
        maxPrice = Math.max(maxPrice, state.currentCandle.high);
      }
      if (minPrice === maxPrice) {
        minPrice -= 1;
        maxPrice += 1;
      }

      const color = colors[idx % colors.length];
      const candleWidth = Math.max(3, (width / 30) * 0.6);
      const candleSpacing = width / 30;

      const allCandles: KlineCandle[] = [...state.history];
      if (state.currentCandle) {
        allCandles.push(state.currentCandle);
      }

      allCandles.forEach((candle, i) => {
        if (i >= 30) return;

        const x = i * candleSpacing + candleSpacing / 2;

        const normalize = (price: number): number => {
          return height - ((price - minPrice) / (maxPrice - minPrice)) * (height - 10) - 5;
        };

        const yHigh = normalize(candle.high);
        const yLow = normalize(candle.low);
        const yOpen = normalize(candle.open);
        const yClose = normalize(candle.close);

        const isUp = candle.close >= candle.open;

        ctx.strokeStyle = isUp ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        const rectTop = Math.min(yOpen, yClose);
        const rectBottom = Math.max(yOpen, yClose);
        const rectHeight = Math.max(1, rectBottom - rectTop);

        ctx.fillStyle = isUp ? '#00ff00' : '#ff0000';
        ctx.fillRect(x - candleWidth / 2, rectTop, candleWidth, rectHeight);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - candleWidth / 2, rectTop, candleWidth, rectHeight);
      });
    });

    this.klineSprite.texture.update();
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    const oldIsSmallScreen = this.isSmallScreen;
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.isSmallScreen = this.screenWidth < 1024;

    this.app.renderer.resize(this.screenWidth, this.screenHeight);

    if (oldIsSmallScreen !== this.isSmallScreen || this.commodityRows.size === 0) {
      this.redrawLayout();
    } else {
      this.updateRowResponsiveness();
      this.walletDisplay.x = this.screenWidth - 220;
      this.commodityListContainer.x = this.isSmallScreen ? 10 : 20;
      this.messageText.x = this.screenWidth / 2;
      if (!this.isSmallScreen) {
        this.klineContainer.x = 20;
        this.klineContainer.y = this.screenHeight - 180;
        this.drawKline();
      }
    }
  }

  private redrawLayout(): void {
    this.rootContainer.removeChildren();
    this.commodityRows.clear();

    this.drawBackground();
    this.buildWalletDisplay();
    this.walletDisplay.x = this.screenWidth - 220;

    this.buildCommodityList();
    this.commodityListContainer.x = this.isSmallScreen ? 10 : 20;
    this.commodityListContainer.y = this.isSmallScreen ? 90 : 100;

    if (!this.isSmallScreen) {
      this.buildKlineChart();
      this.klineContainer.x = 20;
      this.klineContainer.y = this.screenHeight - 180;
    }

    this.buildFlashOverlay();
    this.messageText.x = this.screenWidth / 2;
    this.rootContainer.addChild(this.messageText);

    this.updateCommodityDisplay();
    this.updateWalletDisplay();
    this.updateButtonStates();
    this.drawKline();
  }

  public update(_deltaTime: number): void {
    if (this.isFlashing) {
      const elapsed = performance.now() - this.flashStartTime;
      if (elapsed < this.flashDuration) {
        this.flashAlpha = 0.5 * (1 - elapsed / this.flashDuration);
      } else {
        this.flashAlpha = 0;
        this.isFlashing = false;
      }
      this.updateFlashOverlay();
    }
  }

  private updateRowResponsiveness(): void {
    const isSmall = this.isSmallScreen;
    for (const row of this.commodityRows.values()) {
      row.trendArrow.visible = !isSmall;
      row.quantityText.visible = !isSmall;
      row.priceText.x = isSmall ? 140 : 160;
      row.quantityText.x = isSmall ? 210 : 280;

      const rowWidth = this.getRowWidth();
      row.bg.clear();
      row.bg.beginFill(CARD_COLOR);
      row.bg.lineStyle(2, CARD_BORDER_COLOR);
      row.bg.drawRoundedRect(0, 0, rowWidth, ROW_HEIGHT, 4);
      row.bg.endFill();

      row.buyButton.x = rowWidth - 150;
      row.sellButton.x = rowWidth - 75;
    }
  }
}
