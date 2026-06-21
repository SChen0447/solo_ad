import Phaser from 'phaser';
import { TILE_SIZE } from '../maze/MazeGenerator';

export class Player {
  public sprite: Phaser.GameObjects.Arc;
  public tileX: number;
  public tileY: number;
  public worldX: number;
  public worldY: number;
  private targetX: number;
  private targetY: number;
  public isMoving: boolean;
  public moveSpeed: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, startTileX: number, startTileY: number) {
    this.scene = scene;
    this.tileX = startTileX;
    this.tileY = startTileY;
    this.worldX = startTileX * TILE_SIZE + TILE_SIZE / 2;
    this.worldY = startTileY * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.worldX;
    this.targetY = this.worldY;
    this.isMoving = false;
    this.moveSpeed = 160;

    this.sprite = scene.add.circle(this.worldX, this.worldY, 12, 0x38a169);
    this.sprite.setStrokeStyle(2, 0x68d391);
    this.sprite.setDepth(10);
  }

  public update(delta: number): void {
    if (this.isMoving) {
      const dx = this.targetX - this.sprite.x;
      const dy = this.targetY - this.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        this.sprite.x = this.targetX;
        this.sprite.y = this.targetY;
        this.worldX = this.targetX;
        this.worldY = this.targetY;
        this.isMoving = false;
      } else {
        const step = this.moveSpeed * delta / 1000;
        this.sprite.x += (dx / dist) * step;
        this.sprite.y += (dy / dist) * step;
      }
    }
  }

  public moveTo(tx: number, ty: number): void {
    if (this.isMoving) return;
    this.tileX = tx;
    this.tileY = ty;
    this.targetX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.targetY = ty * TILE_SIZE + TILE_SIZE / 2;
    this.isMoving = true;
  }

  public teleport(tx: number, ty: number): void {
    this.tileX = tx;
    this.tileY = ty;
    this.worldX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.worldY = ty * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.worldX;
    this.targetY = this.worldY;
    this.sprite.x = this.worldX;
    this.sprite.y = this.worldY;
    this.isMoving = false;

    this.sprite.setScale(1.5);
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 1,
      duration: 200,
      ease: 'Back.Out'
    });
  }

  public setPosition(tx: number, ty: number): void {
    this.tileX = tx;
    this.tileY = ty;
    this.worldX = tx * TILE_SIZE + TILE_SIZE / 2;
    this.worldY = ty * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.worldX;
    this.targetY = this.worldY;
    this.sprite.x = this.worldX;
    this.sprite.y = this.worldY;
    this.isMoving = false;
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}
