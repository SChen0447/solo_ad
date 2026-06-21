import { Player } from './Player';
import { Obstacle, checkCollision } from './Obstacle';
import { PowerUp, ShieldParticle } from './PowerUp';
import { Background } from './Background';
import { Renderer, RenderState } from './Renderer';

type GameState = 'playing' | 'gameover';

export class GameManager {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;

  private player: Player;
  private obstacles: Obstacle[] = [];
  private powerUps: PowerUp[] = [];
  private shieldParticles: ShieldParticle[] = [];
  private background: Background;
  private renderer: Renderer;

  private gameState: GameState = 'playing';
  private score: number = 0;
  private survivalTime: number = 0;
  private flashTimer: number = 0;

  private obstacleSpawnTimer: number = 0;
  private obstacleSpawnInterval: number = 2;
  private powerUpSpawnTimer: number = 0;
  private powerUpSpawnInterval: number = 3;

  private maxObjects: number = 50;

  private lastTime: number = 0;
  private animationId: number | null = null;
  private audioContext: AudioContext | null = null;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;

    this.player = new Player(this.canvasWidth, this.canvasHeight);
    this.background = new Background(this.canvasWidth, this.canvasHeight);
    this.renderer = new Renderer(this.ctx, this.canvasWidth, this.canvasHeight);

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);

    this.initAudio();
    this.attachEventListeners();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private playSound(type: 'speed' | 'shield'): void {
    if (!this.audioContext) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'square';
      const now = this.audioContext.currentTime;

      if (type === 'speed') {
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.linearRampToValueAtTime(880, now + 0.2);
      } else {
        oscillator.frequency.setValueAtTime(880, now);
        oscillator.frequency.linearRampToValueAtTime(440, now + 0.2);
      }

      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (e) {
      // Silent fail for audio
    }
  }

  private attachEventListeners(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  private detachEventListeners(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (this.gameState === 'gameover') {
        this.resetGame();
        return;
      }
    }
    this.player.handleKeyDown(e.key);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.player.handleKeyUp(e.key);
  }

  private resetGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.survivalTime = 0;
    this.flashTimer = 0;
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnInterval = 2;
    this.powerUpSpawnTimer = 0;
    this.obstacles = [];
    this.powerUps = [];
    this.shieldParticles = [];
    this.player.reset();
    this.background.reset();
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.detachEventListeners();
  }

  private gameLoop(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    this.background.update(dt);

    if (this.gameState === 'gameover') {
      for (const particle of this.shieldParticles) {
        particle.update(dt);
      }
      this.shieldParticles = this.shieldParticles.filter(p => p.active);
      return;
    }

    this.survivalTime += dt;
    this.score += Math.floor(dt * 10);

    if (this.score >= 500 && this.obstacleSpawnInterval > 1.6) {
      this.obstacleSpawnInterval = 1.6;
    }

    this.player.update(dt);
    this.spawnObstacles(dt);
    this.spawnPowerUps(dt);

    for (const obs of this.obstacles) {
      obs.update(dt);
    }
    for (const pu of this.powerUps) {
      pu.update(dt);
    }
    for (const particle of this.shieldParticles) {
      particle.update(dt);
    }

    this.checkCollisions();

    this.obstacles = this.obstacles.filter(o => o.active);
    this.powerUps = this.powerUps.filter(p => p.active);
    this.shieldParticles = this.shieldParticles.filter(p => p.active);

    this.enforceObjectLimits();
  }

  private spawnObstacles(dt: number): void {
    this.obstacleSpawnTimer += dt;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
      this.obstacleSpawnTimer = 0;
      this.obstacles.push(new Obstacle(this.canvasWidth, this.canvasHeight));
    }
  }

  private spawnPowerUps(dt: number): void {
    this.powerUpSpawnTimer += dt;
    if (this.powerUpSpawnTimer >= this.powerUpSpawnInterval) {
      this.powerUpSpawnTimer = 0;
      this.powerUps.push(new PowerUp(this.canvasWidth, this.canvasHeight));
    }
  }

  private checkCollisions(): void {
    const playerBounds = this.player.getBounds();

    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      if (checkCollision(playerBounds, obs.getBounds())) {
        if (this.player.consumeShield()) {
          obs.active = false;
          this.flashTimer = 0.2;
          this.spawnShieldParticles(
            playerBounds.x + playerBounds.width / 2,
            playerBounds.y + playerBounds.height / 2
          );
        } else {
          this.gameOver();
          return;
        }
      }
    }

    for (const pu of this.powerUps) {
      if (!pu.active || pu.collected) continue;
      if (checkCollision(playerBounds, pu.getBounds())) {
        pu.collected = true;
        pu.active = false;
        this.score += pu.getScoreValue();
        if (pu.type === 'speed') {
          this.player.activateSpeedBoost();
          this.playSound('speed');
        } else {
          this.player.activateShield();
          this.playSound('shield');
        }
      }
    }
  }

  private spawnShieldParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      this.shieldParticles.push(new ShieldParticle(x, y));
    }
  }

  private enforceObjectLimits(): void {
    const totalObjects = this.obstacles.length + this.powerUps.length + this.shieldParticles.length;
    if (totalObjects > this.maxObjects) {
      const excess = totalObjects - this.maxObjects;
      let removed = 0;
      while (removed < excess && this.obstacles.length > 0) {
        this.obstacles.shift();
        removed++;
      }
      while (removed < excess && this.powerUps.length > 0) {
        this.powerUps.shift();
        removed++;
      }
      while (removed < excess && this.shieldParticles.length > 0) {
        this.shieldParticles.shift();
        removed++;
      }
    }
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.flashTimer = 0.2;
  }

  private render(): void {
    const renderState: RenderState = {
      score: this.score,
      survivalTime: this.survivalTime,
      flashTimer: this.flashTimer,
      isGameOver: this.gameState === 'gameover'
    };

    this.renderer.render(
      this.background,
      this.player,
      this.obstacles,
      this.powerUps,
      this.shieldParticles,
      renderState
    );
  }
}
