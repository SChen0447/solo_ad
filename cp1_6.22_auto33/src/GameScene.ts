import Phaser from 'phaser';
import {
  GRID_SIZE,
  CELL_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  COLORS,
  MAP_LAYOUT,
  TILE_TYPES,
  GAME_DURATION,
  GAME_WIDTH,
  GAME_HEIGHT,
  MINIMAP_SIZE,
  SCAN_HIGHLIGHT_DURATION,
  SEEKER_VIEW_WIDTH,
  SEEKER_VIEW_HEIGHT
} from './Defines';
import { PlayerController, type ScanEvent } from './PlayerController';
import { ItemManager, type PlacedItem } from './ItemManager';
import { UIManager, type GameStats } from './UIManager';

export class GameScene extends Phaser.Scene {
  private seekerController!: PlayerController;
  private hiderController!: PlayerController;
  private itemManager!: ItemManager;
  private uiManager!: UIManager;

  private seekerViewContainer!: Phaser.GameObjects.Container;
  private seekerViewMask!: Phaser.Display.Masks.GeometryMask;
  private seekerViewGraphics!: Phaser.GameObjects.Graphics;
  private scanHighlights: Phaser.GameObjects.Rectangle[] = [];

  private gameStartTime: number = 0;
  private gameEnded: boolean = false;
  private captureTime: number | null = null;

  private seekerViewX: number = 0;
  private seekerViewY: number = 0;
  private seekerViewW: number = SEEKER_VIEW_WIDTH;
  private seekerViewH: number = SEEKER_VIEW_HEIGHT;
  private minimapX: number = 0;
  private minimapY: number = 0;

  private mapSprites: { tile: Phaser.GameObjects.Rectangle; wall: Phaser.GameObjects.Rectangle | null }[][] = [];

  constructor() {
    super('GameScene');
  }

  preload(): void {}

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

    this.seekerViewX = 50;
    this.seekerViewY = 80;
    this.seekerViewW = SEEKER_VIEW_WIDTH;
    this.seekerViewH = SEEKER_VIEW_HEIGHT;

    this.minimapX = GAME_WIDTH - MINIMAP_SIZE - 50;
    this.minimapY = GAME_HEIGHT - MINIMAP_SIZE - 80;

    this.itemManager = new ItemManager(this);
    this.uiManager = new UIManager(this);

    this.createSeekerView();
    this.createMap();
    this.createPlayers();
    this.setupItemManagerEvents();

    this.uiManager.createUI(
      this.seekerViewX,
      this.seekerViewY,
      this.seekerViewW,
      this.seekerViewH,
      this.minimapX,
      this.minimapY
    );

