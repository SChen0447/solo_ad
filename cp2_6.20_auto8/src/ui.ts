export type GameState = 'menu' | 'playing' | 'gameover' | 'victory' | 'levelTransition';

export interface UIState {
  score: number;
  lives: number;
  timeLeft: number;
  level: number;
  finalScore: number;
  victoryTime: number;
}

export interface VictoryParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blurCanvas: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D;
  private buttons: { id: string; x: number; y: number; w: number; h: number; hover: boolean; pressed: boolean; scale: number; pressTime: number; clickAnim: boolean; clickAnimTime: number }[] = [];
  public onButtonClick: ((buttonId: string) => void) | null = null;
  public victoryParticles: VictoryParticle[] = [];
  public levelFlash: number = 0;
  public levelFade: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.blurCanvas = document.createElement('canvas');
    const blurCtx = this.blurCanvas.getContext('2d');
    if (!blurCtx) throw new Error('Failed to get blur canvas context');
    this.blurCtx = blurCtx;
    this.setupInput();
  }

  private drawBlurredBackground(blurAmount: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.blurCanvas.width !== w || this.blurCanvas.height !== h) {
      this.blurCanvas.width = w;
      this.blurCanvas.height = h;
    }
    this.blurCtx.clearRect(0, 0, w, h);
    this.blurCtx.drawImage(this.canvas, 0, 0);
    this.ctx.save();
    this.ctx.filter = `blur(${blurAmount}px)`;
    this.ctx.drawImage(this.blurCanvas, 0, 0);
    this.ctx.restore();
  }

  private setupInput(): void {
    const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const pos = getPos(e);
      for (const btn of this.buttons) {
        btn.hover = pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h;
      }
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      const pos = getPos(e);
      for (const btn of this.buttons) {
        if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
          btn.pressed = true;
          btn.pressTime = 0;
        }
      }
    });

    this.canvas.addEventListener('mouseup', (e: MouseEvent) => {
      const pos = getPos(e);
      for (const btn of this.buttons) {
        if (btn.pressed && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
          btn.clickAnim = true;
          btn.clickAnimTime = 0;
          if (this.onButtonClick) this.onButtonClick(btn.id);
        }
        btn.pressed = false;
      }
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const pos = getPos(e.touches[0]);
        for (const btn of this.buttons) {
          if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
            btn.pressed = true;
            btn.pressTime = 0;
          }
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      if (e.changedTouches.length > 0) {
        const pos = getPos(e.changedTouches[0]);
        for (const btn of this.buttons) {
          if (btn.pressed && pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
            btn.clickAnim = true;
            btn.clickAnimTime = 0;
            if (this.onButtonClick) this.onButtonClick(btn.id);
          }
          btn.pressed = false;
        }
      }
    }, { passive: false });
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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

  public spawnVictoryParticles(cx: number, cy: number): void {
    this.victoryParticles = [];
    const colors = ['#ffd700', '#ffaa00', '#ffff00', '#ff8800', '#ffee88'];
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 250;
      this.victoryParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  public update(dt: number): void {
    for (const btn of this.buttons) {
      const targetScale = btn.hover ? 1.1 : 1.0;
      if (btn.pressed) {
        btn.pressTime += dt;
        const pressT = Math.min(1, btn.pressTime / 0.15);
        const bounce = pressT < 0.5 ? pressT * 2 : 2 - pressT * 2;
        const pressScale = 0.85 + bounce * 0.25;
        btn.scale += (pressScale - btn.scale) * Math.min(1, dt * 25);
      } else if (btn.clickAnim) {
        btn.clickAnimTime += dt;
        const animT = Math.min(1, btn.clickAnimTime / 0.15);
        let clickScale: number;
        if (animT < 0.4) {
          clickScale = 1.0 + (animT / 0.4) * 0.2;
        } else {
          const t = (animT - 0.4) / 0.6;
          clickScale = 1.2 - t * 0.2;
        }
        btn.scale = clickScale;
        if (animT >= 1) {
          btn.clickAnim = false;
          btn.scale = targetScale;
        }
      } else {
        btn.scale += (targetScale - btn.scale) * Math.min(1, dt * 12);
      }
    }

    for (let i = this.victoryParticles.length - 1; i >= 0; i--) {
      const p = this.victoryParticles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      if (p.life <= 0) {
        this.victoryParticles.splice(i, 1);
      }
    }

    if (this.levelFlash > 0) {
      this.levelFlash -= dt * 2;
      if (this.levelFlash < 0) this.levelFlash = 0;
    }
    if (this.levelFade > 0) {
      this.levelFade -= dt;
      if (this.levelFade < 0) this.levelFade = 0;
    }
  }

  public render(gameState: GameState, state: UIState, time: number): void {
    this.buttons = [];
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (gameState === 'menu') {
      this.renderMenu(w, h, time);
    } else if (gameState === 'playing') {
      this.renderHUD(w, state, time);
    } else if (gameState === 'gameover') {
      this.renderHUD(w, state, time);
      this.renderGameOver(w, h, state, time);
    } else if (gameState === 'victory') {
      this.renderHUD(w, state, time);
      this.renderVictoryParticles();
      this.renderVictory(w, h, state, time);
    } else if (gameState === 'levelTransition') {
      this.renderHUD(w, state, time);
    }

    this.renderLevelFlash(w, h);
    this.renderLevelFade(w, h);
  }

  private renderMenu(w: number, h: number, time: number): void {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(time * Math.PI) * 0.5;

    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00b4ff';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(64, w * 0.1)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#4488ff';
    ctx.fillText('重力弹球迷宫', w / 2, h * 0.3);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(180, 200, 255, 0.8)';
    ctx.font = `${Math.min(20, w * 0.04)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('倾斜手机或使用方向键/WASD控制弹球', w / 2, h * 0.42);
    ctx.fillText('收集金币、躲避红色障碍、到达紫色终点', w / 2, h * 0.48);
    ctx.restore();

    const btnW = Math.min(220, w * 0.5);
    const btnH = Math.min(70, h * 0.1);
    const btnX = (w - btnW) / 2;
    const btnY = h * 0.62;
    this.buttons.push({ id: 'start', x: btnX, y: btnY, w: btnW, h: btnH, hover: false, pressed: false, scale: 1.0, pressTime: 0, clickAnim: false, clickAnimTime: 0 });

    const btn = this.buttons[0];
    const cx = btnX + btnW / 2;
    const cy = btnY + btnH / 2;
    const scale = btn.scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const hoverGlow = btn.hover ? 35 : 15;
    const glow = hoverGlow + pulse * 15;
    ctx.shadowBlur = glow;
    ctx.shadowColor = btn.hover ? '#66bbff' : '#0088ff';

    const btnGradient = ctx.createLinearGradient(0, -btnH / 2, 0, btnH / 2);
    btnGradient.addColorStop(0, '#2a7fff');
    btnGradient.addColorStop(1, '#0055cc');
    ctx.fillStyle = btnGradient;
    this.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.fill();

    ctx.strokeStyle = `rgba(100, 180, 255, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    this.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.stroke();

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(28, w * 0.06)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始游戏', 0, 0);

    ctx.restore();
  }

  private renderHUD(w: number, state: UIState, time: number): void {
    const ctx = this.ctx;
    const h = this.canvas.height;
    const pulse = 0.5 + Math.sin(time * Math.PI) * 0.5;
    const hudH = Math.min(70, h * 0.1);
    const fontSize = Math.min(20, w * 0.045);

    const gradient = ctx.createLinearGradient(0, 0, 0, hudH);
    gradient.addColorStop(0, 'rgba(10, 20, 50, 0.85)');
    gradient.addColorStop(1, 'rgba(10, 20, 50, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, hudH);

    ctx.strokeStyle = `rgba(0, 180, 255, ${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hudH);
    ctx.lineTo(w, hudH);
    ctx.stroke();

    ctx.save();
    ctx.font = `300 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(100, 150, 255, 0.9)';
    ctx.fillStyle = '#ffffff';

    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${state.score}`, w * 0.04, hudH / 2);

    ctx.textAlign = 'center';
    const hearts = '❤'.repeat(Math.max(0, state.lives));
    ctx.fillStyle = state.lives <= 1 ? '#ff4444' : '#ff6688';
    ctx.shadowColor = state.lives <= 1 ? 'rgba(255, 0, 0, 0.95)' : 'rgba(255, 60, 100, 0.9)';
    ctx.shadowBlur = state.lives <= 1 ? 20 : 15;
    ctx.fillText(hearts || '—', w / 2, hudH / 2);

    ctx.shadowBlur = 15;
    ctx.fillStyle = state.timeLeft <= 10 ? '#ff8844' : '#ffffff';
    ctx.shadowColor = state.timeLeft <= 10 ? 'rgba(255, 80, 0, 0.95)' : 'rgba(100, 150, 255, 0.9)';
    ctx.textAlign = 'right';
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    ctx.fillText(`时间: ${mins}:${secs.toString().padStart(2, '0')}`, w * 0.96, hudH / 2);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaccff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(80, 120, 220, 0.85)';
    ctx.font = `300 ${fontSize * 0.7}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(`关卡 ${state.level}`, w / 2, hudH * 0.25);

    ctx.restore();
  }

  private renderGameOver(w: number, h: number, state: UIState, time: number): void {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(time * Math.PI * 2) * 0.5;

    this.drawBlurredBackground(10);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const pw = Math.min(380, w * 0.85);
    const ph = Math.min(280, h * 0.55);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;

    const popScale = Math.min(1, (1 - Math.exp(-time * 5)));
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.scale(popScale, popScale);

    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff0000';

    const panelGrad = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    panelGrad.addColorStop(0, '#1a0000');
    panelGrad.addColorStop(0.5, '#330000');
    panelGrad.addColorStop(1, '#110000');
    ctx.fillStyle = panelGrad;
    this.roundRect(-pw / 2, -ph / 2, pw, ph, 12);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 60, 60, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    this.roundRect(-pw / 2, -ph / 2, pw, ph, 12);
    ctx.stroke();

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff2222';
    ctx.fillStyle = '#ff4444';
    ctx.font = `bold ${Math.min(38, w * 0.08)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏失败', 0, -ph * 0.32);

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#aa0000';
    ctx.fillStyle = '#ffaaaa';
    ctx.font = `${Math.min(22, w * 0.05)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.fillText(`最终分数: ${state.finalScore}`, 0, -ph * 0.05);

    ctx.restore();

    const btnW = Math.min(200, w * 0.45);
    const btnH = Math.min(60, h * 0.09);
    const btnX = (w - btnW) / 2;
    const btnY = py + ph * 0.72;
    this.buttons.push({ id: 'restart', x: btnX, y: btnY, w: btnW, h: btnH, hover: false, pressed: false, scale: 1.0, pressTime: 0, clickAnim: false, clickAnimTime: 0 });

    const btn = this.buttons[this.buttons.length - 1];
    const bcx = btnX + btnW / 2;
    const bcy = btnY + btnH / 2;

    ctx.save();
    ctx.translate(bcx, bcy);
    ctx.scale(btn.scale, btn.scale);

    ctx.shadowBlur = 12 + pulse * 10;
    ctx.shadowColor = '#ff4444';
    const btnGrad = ctx.createLinearGradient(0, -btnH / 2, 0, btnH / 2);
    btnGrad.addColorStop(0, '#cc2222');
    btnGrad.addColorStop(1, '#770000');
    ctx.fillStyle = btnGrad;
    this.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 120, 120, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    this.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(22, w * 0.05)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', 0, 0);

    ctx.restore();
  }

  private renderVictoryParticles(): void {
    const ctx = this.ctx;
    for (const p of this.victoryParticles) {
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = t;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderVictory(w: number, h: number, state: UIState, time: number): void {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(time * Math.PI) * 0.5;

    this.drawBlurredBackground(8);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, w, h);

    const pw = Math.min(380, w * 0.85);
    const ph = Math.min(300, h * 0.58);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;

    const popScale = Math.min(1, (1 - Math.exp(-time * 5)));
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.scale(popScale, popScale);

    ctx.shadowBlur = 35;
    ctx.shadowColor = '#ffd700';

    const panelGrad = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    panelGrad.addColorStop(0, '#2a2000');
    panelGrad.addColorStop(0.5, '#443300');
    panelGrad.addColorStop(1, '#1a1400');
    ctx.fillStyle = panelGrad;
    this.roundRect(-pw / 2, -ph / 2, pw, ph, 12);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 215, 0, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    this.roundRect(-pw / 2, -ph / 2, pw, ph, 12);
    ctx.stroke();

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffdd00';
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(38, w * 0.08)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('通关成功！', 0, -ph * 0.32);

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#aa8800';
    ctx.fillStyle = '#ffeeaa';
    ctx.font = `${Math.min(22, w * 0.05)}px "Helvetica Neue", Arial, sans-serif`;
    const mins = Math.floor(state.victoryTime / 60);
    const secs = Math.floor(state.victoryTime % 60);
    const ms = Math.floor((state.victoryTime % 1) * 100);
    ctx.fillText(`通关时间: ${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, 0, -ph * 0.08);
    ctx.fillText(`分数: ${state.finalScore}`, 0, ph * 0.08);

    ctx.restore();

    const btnW = Math.min(200, w * 0.45);
    const btnH = Math.min(60, h * 0.09);
    const btnX = (w - btnW) / 2;
    const btnY = py + ph * 0.78;
    this.buttons.push({ id: 'next', x: btnX, y: btnY, w: btnW, h: btnH, hover: false, pressed: false, scale: 1.0, pressTime: 0, clickAnim: false, clickAnimTime: 0 });

    const btn = this.buttons[this.buttons.length - 1];
    const bcx = btnX + btnW / 2;
    const bcy = btnY + btnH / 2;

    ctx.save();
    ctx.translate(bcx, bcy);
    ctx.scale(btn.scale, btn.scale);

    ctx.shadowBlur = 12 + pulse * 10;
    ctx.shadowColor = '#ffaa00';
    const btnGrad = ctx.createLinearGradient(0, -btnH / 2, 0, btnH / 2);
    btnGrad.addColorStop(0, '#cc8800');
    btnGrad.addColorStop(1, '#774400');
    ctx.fillStyle = btnGrad;
    this.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 200, 100, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    this.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(22, w * 0.05)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('下一关', 0, 0);

    ctx.restore();
  }

  private renderLevelFlash(w: number, h: number): void {
    if (this.levelFlash <= 0) return;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${this.levelFlash})`;
    this.ctx.fillRect(0, 0, w, h);
  }

  private renderLevelFade(w: number, h: number): void {
    if (this.levelFade <= 0) return;
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.levelFade})`;
    this.ctx.fillRect(0, 0, w, h);
  }
}

export class AudioManager {
  private audioContext: AudioContext | null = null;

  private ensureContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch (_e) {
        this.audioContext = null;
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  public playCoin(): void {
    this.ensureContext();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playHit(): void {
    this.ensureContext();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playVictory(): void {
    this.ensureContext();
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}
