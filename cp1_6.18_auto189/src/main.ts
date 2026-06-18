import { Player } from './player';
import { AIManager, PathPoint } from './ai';
import { UIManager, ToolType } from './ui';
import './style.css';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 40;
const GRID_COLOR = '#3a4a3a';
const BG_COLOR = '#2a3a2a';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player | null = null;
  private aiManager: AIManager;
  private uiManager: UIManager;
  private pathPoints: PathPoint[] = [];
  private isPlacingPatrol: boolean = false;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.aiManager = new AIManager();

    this.uiManager = new UIManager({
      onToolSelect: (tool) => this.handleToolSelect(tool),
      onParamChange: (params) => this.handleParamChange(params),
      onClear: () => this.handleClear()
    });

    this.bindEvents();
    this.startGameLoop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleCanvasRightClick(e));

    window.addEventListener('keydown', (e) => {
      if (this.player) {
        this.player.handleKeyDown(e.key);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.player) {
        this.player.handleKeyUp(e.key);
      }
    });
  }

  private handleCanvasRightClick(e: MouseEvent): void {
    e.preventDefault();
    if (this.isPlacingPatrol && this.pathPoints.length >= 2) {
      this.placePatrolAtFirstPoint();
    }
  }

  private handleToolSelect(tool: ToolType): void {
    if (tool === 'patrol') {
      if (this.pathPoints.length >= 2 && this.pathPoints.length <= 4) {
        this.placePatrolAtFirstPoint();
      } else {
        this.pathPoints = [];
        this.isPlacingPatrol = true;
      }
    } else if (tool === 'path') {
      this.isPlacingPatrol = false;
    } else {
      this.pathPoints = [];
      this.isPlacingPatrol = false;
    }
  }

  private handleParamChange(params: {
    patrolSpeed?: number;
    fovAngle?: number;
    alertTime?: number;
    fovRadius?: number;
  }): void {
    this.aiManager.setParams(params);
  }

  private handleClear(): void {
    this.player = null;
    this.aiManager.clear();
    this.pathPoints = [];
    this.isPlacingPatrol = false;
    this.uiManager.deselectTool();
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tool = this.uiManager.getSelectedTool();

    if (this.isPlacingPatrol) {
      this.placePathPoint(x, y);
      return;
    }

    switch (tool) {
      case 'player':
        this.placePlayer(x, y);
        break;
      case 'patrol':
        this.startPlacingPatrol();
        break;
      case 'sniper':
        this.placeSniper(x, y);
        break;
      case 'path':
        this.placePathPoint(x, y);
        break;
    }
  }

  private placePlayer(x: number, y: number): void {
    this.player = new Player(x, y);
  }

  private startPlacingPatrol(): void {
    this.isPlacingPatrol = true;
    this.pathPoints = [];
    this.uiManager.setToolActive('patrol', true);
  }

  private placePathPoint(x: number, y: number): void {
    if (this.pathPoints.length < 4) {
      this.pathPoints.push({ x, y });
    }

    if (this.pathPoints.length >= 4) {
      this.placePatrolAtFirstPoint();
    }
  }

  private placePatrolAtFirstPoint(): void {
    if (this.pathPoints.length >= 2 && this.pathPoints.length <= 4) {
      const startPoint = this.pathPoints[0];
      this.aiManager.addPatrol(startPoint.x, startPoint.y, this.pathPoints);
    }
    this.pathPoints = [];
    this.isPlacingPatrol = false;
    this.uiManager.setToolActive('patrol', false);
  }

  private placeSniper(x: number, y: number): void {
    this.aiManager.addSniper(x, y);
  }

  private startGameLoop(): void {
    this.gameLoop();
  }

  private gameLoop = (): void => {
    this.update();
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    if (this.player) {
      this.player.update(CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (this.player) {
      this.aiManager.update(this.player.getPosition());
    } else {
      this.aiManager.update({ x: -9999, y: -9999 });
    }

    const stats = this.aiManager.getStats();
    const playerPos = this.player ? this.player.getPosition() : { x: 0, y: 0 };
    this.uiManager.updateStats(
      stats.total,
      stats.patrol,
      stats.search,
      stats.chase,
      playerPos.x,
      playerPos.y
    );
  }

  private render(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawGrid();

    if (this.pathPoints.length > 0) {
      this.drawPendingPath();
    }

    this.aiManager.draw(this.ctx);

    if (this.player) {
      this.player.draw(this.ctx);
    }

    if (this.isPlacingPatrol) {
      this.drawHint();
    }
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }
  }

  private drawPendingPath(): void {
    if (this.pathPoints.length > 1) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(230, 230, 74, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
      for (let i = 1; i < this.pathPoints.length; i++) {
        this.ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
      }
      this.ctx.stroke();
      this.ctx.restore();
    }

    for (const point of this.pathPoints) {
      this.ctx.save();
      this.ctx.fillStyle = '#e6e64a';
      this.ctx.strokeStyle = '#b8b82a';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawHint(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText(`放置巡逻路径点 (${this.pathPoints.length}/4) - 右键完成`, 280, 30);
    this.ctx.restore();
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
