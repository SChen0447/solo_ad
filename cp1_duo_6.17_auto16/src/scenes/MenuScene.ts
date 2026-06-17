import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private lavaParticles!: Phaser.GameObjects.Particle;
  private startBtn!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private lavaEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.drawLavaBackground(width, height);
    this.createLavaParticles(width, height);
    this.createTitle(width, height);
    this.createStartButton(width, height);

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.startGame();
    });
  }

  private drawLavaBackground(w: number, h: number): void {
    const bg = this.add.graphics();

    const drawFrame = () => {
      bg.clear();
      bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x0d0505, 0x0d0505, 1);
      bg.fillRect(0, 0, w, h);

      const t = this.time.now / 1000;
      for (let i = 0; i < 6; i++) {
        const x = (w * (i + 0.5)) / 6 + Math.sin(t * 0.5 + i * 1.2) * 40;
        const y = h * 0.7 + Math.cos(t * 0.7 + i * 0.9) * 30;
        const r = 60 + Math.sin(t * 0.8 + i) * 20;
        bg.fillStyle(0xff4500, 0.08 + Math.sin(t + i) * 0.03);
        bg.fillCircle(x, y, r);
        bg.fillStyle(0xff6b35, 0.06 + Math.sin(t * 1.3 + i) * 0.02);
        bg.fillCircle(x + Math.sin(t + i) * 10, y - 10, r * 0.6);
      }
    };

    this.events.on('update', drawFrame);
  }

  private createLavaParticles(w: number, h: number): void {
    if (!this.textures.exists('lavaParticle')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xff6b35, 1);
      gfx.fillCircle(4, 4, 4);
      gfx.generateTexture('lavaParticle', 8, 8);
      gfx.destroy();
    }

    for (let i = 0; i < 3; i++) {
      const emitter = this.add.particles(w * (0.2 + i * 0.3), h * 0.85, 'lavaParticle', {
        speed: { min: 20, max: 60 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.8, end: 0 },
        lifespan: { min: 1500, max: 3000 },
        alpha: { start: 0.6, end: 0 },
        quantity: 2,
        blendMode: 'ADD',
        tint: [0xff6b35, 0xff4500, 0xff0000],
      });
      this.lavaEmitters.push(emitter);
    }
  }

  private createTitle(w: number, h: number): void {
    this.titleText = this.add.text(w / 2, h * 0.22, '熔岩快跑', {
      fontSize: '56px',
      fontFamily: 'Arial, sans-serif',
      color: '#FFD700',
      stroke: '#FF4500',
      strokeThickness: 6,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000',
        blur: 8,
        fill: true,
      },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createStartButton(w: number, h: number): void {
    const btnWidth = 220;
    const btnHeight = 60;
    const btnY = h * 0.55;

    const btnBg = this.add.graphics();
    this.drawButtonBg(btnBg, btnWidth, btnHeight, false);

    const btnText = this.add.text(0, 0, '开始奔跑', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#8B4513',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.startBtn = this.add.container(w / 2, btnY, [btnBg, btnText]);

    this.startBtn.setSize(btnWidth, btnHeight);
    this.startBtn.setInteractive({ useHandCursor: true });

    this.startBtn.on('pointerover', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 150,
        ease: 'Back.easeOut',
      });
      this.drawButtonBg(btnBg, btnWidth, btnHeight, true);
    });

    this.startBtn.on('pointerout', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
      this.drawButtonBg(btnBg, btnWidth, btnHeight, false);
    });

    this.startBtn.on('pointerdown', () => {
      this.startGame();
    });

    const hint = this.add.text(w / 2, h * 0.72, '空格键 / 点击屏幕跳跃  |  按住蓄力跳更高', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aa8866',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  private drawButtonBg(gfx: Phaser.GameObjects.Graphics, w: number, h: number, glow: boolean): void {
    gfx.clear();
    const hw = w / 2;
    const hh = h / 2;

    if (glow) {
      gfx.fillStyle(0xff8c00, 0.3);
      gfx.fillRoundedRect(-hw - 4, -hh - 4, w + 8, h + 8, 14);
    }

    gfx.fillGradientStyle(0xe67e22, 0xf39c12, 0xe67e22, 0xf39c12, 1);
    gfx.fillRoundedRect(-hw, -hh, w, h, 10);

    if (glow) {
      gfx.lineStyle(2, 0xffd700, 0.9);
    } else {
      gfx.lineStyle(1, 0xffd700, 0.4);
    }
    gfx.strokeRoundedRect(-hw, -hh, w, h, 10);
  }

  private startGame(): void {
    this.tweens.killAll();
    this.lavaEmitters.forEach((e) => e.stop());
    this.scene.start('GameScene');
  }
}
