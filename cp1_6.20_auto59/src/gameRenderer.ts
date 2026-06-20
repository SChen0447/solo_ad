import { EmotionData } from './faceCapture';
import { BattleState } from './battleSystem';

export type AnimationState = 'idle' | 'walk' | 'jump' | 'attack' | 'skill';

interface RenderState {
  animationState: AnimationState;
  prevAnimationState: AnimationState;
  transitionStart: number;
  transitionDuration: number;
  frameIndex: number;
  animTimer: number;
}

const BG_COLOR = '#2a2a2a';
const BORDER_COLOR = '#4a4a4a';
const PANEL_BG = '#1f1f1f';
const TEXT_COLOR = '#ffffff';

const SAMURAI_SCALE = 3;
const SAMURAI_SIZE = 64 * SAMURAI_SCALE;
const FRAMES_PER_ANIM = 4;
const ANIM_FRAME_DURATION = 150;
const TRANSITION_DURATION = 200;

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderState: RenderState;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private pixelCanvas: HTMLCanvasElement;
  private pixelCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.pixelCanvas = document.createElement('canvas');
    this.pixelCanvas.width = 64;
    this.pixelCanvas.height = 64;
    const pctx = this.pixelCanvas.getContext('2d');
    if (!pctx) throw new Error('Failed to get pixel canvas context');
    this.pixelCtx = pctx;
    this.pixelCtx.imageSmoothingEnabled = false;

    this.renderState = {
      animationState: 'idle',
      prevAnimationState: 'idle',
      transitionStart: 0,
      transitionDuration: TRANSITION_DURATION,
      frameIndex: 0,
      animTimer: 0
    };

    this.setupCanvas();
    this.setupMouseTracking();
    window.addEventListener('resize', () => this.setupCanvas());
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private setupMouseTracking(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
  }

  setAnimationState(state: AnimationState, now: number): void {
    if (this.renderState.animationState !== state) {
      this.renderState.prevAnimationState = this.renderState.animationState;
      this.renderState.animationState = state;
      this.renderState.transitionStart = now;
    }
  }

  render(emotion: EmotionData, battle: BattleState, now: number): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.updateAnimation(now);

    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, w, h);

    this.drawBorder(w, h);
    this.drawEmotionPanel(emotion, now);
    this.drawEnemyPanel(battle, w);
    this.drawPlayerHpBar(battle, w);
    this.drawBattleArea(battle, w, h, now);

    if (battle.battleEnded) {
      this.drawBattleEnd(battle, w, h, now);
    }

    this.drawFpsCounter(now);
  }

  private updateAnimation(now: number): void {
    if (now - this.renderState.animTimer > ANIM_FRAME_DURATION) {
      this.renderState.frameIndex = (this.renderState.frameIndex + 1) % FRAMES_PER_ANIM;
      this.renderState.animTimer = now;
    }
  }

  private drawBorder(w: number, h: number): void {
    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(4, 4, w - 8, h - 8);

    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(12, 12, w - 24, h - 24);
  }

  private drawEmotionPanel(emotion: EmotionData, now: number): void {
    const panelX = 20;
    const panelY = 20;
    const panelW = 260;
    const panelH = 160;

    this.drawPixelPanel(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.font = '12px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('EMOTION', panelX + 16, panelY + 14);

    const bars = [
      { label: 'SMILE', value: emotion.smile, color: '#22c55e', y: panelY + 44 },
      { label: 'BROW', value: emotion.browRaise, color: '#3b82f6', y: panelY + 80 },
      { label: 'MOUTH', value: emotion.mouthOpen, color: '#ef4444', y: panelY + 116 }
    ];

    bars.forEach(bar => {
      this.ctx.fillStyle = '#888';
      this.ctx.font = '8px "Press Start 2P", monospace';
      this.ctx.fillText(bar.label, panelX + 16, bar.y + 2);

      const barX = panelX + 80;
      const barY = bar.y;
      const barW = panelW - 100;
      const barH = 16;

      this.drawPixelBar(barX, barY, barW, barH, bar.value, bar.color, now);
    });
  }

  private drawPixelPanel(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = PANEL_BG;
    this.ctx.fillRect(x, y, w, h);

    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.fillStyle = BORDER_COLOR;
    for (let i = 0; i < w; i += 8) {
      this.ctx.fillRect(x + i, y, 2, 2);
      this.ctx.fillRect(x + i, y + h - 2, 2, 2);
    }
    for (let i = 0; i < h; i += 8) {
      this.ctx.fillRect(x, y + i, 2, 2);
      this.ctx.fillRect(x + w - 2, y + i, 2, 2);
    }
  }

  private drawPixelBar(x: number, y: number, w: number, h: number, value: number, color: string, now: number): void {
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(x, y, w, h);

    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, w, h);

    const fillW = Math.floor(w * value);
    if (fillW > 0) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x + 2, y + 2, fillW - 4, h - 4);

      const scrollOffset = (now / 50) % 8;
      this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = -scrollOffset; i < fillW - 4; i += 8) {
        if (i > 0) this.ctx.fillRect(x + 2 + i, y + 2, 4, h - 4);
      }
    }

    this.ctx.fillStyle = '#000';
    for (let i = 0; i < fillW; i += 4) {
      this.ctx.fillRect(x + i, y, 1, 1);
    }
  }

  private drawEnemyPanel(battle: BattleState, screenW: number): void {
    const panelW = 240;
    const panelH = 120;
    const panelX = screenW - panelW - 20;
    const panelY = 20;

    this.drawPixelPanel(panelX, panelY, panelW, panelH);

    const enemy = battle.enemy;

    const avatarSize = 48;
    const avatarX = panelX + 16;
    const avatarY = panelY + 14;

    this.ctx.fillStyle = BORDER_COLOR;
    this.ctx.fillRect(avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4);
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    this.drawPixelEnemy(avatarX, avatarY, avatarSize, enemy.color);

    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(enemy.name, panelX + 76, panelY + 16);

    this.ctx.fillStyle = '#888';
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.fillText('HP', panelX + 76, panelY + 40);

    const hpBarX = panelX + 76;
    const hpBarY = panelY + 54;
    const hpBarW = panelW - 92;
    const hpBarH = 14;
    const hpRatio = enemy.currentHp / enemy.maxHp;

    this.drawPixelBar(hpBarX, hpBarY, hpBarW, hpBarH, hpRatio, '#ef4444', performance.now());

    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.fillText(`${enemy.currentHp}/${enemy.maxHp}`, hpBarX, hpBarY + hpBarH + 6);
  }

  private drawPlayerHpBar(battle: BattleState, _screenW: number): void {
    const barW = 300;
    const barH = 20;
    const barX = 20;
    const barY = window.innerHeight - 50;

    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('PLAYER HP', barX, barY - 16);

    const hpRatio = battle.playerHp / battle.playerMaxHp;
    this.drawPixelBar(barX, barY, barW, barH, hpRatio, '#22c55e', performance.now());

    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.fillText(`${battle.playerHp}/${battle.playerMaxHp}`, barX + barW + 10, barY + 4);
  }

  private drawBattleArea(battle: BattleState, w: number, h: number, now: number): void {
    const areaW = w * 0.6;
    const areaX = (w - areaW) / 2;
    const areaY = 200;
    const areaH = h - 320;

    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(areaX, areaY, areaW, areaH);
    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(areaX, areaY, areaW, areaH);

    const groundY = areaY + areaH - 80;
    this.drawGround(areaX, groundY, areaW);

    const samuraiX = areaX + areaW * 0.25;
    const samuraiY = groundY - SAMURAI_SIZE;
    this.drawSamuraiCharacter(samuraiX, samuraiY, now, battle);

    const enemyX = areaX + areaW * 0.7 - SAMURAI_SIZE / 2;
    const enemyY = groundY - SAMURAI_SIZE;
    this.drawBattleEnemy(enemyX, enemyY, battle, now);

    this.drawDamageNumbers(battle, areaX, areaY, areaW, areaH, now);
  }

  private drawGround(x: number, y: number, w: number): void {
    this.ctx.fillStyle = '#5c4033';
    this.ctx.fillRect(x, y, w, 80);

    this.ctx.fillStyle = '#4a3428';
    for (let i = 0; i < w; i += 16) {
      this.ctx.fillRect(x + i, y, 8, 4);
      this.ctx.fillRect(x + i + 4, y + 20, 8, 4);
    }

    this.ctx.fillStyle = '#7cb342';
    for (let i = 0; i < w; i += 12) {
      this.ctx.fillRect(x + i, y - 2, 4, 4);
      this.ctx.fillRect(x + i + 6, y - 4, 2, 6);
    }
  }

  private drawSamuraiCharacter(x: number, y: number, now: number, battle: BattleState): void {
    const { animationState, prevAnimationState, transitionStart, frameIndex } = this.renderState;
    const transitionProgress = Math.min(1, (now - transitionStart) / TRANSITION_DURATION);

    const bobOffset = this.getAnimationBob(animationState, frameIndex, now);
    const actionOffset = this.getAnimationActionOffset(animationState, frameIndex, now);

    const drawX = x + actionOffset.x;
    const drawY = y + bobOffset + actionOffset.y;

    this.ctx.save();
    this.ctx.globalAlpha = 1 - transitionProgress * 0.3;
    this.drawSamuraiSprite(drawX, drawY, animationState, frameIndex, now, battle);
    this.ctx.restore();

    if (transitionProgress < 1 && prevAnimationState !== animationState) {
      this.ctx.save();
      this.ctx.globalAlpha = (1 - transitionProgress) * 0.4;
      const prevBob = this.getAnimationBob(prevAnimationState, frameIndex, now);
      const prevAction = this.getAnimationActionOffset(prevAnimationState, frameIndex, now);
      this.drawSamuraiSprite(x + prevAction.x, y + prevBob + prevAction.y, prevAnimationState, frameIndex, now, battle);
      this.ctx.restore();
    }

    if (animationState === 'skill') {
      this.drawSkillEffect(x + SAMURAI_SIZE / 2, y + SAMURAI_SIZE / 2, now);
    }
  }

  private getAnimationBob(state: AnimationState, frame: number, _now: number): number {
    switch (state) {
      case 'idle':
        return frame % 2 === 0 ? 0 : -2 * SAMURAI_SCALE;
      case 'walk':
        return [-2, 0, -2, 0][frame] * SAMURAI_SCALE;
      case 'jump':
        return [0, -30, -30, 0][frame] * SAMURAI_SCALE;
      case 'attack':
        return [0, 0, 4, 0][frame] * SAMURAI_SCALE;
      case 'skill':
        return [0, -6, -10, -6][frame] * SAMURAI_SCALE;
      default:
        return 0;
    }
  }

  private getAnimationActionOffset(state: AnimationState, frame: number, _now: number): { x: number; y: number } {
    switch (state) {
      case 'walk':
        return { x: [0, 6, 0, -6][frame] * SAMURAI_SCALE, y: 0 };
      case 'attack':
        return { x: [0, 20, 30, 10][frame] * SAMURAI_SCALE, y: 0 };
      case 'jump':
        return { x: 0, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }

  private drawSamuraiSprite(
    x: number,
    y: number,
    state: AnimationState,
    frame: number,
    _now: number,
    _battle: BattleState
  ): void {
    const ctx = this.pixelCtx;
    ctx.clearRect(0, 0, 64, 64);

    this.drawSamuraiBody(ctx, state, frame);

    this.ctx.drawImage(
      this.pixelCanvas,
      0, 0, 64, 64,
      x, y, SAMURAI_SIZE, SAMURAI_SIZE
    );
  }

  private drawSamuraiBody(ctx: CanvasRenderingContext2D, state: AnimationState, frame: number): void {
    const SKIN = '#f4c490';
    const HAIR = '#1a1a1a';
    const ROBE = '#2563eb';
    const ROBE_DARK = '#1e40af';
    const BELT = '#000000';
    const SWORD = '#d1d5db';
    const SWORD_HILT = '#92400e';
    const EYE = '#000000';

    const legOffset = state === 'walk' ? [0, -4, 0, 4][frame] : 0;
    const armOffset = state === 'walk' ? [0, 4, 0, -4][frame] : 0;
    const headTilt = state === 'jump' ? [0, -2, -3, -1][frame] : 0;

    const headY = 12 + headTilt;
    const bodyY = 26;
    const armY = 28;

    ctx.fillStyle = ROBE_DARK;
    ctx.fillRect(20, 40 + legOffset, 8, 18);
    ctx.fillRect(36, 40 - legOffset, 8, 18);

    ctx.fillStyle = '#3d2817';
    ctx.fillRect(20, 56 + legOffset, 8, 6);
    ctx.fillRect(36, 56 - legOffset, 8, 6);

    ctx.fillStyle = ROBE;
    ctx.fillRect(18, bodyY, 28, 20);
    ctx.fillStyle = ROBE_DARK;
    ctx.fillRect(18, bodyY, 4, 20);
    ctx.fillRect(42, bodyY, 4, 20);

    ctx.fillStyle = BELT;
    ctx.fillRect(18, bodyY + 16, 28, 4);

    ctx.fillStyle = SKIN;
    ctx.fillRect(22, armY + armOffset, 6, 14);
    ctx.fillRect(36, armY - armOffset, 6, 14);

    if (state === 'attack') {
      const swordAngle = [0, 20, 40, 10][frame];
      this.drawSword(ctx, 44, armY - armOffset + 4, swordAngle, SWORD, SWORD_HILT);
    } else if (state === 'skill') {
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(48, armY - armOffset, 12, 12);
      this.drawSword(ctx, 54, armY - armOffset + 8, [30, 50, 70, 40][frame], '#60a5fa', '#2563eb');
    } else {
      this.drawSword(ctx, 44, armY - armOffset + 6, -5, SWORD, SWORD_HILT);
    }

    ctx.fillStyle = SKIN;
    ctx.fillRect(22, headY, 20, 16);

    ctx.fillStyle = HAIR;
    ctx.fillRect(20, headY - 4, 24, 8);
    ctx.fillRect(18, headY, 4, 12);
    ctx.fillRect(42, headY, 4, 12);
    ctx.fillRect(20, headY + 2, 24, 2);

    ctx.fillStyle = EYE;
    ctx.fillRect(26, headY + 8, 3, 3);
    ctx.fillRect(35, headY + 8, 3, 3);

    if (state === 'jump' || state === 'skill') {
      ctx.fillStyle = EYE;
      ctx.fillRect(30, headY + 12, 4, 2);
    } else {
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(30, headY + 13, 4, 1);
    }
  }

  private drawSword(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    bladeColor: string,
    hiltColor: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    ctx.fillStyle = hiltColor;
    ctx.fillRect(-2, -2, 4, 6);

    ctx.fillStyle = bladeColor;
    ctx.fillRect(-1, -22, 2, 22);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -22, 1, 20);

    ctx.restore();
  }

  private drawPixelEnemy(x: number, y: number, size: number, color: string): void {
    const scale = size / 64;
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = color;
    for (let px = 0; px < 16; px++) {
      for (let py = 0; py < 16; py++) {
        const inCircle = (px - 7.5) ** 2 + (py - 7.5) ** 2 <= 7.5 ** 2;
        if (inCircle) {
          ctx.fillRect(
            x + px * scale * 4,
            y + py * scale * 4,
            Math.ceil(scale * 4),
            Math.ceil(scale * 4)
          );
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 12 * scale, y + 10 * scale, 6 * scale, 8 * scale);
    ctx.fillRect(x + 30 * scale, y + 10 * scale, 6 * scale, 8 * scale);

    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 14 * scale, y + 13 * scale, 3 * scale, 4 * scale);
    ctx.fillRect(x + 32 * scale, y + 13 * scale, 3 * scale, 4 * scale);

    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 16 * scale, y + 30 * scale, 20 * scale, 2 * scale);
    ctx.fillRect(x + 14 * scale, y + 28 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 36 * scale, y + 28 * scale, 2 * scale, 2 * scale);
    ctx.restore();
  }

  private drawBattleEnemy(x: number, y: number, battle: BattleState, now: number): void {
    const enemy = battle.enemy;
    let offsetY = 0;
    let shakeX = 0;

    if (enemy.state === 'idle') {
      offsetY = Math.sin(now / 400) * 4 * SAMURAI_SCALE;
    } else if (enemy.state === 'hit') {
      shakeX = (Math.random() - 0.5) * 8 * SAMURAI_SCALE;
    } else if (enemy.state === 'attacking') {
      shakeX = Math.sin(now / 50) * 4 * SAMURAI_SCALE;
    } else if (enemy.state === 'dead') {
      offsetY = 20 * SAMURAI_SCALE;
    }

    const ctx = this.ctx;
    ctx.save();

    if (enemy.state === 'dead') {
      ctx.globalAlpha = 0.4;
    }
    if (enemy.state === 'hit') {
      ctx.filter = 'brightness(2)';
    }

    const drawX = x + shakeX;
    const drawY = y + offsetY;
    const size = SAMURAI_SIZE;

    ctx.fillStyle = enemy.color;
    for (let px = 0; px < 16; px++) {
      for (let py = 0; py < 16; py++) {
        const inCircle = (px - 7.5) ** 2 + (py - 7.5) ** 2 <= 7.5 ** 2;
        if (inCircle) {
          ctx.fillRect(
            drawX + px * (size / 16),
            drawY + py * (size / 16) + size * 0.1,
            Math.ceil(size / 16),
            Math.ceil(size / 16)
          );
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(drawX + size * 0.2, drawY + size * 0.3, size * 0.15, size * 0.18);
    ctx.fillRect(drawX + size * 0.6, drawY + size * 0.3, size * 0.15, size * 0.18);

    ctx.fillStyle = '#000000';
    ctx.fillRect(drawX + size * 0.24, drawY + size * 0.36, size * 0.07, size * 0.09);
    ctx.fillRect(drawX + size * 0.64, drawY + size * 0.36, size * 0.07, size * 0.09);

    if (enemy.state === 'attacking') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(drawX + size * 0.25, drawY + size * 0.6, size * 0.5, size * 0.08);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drawX + size * (0.3 + i * 0.12), drawY + size * 0.6, size * 0.04, size * 0.06);
      }
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(drawX + size * 0.3, drawY + size * 0.62, size * 0.4, size * 0.04);
    }

    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(drawX + size * 0.2, drawY + size * 0.15);
    ctx.lineTo(drawX + size * 0.1, drawY - size * 0.1);
    ctx.lineTo(drawX + size * 0.3, drawY + size * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(drawX + size * 0.8, drawY + size * 0.15);
    ctx.lineTo(drawX + size * 0.9, drawY - size * 0.1);
    ctx.lineTo(drawX + size * 0.7, drawY + size * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawSkillEffect(x: number, y: number, now: number): void {
    const progress = (now % 800) / 800;
    const radius = 40 + progress * 80;
    const alpha = (1 - progress) * 0.6;

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = `rgba(147, 197, 253, ${alpha})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawDamageNumbers(
    battle: BattleState,
    _areaX: number,
    areaY: number,
    areaW: number,
    areaH: number,
    now: number
  ): void {
    const playerX = _areaX + areaW * 0.25 + SAMURAI_SIZE / 2;
    const enemyX = _areaX + areaW * 0.7;
    const baseY = areaY + areaH - 80 - SAMURAI_SIZE * 0.5;

    battle.damageNumbers.forEach(dmg => {
      if (now < dmg.startTime) return;
      const progress = (now - dmg.startTime) / dmg.duration;
      if (progress >= 1) return;

      const floatY = -progress * 80;
      const alpha = 1 - progress;
      const x = dmg.isPlayer ? playerX : enemyX;
      const y = baseY + floatY;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.font = `${dmg.isSkill ? 28 : 22}px "Press Start 2P", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(`-${dmg.value}`, x, y);

      this.ctx.fillStyle = dmg.isSkill ? '#fbbf24' : dmg.isPlayer ? '#ef4444' : '#ffffff';
      this.ctx.fillText(`-${dmg.value}`, x, y);

      if (dmg.isSkill) {
        this.ctx.strokeStyle = `rgba(251, 191, 36, ${alpha * 0.5})`;
        this.ctx.lineWidth = 8;
        this.ctx.strokeText(`-${dmg.value}`, x, y);
      }

      this.ctx.restore();
    });
  }

  private drawBattleEnd(battle: BattleState, w: number, h: number, _now: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.fillStyle = battle.victory ? '#4ade80' : '#ef4444';
    this.ctx.font = '48px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(battle.victory ? 'VICTORY!' : 'DEFEAT', w / 2, h / 2 - 20);

    const isHovered = this.isButtonHovered(w / 2 - 100, h / 2 + 40, 200, 50);
    this.ctx.fillStyle = isHovered ? '#60a5fa' : '#3b82f6';
    this.ctx.fillRect(w / 2 - 100, h / 2 + 40, 200, 50);
    this.ctx.strokeStyle = isHovered ? '#93c5fd' : '#2563eb';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(w / 2 - 100, h / 2 + 40, 200, 50);

    if (isHovered) {
      this.ctx.shadowColor = '#60a5fa';
      this.ctx.shadowBlur = 20;
      this.ctx.strokeRect(w / 2 - 100, h / 2 + 40, 200, 50);
      this.ctx.shadowBlur = 0;
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px "Press Start 2P", monospace';
    this.ctx.fillText('RESTART', w / 2, h / 2 + 65);
    this.ctx.restore();
  }

  private isButtonHovered(x: number, y: number, w: number, h: number): boolean {
    return this.lastMouseX >= x && this.lastMouseX <= x + w &&
           this.lastMouseY >= y && this.lastMouseY <= y + h;
  }

  getRestartButtonBounds(): { x: number; y: number; w: number; h: number } | null {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: w / 2 - 100, y: h / 2 + 40, w: 200, h: 50 };
  }

  private fpsTimes: number[] = [];
  private lastFpsUpdate = 0;
  private currentFps = 0;

  private drawFpsCounter(now: number): void {
    this.fpsTimes.push(now);
    this.fpsTimes = this.fpsTimes.filter(t => now - t < 1000);

    if (now - this.lastFpsUpdate > 500) {
      this.currentFps = this.fpsTimes.length;
      this.lastFpsUpdate = now;
    }

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '8px "Press Start 2P", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${this.currentFps}`, window.innerWidth - 20, window.innerHeight - 30);
    this.ctx.textAlign = 'left';
  }

  isRestartButtonClicked(clientX: number, clientY: number, battleEnded: boolean): boolean {
    if (!battleEnded) return false;
    const bounds = this.getRestartButtonBounds();
    if (!bounds) return false;
    return clientX >= bounds.x && clientX <= bounds.x + bounds.w &&
           clientY >= bounds.y && clientY <= bounds.y + bounds.h;
  }
}
