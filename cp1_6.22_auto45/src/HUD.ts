export class HUD {
  score: number = 0;
  distance: number = 0;
  gameOver: boolean = false;
  gameStarted: boolean = false;
  gameOverTimer: number = 0;
  blinkTimer: number = 0;
  startBlinkTimer: number = 0;

  addScore(points: number): void {
    this.score += points;
  }

  updateDistance(pixels: number): void {
    this.distance = pixels;
  }

  getDistanceInMeters(): number {
    return Math.floor(this.distance / 50);
  }

  update(deltaTime: number): void {
    this.blinkTimer += deltaTime;
    this.startBlinkTimer += deltaTime;

    if (this.gameOver) {
      this.gameOverTimer += deltaTime;
    }
  }

  canRestart(): boolean {
    return this.gameOver && this.gameOverTimer >= 2;
  }

  setGameOver(value: boolean): void {
    this.gameOver = value;
    this.gameOverTimer = 0;
  }

  setGameStarted(value: boolean): void {
    this.gameStarted = value;
  }

  reset(): void {
    this.score = 0;
    this.distance = 0;
    this.gameOver = false;
    this.gameOverTimer = 0;
    this.blinkTimer = 0;
  }

  drawTextWithStroke(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number = 20,
    color: string = '#ffffff',
    strokeColor: string = '#000000',
    strokeWidth: number = 3
  ): void {
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textBaseline = 'top';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'miter';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    this.drawTextWithStroke(ctx, `Score: ${this.score}`, 16, 16, 20);
    this.drawTextWithStroke(ctx, `Distance: ${this.getDistanceInMeters()}m`, 16, 44, 20);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('PIXEL RUNNER', 16, canvasHeight - 28);

    if (!this.gameStarted) {
      const blink = Math.sin(this.startBlinkTimer * Math.PI * 2 / 0.5) * 0.3 + 0.7;
      ctx.globalAlpha = blink;

      const text = 'Press SPACE to Start';
      ctx.font = 'bold 28px "Courier New", monospace';
      const textWidth = ctx.measureText(text).width;
      const textX = (canvasWidth - textWidth) / 2;
      const textY = canvasHeight / 2 - 20;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'miter';
      ctx.strokeText(text, textX, textY);
      ctx.fillStyle = '#a0d8ef';
      ctx.fillText(text, textX, textY);

      ctx.globalAlpha = 1;
    }

    if (this.gameOver) {
      const visible = Math.sin(this.blinkTimer * Math.PI * 2 / 0.5) > 0;

      if (visible) {
        const text = 'Game Over';
        ctx.font = 'bold 48px "Courier New", monospace';
        const textWidth = ctx.measureText(text).width;
        const textX = (canvasWidth - textWidth) / 2;
        const textY = canvasHeight / 2 - 40;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'miter';
        ctx.strokeText(text, textX, textY);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, textX, textY);
      }

      const scoreText = `Final Score: ${this.score}`;
      ctx.font = 'bold 24px "Courier New", monospace';
      const scoreWidth = ctx.measureText(scoreText).width;
      const scoreX = (canvasWidth - scoreWidth) / 2;
      const scoreY = canvasHeight / 2 + 20;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'miter';
      ctx.strokeText(scoreText, scoreX, scoreY);
      ctx.fillStyle = '#fff';
      ctx.fillText(scoreText, scoreX, scoreY);

      if (this.canRestart()) {
        const restartText = 'Press R or Click to Restart';
        ctx.font = 'bold 20px "Courier New", monospace';
        const restartWidth = ctx.measureText(restartText).width;
        const restartX = (canvasWidth - restartWidth) / 2;
        const restartY = canvasHeight / 2 + 60;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'miter';
        ctx.strokeText(restartText, restartX, restartY);
        ctx.fillStyle = '#a0d8ef';
        ctx.fillText(restartText, restartX, restartY);
      }
    }
  }
}
