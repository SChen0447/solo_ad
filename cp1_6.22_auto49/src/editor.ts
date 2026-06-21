import {
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS,
  COLORS
} from './constants';
import { LevelManager } from './level';

export class Editor {
  private hoveredGridX: number = -1;
  private hoveredGridY: number = -1;
  private targetHoverX: number = -1;
  private targetHoverY: number = -1;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  public setViewport(canvasWidth: number, canvasHeight: number, gameWidth: number, gameHeight: number): void {
    const scaleX = canvasWidth / gameWidth;
    const scaleY = canvasHeight / gameHeight;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (canvasWidth - gameWidth * this.scale) / 2;
    this.offsetY = (canvasHeight - gameHeight * this.scale) / 2;
  }

  public screenToGrid(screenX: number, screenY: number): { gridX: number; gridY: number } {
    const gameX = (screenX - this.offsetX) / this.scale;
    const gameY = (screenY - this.offsetY) / this.scale;
    const gridX = Math.floor(gameX / GRID_SIZE);
    const gridY = Math.floor(gameY / GRID_SIZE);
    return { gridX, gridY };
  }

  public handleMouseMove(screenX: number, screenY: number, _currentTime: number): void {
    const { gridX, gridY } = this.screenToGrid(screenX, screenY);
    this.targetHoverX = gridX;
    this.targetHoverY = gridY;
  }

  public handleClick(screenX: number, screenY: number, button: number, levelManager: LevelManager): void {
    const { gridX, gridY } = this.screenToGrid(screenX, screenY);
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return;
    }
    if (button === 0) {
      levelManager.addPlatform(gridX, gridY);
    } else if (button === 2) {
      levelManager.removePlatform(gridX, gridY);
    }
  }

  public update(_currentTime: number): void {
    this.hoveredGridX = this.targetHoverX;
    this.hoveredGridY = this.targetHoverY;
  }

  public render(ctx: CanvasRenderingContext2D, levelManager: LevelManager): void {
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.renderGrid(ctx);
    this.renderHoverHighlight(ctx);
    this.renderPlatforms(ctx, levelManager);
    this.renderGoal(ctx, levelManager);

    ctx.restore();
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * GRID_SIZE + 0.5, 0);
      ctx.lineTo(x * GRID_SIZE + 0.5, GRID_ROWS * GRID_SIZE);
      ctx.stroke();
    }

    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * GRID_SIZE + 0.5);
      ctx.lineTo(GRID_COLS * GRID_SIZE, y * GRID_SIZE + 0.5);
      ctx.stroke();
    }
  }

  private renderHoverHighlight(ctx: CanvasRenderingContext2D): void {
    if (
      this.hoveredGridX < 0 ||
      this.hoveredGridX >= GRID_COLS ||
      this.hoveredGridY < 0 ||
      this.hoveredGridY >= GRID_ROWS
    ) {
      return;
    }
    ctx.fillStyle = COLORS.HOVER_HIGHLIGHT;
    ctx.fillRect(
      this.hoveredGridX * GRID_SIZE,
      this.hoveredGridY * GRID_SIZE,
      GRID_SIZE,
      GRID_SIZE
    );
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, levelManager: LevelManager): void {
    const platforms = levelManager.getPlatforms();
    for (const platform of platforms) {
      ctx.fillStyle = COLORS.PLATFORM;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        platform.x + 0.5,
        platform.y + 0.5,
        platform.width - 1,
        platform.height - 1
      );
    }
  }

  private renderGoal(ctx: CanvasRenderingContext2D, levelManager: LevelManager): void {
    const goal = levelManager.getGoal();
    if (!goal) return;

    ctx.fillStyle = COLORS.GOAL;
    ctx.fillRect(goal.x, goal.y, 6, GRID_SIZE);

    ctx.fillStyle = COLORS.GOAL;
    ctx.beginPath();
    ctx.moveTo(goal.x + 6, goal.y);
    ctx.lineTo(goal.x + 6 + 14, goal.y + 6);
    ctx.lineTo(goal.x + 6, goal.y + 12);
    ctx.closePath();
    ctx.fill();
  }

  public renderUI(ctx: CanvasRenderingContext2D, modeText: string): void {
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '14px sans-serif';
    ctx.fillText(modeText, 10, 22);

    if (modeText === '编辑模式') {
      ctx.fillText('左键放置 | 右键删除 | 空格切换模式 | L加载预置 | S导出', 10, ctx.canvas.height - 10);
    } else {
      ctx.fillText('WASD移动跳跃 | 空格切换模式', 10, ctx.canvas.height - 10);
    }
  }
}
