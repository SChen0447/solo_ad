import Phaser from 'phaser';

export interface UIState {
  stamina: number;
  maxStamina: number;
  health: number;
  maxHealth: number;
  score: number;
  bulletTimeActive: boolean;
  bulletTimeRemaining: number;
  bulletTimeMaxDuration: number;
  isGameOver: boolean;
}

export class UIManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private currentScore: number = 0;
  private targetScore: number = 0;
  private scoreTween: Phaser.Tweens.Tween | null = null;

  private bulletTimeMask: Phaser.GameObjects.Graphics | null = null;
  private bulletTimeParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bulletTimeNoiseTexture: Phaser.Textures.CanvasTexture | null = null;
  private bulletTimeNoiseSprite: Phaser.GameObjects.Sprite | null = null;
  private bulletTimeActive: boolean = false;
  private bulletTimeTimer: Phaser.GameObjects.Graphics | null = null;
  private bulletTimeRemainingText: Phaser.GameObjects.Text | null = null;

  private gameOverPanel: Phaser.GameObjects.Container | null = null;
  private gameOverText: Phaser.GameObjects.Text | null = null;
  private finalScoreText: Phaser.GameObjects.Text | null = null;
  private restartText: Phaser.GameObjects.Text | null = null;
  private breathTween: Phaser.Tweens.Tween | null = null;

  private staminaArc: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(100);
    this.staminaArc = scene.add.graphics().setDepth(101);
    this.healthBar = scene.add.graphics().setDepth(101);

    this.scoreText = scene.add.text(
      scene.scale.width - 30,
      25,
      '0',
      {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }
    )
      .setOrigin(1, 0.5)
      .setDepth(102)
      .setShadow(2, 2, 'rgba(0,0,0,0.8)', 4, false, true);

    this.createBulletTimeNoiseTexture();
  }

  private createBulletTimeNoiseTexture(): void {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const val = Math.floor(Math.random() * 255);
        imgData.data[idx] = val;
        imgData.data[idx + 1] = val;
        imgData.data[idx + 2] = val;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const textureKey = 'bt_noise';
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }
    this.bulletTimeNoiseTexture = this.scene.textures.addCanvas(textureKey, canvas);
  }

  public update(state: UIState, time: number, delta: number): void {
    this.currentScore = state.score;
    this.graphics.clear();
    this.staminaArc.clear();
    this.healthBar.clear();

    this.drawStaminaArc(state.stamina, state.maxStamina);
    this.drawHealthBar(state.health, state.maxHealth);
    this.updateScore();

    if (state.bulletTimeActive) {
      this.updateBulletTimeEffects(state.bulletTimeRemaining, state.bulletTimeMaxDuration, time);
    } else if (this.bulletTimeActive) {
      this.hideBulletTimeEffects();
    }

    if (state.isGameOver && !this.gameOverPanel) {
      this.showGameOver(state.score);
    }
  }

  private getStaminaColor(stamina: number, maxStamina: number): number {
    const pct = (stamina / maxStamina) * 100;
    if (pct >= 80) return 0x00e676;
    if (pct >= 50) return 0xffea00;
    if (pct >= 20) return 0xff9100;
    return 0xff1744;
  }

  private getStaminaColorHex(stamina: number, maxStamina: number): string {
    const pct = (stamina / maxStamina) * 100;
    if (pct >= 80) return '#00E676';
    if (pct >= 50) return '#FFEA00';
    if (pct >= 20) return '#FF9100';
    return '#FF1744';
  }

  private drawStaminaArc(stamina: number, maxStamina: number): void {
    const cx = 80;
    const cy = 90;
    const outerRadius = 55;
    const innerRadius = 40;
    const startAngle = Phaser.Math.DegToRad(-225);
    const endAngle = Phaser.Math.DegToRad(45);
    const totalAngle = endAngle - startAngle;
    const staminaAngle = startAngle + totalAngle * (stamina / maxStamina);
    const color = this.getStaminaColor(stamina, maxStamina);

    this.staminaArc.lineStyle(8, color, 0.25);
    this.staminaArc.beginPath();
    this.staminaArc.arc(cx, cy, (outerRadius + innerRadius) / 2, startAngle, endAngle, false);
    this.staminaArc.strokePath();

    this.staminaArc.lineStyle(8, color, 0.9);
    this.staminaArc.beginPath();
    this.staminaArc.arc(cx, cy, (outerRadius + innerRadius) / 2, startAngle, staminaAngle, false);
    this.staminaArc.strokePath();

    this.staminaArc.fillStyle(color, 0.35);
    this.staminaArc.slice(cx, cy, outerRadius - 4, startAngle, staminaAngle, false);
    this.staminaArc.slice(cx, cy, innerRadius + 4, staminaAngle, startAngle, true);
    this.staminaArc.fillPath();

    const labelColor = this.getStaminaColorHex(stamina, maxStamina);
    const staminaLabel = this.scene.children.getChildren().find(
      c => (c as Phaser.GameObjects.Text).text && (c as Phaser.GameObjects.Text).text.startsWith('STAMINA')
    ) as Phaser.GameObjects.Text | undefined;

    if (!staminaLabel) {
      this.scene.add.text(cx, cy - 45, 'STAMINA', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: labelColor,
        fontStyle: 'bold',
        letterSpacing: 2
      }).setOrigin(0.5).setDepth(103);
    } else {
      staminaLabel.setColor(labelColor);
    }

    const staminaValue = this.scene.children.getChildren().find(
      c => (c as Phaser.GameObjects.Text).text && /^\d+$/.test((c as Phaser.GameObjects.Text).text) &&
        Math.abs((c as Phaser.GameObjects.Text).y - cy) < 10 &&
        Math.abs((c as Phaser.GameObjects.Text).x - cx) < 10
    ) as Phaser.GameObjects.Text | undefined;

    const textVal = Math.floor(stamina).toString();
    if (!staminaValue) {
      this.scene.add.text(cx, cy, textVal, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '20px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(103).setShadow(1, 1, 'rgba(0,0,0,0.8)', 2);
    } else {
      staminaValue.setText(textVal);
    }
  }

  private drawHealthBar(health: number, maxHealth: number): void {
    const x = 30;
    const y = 155;
    const width = 180;
    const height = 18;
    const pct = Math.max(0, health / maxHealth);

    this.healthBar.fillStyle(0x000000, 0.6);
    this.healthBar.fillRoundedRect(x - 2, y - 2, width + 4, height + 4, 4);

    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRoundedRect(x, y, width, height, 3);

    const healthColor = pct > 0.5 ? 0x00e676 : pct > 0.25 ? 0xffea00 : 0xff1744;
    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRoundedRect(x, y, width * pct, height, 3);

    this.healthBar.lineStyle(2, 0x4a90d9, 0.6);
    this.healthBar.strokeRoundedRect(x, y, width, height, 3);

    const healthLabel = this.scene.children.getChildren().find(
      c => (c as Phaser.GameObjects.Text).text && (c as Phaser.GameObjects.Text).text.startsWith('HP')
    ) as Phaser.GameObjects.Text | undefined;

    if (!healthLabel) {
      this.scene.add.text(x, y - 20, 'HP ' + Math.floor(health) + '/' + maxHealth, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(103);
    } else {
      healthLabel.setText('HP ' + Math.floor(health) + '/' + maxHealth);
    }
  }

  public flashScore(points: number): void {
    if (this.scoreTween) {
      this.scoreTween.stop();
    }
    this.scoreText.setScale(1.1);
    this.scoreTween = this.scene.tweens.add({
      targets: this.scoreText,
      scale: 1.0,
      duration: 150,
      ease: 'Back.In'
    });
  }

  private updateScore(): void {
    this.scoreText.setText(this.currentScore.toLocaleString());
  }

  public showBulletTimeEffects(): void {
    if (this.bulletTimeActive) return;
    this.bulletTimeActive = true;

    const { width, height } = this.scene.scale;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(width, height) * 0.8;

    this.bulletTimeMask = this.scene.add.graphics().setDepth(200);

    if (this.bulletTimeNoiseTexture) {
      this.bulletTimeNoiseSprite = this.scene.add.sprite(cx, cy, 'bt_noise')
        .setDisplaySize(width, height)
        .setDepth(201)
        .setAlpha(0.12);
      this.bulletTimeNoiseSprite.setBlendMode(Phaser.BlendModes.ADD);
    }

    this.bulletTimeParticles = this.scene.add.particles(0, 0, '__DEFAULT', {
      lifespan: 500,
      speed: { min: 80, max: 150 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: 2,
      frequency: 30,
      blendMode: 'ADD',
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Rectangle(0, 0, width, height),
        quantity: 40,
        seamless: true
      },
      tint: [0x4a90d9, 0x7c4dff, 0xffffff]
    }).setDepth(202);

    this.bulletTimeTimer = this.scene.add.graphics().setDepth(210);
    this.bulletTimeRemainingText = this.scene.add.text(
      cx, 50, '', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '18px',
        color: '#4A90D9',
        fontStyle: 'bold',
        letterSpacing: 3
      }
    ).setOrigin(0.5).setDepth(211);

    this.drawBulletTimeVignette(cx, cy, radius, 1);
  }

  private drawBulletTimeVignette(cx: number, cy: number, radius: number, alpha: number): void {
    if (!this.bulletTimeMask) return;
    this.bulletTimeMask.clear();

    for (let i = 0; i < 12; i++) {
      const r = radius * (1 - i / 12);
      const a = alpha * (i / 12) * 0.45;
      this.bulletTimeMask.fillStyle(0x4a90d9, a);
      this.bulletTimeMask.fillCircle(cx, cy, r);
    }

    this.bulletTimeMask.fillCircle(cx, cy, radius * 0.35);
    this.bulletTimeMask.setBlendMode(Phaser.BlendModes.ERASE);

    for (let i = 0; i < 10; i++) {
      const r = radius * 0.35 * (1 - i / 10);
      const a = 1 - i / 10;
      this.bulletTimeMask.fillStyle(0xffffff, a);
      this.bulletTimeMask.fillCircle(cx, cy, r);
    }

    this.bulletTimeMask.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private updateBulletTimeEffects(remaining: number, maxDuration: number, time: number): void {
    if (this.bulletTimeNoiseSprite) {
      this.bulletTimeNoiseSprite.rotation = time * 0.00005;
      this.bulletTimeNoiseSprite.alpha = 0.1 + Math.sin(time * 0.003) * 0.04;
    }

    if (this.bulletTimeTimer && this.bulletTimeRemainingText) {
      const pct = remaining / maxDuration;
      const cx = this.scene.scale.width / 2;
      this.bulletTimeTimer.clear();
      this.bulletTimeTimer.lineStyle(6, 0x4a90d9, 0.3);
      this.bulletTimeTimer.beginPath();
      this.bulletTimeTimer.arc(cx, 52, 32, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(270), false);
      this.bulletTimeTimer.strokePath();

      this.bulletTimeTimer.lineStyle(6, 0x7c4dff, 1);
      this.bulletTimeTimer.beginPath();
      this.bulletTimeTimer.arc(cx, 52, 32,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * pct),
        false);
      this.bulletTimeTimer.strokePath();

      this.bulletTimeRemainingText.setText(`子弹时间 ${remaining.toFixed(1)}s`);
    }
  }

  public hideBulletTimeEffects(): void {
    this.bulletTimeActive = false;
    if (this.bulletTimeMask) {
      this.bulletTimeMask.destroy();
      this.bulletTimeMask = null;
    }
    if (this.bulletTimeNoiseSprite) {
      this.bulletTimeNoiseSprite.destroy();
      this.bulletTimeNoiseSprite = null;
    }
    if (this.bulletTimeParticles) {
      this.bulletTimeParticles.destroy();
      this.bulletTimeParticles = null;
    }
    if (this.bulletTimeTimer) {
      this.bulletTimeTimer.destroy();
      this.bulletTimeTimer = null;
    }
    if (this.bulletTimeRemainingText) {
      this.bulletTimeRemainingText.destroy();
      this.bulletTimeRemainingText = null;
    }
  }

  public showGameOver(finalScore: number): void {
    const { width, height } = this.scene.scale;

    this.gameOverPanel = this.scene.add.container(0, 0).setDepth(500);

    const bg = this.scene.add.rectangle(width / 2, height + height / 2, width, height, 0x0f0f1a, 0.85)
      .setOrigin(0.5);
    this.gameOverPanel.add(bg);

    this.scene.tweens.add({
      targets: bg,
      y: height / 2,
      duration: 800,
      ease: 'Cubic.Out'
    });

    this.gameOverText = this.scene.add.text(width / 2, height / 2 - 80, '游戏结束', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#FF1744',
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);
    this.gameOverPanel.add(this.gameOverText);

    this.scene.tweens.add({
      targets: this.gameOverText,
      alpha: 1,
      duration: 1000,
      delay: 600,
      ease: 'Cubic.Out'
    });

    this.finalScoreText = this.scene.add.text(width / 2, height / 2 - 10,
      `最终得分：${finalScore.toLocaleString()}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#7C4DFF',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
    this.gameOverPanel.add(this.finalScoreText);

    this.scene.tweens.add({
      targets: this.finalScoreText,
      alpha: 1,
      duration: 800,
      delay: 1400,
      ease: 'Cubic.Out'
    });

    this.restartText = this.scene.add.text(width / 2, height / 2 + 50,
      '按 R 重新开始', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#4A90D9',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
    this.gameOverPanel.add(this.restartText);

    this.scene.tweens.add({
      targets: this.restartText,
      alpha: 1,
      duration: 800,
      delay: 1900,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.startBreathAnimation();
      }
    });
  }

  private startBreathAnimation(): void {
    if (!this.restartText) return;
    this.breathTween = this.scene.tweens.add({
      targets: this.restartText,
      alpha: { from: 1, to: 0.4 },
      scale: { from: 1, to: 1.05 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  public hideGameOver(): void {
    if (this.breathTween) {
      this.breathTween.stop();
      this.breathTween = null;
    }
    if (this.gameOverPanel) {
      this.gameOverPanel.destroy();
      this.gameOverPanel = null;
    }
    this.gameOverText = null;
    this.finalScoreText = null;
    this.restartText = null;
  }

  public destroy(): void {
    this.hideBulletTimeEffects();
    this.hideGameOver();
  }
}
