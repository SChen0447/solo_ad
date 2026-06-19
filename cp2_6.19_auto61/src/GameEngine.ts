import { BeatSync, type BeatEvent } from './BeatSync';
import { Player } from './Player';
import { ObstacleManager } from './ObstacleManager';
import { Renderer } from './Renderer';

export type GameState = 'idle' | 'playing' | 'gameover';

export class GameEngine {
  private beatSync: BeatSync;
  private player: Player;
  private obstacleManager: ObstacleManager;
  private renderer: Renderer;

  private gameState: GameState = 'idle';
  private score: number = 0;
  private combo: number = 0;
  private highScore: number = 0;
  private gameSpeed: number = 300;
  private baseSpeed: number = 300;
  private maxSpeed: number = 800;

  private lastTime: number = 0;
  private animationId: number | null = null;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private lowQualityMode: boolean = false;

  private keys: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.beatSync = new BeatSync();
    this.player = new Player();
    this.obstacleManager = new ObstacleManager();
    this.renderer = new Renderer(canvas);

    this.loadHighScore();
    this.setupEventListeners();
    this.updateSizes();

    this.beatSync.onBeat((event) => this.onBeat(event));
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('rhythm_runner_highscore');
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  }

  private saveHighScore(): void {
    localStorage.setItem('rhythm_runner_highscore', this.highScore.toString());
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', () => this.updateSizes());
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    this.keys.add(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      if (this.gameState === 'idle') {
        this.startGame();
      } else if (this.gameState === 'playing') {
        this.player.jump();
      } else if (this.gameState === 'gameover') {
        this.restartGame();
      }
    }

    if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (this.gameState === 'playing') {
        this.player.slide();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private updateSizes(): void {
    const groundY = this.renderer.getGroundY();
    const width = this.renderer.getWidth();
    this.player.setGroundY(groundY);
    this.obstacleManager.setCanvasSize(width, groundY);
    this.obstacleManager.setBeatInterval(this.beatSync.getBeatInterval());
  }

  public start(): void {
    if (this.animationId !== null) return;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop = (timestamp: number): void => {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.updateFPS(dt);

    if (this.gameState === 'playing') {
      this.update(dt);
    }

    this.render(dt);

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private updateFPS(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;

    if (this.fpsTime >= 0.5) {
      this.currentFps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      if (this.currentFps < 50 && !this.lowQualityMode) {
        this.setLowQuality(true);
      } else if (this.currentFps >= 55 && this.lowQualityMode) {
        this.setLowQuality(false);
      }
    }
  }

  private setLowQuality(low: boolean): void {
    this.lowQualityMode = low;
    const particleCount = low ? 25 : 50;
    this.player.setMaxParticles(particleCount);
    this.obstacleManager.setMaxParticles(particleCount);
    this.renderer.setHighQuality(!low);
  }

  private update(dt: number): void {
    this.gameSpeed = Math.min(
      this.maxSpeed,
      this.baseSpeed + this.score * 0.5
    );

    this.player.update(dt, this.gameSpeed);
    this.obstacleManager.setGameSpeed(this.gameSpeed);
    this.obstacleManager.update(dt, this.beatSync.getCurrentTime());

    const playerHitbox = this.player.getHitbox();
    const collision = this.obstacleManager.checkCollisions(
      playerHitbox
    );

    if (collision.hit) {
      this.gameOver();
      return;
    }

    if (collision.coinCollected || collision.beatCoinCollected) {
      const isOnBeat = this.beatSync.isBeatNear(0.15);
      if (isOnBeat) {
        this.combo++;
      } else {
        this.combo = 1;
      }

      const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
      const baseScore = collision.beatCoinCollected ? 50 : 10;
      const addScore = Math.floor(baseScore * comboMultiplier);
      this.score += addScore;
    }

    this.score += Math.floor(this.gameSpeed * dt * 0.1);

    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  private onBeat(event: BeatEvent): void {
    if (this.gameState !== 'playing') return;

    this.obstacleManager.onBeat(event.beatIndex, event.time);
    this.renderer.onBeat(event.time);
  }

  private render(dt: number): void {
    const playerData = this.player.getData();
    const playerParticles = this.player.getParticles();
    const entities = this.obstacleManager.getEntities();
    const scorePopups = this.obstacleManager.getScorePopups();

    const state = {
      score: this.score,
      combo: this.combo,
      gameOver: this.gameState === 'gameover',
      highScore: this.highScore,
      gameSpeed: this.gameSpeed,
      beatProgress: this.beatSync.getBeatProgress(),
      beatIndex: this.beatSync.getBeatIndex()
    };

    this.renderer.render(
      dt,
      this.beatSync.getCurrentTime(),
      playerData,
      playerParticles,
      entities,
      scorePopups,
      state
    );
  }

  public startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.combo = 0;
    this.gameSpeed = this.baseSpeed;
    this.beatSync.start();
    this.player.reset();
    this.obstacleManager.reset();
    this.renderer.reset();
    this.updateSizes();
  }

  public restartGame(): void {
    this.saveHighScore();
    this.startGame();
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.beatSync.stop();
    this.saveHighScore();
  }

  public getState(): GameState {
    return this.gameState;
  }

  public setVolume(value: number): void {
    this.beatSync.setVolume(value);
  }

  public getVolume(): number {
    return this.beatSync.getVolume();
  }
}

export default GameEngine;
