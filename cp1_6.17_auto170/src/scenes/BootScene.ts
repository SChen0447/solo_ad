import Phaser from 'phaser';
import { updateLoadingUI, hideLoadingUI } from '../main';

export default class BootScene extends Phaser.Scene {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private progress: number = 0;

  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.createBallTexture();
    this.createTerrainTexture();
    this.createBackgroundTexture();
    this.createStarTexture();
    this.createSpikeTexture();
    this.createAudioAssets();

    this.load.on('progress', (value: number) => {
      this.progress = value;
      updateLoadingUI(value);
    });

    this.load.on('complete', () => {
      updateLoadingUI(1);
    });
  }

  create(): void {
    this.graphics = this.add.graphics();
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.anims.create({
      key: 'star_rotate',
      frames: this.anims.generateFrameNumbers('star', { start: 0, end: 11 }),
      frameRate: 12,
      repeat: -1
    });

    this.time.delayedCall(500, () => {
      hideLoadingUI();
      this.scene.start('MenuScene');
    });
  }

  update(): void {
    if (this.graphics) {
      this.graphics.clear();
      const centerX = this.cameras.main.width / 2;
      const centerY = this.cameras.main.height / 2;

      this.graphics.fillStyle(0x1a1a2e, 1);
      this.graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

      this.graphics.lineStyle(2, 0xe94560, 0.5);
      this.graphics.strokeCircle(centerX, centerY, 60);

      this.graphics.lineStyle(3, 0xe94560, 1);
      this.graphics.beginPath();
      this.graphics.arc(centerX, centerY, 60, -Math.PI / 2, -Math.PI / 2 + this.progress * Math.PI * 2);
      this.graphics.strokePath();
    }
  }

  private createBallTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xe94560, 1);
    g.fillCircle(15, 15, 15);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(10, 10, 5);
    g.generateTexture('ball', 30, 30);
    g.destroy();
  }

  private createTerrainTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xe94560, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture('terrain', 8, 8);
    g.destroy();
  }

  private createBackgroundTexture(): void {
    const w = 1920;
    const h = 1080;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, 0, w, h);

    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(0, h);
      const r = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.7);
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(x, y, r);
    }

    g.generateTexture('background', w, h);
    g.destroy();
  }

  private createStarTexture(): void {
    const frames: Phaser.Types.Textures.SpriteSheetFrameConfig[] = [];
    const textureWidth = 720;
    const textureHeight = 60;

    const spriteSheet = this.textures.createCanvas('star', textureWidth, textureHeight);
    if (spriteSheet) {
      const ctx = spriteSheet.getContext();

      for (let i = 0; i < 12; i++) {
        const cx = i * 60 + 30;
        const cy = 30;
        const outerRadius = 28;
        const innerRadius = 12;
        const rotation = (i * Math.PI * 2) / 12;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation);

        ctx.beginPath();
        for (let j = 0; j < 10; j++) {
          const angle = (j * Math.PI) / 5 - Math.PI / 2;
          const radius = j % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, outerRadius);
        gradient.addColorStop(0, '#ffef88');
        gradient.addColorStop(0.5, '#ffd700');
        gradient.addColorStop(1, '#ffa500');

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.stroke();

        const pulseAlpha = 0.3 + Math.sin((i / 12) * Math.PI * 2) * 0.3;
        ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, outerRadius + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        frames.push({ frame: { x: i * 60, y: 0, w: 60, h: 60 } });
      }

      spriteSheet.add('__BASE', 0, 0, 0, textureWidth, textureHeight);
      spriteSheet.refresh();
    }
  }

  private createSpikeTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0066ff, 1);
    g.fillTriangle(0, 20, 10, 0, 20, 20);
    g.lineStyle(2, 0x00aaff, 1);
    g.strokeTriangle(0, 20, 10, 0, 20, 20);
    g.generateTexture('spike', 20, 20);
    g.destroy();
  }

  private createAudioAssets(): void {
    try {
      this.cache.audio.add('win_sfx', new AudioBuffer({ length: 1, sampleRate: 44100 }));
    } catch {
      console.log('[BootScene] Audio placeholder set up');
    }
  }
}
