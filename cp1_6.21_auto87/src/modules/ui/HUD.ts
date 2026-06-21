import Phaser from 'phaser';
import { SKILLS } from '../fight/SkillManager';

export class HUD {
  private scene: Phaser.Scene;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private comboTexts: Phaser.GameObjects.Text[] = [];
  private comboNameText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private comboCountText!: Phaser.GameObjects.Text;
  private skillRings: {
    bg: Phaser.GameObjects.Graphics;
    cd: Phaser.GameObjects.Graphics;
    keyText: Phaser.GameObjects.Text;
    pulseTween: Phaser.Tweens.Tween | null;
  }[] = [];
  private score: number = 0;
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private currentHp: number = 100;
  private maxHp: number = 100;
  private flashRect: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    this.createHpBar();
    this.createSkillRings();
    this.createComboDisplay();
    this.createScoreDisplay();
    this.createComboCountDisplay();
  }

  private createHpBar(): void {
    const barX = 80;
    const barY = this.scene.scale.height - 40;
    const barW = 300;
    const barH = 16;

    this.hpBarBg = this.scene.add.rectangle(barX, barY, barW + 4, barH + 4, 0x112233, 0.8);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hpBarBg.setDepth(30);

    this.hpBarFill = this.scene.add.rectangle(barX + 2, barY, barW, barH, 0x00cccc);
    this.hpBarFill.setOrigin(0, 0.5);
    this.hpBarFill.setDepth(31);

    this.hpText = this.scene.add.text(barX + barW / 2, barY, '100/100', {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#ffffff',
    });
    this.hpText.setOrigin(0.5);
    this.hpText.setDepth(32);
  }

  private createSkillRings(): void {
    const baseX = 80;
    const baseY = this.scene.scale.height - 90;
    const radius = 20;
    const spacing = 60;

    for (let i = 0; i < SKILLS.length; i++) {
      const cx = baseX + i * spacing + radius;
      const cy = baseY;

      const bg = this.scene.add.graphics();
      bg.setDepth(30);
      bg.lineStyle(3, 0x224466, 0.8);
      bg.strokeCircle(cx, cy, radius);
      bg.fillStyle(0x0a1520, 0.7);
      bg.fillCircle(cx, cy, radius - 2);

      const cd = this.scene.add.graphics();
      cd.setDepth(31);

      const keyText = this.scene.add.text(cx, cy, SKILLS[i].key, {
        fontSize: '14px',
        fontFamily: 'Arial',
        color: '#88ccff',
        fontStyle: 'bold',
      });
      keyText.setOrigin(0.5);
      keyText.setDepth(32);

      this.skillRings.push({ bg, cd, keyText, pulseTween: null });
    }
  }

  private createComboDisplay(): void {
    const centerX = this.scene.scale.width / 2;
    const y = 40;

    for (let i = 0; i < 6; i++) {
      const text = this.scene.add.text(centerX + (i - 3) * 22, y, '', {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ffee44',
        fontStyle: 'bold',
        stroke: '#aa8800',
        strokeThickness: 2,
      });
      text.setOrigin(0.5);
      text.setDepth(30);
      text.setAlpha(0);
      this.comboTexts.push(text);
    }

    this.comboNameText = this.scene.add.text(centerX, y + 30, '', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#44ffdd',
      fontStyle: 'bold',
      stroke: '#004444',
      strokeThickness: 2,
    });
    this.comboNameText.setOrigin(0.5);
    this.comboNameText.setDepth(30);
    this.comboNameText.setAlpha(0);
  }

  private createScoreDisplay(): void {
    this.scoreText = this.scene.add.text(this.scene.scale.width - 20, 20, '0', {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#004488',
      strokeThickness: 2,
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setDepth(30);

    const label = this.scene.add.text(this.scene.scale.width - 20, 4, 'SCORE', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#668899',
    });
    label.setOrigin(1, 0);
    label.setDepth(30);
  }

  private createComboCountDisplay(): void {
    this.comboCountText = this.scene.add.text(this.scene.scale.width - 20, 50, '', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#4488cc',
      strokeThickness: 3,
    });
    this.comboCountText.setOrigin(1, 0);
    this.comboCountText.setDepth(30);
  }

  updateComboInput(keys: string[]): void {
    for (let i = 0; i < this.comboTexts.length; i++) {
      if (i < keys.length) {
        this.comboTexts[i].setText(keys[i]);
        this.comboTexts[i].setAlpha(1);
        this.scene.tweens.add({
          targets: this.comboTexts[i],
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 50,
          yoyo: true,
        });
      } else {
        this.comboTexts[i].setText('');
        this.comboTexts[i].setAlpha(0);
      }
    }
  }

  showComboName(name: string): void {
    this.comboNameText.setText(name);
    this.comboNameText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.comboNameText,
      alpha: 0,
      duration: 1200,
      delay: 300,
    });
  }

  updateSkillCooldown(skillIndex: number, progress: number, state: string): void {
    if (skillIndex < 0 || skillIndex >= this.skillRings.length) return;

    const ring = this.skillRings[skillIndex];
    const cx = 80 + skillIndex * 60 + 20;
    const cy = this.scene.scale.height - 90;
    const radius = 20;

    ring.cd.clear();

    if (state === 'ready') {
      ring.cd.lineStyle(4, SKILLS[skillIndex].color, 0.9);
      ring.cd.strokeCircle(cx, cy, radius);

      if (!ring.pulseTween) {
        ring.pulseTween = this.scene.tweens.add({
          targets: [ring.bg, ring.cd, ring.keyText],
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      ring.keyText.setColor('#ffffff');
    } else {
      if (ring.pulseTween) {
        ring.pulseTween.stop();
        ring.pulseTween = null;
        ring.bg.setScale(1);
        ring.cd.setScale(1);
        ring.keyText.setScale(1);
      }

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + progress * Math.PI * 2;

      ring.cd.lineStyle(4, 0xaa2222, 0.8);
      ring.cd.beginPath();
      ring.cd.arc(cx, cy, radius, startAngle, endAngle, false);
      ring.cd.strokePath();

      ring.keyText.setColor('#666666');
    }
  }

  updateHp(current: number, max: number): void {
    this.currentHp = current;
    this.maxHp = max;
    const pct = Math.max(0, current / max);
    const barW = 300;

    this.hpBarFill.width = barW * pct;

    if (pct > 0.5) {
      this.hpBarFill.fillColor = 0x00cccc;
    } else if (pct > 0.25) {
      this.hpBarFill.fillColor = 0xcccc00;
    } else {
      this.hpBarFill.fillColor = 0xcc2222;
    }

    this.hpText.setText(`${Math.ceil(current)}/${max}`);
  }

  addScore(points: number): void {
    this.score += points;
    this.scoreText.setText(this.score.toString());

    this.scene.tweens.add({
      targets: this.scoreText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
    });
  }

  getScore(): number {
    return this.score;
  }

  updateCombo(delta: number): void {
    if (this.comboCount > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.comboCountText.setText('');
      }
    }
  }

  incrementCombo(): void {
    this.comboCount++;
    this.comboTimer = 2000;

    const fontSize = this.comboCount > 10 ? '32px' : '24px';
    this.comboCountText.setFontSize(fontSize);
    this.comboCountText.setText(`${this.comboCount} COMBO`);

    this.scene.tweens.add({
      targets: this.comboCountText,
      scaleX: 1.3,
      scaleY: 1.3,
      angle: 5,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    if (this.comboCount > 10) {
      this.scene.tweens.add({
        targets: this.comboCountText,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
    }

    this.triggerFlash();
  }

  getComboCount(): number {
    return this.comboCount;
  }

  getComboMultiplier(): number {
    if (this.comboCount >= 5) return 5;
    if (this.comboCount >= 3) return 3;
    if (this.comboCount >= 2) return 2;
    return 1;
  }

  private triggerFlash(): void {
    if (this.flashRect && this.flashRect.active) {
      this.flashRect.destroy();
    }
    this.flashRect = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0xffffff,
      0.15
    );
    this.flashRect.setDepth(50);
    this.scene.tweens.add({
      targets: this.flashRect,
      alpha: 0,
      duration: 100,
      onComplete: () => {
        this.flashRect?.destroy();
      },
    });
  }

  showSkillEffect(x: number, y: number, color: number): void {
    const ring = this.scene.add.graphics();
    ring.setDepth(15);
    ring.lineStyle(4, color, 1);
    ring.strokeCircle(x, y, 10);

    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      duration: 600,
      onUpdate: (_tween: Phaser.Tweens.Tween, target: any) => {
        const scale = 1 + (1 - target.alpha) * 3;
        ring.clear();
        ring.lineStyle(4 * (1 - target.alpha + 0.2), color, target.alpha);
        ring.strokeCircle(x, y, 10 * scale);
      },
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  destroy(): void {
    this.comboTexts.forEach(t => t.destroy());
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.hpText.destroy();
    this.scoreText.destroy();
    this.comboCountText.destroy();
    this.comboNameText.destroy();
    this.skillRings.forEach(r => {
      r.bg.destroy();
      r.cd.destroy();
      r.keyText.destroy();
      if (r.pulseTween) r.pulseTween.stop();
    });
  }
}