    this.startGame();
  }

  private createSeekerView(): void {
    this.seekerViewContainer = this.add.container(0, 0);
    this.seekerViewContainer.setDepth(10);

    const maskShape = this.add.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(this.seekerViewX, this.seekerViewY, this.seekerViewW, this.seekerViewH);
    maskShape.setVisible(false);

    this.seekerViewMask = maskShape.createGeometryMask();

    const viewBg = this.add.rectangle(
      this.seekerViewX + this.seekerViewW / 2,
      this.seekerViewY + this.seekerViewH / 2,
      this.seekerViewW,
      this.seekerViewH,
      0x1a1a2e
    );
    viewBg.setStrokeStyle(2, 0x667eea, 0.6);
    viewBg.setDepth(5);

    this.seekerViewGraphics = this.add.graphics();
    this.seekerViewGraphics.setDepth(8);
  }

  private createMap(): void {
    const offsetX = this.seekerViewX + this.seekerViewW / 2 - MAP_WIDTH / 2;
    const offsetY = this.seekerViewY + this.seekerViewH / 2 - MAP_HEIGHT / 2;

    for (let y = 0; y < GRID_SIZE; y++) {
      this.mapSprites[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const isLight = (x + y) % 2 === 0;
        const color = isLight
          ? Phaser.Display.Color.HexStringToColor(COLORS.GRID_LIGHT).color
          : Phaser.Display.Color.HexStringToColor(COLORS.GRID_DARK).color;

        const tile = this.add.rectangle(
          offsetX + x * CELL_SIZE + CELL_SIZE / 2,
          offsetY + y * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE,
          CELL_SIZE,
          color
        );
        this.seekerViewContainer.add(tile);

        let wallSprite: Phaser.GameObjects.Rectangle | null = null;
        const tileType = MAP_LAYOUT[y][x];
        if (tileType === TILE_TYPES.WALL) {
          wallSprite = this.add.rectangle(
            offsetX + x * CELL_SIZE + CELL_SIZE / 2,
            offsetY + y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE * 0.9,
            CELL_SIZE * 0.9,
            Phaser.Display.Color.HexStringToColor(COLORS.WALL).color
          );
          wallSprite.setStrokeStyle(2, 0x000000, 0.3);
          this.seekerViewContainer.add(wallSprite);
        } else if (tileType === TILE_TYPES.LOW_WALL) {
          wallSprite = this.add.rectangle(
            offsetX + x * CELL_SIZE + CELL_SIZE / 2,
            offsetY + y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE * 0.85,
            CELL_SIZE * 0.6,
            Phaser.Display.Color.HexStringToColor(COLORS.LOW_WALL).color
          );
          wallSprite.setStrokeStyle(2, 0x000000, 0.3);
          this.seekerViewContainer.add(wallSprite);
        }

        this.mapSprites[y][x] = { tile, wall: wallSprite };
      }
    }
  }

  private createPlayers(): void {
    const offsetX = this.seekerViewX + this.seekerViewW / 2 - MAP_WIDTH / 2;
    const offsetY = this.seekerViewY + this.seekerViewH / 2 - MAP_HEIGHT / 2;

    this.seekerController = new PlayerController(this, 'seeker', 0, 0);
    this.seekerController.setItemManager(this.itemManager);
    const seekerSprite = this.seekerController.createSprite();
    seekerSprite.setPosition(
      offsetX + 0 * CELL_SIZE + CELL_SIZE / 2,
      offsetY + 0 * CELL_SIZE + CELL_SIZE / 2
    );
    this.seekerViewContainer.add(seekerSprite);
    this.seekerController.setupControls({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      action: 'E'
    });

    this.hiderController = new PlayerController(this, 'hider', GRID_SIZE - 1, GRID_SIZE - 1);
    this.hiderController.setItemManager(this.itemManager);
    const hiderSprite = this.hiderController.createSprite();
    hiderSprite.setPosition(
      offsetX + (GRID_SIZE - 1) * CELL_SIZE + CELL_SIZE / 2,
      offsetY + (GRID_SIZE - 1) * CELL_SIZE + CELL_SIZE / 2
    );
    this.seekerViewContainer.add(hiderSprite);
    this.hiderController.setupControls({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      action: 'SPACE'
    });

    this.hiderController.setOnPositionChange((gx, gy) => {
      this.updateMinimap();
    });

    this.seekerController.setOnPositionChange((gx, gy) => {
      this.updateMinimap();
      this.checkCapture();
    });

    this.seekerController.setOnScan((event: ScanEvent) => {
      this.handleScan(event);
    });
  }

  private setupItemManagerEvents(): void {
    this.itemManager.setOnCooldownChange((percent, isReady) => {
      this.uiManager.updateItemCooldownBar(percent, isReady);
    });

    this.itemManager.setOnItemsChanged((items: PlacedItem[]) => {
      this.rebuildItems(items);
      this.updateMinimap();
    });
  }

  private rebuildItems(items: PlacedItem[]): void {
    const offsetX = this.seekerViewX + this.seekerViewW / 2 - MAP_WIDTH / 2;
    const offsetY = this.seekerViewY + this.seekerViewH / 2 - MAP_HEIGHT / 2;

    const itemContainer = this.seekerViewContainer;
    const children = itemContainer.getAll().filter(child => {
      const name = (child as any).name;
      return name && name.startsWith('item-');
    });
    children.forEach(child => child.destroy());

    items.forEach((item, index) => {
      const sprite = this.itemManager.createItemSprite(item);
      if (sprite) {
        sprite.name = `item-${item.id}`;
        sprite.x += offsetX;
        sprite.y += offsetY;
        itemContainer.add(sprite);
        sprite.setDepth(5 + index);
      }
    });
  }

  private handleScan(event: ScanEvent): void {
    const offsetX = this.seekerViewX + this.seekerViewW / 2 - MAP_WIDTH / 2;
    const offsetY = this.seekerViewY + this.seekerViewH / 2 - MAP_HEIGHT / 2;

    this.clearScanHighlights();

    for (let dy = -event.range; dy <= event.range; dy++) {
      for (let dx = -event.range; dx <= event.range; dx++) {
        const gx = event.centerX + dx;
        const gy = event.centerY + dy;

        if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) continue;

        const highlight = this.add.rectangle(
          offsetX + gx * CELL_SIZE + CELL_SIZE / 2,
          offsetY + gy * CELL_SIZE + CELL_SIZE / 2,
          CELL_SIZE * 0.95,
          CELL_SIZE * 0.95,
          Phaser.Display.Color.HexStringToColor(COLORS.SCAN_HIGHLIGHT).color,
          0.6
        );
        highlight.setDepth(7);
        this.seekerViewContainer.add(highlight);
        this.scanHighlights.push(highlight);
      }
    }

    const hitHider = this.hiderController.checkScanHit(event.centerX, event.centerY, event.range);
    if (hitHider) {
      this.hiderController.triggerDetectionFlash();
      this.uiManager.showSignalText();
    }

    this.time.delayedCall(event.duration, () => {
      this.clearScanHighlights();
    });
  }

  private clearScanHighlights(): void {
    for (const highlight of this.scanHighlights) {
      highlight.destroy();
    }
    this.scanHighlights = [];
  }

  private updateMinimap(): void {
    const hiderPos = this.hiderController.getGridPosition();
    const seekerPos = this.seekerController.getGridPosition();
    const items = this.itemManager.getItems();
    this.uiManager.updateMinimap(hiderPos.x, hiderPos.y, seekerPos.x, seekerPos.y, items);
  }

  private checkCapture(): void {
    if (this.gameEnded) return;

    if (this.seekerController.isSamePosition(this.hiderController)) {
      this.endGame('seeker');
    }
  }

  private startGame(): void {
    this.gameStartTime = this.time.now;
    this.gameEnded = false;
    this.captureTime = null;
    this.updateMinimap();
  }

  private endGame(winner: 'seeker' | 'hider'): void {
    if (this.gameEnded) return;
    this.gameEnded = true;

    if (winner === 'seeker') {
      this.captureTime = this.time.now - this.gameStartTime;
    }

    const stats: GameStats = {
      seekerSteps: this.seekerController.getMoveSteps(),
      hiderSteps: this.hiderController.getMoveSteps(),
      itemPlaceCount: this.itemManager.getPlaceCount(),
      scanCount: this.seekerController.getScanCount(),
      captureTime: this.captureTime,
      winner
    };

    this.uiManager.showGameOver(stats, () => {
      this.restartGame();
    });
  }

  private restartGame(): void {
    this.uiManager.hideGameOver();

    this.seekerController.reset(0, 0);
    this.hiderController.reset(GRID_SIZE - 1, GRID_SIZE - 1);
    this.itemManager.reset();

    const offsetX = this.seekerViewX + this.seekerViewW / 2 - MAP_WIDTH / 2;
    const offsetY = this.seekerViewY + this.seekerViewH / 2 - MAP_HEIGHT / 2;

    const seekerSprite = this.seekerController.getSprite();
    if (seekerSprite) {
      seekerSprite.setPosition(
        offsetX + 0 * CELL_SIZE + CELL_SIZE / 2,
        offsetY + 0 * CELL_SIZE + CELL_SIZE / 2
      );
    }

    const hiderSprite = this.hiderController.getSprite();
    if (hiderSprite) {
      hiderSprite.setPosition(
        offsetX + (GRID_SIZE - 1) * CELL_SIZE + CELL_SIZE / 2,
        offsetY + (GRID_SIZE - 1) * CELL_SIZE + CELL_SIZE / 2
      );
    }

    this.clearScanHighlights();
    this.startGame();
    this.updateMinimap();
  }

  update(time: number, delta: number): void {
    if (this.gameEnded) {
      this.uiManager.update(delta);
      return;
    }

    this.seekerController.update(delta, time);
    this.hiderController.update(delta, time);
    this.itemManager.update(time);

    const charges = this.seekerController.getScanCharges();
    const cooldown = this.seekerController.getScanCooldownPercent();
    this.uiManager.updateScanCharges(charges, cooldown);

    const elapsed = time - this.gameStartTime;
    const remaining = Math.max(0, GAME_DURATION - elapsed);
    this.uiManager.updateTimer(remaining);

    if (remaining <= 0) {
      this.endGame('hider');
    }

    this.uiManager.update(delta);

    if (!this.gameEnded) {
      this.checkCapture();
    }
  }
}
