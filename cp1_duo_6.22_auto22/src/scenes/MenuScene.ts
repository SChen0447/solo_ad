import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#2a0a3e');

    this.add
      .text(width / 2, height / 2 - 100, '地下城迷宫探索', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#39ff14',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setStroke('#2a0a3e', 6);

    this.add
      .text(width / 2, height / 2 - 40, 'DUNGEON MAZE EXPLORER', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#39ff14'
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(width / 2, height / 2 + 40, '开始游戏', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#39ff14',
        backgroundColor: 'transparent',
        padding: { x: 30, y: 12 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const buttonBg = this.add
      .rectangle(
        startButton.x,
        startButton.y,
        startButton.width + 20,
        startButton.height + 10,
        0x2a0a3e
      )
      .setOrigin(0.5)
      .setStrokeStyle(4, 0x39ff14)
      .setDepth(-1);

    startButton.on('pointerover', () => {
      buttonBg.setStrokeStyle(4, 0xff6600);
      startButton.setColor('#ff6600');
    });

    startButton.on('pointerout', () => {
      buttonBg.setStrokeStyle(4, 0x39ff14);
      startButton.setColor('#39ff14');
    });

    startButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    this.add
      .text(width / 2, height / 2 + 120, '使用 WASD 键移动', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#39ff14'
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 150, '找到出口并收集宝箱', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#39ff14'
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: startButton,
      scale: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }
}
