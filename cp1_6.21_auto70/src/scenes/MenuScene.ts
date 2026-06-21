import Phaser from 'phaser';

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  timestamp: number;
}

const ACHIEVEMENTS = [
  { icon: '🏆', name: '总冠军', desc: '排行榜第一' },
  { icon: '🥇', name: '金牌回收员', desc: '单局得分5000+' },
  { icon: '🎯', name: '神射手', desc: '连击达到x5' },
  { icon: '💎', name: '完美回收', desc: '连续回收30个垃圾' },
  { icon: '⚡', name: '能量大师', desc: '能量零溢出' },
  { icon: '🛡️', name: '钢铁之躯', desc: '无伤通关' },
  { icon: '🚀', name: '速度之星', desc: '30秒内完成' },
  { icon: '🌟', name: '新星', desc: '首次游戏' },
];

export class MenuScene extends Phaser.Scene {
  private nebulaParticles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private stars!: Phaser.GameObjects.Graphics;
  private leaderboardScroll!: Phaser.GameObjects.Container;
  private scrollPaused = false;
  private scrollOffset = 0;
  private leaderboardData: LeaderboardEntry[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.createNebulaBackground(width, height);
    this.createStarField(width, height);
    this.createTitle(width, height);
    this.createAchievementsGrid(width, height);
    this.createLeaderboard(width, height);
    this.createStartButton(width, height);
    this.loadLeaderboard();
    this.startScrollAnimation();
  }

