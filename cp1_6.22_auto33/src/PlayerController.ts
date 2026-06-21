import Phaser from 'phaser';
import {
  CELL_SIZE,
  GRID_SIZE,
  HIDER_SPEED,
  SEEKER_SPEED,
  MAP_LAYOUT,
  TILE_TYPES,
  HIDER_ALPHA,
  SCAN_COOLDOWN,
  MAX_SCAN_CHARGES,
  SCAN_RANGE,
  SCAN_HIGHLIGHT_DURATION,
  SCAN_FLASH_DURATION,
  SCAN_FLASH_COUNT
} from './Defines';
import { ItemManager } from './ItemManager';

export type PlayerType = 'seeker' | 'hider';

export interface PlayerState {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  isMoving: boolean;
  moveSteps: number;
}

export interface ScanEvent {
  centerX: number;
  centerY: number;
  range: number;
  duration: number;
  hitHider: boolean;
}

export class PlayerController {
  private scene: Phaser.Scene;
  private type: PlayerType;
  private itemManager: ItemManager | null = null;

  private gridX: number;
  private gridY: number;
  private targetGridX: number;
  private targetGridY: number;
  private pixelX: number;
  private pixelY: number;
  private isMoving: boolean = false;
  private moveDirection: { x: number; y: number } = { x: 0, y: 0 };
  private speed: number;

  private moveSteps: number = 0;
  private scanCharges: number = MAX_SCAN_CHARGES;
  private lastScanChargeTime: number = 0;
  private scanCount: number = 0;
  private isFlashing: boolean = false;

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private sprite: Phaser.GameObjects.Container | null = null;
  private playerShape: Phaser.GameObjects.Rectangle | null = null;
  private flashShape: Phaser.GameObjects.Rectangle | null = null;

  private onMove: ((state: PlayerState) => void) | null = null;
  private onScan: ((event: ScanEvent) => void) | null = null;
  private onPlaceItem: ((gridX: number, gridY: number) => void) | null = null;
  private onPositionChange: ((gridX: number, gridY: number) => void) | null = null;

  constructor(scene: Phaser.Scene, type: PlayerType, startX: number, startY: number) {
    this.scene = scene;
    this.type = type;
    this.gridX = startX;
    this.gridY = startY;
    this.targetGridX = startX;
    this.targetGridY = startY;
    this.pixelX = startX * CELL_SIZE + CELL_SIZE / 2;
    this.pixelY = startY * CELL_SIZE + CELL_SIZE / 2;
    this.speed = type === 'seeker' ? SEEKER_SPEED : HIDER_SPEED;
  }

  setItemManager(manager: ItemManager): void {
    this.itemManager = manager;
  }

  setOnMove(callback: (state: PlayerState) => void): void {
    this.onMove = callback;
  }

  setOnScan(callback: (event: ScanEvent) => void): void {
    this.onScan = callback;
  }

  setOnPlaceItem(callback: (gridX: number, gridY: number) => void): void {
    this.onPlaceItem = callback;
  }

  setOnPositionChange(callback: (gridX: number, gridY: number) => void): void {
    this.onPositionChange = callback;
  }

  getGridPosition(): { x: number; y: number } {
    return { x: this.gridX, y: this.gridY };
  }

  getPixelPosition(): { x: number; y: number } {
    return { x: this.pixelX, y: this.pixelY };
  }

  getMoveSteps(): number {
    return this.moveSteps;
  }

  getScanCount(): number {
    return this.scanCount;
  }

  getScanCharges(): number {
    return this.scanCharges;
  }

  getScanCooldownPercent(): number {
    if (this.scanCharges >= MAX_SCAN_CHARGES) return 1;
    const now = this.scene.time.now;
    const elapsed = now - this.lastScanChargeTime;
    return Math.min(1, elapsed / SCAN_COOLDOWN);
  }

  getSprite(): Phaser.GameObjects.Container | null {
    return this.sprite;
  }

  createSprite(container?: Phaser.GameObjects.Container): Phaser.GameObjects.Container {
    const spriteContainer = this.scene.add.container(this.pixelX, this.pixelY);

    const size = CELL_SIZE * 0.7;
    const color = this.type === 'seeker' ? 0xff5252 : 0x00e5ff;
    this.playerShape = this.scene.add.rectangle(0, 0, size, size, color);
    this.playerShape.setStrokeStyle(2, 0xffffff, 0.8);
    spriteContainer.add(this.playerShape);

    this.flashShape = this.scene.add.rectangle(0, 0, size + 6, size + 6, 0xff0000, 0);
    this.flashShape.setStrokeStyle(3, 0xff0000, 0);
    spriteContainer.add(this.flashShape);

    const labelY = -size / 2 - 12;
    const labelText = this.type === 'seeker' ? 'S' : 'H';
    const label = this.scene.add.text(0, labelY, labelText, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff'
    });
    label.setOrigin(0.5);
    spriteContainer.add(label);

    if (this.type === 'hider') {
      spriteContainer.setAlpha(HIDER_ALPHA);
    }

    if (container) {
      container.add(spriteContainer);
    }

