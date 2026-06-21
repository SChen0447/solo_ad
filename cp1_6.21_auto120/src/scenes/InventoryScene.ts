import Phaser from 'phaser';
import { eventBus, GameEvents } from '../utils/EventBus';
import { ITEMS, findCombination, Item } from '../data/Items';
import { chaptersManager } from '../data/Chapters';

const INVENTORY_KEY = 'InventoryScene';

interface InventoryItem {
  id: string;
  container: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Rectangle;
  shadow: Phaser.GameObjects.Rectangle;
  data: Item;
  slotIndex: number;
}

export class InventoryScene extends Phaser.Scene {
  private inventoryItems: InventoryItem[] = [];
  private maxSlots = 10;
  private slotSize = 64;
  private slotPadding = 12;
  private slotStartX = 0;
  private panelHeight = 120;
  private panelBg!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private dragItem: InventoryItem | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private originalX = 0;
  private originalY = 0;
  private hintTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  private particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;

  constructor() {
    super({ key: INVENTORY_KEY });
  }

  create(): void {
    const { width, height } = this.scale;
    this.panelHeight = Math.min(140, height * 0.18);
    this.slotSize = Math.min(64, width * 0.06);
    this.slotPadding = Math.max(8, this.slotSize * 0.18);

    this.createPanel(width, height);
    this.createParticleSystem();
    this.registerEventListeners();
    this.refreshInventory();
  }

  private createPanel(width: number, height: number): void {
    const panelY = height - this.panelHeight + 10;
    const panelWidth = this.maxSlots * (this.slotSize + this.slotPadding) + this.slotPadding * 4;
    const panelX = (width - panelWidth) / 2;
    this.slotStartX = panelX + this.slotPadding * 2;

    this.panelBg = this.add.graphics();
    this.panelBg.fillStyle(0x1a1a2e, 0.75);
    this.panelBg.lineStyle(2, 0x8b7355, 0.4);
    this.drawRoundedRect(this.panelBg, panelX, panelY, panelWidth, this.panelHeight - 20, 16);
    this.panelBg.setScrollFactor(0);
    this.panelBg.setDepth(900);

    this.titleText = this.add.text(
      panelX + 20,
      panelY + 10,
      '物品栏',
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${Math.max(12, Math.min(16, width * 0.015))}px`,
        color: '#d4c5a9',
        fontStyle: 'bold',
      }
    );
    this.titleText.setScrollFactor(0);
    this.titleText.setDepth(901);
  }

  private createParticleSystem(): void {
    this.particles = this.add.particles(0, 0, undefined, {
      lifespan: 600,
      speed: { min: 60, max: 180 },
      scale: { start: 0.6, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 0,
      emitting: false,
    });
    this.particles.setDepth(999);
    this.particles.setScrollFactor(0);
  }

  private registerEventListeners(): void {
    eventBus.on(GameEvents.INVENTORY_UPDATED, () => {
      this.refreshInventory();
    });

    eventBus.on(GameEvents.ITEM_COLLECTED, (itemId: string) => {
      this.playCollectAnimation(itemId);
    });

    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;
    this.panelHeight = Math.min(140, height * 0.18);
    this.slotSize = Math.min(64, width * 0.06);
    this.slotPadding = Math.max(8, this.slotSize * 0.18);

    this.clearInventoryVisuals();
    this.panelBg?.destroy();
    this.titleText?.destroy();
    this.createPanel(width, height);
    this.refreshInventory();
  }

  private clearInventoryVisuals(): void {
    this.inventoryItems.forEach((item) => {
      item.container.destroy();
    });
    this.inventoryItems = [];
    this.hintTweens.forEach((tween) => tween.stop());
    this.hintTweens.clear();
  }

  private refreshInventory(): void {
    this.clearInventoryVisuals();

    const items = chaptersManager.getCollectedItems();
    const { height } = this.scale;
    const panelY = height - this.panelHeight + 10;
    const slotY = panelY + this.panelHeight / 2 + 5;

    for (let i = 0; i < this.maxSlots; i++) {
      const x = this.slotStartX + i * (this.slotSize + this.slotPadding);
      this.createEmptySlot(x, slotY, i < items.length);
      if (i < items.length) {
        const itemId = items[i];
        this.createInventoryItem(itemId, x, slotY, i);
      }
    }
  }

  private createEmptySlot(x: number, y: number, hasItem: boolean): void {
    const half = this.slotSize / 2;
    const slotBg = this.add.rectangle(x, y, this.slotSize, this.slotSize, 0x2a2a4a, hasItem ? 0.6 : 0.3);
    slotBg.setStrokeStyle(1.5, 0x5a5a7a, hasItem ? 0.8 : 0.4);
    slotBg.setScrollFactor(0);
    slotBg.setDepth(905);
  }

  private createInventoryItem(itemId: string, x: number, y: number, index: number): void {
    const data = ITEMS[itemId];
    if (!data) return;
    const half = this.slotSize / 2;

    const container = this.add.container(x, y);
    container.setDepth(910);
    container.setScrollFactor(0);

    const shadow = this.add.rectangle(2, 4, this.slotSize - 4, this.slotSize - 4, 0x000000, 0.35);
    shadow.setStrokeStyle(0);
    container.add(shadow);

    const bg = this.add.rectangle(0, 0, this.slotSize - 4, this.slotSize - 4);
    bg.setFillStyle(this.hexColorToNumber(data.iconColor), 0.9);
    bg.setStrokeStyle(2, 0xf5e6d0, 0.6);
    container.add(bg);

    const fontSize = Math.max(24, this.slotSize * 0.5);
    const icon = this.add.text(0, 0, data.iconSymbol, {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    });
    icon.setOrigin(0.5);
    container.add(icon);

    const invItem: InventoryItem = {
      id: itemId,
      container,
      icon,
      bg,
      shadow,
      data,
      slotIndex: index,
    };

    this.setupItemInteraction(invItem);
    this.inventoryItems.push(invItem);

    container.setData('invItem', invItem);
  }

  private setupItemInteraction(item: InventoryItem): void {
    item.container.setSize(this.slotSize, this.slotSize);
    item.container.setInteractive({ useHandCursor: true, pixelPerfect: false });

    item.container.on('pointerover', () => {
      if (this.dragItem) return;
      this.tweens.add({
        targets: item.container,
        scale: 1.2,
        duration: 120,
        ease: 'Quad.easeOut',
      });
      this.showItemTooltip(item);
    });

    item.container.on('pointerout', () => {
      if (this.dragItem) return;
      this.tweens.add({
        targets: item.container,
        scale: 1,
        duration: 120,
        ease: 'Quad.easeIn',
      });
      this.hideItemTooltip();
    });

    item.container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startDrag(item, pointer);
    });
  }

  private tooltipContainer!: Phaser.GameObjects.Container | null = null;

  private showItemTooltip(item: InventoryItem): void {
    this.hideItemTooltip();
    const { width, height } = this.scale;

    this.tooltipContainer = this.add.container(0, 0);
    this.tooltipContainer.setDepth(990);
    this.tooltipContainer.setScrollFactor(0);

    const tipWidth = Math.min(320, width * 0.35);
    const tipHeight = 100;
    const tipX = width / 2;
    const tipY = height - this.panelHeight - 60;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1e, 0.92);
    bg.lineStyle(1.5, this.hexColorToNumber(item.data.iconColor), 0.8);
    this.drawRoundedRect(bg, tipX - tipWidth / 2, tipY - tipHeight / 2, tipWidth, tipHeight, 10);
    this.tooltipContainer.add(bg);

    const fontSize = Math.max(12, Math.min(16, width * 0.013));

    const nameText = this.add.text(
      tipX - tipWidth / 2 + 15,
      tipY - tipHeight / 2 + 12,
      item.data.name,
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${fontSize + 2}px`,
        color: '#f5e6d0',
        fontStyle: 'bold',
      }
    );
    this.tooltipContainer.add(nameText);

