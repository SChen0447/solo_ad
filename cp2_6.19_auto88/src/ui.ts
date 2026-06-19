export type GameScreen = 'menu' | 'playing' | 'dead' | 'victory' | 'transition';

export interface GameState {
  score: number;
  lives: number;
  level: number;
  timeLeft: number;
  elapsedTime: number;
  screen: GameScreen;
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
  hue: number;
  rotation: number;
  rotationSpeed: number;
  isStar: boolean;
}

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
}

export class UIManager {
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private uiLayer: HTMLElement;
  private callbacks: UICallbacks;
  public victoryParticles: VictoryParticle[] = [];
  public transitionAlpha: number = 0;
  public flashIntensity: number = 0;
  private pulseTime: number = 0;
  private buttonHover: string | null = null;
  private buttonScale: Record<string, number> = {};
  private buttonClickAnim: Record<string, number> = {};
  private canvas: HTMLCanvasElement | null = null;
  private currentScreen: GameScreen = 'menu';
  private blurCanvas: HTMLCanvasElement | null = null;
  private blurCtx: CanvasRenderingContext2D | null = null;
  private victoryParticlePool: VictoryParticle[] = [];
  private readonly MAX_VICTORY_PARTICLES: number = 200;

  constructor(uiLayer: HTMLElement, callbacks: UICallbacks) {
    this.uiLayer = uiLayer;
    this.callbacks = callbacks;
    this.setupEventListeners();
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.MAX_VICTORY_PARTICLES; i++) {
      this.victoryParticlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 2,
        size: 0, hue: 0, rotation: 0, rotationSpeed: 0, isStar: false
      });
    }
  }

  private getVictoryParticleFromPool(): VictoryParticle | null {
    for (const p of this.victoryParticlePool) {
      if (p.life <= 0) return p;
    }
    return null;
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.blurCanvas = document.createElement('canvas');
    this.blurCtx = this.blurCanvas.getContext('2d');
  }

  public setSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.uiLayer.style.width = width + 'px';
    this.uiLayer.style.height = height + 'px';
    if (this.blurCanvas) {
      this.blurCanvas.width = Math.floor(width / 4);
      this.blurCanvas.height = Math.floor(height / 4);
    }
  }

  private setupEventListeners(): void {
    this.uiLayer.addEventListener('click', (e) => this.handleClick(e));
    this.uiLayer.addEventListener('mousemove', (e) => this.handleHover(e));
    this.uiLayer.addEventListener('mouseleave', () => {
      this.buttonHover = null;
    });
  }

  private getRelativePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.uiLayer.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private getMenuButtonRect(): { x: number; y: number; w: number; h: number } {
    const w = Math.min(240, this.canvasWidth * 0.5);
    const h = 60;
    const x = (this.canvasWidth - w) / 2;
    const y = this.canvasHeight * 0.55;
    return { x, y, w, h };
  }

  private getRestartButtonRect(): { x: number; y: number; w: number; h: number } {
    const w = Math.min(200, this.canvasWidth * 0.45);
    const h = 55;
    const x = (this.canvasWidth - w) / 2;
    const y = this.canvasHeight * 0.55;
    return { x, y, w, h };
  }

  private getNextButtonRect(): { x: number; y: number; w: number; h: number } {
    const w = Math.min(200, this.canvasWidth * 0.45);
    const h = 55;
    const x = (this.canvasWidth - w) / 2;
    const y = this.canvasHeight * 0.6;
    return { x, y, w, h };
  }

  private pointInRect(px: number, py: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  private handleClick(e: MouseEvent): void {
    const pos = this.getRelativePos(e);
    let clickedButton: string | null = null;

    if (this.currentScreen === 'menu') {
      if (this.pointInRect(pos.x, pos.y, this.getMenuButtonRect())) {
        clickedButton = 'start';
      }
    } else if (this.currentScreen === 'dead') {
      if (this.pointInRect(pos.x, pos.y, this.getRestartButtonRect())) {
        clickedButton = 'restart';
      }
    } else if (this.currentScreen === 'victory') {
      if (this.pointInRect(pos.x, pos.y, this.getNextButtonRect())) {
        clickedButton = 'next';
      }
    }

    if (clickedButton) {
      this.buttonClickAnim[clickedButton] = 1;
      setTimeout(() => {
        if (clickedButton === 'start') this.callbacks.onStart();
        else if (clickedButton === 'restart') this.callbacks.onRestart();
        else if (clickedButton === 'next') this.callbacks.onNextLevel();
      }, 100);
    }
  }

  private handleHover(e: MouseEvent): void {
    const pos = this.getRelativePos(e);
    let hover: string | null = null;
    if (this.currentScreen === 'menu' && this.pointInRect(pos.x, pos.y, this.getMenuButtonRect())) {
      hover = 'start';
    } else if (this.currentScreen === 'dead' && this.pointInRect(pos.x, pos.y, this.getRestartButtonRect())) {
      hover = 'restart';
    } else if (this.currentScreen === 'victory' && this.pointInRect(pos.x, pos.y, this.getNextButtonRect())) {
      hover = 'next';
    }
    this.buttonHover = hover;
  }

  public setScreen(screen: GameScreen): void {
    this.currentScreen = screen;
  }

  public spawnVictoryParticles(cx: number, cy: number): void {
    const count = 120;
    for (let i = 0; i < count; i++) {
      const p = this.getVictoryParticleFromPool();
      if (!p) break;

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 180 + Math.random() * 350;

      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 50;
      p.life = 1.8 + Math.random() * 0.8;
      p.maxLife = p.life;
      p.size = 3 + Math.random() * 7;
      p.hue = 35 + Math.random() * 40;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 8;
      p.isStar = Math.random() < 0.3;

      this.victoryParticles.push(p);
    }

    for (let i = 0; i < 15; i++) {
      const p = this.getVictoryParticleFromPool();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;

      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 2.5 + Math.random() * 1;
      p.maxLife = p.life;
      p.size = 6 + Math.random() * 10;
      p.hue = 50;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 4;
      p.isStar = true;

      this.victoryParticles.push(p);
    }
  }

  public triggerFlash(): void {
    this.flashIntensity = 1;
  }

  public startTransition(): void {
    this.transitionAlpha = 0;
  }

  public update(dt: number): void {
    this.pulseTime += dt;

    for (const p of this.victoryParticles) {
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 280 * dt;
        p.vx *= 0.985;
        p.rotation += p.rotationSpeed * dt;
      }
    }
    this.victoryParticles = this.victoryParticles.filter(p => p.life > 0);

    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(0, this.flashIntensity - dt * 2);
    }

    const targetScale: Record<string, number> = {};
    targetScale['start'] = this.buttonHover === 'start' ? 1.1 : 1;
    targetScale['restart'] = this.buttonHover === 'restart' ? 1.1 : 1;
    targetScale['next'] = this.buttonHover === 'next' ? 1.1 : 1;

    for (const key of ['start', 'restart', 'next']) {
      const current = this.buttonScale[key] || 1;
      const target = targetScale[key];
      this.buttonScale[key] = current + (target - current) * Math.min(1, dt * 12);

      if (this.buttonClickAnim[key] && this.buttonClickAnim[key] > 0) {
        this.buttonClickAnim[key] = Math.max(0, this.buttonClickAnim[key] - dt / 0.15);
      }
    }
  }

  private getScale(): number {
    return Math.min(this.canvasWidth / 1200, 1);
  }

  public render(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.screen === 'playing' || state.screen === 'transition') {
      this.renderHUD(ctx, state);
    }
    if (state.screen === 'menu') {
      this.renderMenu(ctx, state);
    } else if (state.screen === 'dead') {
      this.renderBlurBackground(ctx);
      this.renderDeadPanel(ctx, state);
    } else if (state.screen === 'victory') {
      this.renderBlurBackground(ctx);
      this.renderVictoryPanel(ctx, state);
    }
    if (this.victoryParticles.length > 0) {
      this.renderVictoryParticles(ctx);
    }
    if (this.flashIntensity > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity * 0.6})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
    if (state.screen === 'transition' && this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 10, 30, ${Math.min(1, this.transitionAlpha)})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  private renderBlurBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.blurCanvas || !this.blurCtx || !this.canvas) return;

    const bw = this.blurCanvas.width;
    const bh = this.blurCanvas.height;

    this.blurCtx.drawImage(this.canvas, 0, 0, this.canvasWidth, this.canvasHeight, 0, 0, bw, bh);

    const imageData = this.blurCtx.getImageData(0, 0, bw, bh);
    const data = imageData.data;
    const radius = 4;

    const temp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.min(bw - 1, Math.max(0, x + dx));
            const ny = Math.min(bh - 1, Math.max(0, y + dy));
            const idx = (ny * bw + nx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
        const idx = (y * bw + x) * 4;
        temp[idx] = r / count;
        temp[idx + 1] = g / count;
        temp[idx + 2] = b / count;
        temp[idx + 3] = a / count;
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = temp[i];
    }

    this.blurCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.blurCanvas, 0, 0, bw, bh, 0, 0, this.canvasWidth, this.canvasHeight);

    const darkGrad = ctx.createRadialGradient(
      this.canvasWidth / 2, this.canvasHeight / 2, 0,
      this.canvasWidth / 2, this.canvasHeight / 2,
      Math.max(this.canvasWidth, this.canvasHeight) * 0.7
    );
    darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();
  }

  private renderGlowingText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    glowColor: string,
    glowSize: number = 12
  ): void {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    ctx.shadowBlur = glowSize * 0.5;
    ctx.globalAlpha = 0.6;
    ctx.fillText(text, x, y);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private renderHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
    const scale = this.getScale();
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * Math.PI);
    const fontSize = Math.floor(20 * scale);

    const hudHeight = Math.floor(60 * scale);
    const hudGrad = ctx.createLinearGradient(0, 0, 0, hudHeight);
    hudGrad.addColorStop(0, 'rgba(10, 20, 50, 0.85)');
    hudGrad.addColorStop(1, 'rgba(5, 10, 30, 0.65)');

    ctx.fillStyle = hudGrad;
    ctx.fillRect(0, 0, this.canvasWidth, hudHeight);

    ctx.strokeStyle = `rgba(80, 180, 255, ${0.3 + 0.2 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hudHeight);
    ctx.lineTo(this.canvasWidth, hudHeight);
    ctx.stroke();

    ctx.font = `300 ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'middle';

    const padding = Math.floor(20 * scale);
    const glowSize = 8 + pulse * 5;

    ctx.textAlign = 'left';
    this.renderGlowingText(
      ctx,
      `分数: ${state.score}`,
      padding,
      hudHeight / 2,
      '#ffffff',
      'rgba(100, 180, 255, 0.9)',
      glowSize
    );

    ctx.textAlign = 'center';
    this.renderGlowingText(
      ctx,
      '生命:',
      this.canvasWidth / 2 - 60 * scale,
      hudHeight / 2,
      '#ffffff',
      'rgba(255, 100, 120, 0.9)',
      glowSize
    );

    for (let i = 0; i < state.lives; i++) {
      const heartX = this.canvasWidth / 2 + 10 * scale + i * 28 * scale;
      this.renderHeart(ctx, heartX, hudHeight / 2, 10 * scale, pulse);
    }

    ctx.textAlign = 'right';
    const mins = Math.floor(state.timeLeft / 60);
    const secs = Math.floor(state.timeLeft % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    let timeColor = '#ffffff';
    let timeGlow = 'rgba(100, 180, 255, 0.9)';
    if (state.timeLeft < 10) {
      const green = Math.floor(100 + 155 * (state.timeLeft / 10));
      timeColor = `rgb(255, ${green}, 80)`;
      timeGlow = `rgba(255, ${green}, 80, 0.9)`;
    }
    this.renderGlowingText(
      ctx,
      `⏱ ${timeStr}`,
      this.canvasWidth - padding,
      hudHeight / 2,
      timeColor,
      timeGlow,
      glowSize
    );

    ctx.textAlign = 'left';
    ctx.font = `300 ${Math.floor(14 * scale)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(150, 200, 255, 0.9)';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(100, 180, 255, 0.6)';
    ctx.fillText(`第 ${state.level} 关`, padding, hudHeight + Math.floor(20 * scale));
    ctx.shadowBlur = 0;

    ctx.textAlign = 'right';
    ctx.fillText(`关卡 ${state.level}`, this.canvasWidth - padding, hudHeight + Math.floor(20 * scale));
  }

  private renderHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, pulse: number): void {
    const s = size * (1 + 0.1 * pulse);
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(255, 80, 100, 0.8)';
    ctx.shadowBlur = 8 + pulse * 5;
    ctx.fillStyle = '#ff4060';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(s, -s * 0.5, s * 1.2, s * 0.3, 0, s);
    ctx.bezierCurveTo(-s * 1.2, s * 0.3, -s, -s * 0.5, 0, s * 0.3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 180, 180, 0.8)';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.1, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderMenu(ctx: CanvasRenderingContext2D, _state: GameState): void {
    const scale = this.getScale();
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * Math.PI);

    const overlayGrad = ctx.createRadialGradient(
      this.canvasWidth / 2, this.canvasHeight / 2, 0,
      this.canvasWidth / 2, this.canvasHeight / 2,
      Math.max(this.canvasWidth, this.canvasHeight) * 0.7
    );
    overlayGrad.addColorStop(0, 'rgba(10, 20, 50, 0.3)');
    overlayGrad.addColorStop(1, 'rgba(5, 5, 20, 0.85)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.save();
    const titleSize = Math.floor(52 * scale);
    ctx.font = `bold ${titleSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.renderGlowingText(
      ctx,
      '重力弹球迷宫逃脱',
      this.canvasWidth / 2,
      this.canvasHeight * 0.3,
      '#e0f0ff',
      'rgba(100, 180, 255, 0.95)',
      25 + pulse * 15
    );

    const subSize = Math.floor(18 * scale);
    ctx.font = `300 ${subSize}px 'Segoe UI', sans-serif`;
    ctx.shadowColor = 'rgba(100, 180, 255, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(150, 200, 255, 0.9)';
    ctx.fillText('倾斜手机或使用方向键控制弹球，躲避红色障碍物', this.canvasWidth / 2, this.canvasHeight * 0.42);
    ctx.fillText('收集金币获得分数，到达绿色终点通关', this.canvasWidth / 2, this.canvasHeight * 0.47);
    ctx.shadowBlur = 0;

    this.renderButton(ctx, this.getMenuButtonRect(), '开始游戏', 'start', scale, 'blue');

    const hintSize = Math.floor(14 * scale);
    ctx.font = `300 ${hintSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(150, 200, 255, 0.6)';
    ctx.fillText('← → ↑ ↓ / WASD 方向键移动', this.canvasWidth / 2, this.canvasHeight * 0.72);
    ctx.fillText('移动端：开启重力感应控制', this.canvasWidth / 2, this.canvasHeight * 0.77);
    ctx.restore();
  }

  private renderDeadPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
    const scale = this.getScale();
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * Math.PI);
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    ctx.save();

    const panelW = Math.min(420, this.canvasWidth * 0.85);
    const panelH = Math.min(320, this.canvasHeight * 0.6);
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    ctx.shadowColor = 'rgba(255, 60, 80, 0.6)';
    ctx.shadowBlur = 35 + pulse * 25;

    const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
    panelGrad.addColorStop(0, 'rgba(60, 10, 25, 0.95)');
    panelGrad.addColorStop(1, 'rgba(25, 0, 10, 0.98)');
    this.roundRect(ctx, px, py, panelW, panelH, 16);
    ctx.fillStyle = panelGrad;

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 80, 100, ${0.55 + 0.35 * pulse})`;
    ctx.lineWidth = 2 + pulse * 0.5;
    this.roundRect(ctx, px, py, panelW, panelH, 16);
    ctx.stroke();

    const titleSize = Math.floor(36 * scale);
    ctx.font = `bold ${titleSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.renderGlowingText(
      ctx,
      '游戏失败',
      cx,
      py + panelH * 0.18,
      '#ff6080',
      'rgba(255, 100, 120, 0.95)',
      18
    );

    const scoreSize = Math.floor(22 * scale);
    ctx.font = `300 ${scoreSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('最终分数', cx, py + panelH * 0.42);
    ctx.shadowBlur = 0;

    const scoreValSize = Math.floor(40 * scale);
    ctx.font = `bold ${scoreValSize}px 'Segoe UI', sans-serif`;
    this.renderGlowingText(
      ctx,
      `${state.finalScore}`,
      cx,
      py + panelH * 0.55,
      '#ffcc60',
      'rgba(255, 200, 100, 0.9)',
      15
    );

    ctx.font = `300 ${Math.floor(16 * scale)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255, 200, 200, 0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(255, 100, 120, 0.5)';
    ctx.fillText(`到达第 ${state.level} 关`, cx, py + panelH * 0.68);
    ctx.shadowBlur = 0;
    ctx.restore();

    this.renderButton(ctx, this.getRestartButtonRect(), '重新开始', 'restart', scale, 'red');
  }

  private renderVictoryPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
    const scale = this.getScale();
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * Math.PI);
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    ctx.save();

    const panelW = Math.min(420, this.canvasWidth * 0.85);
    const panelH = Math.min(360, this.canvasHeight * 0.65);
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    ctx.shadowColor = `rgba(255, 220, 80, ${0.45 + 0.35 * pulse})`;
    ctx.shadowBlur = 45 + pulse * 35;

    const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
    panelGrad.addColorStop(0, 'rgba(50, 40, 15, 0.95)');
    panelGrad.addColorStop(1, 'rgba(25, 18, 5, 0.98)');
    this.roundRect(ctx, px, py, panelW, panelH, 16);
    ctx.fillStyle = panelGrad;

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 220, 80, ${0.55 + 0.35 * pulse})`;
    ctx.lineWidth = 2 + pulse * 0.5;
    this.roundRect(ctx, px, py, panelW, panelH, 16);
    ctx.stroke();

    const titleSize = Math.floor(36 * scale);
    ctx.font = `bold ${titleSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.renderGlowingText(
      ctx,
      '关卡通关!',
      cx,
      py + panelH * 0.16,
      '#ffdd40',
      'rgba(255, 230, 100, 0.95)',
      22
    );

    const scoreSize = Math.floor(20 * scale);
    ctx.font = `300 ${scoreSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('当前分数', cx, py + panelH * 0.32);
    ctx.shadowBlur = 0;

    const scoreValSize = Math.floor(34 * scale);
    ctx.font = `bold ${scoreValSize}px 'Segoe UI', sans-serif`;
    this.renderGlowingText(
      ctx,
      `${state.score}`,
      cx,
      py + panelH * 0.44,
      '#ffcc60',
      'rgba(255, 200, 100, 0.9)',
      16
    );

    ctx.font = `300 ${Math.floor(18 * scale)}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 200, 0.95)';
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(255, 230, 100, 0.5)';
    const mins = Math.floor(state.victoryTime / 60);
    const secs = Math.floor(state.victoryTime % 60);
    ctx.fillText(
      `通关时间: ${mins}:${secs.toString().padStart(2, '0')}`,
      cx,
      py + panelH * 0.58
    );
    ctx.fillStyle = 'rgba(200, 255, 200, 0.95)';
    ctx.fillText(`第 ${state.level} 关完成!`, cx, py + panelH * 0.68);
    ctx.shadowBlur = 0;
    ctx.restore();

    this.renderButton(ctx, this.getNextButtonRect(), '进入下一关', 'next', scale, 'gold');
  }

  private renderButton(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
    text: string,
    id: string,
    scale: number,
    type: 'blue' | 'red' | 'gold' = 'blue'
  ): void {
    let s = this.buttonScale[id] || 1;

    const clickAnim = this.buttonClickAnim[id] || 0;
    if (clickAnim > 0) {
      const clickT = 1 - clickAnim;
      s *= 0.85 + 0.3 * Math.sin(clickT * Math.PI);
    }

    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const w = rect.w * s;
    const h = rect.h * s;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * Math.PI);
    const isHovered = this.buttonHover === id;

    let glowColor: string;
    let borderColor: string;
    let textColor: string;

    if (type === 'blue') {
      glowColor = 'rgba(80, 140, 255,';
      borderColor = 'rgba(120, 180, 255,';
      textColor = '#ffffff';
    } else if (type === 'red') {
      glowColor = 'rgba(255, 100, 120,';
      borderColor = 'rgba(255, 150, 160,';
      textColor = '#ffffff';
    } else {
      glowColor = 'rgba(255, 220, 80,';
      borderColor = 'rgba(255, 240, 150,';
      textColor = '#302000';
    }

    ctx.save();
    ctx.shadowColor = `${glowColor}${0.55 + 0.35 * pulse})`;
    ctx.shadowBlur = (isHovered ? 30 : 18) + pulse * 12;

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (type === 'blue') {
      grad.addColorStop(0, isHovered ? '#4a88ff' : '#3878f5');
      grad.addColorStop(1, isHovered ? '#2565e8' : '#1850c8');
    } else if (type === 'red') {
      grad.addColorStop(0, isHovered ? '#ff6888' : '#e85068');
      grad.addColorStop(1, isHovered ? '#e83858' : '#b82040');
    } else {
      grad.addColorStop(0, isHovered ? '#ffe868' : '#ffd848');
      grad.addColorStop(1, isHovered ? '#ffc828' : '#e8a800');
    }
    this.roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = grad;

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${borderColor}${0.65 + 0.35 * pulse})`;
    ctx.lineWidth = 2 + pulse * 0.5;
    this.roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();

    const fontSize = Math.floor(20 * scale * s);
    ctx.font = `600 ${fontSize}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.renderGlowingText(
      ctx,
      text,
      cx,
      cy,
      textColor,
      `${glowColor}0.85)`,
      isHovered ? 10 : 6
    );
    ctx.restore();
  }

  private renderVictoryParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.victoryParticles) {
      if (p.life <= 0) continue;

      const t = p.life / p.maxLife;
      const alpha = Math.min(1, p.life * 1.2);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      const size = p.size * (0.5 + 0.5 * t);
      ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
      ctx.shadowBlur = 10 + t * 10;
      ctx.fillStyle = `hsl(${p.hue}, 100%, ${65 + 25 * t}%)`;

      if (p.isStar) {
        this.drawStar(ctx, 0, 0, size, size * 0.45, 5);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number
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
}
