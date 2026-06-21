import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  COLORS,
  TARGET_FPS,
  IDLE_FPS,
  FADE_DURATION,
  GameMode
} from './constants';
import { LevelManager } from './level';
import { Player } from './player';
import { Editor } from './editor';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private levelManager: LevelManager;
  private player: Player;
  private editor: Editor;

  private mode: GameMode = 'editor';
  private nextMode: GameMode | null = null;
  private fadeStartTime: number = 0;
  private fadePhase: 'none' | 'out' | 'in' = 'none';
  private fadeAlpha: number = 0;

  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private fixedDeltaTime: number = 1000 / TARGET_FPS;
  private currentFps: number = TARGET_FPS;
  private lastInteractionTime: number = 0;
  private rafId: number | null = null;
  private running: boolean = false;

  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.levelManager = new LevelManager();
    this.player = new Player();
    this.editor = new Editor();

    this.setupCanvas();
    this.setupEventListeners();
    this.updateViewport();
  }

  private setupCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.updateViewport();
      this.markInteraction();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      if (this.mode === 'editor') {
        this.editor.handleMouseMove(mouseX, mouseY, performance.now());
      }
      this.markInteraction();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      if (this.mode === 'editor' && this.fadePhase === 'none') {
        this.editor.handleClick(mouseX, mouseY, e.button, this.levelManager);
      }
      this.markInteraction();
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.fadePhase === 'none') {
          this.toggleMode();
        }
      } else if (e.key.toLowerCase() === 'l') {
        if (this.fadePhase === 'none') {
          this.loadPresetLevel();
        }
      } else if (e.key.toLowerCase() === 's') {
        if (this.fadePhase === 'none') {
          this.exportLevel();
        }
      }

      if (this.mode === 'play') {
        this.player.handleKeyDown(e.key);
      }
      this.markInteraction();
    });

    window.addEventListener('keyup', (e) => {
      if (this.mode === 'play') {
        this.player.handleKeyUp(e.key);
      }
      this.markInteraction();
    });

    window.addEventListener('mousedown', () => this.markInteraction());
    window.addEventListener('keydown', () => this.markInteraction());
  }

  private markInteraction(): void {
    this.lastInteractionTime = performance.now();
    this.currentFps = TARGET_FPS;
  }

  private updateViewport(): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const scaleX = canvasWidth / CANVAS_WIDTH;
    const scaleY = canvasHeight / CANVAS_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (canvasWidth - CANVAS_WIDTH * this.scale) / 2;
    this.offsetY = (canvasHeight - CANVAS_HEIGHT * this.scale) / 2;
    this.editor.setViewport(canvasWidth, canvasHeight, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private toggleMode(): void {
    this.nextMode = this.mode === 'editor' ? 'play' : 'editor';
    this.fadePhase = 'out';
    this.fadeStartTime = performance.now();
    if (this.nextMode === 'play') {
      this.player.reset();
    }
  }

  private loadPresetLevel(): void {
    this.levelManager.loadLevel(this.levelManager.getPresetLevel());
  }

  private async exportLevel(): Promise<void> {
    const json = this.levelManager.exportLevel();
    try {
      await navigator.clipboard.writeText(json);
      console.log('关卡数据已复制到剪贴板');
    } catch {
      console.log('复制失败，请手动复制以下数据:');
      console.log(json);
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.lastInteractionTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.running) return;

    const elapsed = currentTime - this.lastInteractionTime;
    if (elapsed > 5000) {
      this.currentFps = IDLE_FPS;
    }

    const targetInterval = 1000 / this.currentFps;
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= targetInterval) {
      this.lastFrameTime = currentTime;
      this.accumulator += deltaTime;

      while (this.accumulator >= this.fixedDeltaTime) {
        this.update(this.fixedDeltaTime, currentTime);
        this.accumulator -= this.fixedDeltaTime;
      }

      this.render();
    }

    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  private update(_deltaTime: number, currentTime: number): void {
    this.updateFade(currentTime);
    this.editor.update(currentTime);

    if (this.mode === 'play' && this.fadePhase === 'none') {
      this.player.update(this.levelManager);
      const playerState = this.player.getState();
      if (!playerState.isAlive) {
        this.player.reset();
      }
    }
  }

  private updateFade(currentTime: number): void {
    if (this.fadePhase === 'none') return;

    const elapsed = currentTime - this.fadeStartTime;
    const t = Math.min(elapsed / FADE_DURATION, 1);

    if (this.fadePhase === 'out') {
      this.fadeAlpha = t;
      if (t >= 1) {
        if (this.nextMode !== null) {
          this.mode = this.nextMode;
          this.nextMode = null;
        }
        this.fadePhase = 'in';
        this.fadeStartTime = currentTime;
      }
    } else if (this.fadePhase === 'in') {
      this.fadeAlpha = 1 - t;
      if (t >= 1) {
        this.fadePhase = 'none';
        this.fadeAlpha = 0;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.mode === 'editor') {
      this.renderEditorContent();
    } else {
      this.renderPlayContent();
    }

    ctx.restore();

    this.renderModeText();

    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(26, 32, 44, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  private renderEditorContent(): void {
    const ctx = this.ctx;
    this.renderGrid(ctx);
    this.renderHoverHighlight(ctx);
    this.renderPlatforms(ctx);
    this.renderGoal(ctx);
  }

  private renderPlayContent(): void {
    const ctx = this.ctx;
    this.renderPlatforms(ctx);
    this.renderGoal(ctx);
    this.player.render(ctx);

    const playerState = this.player.getState();
    if (playerState.reachedGoal) {
      ctx.fillStyle = COLORS.TEXT;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('恭喜通关！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.textAlign = 'start';
    }
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 1;
    const gridCols = CANVAS_WIDTH / GRID_SIZE;
    const gridRows = CANVAS_HEIGHT / GRID_SIZE;

    for (let x = 0; x <= gridCols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * GRID_SIZE + 0.5, 0);
      ctx.lineTo(x * GRID_SIZE + 0.5, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= gridRows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * GRID_SIZE + 0.5);
      ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE + 0.5);
      ctx.stroke();
    }
  }

  private renderHoverHighlight(ctx: CanvasRenderingContext2D): void {
    this.editor.render(ctx, this.levelManager);
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D): void {
    const platforms = this.levelManager.getPlatforms();
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

  private renderGoal(ctx: CanvasRenderingContext2D): void {
    const goal = this.levelManager.getGoal();
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

  private renderModeText(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.TEXT;
    ctx.font = '14px sans-serif';

    const modeText = this.mode === 'editor' ? '编辑模式' : '游玩模式';
    ctx.fillText(modeText, 10, 22);

    const helpText = this.mode === 'editor'
      ? '左键放置 | 右键删除 | 空格切换模式 | L加载预置 | S导出'
      : 'WASD/方向键移动跳跃 | 空格切换模式';

    ctx.font = '12px sans-serif';
    ctx.fillText(helpText, 10, this.canvas.height - 12);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
