import { Maze } from './maze';
import { Ball } from './ball';
import { ObstacleManager, ObstacleConfig } from './obstacle';
import { UIManager, AudioManager, GameState, UIState } from './ui';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze: Maze | null = null;
  private ball: Ball;
  private obstacleManager: ObstacleManager;
  private ui: UIManager;
  private audio: AudioManager;

  private gameState: GameState = 'menu';
  private level: number = 1;
  private score: number = 0;
  private lives: number = 3;
  private timeLeft: number = 90;
  private elapsedTime: number = 0;
  private finalScore: number = 0;
  private victoryTime: number = 0;
  private stateTimer: number = 0;

  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.ball = new Ball();
    this.obstacleManager = new ObstacleManager();
    this.ui = new UIManager(this.canvas, this.ctx);
    this.audio = new AudioManager();

    this.ui.onButtonClick = (id: string) => this.handleButtonClick(id);

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.maze) {
      this.maze.calculateCellSize(window.innerWidth, window.innerHeight);
      const start = this.maze.getStartPosition();
      this.ball.radius = this.maze.cellSize * 0.3;
      this.ball.reset(start.x, start.y, this.ball.radius);
      const cfg: ObstacleConfig = {
        gridSize: this.maze.gridSize,
        count: 2 + this.level * 2,
        speedMultiplier: 1 + (this.level - 1) * 0.15
      };
      this.obstacleManager.generate(this.maze, cfg);
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'start') {
      this.startGame();
    } else if (id === 'restart') {
      this.startGame();
    } else if (id === 'next') {
      this.nextLevel();
    }
  }

  private startGame(): void {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.initLevel();
  }

  private nextLevel(): void {
    this.level++;
    this.initLevel();
  }

  private initLevel(): void {
    const gridSize = 10 + (this.level - 1) * 2;
    this.maze = new Maze(gridSize);
    this.maze.calculateCellSize(window.innerWidth, window.innerHeight);

    this.ball.baseSpeed = 180 + (this.level - 1) * 15;
    const start = this.maze.getStartPosition();
    this.ball.reset(start.x, start.y, this.maze.cellSize * 0.3);

    const cfg: ObstacleConfig = {
      gridSize,
      count: 2 + this.level * 2,
      speedMultiplier: 1 + (this.level - 1) * 0.15
    };
    this.obstacleManager.generate(this.maze, cfg);
    this.obstacleManager.onCollision = () => {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.resetBall();
      }
    };

    this.timeLeft = 90 + (this.level - 1) * 15;
    this.elapsedTime = 0;
    this.gameState = 'levelTransition';
    this.stateTimer = 0;
    this.ui.levelFlash = 1;
    this.ui.levelFade = 0.6;
  }

  private resetBall(): void {
    if (!this.maze) return;
    const start = this.maze.getStartPosition();
    this.ball.reset(start.x, start.y, this.ball.radius);
    this.audio.playHit();
  }

  private loop(timestamp: number): void {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render(dt);

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    this.stateTimer += dt;
    this.ui.update(dt);

    if (this.gameState === 'levelTransition') {
      if (this.stateTimer > 0.8) {
        this.gameState = 'playing';
        this.stateTimer = 0;
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    this.elapsedTime += dt;
    this.timeLeft -= dt;

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.timeLeft = 90 + (this.level - 1) * 15;
        this.resetBall();
      }
      return;
    }

    if (this.maze) {
      this.ball.update(dt, this.maze);
      this.obstacleManager.update(dt);
      this.maze.updateCoins(dt);

      const coinScore = this.maze.checkCoinCollision(this.ball.x, this.ball.y, this.ball.radius);
      if (coinScore > 0) {
        this.score += coinScore;
        this.audio.playCoin();
      }

      if (this.obstacleManager.checkCollision(this.ball.x, this.ball.y, this.ball.radius)) {
        return;
      }

      if (this.maze.checkGoalReached(this.ball.x, this.ball.y, this.ball.radius)) {
        this.victory();
      }
    }
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.stateTimer = 0;
    this.finalScore = this.score;
    this.audio.playHit();
  }

  private victory(): void {
    this.gameState = 'victory';
    this.stateTimer = 0;
    this.finalScore = this.score;
    this.victoryTime = this.elapsedTime;
    this.score += Math.floor(this.timeLeft * 5);
    this.finalScore = this.score;
    this.ui.spawnVictoryParticles(window.innerWidth / 2, window.innerHeight / 2);
    this.audio.playVictory();
  }

  private render(_dt: number): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const time = performance.now() / 1000;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(1, '#000000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.maze && this.gameState !== 'menu') {
      ctx.save();
      const shake = this.ball.getShake();
      ctx.translate(shake.x, shake.y);

      this.maze.render(ctx, time);
      this.obstacleManager.render(ctx, time);
      this.ball.render(ctx);

      ctx.restore();
    }

    const uiState: UIState = {
      score: this.score,
      lives: this.lives,
      timeLeft: this.timeLeft,
      level: this.level,
      finalScore: this.finalScore,
      victoryTime: this.victoryTime
    };
    this.ui.render(this.gameState, uiState, this.stateTimer);
  }
}

window.addEventListener('load', () => {
  new Game();
});
