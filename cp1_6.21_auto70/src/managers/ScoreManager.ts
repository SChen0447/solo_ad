import Phaser from 'phaser';

export interface ScoreEvent {
  type: 'score' | 'combo' | 'combo_break' | 'multiplier_change';
  score: number;
  totalScore: number;
  comboCount?: number;
  multiplier?: number;
}

export class ScoreManager {
  public scene: Phaser.Scene;

  private _score = 0;
  private _displayScore = 0;
  private _comboCount = 0;
  private _multiplier = 1;

  private maxMultiplier = 5;
  private comboBase = 10;
  private comboStep = 5;
  private comboTimeoutMs = 2500;
  private comboTimer: number | null = null;

  private baseScore = 100;

  private listeners: ((event: ScoreEvent) => void)[] = [];
  private multiplierAnimations: { text: Phaser.GameObjects.Text; scaleX: number; scaleY: number }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get score(): number { return this._score; }
  get displayScore(): number { return this._displayScore; }
  get comboCount(): number { return this._comboCount; }
  get multiplier(): number { return this._multiplier; }

  public onEvent(listener: (event: ScoreEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx > -1) this.listeners.splice(idx, 1);
    };
  }

  private emit(event: ScoreEvent): void {
    this.listeners.forEach(l => l(event));
  }

  public addRecycledScore(x: number, y: number): number {
    const gained = this.baseScore * this._multiplier;
    this._score += gained;
    this._comboCount++;

    this.checkComboMilestone(x, y);
    this.resetComboTimer();

    this.emit({
      type: 'score',
      score: gained,
      totalScore: this._score,
      comboCount: this._comboCount,
      multiplier: this._multiplier,
    });

    this.showFloatingScore(x, y, gained);
    return gained;
  }

  private checkComboMilestone(x: number, y: number): void {
    let newMultiplier = 1;

    if (this._comboCount >= this.comboBase) {
      const extraSteps = Math.floor((this._comboCount - this.comboBase) / this.comboStep);
      newMultiplier = Math.min(this.maxMultiplier, 2 + extraSteps);
    }

    if (newMultiplier !== this._multiplier) {
      const oldMult = this._multiplier;
      this._multiplier = newMultiplier;

      if (newMultiplier >= 2) {
        this.showComboMultiplierPopup(newMultiplier);
      }

      this.emit({
        type: 'multiplier_change',
        score: 0,
        totalScore: this._score,
        multiplier: newMultiplier,
        comboCount: this._comboCount,
      });
    }
  }

  private showComboMultiplierPopup(mult: number): void {
    const w = this.scene.cameras.main.width;
    const h = this.scene.cameras.main.height;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a1929, 0.85);
    bg.lineStyle(3, 0xffd54f, 1);
    const bgW = 320;
    const bgH = 110;
    bg.strokeRoundedRect(w / 2 - bgW / 2, h / 2 - bgH / 2, bgW, bgH, 12);
    bg.fillRoundedRect(w / 2 - bgW / 2, h / 2 - bgH / 2, bgW, bgH, 12);
    bg.setDepth(100);

    const label = this.scene.add.text(w / 2, h / 2 - 25, '连击倍率', {
      fontSize: '22px',
      fontFamily: 'Courier New, monospace',
      color: '#ffd54f',
      fontStyle: 'bold',
      letterSpacing: 5,
    }).setOrigin(0.5).setDepth(101);

    const multText = this.scene.add.text(w / 2, h / 2 + 15, `x${mult}`, {
      fontSize: '52px',
      fontFamily: 'Courier New, monospace',
      color: '#fff',
      fontStyle: 'bold',
      stroke: '#ff6f00',
      strokeThickness: 4,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: '#ffd54f',
        blur: 25, fill: true,
      },
    }).setOrigin(0.5).setDepth(101);

    const container = this.scene.add.container(w / 2, h / 2, [bg, label, multText]);
    container.setScale(0);
    container.setDepth(100);

    this.scene.tweens.add({
      targets: container,
      scale: { from: 0, to: 1 },
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: multText,
          scaleX: { from: 1, to: 1.2 },
          scaleY: { from: 1, to: 1.2 },
          duration: 150,
          yoyo: true,
          repeat: 3,
        });
      },
    });

    this.scene.time.delayedCall(1000, () => {
      this.scene.tweens.add({
        targets: container,
        scale: { from: 1, to: 0.8 },
        alpha: { from: 1, to: 0 },
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => container.destroy(),
      });
    });

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xffd54f, 1);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(w / 2, h / 2);
      particle.setDepth(99);
      this.scene.tweens.add({
        targets: particle,
        x: w / 2 + Math.cos(angle) * 180,
        y: h / 2 + Math.sin(angle) * 180,
        alpha: 0,
        scale: 0.3,
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private showFloatingScore(x: number, y: number, gained: number): void {
    const text = this.scene.add.text(x, y - 30, `+${gained}`, {
      fontSize: this._multiplier >= 2 ? '28px' : '22px',
      fontFamily: 'Courier New, monospace',
      color: this._multiplier >= 3 ? '#ffd54f' : (this._multiplier >= 2 ? '#69f0ae' : '#4fc3f7'),
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    if (this._multiplier >= 2) {
      text.setShadow(0, 0, this._multiplier >= 3 ? '#ffd54f' : '#69f0ae', 15, true, true);
    }

    this.scene.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      scale: { from: 1.2, to: 0.6 },
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private resetComboTimer(): void {
    if (this.comboTimer !== null) {
      this.scene.time.removeEvent(this.comboTimer);
    }
    this.comboTimer = this.scene.time.delayedCall(this.comboTimeoutMs, () => {
      this.breakCombo();
    }) as unknown as number;
  }

  public breakCombo(): void {
    if (this._comboCount === 0) return;

    const oldMult = this._multiplier;
    this._comboCount = 0;
    this._multiplier = 1;

    this.emit({
      type: 'combo_break',
      score: 0,
      totalScore: this._score,
      comboCount: 0,
      multiplier: 1,
    });
  }

  public update(delta: number): void {
    if (this._displayScore < this._score) {
      const diff = this._score - this._displayScore;
      const step = Math.max(1, Math.ceil(diff * (delta / 1000) * 8));
      this._displayScore = Math.min(this._score, this._displayScore + step);
    } else if (this._displayScore > this._score) {
      this._displayScore = this._score;
    }
  }

  public reset(): void {
    this._score = 0;
    this._displayScore = 0;
    this._comboCount = 0;
    this._multiplier = 1;
    if (this.comboTimer !== null) {
      this.scene.time.removeEvent(this.comboTimer);
      this.comboTimer = null;
    }
  }

  public destroy(): void {
    this.listeners = [];
  }

  public async syncToBackend(playerName: string, clientId: string): Promise<{
    success: boolean;
    achievements?: any[];
    leaderboard?: any[];
  }> {
    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName,
          score: this._score,
          clientId,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false };
    } catch (e) {
      console.error('Failed to sync score:', e);
      return { success: false };
    }
  }
}
