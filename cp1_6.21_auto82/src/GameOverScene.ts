import Phaser from 'phaser';
import { LevelGenerator } from './LevelGenerator';
import type { ScoreResult } from './types';

export class GameOverScene extends Phaser.Scene {
  private result!: ScoreResult;
  private timeT: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: {
    score: number;
    accuracy: number;
    totalNotes: number;
    hitNotes: number;
    perfectHits: number;
  }): void {
    const grade = LevelGenerator.getGrade(data.accuracy);
    this.result = {
      score: data.score,
      accuracy: data.accuracy,
      totalNotes: data.totalNotes,
      hitNotes: data.hitNotes,
      perfectHits: data.perfectHits,
      grade
    };
  }

  create(): void {
    const { width, height } = this.scale;

    this.createDimBackground(width, height);
    this.createGlassPanel(width, height);
    this.createTitle(width, height);
    this.createGradeDisplay(width, height);
    this.createScoreDisplay(width, height);
    this.createAccuracyDisplay(width, height);
    this.createStats(width, height);
    this.createButtons(width, height);
    this.createFireworks(width, height);
    this.animateIn();
  }

  private createDimBackground(width: number, height: number): void {
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(0, 0, width, height);

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 2);
      this.add.circle(x, y, size, 0xffffff, 0.3);
    }
  }

  private createGlassPanel(width: number, height: number): void {
    const panelW = 560;
    const panelH = 620;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;

    const gradientSteps = 40;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.floor(Phaser.Math.Linear(40, 20, t));
      const g = Math.floor(Phaser.Math.Linear(30, 15, t));
      const b = Math.floor(Phaser.Math.Linear(80, 50, t));
      const alpha = Phaser.Math.Linear(0.75, 0.55, t);
      const color = Phaser.Display.Color.GetColor(r, g, b);
      const stepH = panelH / gradientSteps;

      const blurLayer = this.add.graphics();
      blurLayer.fillStyle(color, alpha);
      blurLayer.fillRoundedRect(panelX, panelY + i * stepH, panelW, stepH + 1, i === 0 ? 20 : 0);

      if (i === gradientSteps - 1) {
        blurLayer.fillRoundedRect(panelX, panelY + panelH - 20, panelW, 20, {
          tl: 0,
          tr: 0,
          bl: 20,
          br: 20
        });
      }
    }

    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.2);
    border.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);

    const highlight = this.add.graphics();
    highlight.lineStyle(1, 0xffffff, 0.4);
    highlight.beginPath();
    highlight.moveTo(panelX + 20, panelY + 2);
    highlight.lineTo(panelX + panelW - 20, panelY + 2);
    highlight.strokePath();
  }

  private createTitle(width: number, height: number): void {
    this.add.text(width / 2, height / 2 - 260, '游戏结束', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0);
  }

  private createGradeDisplay(width: number, height: number): void {
    const gradeColor = LevelGenerator.getGradeColor(this.result.grade);
    const gradeY = height / 2 - 170;

    const glow = this.add.circle(width / 2, gradeY, 70, gradeColor, 0.3);

    const gradeBg = this.add.circle(width / 2, gradeY, 55, 0x000000, 0.6);
    gradeBg.setStrokeStyle(4, gradeColor, 1);

    this.add.text(width / 2, gradeY, this.result.grade, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '64px',
      fontStyle: 'bold',
      color: Phaser.Display.Color.IntegerToColor(gradeColor).rgba,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: glow,
      scale: 1.3,
      alpha: 0.15,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createScoreDisplay(width: number, height: number): void {
    const scoreY = height / 2 - 50;

    const label = this.add.text(width / 2, scoreY - 40, '总分', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    const scoreText = this.add.text(width / 2, scoreY, '0', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.addCounter({
      from: 0,
      to: this.result.score,
      duration: 500,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        scoreText.setText(Math.floor(tween.getValue()).toString());
      }
    });

    const maxScore = LevelGenerator.getMaxScore(this.result.totalNotes);
    this.add.text(width / 2, scoreY + 50, `/ ${maxScore} 满分`, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '20px',
      color: '#888888'
    }).setOrigin(0.5);
  }

  private createAccuracyDisplay(width: number, height: number): void {
    const accY = height / 2 + 100;
    const ringRadius = 45;
    const ringColor = LevelGenerator.getGradeColor(this.result.grade);

    const label = this.add.text(width / 2, accY - 70, '准确率', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '18px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    const bgRing = this.add.graphics();
    bgRing.lineStyle(8, 0x333355, 0.8);
    bgRing.beginPath();
    bgRing.arc(width / 2, accY, ringRadius, 0, Math.PI * 2);
    bgRing.strokePath();

    const progressRing = this.add.graphics();
    this.tweens.addCounter({
      from: 0,
      to: this.result.accuracy,
      duration: 700,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        progressRing.clear();
        progressRing.lineStyle(8, ringColor, 1);
        progressRing.beginPath();
        progressRing.arc(
          width / 2, accY, ringRadius,
          -Math.PI / 2,
          -Math.PI / 2 + tween.getValue() * Math.PI * 2
        );
        progressRing.strokePath();
      }
    });

    const accText = this.add.text(width / 2, accY, '0%', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.addCounter({
      from: 0,
      to: this.result.accuracy * 100,
      duration: 700,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        accText.setText(`${Math.floor(tween.getValue())}%`);
      }
    });
  }

  private createStats(width: number, height: number): void {
    const statsY = height / 2 + 200;
    const spacing = 120;

    const stats = [
      { label: '命中', value: `${this.result.hitNotes}/${this.result.totalNotes}` },
      { label: '完美', value: this.result.perfectHits.toString() },
      {
        label: '错过',
        value: (this.result.totalNotes - this.result.hitNotes).toString()
      }
    ];

    stats.forEach((stat, i) => {
      const x = width / 2 - spacing + i * spacing;

      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(x - 45, statsY - 25, 90, 50, 8);
      bg.lineStyle(1, 0xffffff, 0.15);
      bg.strokeRoundedRect(x - 45, statsY - 25, 90, 50, 8);

      this.add.text(x, statsY - 10, stat.label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);

      this.add.text(x, statsY + 10, stat.value, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);
    });
  }

  private createButtons(width: number, height: number): void {
    const btnY = height / 2 + 275;

    const retryBtn = this.createButton(
      width / 2 - 110, btnY, 180, 50,
      '重新挑战', 0x2ecc71, 0x27ae60
    );
    retryBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MenuScene');
      });
    });

    const menuBtn = this.createButton(
      width / 2 + 110, btnY, 180, 50,
      '返回主菜单', 0x3498db, 0x2980b9
    );
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('MenuScene');
      });
    });
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    text: string, color: number, hoverColor: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(2, 0xffffff, 0.3);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    container.add(bg);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    container.add(label);

    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      bg.lineStyle(2, 0xffffff, 0.5);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      bg.lineStyle(2, 0xffffff, 0.3);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    });

    return container;
  }

  private createFireworks(width: number, height: number): void {
    const gradeColor = LevelGenerator.getGradeColor(this.result.grade);

    this.time.delayedCall(400, () => {
      this.spawnFireworkBurst(width * 0.25, height * 0.3, gradeColor);
    });

    this.time.delayedCall(800, () => {
      this.spawnFireworkBurst(width * 0.75, height * 0.25, gradeColor);
    });

    this.time.delayedCall(1200, () => {
      this.spawnFireworkBurst(width * 0.5, height * 0.15, gradeColor);
    });

    this.time.delayedCall(1700, () => {
      this.spawnFireworkBurst(width * 0.35, height * 0.35, gradeColor);
      this.spawnFireworkBurst(width * 0.65, height * 0.35, gradeColor);
    });
  }

  private spawnFireworkBurst(x: number, y: number, baseColor: number): void {
    const colors = [baseColor, 0xffffff, 0xffff88];

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 100,
      onComplete: () => {
        for (let i = 0; i < 40; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const speed = Phaser.Math.FloatBetween(60, 180);
          const life = Phaser.Math.FloatBetween(800, 1800);
          const size = Phaser.Math.FloatBetween(2, 5);
          const color = Phaser.Utils.Array.GetRandom(colors);

          const particle = this.add.circle(x, y, size, color, 1);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          this.tweens.add({
            targets: particle,
            x: x + vx * 1.5,
            y: y + vy * 1.5 + 200,
            alpha: 0,
            scale: 0.3,
            duration: life,
            ease: 'Cubic.easeOut',
            onComplete: () => particle.destroy()
          });
        }
      }
    });
  }

  private animateIn(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    this.timeT += delta;
  }
}
