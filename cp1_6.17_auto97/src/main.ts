import { GameScene } from './gameScene';
import { BallController } from './ball';
import { ObstacleManager } from './obstacles';
import { ParticleSystem } from './particles';
import { SoundFX } from './soundFX';
import TWEEN from '@tweenjs/tween.js';

class GameApp {
  private container: HTMLElement;
  private gameScene!: GameScene;
  private ball!: BallController;
  private obstacles!: ObstacleManager;
  private particles!: ParticleSystem;
  private soundFX!: SoundFX;

  private timerEl!: HTMLElement;
  private speedEl!: HTMLElement;
  private damageOverlay!: HTMLElement;
  private startOverlay!: HTMLElement;
  private winPanel!: HTMLElement;
  private finalTimeEl!: HTMLElement;

  private running = false;
  private elapsedTime = 0;
  private lastDifficultyLevel = 0;
  private clock: { start: number; last: number } = { start: 0, last: 0 };
  private animationId: number | null = null;
  private damageTimeout: number | null = null;

  constructor() {
    const app = document.getElementById('app');
    if (!app) throw new Error('Container #app not found');
    this.container = app;
    this.cacheUI();
    this.init();
  }

  private cacheUI(): void {
    const timer = document.getElementById('timer');
    const speed = document.getElementById('speed-multiplier');
    const overlay = document.getElementById('damage-overlay');
    const startOv = document.getElementById('start-overlay');
    const winP = document.getElementById('win-panel');
    const ft = document.getElementById('final-time');

    if (!timer || !speed || !overlay || !startOv || !winP || !ft) {
      throw new Error('UI elements missing');
    }
    this.timerEl = timer;
    this.speedEl = speed;
    this.damageOverlay = overlay;
    this.startOverlay = startOv;
    this.winPanel = winP;
    this.finalTimeEl = ft;
  }

  private init(): void {
    this.gameScene = new GameScene(this.container);
    this.soundFX = new SoundFX();
    this.particles = new ParticleSystem(this.gameScene.scene);
    this.obstacles = new ObstacleManager(this.gameScene, this.soundFX);
    this.ball = new BallController(this.gameScene, this.obstacles, this.particles, this.soundFX);

    this.ball.onDamageFlash = () => this.triggerDamageFlash();
    this.ball.onWin = () => this.showWinPanel();

    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');

    startBtn?.addEventListener('click', () => {
      this.soundFX.init();
      this.startGame();
    });

    restartBtn?.addEventListener('click', () => {
      this.hideWinPanel();
      this.resetGame();
      this.startGame();
    });

    this.gameScene.render();
  }

  private startGame(): void {
    this.startOverlay.classList.add('hidden');
    this.running = true;
    this.elapsedTime = 0;
    this.lastDifficultyLevel = 0;
    this.clock.start = performance.now();
    this.clock.last = this.clock.start;
    this.updateUI();
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    let delta = (now - this.clock.last) / 1000;
    delta = Math.min(delta, 0.05);
    this.clock.last = now;

    const elapsed = (now - this.clock.start) / 1000;
    this.elapsedTime = elapsed;

    const difficultyLevel = Math.floor(elapsed / 30);
    if (difficultyLevel > this.lastDifficultyLevel) {
      this.lastDifficultyLevel = difficultyLevel;
      this.obstacles.increaseDifficulty(5);
    }

    TWEEN.update();

    this.gameScene.animate(delta, elapsed);
    this.obstacles.update(delta, elapsed);
    this.ball.update(delta, elapsed);
    this.particles.update(delta);
    this.gameScene.updateCamera(this.ball.mesh.position);
    this.gameScene.render();

    this.updateUI();
  }

  private updateUI(): void {
    const mins = Math.floor(this.elapsedTime / 60);
    const secs = Math.floor(this.elapsedTime % 60);
    const ms = Math.floor((this.elapsedTime % 1) * 100);
    this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    this.speedEl.textContent = `${this.ball.speedMultiplier.toFixed(1)}x`;
  }

  private triggerDamageFlash(): void {
    this.damageOverlay.style.opacity = '1';
    if (this.damageTimeout !== null) {
      clearTimeout(this.damageTimeout);
    }
    this.damageTimeout = window.setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
      this.damageTimeout = null;
    }, 200);
  }

  private showWinPanel(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    const mins = Math.floor(this.elapsedTime / 60);
    const secs = Math.floor(this.elapsedTime % 60);
    this.finalTimeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    setTimeout(() => {
      this.winPanel.classList.add('show');
    }, 800);

    const idle = () => {
      if (this.ball.won) {
        const now = performance.now();
        const elapsed = (now - this.clock.start) / 1000;
        this.gameScene.animate(0.016, elapsed);
        this.particles.update(0.016);
        this.gameScene.render();
        requestAnimationFrame(idle);
      }
    };
    requestAnimationFrame(idle);
  }

  private hideWinPanel(): void {
    this.winPanel.classList.remove('show');
  }

  private resetGame(): void {
    this.ball.reset();
    this.obstacles.reset();
    this.elapsedTime = 0;
    this.lastDifficultyLevel = 0;
    this.particles.dispose();
    this.particles = new ParticleSystem(this.gameScene.scene);
    this.ball = new BallController(this.gameScene, this.obstacles, this.particles, this.soundFX);
    this.ball.onDamageFlash = () => this.triggerDamageFlash();
    this.ball.onWin = () => this.showWinPanel();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new GameApp();
  } catch (err) {
    console.error('Failed to start game:', err);
  }
});
