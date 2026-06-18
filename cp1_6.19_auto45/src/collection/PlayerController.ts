import { Inventory } from './Inventory';
import { MapGrid } from '../ecosystem/MapGrid';
import { PlayerPosition } from '../types';

export class PlayerController {
  private mapGrid: MapGrid;
  private inventory: Inventory;
  private position: PlayerPosition;
  private keysPressed: Set<string> = new Set();
  private animationFrameId: number | null = null;
  private pixelOffset: { x: number; y: number } = { x: 0, y: 0 };
  private targetPosition: PlayerPosition;
  private onPositionUpdate: ((pos: PlayerPosition) => void) | null = null;
  private onCollect: ((speciesId: number) => void) | null = null;
  private readonly MOVE_SPEED = 5;
  private readonly CELL_SIZE = 40;

  constructor(mapGrid: MapGrid, inventory: Inventory, startX: number = 50, startY: number = 50) {
    this.mapGrid = mapGrid;
    this.inventory = inventory;
    this.position = { x: startX, y: startY };
    this.targetPosition = { x: startX, y: startY };
  }

  getPosition(): PlayerPosition {
    return { ...this.position };
  }

  getPixelOffset(): { x: number; y: number } {
    return { ...this.pixelOffset };
  }

  setCallbacks(onPositionUpdate: (pos: PlayerPosition) => void, onCollect: (speciesId: number) => void): void {
    this.onPositionUpdate = onPositionUpdate;
    this.onCollect = onCollect;
  }

  startListening(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.startMovementLoop();
  }

  stopListening(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'e'].includes(key)) {
      e.preventDefault();
      this.keysPressed.add(key);
    }
    if (key === 'e') {
      this.tryCollect();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.key.toLowerCase());
  };

  private startMovementLoop(): void {
    const loop = () => {
      this.updateMovement();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updateMovement(): void {
    let dx = 0;
    let dy = 0;
    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) dy -= 1;
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) dy += 1;
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) dx -= 1;
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      this.pixelOffset.x += dx * this.MOVE_SPEED;
      this.pixelOffset.y += dy * this.MOVE_SPEED;

      if (Math.abs(this.pixelOffset.x) >= this.CELL_SIZE) {
        const gridDx = this.pixelOffset.x > 0 ? 1 : -1;
        const newX = this.position.x + gridDx;
        if (newX >= 0 && newX < this.mapGrid.width) {
          this.position.x = newX;
        }
        this.pixelOffset.x = 0;
      }

      if (Math.abs(this.pixelOffset.y) >= this.CELL_SIZE) {
        const gridDy = this.pixelOffset.y > 0 ? 1 : -1;
        const newY = this.position.y + gridDy;
        if (newY >= 0 && newY < this.mapGrid.height) {
          this.position.y = newY;
        }
        this.pixelOffset.y = 0;
      }

      if (this.onPositionUpdate) {
        this.onPositionUpdate(this.getPosition());
      }
    }
  }

  tryCollect(): void {
    const cell = this.mapGrid.getCell(this.position.x, this.position.y);
    if (cell && cell.speciesId !== null && cell.growthStage >= 2) {
      const speciesId = this.mapGrid.collectCell(this.position.x, this.position.y);
      if (speciesId !== null) {
        const added = this.inventory.addSpore(speciesId);
        if (added && this.onCollect) {
          this.onCollect(speciesId);
        }
      }
    }
  }

  tryCollectAt(x: number, y: number): number | null {
    const cell = this.mapGrid.getCell(x, y);
    if (cell && cell.speciesId !== null && cell.growthStage >= 2) {
      const dist = Math.abs(x - this.position.x) + Math.abs(y - this.position.y);
      if (dist <= 2) {
        const speciesId = this.mapGrid.collectCell(x, y);
        if (speciesId !== null) {
          this.inventory.addSpore(speciesId);
          if (this.onCollect) this.onCollect(speciesId);
          return speciesId;
        }
      }
    }
    return null;
  }

  getNearbyCollectibles(): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = this.position.x + dx;
        const y = this.position.y + dy;
        const cell = this.mapGrid.getCell(x, y);
        if (cell && cell.speciesId !== null && cell.growthStage >= 2) {
          result.push({ x, y });
        }
      }
    }
    return result;
  }
}
