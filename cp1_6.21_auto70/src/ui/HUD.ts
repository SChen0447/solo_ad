import Phaser from 'phaser';

export interface HUDData {
  score: number;
  displayScore: number;
  timeRemaining: number;
  totalTime: number;
  lives: number;
  maxLives: number;
  energy: number;
  maxEnergy: number;
  comboCount: number;
  multiplier: number;
  beamState: 'idle' | 'active' | 'depleted';
}

export class HUD {
  public scene: Phaser.Scene;

  private container!: Phaser.GameObjects.Container;
  private scoreBg!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreNumberText!: Phaser.GameObjects.Text;
  private prevScore = 0;

  private timeBg!: Phaser.GameObjects.Graphics;
  private timeRing!: Phaser.GameObjects.Graphics;
  private timeText!: Phaser.GameObjects.Text;
  private timeLabel!: Phaser.GameObjects.Text;

  private livesContainer!: Phaser.GameObjects.Container;
  private lifeIcons: Phaser.GameObjects.Graphics[] = [];

  private energyBg!: Phaser.GameObjects.Graphics;
  private energyBar!: Phaser.GameObjects.Graphics;
  private energyLabel!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private energyWarning = false;

  private comboText!: Phaser.GameObjects.Text;
  private comboContainer!: Phaser.GameObjects.Container;

  private notificationText!: Phaser.GameObjects.Text;
  private notificationActive = false;

  private topLayer!: Phaser.GameObjects.Layer;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(50);

    this.topLayer = this.scene.add.layer();
    this.topLayer.add(this.container);