    this.sprite = spriteContainer;
    return spriteContainer;
  }

  setupControls(keys: { up: string; down: string; left: string; right: string; action: string }): void {
    this.keys.up = this.scene.input.keyboard!.addKey(keys.up);
    this.keys.down = this.scene.input.keyboard!.addKey(keys.down);
    this.keys.left = this.scene.input.keyboard!.addKey(keys.left);
    this.keys.right = this.scene.input.keyboard!.addKey(keys.right);
    this.keys.action = this.scene.input.keyboard!.addKey(keys.action);

    if (this.type === 'hider') {
      this.keys.action.on('down', () => {
        this.tryPlaceItem();
      });
    }

    if (this.type === 'seeker') {
      this.keys.action.on('down', () => {
        this.tryScan();
      });
    }
  }

  private canMoveTo(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
      return false;
    }
    const tile = MAP_LAYOUT[gridY][gridX];
    if (tile === TILE_TYPES.WALL || tile === TILE_TYPES.LOW_WALL) {
      return false;
    }
    return true;
  }

  private tryPlaceItem(): void {
    if (this.type !== 'hider' || !this.itemManager) return;
    if (this.isMoving) return;

    if (this.itemManager.canPlaceItem()) {
      const item = this.itemManager.placeItem(this.gridX, this.gridY);
      if (item && this.onPlaceItem) {
        this.onPlaceItem(this.gridX, this.gridY);
      }
    }
  }

  private tryScan(): void {
    if (this.type !== 'seeker') return;
    if (this.scanCharges <= 0) return;

    this.scanCharges--;
    this.scanCount++;

    if (this.scanCharges === MAX_SCAN_CHARGES - 1) {
      this.lastScanChargeTime = this.scene.time.now;
    }

    if (this.onScan) {
      this.onScan({
        centerX: this.gridX,
        centerY: this.gridY,
        range: SCAN_RANGE,
        duration: SCAN_HIGHLIGHT_DURATION,
        hitHider: false
      });
    }
  }

  triggerDetectionFlash(): void {
    if (this.isFlashing) return;
    this.isFlashing = true;

    let flashCount = 0;
    const totalFlashes = SCAN_FLASH_COUNT * 2;

    const flashTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: SCAN_FLASH_DURATION,
      yoyo: true,
      repeat: SCAN_FLASH_COUNT - 1,
      onUpdate: (tween) => {
        const value = tween.getValue();
        if (this.flashShape && value !== null) {
          this.flashShape.setStrokeStyle(3, 0xff0000, value);
        }
      },
      onComplete: () => {
        this.isFlashing = false;
        if (this.flashShape) {
          this.flashShape.setStrokeStyle(3, 0xff0000, 0);
        }
      }
    });
  }

  checkScanHit(scanCenterX: number, scanCenterY: number, range: number): boolean {
    if (this.type !== 'hider') return false;
    const dx = Math.abs(this.gridX - scanCenterX);
    const dy = Math.abs(this.gridY - scanCenterY);
    return dx <= range && dy <= range;
  }

  update(delta: number, time: number): void {
    this.updateScanCharges(time);
    this.handleMovementInput();
    this.updateMovement(delta);
  }

  private updateScanCharges(time: number): void {
    if (this.type !== 'seeker') return;
    if (this.scanCharges >= MAX_SCAN_CHARGES) return;

    if (time - this.lastScanChargeTime >= SCAN_COOLDOWN) {
      this.scanCharges++;
      this.lastScanChargeTime = time;
    }
  }

  private handleMovementInput(): void {
    if (this.isMoving) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.up?.isDown) dy = -1;
    else if (this.keys.down?.isDown) dy = 1;
    else if (this.keys.left?.isDown) dx = -1;
    else if (this.keys.right?.isDown) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const newX = this.gridX + dx;
      const newY = this.gridY + dy;

      if (this.canMoveTo(newX, newY)) {
        this.targetGridX = newX;
        this.targetGridY = newY;
        this.isMoving = true;
        this.moveDirection = { x: dx, y: dy };
        this.moveSteps++;

        if (this.onMove) {
          this.onMove({
            gridX: this.targetGridX,
            gridY: this.targetGridY,
            pixelX: this.targetGridX * CELL_SIZE + CELL_SIZE / 2,
            pixelY: this.targetGridY * CELL_SIZE + CELL_SIZE / 2,
            isMoving: true,
            moveSteps: this.moveSteps
          });
        }
      }
    }
  }

  private updateMovement(delta: number): void {
    if (!this.isMoving) return;

    const targetX = this.targetGridX * CELL_SIZE + CELL_SIZE / 2;
    const targetY = this.targetGridY * CELL_SIZE + CELL_SIZE / 2;

    const moveAmount = (this.speed * delta) / 1000;
    const dx = targetX - this.pixelX;
    const dy = targetY - this.pixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= moveAmount) {
      this.pixelX = targetX;
      this.pixelY = targetY;
      this.gridX = this.targetGridX;
      this.gridY = this.targetGridY;
      this.isMoving = false;

      if (this.onPositionChange) {
        this.onPositionChange(this.gridX, this.gridY);
      }
    } else {
      const ratio = moveAmount / dist;
      this.pixelX += dx * ratio;
      this.pixelY += dy * ratio;
    }

    if (this.sprite) {
      this.sprite.setPosition(this.pixelX, this.pixelY);
    }
  }

  setPosition(gridX: number, gridY: number): void {
    this.gridX = gridX;
    this.gridY = gridY;
    this.targetGridX = gridX;
    this.targetGridY = gridY;
    this.pixelX = gridX * CELL_SIZE + CELL_SIZE / 2;
    this.pixelY = gridY * CELL_SIZE + CELL_SIZE / 2;
    this.isMoving = false;

    if (this.sprite) {
      this.sprite.setPosition(this.pixelX, this.pixelY);
    }

    if (this.onPositionChange) {
      this.onPositionChange(this.gridX, this.gridY);
    }
  }

  reset(startX: number, startY: number): void {
    this.setPosition(startX, startY);
    this.moveSteps = 0;
    this.scanCharges = MAX_SCAN_CHARGES;
    this.scanCount = 0;
    this.lastScanChargeTime = 0;
    this.isFlashing = false;
    this.isMoving = false;
  }

  isSamePosition(other: PlayerController): boolean {
    return this.gridX === other.gridX && this.gridY === other.gridY;
  }

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
