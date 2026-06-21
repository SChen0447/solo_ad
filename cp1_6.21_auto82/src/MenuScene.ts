import Phaser from 'phaser';
import { TRACKS } from './MusicData';
import type { BeatSequence } from './types';

export class MenuScene extends Phaser.Scene {
  private selectedIndex: number = 0;
  private trackCards: { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics; track: BeatSequence }[] = [];
  private title!: Phaser.GameObjects.Text;
  private titleGlow!: Phaser.GameObjects.Text;
  private scanLine!: Phaser.GameObjects.Graphics;
  private timeT: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.createBackground(width, height);
    this.createTitle(width, height);
    this.createScanLine(width, height);
    this.createTrackCards(width, height);
    this.createInstructions(width, height);
    this.setupInput();
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const dist = Math.sqrt(
        Math.pow((t - 0.5) * 2, 2) + Math.pow((0.5 - 0.5) * 2, 2)
      );
      const r = Math.floor(Phaser.Math.Linear(26, 10, dist));
      const g = Math.floor(Phaser.Math.Linear(10, 10, dist));
      const b = Math.floor(Phaser.Math.Linear(46, 26, dist));
      const color = Phaser.Display.Color.GetColor(r, g, b);
      bg.fillStyle(color, 1);
      const y = t * height;
      bg.fillRect(0, y, width, height / gradientSteps + 1);
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.max(width, height) * 0.7;
    const radialSteps = 30;
    for (let i = radialSteps; i >= 0; i--) {
      const t = i / radialSteps;
      const alpha = (1 - t) * 0.4;
      const radius = t * maxRadius;
      const color = Phaser.Display.Color.GetColor(
        Math.floor(Phaser.Math.Linear(60, 10, t)),
        Math.floor(Phaser.Math.Linear(20, 10, t)),
        Math.floor(Phaser.Math.Linear(100, 30, t))
      );
      this.add.circle(centerX, centerY, radius, color, alpha);
    }
  }

  private createTitle(width: number, height: number): void {
    const titleY = height * 0.22;

    this.titleGlow = this.add.text(width / 2, titleY, 'RHYTHM RUNNER', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#00ffff',
      stroke: '#00ffff',
      strokeThickness: 8
    }).setOrigin(0.5).setAlpha(0.3);

    this.title = this.add.text(width / 2, titleY, 'RHYTHM RUNNER', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#ff00ff',
      stroke: '#ffffff',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.add.text(width / 2, titleY + 70, '— Jump to the Beat —', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '22px',
      color: '#aaaaff'
    }).setOrigin(0.5);
  }

  private createScanLine(width: number, _height: number): void {
    this.scanLine = this.add.graphics();
    this.scanLine.fillStyle(0x00ffff, 0.15);
    this.scanLine.fillRect(0, 0, width, 4);
  }

  private createTrackCards(width: number, height: number): void {
    const cardWidth = 280;
    const cardHeight = 320;
    const spacing = 60;
    const startX = width / 2 - ((TRACKS.length - 1) * (cardWidth + spacing)) / 2;
    const cardY = height * 0.58;

    this.add.text(width / 2, cardY - cardHeight / 2 - 40, '选择一首曲目开始游戏', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '20px',
      color: '#cccccc'
    }).setOrigin(0.5);

    TRACKS.forEach((track, index) => {
      const cardX = startX + index * (cardWidth + spacing);
      const container = this.add.container(cardX, cardY);

      const bg = this.add.graphics();
      container.add(bg);

      const isWarm = track.colorTheme === 'warm';
      const colors = isWarm
        ? [0xff3300, 0xff6600, 0xff9933]
        : [0x3300ff, 0x6600cc, 0x9933ff];

      for (let i = 0; i < 3; i++) {
        bg.fillStyle(colors[i], 1 - i * 0.2);
        bg.fillRoundedRect(-cardWidth / 2 + i * 3, -cardHeight / 2 + i * 3, cardWidth, cardHeight, 16);
      }

      const border = this.add.graphics();
      border.lineStyle(3, 0xffffff, 0.5);
      border.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 16);
      container.add(border);

      const trackName = this.add.text(0, -cardHeight / 2 + 50, track.name, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      container.add(trackName);

      const bpmText = this.add.text(0, -cardHeight / 2 + 100, `${track.bpm} BPM`, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: isWarm ? '#ffdd88' : '#88ddff'
      }).setOrigin(0.5);
      container.add(bpmText);

      const rhythmLabel = this.add.text(0, -cardHeight / 2 + 145, isWarm ? '快节奏' : '慢节奏', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '18px',
        color: '#dddddd'
      }).setOrigin(0.5);
      container.add(rhythmLabel);

      const noteCount = this.add.text(0, 0, `${track.notes.length} Notes`, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#cccccc'
      }).setOrigin(0.5);
      container.add(noteCount);

      const barsText = this.add.text(0, 30, '16 Bars', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#cccccc'
      }).setOrigin(0.5);
      container.add(barsText);

      const selectLabel = this.add.text(0, cardHeight / 2 - 50, '[ 点击选择 ]', {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { x: 15, y: 8 }
      }).setOrigin(0.5);
      container.add(selectLabel);

      container.setSize(cardWidth, cardHeight);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight),
        Phaser.Geom.Rectangle.Contains
      );

      container.on('pointerdown', () => {
        this.selectTrack(index);
      });

      this.trackCards.push({ container, bg, track });
    });

    this.updateCardSelection();
  }

  private createInstructions(width: number, height: number): void {
    const instructions = [
      '← → 左右移动    空格 / 点击 跳跃',
      '按节拍收集音符，躲避红色障碍物'
    ];

    instructions.forEach((text, i) => {
      this.add.text(width / 2, height - 80 + i * 30, text, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '16px',
        color: '#888899'
      }).setOrigin(0.5);
    });
  }

  private setupInput(): void {
    this.input.keyboard!.on('keydown-LEFT', () => {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateCardSelection();
    });

    this.input.keyboard!.on('keydown-RIGHT', () => {
      this.selectedIndex = Math.min(TRACKS.length - 1, this.selectedIndex + 1);
      this.updateCardSelection();
    });

    this.input.keyboard!.on('keydown-ENTER', () => {
      this.selectTrack(this.selectedIndex);
    });

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.selectTrack(this.selectedIndex);
    });
  }

  private updateCardSelection(): void {
    this.trackCards.forEach((card, index) => {
      const isSelected = index === this.selectedIndex;
      const scale = isSelected ? 1.2 : 1.0;
      card.container.setScale(scale);
      card.container.setDepth(isSelected ? 10 : 0);

      if (isSelected) {
        card.bg.setAlpha(1);
      } else {
        card.bg.setAlpha(0.6);
      }
    });
  }

  private selectTrack(index: number): void {
    this.selectedIndex = index;
    this.updateCardSelection();

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene', { track: TRACKS[index] });
    });
  }

  update(_time: number, delta: number): void {
    this.timeT += delta;

    const floatY = Math.sin(this.timeT * 0.001) * 8;
    this.title.setY(this.title.y + (floatY - (this.title.y - this.scale.height * 0.22)));
    this.titleGlow.setY(this.title.y);

    const glowPulse = 0.2 + Math.sin(this.timeT * 0.003) * 0.15;
    this.titleGlow.setAlpha(glowPulse);

    if (this.scanLine) {
      this.scanLine.setY((this.timeT * 0.1) % this.scale.height);
    }

    this.trackCards.forEach((card, index) => {
      if (index === this.selectedIndex) {
        const pulse = 1.15 + Math.sin(this.timeT * 0.004) * 0.05;
        card.container.setScale(pulse);
      }
    });
  }
}