  private createNebulaBackground(width: number, height: number): void {
    const nebulaColors = [0x1a237e, 0x4a148c, 0x0d47a1, 0x311b92, 0x006064];
    const numClouds = 8;

    for (let i = 0; i < numClouds; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const radius = 200 + Math.random() * 300;
      const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      const alpha = 0.05 + Math.random() * 0.12;

      const nebula = this.add.graphics();
      nebula.fillStyle(color, alpha);
      for (let r = radius; r > 0; r -= 10) {
        const rAlpha = alpha * (r / radius);
        nebula.fillStyle(color, rAlpha);
        nebula.fillCircle(
          x + Math.sin(r * 0.02 + i) * 20,
          y + Math.cos(r * 0.02 + i) * 20,
          r
        );
      }

      this.tweens.add({
        targets: nebula,
        x: { from: -50, to: 50 },
        y: { from: -30, to: 30 },
        duration: 8000 + i * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createStarField(width: number, height: number): void {
    this.stars = this.add.graphics();
    const starCount = 300;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      const twinkleDelay = Math.random() * 3000;

      this.stars.fillStyle(
        Math.random() > 0.85 ? 0x81d4fa : (Math.random() > 0.5 ? 0xe3f2fd : 0xffffff),
        alpha
      );
      this.stars.fillPoint(x, y, size);

      const starObj = { x, y, size, baseAlpha: alpha, twinkleDelay };
      this.time.addEvent({
        delay: 2000 + Math.random() * 2000,
        loop: true,
        startAt: twinkleDelay,
        callback: () => {
          this.stars.fillStyle(0xffffff, Math.random() * 0.6 + 0.4);
          this.stars.fillPoint(x, y, size);
        },
      });
    }
  }

  private createTitle(width: number, height: number): void {
    const titleGroup = this.add.container(width / 2, height * 0.18);

    const mainTitle = this.add.text(0, 0, '太空垃圾回收', {
      fontSize: '72px',
      fontFamily: 'Courier New, monospace',
      color: '#4fc3f7',
      fontStyle: 'bold',
      stroke: '#0288d1',
      strokeThickness: 4,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#4fc3f7',
        blur: 20,
        fill: true,
      },
    }).setOrigin(0.5);

    const glow = this.add.text(0, 0, '太空垃圾回收', {
      fontSize: '72px',
      fontFamily: 'Courier New, monospace',
      color: '#81d4fa',
      fontStyle: 'bold',
      alpha: 0.3,
    }).setOrigin(0.5);

    const subTitle = this.add.text(0, 70, 'SPACE DEBRIS RECYCLER', {
      fontSize: '28px',
      fontFamily: 'Courier New, monospace',
      color: '#b3e5fc',
      letterSpacing: 12,
    }).setOrigin(0.5);

    titleGroup.add([glow, mainTitle, subTitle]);

    this.tweens.add({
      targets: mainTitle,
      scale: { from: 0.95, to: 1.03 },
      y: { from: -5, to: 5 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: glow,
      scale: { from: 1, to: 1.1 },
      alpha: { from: 0.1, to: 0.4 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: subTitle,
      alpha: { from: 0.5, to: 1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });
  }

  private createAchievementsGrid(width: number, height: number): void {
    const gridY = height * 0.55;
    const startX = width / 2 - (ACHIEVEMENTS.length * 42) / 2;

    const achievementTitle = this.add.text(width / 2, gridY - 45, '成就列表', {
      fontSize: '20px',
      fontFamily: 'Courier New, monospace',
      color: '#90caf9',
      letterSpacing: 4,
    }).setOrigin(0.5);

    ACHIEVEMENTS.forEach((achievement, index) => {
      const x = startX + index * 42;
      const iconBg = this.add.graphics();
      iconBg.fillStyle(0x1a237e, 0.7);
      iconBg.lineStyle(2, 0x4fc3f7, 0.6);
      iconBg.strokeRoundedRect(x, gridY, 36, 36, 6);
      iconBg.fillRoundedRect(x, gridY, 36, 36, 6);

      const icon = this.add.text(x + 18, gridY + 18, achievement.icon, {
        fontSize: '22px',
      }).setOrigin(0.5);

      const zone = this.add.zone(x + 18, gridY + 18, 36, 36);
      zone.setInteractive({ useHandCursor: true });

      let tooltip: Phaser.GameObjects.Container | null = null;

      zone.on('pointerover', () => {
        this.tweens.add({
          targets: [iconBg, icon],
          scale: 1.15,
          duration: 150,
          ease: 'Back.easeOut',
        });

        tooltip = this.createTooltip(x + 18, gridY - 50, achievement);
      });

      zone.on('pointerout', () => {
        this.tweens.add({
          targets: [iconBg, icon],
          scale: 1,
          duration: 150,
          ease: 'Back.easeIn',
        });
        if (tooltip) {
          tooltip.destroy();
          tooltip = null;
        }
      });
    });
  }

  private createTooltip(x: number, y: number, data: typeof ACHIEVEMENTS[0]): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const padding = 12;

    const nameText = this.add.text(0, -10, data.name, {
      fontSize: '14px',
      fontFamily: 'Courier New, monospace',
      color: '#4fc3f7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const descText = this.add.text(0, 10, data.desc, {
      fontSize: '12px',
      fontFamily: 'Courier New, monospace',
      color: '#e3f2fd',
    }).setOrigin(0.5);

    const maxWidth = Math.max(nameText.width, descText.width) + padding * 2;
    const bgHeight = 50;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1929, 0.95);
    bg.lineStyle(2, 0x4fc3f7, 0.8);
    bg.strokeRoundedRect(-maxWidth / 2, -bgHeight / 2, maxWidth, bgHeight, 4);
    bg.fillRoundedRect(-maxWidth / 2, -bgHeight / 2, maxWidth, bgHeight, 4);

    container.add([bg, nameText, descText]);
    return container;
  }

  private createLeaderboard(width: number, height: number): void {
    const lbY = height * 0.72;

    const lbTitle = this.add.text(width / 2, lbY - 35, '🏆 实时排行榜 TOP 10', {
      fontSize: '22px',
      fontFamily: 'Courier New, monospace',
      color: '#ffd54f',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5);

    const trackWidth = width * 0.85;
    const trackX = width / 2 - trackWidth / 2;

    const trackBg = this.add.graphics();
    trackBg.fillStyle(0x0a1929, 0.6);
    trackBg.lineStyle(1, 0x4fc3f7, 0.4);
    trackBg.strokeRoundedRect(trackX, lbY, trackWidth, 55, 8);
    trackBg.fillRoundedRect(trackX, lbY, trackWidth, 55, 8);

    this.leaderboardScroll = this.add.container(trackX + 15, lbY + 27);

    const clipZone = this.add.zone(trackX + trackWidth / 2, lbY + 27, trackWidth - 30, 50);
    clipZone.setInteractive();

    clipZone.on('pointerover', () => {
      this.scrollPaused = true;
    });
    clipZone.on('pointerout', () => {
      this.scrollPaused = false;
    });

    this.updateLeaderboardDisplay();
  }

  private updateLeaderboardDisplay(): void {
    if (!this.leaderboardScroll) return;
    this.leaderboardScroll.removeAll(true);

    const entries = this.leaderboardData.length > 0 ? this.leaderboardData : this.getPlaceholderData();
    const itemWidth = 220;
    const gap = 30;

    entries.forEach((entry, index) => {
      const x = index * (itemWidth + gap);
      this.createLeaderboardItem(x, 0, entry, index + 1);
    });

    if (entries.length < 5) {
      const extra = 5 - entries.length;
      for (let i = 0; i < extra; i++) {
        const x = (entries.length + i) * (itemWidth + gap);
        this.createLeaderboardItem(x, 0, {
          id: `ph-${i}`,
          playerName: '---',
          score: 0,
          timestamp: 0,
        }, 0, true);
      }
    }
  }

  private getPlaceholderData(): LeaderboardEntry[] {
    return [
      { id: '1', playerName: 'ACE', score: 12800, timestamp: 0 },
      { id: '2', playerName: 'NOVA', score: 9600, timestamp: 0 },
      { id: '3', playerName: 'HERO', score: 7200, timestamp: 0 },
      { id: '4', playerName: 'STAR', score: 5400, timestamp: 0 },
      { id: '5', playerName: 'ZERO', score: 3800, timestamp: 0 },
    ];
  }

  private createLeaderboardItem(x: number, y: number, entry: LeaderboardEntry, rank: number, isPh = false): void {
    const container = this.add.container(x, y);
    const width = 220;
    const height = 45;

    let bgColor = 0x1a237e;
    let borderColor = 0x4fc3f7;
    let alpha = 0.8;

    if (rank === 1) { bgColor = 0xff8f00; borderColor = 0xffd54f; alpha = 0.85; }
    else if (rank === 2) { bgColor = 0x757575; borderColor = 0xe0e0e0; alpha = 0.85; }
    else if (rank === 3) { bgColor = 0x6d4c41; borderColor = 0xffb74d; alpha = 0.85; }
    if (isPh) { alpha = 0.4; }

    const bg = this.add.graphics();
    bg.fillStyle(bgColor, alpha);
    bg.lineStyle(2, borderColor, 0.9);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);

    if (rank >= 1 && rank <= 3 && !isPh) {
      this.tweens.add({
        targets: bg,
        alpha: { from: 0.7, to: 1 },
        duration: 1000 + rank * 300,
        yoyo: true,
        repeat: -1,
      });
    }

    let rankStr = rank > 0 ? `${rank}` : '-';
    let rankColor = '#e3f2fd';
    if (rank === 1) { rankStr = `👑 ${rank}`; rankColor = '#ffd54f'; }
    else if (rank === 2) { rankStr = `🥈 ${rank}`; rankColor = '#e0e0e0'; }
    else if (rank === 3) { rankStr = `🥉 ${rank}`; rankColor = '#ffb74d'; }

    const rankText = this.add.text(-width / 2 + 20, 0, rankStr, {
      fontSize: '16px',
      fontFamily: 'Courier New, monospace',
      color: rankColor,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const nameText = this.add.text(0, -8, entry.playerName, {
      fontSize: '15px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const scoreText = this.add.text(0, 10, entry.score.toLocaleString(), {
      fontSize: '14px',
      fontFamily: 'Courier New, monospace',
      color: rank === 1 ? '#ffd54f' : '#81d4fa',
    }).setOrigin(0.5);

    container.add([bg, rankText, nameText, scoreText]);
    this.leaderboardScroll.add(container);
  }

  private startScrollAnimation(): void {
    this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        if (this.scrollPaused || !this.leaderboardScroll) return;
        this.scrollOffset -= 0.5;
        const totalWidth = this.leaderboardScroll.length * 250;
        if (Math.abs(this.scrollOffset) > totalWidth) {
          this.scrollOffset = 0;
        }
        this.leaderboardScroll.x = (this.cameras.main.width / 2) - (this.cameras.main.width * 0.85 / 2) + 15 + this.scrollOffset;
      },
    });
  }

  private async loadLeaderboard(): Promise<void> {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        this.leaderboardData = await res.json();
        this.updateLeaderboardDisplay();
      }
    } catch (e) {
      console.log('Leaderboard not available, using placeholder');
    }
  }

