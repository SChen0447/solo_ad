import { BeatSync, BeatEvent } from './BeatSync';
import { Player } from './Player';
import { ObstacleManager } from './ObstacleManager';
import { Renderer } from './Renderer';

class GameEngine {
  private canvas: HTMLCanvasElement;
  private beatSync: BeatSync;
  private player: Player;
  private obstacleManager: ObstacleManager;
  private renderer: Renderer;
  private isRunning = false;
  private isGameOver = false;
  private lastTime = 0;
  private highScore = 0;
  private gameSpeed = 300;
  private score = 0;
  private combo = 0;
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private lowFpsFrames = 0;
  private performanceMode = false;
  private animFrameId = 0;
  private gameStartTime = 0;
  private needsStart = true;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.beatSync = new BeatSync();
    this.player = new Player(this.canvas.height, this.canvas.width);
    this.obstacleManager = new ObstacleManager(this.canvas.width, this.canvas.height);
    this.renderer = new Renderer(this.canvas);

    this.highScore = parseInt(localStorage.getItem('beatRunnerHighScore') || '0', 10);

    this.obstacleManager.setOnScoreChange((newScore: number, newCombo: number) => {
      this.score = newScore;
      this.combo = newCombo;
    });

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });

    this.drawStartScreen();
  }

  private drawStartScreen(): void {
    const ctx = this.canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#4a0e8f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillText('BEAT RUNNER', this.canvas.width / 2, this.canvas.height / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.font = '20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press SPACE to Start', this.canvas.width / 2, this.canvas.height / 2 + 20);

    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('SPACE = Jump  |  DOWN = Slide', this.canvas.width / 2, this.canvas.height / 2 + 60);

    this.needsStart = true;
  }

  private startGame(): void {
    if (this.isRunning && !this.isGameOver) return;

    if (this.isGameOver) {
      this.resetGame();
    }

    this.isRunning = true;
    this.isGameOver = false;
    this.gameStartTime = performance.now() / 1000;
    this.lastTime = this.gameStartTime;
    this.score = 0;
    this.combo = 0;
    this.gameSpeed = 300;

    this.beatSync.start((event: BeatEvent) => {
      this.onBeat(event);
    });

    this.gameLoop(this.gameStartTime);
  }

  private resetGame(): void {
    this.isGameOver = false;
    this.isRunning = false;
    this.score = 0;
    this.combo = 0;
    this.gameSpeed = 300;
    this.obstacleManager.reset();
    this.renderer.resetGameOver();
    this.beatSync.stop();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private onBeat(event: BeatEvent): void {
    this.renderer.triggerPulse(performance.now() / 1000);
    this.obstacleManager.onBeat(event.beatIndex, performance.now() / 1000, this.gameSpeed);
  }

  private gameLoop(timestamp: number): void {
    if (!this.isRunning) return;

    const currentTime = timestamp / 1000;
    const dt = Math.min(currentTime - this.lastTime, 0.05);
    this.lastTime = currentTime;

    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      if (this.currentFps < 50) {
        this.lowFpsFrames++;
        if (this.lowFpsFrames > 3 && !this.performanceMode) {
          this.performanceMode = true;
          this.renderer.setPerformanceMode(true);
        }
      } else {
        this.lowFpsFrames = 0;
        if (this.performanceMode && this.currentFps > 55) {
          this.performanceMode = false;
          this.renderer.setPerformanceMode(false);
        }
      }
    }

    this.player.update(currentTime, dt);
    const hitSpike = this.obstacleManager.update(currentTime, dt, this.player, this.gameSpeed);
    this.score = this.obstacleManager.getScore();
    this.combo = this.obstacleManager.getCombo();

    if (hitSpike) {
      this.gameOver();
      return;
    }

    this.gameSpeed = 300 + this.score * 0.5;

    this.renderer.render(
      currentTime,
      dt,
      this.player,
      this.obstacleManager,
      this.beatSync,
      this.score,
      this.combo,
      this.highScore,
      this.isGameOver,
      this.beatSync.getVolume()
    );

    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.isRunning = false;
    this.beatSync.stop();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('beatRunnerHighScore', String(this.highScore));
    }

    const currentTime = performance.now() / 1000;
    const dt = 1 / 60;
    const renderLoop = () => {
      const now = performance.now() / 1000;
      const delta = now - currentTime;
      this.renderer.render(
        now,
        delta,
        this.player,
        this.obstacleManager,
        this.beatSync,
        this.score,
        this.combo,
        this.highScore,
        true,
        0
      );
      if (this.isGameOver) {
        requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.needsStart) {
        this.needsStart = false;
        this.startGame();
        return;
      }
      if (this.isGameOver) {
        this.resetGame();
        this.startGame();
        return;
      }
      if (this.isRunning) {
        this.player.jump(performance.now() / 1000);
      }
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (this.isRunning) {
        this.player.slide(performance.now() / 1000);
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const bounds = this.renderer.getVolumeSliderBounds();
    const isHover =
      e.clientX >= bounds.x &&
      e.clientX <= bounds.x + bounds.width &&
      e.clientY >= bounds.y - 10 &&
      e.clientY <= bounds.y + bounds.height + 10;
    this.renderer.setVolumeHover(isHover);
  }

  private onMouseDown(e: MouseEvent): void {
    const bounds = this.renderer.getVolumeSliderBounds();
    if (
      e.clientX >= bounds.x &&
      e.clientX <= bounds.x + bounds.width &&
      e.clientY >= bounds.y - 15 &&
      e.clientY <= bounds.y + bounds.height + 15
    ) {
      const ratio = (e.clientX - bounds.x) / bounds.width;
      const volume = Math.max(0, Math.min(1, ratio));
      this.beatSync.setVolume(volume);
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.needsStart) {
      this.needsStart = false;
      this.startGame();
      return;
    }
    if (this.isGameOver) {
      this.resetGame();
      this.startGame();
      return;
    }
    const touch = e.touches[0];
    if (touch.clientY > this.canvas.height * 0.6) {
      this.player.slide(performance.now() / 1000);
    } else {
      this.player.jump(performance.now() / 1000);
    }
  }

  private onResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.player.resize(this.canvas.height, this.canvas.width);
    this.obstacleManager.resize(this.canvas.width, this.canvas.height);
    this.renderer.resize(this.canvas);
    if (this.needsStart) {
      this.drawStartScreen();
    }
  }
}

new GameEngine();