    const descText = this.add.text(
      tipX - tipWidth / 2 + 15,
      tipY - tipHeight / 2 + 38,
      item.data.description,
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${fontSize}px`,
        color: '#d4c5a9',
        wordWrap: { width: tipWidth - 30 },
      }
    );
    this.tooltipContainer.add(descText);

    if (item.data.hint) {
      const hintText = this.add.text(
        tipX - tipWidth / 2 + 15,
        tipY + tipHeight / 2 - 24,
        `💡 ${item.data.hint}`,
        {
          fontFamily: 'Georgia, SimSun, serif',
          fontSize: `${fontSize - 1}px`,
          color: '#daa520',
          wordWrap: { width: tipWidth - 30 },
        }
      );
      this.tooltipContainer.add(hintText);
    }
  }

  private hideItemTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }

  private startDrag(item: InventoryItem, pointer: Phaser.Input.Pointer): void {
    this.dragItem = item;
    this.originalX = item.container.x;
    this.originalY = item.container.y;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.dragOffsetX = worldPoint.x - item.container.x;
    this.dragOffsetY = worldPoint.y - item.container.y;

    item.container.setDepth(950);
    item.container.setScale(1.2);
    eventBus.emit(GameEvents.ITEM_DRAG_START, { itemId: item.id, pointer });

    this.hideItemTooltip();

    this.input.on('pointermove', this.onDragMove, this);
    this.input.once('pointerup', this.onDragEnd, this);
  }

  private onDragMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragItem) return;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.dragItem.container.x = worldPoint.x - this.dragOffsetX;
    this.dragItem.container.y = worldPoint.y - this.dragOffsetY;
    eventBus.emit(GameEvents.ITEM_DRAG_END, { itemId: this.dragItem.id, pointer, dragging: true });
  }

  private onDragEnd(pointer: Phaser.Input.Pointer): void {
    this.input.off('pointermove', this.onDragMove, this);
    if (!this.dragItem) return;

    const dropResult = eventBus.emit(GameEvents.ITEM_DROP_ZONE, {
      itemId: this.dragItem.id,
      pointer,
    });

    const combined = this.tryCombineItems(pointer);

    if (!dropResult && !combined) {
      this.tweens.add({
        targets: this.dragItem.container,
        x: this.originalX,
        y: this.originalY,
        scale: 1,
        duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (this.dragItem) {
            this.dragItem.container.setDepth(910);
          }
        },
      });
    } else {
      this.dragItem.container.setPosition(this.originalX, this.originalY);
      this.dragItem.container.setScale(1);
      this.dragItem.container.setDepth(910);
    }

    eventBus.emit(GameEvents.ITEM_DRAG_END, { itemId: this.dragItem.id, pointer, dragging: false });
    this.dragItem = null;
  }

  private tryCombineItems(pointer: Phaser.Input.Pointer): boolean {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    for (const slot of this.inventoryItems) {
      if (slot === this.dragItem) continue;
      const bounds = slot.container.getBounds();
      if (
        worldPoint.x >= bounds.left && worldPoint.x <= bounds.right &&
        worldPoint.y >= bounds.top && worldPoint.y <= bounds.bottom
      ) {
        return this.combineItems(this.dragItem!, slot);
      }
    }
    return false;
  }

  private combineItems(item1: InventoryItem, item2: InventoryItem): boolean {
    const rule = findCombination(item1.id, item2.id);
    if (!rule) {
      this.showCombineFail(item1, item2);
      return false;
    }

    this.spawnParticles(item1.container.x, item1.container.y, item1.data.iconColor);
    this.spawnParticles(item2.container.x, item2.container.y, item2.data.iconColor);

    this.cameras.main.flash(300, 255, 255, 200, true);

    eventBus.emit(GameEvents.ITEM_COMBINED, rule);

    return true;
  }

  private showCombineFail(item1: InventoryItem, item2: InventoryItem): void {
    this.tweens.add({
      targets: [item1.container, item2.container],
      x: '+=6',
      yoyo: true,
      repeat: 3,
      duration: 40,
      ease: 'Sine.easeInOut',
    });
  }

  private spawnParticles(x: number, y: number, color: string): void {
    const colorNum = this.hexColorToNumber(color);
    this.particles.emitParticleAt(x, y, 15, {
      speed: { min: 40, max: 160 },
      lifespan: { min: 400, max: 700 },
      angle: { min: 0, max: 360 },
      scaleX: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [colorNum, 0xffffff, colorNum],
    } as any);
  }

  public playCollectAnimation(itemId: string): void {
    const item = this.inventoryItems.find((i) => i.id === itemId);
    if (!item) return;

    item.container.setScale(0);
    this.tweens.add({
      targets: item.container,
      scale: 1,
      duration: 450,
      ease: 'Back.easeOut',
    });

    this.spawnParticles(item.container.x, item.container.y, item.data.iconColor);
  }

  public playHintAnimation(itemId: string): void {
    const item = this.inventoryItems.find((i) => i.id === itemId);
    if (!item) return;

    if (this.hintTweens.has(itemId)) {
      const existing = this.hintTweens.get(itemId);
      if (existing) existing.stop();
    }

    const tween = this.tweens.add({
      targets: item.bg,
      alpha: { from: 0.9, to: 0.4 },
      duration: 500,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.hintTweens.delete(itemId);
        item.bg.setAlpha(0.9);
      },
    });
    this.hintTweens.set(itemId, tween);
  }

  public getDragItem(): InventoryItem | null {
    return this.dragItem;
  }

  private hexColorToNumber(hex: string): number {
    const clean = hex.replace('#', '');
    return parseInt(clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean, 16);
  }

  private drawRoundedRect(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    graphics.beginPath();
    graphics.moveTo(x + r, y);
    graphics.lineTo(x + width - r, y);
    graphics.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
    graphics.lineTo(x + width, y + height - r);
    graphics.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
    graphics.lineTo(x + r, y + height);
    graphics.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
    graphics.lineTo(x, y + r);
    graphics.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }
}

export { INVENTORY_KEY as INVENTORY_SCENE_KEY };