  private createStartButton(width: number, height: number): void {
    const btnX = width / 2;
    const btnY = height * 0.88;
    const btnWidth = 280;
    const btnHeight = 65;

    const btnBg = this.add.graphics();
    btnBg.fillGradientStyle(0x00e676, 0x00c853, 0x00a844, 0x00e676, 1);
    btnBg.lineStyle(3, 0x69f0ae, 1);
    btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
    btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);

    const btnGlow = this.add.graphics();
    btnGlow.fillStyle(0x00e676, 0.3);
    btnGlow.fillRoundedRect(btnX - btnWidth / 2 - 4, btnY - btnHeight / 2 - 4, btnWidth + 8, btnHeight + 8, 14);

    this.tweens.add({
      targets: btnGlow,
      alpha: { from: 0.2, to: 0.5 },
      scale: { from: 1, to: 1.03 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const btnText = this.add.text(btnX, btnY, '▶ 开始任务', {
      fontSize: '28px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      letterSpacing: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#1b5e20',
        blur: 0,
        fill: true,
      },
    }).setOrigin(0.5);

    const hitArea = this.add.zone(btnX, btnY, btnWidth, btnHeight);
    hitArea.setInteractive({ useHandCursor: true });

    let isDown = false;

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 1.05,
        duration: 200,
        ease: 'Back.easeOut',
      });
      btnBg.clear();
      btnBg.fillGradientStyle(0x69f0ae, 0x00e676, 0x00c853, 0x69f0ae, 1);
      btnBg.lineStyle(3, 0xb9f6ca, 1);
      btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
      btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
    });

    hitArea.on('pointerout', () => {
      if (!isDown) {
        this.tweens.add({
          targets: [btnBg, btnText],
          scale: 1,
          duration: 200,
          ease: 'Back.easeIn',
        });
      }
      btnBg.clear();
      btnBg.fillGradientStyle(0x00e676, 0x00c853, 0x00a844, 0x00e676, 1);
      btnBg.lineStyle(3, 0x69f0ae, 1);
      btnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
      btnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
    });

    hitArea.on('pointerdown', () => {
      isDown = true;
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 0.95,
        duration: 100,
      });
    });

    hitArea.on('pointerup', () => {
      isDown = false;
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 1,
        duration: 100,
        onComplete: () => {
          this.cameras.main.fadeOut(500, 0, 0, 10);
          this.time.delayedCall(500, () => {
            this.scene.start('GameScene');
          });
        },
      });
    });

    const hint = this.add.text(btnX, btnY + 55, '鼠标控制方向  |  空格键发射牵引光束', {
      fontSize: '14px',
      fontFamily: 'Courier New, monospace',
      color: '#90caf9',
      alpha: 0.8,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: { from: 0.4, to: 0.9 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
    });
  }
}
