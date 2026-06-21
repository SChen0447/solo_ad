import Phaser from 'phaser';
import { GridData, NoteType, GridNote } from '../utils/LevelCodec';
import { ScoreTracker, ScoreResult } from '../utils/ScoreTracker';

interface FallingNote {
  type: NoteType;
  col: number;
  targetTime: number;
  sprite: Phaser.GameObjects.Container;
  hit: boolean;
  missed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  alpha: number;
  sprite: Phaser.GameObjects.Graphics;
}

export class GameScene extends Phaser.Scene {
  private gridData: GridData | null = null;
  private isPreview: boolean = false;
  private scoreTracker: ScoreTracker = new ScoreTracker();
  private fallingNotes: FallingNote[] = [];
  private particles: Particle[] = [];
  private playerCharacter: Phaser.GameObjects.Container | null = null;
  private playerCircle: Phaser.GameObjects.Arc | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private comboText: Phaser.GameObjects.Text | null = null;
  private bpmText: Phaser.GameObjects.Text | null = null;
  private levelNameText: Phaser.GameObjects.Text | null = null;
  private judgeTexts: Phaser.GameObjects.Text[] = [];
  private shockwaves: Phaser.GameObjects.Graphics[] = [];
  private progressBar: Phaser.GameObjects.Graphics | null = null;
  private progressFill: Phaser.GameObjects.Graphics | null = null;
  private judgementLine: Phaser.GameObjects.Graphics | null = null;

  private noteSpeed: number = 200;
  private judgementY: number = 0;
  private gameStartTime: number = 0;
  private isPlaying: boolean = false;
  private totalDuration: number = 0;
  private currentScore: number = 0;
  private displayScore: number = 0;

  private bpm: number = 120;
  private cols: number = 3;

  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyS: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;

  private gameEnded: boolean = false;
  private resultPanel: Phaser.GameObjects.Container | null = null;

  private sliderBpm: number = 120;
  private bpmSlider: Phaser.GameObjects.Graphics | null = null;
  private bpmSliderHandle: Phaser.GameObjects.Rectangle | null = null;
  private isDraggingBpmSlider: boolean = false;
  private sliderX: number = 0;
  private sliderY: number = 0;
  private sliderWidth: number = 150;

