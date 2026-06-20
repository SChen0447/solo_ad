import { Renderer } from './renderer';
import { ParticleSystem } from './particle';
import { Player } from './player';
import { ObstacleSystem } from './obstacle';
import { PowerUpSystem } from './powerup';

interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  score: number;
  gameTime: number;
  finalScore: number;
  finalTime: number;
  lastTime: number;
  starSpawnTimer: number;
  targetFPS: number;
  frameTime: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private particleSystem: ParticleSystem;
  private player: Player;
  private obstacleSystem: ObstacleSystem;
  private powerUpSystem: PowerUpSystem;
  private state: GameState;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number };
  private animationId: number | null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    const logicalWidth = 1280;
    const logicalHeight = 720;

    this.renderer = new Renderer(this.canvas, logicalWidth, logicalHeight);
    this.particleSystem = new ParticleSystem(600);

    this.bounds = {
      minX: 40,
      maxX: logicalWidth - 40,
      minY: 120,
      maxY: logicalHeight - 80
    };

    this.player = new Player(
      logicalWidth / 2,
      logicalHeight - 120,
      this.bounds,
      this.particleSystem
    );

    this.obstacleSystem = new ObstacleSystem(this.bounds);
    this.powerUpSystem = new PowerUpSystem(this.bounds, this.particleSystem);

    this.state = {
      isPlaying: true,
      isGameOver: false,
      score: 0,
      gameTime: 0,
      finalScore: 0,
      finalTime: 0,
      lastTime: 0,
      starSpawnTimer: 0,
      targetFPS: 60,
      frameTime: 1000 / 60
    };

    this.animationId = null;

    this.setupEventListeners();
    this.initializeStars();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      if (this.state.isGameOver) {
        const button = (this.canvas as any)._restartButton;
        if (button) {
          const { clientX, clientY } = e;
          if (
            clientX >= button.left &&
            clientX <= button.right &&
            clientY >= button.top &&
            clientY <= button.bottom
          ) {
            button.onClick();
          }
        }
      }
    });

    window.addEventListener('resize', () => {
      this.updateBounds();
    });
  }

  private updateBounds(): void {
    const logicalWidth = this.renderer.getLogicalWidth();
    const logicalHeight = this.renderer.getLogicalHeight();

    this.bounds = {
      minX: 40,
      maxX: logicalWidth - 40,
      minY: 120,
      maxY: logicalHeight - 80
    };

    this.player.setBounds(this.bounds);
    this.obstacleSystem.setBounds(this.bounds);
    this.powerUpSystem.setBounds(this.bounds);
  }

  private initializeStars(): void {
    const w = this.renderer.getLogicalWidth();
    const h = this.renderer.getLogicalHeight();

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      this.particleSystem.emitStar(x, y, 300);
    }
  }

  private spawnStars(dt: number): void {
    this.state.starSpawnTimer -= dt;
    if (this.state.starSpawnTimer <= 0) {
      const w = this.renderer.getLogicalWidth();
      const activeStars = this.particleSystem.getActiveParticles().filter(p => p.type === 'star').length;

      if (activeStars < 200) {
        const x = Math.random() * w;
        const y = -10;
        this.particleSystem.emitStar(x, y, 300);
      }
      this.state.starSpawnTimer = 0.02;
    }
  }

  private restartGame = (): void => {
    const logicalWidth = this.renderer.getLogicalWidth();
    const logicalHeight = this.renderer.getLogicalHeight();

    this.state.isPlaying = true;
    this.state.isGameOver = false;
    this.state.score = 0;
    this.state.gameTime = 0;
    this.state.finalScore = 0;
    this.state.finalTime = 0;

    this.player.reset(logicalWidth / 2, logicalHeight - 120);
    this.obstacleSystem.reset();
    this.powerUpSystem.reset();
    this.particleSystem.clear();
    this.renderer.resetGameOverAnimation();

    this.initializeStars();
  };

  private update(dt: number): void {
    if (!this.state.isPlaying || this.state.isGameOver) return;

    this.state.gameTime += dt;

    this.obstacleSystem.updateDifficulty(this.state.gameTime);
    this.spawnStars(dt);

    this.player.update(dt);
    this.obstacleSystem.update(dt, this.state.gameTime);

    const speedMultiplier = 1 + (this.obstacleSystem.getCurrentSpeed() - 100) / 300;
    this.powerUpSystem.update(dt, this.obstacleSystem.getActiveObstacles(), speedMultiplier);

    this.particleSystem.update(dt);

    if (this.powerUpSystem.checkCollection(this.player.getPosition(), this.player.isBoosting())) {
      this.state.score += 1;
      this.player.addEnergy(10);
    }

    if (!this.player.isInvincible()) {
      if (this.obstacleSystem.checkCollision(this.player.getBounds())) {
        this.gameOver();
      }
    }
  }

  private gameOver(): void {
    this.state.isGameOver = true;
    this.state.isPlaying = false;
    this.state.finalScore = this.state.score;
    this.state.finalTime = this.state.gameTime;
  }

  private render(): void {
    this.renderer.clear();

    const ctx = this.renderer.getContext();

    this.particleSystem.render(ctx);

    if (this.state.isPlaying || this.state.isGameOver) {
      this.powerUpSystem.render(ctx);
      this.obstacleSystem.render(ctx);
      this.player.render(ctx);
    }

    this.renderer.drawUI(
      this.state.score,
      this.player.getEnergy(),
      this.state.gameTime,
      this.obstacleSystem.getDifficultyLevel(),
      this.state.isGameOver,
      this.state.finalScore,
      this.state.finalTime,
      this.restartGame
    );

    this.renderer.present();
  }

  private gameLoop(timestamp: number): void {
    if (!this.state.lastTime) {
      this.state.lastTime = timestamp;
    }

    let dt = (timestamp - this.state.lastTime) / 1000;
    this.state.lastTime = timestamp;

    if (dt > 0.1) {
      dt = 0.1;
    }

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  start(): void {
    this.state.lastTime = 0;
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.start();
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});
