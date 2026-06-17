import Phaser from 'phaser';
import { monsterGenerator } from '../managers/MonsterGenerator';
import { forgeSystem } from '../managers/ForgeSystem';
import { gameState } from '../store/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a1a0a, 0x2a1a0a, 0x1a0a2a, 0x1a0a2a, 1);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    const titleText = this.add.text(cx, cy - 80, '地牢锻造师', {
      fontSize: '52px',
      fontFamily: 'serif',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5).setAlpha(0);

    const subtitleText = this.add.text(cx, cy - 20, '深入地牢 · 锻造传奇', {
      fontSize: '20px',
      fontFamily: 'serif',
      color: '#cc9944',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    const loadingText = this.add.text(cx, cy + 40, '正在加载资源...', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 1200,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: subtitleText,
      alpha: 1,
      duration: 1200,
      delay: 400,
      ease: 'Power2',
    });

    this.generateTextures();

    const loadPromises = [
      monsterGenerator.loadAffixes(),
      forgeSystem.loadRecipes(),
      gameState.refreshUnlocks(),
    ];

    Promise.all(loadPromises).then(() => {
      loadingText.setText('加载完成！');

      this.time.delayedCall(800, () => {
        const startBtn = this.add.rectangle(cx, cy + 120, 220, 56, 0x8b0000, 1)
          .setInteractive({ useHandCursor: true })
          .setStrokeStyle(2, 0xffd700);

        const startLabel = this.add.text(cx, cy + 120, '进入地牢', {
          fontSize: '22px',
          fontFamily: 'serif',
          color: '#ffd700',
        }).setOrigin(0.5);

        startBtn.on('pointerover', () => {
          startBtn.setFillStyle(0xaa2222);
          this.tweens.add({ targets: startBtn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
        });
        startBtn.on('pointerout', () => {
          startBtn.setFillStyle(0x8b0000);
          this.tweens.add({ targets: startBtn, scaleX: 1, scaleY: 1, duration: 100 });
        });
        startBtn.on('pointerdown', () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            this.scene.start('BattleScene');
          });
        });
      });
    });
  }

  private generateTextures() {
    this.createPixelCharacter('player_sprite', 0x4488cc);
    this.createPixelCharacter('monster_sprite', 0xcc4444);
    this.createParticleTexture('particle_dot', 4, 0xffffff);
    this.createParticleTexture('fire_particle', 6, 0xff6600);
    this.createParticleTexture('ice_particle', 5, 0x88ccff);
    this.createParticleTexture('forge_flame', 7, 0x00aaff);
    this.createParticleTexture('smoke_particle', 8, 0x555555);
    this.createSlashTexture('slash_effect');
    this.createMaterialIcon('material_icon', 24);
    this.createWeaponIcon('weapon_icon', 32);
    this.createTorchGlow('torch_glow', 64);
  }

  private createPixelCharacter(key: string, tint: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    const size = 48;
    const px = 4;

    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, size, size);

    g.fillStyle(tint, 1);
    g.fillRect(px * 5, px * 0, px * 2, px * 2);
    g.fillRect(px * 4, px * 2, px * 4, px * 2);
    g.fillRect(px * 3, px * 4, px * 6, px * 4);
    g.fillRect(px * 2, px * 4, px * 2, px * 3);
    g.fillRect(px * 8, px * 4, px * 2, px * 3);
    g.fillRect(px * 4, px * 8, px * 2, px * 3);
    g.fillRect(px * 6, px * 8, px * 2, px * 3);

    g.fillStyle(0xffffff, 0.8);
    g.fillRect(px * 5, px * 2, px * 1, px * 1);
    g.fillRect(px * 7, px * 2, px * 1, px * 1);

    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createParticleTexture(key: string, radius: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    const d = radius * 2;
    g.fillStyle(color, 0.8);
    g.fillCircle(radius, radius, radius);
    g.generateTexture(key, d, d);
    g.destroy();
  }

  private createSlashTexture(key: string) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(0, 40);
    g.lineTo(40, 0);
    g.moveTo(10, 50);
    g.lineTo(50, 10);
    g.moveTo(20, 55);
    g.lineTo(55, 20);
    g.strokePath();
    g.generateTexture(key, 60, 60);
    g.destroy();
  }

  private createMaterialIcon(key: string, size: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffd700, 0.8);
    g.fillRoundedRect(2, 2, size - 4, size - 4, 4);
    g.fillStyle(0x333333, 0.6);
    g.fillRoundedRect(4, 4, size - 8, size - 8, 3);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createWeaponIcon(key: string, size: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffd700, 1);
    g.fillRoundedRect(2, 2, size - 4, size - 4, 5);
    g.fillStyle(0x1a1a1a, 0.9);
    g.fillRoundedRect(5, 5, size - 10, size - 10, 4);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createTorchGlow(key: string, size: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff8800, 0.3);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(0xffaa44, 0.15);
    g.fillCircle(size / 2, size / 2, size / 3);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