    this.createScoreDisplay(width, height);
    this.createTimeDisplay(width, height);
    this.createLivesDisplay(width, height);
    this.createEnergyDisplay(width, height);
    this.createComboDisplay(width, height);
    this.createNotificationDisplay(width, height);
  }

  private createScoreDisplay(width: number, height: number): void {
    const padding = 24;

    this.scoreBg = this.scene.add.graphics();
    this.scoreBg.fillStyle(0x0a1929, 0.75);
    this.scoreBg.lineStyle(2, 0x4fc3f7, 0.8);
    this.scoreBg.strokeRoundedRect(padding, padding, 260, 90, 10);
    this.scoreBg.fillRoundedRect(padding, padding, 260, 90, 10);

    this.scoreText = this.scene.add.text(padding + 20, padding + 14, '得分', {
      fontSize: '16px',
      fontFamily: 'Courier New, monospace',
      color: '#81d4fa',
      letterSpacing: 4,
    });

    this.scoreNumberText = this.scene.add.text(padding + 20, padding + 42, '0', {
      fontSize: '38px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#01579b',
      strokeThickness: 3,
    });

    this.container.add([this.scoreBg, this.scoreText, this.scoreNumberText]);
  }

  private createTimeDisplay(width: number, height: number): void {
    const padding = 24;
    const cx = width - padding - 55;
    const cy = padding + 55;

    this.timeBg = this.scene.add.graphics();
    this.timeBg.fillStyle(0x0a1929, 0.75);
    this.timeBg.lineStyle(2, 0x4fc3f7, 0.8);
    this.timeBg.strokeCircle(cx, cy, 52);
    this.timeBg.fillCircle(cx, cy, 52);

    this.timeRing = this.scene.add.graphics();

    this.timeLabel = this.scene.add.text(cx, cy - 30, '剩余时间', {
      fontSize: '11px',
      fontFamily: 'Courier New, monospace',
      color: '#81d4fa',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.timeText = this.scene.add.text(cx, cy, '90', {
      fontSize: '32px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container.add([this.timeBg, this.timeRing, this.timeLabel, this.timeText]);
  }

  private createLivesDisplay(width: number, height: number): void {
    const padding = 24;
    const startX = padding + 20;
    const y = padding + 135;

    this.livesContainer = this.scene.add.container(startX, y);

    const label = this.scene.add.text(0, -8, '生命', {
      fontSize: '14px',
      fontFamily: 'Courier New, monospace',
      color: '#81d4fa',
      letterSpacing: 3,
    });

    this.livesContainer.add(label);

    for (let i = 0; i < 5; i++) {
      const diamond = this.createDiamond(30 + i * 36, 18, true);
      this.lifeIcons.push(diamond);
      this.livesContainer.add(diamond);
    }

    this.container.add(this.livesContainer);
  }

  private createDiamond(x: number, y: number, filled: boolean): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const size = 14;
    const points = [
      new Phaser.Geom.Point(x, y - size),
      new Phaser.Geom.Point(x + size, y),
      new Phaser.Geom.Point(x, y + size),
      new Phaser.Geom.Point(x - size, y),
    ];

    if (filled) {
      g.fillStyle(0x29b6f6, 1);
      g.fillPoints(points, true);
      g.lineStyle(2, 0x81d4fa, 1);
      g.strokePoints(points, true);
      g.fillStyle(0xffffff, 0.6);
      g.fillTriangle(x - 3, y - 6, x + 3, y - 6, x, y - size + 2);
    } else {
      g.fillStyle(0x37474f, 0.5);
      g.fillPoints(points, true);
      g.lineStyle(1.5, 0x546e7a, 0.7);
      g.strokePoints(points, true);
    }

    return g;
  }

  private createEnergyDisplay(width: number, height: number): void {
    const barWidth = width * 0.45;
    const barHeight = 24;
    const x = (width - barWidth) / 2;
    const y = height - 55;

    this.energyBg = this.scene.add.graphics();
    this.energyBg.fillStyle(0x0a1929, 0.8);
    this.energyBg.lineStyle(2, 0x5c6bc0, 0.9);
    this.energyBg.strokeRoundedRect(x, y, barWidth, barHeight, 8);
    this.energyBg.fillRoundedRect(x, y, barWidth, barHeight, 8);

    this.energyBar = this.scene.add.graphics();

    this.energyLabel = this.scene.add.text(width / 2, y - 18, '牵引能量', {
      fontSize: '13px',
      fontFamily: 'Courier New, monospace',
      color: '#b39ddb',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.energyText = this.scene.add.text(width / 2, y + barHeight / 2, '100%', {
      fontSize: '14px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.container.add([this.energyBg, this.energyBar, this.energyLabel, this.energyText]);
  }

  private createComboDisplay(width: number, height: number): void {
    this.comboContainer = this.scene.add.container(width / 2, 150);

    this.comboText = this.scene.add.text(0, 0, '', {
      fontSize: '24px',
      fontFamily: 'Courier New, monospace',
      color: '#ffd54f',
      fontStyle: 'bold',
      stroke: '#e65100',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.comboContainer.add(this.comboText);
    this.comboContainer.setVisible(false);
    this.comboContainer.setAlpha(0);

    this.container.add(this.comboContainer);
  }

  private createNotificationDisplay(width: number, height: number): void {
    this.notificationText = this.scene.add.text(width / 2, height * 0.4, '', {
      fontSize: '32px',
      fontFamily: 'Courier New, monospace',
      color: '#69f0ae',
      fontStyle: 'bold',
      stroke: '#1b5e20',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#69f0ae', blur: 15, fill: true },
    }).setOrigin(0.5).setDepth(200);
  }

  public update(data: HUDData, delta: number): void {
    this.updateScore(data, delta);
    this.updateTime(data);
    this.updateLives(data);
    this.updateEnergy(data);
    this.updateCombo(data);
  }

  private updateScore(data: HUDData, delta: number): void {
    const displayStr = data.displayScore.toLocaleString();
    if (this.scoreNumberText.text !== displayStr) {
      this.scoreNumberText.setText(displayStr);

      if (data.displayScore > this.prevScore) {
        this.scene.tweens.add({
          targets: this.scoreNumberText,
          scaleX: { from: 1.25, to: 1 },
          scaleY: { from: 1.25, to: 1 },
          duration: 220,
          ease: 'Back.easeOut',
        });
      }
      this.prevScore = data.displayScore;
    }
  }

  private updateTime(data: HUDData): void {
    const cx = this.scene.cameras.main.width - 24 - 55;
    const cy = 24 + 55;
    const radius = 46;

    this.timeRing.clear();

    const pct = data.totalTime > 0 ? data.timeRemaining / data.totalTime : 0;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * pct);

    let color = 0x4fc3f7;
    if (pct < 0.3) color = 0xff5252;
    else if (pct < 0.5) color = 0xffeb3b;

    this.timeRing.lineStyle(5, color, 0.95);
    this.timeRing.beginPath();
    this.timeRing.arc(cx, cy, radius, startAngle, endAngle, false);
    this.timeRing.strokePath();

    this.timeRing.lineStyle(2, color, 0.3);
    this.timeRing.beginPath();
    this.timeRing.arc(cx, cy, radius - 7, startAngle, endAngle, false);
    this.timeRing.strokePath();

    const secs = Math.max(0, Math.ceil(data.timeRemaining));
    this.timeText.setText(`${secs}`);

    if (pct < 0.2 && pct > 0) {
      const pulse = 0.7 + Math.sin(Date.now() / 100) * 0.3;
      this.timeText.setColor(pct < 0.1 ? '#ff5252' : '#ffeb3b');
      this.timeText.setFontSize(32 + Math.sin(Date.now() / 80) * 2);
    } else {
      this.timeText.setColor('#ffffff');
      this.timeText.setFontSize(32);
    }
  }

  private updateLives(data: HUDData): void {
    for (let i = 0; i < this.lifeIcons.length; i++) {
      const icon = this.lifeIcons[i];
      const shouldBeAlive = i < data.lives;
      const g = icon as any;
      const isAlive = g._isAlive !== false;

      if (isAlive !== shouldBeAlive) {
        if (!shouldBeAlive) {
          this.scene.tweens.add({
            targets: icon,
            alpha: 0.25,
            scale: 0.7,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              icon.clear();
              const size = 14;
              const x = 30 + i * 36;
              const y = 18;
              const points = [
                new Phaser.Geom.Point(x, y - size),
                new Phaser.Geom.Point(x + size, y),
                new Phaser.Geom.Point(x, y + size),
                new Phaser.Geom.Point(x - size, y),
              ];
              icon.fillStyle(0x37474f, 0.5);
              icon.fillPoints(points, true);
              icon.lineStyle(1.5, 0x546e7a, 0.7);
              icon.strokePoints(points, true);
            },
          });
        }
        (g as any)._isAlive = shouldBeAlive;
      }
    }
  }

  private updateEnergy(data: HUDData): void {
    const width = this.scene.cameras.main.width;
    const barWidth = width * 0.45;
    const barHeight = 24;
    const x = (width - barWidth) / 2;
    const y = this.scene.cameras.main.height - 55;

    this.energyBar.clear();

    const pct = Math.max(0, Math.min(1, data.energy / data.maxEnergy));
    const fillWidth = (barWidth - 8) * pct;

    const depleted = data.beamState === 'depleted' || pct < 0.2;
    this.energyWarning = depleted;

    if (depleted) {
      const blink = Math.sin(Date.now() / 80) * 0.3 + 0.7;
      this.energyBar.fillStyle(0xff5252, blink);
      this.energyBar.fillRoundedRect(x + 4, y + 4, fillWidth, barHeight - 8, 5);
      this.energyText.setColor('#ff5252');
    } else {
      const stops: [number, number, number][] = [
        [0.0, 0x29b6f6, 1.0],
        [0.3, 0x42a5f5, 1.0],
        [0.6, 0x7e57c2, 1.0],
        [1.0, 0x9575cd, 1.0],
      ];
      this.energyBar.fillGradientStyle(0x29b6f6, 0x9575cd, 0x9575cd, 0x29b6f6, 1);
      this.energyBar.fillRoundedRect(x + 4, y + 4, fillWidth, barHeight - 8, 5);

      if (data.beamState === 'active') {
        this.energyBar.fillStyle(0xffffff, 0.3 + Math.sin(Date.now() / 60) * 0.2);
        this.energyBar.fillRoundedRect(x + 4, y + 4, fillWidth, 3, 3);
      }
      this.energyText.setColor('#ffffff');
    }

    this.energyText.setText(`${Math.floor(data.energy)}%`);
  }

  private updateCombo(data: HUDData): void {
    if (data.comboCount >= 5 && data.multiplier >= 1) {
      this.comboContainer.setVisible(true);

      let text = `连击 ${data.comboCount}`;
      if (data.multiplier >= 2) {
        text += `   x${data.multiplier}`;
      }

      if (this.comboText.text !== text) {
        this.comboText.setText(text);
        this.scene.tweens.add({
          targets: this.comboContainer,
          scaleX: { from: 1.4, to: 1 },
          scaleY: { from: 1.4, to: 1 },
          alpha: { from: 0, to: 1 },
          duration: 250,
          ease: 'Back.easeOut',
        });
      }

      let color = '#ffd54f';
      let stroke = '#e65100';
      if (data.multiplier >= 4) { color = '#ff5252'; stroke = '#b71c1c'; }
      else if (data.multiplier >= 3) { color = '#e040fb'; stroke = '#6a1b9a'; }
      else if (data.multiplier >= 2) { color = '#69f0ae'; stroke = '#1b5e20'; }

      this.comboText.setColor(color);
      this.comboText.setStroke(stroke, 3);
    } else {
      if (this.comboContainer.visible) {
        this.scene.tweens.add({
          targets: this.comboContainer,
          alpha: 0,
          scale: 0.8,
          duration: 300,
          onComplete: () => {
            this.comboContainer.setVisible(false);
            this.comboText.setText('');
          },
        });
      }
    }
  }

  public showNotification(message: string, color = '#69f0ae', strokeColor = '#1b5e20', duration = 1500): void {
    if (this.notificationActive) return;
    this.notificationActive = true;

    this.notificationText.setText(message);
    this.notificationText.setColor(color);
    this.notificationText.setStroke(strokeColor, 4);
    this.notificationText.setShadow(0, 0, color, 15, true, true);

    this.scene.tweens.add({
      targets: this.notificationText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1.1 },
      y: this.scene.cameras.main.height * 0.4,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.notificationText,
          scale: { from: 1.1, to: 1 },
          duration: 200,
          onComplete: () => {
            this.scene.time.delayedCall(duration - 550, () => {
              this.scene.tweens.add({
                targets: this.notificationText,
                alpha: 0,
                scale: 0.7,
                y: this.scene.cameras.main.height * 0.35,
                duration: 500,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                  this.notificationActive = false;
                  this.notificationText.setText('');
                  this.notificationText.setAlpha(1);
                },
              });
            });
          },
        });
      },
    });
  }

  public destroy(): void {
    this.container.destroy();
    this.notificationText.destroy();
  }

  public resize(width: number, height: number): void {}
}
