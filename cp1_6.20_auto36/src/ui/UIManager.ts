import type { GameState } from '../game/GameEngine';

export class UIManager {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private restartButton: { x: number; y: number; width: number; height: number } | null = null;
  private hoverTime = 0;
  private isHovering = false;
  private readonly NEON_COLOR = '#00ffcc';
  private readonly BG_COLOR = '#0a0a2e';

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.setupMouseListeners();
  }

  private setupMouseListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.restartButton) {
        const btn = this.restartButton;
        this.isHovering = x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height;
        this.canvas.style.cursor = this.isHovering ? 'pointer' : 'default';
      }
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.restartButton) {
        const btn = this.restartButton;
        if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
          const event = new CustomEvent('restartGame');
          window.dispatchEvent(event);
        }
      }
    });
  }

  private drawScore(score: number, deltaTime: number): void {
    this.ctx.save();

    this.ctx.font = 'bold 36px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.ctx.shadowColor = this.NEON_COLOR;
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = this.NEON_COLOR;
    this.ctx.fillText(`SCORE: ${score}`, 30, 30);

    this.ctx.font = '18px "Segoe UI", sans-serif';
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = 'rgba(0, 255, 204, 0.7)';
    this.ctx.fillText('WASD / 方向键 切换重力', 30, 75);

    this.ctx.restore();
  }

  private drawGameOver(score: number, deltaTime: number): void {
    if (this.isHovering) {
      this.hoverTime += deltaTime;
    } else {
      this.hoverTime = Math.max(0, this.hoverTime - deltaTime);
    }

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const panelWidth = 400;
    const panelHeight = 300;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.beginPath();
    const radius = 20;
    const x = centerX - panelWidth / 2;
    const y = centerY - panelHeight / 2;
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + panelWidth - radius, y);
    this.ctx.quadraticCurveTo(x + panelWidth, y, x + panelWidth, y + radius);
    this.ctx.lineTo(x + panelWidth, y + panelHeight - radius);
    this.ctx.quadraticCurveTo(x + panelWidth, y + panelHeight, x + panelWidth - radius, y + panelHeight);
    this.ctx.lineTo(x + radius, y + panelHeight);
    this.ctx.quadraticCurveTo(x, y + panelHeight, x, y + panelHeight - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();

    this.ctx.fillStyle = 'rgba(10, 10, 46, 0.85)';
    this.ctx.fill();

    this.ctx.strokeStyle = this.NEON_COLOR;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = this.NEON_COLOR;
    this.ctx.shadowBlur = 20;
    this.ctx.stroke();

    this.ctx.filter = 'blur(8px)';
    this.ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
    this.ctx.fill();
    this.ctx.filter = 'none';

    this.ctx.shadowBlur = 20;
    this.ctx.font = 'bold 48px "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.NEON_COLOR;
    this.ctx.fillText('游戏结束', centerX, y + 60);

    this.ctx.font = '24px "Segoe UI", sans-serif';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillText('最终得分', centerX, y + 130);

    this.ctx.font = 'bold 56px "Segoe UI", sans-serif';
    this.ctx.shadowBlur = 25;
    this.ctx.fillStyle = this.NEON_COLOR;
    this.ctx.fillText(`${score}`, centerX, y + 190);

    const btnWidth = 180;
    const btnHeight = 55;
    const btnX = centerX - btnWidth / 2;
    const btnY = y + 230;

    this.restartButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };

    const hoverProgress = Math.min(1, this.hoverTime / 300);
    const brightness = 1 + hoverProgress * 0.3;
    const glowSize = 15 + hoverProgress * 20;

    this.ctx.beginPath();
    const btnRadius = 10;
    this.ctx.moveTo(btnX + btnRadius, btnY);
    this.ctx.lineTo(btnX + btnWidth - btnRadius, btnY);
    this.ctx.quadraticCurveTo(btnX + btnWidth, btnY, btnX + btnWidth, btnY + btnRadius);
    this.ctx.lineTo(btnX + btnWidth, btnY + btnHeight - btnRadius);
    this.ctx.quadraticCurveTo(btnX + btnWidth, btnY + btnHeight, btnX + btnWidth - btnRadius, btnY + btnHeight);
    this.ctx.lineTo(btnX + btnRadius, btnY + btnHeight);
    this.ctx.quadraticCurveTo(btnX, btnY + btnHeight, btnX, btnY + btnHeight - btnRadius);
    this.ctx.lineTo(btnX, btnY + btnRadius);
    this.ctx.quadraticCurveTo(btnX, btnY, btnX + btnRadius, btnY);
    this.ctx.closePath();

    this.ctx.shadowColor = this.NEON_COLOR;
    this.ctx.shadowBlur = glowSize;
    const r = Math.floor(0 * brightness);
    const g = Math.floor(255 * brightness);
    const b = Math.floor(204 * brightness);
    this.ctx.fillStyle = `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2 + hoverProgress * 2;
    this.ctx.stroke();

    if (hoverProgress > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = hoverProgress * 0.5;
      this.ctx.shadowBlur = glowSize * 2;
      this.ctx.strokeStyle = this.NEON_COLOR;
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.shadowBlur = 8;
    this.ctx.font = 'bold 22px "Segoe UI", sans-serif';
    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillText('重新开始', centerX, btnY + btnHeight / 2 + 8);

    this.ctx.restore();
  }

  public render(state: GameState, deltaTime: number): void {
    this.drawScore(state.displayScore, deltaTime);

    if (state.gameOver) {
      this.drawGameOver(state.displayScore, deltaTime);
    } else {
      this.restartButton = null;
      this.hoverTime = 0;
      this.isHovering = false;
      this.canvas.style.cursor = 'default';
    }
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.restartButton = null;
  }
}
