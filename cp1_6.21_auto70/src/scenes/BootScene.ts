import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.createStarBackground(width, height);

    const title = this.add.text(width / 2, height / 2 - 120, '太空垃圾回收', {
      fontSize: '56px',
      fontFamily: 'Courier New, monospace',
      color: '#4fc3f7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: { from: 0.8, to: 1.05 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const subtitle = this.add.text(width / 2, height / 2 - 60, 'SPACE DEBRIS RECYCLER', {
      fontSize: '20px',
      fontFamily: 'Courier New, monospace',
      color: '#81d4fa',
      letterSpacing: 6,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.5, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x1a237e, 0.8);
    this.progressBox.lineStyle(3, 0x4fc3f7, 1);
    this.progressBox.strokeRoundedRect(width / 2 - 200, height / 2 + 20, 400, 40, 8);
    this.progressBox.fillRoundedRect(width / 2 - 200, height / 2 + 20, 400, 40, 8);

    this.progressBar = this.add.graphics();

    this.loadingText = this.add.text(width / 2, height / 2 + 80, '正在初始化系统...', {
      fontSize: '18px',
      fontFamily: 'Courier New, monospace',
      color: '#b3e5fc',
    }).setOrigin(0.5);

    this.percentText = this.add.text(width / 2, height / 2 + 40, '0%', {
      fontSize: '20px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      const gradient = this.progressBar.createLinearGradient(
        width / 2 - 195, 0, width / 2 + 195, 0
      );
      gradient.addColorStop(0, 0x29b6f6);
      gradient.addColorStop(0.5, 0x42a5f5);
      gradient.addColorStop(1, 0x7e57c2);
      this.progressBar.fillGradientStyle(
        0x29b6f6, 0x7e57c2, 0x7e57c2, 0x29b6f6, 1
      );
      this.progressBar.fillRoundedRect(
        width / 2 - 195, height / 2 + 25, 390 * value, 30, 5
      );
      this.percentText.setText(`${Math.floor(value * 100)}%`);

      if (value > 0.3) this.loadingText.setText('加载物理引擎...');
      if (value > 0.6) this.loadingText.setText('校准牵引光束...');
      if (value > 0.9) this.loadingText.setText('准备启动...');
    });

    this.load.on('complete', () => {
      this.loadingText.setText('初始化完成！');
      this.percentText.setText('100%');
    });

    this.simulateLoading();
  }

  private createStarBackground(width: number, height: number): void {
    const starGraphics = this.add.graphics();
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      starGraphics.fillStyle(
        Math.random() > 0.7 ? 0xb3e5fc : 0xffffff,
        alpha
      );
      starGraphics.fillPoint(x, y, size);
    }
  }

  private simulateLoading(): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 0.08 + 0.02;
      if (progress >= 1) {
        progress = 1;
        clearInterval(interval);
        this.time.delayedCall(800, () => {
          this.scene.start('MenuScene');
        });
      }
      this.load.emit('progress', progress);
    }, 150);
  }

  create(): void {}
}
