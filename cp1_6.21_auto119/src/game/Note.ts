import Phaser from 'phaser';
import { NoteColor } from '../shared/BeatDataManager';

const COLOR_MAP: Record<NoteColor, number> = {
  red: 0xff3b5c,
  blue: 0x00d2ff,
  green: 0x2ecc71,
};

const GLOW_MAP: Record<NoteColor, number> = {
  red: 0xff6b8a,
  blue: 0x66e0ff,
  green: 0x5dde9e,
};

export type NoteJudgment = 'none' | 'perfect' | 'good' | 'miss';

export class Note extends Phaser.GameObjects.Container {
  private noteColor: NoteColor;
  private judgment: NoteJudgment = 'none';
  private bodyCircle: Phaser.GameObjects.Arc;
  private glowCircle: Phaser.GameObjects.Arc;
  private ring: Phaser.GameObjects.Arc;
  private bpm: number;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private beatPos: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color: NoteColor,
    bpm: number,
    beatPosition: number
  ) {
    super(scene, x, y);

    this.noteColor = color;
    this.bpm = bpm;
    this.beatPos = beatPosition;

    this.glowCircle = scene.add.circle(0, 0, 22, GLOW_MAP[color], 0.2);
    this.add(this.glowCircle);

    this.ring = scene.add.circle(0, 0, 20, COLOR_MAP[color], 0.15);
    this.ring.setStrokeStyle(2, COLOR_MAP[color], 0.6);
    this.add(this.ring);

    this.bodyCircle = scene.add.circle(0, 0, 12, COLOR_MAP[color], 1);
    this.bodyCircle.setStrokeStyle(2, 0xffffff, 0.3);
    this.add(this.bodyCircle);

    const label = scene.add.text(0, 0, this.getKeyLabel(), {
      fontSize: '10px',
      fontFamily: 'Nunito, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    this.add(label);

    this.startPulse();
    scene.add.existing(this);
  }

  private getKeyLabel(): string {
    switch (this.noteColor) {
      case 'red': return 'A';
      case 'blue': return 'S';
      case 'green': return 'D';
    }
  }

  private startPulse(): void {
    const beatDuration = 60000 / this.bpm;
    const halfBeat = beatDuration / 2;

    this.pulseTween = this.scene.tweens.add({
      targets: this.ring,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.3,
      duration: halfBeat,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  getColor(): NoteColor {
    return this.noteColor;
  }

  getBeatPosition(): number {
    return this.beatPos;
  }

  getJudgment(): NoteJudgment {
    return this.judgment;
  }

  setJudgment(j: NoteJudgment): void {
    this.judgment = j;
    if (j === 'perfect' || j === 'good') {
      this.flashCorrect();
    } else if (j === 'miss') {
      this.flashMiss();
    }
  }

  private flashCorrect(): void {
    this.stopPulse();
    this.glowCircle.setFillStyle(0xffffff, 0.7);
    this.scene.tweens.add({
      targets: this.glowCircle,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
    });
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  private flashMiss(): void {
    this.stopPulse();
    this.bodyCircle.setFillStyle(0xff0000, 0.8);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });
  }

  stopPulse(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
  }

  override destroy(fromScene?: boolean): void {
    this.stopPulse();
    super.destroy(fromScene);
  }
}
