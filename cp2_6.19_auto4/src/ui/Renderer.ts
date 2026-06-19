import type {
  GameState,
  Card,
  CardRect,
} from '../types/game';

const BASE_W = 1440;
const BASE_H = 900;

const CARD_W = 140;
const CARD_H = 200;
const CARD_GAP = 20;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private hoveredCardId: string | null = null;
  private pressedCardId: string | null = null;
  private lastCardRects: CardRect[] = [];
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private uiScale: number = 1;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private stars: { x: number; y: number; r: number; a: number; s: number }[];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;

    this.bgCanvas = document.createElement('canvas');
    const bgCtx = this.bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Offscreen canvas not supported');
    this.bgCtx = bgCtx;

    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * BASE_W,
        y: Math.random() * BASE_H,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.8 + 0.2,
        s: Math.random() * 0.02 + 0.005,
      });
    }

    this.updateViewport();
    this.renderStaticBackground();
    window.addEventListener('resize', () => this.updateViewport());
  }

  private updateViewport(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio;
    this.canvas.width = vw * dpr;
    this.canvas.height = vh * dpr;
    this.canvas.style.width = vw + 'px';
    this.canvas.style.height = vh + 'px';

    let scale = Math.min(vw / BASE_W, vh / BASE_H);
    const minScale = Math.min(1024 / BASE_W, 768 / BASE_H);
    scale = Math.max(scale, minScale * 0.9);

    this.uiScale = Math.max(0.75, Math.min(1.25, scale));

    this.scale = scale * dpr;
    this.offsetX = ((vw - BASE_W * scale) / 2) * dpr;
    this.offsetY = ((vh - BASE_H * scale) / 2) * dpr;
  }

  private applyTransform(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
  }

  private fs(size: number): number {
    return size * this.uiScale;
  }

  private sz(size: number): number {
    return size * this.uiScale;
  }

  private renderStaticBackground(): void {
    this.bgCanvas.width = BASE_W;
    this.bgCanvas.height = BASE_H;
    const ctx = this.bgCtx;

    const grad = ctx.createRadialGradient(
      BASE_W / 2,
      BASE_H / 2,
      100,
      BASE_W / 2,
      BASE_H / 2,
      900
    );
    grad.addColorStop(0, '#252547');
    grad.addColorStop(0.4, '#1a1a2e');
    grad.addColorStop(1, '#0d0d18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    ctx.strokeStyle = 'rgba(0, 217, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < BASE_W; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, BASE_H);
      ctx.stroke();
    }
    for (let j = 0; j < BASE_H; j += 80) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(BASE_W, j);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, BASE_W - 32, BASE_H - 32);
  }

  setHoveredCard(cardId: string | null): void {
    this.hoveredCardId = cardId;
  }
  setPressedCard(cardId: string | null): void {
    this.pressedCardId = cardId;
  }

  getCardAtPoint(x: number, y: number): Card | null {
    for (let i = this.lastCardRects.length - 1; i >= 0; i--) {
      const r = this.lastCardRects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        const gameState = (window as unknown as { __lastState?: GameState }).__lastState;
        if (gameState) {
          const c = gameState.player.hand.find((c) => c.id === r.cardId);
          return c || null;
        }
      }
    }
    return null;
  }

  getEndTurnBtnAt(x: number, y: number, state: GameState): boolean {
    const r = state.endTurnBtnRect;
    if (!r) return false;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  getRestartBtnAt(x: number, y: number, state: GameState): boolean {
    const r = state.restartBtnRect;
    if (!r) return false;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  screenToVirtual(x: number, y: number): { x: number; y: number } {
    const vx = (x * window.devicePixelRatio - this.offsetX) / this.scale;
    const vy = (y * window.devicePixelRatio - this.offsetY) / this.scale;
    return { x: vx, y: vy };
  }

  draw(state: GameState): void {
    (window as unknown as { __lastState?: GameState }).__lastState = state;
    this.applyTransform();
    const ctx = this.ctx;
    const now = performance.now();

    ctx.clearRect(-200, -200, BASE_W + 400, BASE_H + 400);

    this.drawBackground(ctx, now);
    this.drawBattlefield(ctx, state, now);
    this.drawAIInfo(ctx, state, now);
    this.drawPlayerInfo(ctx, state, now);
    this.drawHand(ctx, state, now);
    this.drawHUD(ctx, state, now);
    this.drawFloatingTexts(ctx, state, now);
    this.drawTurnMessage(ctx, state, now);
    this.drawAnimations(ctx, state, now);

    if (state.phase !== 'playing') {
      this.drawVictoryModal(ctx, state, now);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, now: number): void {
    ctx.drawImage(this.bgCanvas, 0, 0);

    ctx.save();
    for (const s of this.stars) {
      const tw = 0.5 + Math.sin(now * s.s + s.x) * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${s.a * tw})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  private drawBattlefield(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    ctx.save();
    const bx = BASE_W / 2 - 200;
    const by = 320;
    const bw = 400;
    const bh = 260;

    const glow = 0.5 + Math.sin(now * 0.002) * 0.2;
    ctx.shadowColor = 'rgba(0, 217, 255, ' + (glow * 0.4) + ')';
    ctx.shadowBlur = 30;

    const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    grad.addColorStop(0, 'rgba(20, 30, 60, 0.85)');
    grad.addColorStop(1, 'rgba(30, 20, 60, 0.85)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, bx, by, bw, bh, 20);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(0, 217, 255, ${0.25 + glow * 0.25})`;
    ctx.lineWidth = 2;
    this.roundRect(ctx, bx, by, bw, bh, 20);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + 20, by + 40 + i * 30);
      ctx.lineTo(bx + bw - 20, by + 40 + i * 30);
      ctx.stroke();
    }
    ctx.restore();

    if (state.battlefieldCard) {
      const elapsed = state.battlefieldCardStartTime
        ? now - state.battlefieldCardStartTime
        : 900;
      let scale = 1;
      let alpha = 1;
      let rot = 0;
      if (elapsed < 300) {
        const t = elapsed / 300;
        scale = 0.4 + t * 0.8;
        alpha = t;
        rot = (1 - t) * 0.3;
      } else if (elapsed > 700) {
        const t = (elapsed - 700) / 200;
        alpha = Math.max(0, 1 - t);
        scale = 1 + t * 0.3;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(BASE_W / 2, 450);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      this.drawCardFace(ctx, state.battlefieldCard, -CARD_W / 2, -CARD_H / 2, 1, false);
      ctx.restore();
    }
  }

  private drawAIInfo(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const cx = 1220;
    const cy = 140;
    const flashing = state.aiFlashEndTime !== undefined && now < state.aiFlashEndTime;
    this.drawAvatar(ctx, cx, cy, 60, flashing, 'ai');
    this.drawHpBar(ctx, cx + 90, cy - 30, 220, 24, state.ai.hp, state.ai.maxHp, '#ff4757');
    this.drawArmorBadge(ctx, cx + 90, cy + 10, state.ai.armor);
    this.drawEnergyBadge(ctx, cx + 200, cy + 10, state.ai.energy, state.ai.maxEnergy, '#ffd700');

    ctx.font = `bold ${this.fs(22)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI 对手', cx + 90, cy - 55);

    this.drawAICardBacks(ctx, state.ai.hand.length, now);
  }

  private drawPlayerInfo(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const cx = 220;
    const cy = 640;
    const flashing = state.playerFlashEndTime !== undefined && now < state.playerFlashEndTime;
    this.drawAvatar(ctx, cx, cy, 60, flashing, 'player');
    this.drawHpBar(ctx, cx + 90, cy - 30, 220, 24, state.player.hp, state.player.maxHp, '#52b788');
    this.drawArmorBadge(ctx, cx + 90, cy + 10, state.player.armor);

    ctx.font = `bold ${this.fs(22)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#00d9ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('你', cx + 90, cy - 55);
  }

  private drawAvatar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    flash: boolean,
    who: 'player' | 'ai'
  ): void {
    ctx.save();
    ctx.shadowColor = who === 'player' ? 'rgba(0, 217, 255, 0.7)' : 'rgba(255, 107, 107, 0.7)';
    ctx.shadowBlur = flash ? 40 : 20;

    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = flash
      ? '#ff4757'
      : who === 'player'
      ? '#00d9ff'
      : '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.stroke();

    const grad = ctx.createRadialGradient(x - 10, y - 10, 10, x, y, r);
    if (flash) {
      grad.addColorStop(0, '#ffe0e6');
      grad.addColorStop(1, '#ff4757');
    } else if (who === 'player') {
      grad.addColorStop(0, '#6ee7ff');
      grad.addColorStop(1, '#1a3a52');
    } else {
      grad.addColorStop(0, '#ffb3b3');
      grad.addColorStop(1, '#5c1f1f');
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.font = `bold ${this.fs(36)}px "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(who === 'player' ? '\u{1F9D9}' : '\u{1F916}', x, y + 2);
    ctx.restore();
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    hp: number,
    maxHp: number,
    color: string
  ): void {
    ctx.save();
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const ratio = Math.max(0, hp / maxHp);
    const fw = (w - 4) * ratio;
    if (fw > 0) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, this.darken(color, 0.5));
      this.roundRect(ctx, x + 2, y + 2, fw, h - 4, 6);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      this.roundRect(ctx, x + 2, y + 2, Math.min(fw, 20), h - 4, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = 0;
      ctx.fill();
    }

    ctx.font = `bold ${this.fs(14)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${hp} / ${maxHp}`, x + w / 2, y + h / 2);
    ctx.restore();
  }

  private drawArmorBadge(ctx: CanvasRenderingContext2D, x: number, y: number, armor: number): void {
    ctx.save();
    const size = this.sz(36);
    this.roundRect(ctx, x, y, size, size, 8);
    ctx.fillStyle = 'rgba(74, 158, 255, 0.25)';
    ctx.fill();
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `${this.fs(18)}px "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F6E1}', x + size / 2, y + size / 2 - 2);
    ctx.font = `bold ${this.fs(13)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#4a9eff';
    ctx.fillText(String(armor), x + size / 2, y + size / 2 + 14);
    ctx.restore();
  }

  private drawEnergyBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    energy: number,
    maxEnergy: number,
    _color: string
  ): void {
    ctx.save();
    for (let i = 0; i < maxEnergy; i++) {
      const sx = x + i * this.sz(26);
      const size = this.sz(22);
      this.roundRect(ctx, sx, y + 6, size, size, 6);
      if (i < energy) {
        const grad = ctx.createLinearGradient(sx, y + 6, sx, y + 6 + size);
        grad.addColorStop(0, '#fff3a0');
        grad.addColorStop(1, '#ffb800');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(255,215,0,0.6)';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = i < energy ? '#ffd700' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (i < energy) {
        ctx.font = `bold ${this.fs(12)}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#3d2a00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u26A1', sx + size / 2, y + 6 + size / 2);
      }
    }
    ctx.restore();
  }

  private drawAICardBacks(ctx: CanvasRenderingContext2D, count: number, _now: number): void {
    ctx.save();
    const baseX = 620;
    const baseY = 60;
    const offset = Math.min(30, 500 / Math.max(1, count));
    for (let i = 0; i < count; i++) {
      const x = baseX + i * offset;
      const y = baseY + Math.sin(i * 0.5) * 4;
      this.drawCardBack(ctx, x, y, 70, 100);
    }
    ctx.restore();
  }

  private drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    this.roundRect(ctx, x, y, w, h, 10);
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#533483');
    grad.addColorStop(0.5, '#3a1e66');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(140, 100, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#8a5cff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 6);
    ctx.stroke();

    ctx.font = 'bold ' + Math.floor(w * 0.5) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{2605}', x + w / 2, y + h / 2);
  }

  private drawHand(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    this.lastCardRects = [];
    const hand = state.player.hand;
    const total = hand.length;
    if (total === 0) return;

    const totalWidth = CARD_W * total + CARD_GAP * (total - 1);
    let startX = (BASE_W - totalWidth) / 2;
    const maxWidth = BASE_W - 200;
    let gap = CARD_GAP;
    let cardW = CARD_W;

    if (totalWidth > maxWidth) {
      cardW = Math.max(90, (maxWidth - CARD_GAP * (total - 1)) / total);
      gap = CARD_GAP;
      const newTotal = cardW * total + gap * (total - 1);
      startX = (BASE_W - newTotal) / 2;
    }

    const baseY = 700;

    for (let i = 0; i < total; i++) {
      const card = hand[i];
      const isHovered = this.hoveredCardId === card.id;
      const isPressed = this.pressedCardId === card.id;
      const disabled = card.energyCost > state.player.energy || state.turnPhase !== 'player_action';
      let dx = startX + i * (cardW + gap);
      let dy = baseY;
      let scale = cardW / CARD_W;
      if (isHovered && !disabled) {
        dy -= 30;
        scale *= 1.12;
      }
      if (isPressed && !disabled) {
        dy += 8;
        scale *= 0.96;
      }
      const bob = Math.sin(now * 0.003 + i * 0.7) * (isHovered ? 0 : 2);
      dy += bob;

      const w = CARD_W * scale;
      const h = CARD_H * scale;
      this.drawCardFace(ctx, card, dx, dy, scale, disabled);
      this.lastCardRects.push({ cardId: card.id, x: dx, y: dy, w, h });
    }
  }

  private drawCardFace(
    ctx: CanvasRenderingContext2D,
    card: Card,
    x: number,
    y: number,
    scale: number,
    disabled: boolean
  ): void {
    const w = CARD_W * scale;
    const h = CARD_H * scale;

    ctx.save();
    const alpha = disabled ? 0.45 : 1;
    ctx.globalAlpha = alpha;

    this.roundRect(ctx, x, y, w, h, 14 * scale);

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, this.lighten(card.color, 0.35));
    grad.addColorStop(1, card.color);
    ctx.fillStyle = grad;
    ctx.shadowColor = card.borderColor;
    ctx.shadowBlur = disabled ? 4 : 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = card.borderColor;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    this.roundRect(ctx, x + 4 * scale, y + 4 * scale, w - 8 * scale, h * 0.32, 10 * scale);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    this.roundRect(ctx, x + 4 * scale, y + h * 0.36, w - 8 * scale, h * 0.32, 8 * scale);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.roundRect(ctx, x + 4 * scale, y + h * 0.7, w - 8 * scale, h * 0.26, 8 * scale);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 16 * scale, y + 16 * scale, 16 * scale, 0, Math.PI * 2);
    const eGrad = ctx.createRadialGradient(
      x + 14 * scale,
      y + 14 * scale,
      2 * scale,
      x + 16 * scale,
      y + 16 * scale,
      16 * scale
    );
    eGrad.addColorStop(0, '#fff3a0');
    eGrad.addColorStop(1, '#ffb800');
    ctx.fillStyle = eGrad;
    ctx.shadowColor = 'rgba(255,215,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
    ctx.font = 'bold ' + Math.floor(18 * scale) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = '#3d2a00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(card.energyCost), x + 16 * scale, y + 16 * scale + 1);
    ctx.restore();

    ctx.font = Math.floor(38 * scale) + 'px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(card.icon, x + w / 2, y + h * 0.24);
    ctx.shadowBlur = 0;

    ctx.font = 'bold ' + Math.floor(13 * scale) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(card.name, x + w / 2, y + h * 0.48);
    ctx.shadowBlur = 0;

    ctx.font = 'bold ' + Math.floor(26 * scale) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = this.typeAccent(card.type);
    ctx.shadowColor = this.typeAccent(card.type);
    ctx.shadowBlur = 8;
    ctx.fillText(String(card.value), x + w / 2, y + h * 0.68);
    ctx.shadowBlur = 0;

    ctx.font = Math.floor(10 * scale) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    const desc = this.wrapText(ctx, card.description, w - 12 * scale);
    const lineH = 12 * scale;
    const startYY = y + h * 0.82 - ((desc.length - 1) * lineH) / 2;
    for (let li = 0; li < desc.length; li++) {
      ctx.fillText(desc[li], x + w / 2, startYY + li * lineH);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const lines: string[] = [];
    let cur = '';
    for (const ch of text) {
      const test = cur + ch;
      if (ctx.measureText(test).width > maxW && cur.length > 0) {
        lines.push(cur);
        cur = ch;
      } else {
        cur = test;
      }
    }
    if (cur.length > 0) lines.push(cur);
    return lines;
  }

  private typeAccent(type: string): string {
    if (type === 'attack') return '#ff8a95';
    if (type === 'defense') return '#8ac4ff';
    return '#a0e6b8';
  }

  private drawHUD(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    ctx.save();
    const bx = 40;
    const by = 40;
    const bw = 170;
    const bh = 60;
    this.roundRect(ctx, bx, by, bw, bh, 12);
    ctx.fillStyle = 'rgba(10,10,30,0.75)';
    ctx.fill();
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,217,255,0.5)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = `bold ${this.fs(16)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('回合', bx + 20, by + 22);
    ctx.font = `bold ${this.fs(30)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#00d9ff';
    ctx.fillText(String(state.turn), bx + 80, by + 38);

    const ex = BASE_W - 240;
    const ey = 40;
    const ew = 200;
    const eh = 60;
    this.roundRect(ctx, ex, ey, ew, eh, 12);
    ctx.fillStyle = 'rgba(10,10,30,0.75)';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = `bold ${this.fs(16)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('能量', ex + 20, ey + 22);
    for (let i = 0; i < state.player.maxEnergy; i++) {
      const sx = ex + 85 + i * this.sz(34);
      const sy = ey + 16;
      const size = this.sz(28);
      this.roundRect(ctx, sx, sy, size, size, 8);
      if (i < state.player.energy) {
        const g = ctx.createLinearGradient(sx, sy, sx, sy + size);
        g.addColorStop(0, '#fff3a0');
        g.addColorStop(1, '#ffb800');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(255,215,0,0.6)';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = i < state.player.energy ? '#ffd700' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (i < state.player.energy) {
        ctx.font = `bold ${this.fs(14)}px "Segoe UI", sans-serif`;
        ctx.fillStyle = '#3d2a00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u26A1', sx + size / 2, sy + size / 2);
      }
    }

    ctx.restore();
    this.drawEndTurnButton(ctx, state, now);
  }

  private drawEndTurnButton(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const bx = BASE_W - 200;
    const by = 580;
    const bw = this.sz(140);
    const bh = this.sz(50);
    state.endTurnBtnRect = { x: bx, y: by, w: bw, h: bh };
    const active = state.turnPhase === 'player_action' && state.phase === 'playing';
    const pulse = 0.5 + Math.sin(now * 0.004) * 0.5;

    ctx.save();
    this.roundRect(ctx, bx, by, bw, bh, 12);
    if (active) {
      const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
      grad.addColorStop(0, '#00d9ff');
      grad.addColorStop(1, '#0088cc');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0,217,255,' + (0.4 + pulse * 0.5) + ')';
      ctx.shadowBlur = 20 + pulse * 10;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? '#7aedff' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold ${this.fs(18)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = active ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('结束回合', bx + bw / 2, by + bh / 2);
    ctx.restore();
  }

  private drawTurnMessage(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    if (!state.message || !state.messageStartTime || !state.messageDuration) return;
    const elapsed = now - state.messageStartTime;
    if (elapsed > state.messageDuration) return;
    let alpha = 1;
    if (elapsed < 250) alpha = elapsed / 250;
    else if (elapsed > state.messageDuration - 300) {
      alpha = Math.max(0, (state.messageDuration - elapsed) / 300);
    }
    const who = state.currentPlayer;
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${this.fs(72)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = who === 'player' ? '#00d9ff' : '#ff6b6b';
    ctx.shadowColor = ctx.fillStyle as string;
    ctx.shadowBlur = 40;
    ctx.fillText(state.message, BASE_W / 2, BASE_H / 2);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = who === 'player' ? '#00d9ff' : '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.6;
    const barW = 400 * (elapsed / state.messageDuration);
    ctx.fillRect(BASE_W / 2 - 200, BASE_H / 2 + 60, 400, 3);
    ctx.fillStyle = who === 'player' ? '#00d9ff' : '#ff6b6b';
    ctx.fillRect(BASE_W / 2 - 200, BASE_H / 2 + 60, barW, 3);
    ctx.restore();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    ctx.save();
    for (const f of state.floatingTexts) {
      const elapsed = now - f.startTime;
      if (elapsed < 0) continue;
      if (elapsed > f.duration) continue;
      const t = elapsed / f.duration;
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      const rise = -80 * t;
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${this.fs(34)}px "Segoe UI", sans-serif`;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 14;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.text, f.x, f.y + rise);
    }
    ctx.restore();
  }

  private drawAnimations(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    for (const a of state.animations) {
      const t = Math.min(1, (now - a.startTime) / a.duration);
      if (a.type === 'damage' && a.to) {
        this.drawImpactEffect(ctx, a.to, t, '#ff4757');
      } else if (a.type === 'heal' && a.to) {
        this.drawImpactEffect(ctx, a.to, t, '#52b788');
      } else if (a.type === 'shield' && a.to) {
        this.drawImpactEffect(ctx, a.to, t, '#4a9eff');
      } else if (a.type === 'turn_switch') {
        this.drawScanline(ctx, t, a.from === 'player' ? '#00d9ff' : '#ff6b6b');
      }
    }
  }

  private drawImpactEffect(
    ctx: CanvasRenderingContext2D,
    who: 'player' | 'ai',
    t: number,
    color: string
  ): void {
    const cx = who === 'player' ? 220 : 1220;
    const cy = who === 'player' ? 640 : 140;
    ctx.save();
    const alpha = 1 - t;
    ctx.globalAlpha = alpha;
    const r = 60 + t * 80;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();
  }

  private drawScanline(ctx: CanvasRenderingContext2D, t: number, color: string): void {
    ctx.save();
    ctx.globalAlpha = (1 - Math.abs(t - 0.5) * 2) * 0.25;
    const y = t * BASE_H;
    const grad = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 80, BASE_W, 160);
    ctx.restore();
  }

  private drawVictoryModal(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const win = state.phase === 'victory';
    const color = win ? '#52b788' : '#ff4757';
    const title = win ? '胜利！' : '失败';

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    for (let i = 0; i < 50; i++) {
      const seed = i * 97;
      const ang = now * 0.001 + seed;
      const r = 200 + ((seed * 7) % 250) + Math.sin(now * 0.003 + i) * 40;
      const x = BASE_W / 2 + Math.cos(ang) * r;
      const y = BASE_H / 2 + Math.sin(ang) * r;
      ctx.globalAlpha = 0.7 * (0.5 + Math.sin(now * 0.005 + i) * 0.5);
      ctx.fillStyle = i % 3 === 0 ? color : i % 3 === 1 ? '#ffd700' : '#00d9ff';
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const mx = BASE_W / 2 - this.sz(280);
    const my = BASE_H / 2 - this.sz(200);
    const mw = this.sz(560);
    const mh = this.sz(400);
    const pulse = 0.5 + Math.sin(now * 0.004) * 0.5;
    this.roundRect(ctx, mx, my, mw, mh, 24);
    const g = ctx.createLinearGradient(mx, my, mx, my + mh);
    g.addColorStop(0, 'rgba(20, 25, 50, 0.95)');
    g.addColorStop(1, 'rgba(10, 10, 25, 0.98)');
    ctx.fillStyle = g;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30 + pulse * 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${this.fs(80)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 40;
    ctx.fillText(title, BASE_W / 2, my + this.sz(110));
    ctx.shadowBlur = 0;

    ctx.font = `bold ${this.fs(24)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const sub = win ? '你击败了AI对手！' : '再接再厉！';
    ctx.fillText(sub, BASE_W / 2, my + this.sz(190));

    ctx.font = `${this.fs(18)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`坚持了 ${state.turn} 回合`, BASE_W / 2, my + this.sz(230));

    const bx = BASE_W / 2 - this.sz(110);
    const by = my + this.sz(280);
    const bw = this.sz(220);
    const bh = this.sz(60);
    state.restartBtnRect = { x: bx, y: by, w: bw, h: bh };

    this.roundRect(ctx, bx, by, bw, bh, 14);
    const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
    bg.addColorStop(0, this.lighten(color, 0.3));
    bg.addColorStop(1, color);
    ctx.fillStyle = bg;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.lighten(color, 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold ${this.fs(22)}px "Segoe UI", sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText('重新开始', BASE_W / 2, by + bh / 2);
    ctx.restore();
  }

  private darken(hex: string, factor: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
  }
  private lighten(hex: string, factor: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.floor(r + (255 - r) * factor)},${Math.floor(g + (255 - g) * factor)},${Math.floor(b + (255 - b) * factor)})`;
  }
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('rgb')) {
      const m = hex.match(/\d+/g);
      if (m) return { r: +m[0], g: +m[1], b: +m[2] };
    }
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
}
