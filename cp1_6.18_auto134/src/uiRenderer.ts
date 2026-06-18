export interface UIState {
  health: number;
  maxHealth: number;
  explorationPercentage: number;
  energyCores: number;
  totalEnergyCores: number;
  sceneTransitionAlpha: number;
  isTransitioning: boolean;
  gameState: 'menu' | 'playing' | 'paused' | 'gameover' | 'win';
}

export interface ButtonState {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  hovered: boolean;
  hoverScale: number;
  glowIntensity: number;
  onClick: (() => void) | null;
}

export interface HeartState {
  filled: boolean;
  crackProgress: number;
  shakeOffset: number;
}

export interface EnergyDotState {
  active: boolean;
  glowPhase: number;
  appearProgress: number;
}

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: UIState;
  private hearts: HeartState[] = [];
  private energyDots: EnergyDotState[] = [];
  private buttons: ButtonState[] = [];
  private transitionDuration = 0.3;
  private transitionTimer = 0;
  private transitionDirection: 'in' | 'out' = 'in';
  private onTransitionComplete: (() => void) | null = null;

  private hudPanelX = 20;
  private hudPanelY = 20;
  private hudPanelWidth = 180;
  private hudPanelHeight = 100;

  private explorationPanelX: number;
  private explorationPanelY = 20;
  private explorationPanelWidth = 160;
  private explorationPanelHeight = 50;

  private coresPanelX: number;
  private coresPanelY: number;
  private coresPanelWidth = 180;
  private coresPanelHeight = 60;

  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      health: 3,
      maxHealth: 3,
      explorationPercentage: 0,
      energyCores: 0,
      totalEnergyCores: 5,
      sceneTransitionAlpha: 1,
      isTransitioning: true,
      gameState: 'playing',
    };

    this.explorationPanelX = canvas.width - this.explorationPanelWidth - 20;
    this.coresPanelX = canvas.width - this.coresPanelWidth - 20;
    this.coresPanelY = canvas.height - this.coresPanelHeight - 20;

    this.initHearts();
    this.initEnergyDots();
  }

  private initHearts(): void {
    this.hearts = [];
    for (let i = 0; i < this.state.maxHealth; i++) {
      this.hearts.push({
        filled: i < this.state.health,
        crackProgress: 0,
        shakeOffset: 0,
      });
    }
  }

  private initEnergyDots(): void {
    this.energyDots = [];
    for (let i = 0; i < this.state.totalEnergyCores; i++) {
      this.energyDots.push({
        active: i < this.state.energyCores,
        glowPhase: (i / this.state.totalEnergyCores) * Math.PI * 2,
        appearProgress: i < this.state.energyCores ? 1 : 0,
      });
    }
  }

  public update(dt: number): void {
    this.time += dt;

    if (this.state.isTransitioning) {
      this.updateTransition(dt);
    }

    this.updateHearts(dt);
    this.updateEnergyDots(dt);
    this.updateButtons(dt);
  }

  private updateTransition(dt: number): void {
    this.transitionTimer += dt;
    const progress = Math.min(1, this.transitionTimer / this.transitionDuration);

    if (this.transitionDirection === 'in') {
      this.state.sceneTransitionAlpha = 1 - progress;
    } else {
      this.state.sceneTransitionAlpha = progress;
    }

    if (progress >= 1) {
      this.state.isTransitioning = false;
      if (this.onTransitionComplete) {
        this.onTransitionComplete();
        this.onTransitionComplete = null;
      }
    }
  }

  private updateHearts(dt: number): void {
    for (let i = 0; i < this.hearts.length; i++) {
      const heart = this.hearts[i];
      if (i >= this.state.health && heart.crackProgress < 1) {
        heart.crackProgress = Math.min(1, heart.crackProgress + dt * 3);
        heart.shakeOffset = Math.sin(this.time * 50) * (1 - heart.crackProgress) * 3;
      } else if (heart.crackProgress >= 1) {
        heart.shakeOffset *= 0.9;
      }
    }
  }

  private updateEnergyDots(dt: number): void {
    for (let i = 0; i < this.energyDots.length; i++) {
      const dot = this.energyDots[i];
      dot.glowPhase += dt * 2;

      if (i < this.state.energyCores && dot.appearProgress < 1) {
        dot.appearProgress = Math.min(1, dot.appearProgress + dt * 4);
        dot.active = true;
      }
    }
  }

  private updateButtons(dt: number): void {
    for (const button of this.buttons) {
      if (button.hovered) {
        button.hoverScale = Math.min(1.1, button.hoverScale + dt * 4);
        button.glowIntensity = Math.min(1, button.glowIntensity + dt * 5);
      } else {
        button.hoverScale = Math.max(1, button.hoverScale - dt * 4);
        button.glowIntensity = Math.max(0, button.glowIntensity - dt * 5);
      }
    }
  }

  public render(): void {
    const ctx = this.ctx;

    if (this.state.gameState === 'menu') {
      this.renderMenu();
    } else if (this.state.gameState === 'playing' || this.state.gameState === 'paused') {
      this.renderHUDPanel();
      this.renderExplorationPanel();
      this.renderCoresPanel();
    }

    if (this.state.isTransitioning || this.state.sceneTransitionAlpha > 0) {
      this.renderTransitionOverlay();
    }
  }

  private renderHUDPanel(): void {
    const ctx = this.ctx;
    const x = this.hudPanelX;
    const y = this.hudPanelY;
    const w = this.hudPanelWidth;
    const h = this.hudPanelHeight;

    ctx.save();
    ctx.globalAlpha = 0.8;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    ctx.globalAlpha = 1;

    ctx.fillStyle = '#7ea3ff';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillText('生命值', x + 15, y + 30);

    for (let i = 0; i < this.state.maxHealth; i++) {
      const heartX = x + 15 + i * 35;
      const heartY = y + 60;
      this.renderHeart(heartX, heartY, this.hearts[i]);
    }

    ctx.restore();
  }

  private renderHeart(x: number, y: number, heart: HeartState): void {
    const ctx = this.ctx;
    const size = 24;
    const offsetX = heart.shakeOffset;

    ctx.save();
    ctx.translate(x + offsetX, y);

    if (!heart.filled && heart.crackProgress > 0) {
      ctx.globalAlpha = 1 - heart.crackProgress * 0.5;
    }

    ctx.fillStyle = heart.filled ? '#ff4757' : '#3d3d5c';
    ctx.strokeStyle = heart.filled ? '#ff6b7a' : '#5a5a7a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(size / 2, size * 0.3);
    ctx.bezierCurveTo(size / 2, size * 0.1, 0, size * 0.1, 0, size * 0.35);
    ctx.bezierCurveTo(0, size * 0.55, size / 2, size * 0.8, size / 2, size);
    ctx.bezierCurveTo(size / 2, size * 0.8, size, size * 0.55, size, size * 0.35);
    ctx.bezierCurveTo(size, size * 0.1, size / 2, size * 0.1, size / 2, size * 0.3);
    ctx.fill();
    ctx.stroke();

    if (heart.filled) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(size * 0.3, size * 0.3, size * 0.12, size * 0.08, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!heart.filled && heart.crackProgress > 0) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(size * 0.2, size * 0.4);
      ctx.lineTo(size * 0.5, size * 0.6);
      ctx.lineTo(size * 0.35, size * 0.85);
      ctx.moveTo(size * 0.7, size * 0.45);
      ctx.lineTo(size * 0.5, size * 0.7);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderExplorationPanel(): void {
    const ctx = this.ctx;
    const x = this.canvas.width - this.explorationPanelWidth - 20;
    const y = this.explorationPanelY;
    const w = this.explorationPanelWidth;
    const h = this.explorationPanelHeight;

    ctx.save();
    ctx.globalAlpha = 0.8;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    ctx.globalAlpha = 1;

    ctx.fillStyle = '#7ea3ff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText('探索进度', x + 15, y + 22);

    const percentage = Math.floor(this.state.explorationPercentage);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${percentage}%`, x + w - 15, y + 38);
    ctx.textAlign = 'left';

    const barX = x + 15;
    const barY = y + h - 12;
    const barW = w - 30;
    const barH = 4;

    ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
    this.roundRect(ctx, barX, barY, barW, barH, 2);
    ctx.fill();

    const fillW = barW * (this.state.explorationPercentage / 100);
    const gradient = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    gradient.addColorStop(0, '#4a9eff');
    gradient.addColorStop(1, '#7ea3ff');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, barX, barY, fillW, barH, 2);
    ctx.fill();

    ctx.restore();
  }

  private renderCoresPanel(): void {
    const ctx = this.ctx;
    const x = this.canvas.width - this.coresPanelWidth - 20;
    const y = this.canvas.height - this.coresPanelHeight - 20;
    const w = this.coresPanelWidth;
    const h = this.coresPanelHeight;

    ctx.save();
    ctx.globalAlpha = 0.8;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    ctx.globalAlpha = 1;

    ctx.fillStyle = '#7ea3ff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText('能量核心', x + 15, y + 22);

    const bagX = x + 15;
    const bagY = y + 35;
    this.renderBackpackIcon(bagX, bagY);

    const dotStartX = bagX + 35;
    const dotY = bagY + 12;
    const dotSpacing = 22;

    for (let i = 0; i < this.state.totalEnergyCores; i++) {
      const dotX = dotStartX + i * dotSpacing;
      this.renderEnergyDot(dotX, dotY, this.energyDots[i]);
    }

    ctx.restore();
  }

  private renderBackpackIcon(x: number, y: number): void {
    const ctx = this.ctx;
    const w = 24;
    const h = 28;

    ctx.save();

    ctx.fillStyle = '#3d4f6f';
    ctx.strokeStyle = '#5a7aa0';
    ctx.lineWidth = 2;

    this.roundRect(ctx, x, y + 4, w, h - 4, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2d3f5f';
    this.roundRect(ctx, x + 4, y + 10, w - 8, 10, 2);
    ctx.fill();

    ctx.strokeStyle = '#5a7aa0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.quadraticCurveTo(x + w / 2, y - 4, x + w - 4, y + 4);
    ctx.stroke();

    ctx.restore();
  }

  private renderEnergyDot(x: number, y: number, dot: EnergyDotState): void {
    const ctx = this.ctx;
    const baseRadius = 6;
    const radius = baseRadius * dot.appearProgress;

    if (dot.appearProgress <= 0) return;

    ctx.save();

    if (dot.active) {
      const glowRadius = radius + 8 + Math.sin(dot.glowPhase) * 3;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = dot.active ? '#ffd700' : '#3d3d5c';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (dot.active) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderMenu(): void {
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 15, 0.95)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#7ea3ff';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('回声探索', centerX, centerY - 80);

    ctx.fillStyle = '#5a7aa0';
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText('Echo Explorer', centerX, centerY - 50);

    ctx.textAlign = 'left';
    ctx.restore();
  }

  private renderTransitionOverlay(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = `rgba(5, 8, 15, ${this.state.sceneTransitionAlpha})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public setHealth(health: number): void {
    const prevHealth = this.state.health;
    this.state.health = Math.max(0, Math.min(this.state.maxHealth, health));

    if (this.state.health < prevHealth) {
      for (let i = this.state.health; i < prevHealth; i++) {
        if (this.hearts[i]) {
          this.hearts[i].filled = false;
          this.hearts[i].crackProgress = 0;
          this.hearts[i].shakeOffset = 5;
        }
      }
    } else if (this.state.health > prevHealth) {
      for (let i = prevHealth; i < this.state.health; i++) {
        if (this.hearts[i]) {
          this.hearts[i].filled = true;
          this.hearts[i].crackProgress = 0;
        }
      }
    }
  }

  public setExplorationPercentage(percentage: number): void {
    this.state.explorationPercentage = Math.max(0, Math.min(100, percentage));
  }

  public setEnergyCores(count: number): void {
    const prevCount = this.state.energyCores;
    this.state.energyCores = Math.max(0, Math.min(this.state.totalEnergyCores, count));

    if (this.state.energyCores > prevCount) {
      for (let i = prevCount; i < this.state.energyCores; i++) {
        if (this.energyDots[i]) {
          this.energyDots[i].appearProgress = 0;
          this.energyDots[i].active = true;
        }
      }
    }
  }

  public setTotalEnergyCores(total: number): void {
    this.state.totalEnergyCores = total;
    this.initEnergyDots();
  }

  public startSceneTransition(direction: 'in' | 'out', onComplete?: () => void): void {
    this.state.isTransitioning = true;
    this.transitionDirection = direction;
    this.transitionTimer = 0;
    this.onTransitionComplete = onComplete || null;

    if (direction === 'in') {
      this.state.sceneTransitionAlpha = 1;
    } else {
      this.state.sceneTransitionAlpha = 0;
    }
  }

  public handleMouseMove(mouseX: number, mouseY: number): void {
    for (const button of this.buttons) {
      button.hovered = this.isPointInRect(mouseX, mouseY, button);
    }
  }

  public handleClick(mouseX: number, mouseY: number): void {
    for (const button of this.buttons) {
      if (this.isPointInRect(mouseX, mouseY, button) && button.onClick) {
        button.onClick();
      }
    }
  }

  private isPointInRect(px: number, py: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
  }

  public setGameState(state: UIState['gameState']): void {
    this.state.gameState = state;
  }

  public resize(width: number, height: number): void {
    this.explorationPanelX = width - this.explorationPanelWidth - 20;
    this.coresPanelX = width - this.coresPanelWidth - 20;
    this.coresPanelY = height - this.coresPanelHeight - 20;
  }
}
