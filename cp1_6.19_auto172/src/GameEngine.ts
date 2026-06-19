import { PlayerController } from './PlayerController';
import { EnemySpawner } from './EnemySpawner';
import { CollisionDetection, CollisionCallback } from './CollisionDetection';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export interface GameState {
  score: number;
  lives: number;
  gameOver: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private frameDuration: number = 1000 / 60;
  private running: boolean = false;

  private playerController: PlayerController;
  private enemySpawner: EnemySpawner;
  private collisionDetection: CollisionDetection;

  private score: number = 0;
  private lives: number = 3;
  private gameOver: boolean = false;

  private nearStars: Star[] = [];
  private farStars: Star[] = [];

  private screenShakeTimer: number = 0;
  private screenShakeOffsetX: number = 0;
  private screenShakeOffsetY: number = 0;

  private onStateChange: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.onStateChange = onStateChange;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();

    this.playerController = new PlayerController(this.width, this.height);
    this.enemySpawner = new EnemySpawner(this.width, this.height);
    this.collisionDetection = new CollisionDetection(this.width, this.height);

    this.initStars();
    this.bindResize();
  }

  private bindResize(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resizeCanvas();
    this.playerController.resize(this.width, this.height);
    this.enemySpawner.resize(this.width, this.height);
    this.collisionDetection.resize(this.width, this.height);
    this.initStars();
  }

  private resizeCanvas(): void {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  private initStars(): void {
    this.farStars = [];
    this.nearStars = [];
    for (let i = 0; i < 100; i++) {
      this.farStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1,
        speed: 0.5,
      });
    }
    for (let i = 0; i < 60; i++) {
      this.nearStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2,
        speed: 1.5,
      });
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public reset(): void {
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.screenShakeTimer = 0;
    this.playerController.reset(this.width, this.height);
    this.enemySpawner.reset();
    this.collisionDetection.reset();
    this.notifyStateChange();
  }

  public destroy(): void {
    this.stop();
    this.playerController.destroy();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= this.frameDuration) {
      this.lastTime = now - (delta % this.frameDuration);
      this.update();
      this.render();
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(): void {
    if (this.gameOver) return;

    this.updateStars();
    this.playerController.update();
    this.enemySpawner.update(this.playerController.getPlayer());

    const collisionCallback: CollisionCallback = {
      onEnemyHit: () => {
        this.score += 10;
        this.notifyStateChange();
      },
      onPlayerHit: () => {
        this.lives--;
        this.playerController.setInvincible(60);
        if (this.lives <= 0) {
          this.gameOver = true;
        }
        this.notifyStateChange();
      },
      triggerScreenShake: () => {
        this.screenShakeTimer = 6;
      },
      spawnExplosion: (x: number, y: number) => {
        this.collisionDetection.spawnExplosion(x, y);
      },
    };

    this.collisionDetection.checkCollisions(
      this.playerController.getPlayer(),
      this.playerController.getAllBullets(),
      this.enemySpawner.getAllEnemies(),
      collisionCallback
    );

    this.collisionDetection.updateParticles();
    this.updateScreenShake();
  }

  private updateStars(): void {
    for (const star of this.farStars) {
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = this.width;
        star.y = Math.random() * this.height;
      }
    }
    for (const star of this.nearStars) {
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = this.width;
        star.y = Math.random() * this.height;
      }
    }
  }

  private updateScreenShake(): void {
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer--;
      this.screenShakeOffsetX = (Math.random() - 0.5) * 6;
      this.screenShakeOffsetY = (Math.random() - 0.5) * 6;
    } else {
      this.screenShakeOffsetX = 0;
      this.screenShakeOffsetY = 0;
    }
  }

  private notifyStateChange(): void {
    this.onStateChange({
      score: this.score,
      lives: this.lives,
      gameOver: this.gameOver,
    });
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(this.screenShakeOffsetX, this.screenShakeOffsetY);

    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderStars();
    this.renderTopBar();
    this.renderBullets();
    this.renderEnemies();
    this.renderPlayer();
    this.renderParticles();

    ctx.restore();
  }

  private renderStars(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (const star of this.farStars) {
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (const star of this.nearStars) {
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  private renderTopBar(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 40);
    gradient.addColorStop(0, 'rgba(60, 30, 100, 0.7)');
    gradient.addColorStop(1, 'rgba(60, 30, 100, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, 40);
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const player = this.playerController.getPlayer();

    if (!player.visible) return;

    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.invincible) {
      ctx.globalAlpha = 0.6;
    }

    ctx.fillStyle = '#4fc3f7';
    ctx.strokeStyle = '#81d4fa';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(-player.width / 2, -player.height / 2);
    ctx.lineTo(-player.width / 3, 0);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(-player.width / 3, -4);
    ctx.lineTo(-player.width / 2 - 8, 0);
    ctx.lineTo(-player.width / 3, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderBullets(): void {
    const ctx = this.ctx;
    const bullets = this.playerController.getBullets();

    for (const bullet of bullets) {
      ctx.save();
      ctx.fillStyle = '#ffeb3b';
      ctx.shadowColor = '#fff59d';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderEnemies(): void {
    const ctx = this.ctx;
    const enemies = this.enemySpawner.getEnemies();

    for (const enemy of enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.angle);

      ctx.fillStyle = '#e53935';
      ctx.strokeStyle = '#ff8a80';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(enemy.size, 0);
      ctx.lineTo(-enemy.size / 2, -enemy.size * 0.8);
      ctx.lineTo(-enemy.size / 2, enemy.size * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    const particles = this.collisionDetection.getParticles();

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.save();
      ctx.fillStyle = `rgba(255, 140, 0, ${alpha})`;
      ctx.shadowColor = '#ff9800';
      ctx.shadowBlur = 6;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      ctx.restore();
    }
  }
}
