import type { PlantState, Branch, Obstacle } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_HEIGHT,
  COLOR_SKY_TOP,
  COLOR_SKY_BOTTOM,
  COLOR_GROUND,
  COLOR_TRUNK_BROWN,
} from './types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      CANVAS_HEIGHT - GROUND_HEIGHT
    );
    gradient.addColorStop(0, COLOR_SKY_TOP);
    gradient.addColorStop(1, COLOR_SKY_BOTTOM);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);
  }

  private drawGround(): void {
    this.ctx.fillStyle = COLOR_GROUND;
    this.ctx.fillRect(
      0,
      CANVAS_HEIGHT - GROUND_HEIGHT,
      CANVAS_WIDTH,
      GROUND_HEIGHT
    );
  }

  private drawBranch(branch: Branch): void {
    const endX = branch.startX + Math.cos(branch.angle) * branch.length;
    const endY = branch.startY + Math.sin(branch.angle) * branch.length;

    this.ctx.strokeStyle = COLOR_TRUNK_BROWN;
    this.ctx.lineWidth = branch.thickness;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(branch.startX, branch.startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    branch.children.forEach((child) => this.drawBranch(child));
  }

  private drawLeaves(plantState: PlantState): void {
    plantState.allLeaves.forEach((leaf) => {
      this.ctx.fillStyle = leaf.color;
      this.ctx.beginPath();
      this.ctx.arc(leaf.x, leaf.y, leaf.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    obstacles.forEach((obstacle) => {
      const gradient = this.ctx.createRadialGradient(
        obstacle.x,
        obstacle.y,
        0,
        obstacle.x,
        obstacle.y,
        obstacle.radius
      );
      gradient.addColorStop(0, `rgba(100, 100, 100, ${obstacle.opacity})`);
      gradient.addColorStop(
        1,
        `rgba(150, 150, 150, ${obstacle.opacity * 0.3})`
      );
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private drawDataPanel(plantState: PlantState): void {
    const panelWidth = 220;
    const panelHeight = 120;
    const panelX = CANVAS_WIDTH - panelWidth - 10;
    const panelY = CANVAS_HEIGHT - panelHeight - GROUND_HEIGHT - 10;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    this.ctx.fill();

    this.ctx.font = "12px 'Courier New'";
    this.ctx.fillStyle = '#00ff00';

    const lineHeight = 24;
    const startY = panelY + 28;

    this.ctx.fillText(
      `生长速率: ${plantState.growthRate.toFixed(3)} px/帧`,
      panelX + 12,
      startY
    );
    this.ctx.fillText(
      `分支总数: ${plantState.totalBranches}`,
      panelX + 12,
      startY + lineHeight
    );
    this.ctx.fillText(
      `叶片颜色: RGB(${plantState.leafColor.r}, ${plantState.leafColor.g}, ${plantState.leafColor.b})`,
      panelX + 12,
      startY + lineHeight * 2
    );
    this.ctx.fillText(
      `FPS: ${plantState.fps}`,
      panelX + 12,
      startY + lineHeight * 3
    );
  }

  render(plantState: PlantState, obstacles: Obstacle[]): boolean {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground();
    this.drawGround();
    this.drawObstacles(obstacles);
    this.drawBranch(plantState.trunk);
    this.drawLeaves(plantState);
    this.drawDataPanel(plantState);

    return true;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
