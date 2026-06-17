import { Character, CHAR_WIDTH, CHAR_HEIGHT } from './entities';

export const FIGHTER_COLORS = [
  '#3a7bff',
  '#ff3a5c',
  '#3aca5c',
  '#ffcc33'
] as const;

export const FIGHTER_NAMES = ['BLUE', 'RED', 'GREEN', 'YELLOW'] as const;

const CANVAS_W = 800;
const CANVAS_H = 450;
const GRASS_HEIGHT = 30;
const GROUND_Y = CANVAS_H - GRASS_HEIGHT;
const HP_BAR_WIDTH = 300;
const HP_BAR_HEIGHT = 20;
const HP_BAR_Y = 20;

export interface VisualEffect {
  type: 'hit' | 'flash';
  x: number;
  y: number;
  age: number;
  duration: number;
  frame: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private p1HpDisplay: number;
  private p2HpDisplay: number;
  private shakeX: number;
  private shakeY: number;
  private shakeAge: number;
  private shakeDuration: number;
  private flashAge: number;
  private flashDuration: number;
  private winTextAlpha: number;
  private winTextAge: number;
  private warnOffset: number;
  private brickPattern: CanvasPattern | null;
  private grassPattern: CanvasPattern | null;
  private selectAnimAge: number;
  private titleBlinkAlpha: number;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.p1HpDisplay = 100;
    this.p2HpDisplay = 100;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeAge = 0;
    this.shakeDuration = 0;
    this.flashAge = 0;
    this.flashDuration = 0;
    this.winTextAlpha = 0;
    this.winTextAge = 0;
    this.warnOffset = 0;
    this.brickPattern = null;
    this.grassPattern = null;
    this.selectAnimAge = 0;
    this.titleBlinkAlpha = 1;
    this.createPatterns();
  }

  private createPatterns(): void {
    const brickCanvas = document.createElement('canvas');
    brickCanvas.width = 64;
    brickCanvas.height = 32;
    const bctx = brickCanvas.getContext('2d')!;
    bctx.fillStyle = '#3a3a3a';
    bctx.fillRect(0, 0, 64, 32);
    bctx.fillStyle = '#2d2d2d';
    bctx.fillRect(0, 0, 30, 14);
    bctx.fillRect(34, 0, 30, 14);
    bctx.fillRect(17, 18, 30, 14);
    bctx.fillRect(51, 18, 13, 14);
    bctx.fillRect(-13, 18, 13, 14);
    bctx.strokeStyle = '#1a1a1a';
    bctx.lineWidth = 1;
    for (let i = 0; i <= 32; i += 16) {
      bctx.beginPath();
      bctx.moveTo(0, i);
      bctx.lineTo(64, i);
      bctx.stroke();
    }
    for (let i = 0; i <= 64; i += 32) {
      bctx.beginPath();
      bctx.moveTo(i, 0);
      bctx.lineTo(i, 16);
      bctx.stroke();
    }
    for (let i = 16; i <= 64; i += 32) {
      bctx.beginPath();
      bctx.moveTo(i, 16);
      bctx.lineTo(i, 32);
      bctx.stroke();
    }
    this.brickPattern = this.ctx.createPattern(brickCanvas, 'repeat');

    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 16;
    grassCanvas.height = GRASS_HEIGHT;
    const gctx = grassCanvas.getContext('2d')!;
    gctx.fillStyle = '#2d8a3e';
    gctx.fillRect(0, 0, 16, GRASS_HEIGHT);
    gctx.fillStyle = '#3ca850';
    for (let i = 0; i < 16; i += 4) {
      gctx.fillRect(i, 0, 2, 4);
      gctx.fillRect(i + 1, 2, 1, 3);
    }
    gctx.fillStyle = '#1f6a2e';
    gctx.fillRect(0, GRASS_HEIGHT - 6, 16, 6);
    this.grassPattern = this.ctx.createPattern(grassCanvas, 'repeat');
  }

  public resetHpDisplay(): void {
    this.p1HpDisplay = 100;
    this.p2HpDisplay = 100;
    this.winTextAlpha = 0;
    this.winTextAge = 0;
  }

  public triggerScreenShake(): void {
    this.shakeDuration = 100;
    this.shakeAge = 0;
  }

  public triggerFlash(): void {
    this.flashDuration = 100;
    this.flashAge = 0;
  }

  public render(
    dt: number,
    p1: Character,
    p2: Character,
    effects: VisualEffect[],
    timeLeft: number,
    showWarning: boolean,
    warningAge: number,
    gameOver: boolean,
    winnerText: string | null,
    restartHovered: boolean
  ): void {
    const ctx = this.ctx;

    this.updateHpDisplay(dt, p1.hp, p2.hp);
    this.updateShake(dt);
    this.updateFlash(dt);
    if (gameOver) {
      this.winTextAge += dt;
      this.winTextAlpha = Math.min(1, this.winTextAge / 500);
    }
    this.warnOffset = Math.sin((warningAge / 1000) * Math.PI) * 5;

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    this.drawBackground();
    this.drawHpBars(p1.hp, p2.hp);
    this.drawTimer(timeLeft);
    this.drawCharacter(p1);
    this.drawCharacter(p2);
    this.drawEffects(effects);

    if (showWarning && warningAge < 5000) {
      this.drawWarning();
    }

    if (this.flashAge < this.flashDuration) {
      const a = (1 - this.flashAge / this.flashDuration) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }

    if (gameOver) {
      this.drawGameOver(winnerText, restartHovered);
    }

    ctx.restore();
  }

  private updateHpDisplay(dt: number, p1Hp: number, p2Hp: number): void {
    const speed = dt / 300;
    if (this.p1HpDisplay > p1Hp) {
      this.p1HpDisplay = Math.max(p1Hp, this.p1HpDisplay - 100 * speed);
    }
    if (this.p2HpDisplay > p2Hp) {
      this.p2HpDisplay = Math.max(p2Hp, this.p2HpDisplay - 100 * speed);
    }
    if (this.p1HpDisplay < p1Hp) this.p1HpDisplay = p1Hp;
    if (this.p2HpDisplay < p2Hp) this.p2HpDisplay = p2Hp;
  }

  private updateShake(dt: number): void {
    if (this.shakeAge < this.shakeDuration) {
      this.shakeAge += dt;
      const t = 1 - this.shakeAge / this.shakeDuration;
      const intensity = 5 * t;
      this.shakeX = (Math.random() - 0.5) * 2 * intensity;
      this.shakeY = (Math.random() - 0.5) * 2 * intensity;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  private updateFlash(dt: number): void {
    if (this.flashAge < this.flashDuration) {
      this.flashAge += dt;
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    if (this.brickPattern) {
      ctx.fillStyle = this.brickPattern;
      ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, GROUND_Y - 2, CANVAS_W, 2);
    if (this.grassPattern) {
      ctx.fillStyle = this.grassPattern;
      ctx.fillRect(0, GROUND_Y, CANVAS_W, GRASS_HEIGHT);
    }
  }

  private drawHpBars(_p1Hp: number, _p2Hp: number): void {
    const ctx = this.ctx;
    const p1X = 20;
    const p2X = CANVAS_W - 20 - HP_BAR_WIDTH;

    ctx.fillStyle = '#000';
    ctx.fillRect(p1X - 2, HP_BAR_Y - 2, HP_BAR_WIDTH + 4, HP_BAR_HEIGHT + 4);
    ctx.fillRect(p2X - 2, HP_BAR_Y - 2, HP_BAR_WIDTH + 4, HP_BAR_HEIGHT + 4);

    ctx.fillStyle = '#555';
    ctx.fillRect(p1X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    ctx.fillRect(p2X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);

    const p1Fill = (this.p1HpDisplay / 100) * HP_BAR_WIDTH;
    const p2Fill = (this.p2HpDisplay / 100) * HP_BAR_WIDTH;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(p1X, HP_BAR_Y, p1Fill, HP_BAR_HEIGHT);
    ctx.fillStyle = '#4466ff';
    ctx.fillRect(p2X + HP_BAR_WIDTH - p2Fill, HP_BAR_Y, p2Fill, HP_BAR_HEIGHT);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(p1X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    ctx.strokeRect(p2X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('P1', p1X + 6, HP_BAR_Y + HP_BAR_HEIGHT / 2);
    ctx.textAlign = 'right';
    ctx.fillText('P2', p2X + HP_BAR_WIDTH - 6, HP_BAR_Y + HP_BAR_HEIGHT / 2);
  }

  private drawTimer(timeLeft: number): void {
    const ctx = this.ctx;
    const seconds = Math.ceil(timeLeft / 1000);
    const x = CANVAS_W / 2;
    const y = HP_BAR_Y + HP_BAR_HEIGHT / 2;

    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#05d9e8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(String(seconds), x, y);
    ctx.fillText(String(seconds), x, y);
  }

  private drawCharacter(c: Character): void {
    const ctx = this.ctx;
    const alpha = c.getHurtAlpha();
    ctx.save();
    ctx.globalAlpha = alpha;

    const x = c.x;
    const y = c.y;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';

    if (c.state === 'defending') {
      ctx.fillStyle = '#555';
      ctx.fillRect(x - 2, y + 10, 6, CHAR_HEIGHT - 20);
    }

    ctx.fillStyle = c.color;
    ctx.fillRect(x, y, CHAR_WIDTH, CHAR_HEIGHT);
    ctx.strokeRect(x + 1, y + 1, CHAR_WIDTH - 2, CHAR_HEIGHT - 2);

    ctx.fillStyle = '#fff';
    const eyeX = c.facing === 1 ? x + CHAR_WIDTH - 16 : x + 8;
    ctx.fillRect(eyeX, y + 14, 6, 6);
    ctx.fillRect(eyeX + 10, y + 14, 6, 6);
    ctx.fillStyle = '#000';
    const pupilOffset = c.facing === 1 ? 2 : 0;
    ctx.fillRect(eyeX + pupilOffset, y + 16, 2, 2);
    ctx.fillRect(eyeX + 10 + pupilOffset, y + 16, 2, 2);

    const atkProg = c.getAttackProgress();
    if (atkProg > 0) {
      const extend = Math.sin(Math.min(1, atkProg / 0.5) * Math.PI) * 25;
      const armX = c.facing === 1 ? x + CHAR_WIDTH : x - extend;
      const armY = y + 28;
      ctx.fillStyle = c.state === 'skilling' ? '#ffaa00' : c.color;
      ctx.fillRect(armX, armY, extend, 10);
      ctx.strokeRect(armX + 1, armY + 1, extend - 2, 8);
      if (c.state === 'skilling') {
        ctx.fillStyle = 'rgba(255, 200, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(c.facing === 1 ? armX + extend : armX, armY + 5, 14 + extend * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (c.state === 'moving') {
      const bob = Math.sin(Date.now() / 80) * 2;
      ctx.fillStyle = c.color;
      ctx.fillRect(x + 4, y + CHAR_HEIGHT, 10, 4 + bob);
      ctx.fillRect(x + CHAR_WIDTH - 14, y + CHAR_HEIGHT, 10, 4 - bob);
    }

    ctx.restore();
  }

  private drawEffects(effects: VisualEffect[]): void {
    const ctx = this.ctx;
    for (const e of effects) {
      if (e.type === 'hit') {
        const t = e.age / e.duration;
        if (t >= 1) continue;
        const size = 8 + t * 16;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(t * Math.PI * 0.5);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1 - t;
        for (let i = 0; i < 8; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / 8);
          ctx.beginPath();
          ctx.moveTo(0, -size * 0.3);
          ctx.lineTo(0, -size);
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = `rgba(255, ${Math.floor(200 * (1 - t))}, 0, ${0.7 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawWarning(): void {
    const ctx = this.ctx;
    const y = 70 + this.warnOffset;
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeText('Time is running out!', CANVAS_W / 2, y);
    ctx.fillText('Time is running out!', CANVAS_W / 2, y);
  }

  private drawGameOver(winnerText: string | null, restartHovered: boolean): void {
    const ctx = this.ctx;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * this.winTextAlpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (winnerText) {
      ctx.save();
      ctx.globalAlpha = this.winTextAlpha;
      ctx.font = '48px "Press Start 2P", monospace';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(winnerText, cx, cy - 40);
      ctx.fillText(winnerText, cx, cy - 40);
      ctx.restore();
    }

    const btnW = 180;
    const btnH = 50;
    const btnX = cx - btnW / 2;
    const btnY = cy + 30;

    ctx.save();
    ctx.globalAlpha = this.winTextAlpha;
    ctx.fillStyle = restartHovered ? '#ff6666' : '#ff4444';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESTART', cx, btnY + btnH / 2);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public isRestartButton(mx: number, my: number): boolean {
    const cx = CANVAS_W / 2;
    const btnW = 180;
    const btnH = 50;
    const btnX = cx - btnW / 2;
    const btnY = CANVAS_H / 2 + 30;
    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
  }

  public isFightButton(mx: number, my: number): boolean {
    const cx = CANVAS_W / 2;
    const btnW = 220;
    const btnH = 60;
    const btnX = cx - btnW / 2;
    const btnY = CANVAS_H - 110;
    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
  }

  public renderSelectScreen(
    dt: number,
    p1ColorIdx: number,
    p2ColorIdx: number,
    canStart: boolean,
    sameColor: boolean,
    bothSelected: boolean,
    fightHovered: boolean
  ): void {
    const ctx = this.ctx;
    this.selectAnimAge += dt;
    const titleBob = Math.sin(this.selectAnimAge / 400) * 4;
    this.titleBlinkAlpha = 0.7 + Math.sin(this.selectAnimAge / 250) * 0.3;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < CANVAS_W; i += 50) {
      ctx.strokeStyle = '#05d9e8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_H);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_H; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_W, i);
      ctx.stroke();
    }
    ctx.restore();

    const cx = CANVAS_W / 2;

    ctx.save();
    ctx.font = '32px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff2a6d';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const titleY = 30 + titleBob;
    ctx.strokeText('SELECT YOUR FIGHTER', cx, titleY);
    ctx.fillText('SELECT YOUR FIGHTER', cx, titleY);
    ctx.restore();

    this.drawFighterPreview(180, 180, FIGHTER_COLORS[p1ColorIdx], 1, p1ColorIdx, '#05d9e8');
    this.drawFighterPreview(620, 180, FIGHTER_COLORS[p2ColorIdx], -1, p2ColorIdx, '#ff2a6d');

    ctx.save();
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#05d9e8';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    const p1NameY = 250;
    ctx.strokeText('P1 - ' + FIGHTER_NAMES[p1ColorIdx], 180, p1NameY);
    ctx.fillText('P1 - ' + FIGHTER_NAMES[p1ColorIdx], 180, p1NameY);

    ctx.fillStyle = '#ff2a6d';
    ctx.strokeText('P2 - ' + FIGHTER_NAMES[p2ColorIdx], 620, p1NameY);
    ctx.fillText('P2 - ' + FIGHTER_NAMES[p2ColorIdx], 620, p1NameY);
    ctx.restore();

    this.drawColorButtons(180, 300, p1ColorIdx, '#05d9e8');
    this.drawColorButtons(620, 300, p2ColorIdx, '#ff2a6d');

    ctx.save();
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#aaa';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeText('A / D  TO SELECT', 180, 380);
    ctx.fillText('A / D  TO SELECT', 180, 380);
    ctx.strokeText('ARROWS TO SELECT', 620, 380);
    ctx.fillText('ARROWS TO SELECT', 620, 380);
    ctx.restore();

    if (canStart) {
      const btnW = 220;
      const btnH = 60;
      const btnX = cx - btnW / 2;
      const btnY = CANVAS_H - 110;
      const pulse = Math.sin(this.selectAnimAge / 150) * 2;

      ctx.save();
      ctx.fillStyle = fightHovered ? '#ff6666' : '#ff4444';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3 + pulse;
      ctx.shadowColor = '#ff2a6d';
      ctx.shadowBlur = 16 * this.titleBlinkAlpha;
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.font = '22px "Press Start 2P", monospace';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText('FIGHT!', cx, btnY + btnH / 2);
      ctx.fillText('FIGHT!', cx, btnY + btnH / 2);
      ctx.restore();
    } else {
      let hintText = '';
      let hintColor = '#666';
      if (!bothSelected) {
        hintText = 'BOTH PLAYERS MUST SELECT';
        hintColor = '#888';
      } else if (sameColor) {
        hintText = 'PLEASE CHOOSE DIFFERENT COLORS';
        hintColor = '#ff6b6b';
      }
      ctx.save();
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillStyle = hintColor;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const y = CANVAS_H - 80;
      ctx.strokeText(hintText, cx, y);
      ctx.fillText(hintText, cx, y);
      ctx.restore();
    }
  }

  private drawFighterPreview(
    cx: number,
    cy: number,
    color: string,
    facing: 1 | -1,
    colorIdx: number,
    glowColor: string
  ): void {
    const ctx = this.ctx;
    const pulse = Math.sin((this.selectAnimAge + colorIdx * 200) / 300) * 0.15 + 1;
    const scale = 1.8 * pulse;

    const mock = {
      x: -CHAR_WIDTH / 2,
      y: -CHAR_HEIGHT / 2,
      color,
      facing,
      state: 'idle' as const,
      playerId: 0,
      getHurtAlpha: () => 1,
      getAttackProgress: () => 0,
      hp: 100,
      maxHp: 100,
      vx: 0,
      vy: 0
    } as unknown as Character;

    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    this.drawCharacter(mock);
    ctx.restore();
  }

  private drawColorButtons(cx: number, cy: number, selected: number, accent: string): void {
    const ctx = this.ctx;
    const btnSize = 42;
    const gap = 14;
    const totalW = FIGHTER_COLORS.length * btnSize + (FIGHTER_COLORS.length - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < FIGHTER_COLORS.length; i++) {
      const bx = startX + i * (btnSize + gap);
      const by = cy;
      const isSelected = i === selected;

      ctx.save();
      if (isSelected) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 14;
        ctx.fillStyle = FIGHTER_COLORS[i];
        ctx.fillRect(bx - 4, by - 4, btnSize + 8, btnSize + 8);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx - 4, by - 4, btnSize + 8, btnSize + 8);
      }

      ctx.fillStyle = FIGHTER_COLORS[i];
      ctx.fillRect(bx, by, btnSize, btnSize);
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, btnSize - 2, btnSize - 2);

      if (isSelected) {
        const arrowY = by - 12;
        ctx.fillStyle = accent;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 1, arrowY - 10);
        ctx.lineTo(cx - 9, arrowY);
        ctx.lineTo(cx + 7, arrowY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const arrowY2 = by + btnSize + 12;
        ctx.beginPath();
        ctx.moveTo(cx - 1, arrowY2 + 10);
        ctx.lineTo(cx - 9, arrowY2);
        ctx.lineTo(cx + 7, arrowY2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