  private backButton: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { gridData?: GridData; isPreview?: boolean }): void {
    if (data.gridData) {
      this.gridData = data.gridData;
      this.bpm = data.gridData.bpm;
      this.sliderBpm = data.gridData.bpm;
      this.cols = data.gridData.cols;
    }
    this.isPreview = data.isPreview || false;
    this.scoreTracker.reset();
    this.fallingNotes = [];
    this.gameEnded = false;
    this.currentScore = 0;
    this.displayScore = 0;
  }

  create(): void {
    this.createBackground();
    this.createParticles();
    this.createUI();
    this.createPlayer();
    this.setupKeys();
    this.startGame();
  }

  private createBackground(): void {
    const gradient = this.add.graphics();
    const color1 = Phaser.Display.Color.HexStringToColor('#0a0a23');
    const color2 = Phaser.Display.Color.HexStringToColor('#1a1a3e');

    for (let y = 0; y < this.scale.height; y++) {
      const t = y / this.scale.height;
      const r = Math.floor(color1.red + (color2.red - color1.red) * t);
      const g = Math.floor(color1.green + (color2.green - color1.green) * t);
      const b = Math.floor(color1.blue + (color2.blue - color1.blue) * t);
      gradient.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      gradient.fillRect(0, y, this.scale.width, 1);
    }
  }

  private createParticles(): void {
    const particleCount = 60;

    for (let i = 0; i < particleCount; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const size = Phaser.Math.Between(2, 6);
      const hue = Phaser.Math.Between(240, 180);
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 1).color;

      const g = this.add.graphics();
      g.fillStyle(color, 0.6);
      g.fillCircle(0, 0, size);

      const particle: Particle = {
        x,
        y,
        vx: Phaser.Math.FloatBetween(-20, 20),
        vy: Phaser.Math.FloatBetween(-20, 20),
        size,
        color,
        alpha: Phaser.Math.FloatBetween(0.3, 0.7),
        sprite: g
      };

      g.x = x;
      g.y = y;
      g.setAlpha(particle.alpha);

      this.particles.push(particle);
    }
  }

  private createUI(): void {
    const levelName = this.gridData?.name || '未知关卡';
    this.levelNameText = this.add.text(this.scale.width / 2, 25, levelName, {
      fontSize: '22px',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.bpmText = this.add.text(30, 30, `BPM: ${this.bpm}`, {
      fontSize: '16px',
      color: '#ffffff'
    });

    this.sliderX = 110;
    this.sliderY = 38;
    this.sliderWidth = 120;
    const sliderHeight = 5;

    this.bpmSlider = this.add.graphics();
    this.bpmSlider.fillStyle(0x333366, 1);
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, this.sliderWidth, sliderHeight, 3);
    this.bpmSlider.fillStyle(0x00ff88, 1);
    const fillWidth = ((this.sliderBpm - 80) / 100) * this.sliderWidth;
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, fillWidth, sliderHeight, 3);

    this.bpmSliderHandle = this.add.rectangle(
      this.sliderX + fillWidth,
      this.sliderY + sliderHeight / 2,
      14,
      14,
      0x00ff88
    );
    this.bpmSliderHandle.setInteractive({ useHandCursor: true });

    this.bpmSliderHandle.on('pointerdown', () => {
      this.isDraggingBpmSlider = true;
    });

    this.input.on('pointerup', () => {
      this.isDraggingBpmSlider = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingBpmSlider) {
        const minBpm = 80;
        const maxBpm = 180;
        const range = maxBpm - minBpm;
        let newBpm = ((pointer.x - this.sliderX) / this.sliderWidth) * range + minBpm;
        newBpm = Math.max(minBpm, Math.min(maxBpm, newBpm));
        newBpm = Math.round(newBpm / 5) * 5;
        this.sliderBpm = newBpm;
        this.bpm = newBpm;
        this.updateBpmSlider();
        this.calculateNoteSpeed();
      }
    });

    this.scoreText = this.add.text(30, 70, '0', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    });

    this.comboText = this.add.text(30, 110, '', {
      fontSize: '20px',
      color: '#ffdd44',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });

    this.backButton = this.add.text(this.scale.width - 80, 30, '返回', {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.backButton.on('pointerdown', () => {
      if (this.isPreview) {
        this.scene.start('EditorScene', { gridData: this.gridData });
      } else {
        this.scene.start('LevelSelectScene');
      }
    });

    this.progressBar = this.add.graphics();
    this.progressFill = this.add.graphics();
    this.updateProgressBar(0);

    this.judgementLine = this.add.graphics();
    this.judgementY = this.scale.height - 100;

    const trackWidth = this.cols * 70 + 20;
    const trackX = (this.scale.width - trackWidth) / 2;

    this.judgementLine.lineStyle(2, 0x00ff88, 0.8);
    this.judgementLine.strokeRoundedRect(
      trackX,
      this.judgementY - 25,
      trackWidth,
      50,
      8
    );

    for (let i = 0; i < this.cols; i++) {
      const x = trackX + 10 + i * 70 + 25;
      const key = ['A', 'S', 'D'][i];
      this.add.text(x, this.judgementY + 35, key, {
        fontSize: '16px',
        color: '#888888'
      }).setOrigin(0.5);
    }
  }

  private updateBpmSlider(): void {
    if (!this.bpmSlider || !this.bpmSliderHandle || !this.bpmText) return;

    const sliderHeight = 5;
    const fillWidth = ((this.sliderBpm - 80) / 100) * this.sliderWidth;

    this.bpmSlider.clear();
    this.bpmSlider.fillStyle(0x333366, 1);
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, this.sliderWidth, sliderHeight, 3);
    this.bpmSlider.fillStyle(0x00ff88, 1);
    this.bpmSlider.fillRoundedRect(this.sliderX, this.sliderY, fillWidth, sliderHeight, 3);

    this.bpmSliderHandle.x = this.sliderX + fillWidth;
    this.bpmText.setText(`BPM: ${this.bpm}`);
  }

  private createPlayer(): void {
    this.playerCharacter = this.add.container(this.scale.width / 2, this.judgementY);

    this.playerCircle = this.add.circle(0, 0, 15, 0x00ff88);
    this.playerCircle.setStrokeStyle(3, 0xffffff, 0.5);
    this.playerCharacter.add(this.playerCircle);
  }

  private setupKeys(): void {
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.keyA.on('down', () => this.handleKeyPress(0));
    this.keyS.on('down', () => this.handleKeyPress(1));
    this.keyD.on('down', () => this.handleKeyPress(2));
  }

  private calculateNoteSpeed(): void {
    const beatDuration = 60000 / this.bpm;
    const rowCount = this.gridData?.rows || 8;
    this.noteSpeed = (this.judgementY - 50) / (beatDuration * rowCount / 1000);
  }

  private startGame(): void {
    if (!this.gridData) return;

    this.calculateNoteSpeed();
    this.scoreTracker.reset();
    this.scoreTracker.setTotalNotes(this.gridData.notes.length);

    const beatDuration = 60000 / this.bpm;
    const rowCount = this.gridData.rows;

    this.gameStartTime = this.time.now;
    this.isPlaying = true;

    const sortedNotes = [...this.gridData.notes].sort((a, b) => a.row - b.row);
    this.totalDuration = (sortedNotes[sortedNotes.length - 1]?.row || 0) * beatDuration + 2000;

    sortedNotes.forEach(note => {
      const delay = note.row * beatDuration;
      this.time.delayedCall(delay, () => {
        if (this.isPlaying) {
          this.spawnNote(note);
        }
      });
    });
  }

  private spawnNote(note: GridNote): void {
    const col = note.col % this.cols;
    const trackWidth = this.cols * 70 + 20;
    const trackX = (this.scale.width - trackWidth) / 2;
    const x = trackX + 10 + col * 70 + 25;
    const y = -30;

    const color = [0xff4444, 0x4444ff, 0x44ff44][note.type];

    const container = this.add.container(x, y);

    const glow = this.add.graphics();
    glow.fillStyle(color, 0.3);
    glow.fillCircle(0, 0, 28);
    container.add(glow);

    const circle = this.add.circle(0, 0, 20, color);
    circle.setStrokeStyle(2, 0xffffff, 0.6);
    container.add(circle);

    const keyText = this.add.text(0, 0, ['A', 'S', 'D'][note.type], {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(keyText);

    const fallingNote: FallingNote = {
      type: note.type,
      col,
      targetTime: this.time.now + (this.judgementY - y) / this.noteSpeed * 1000,
      sprite: container,
      hit: false,
      missed: false
    };

    this.fallingNotes.push(fallingNote);
  }

  private handleKeyPress(keyIndex: number): void {
    if (!this.isPlaying || this.gameEnded) return;

    const currentTime = this.time.now;
    const judgeWindow = 50;

    let closestNote: FallingNote | null = null;
    let closestDiff = Infinity;

    for (const note of this.fallingNotes) {
      if (note.hit || note.missed) continue;
      if (note.type !== keyIndex) continue;

      const diff = Math.abs(currentTime - note.targetTime);
      if (diff < judgeWindow && diff < closestDiff) {
        closestNote = note;
        closestDiff = diff;
      }
    }

    if (closestNote) {
      this.hitNote(closestNote);
    } else {
      this.missKey(keyIndex);
    }
  }

  private hitNote(note: FallingNote): void {
    note.hit = true;
    this.scoreTracker.addJudge('perfect', note.type, this.time.now);
    this.currentScore = this.scoreTracker.getScore();

    this.spawnJudgeText('Perfect', 0x44ff44);
    this.flashPlayer(note.type);
    this.spawnShockwave(note.type);
    this.updateCombo();

    this.tweens.add({
      targets: note.sprite,
      scale: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.Out',
      onComplete: () => {
        note.sprite.destroy();
      }
    });
  }

  private missKey(keyIndex: number): void {
    this.scoreTracker.addJudge('miss', keyIndex, this.time.now);
    this.currentScore = this.scoreTracker.getScore();
    this.spawnJudgeText('Miss', 0xff4444, true);
    this.updateCombo();
  }

  private missNote(note: FallingNote): void {
    note.missed = true;
    this.scoreTracker.addJudge('miss', note.type, this.time.now);
    this.currentScore = this.scoreTracker.getScore();
    this.spawnJudgeText('Miss', 0xff4444, true);
    this.updateCombo();

    this.tweens.add({
      targets: note.sprite,
      alpha: 0.3,
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => {
        note.sprite.destroy();
      }
    });
  }

  private spawnJudgeText(text: string, color: number, shake: boolean = false): void {
    const x = this.scale.width / 2;
    const y = this.judgementY - 60;

    const judgeText = this.add.text(x, y, text, {
      fontSize: '28px',
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.judgeTexts.push(judgeText);

    if (shake) {
      this.tweens.add({
        targets: judgeText,
        x: x - 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: 'Linear'
      });
    }

    this.tweens.add({
      targets: judgeText,
      y: y - 50,
      alpha: 0,
      delay: 100,
      duration: 500,
      ease: 'Cubic.In',
      onComplete: () => {
        judgeText.destroy();
        const idx = this.judgeTexts.indexOf(judgeText);
        if (idx > -1) this.judgeTexts.splice(idx, 1);
      }
    });
  }

  private flashPlayer(type: NoteType): void {
    if (!this.playerCircle) return;

    const colors = [0xff4444, 0x4444ff, 0x44ff44];
    const originalColor = this.playerCircle.fillColor;

    this.playerCircle.fillColor = colors[type];

    this.time.delayedCall(100, () => {
      if (this.playerCircle) {
        this.playerCircle.fillColor = originalColor;
      }
    });
  }

  private spawnShockwave(type: NoteType): void {
    if (!this.playerCharacter) return;

    const colors = [0xff4444, 0x4444ff, 0x44ff44];
    const color = colors[type];

    const shockwave = this.add.graphics();
    shockwave.lineStyle(3, color, 0.8);
    shockwave.strokeCircle(this.scale.width / 2, this.judgementY, 20);
    this.shockwaves.push(shockwave);

    let radius = 20;
    const maxRadius = 80;
    const duration = 400;
    const startTime = this.time.now;

    const updateShockwave = () => {
      const elapsed = this.time.now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      radius = 20 + (maxRadius - 20) * progress;

      shockwave.clear();
      shockwave.lineStyle(3, color, 0.8 * (1 - progress));
      shockwave.strokeCircle(this.scale.width / 2, this.judgementY, radius);

      if (progress < 1) {
        this.time.delayedCall(16, updateShockwave);
      } else {
        shockwave.destroy();
        const idx = this.shockwaves.indexOf(shockwave);
        if (idx > -1) this.shockwaves.splice(idx, 1);
      }
    };

    updateShockwave();
  }

  private updateCombo(): void {
    const combo = this.scoreTracker.getCurrentCombo();
    if (combo > 1) {
      this.comboText!.setText(`${combo} COMBO`);
      this.comboText!.setAlpha(1);

      this.tweens.add({
        targets: this.comboText,
        scale: 1.2,
        duration: 100,
        ease: 'Cubic.Out',
        yoyo: true
      });
    } else {
      this.comboText!.setText('');
    }
  }

  private updateProgressBar(progress: number): void {
    if (!this.progressBar || !this.progressFill) return;

    const barWidth = this.scale.width - 40;
    const barHeight = 4;
    const barX = 20;
    const barY = this.scale.height - 20;

    this.progressBar.clear();
    this.progressFill.clear();

    this.progressBar.fillStyle(0x333366, 0.5);
    this.progressBar.fillRoundedRect(barX, barY, barWidth, barHeight, 2);

    this.progressFill.fillStyle(0x00ff88, 0.8);
    this.progressFill.fillRoundedRect(barX, barY, barWidth * progress, barHeight, 2);
  }

  update(time: number, delta: number): void {
    if (!this.isPlaying) return;

    this.updateParticles(delta);
    this.updateFallingNotes(delta);
    this.updateScore();

    const elapsed = time - this.gameStartTime;
    const progress = Math.min(elapsed / this.totalDuration, 1);
    this.updateProgressBar(progress);

    if (elapsed > this.totalDuration && !this.gameEnded) {
      this.endGame();
    }
  }

  private updateParticles(delta: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * delta / 1000;
      particle.y += particle.vy * delta / 1000;

      if (particle.x < 0) particle.x = this.scale.width;
      if (particle.x > this.scale.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.scale.height;
      if (particle.y > this.scale.height) particle.y = 0;

      particle.sprite.x = particle.x;
      particle.sprite.y = particle.y;
    }
  }

  private updateFallingNotes(delta: number): void {
    for (let i = this.fallingNotes.length - 1; i >= 0; i--) {
      const note = this.fallingNotes[i];
      if (note.hit || note.missed) continue;

      note.sprite.y += this.noteSpeed * delta / 1000;

      if (note.sprite.y > this.judgementY + 50) {
        this.missNote(note);
      }
    }

    this.fallingNotes = this.fallingNotes.filter(n => !n.hit && !n.missed || n.sprite.active);
  }

  private updateScore(): void {
    if (this.displayScore !== this.currentScore) {
      const diff = this.currentScore - this.displayScore;
      this.displayScore += diff * 0.2;
      if (Math.abs(diff) < 1) {
        this.displayScore = this.currentScore;
      }
      this.scoreText!.setText(Math.floor(this.displayScore).toString());
    }
  }

  private endGame(): void {
    this.gameEnded = true;
    this.isPlaying = false;

    const result = this.scoreTracker.getResult();
    this.showResultPanel(result);
  }

  private showResultPanel(result: ScoreResult): void {
    this.resultPanel = this.add.container(this.scale.width / 2, this.scale.height / 2);
    this.resultPanel.setAlpha(0);
    this.resultPanel.setScale(0.8);

    const panelWidth = 400;
    const panelHeight = 350;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a3e, 0.95);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);
    bg.lineStyle(2, 0x00ff88, 0.5);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16);
    this.resultPanel.add(bg);

    const title = this.add.text(0, -panelHeight / 2 + 40, '游戏结束', {
      fontSize: '28px',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.resultPanel.add(title);

    const scoreLabel = this.add.text(0, -panelHeight / 2 + 90, '得分', {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5);
    this.resultPanel.add(scoreLabel);

    const scoreValue = this.add.text(0, -panelHeight / 2 + 125, result.score.toString(), {
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.resultPanel.add(scoreValue);

    const accuracyText = this.add.text(
      -100,
      -panelHeight / 2 + 180,
      `正确率: ${result.accuracy.toFixed(1)}%`,
      {
        fontSize: '16px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);
    this.resultPanel.add(accuracyText);

    const maxComboText = this.add.text(
      100,
      -panelHeight / 2 + 180,
      `最大连击: ${result.maxCombo}`,
      {
        fontSize: '16px',
        color: '#ffdd44'
      }
    ).setOrigin(0.5);
    this.resultPanel.add(maxComboText);

    const perfectText = this.add.text(
      -100,
      -panelHeight / 2 + 215,
      `Perfect: ${result.perfectCount}`,
      {
        fontSize: '14px',
        color: '#44ff44'
      }
    ).setOrigin(0.5);
    this.resultPanel.add(perfectText);

    const missText = this.add.text(
      100,
      -panelHeight / 2 + 215,
      `Miss: ${result.missCount}`,
      {
        fontSize: '14px',
        color: '#ff4444'
      }
    ).setOrigin(0.5);
    this.resultPanel.add(missText);

    const retryButton = this.add.text(-80, panelHeight / 2 - 50, '重试', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#00aa66',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryButton.on('pointerdown', () => {
      this.restartGame();
    });

    this.resultPanel.add(retryButton);

    const backButton2 = this.add.text(80, panelHeight / 2 - 50, '返回', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#666688',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backButton2.on('pointerdown', () => {
      if (this.isPreview) {
        this.scene.start('EditorScene', { gridData: this.gridData });
      } else {
        this.scene.start('LevelSelectScene');
      }
    });

    this.resultPanel.add(backButton2);

    this.tweens.add({
      targets: this.resultPanel,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.Out'
    });
  }

  private restartGame(): void {
    if (this.resultPanel) {
      this.resultPanel.destroy();
      this.resultPanel = null;
    }

    this.fallingNotes.forEach(n => n.sprite.destroy());
    this.fallingNotes = [];

    this.scoreTracker.reset();
    this.currentScore = 0;
    this.displayScore = 0;
    this.scoreText!.setText('0');
    this.comboText!.setText('');
    this.gameEnded = false;

    this.startGame();
  }
}
