export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private logicalWidth: number;
  private logicalHeight: number;
  private scale: number;
  private gameOverAnimTime: number;
  private gameOverAnimDuration: number;

  constructor(canvas: HTMLCanvasElement, logicalWidth: number = 1280, logicalHeight: number = 720) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.logicalWidth = logicalWidth;
    this.logicalHeight = logicalHeight;
    this.width = logicalWidth;
    this.height = logicalHeight;
    this.scale = 1;
    this.gameOverAnimTime = 0;
    this.gameOverAnimDuration = 0.4;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')!;

    this.resize();
    this.preRenderBackground();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = this.logicalWidth / this.logicalHeight;

    let canvasWidth = containerWidth;
    let canvasHeight = containerWidth / aspectRatio;

    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * aspectRatio;
    }

    this.scale = Math.min(1, containerWidth / 800);
    this.width = canvasWidth;
    this.height = canvasHeight;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.offscreenCanvas.width = this.logicalWidth;
    this.offscreenCanvas.height = this.logicalHeight;
    this.backgroundCanvas.width = this.logicalWidth;
    this.backgroundCanvas.height = this.logicalHeight;

    this.preRenderBackground();
  }

  private preRenderBackground(): void {
    const ctx = this.backgroundCtx;
    const w = this.logicalWidth;
    const h = this.logicalHeight;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.6 + 0.2;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    this.offscreenCtx.drawImage(this.backgroundCanvas, 0, 0);
  }

  getContext(): CanvasRenderingContext2D {
    return this.offscreenCtx;
  }

  getLogicalWidth(): number {
    return this.logicalWidth;
  }

  getLogicalHeight(): number {
    return this.logicalHeight;
  }

  getScale(): number {
    return this.scale;
  }

  drawUI(
    score: number,
    energy: number,
    gameTime: number,
    difficultyLevel: number,
    isGameOver: boolean,
    finalScore: number,
    finalTime: number,
    onRestart: () => void
  ): void {
    const ctx = this.offscreenCtx;
    const w = this.logicalWidth;
    const scale = this.scale;

    ctx.save();

    const panelWidth = 240 * scale;
    const panelHeight = 80 * scale;
    const padding = 16 * scale;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(padding, padding, panelWidth, panelHeight, 8 * scale);
    ctx.fill();

    ctx.font = `${24 * scale}px Consolas, monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`得分: ${score}`, padding + 12 * scale, padding + 10 * scale);

    const energyBarWidth = 200 * scale;
    const energyBarHeight = 16 * scale;
    const energyBarX = padding + 12 * scale;
    const energyBarY = padding + 44 * scale;

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.roundRect(energyBarX, energyBarY, energyBarWidth, energyBarHeight, 4 * scale);
    ctx.fill();

    const energyGradient = ctx.createLinearGradient(energyBarX, energyBarY, energyBarX + energyBarWidth, energyBarY);
    energyGradient.addColorStop(0, '#2ed573');
    energyGradient.addColorStop(1, '#7bed9f');
    ctx.fillStyle = energyGradient;
    const fillWidth = (energy / 100) * energyBarWidth;
    ctx.beginPath();
    ctx.roundRect(energyBarX, energyBarY, fillWidth, energyBarHeight, 4 * scale);
    ctx.fill();

    const difficultyBarWidth = w - padding * 2;
    const difficultyBarHeight = 8 * scale;
    const difficultyBarX = padding;
    const difficultyBarY = padding * 2 + panelHeight;

    const difficultyGradient = ctx.createLinearGradient(difficultyBarX, 0, difficultyBarX + difficultyBarWidth, 0);
    difficultyGradient.addColorStop(0, '#2ed573');
    difficultyGradient.addColorStop(0.5, '#ffa502');
    difficultyGradient.addColorStop(1, '#ff4757');
    ctx.fillStyle = difficultyGradient;
    ctx.beginPath();
    ctx.roundRect(difficultyBarX, difficultyBarY, difficultyBarWidth, difficultyBarHeight, 4 * scale);
    ctx.fill();

    const progress = Math.min(1, gameTime / 120);
    const markerX = difficultyBarX + progress * difficultyBarWidth;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(markerX, difficultyBarY + difficultyBarHeight / 2, 6 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${14 * scale}px Consolas, monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`难度等级: ${difficultyLevel}`, markerX, difficultyBarY - 8 * scale);

    ctx.restore();

    if (isGameOver) {
      this.drawGameOverPanel(finalScore, finalTime, onRestart);
    }
  }

  private drawGameOverPanel(score: number, time: number, onRestart: () => void): void {
    const ctx = this.offscreenCtx;
    const w = this.logicalWidth;
    const h = this.logicalHeight;
    const scale = this.scale;

    if (this.gameOverAnimTime < this.gameOverAnimDuration) {
      this.gameOverAnimTime += 1 / 60;
    }

    const progress = Math.min(1, this.gameOverAnimTime / this.gameOverAnimDuration);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const panelScale = 0.5 + easeOut * 0.5;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(panelScale, panelScale);

    const panelWidth = 400 * scale;
    const panelHeight = 300 * scale;

    ctx.fillStyle = 'rgba(10, 10, 46, 0.95)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 16 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.font = `bold ${36 * scale}px Consolas, monospace`;
    ctx.fillStyle = '#ff4757';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff4757';
    ctx.fillText('游戏结束', 0, -80 * scale);

    ctx.shadowBlur = 0;
    ctx.font = `${24 * scale}px Consolas, monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`最终得分: ${score}`, 0, -20 * scale);
    ctx.fillText(`游戏时长: ${time.toFixed(1)}秒`, 0, 20 * scale);

    const buttonWidth = 160 * scale;
    const buttonHeight = 50 * scale;
    const buttonY = 80 * scale;

    const buttonGradient = ctx.createLinearGradient(-buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth / 2, buttonY + buttonHeight / 2);
    buttonGradient.addColorStop(0, '#ff4757');
    buttonGradient.addColorStop(1, '#ff6b6b');
    ctx.fillStyle = buttonGradient;
    ctx.beginPath();
    ctx.roundRect(-buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 8 * scale);
    ctx.fill();

    ctx.font = `bold ${20 * scale}px Consolas, monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('重新开始', 0, buttonY);

    ctx.restore();

    const canvasRect = this.canvas.getBoundingClientRect();
    const buttonLeft = canvasRect.left + (w / 2 - buttonWidth / 2 * panelScale) * (this.width / w);
    const buttonTop = canvasRect.top + (h / 2 + buttonY - buttonHeight / 2 * panelScale) * (this.height / h);
    const buttonRight = buttonLeft + buttonWidth * panelScale * (this.width / w);
    const buttonBottom = buttonTop + buttonHeight * panelScale * (this.height / h);

    (this.canvas as any)._restartButton = { left: buttonLeft, top: buttonTop, right: buttonRight, bottom: buttonBottom, onClick: onRestart };
  }

  resetGameOverAnimation(): void {
    this.gameOverAnimTime = 0;
  }

  present(): void {
    this.ctx.drawImage(
      this.offscreenCanvas,
      0, 0, this.logicalWidth, this.logicalHeight,
      0, 0, this.width, this.height
    );
  }

  toScreenX(logicalX: number): number {
    return logicalX * (this.width / this.logicalWidth);
  }

  toScreenY(logicalY: number): number {
    return logicalY * (this.height / this.logicalHeight);
  }
}
