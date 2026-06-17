import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private logoText!: Phaser.GameObjects.Text;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
      0x0a0a2a, 0x0a0a2a,
      0x1a1a3a, 0x1a1a3a
    );
    gradient.fillRect(0, 0, width, height);

    this.logoText = this.add.text(width / 2, height / 3, '🚀 太空站模拟经营', {
      fontSize: '48px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF'
    }).setOrigin(0.5);

    this.logoText.setAlpha(0);
    this.tweens.add({
      targets: this.logoText,
      alpha: 1,
      duration: 1000,
      ease: 'Power2.easeOut',
      y: height / 3 - 20
    });

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x2a2a4a, 0.8);
    this.progressBox.fillRect(width / 2 - 160, height / 2 + 50, 320, 30);
    this.progressBox.lineStyle(2, 0x00D4FF, 1);
    this.progressBox.strokeRect(width / 2 - 160, height / 2 + 50, 320, 30);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(width / 2, height / 2 + 20, '正在加载资源...', {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0.5);

    this.percentText = this.add.text(width / 2, height / 2 + 65, '0%', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillGradientStyle(
        0x00D4FF, 0x00D4FF,
        0x00FF9D, 0x00FF9D
      );
      this.progressBar.fillRect(width / 2 - 156, height / 2 + 54, 312 * value, 22);
      this.percentText.setText(Math.round(value * 100) + '%');
    });

    this.load.on('complete', () => {
      this.loadingText.setText('加载完成！');
      this.tweens.add({
        targets: [this.progressBox, this.progressBar, this.loadingText, this.percentText],
        alpha: 0,
        duration: 500,
        delay: 500,
        onComplete: () => {
          this.time.delayedCall(500, () => {
            this.scene.start('StationScene');
          });
        }
      });
    });

    this.loadFakeAssets();
  }

  private loadFakeAssets(): void {
    const graphics = this.make.graphics({ add: false });

    graphics.fillStyle(0x00D4FF);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('core_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0x00FF9D);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('life_support_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('power_core_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0xA855F7);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('lab_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0x00BFFF);
    graphics.fillRect(0, 0, 64, 128);
    graphics.generateTexture('habitat_module', 64, 128);

    graphics.clear();
    graphics.fillStyle(0x32CD32);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('greenhouse_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0xFF69B4);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('medical_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0xFFA500);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('solar_panel_module', 64, 64);

    graphics.clear();
    graphics.fillStyle(0x00CED1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('water_recycler_module', 64, 64);

    graphics.clear();
    graphics.fillCircle(32, 32, 32);
    graphics.generateTexture('avatar', 64, 64);

    for (let i = 0; i < 12; i++) {
      const hue = (i * 30) % 360;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 0.9);
      graphics.clear();
      graphics.fillStyle(color.color);
      graphics.fillCircle(32, 32, 32);
      graphics.generateTexture(`avatar_${i}`, 64, 64);
    }
  }

  create(): void {
    this.cameras.main.fadeIn(500, 10, 10, 42);
  }
}
