import Phaser from 'phaser';

type CharState = 'idle' | 'attacking_a' | 'attacking_b' | 'skill' | 'stagger' | 'hold';

interface SkillAnimDef {
  frames: { body: { x: number; y: number; angle: number }; rArm: { angle: number }; lArm: { angle: number }; rLeg: { angle: number }; lLeg: { angle: number } }[];
}

const SKILL_ANIMS: Record<string, SkillAnimDef> = {
  '上勾拳': {
    frames: [
      { body: { x: 0, y: 0, angle: -5 }, rArm: { angle: -40 }, lArm: { angle: 10 }, rLeg: { angle: 5 }, lLeg: { angle: -5 } },
      { body: { x: 4, y: -8, angle: 5 }, rArm: { angle: -120 }, lArm: { angle: 20 }, rLeg: { angle: 10 }, lLeg: { angle: -10 } },
      { body: { x: 2, y: -16, angle: 10 }, rArm: { angle: -160 }, lArm: { angle: 30 }, rLeg: { angle: 5 }, lLeg: { angle: -15 } },
      { body: { x: 0, y: -10, angle: 0 }, rArm: { angle: -100 }, lArm: { angle: 15 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
    ],
  },
  '回旋踢': {
    frames: [
      { body: { x: -2, y: 0, angle: -10 }, rArm: { angle: 30 }, lArm: { angle: -30 }, rLeg: { angle: -20 }, lLeg: { angle: 10 } },
      { body: { x: 2, y: -4, angle: 5 }, rArm: { angle: 40 }, lArm: { angle: -40 }, rLeg: { angle: 60 }, lLeg: { angle: 10 } },
      { body: { x: 6, y: -2, angle: 15 }, rArm: { angle: 50 }, lArm: { angle: -50 }, rLeg: { angle: 120 }, lLeg: { angle: -10 } },
      { body: { x: 2, y: 0, angle: 5 }, rArm: { angle: 20 }, lArm: { angle: -20 }, rLeg: { angle: 40 }, lLeg: { angle: 0 } },
    ],
  },
  '剑气斩': {
    frames: [
      { body: { x: -4, y: 0, angle: -10 }, rArm: { angle: -80 }, lArm: { angle: 10 }, rLeg: { angle: -5 }, lLeg: { angle: 5 } },
      { body: { x: 0, y: 0, angle: 0 }, rArm: { angle: -30 }, lArm: { angle: 20 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
      { body: { x: 8, y: 2, angle: 15 }, rArm: { angle: 50 }, lArm: { angle: 30 }, rLeg: { angle: 10 }, lLeg: { angle: -10 } },
      { body: { x: 4, y: 0, angle: 5 }, rArm: { angle: 20 }, lArm: { angle: 10 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
    ],
  },
  '蓄力锤': {
    frames: [
      { body: { x: 0, y: -4, angle: -15 }, rArm: { angle: -140 }, lArm: { angle: -120 }, rLeg: { angle: -10 }, lLeg: { angle: 10 } },
      { body: { x: -2, y: -6, angle: -10 }, rArm: { angle: -160 }, lArm: { angle: -140 }, rLeg: { angle: -5 }, lLeg: { angle: 5 } },
      { body: { x: 6, y: 8, angle: 20 }, rArm: { angle: 60 }, lArm: { angle: 50 }, rLeg: { angle: 15 }, lLeg: { angle: -5 } },
      { body: { x: 2, y: 4, angle: 5 }, rArm: { angle: 20 }, lArm: { angle: 10 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
    ],
  },
  '滑铲': {
    frames: [
      { body: { x: 0, y: 8, angle: 20 }, rArm: { angle: -20 }, lArm: { angle: 30 }, rLeg: { angle: 40 }, lLeg: { angle: -20 } },
      { body: { x: 10, y: 16, angle: 40 }, rArm: { angle: -10 }, lArm: { angle: 40 }, rLeg: { angle: 60 }, lLeg: { angle: -30 } },
      { body: { x: 20, y: 12, angle: 30 }, rArm: { angle: 0 }, lArm: { angle: 20 }, rLeg: { angle: 80 }, lLeg: { angle: -20 } },
      { body: { x: 12, y: 4, angle: 10 }, rArm: { angle: 0 }, lArm: { angle: 10 }, rLeg: { angle: 20 }, lLeg: { angle: -5 } },
    ],
  },
  '升龙拳': {
    frames: [
      { body: { x: 0, y: 0, angle: -5 }, rArm: { angle: -30 }, lArm: { angle: 10 }, rLeg: { angle: -10 }, lLeg: { angle: 10 } },
      { body: { x: 2, y: -20, angle: 10 }, rArm: { angle: -150 }, lArm: { angle: 20 }, rLeg: { angle: 20 }, lLeg: { angle: -15 } },
      { body: { x: 0, y: -30, angle: 15 }, rArm: { angle: -170 }, lArm: { angle: 30 }, rLeg: { angle: 30 }, lLeg: { angle: -20 } },
      { body: { x: -2, y: -14, angle: 0 }, rArm: { angle: -80 }, lArm: { angle: 15 }, rLeg: { angle: 10 }, lLeg: { angle: -5 } },
    ],
  },
  '连珠弹': {
    frames: [
      { body: { x: 2, y: 0, angle: 5 }, rArm: { angle: 40 }, lArm: { angle: 10 }, rLeg: { angle: 5 }, lLeg: { angle: -5 } },
      { body: { x: 4, y: 0, angle: 5 }, rArm: { angle: 50 }, lArm: { angle: 10 }, rLeg: { angle: 5 }, lLeg: { angle: -5 } },
      { body: { x: 6, y: -2, angle: 5 }, rArm: { angle: 60 }, lArm: { angle: 20 }, rLeg: { angle: 10 }, lLeg: { angle: -5 } },
      { body: { x: 4, y: 0, angle: 0 }, rArm: { angle: 30 }, lArm: { angle: 10 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
    ],
  },
  '旋风腿': {
    frames: [
      { body: { x: 0, y: -4, angle: -10 }, rArm: { angle: 30 }, lArm: { angle: -30 }, rLeg: { angle: -30 }, lLeg: { angle: 10 } },
      { body: { x: 4, y: -8, angle: 0 }, rArm: { angle: 40 }, lArm: { angle: -40 }, rLeg: { angle: 60 }, lLeg: { angle: -30 } },
      { body: { x: 0, y: -12, angle: 10 }, rArm: { angle: 30 }, lArm: { angle: -30 }, rLeg: { angle: 150 }, lLeg: { angle: -10 } },
      { body: { x: -4, y: -6, angle: -5 }, rArm: { angle: 20 }, lArm: { angle: -20 }, rLeg: { angle: 60 }, lLeg: { angle: 0 } },
    ],
  },
};

const DEFAULT_SKILL_NAMES = Object.keys(SKILL_ANIMS);

const ATTACK_A_FRAMES: SkillAnimDef = {
  frames: [
    { body: { x: -2, y: 0, angle: -5 }, rArm: { angle: -20 }, lArm: { angle: 10 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
    { body: { x: 4, y: 0, angle: 8 }, rArm: { angle: 50 }, lArm: { angle: 15 }, rLeg: { angle: 5 }, lLeg: { angle: -5 } },
    { body: { x: 2, y: 0, angle: 3 }, rArm: { angle: 30 }, lArm: { angle: 10 }, rLeg: { angle: 0 }, lLeg: { angle: 0 } },
  ],
};

const ATTACK_B_FRAMES: SkillAnimDef = {
  frames: [
    { body: { x: -2, y: 0, angle: -8 }, rArm: { angle: 10 }, lArm: { angle: -10 }, rLeg: { angle: -20 }, lLeg: { angle: 5 } },
    { body: { x: 4, y: -2, angle: 5 }, rArm: { angle: 20 }, lArm: { angle: -20 }, rLeg: { angle: 60 }, lLeg: { angle: -5 } },
    { body: { x: 2, y: 0, angle: 0 }, rArm: { angle: 10 }, lArm: { angle: -10 }, rLeg: { angle: 20 }, lLeg: { angle: 0 } },
  ],
};

const STAGGER_FRAMES: SkillAnimDef = {
  frames: [
    { body: { x: -6, y: 2, angle: -15 }, rArm: { angle: -30 }, lArm: { angle: 30 }, rLeg: { angle: -10 }, lLeg: { angle: 10 } },
    { body: { x: -10, y: 4, angle: -20 }, rArm: { angle: -40 }, lArm: { angle: 40 }, rLeg: { angle: -15 }, lLeg: { angle: 15 } },
  ],
};

const IDLE_POSE = {
  body: { x: 0, y: 0, angle: 0 },
  rArm: { angle: 10 },
  lArm: { angle: -10 },
  rLeg: { angle: 0 },
  lLeg: { angle: 0 },
};

export class PlayerCharacter {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bodyGfx: Phaser.GameObjects.Graphics;
  private headGfx: Phaser.GameObjects.Graphics;
  private rArmGfx: Phaser.GameObjects.Graphics;
  private lArmGfx: Phaser.GameObjects.Graphics;
  private rLegGfx: Phaser.GameObjects.Graphics;
  private lLegGfx: Phaser.GameObjects.Graphics;

  private state: CharState = 'idle';
  private animTimer = 0;
  private currentFrame = 0;
  private currentAnim: SkillAnimDef | null = null;
  private frameInterval = 100;
  private holdTimer = 0;
  private skillIndex = -1;

  private x: number;
  private y: number;

  private inputBuffer: string[] = [];
  private firstKeyTime = 0;
  private timeoutRAF = 0;

  private onComboHit: ((skillName: string, damage: number) => void) | null = null;
  private onMiss: (() => void) | null = null;
  private onKeyInput: ((key: string) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.container = scene.add.container(x, y);

    this.bodyGfx = scene.add.graphics();
    this.headGfx = scene.add.graphics();
    this.rArmGfx = scene.add.graphics();
    this.lArmGfx = scene.add.graphics();
    this.rLegGfx = scene.add.graphics();
    this.lLegGfx = scene.add.graphics();

    this.container.add([
      this.lLegGfx, this.rLegGfx,
      this.lArmGfx, this.bodyGfx, this.rArmGfx,
      this.headGfx,
    ]);

    this.drawIdle();
  }

  setOnComboHit(cb: (skillName: string, damage: number) => void): void {
    this.onComboHit = cb;
  }

  setOnMiss(cb: () => void): void {
    this.onMiss = cb;
  }

  setOnKeyInput(cb: (key: string) => void): void {
    this.onKeyInput = cb;
  }

  getInputBuffer(): string[] {
    return this.inputBuffer;
  }

  resetInputBuffer(): void {
    this.inputBuffer = [];
    this.firstKeyTime = 0;
    this.cancelTimeout();
    this.updateKeyIndicator();
  }

  handleKey(key: string, rules: { name: string; sequence: string; damage: number }[]): void {
    if (this.state !== 'idle' && this.state !== 'attacking_a' && this.state !== 'attacking_b') return;

    key = key.toUpperCase();
    if (key !== 'A' && key !== 'B') return;

    this.inputBuffer.push(key);
    if (this.inputBuffer.length === 1) {
      this.firstKeyTime = performance.now();
      this.startTimeout();
    }

    if (this.onKeyInput) this.onKeyInput(key);
    this.updateKeyIndicator();

    if (key === 'A') {
      this.playAttack('A');
    } else {
      this.playAttack('B');
    }

    const matchResult = this.matchCombo(rules);
    if (matchResult) {
      this.cancelTimeout();
      this.inputBuffer = [];
      this.firstKeyTime = 0;
      this.updateKeyIndicator();
      this.scene.time.delayedCall(200, () => {
        this.playSkill(matchResult.name, matchResult.skillIndex);
        if (this.onComboHit) this.onComboHit(matchResult.name, matchResult.damage);
      });
    } else if (this.isNoPartialMatch(rules)) {
      this.cancelTimeout();
      this.inputBuffer = [];
      this.firstKeyTime = 0;
      this.updateKeyIndicator();
      this.playStagger();
      if (this.onMiss) this.onMiss();
    }
  }

  private matchCombo(rules: { name: string; sequence: string; damage: number }[]): { name: string; damage: number; skillIndex: number } | null {
    const buf = this.inputBuffer.join('');
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (buf === r.sequence) {
        const sIdx = DEFAULT_SKILL_NAMES.indexOf(r.name);
        return { name: r.name, damage: r.damage, skillIndex: sIdx >= 0 ? sIdx : i % DEFAULT_SKILL_NAMES.length };
      }
    }
    return null;
  }

  private isNoPartialMatch(rules: { sequence: string }[]): boolean {
    if (this.inputBuffer.length === 0) return false;
    if (rules.length === 0) return true;
    const buf = this.inputBuffer.join('');
    for (const r of rules) {
      if (r.sequence.startsWith(buf)) return false;
    }
    return true;
  }

  private startTimeout(): void {
    this.cancelTimeout();
    const check = () => {
      if (this.inputBuffer.length > 0) {
        const elapsed = performance.now() - this.firstKeyTime;
        if (elapsed >= 3000) {
          this.inputBuffer = [];
          this.firstKeyTime = 0;
          this.updateKeyIndicator();
          this.playStagger();
          if (this.onMiss) this.onMiss();
          return;
        }
      }
      this.timeoutRAF = requestAnimationFrame(check);
    };
    this.timeoutRAF = requestAnimationFrame(check);
  }

  private cancelTimeout(): void {
    if (this.timeoutRAF) {
      cancelAnimationFrame(this.timeoutRAF);
      this.timeoutRAF = 0;
    }
  }

  private updateKeyIndicator(): void {
    const el = document.getElementById('key-indicator')!;
    el.textContent = this.inputBuffer.join(' ');
  }

  private playAttack(type: 'A' | 'B'): void {
    this.state = type === 'A' ? 'attacking_a' : 'attacking_b';
    this.currentAnim = type === 'A' ? ATTACK_A_FRAMES : ATTACK_B_FRAMES;
    this.currentFrame = 0;
    this.animTimer = 0;
    this.frameInterval = 80;
  }

  private playSkill(name: string, skillIndex: number): void {
    this.state = 'skill';
    this.skillIndex = skillIndex;
    const animKey = DEFAULT_SKILL_NAMES.includes(name) ? name : DEFAULT_SKILL_NAMES[skillIndex % DEFAULT_SKILL_NAMES.length];
    this.currentAnim = SKILL_ANIMS[animKey] || SKILL_ANIMS['上勾拳'];
    this.currentFrame = 0;
    this.animTimer = 0;
    this.frameInterval = 100;
  }

  private playStagger(): void {
    this.state = 'stagger';
    this.currentAnim = STAGGER_FRAMES;
    this.currentFrame = 0;
    this.animTimer = 0;
    this.frameInterval = 200;
  }

  update(delta: number): void {
    if (this.state === 'idle') {
      this.drawIdle();
      return;
    }

    if (this.state === 'hold') {
      this.holdTimer += delta;
      if (this.holdTimer >= 500) {
        this.state = 'idle';
        this.drawIdle();
      }
      return;
    }

    if (!this.currentAnim) return;

    this.animTimer += delta;
    if (this.animTimer >= this.frameInterval) {
      this.animTimer -= this.frameInterval;
      this.currentFrame++;
      if (this.currentFrame >= this.currentAnim.frames.length) {
        this.state = 'hold';
        this.holdTimer = 0;
        this.currentFrame = this.currentAnim.frames.length - 1;
      }
    }

    this.drawFrame(this.currentAnim, this.currentFrame);
  }

  private drawIdle(): void {
    const breath = Math.sin(this.scene.time.now / 600) * 1.5;
    this.clearAll();
    this.drawBody(IDLE_POSE.body.x, IDLE_POSE.body.y + breath, IDLE_POSE.body.angle);
    this.drawHead(0, -42 + breath);
    this.drawArm(true, IDLE_POSE.rArm.angle);
    this.drawArm(false, IDLE_POSE.lArm.angle);
    this.drawLeg(true, IDLE_POSE.rLeg.angle);
    this.drawLeg(false, IDLE_POSE.lLeg.angle);
  }

  private drawFrame(anim: SkillAnimDef, frameIdx: number): void {
    const f = anim.frames[Math.min(frameIdx, anim.frames.length - 1)];
    this.clearAll();
    this.drawBody(f.body.x, f.body.y, f.body.angle);
    this.drawHead(f.body.x * 0.5, f.body.y - 42);
    this.drawArm(true, f.rArm.angle);
    this.drawArm(false, f.lArm.angle);
    this.drawLeg(true, f.rLeg.angle);
    this.drawLeg(false, f.lLeg.angle);
  }

  private clearAll(): void {
    this.bodyGfx.clear();
    this.headGfx.clear();
    this.rArmGfx.clear();
    this.lArmGfx.clear();
    this.rLegGfx.clear();
    this.lLegGfx.clear();
  }

  private drawBody(bx: number, by: number, angle: number): void {
    this.bodyGfx.save();
    this.bodyGfx.translateCanvas(bx, by);
    this.bodyGfx.rotateCanvas(Phaser.Math.DegToRad(angle));
    this.bodyGfx.fillStyle(0x3a7bd5, 1);
    this.bodyGfx.fillRoundedRect(-10, -22, 20, 34, 4);
    this.bodyGfx.fillStyle(0x2a5fa0, 1);
    this.bodyGfx.fillRoundedRect(-8, -18, 16, 10, 2);
    this.bodyGfx.restore();
  }

  private drawHead(hx: number, hy: number): void {
    this.headGfx.fillStyle(0xffcc88, 1);
    this.headGfx.fillCircle(hx, hy, 12);
    this.headGfx.fillStyle(0x333333, 1);
    this.headGfx.fillCircle(hx + 4, hy - 2, 2);
    this.headGfx.fillStyle(0xe94560, 1);
    this.headGfx.fillRect(hx - 10, hy - 14, 20, 4);
  }

  private drawArm(isRight: boolean, angle: number): void {
    const gfx = isRight ? this.rArmGfx : this.lArmGfx;
    const baseX = isRight ? 10 : -10;
    gfx.save();
    gfx.translateCanvas(baseX, -18);
    gfx.rotateCanvas(Phaser.Math.DegToRad(isRight ? angle : -angle));
    gfx.fillStyle(0x3a7bd5, 1);
    gfx.fillRoundedRect(isRight ? 0 : -6, 0, 6, 22, 3);
    gfx.fillStyle(0xffcc88, 1);
    gfx.fillCircle(isRight ? 3 : -3, 22, 4);
    gfx.restore();
  }

  private drawLeg(isRight: boolean, angle: number): void {
    const gfx = isRight ? this.rLegGfx : this.lLegGfx;
    const baseX = isRight ? 5 : -5;
    gfx.save();
    gfx.translateCanvas(baseX, 12);
    gfx.rotateCanvas(Phaser.Math.DegToRad(isRight ? angle : -angle));
    gfx.fillStyle(0x2a3a5c, 1);
    gfx.fillRoundedRect(-4, 0, 8, 24, 3);
    gfx.fillStyle(0x444444, 1);
    gfx.fillRoundedRect(-5, 22, 10, 6, 2);
    gfx.restore();
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  isIdle(): boolean {
    return this.state === 'idle';
  }

  destroy(): void {
    this.cancelTimeout();
    this.container.destroy();
  }
}

export { DEFAULT_SKILL_NAMES };
