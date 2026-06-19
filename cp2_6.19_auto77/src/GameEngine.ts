import { BeatSync } from './BeatSync';
import { Player } from './Player';
import { ObstacleManager } from './ObstacleManager';
import { Renderer, type GameState } from './Renderer';

class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private beatSync: BeatSync;
  private player: Player;
  private obstacleManager: ObstacleManager;

  private width = 800;
  private height = 600;
  private groundY = 500;
  private laneY = 450;

  private score = 0;
  private combo = 0;
  private bestScore = 0;
  private lastCoinBeatIndex = -2;

  private isStarted = false;
  private isGameOver = false;

  private rafId: number | null = null;
  private lastTime = 0;
  private beatPulseTime = -10;

  private bestScoreTypewriter = '';
  private bestScoreTypewriterTime = 0;

  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private lowQuality = false;

  private volumeHover = false;
  private draggingVolume = false;

  private distance = 0;

  private keysDown: Set<string> = new Set();

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;

    this.renderer = new Renderer(canvas);
    this.beatSync = new BeatSync();
    this.player = new Player(140, this.groundY);
    this.obstacleManager = new ObstacleManager(this.groundY, this.laneY);

    const storedBest = localStorage.getItem('rhythm-runner-best');
    if (storedBest) {
      this.bestScore = parseInt(storedBest, 10) || 0;
    }

    this.beatSync.onBeat((idx, time) => {
      this.onBeat(idx, time);
    });
    this.beatSync.onPreBeat((idx, time) => {
      this.obstacleManager.onPreBeat(idx, time);
    });

    this.setupEvents();
    this.resize();
    this.startLoop();
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (this.keysDown.has(e.code)) return;
      this.keysDown.add(e.code);

      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.isStarted) {
          this.startGame();
        } else if (this.isGameOver) {
          this.restartGame();
        } else {
          this.player.jump();
        }
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (this.isStarted && !this.isGameOver) {
          this.player.slide();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (this.isOnVolumeSlider(mx, my)) {
        this.draggingVolume = true;
        this.updateVolumeFromMouse(mx);
        return;
      }

      if (!this.isStarted) {
        this.startGame();
      } else if (this.isGameOver) {
        this.restartGame();
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.volumeHover = this.isOnVolumeSlider(mx, my);
      if (this.draggingVolume) {
        this.updateVolumeFromMouse(mx);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.draggingVolume = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.volumeHover = false;
      this.draggingVolume = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const mx = t.clientX - rect.left;
      const my = t.clientY - rect.top;

      if (this.isOnVolumeSlider(mx, my)) {
        this.draggingVolume = true;
        this.updateVolumeFromMouse(mx);
        return;
      }

      if (!this.isStarted) {
        this.startGame();
      } else if (this.isGameOver) {
        this.restartGame();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const mx = t.clientX - rect.left;
      this.volumeHover = this.isOnVolumeSlider(mx, t.clientY - rect.top);
      if (this.draggingVolume) {
        this.updateVolumeFromMouse(mx);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.draggingVolume = false;
    });
  }

  private isOnVolumeSlider(x: number, y: number): boolean {
    const bounds = this.renderer.getVolumeSliderBounds(this.width, this.height);
    return x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h;
  }

  private updateVolumeFromMouse(x: number): void {
    const bounds = this.renderer.getVolumeSliderBounds(this.width, this.height);
    const t = (x - bounds.x) / bounds.w;
    const v = Math.max(0, Math.min(1, t));
    this.beatSync.setVolume(v);
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.groundY = this.height - 80;
    this.laneY = this.groundY - 60;
    this.renderer.resize(this.width, this.height);
    this.player.x = Math.max(100, this.width * 0.15);
    this.player.setGroundY(this.groundY);
    this.obstacleManager.setGroundY(this.groundY);
    this.obstacleManager.setLaneY(this.laneY);
  }

  private onBeat(beatIndex: number, _time: number): void {
    this.beatPulseTime = performance.now() / 1000;
    if (this.isStarted && !this.isGameOver) {
      this.obstacleManager.onBeat(beatIndex, _time);
    }
  }

  private async startGame(): Promise<void> {
    this.isStarted = true;
    this.isGameOver = false;
    this.score = 0;
    this.combo = 0;
    this.distance = 0;
    this.lastCoinBeatIndex = -2;
    this.obstacleManager.reset();
    this.bestScoreTypewriter = '';
    this.bestScoreTypewriterTime = 0;

    if (!this.beatSync.isRunning()) {
      await this.beatSync.start();
    }
  }

  private restartGame(): void {
    void this.startGame();
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = (nowMs: number): void => {
      const now = nowMs / 1000;
      let dt = (nowMs - this.lastTime) / 1000;
      if (dt > 0.1) dt = 0.1;
      this.lastTime = nowMs;

      this.updateFPS(dt);
      this.update(dt, now);
      this.render(now);

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateFPS(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.currentFps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      if (this.currentFps < 50 && !this.lowQuality) {
        this.lowQuality = true;
        this.obstacleManager.setMaxParticles(25);
      } else if (this.currentFps >= 58 && this.lowQuality) {
        this.lowQuality = false;
        this.obstacleManager.setMaxParticles(50);
      }
    }
  }

  private update(dt: number, now: number): void {
    if (this.beatSync.isRunning()) {
      this.beatSync.update();
    }

    if (!this.isStarted || this.isGameOver) {
      if (this.isGameOver) {
        this.updateTypewriter(dt);
      }
      return;
    }

    const baseSpeed = 300;
    const speedFactor = 1 + this.obstacleManager.getDifficultyFactor() * 0.6;
    const currentSpeed = baseSpeed * speedFactor;
    this.obstacleManager.setSpeed(currentSpeed);

    this.distance += currentSpeed * dt;
    this.score += Math.floor(currentSpeed * dt * 0.1);

    this.player.update(dt);

    const hitbox = this.player.getHitbox();
    const result = this.obstacleManager.update(dt, hitbox, now);

    if (result.gameOver) {
      this.onGameOver();
    }

    if (result.collectedCoin) {
      const coin = result.collectedCoin;
      const value = coin.type === 'beat' ? 50 : 10;
      const beatDiff = coin.beatIndex - this.lastCoinBeatIndex;
      if (beatDiff >= 0 && beatDiff <= 4) {
        this.combo++;
      } else {
        this.combo = 1;
      }
      this.lastCoinBeatIndex = coin.beatIndex;

      const comboBonus = this.combo > 5 ? 1.5 : 1;
      this.score += Math.floor(value * comboBonus);
    } else if (!result.gameOver) {
      const currentBeat = this.beatSync.getBeatIndex();
      if (currentBeat - this.lastCoinBeatIndex > 6) {
        this.combo = 0;
      }
    }
  }

  private onGameOver(): void {
    this.isGameOver = true;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('rhythm-runner-best', String(this.bestScore));
    }
    this.bestScoreTypewriter = '';
    this.bestScoreTypewriterTime = 0;
  }

  private updateTypewriter(dt: number): void {
    this.bestScoreTypewriterTime += dt;
    const target = String(this.bestScore);
    const charsPerSecond = 6;
    const showCount = Math.min(target.length, Math.floor(this.bestScoreTypewriterTime * charsPerSecond));
    this.bestScoreTypewriter = target.substring(0, showCount);
  }

  private render(now: number): void {
    const state: GameState = {
      width: this.width,
      height: this.height,
      groundY: this.groundY,
      score: this.score,
      combo: this.combo,
      bestScore: this.bestScore,
      isGameOver: this.isGameOver,
      isStarted: this.isStarted,
      speed: this.obstacleManager.getSpeed(),
      beatProgress: this.beatSync.getBeatProgress(),
      beatPulseTime: this.beatPulseTime,
      bestScoreTypewriter: this.bestScoreTypewriter,
      bestScoreTypewriterProgress: this.bestScoreTypewriterTime,
      volume: this.beatSync.getVolume(),
      volumeHover: this.volumeHover,
      lowQuality: this.lowQuality
    };

    this.renderer.render(
      state,
      this.player.getState(),
      this.obstacleManager.obstacles,
      this.obstacleManager.coins,
      this.obstacleManager.scorePopups,
      this.obstacleManager.particles,
      this.obstacleManager.warningCircles,
      now
    );
  }

  public destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.beatSync.stop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
