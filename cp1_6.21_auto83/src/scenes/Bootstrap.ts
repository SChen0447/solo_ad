import Phaser from 'phaser';

export class Bootstrap extends Phaser.Scene {
  constructor() {
    super('Bootstrap');
  }

  preload(): void {
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
