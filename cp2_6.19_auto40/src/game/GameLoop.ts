import { InputManager } from '../input/InputManager';
import { Player } from './Player';
import { Level } from './Level';
import { TimeRecorder } from './TimeRecorder';
import { HUD } from '../ui/HUD';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: InputManager;
  private player: Player;
  private level: Level;
  private timeRecorder: TimeRecorder;
  private hud: HUD;

  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly FIXED_DT = 1000 / 60;
  private readonly MIN_REWIND_DT = 1000 / 30;

  private camX = 0;
  private camY = 0;

  private stars: Star[] = [];
  private victory = false;
  private victoryTimer = 0;

  private now = 0;

  private fps = 0;
  private fpsFrameCount = 0;
  private fpsTimer = 0;
  private rewindFPS = 0;
  private rewindFrameCount = 0;
  private rewindTimer = 0;
  private frameCountSinceRewind = 0;

  private readonly MAX_HISTORY_MEMORY = 50 * 1024 * 1024;
  private showFPS = true;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;

    this.input = new InputManager();
    this.level = new Level();

    const playerHeight = 20;
    const spawnX = 2 * this.level.tile + 6;
    const spawnY = 20 * this.level.tile - playerHeight;
    this.player = new Player(spawnX, spawnY);

    this.timeRecorder = new TimeRecorder(this.player, this.level);
    this.hud = new HUD();

    this.hud.totalCollectibles = this.level.getTotalCollectibles();

    this.initStars();
  }

  private initStars(): void {
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.level.worldWidth,
        y: Math.random() * this.level.worldHeight * 0.7,
        size: 0.5 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.now = timestamp;

    this.updateFPS(delta);

    const effectiveDt = this.timeRecorder.isRewinding
      ? Math.max(delta, this.MIN_REWIND_DT)
      : Math.min(delta, 100);

    this.accumulator += effectiveDt;

    const maxSteps = this.timeRecorder.isRewinding ? 1 : 3;
    let steps = 0;

    while (this.accumulator >= this.FIXED_DT && steps < maxSteps) {
      this.fixedUpdate();
      this.accumulator -= this.FIXED_DT;
      steps++;
    }

    if (steps >= maxSteps) {
      this.accumulator = 0;
    }

    this.render();
    requestAnimationFrame(this.loop);
  };

  private updateFPS(delta: number): void {
    this.fpsFrameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1000) {
      this.fps = Math.round(this.fpsFrameCount * 1000 / this.fpsTimer);
      this.fpsFrameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.timeRecorder.isRewinding) {
      this.rewindFrameCount++;
      this.rewindTimer += delta;
    } else if (this.rewindTimer > 0) {
      if (this.frameCountSinceRewind === 0) {
        this.rewindFPS = Math.round(this.rewindFrameCount * 1000 / this.rewindTimer);
        this.rewindFrameCount = 0;
        this.rewindTimer = 0;
      }
      this.frameCountSinceRewind++;
      if (this.frameCountSinceRewind > 120) {
        this.frameCountSinceRewind = 0;
      }
    }
  }

  private checkMemoryLimits(): void {
    const memoryUsage = this.player.getHistoryMemoryBytes();
    if (memoryUsage > this.MAX_HISTORY_MEMORY * 0.9) {
      const framesToRemove = Math.floor(this.player.history.length * 0.1);
      for (let i = 0; i < framesToRemove; i++) {
        this.player.history.shift();
      }
    }
  }

  private fixedUpdate(): void {
    if (this.victory) {
      this.victoryTimer++;
      return;
    }

    this.input.update();
    this.hud.update();
    this.level.update(this.now);
    this.checkMemoryLimits();

    if (this.player.dying) {
      this.player.update(false, false, false, false, false, this.now);
      if (this.player.deathTimer >= 60) {
        this.player.respawn(() => this.level.resetCollectibles());
        this.hud.collectibleCount = 0;
      }
      return;
    }

    if (this.timeRecorder.isRewinding) {
      this.timeRecorder.update(false, this.input.getRewindReleased());
      this.hud.energyRatio = this.timeRecorder.getEnergyRatio();
      this.hud.energyFull = this.timeRecorder.isFull();
      return;
    }

    const left = this.input.getLeft();
    const right = this.input.getRight();
    const jump = this.input.getJump();
    const jumpPressed = this.input.getJumpPressed();
    const jumpReleased = this.input.getJumpReleased();

    this.player.update(left, right, jump, jumpPressed, jumpReleased, this.now);
    this.player.updateGhostAlphas(this.now);

    const newX = this.level.resolveCollisionX(
      this.player.x, this.player.y,
      this.player.width, this.player.height,
      this.player.vx
    );
    this.player.x = newX;

    const yResult = this.level.resolveCollisionY(
      this.player.x, this.player.y,
      this.player.width, this.player.height,
      this.player.vy
    );
    this.player.y = yResult.y;

    if (yResult.onGround) {
      this.player.vy = 0;
      this.player.onGround = true;
    } else {
      this.player.onGround = false;
    }

    if (yResult.hitCeiling) {
      this.player.vy = 0;
    }

    if (this.player.onGround) {
      this.player.recordSafePosition();
    }

    const collected = this.level.checkCollectible(
      this.player.x, this.player.y,
      this.player.width, this.player.height
    );
    if (collected > 0) {
      this.player.score += collected * 100;
      this.hud.collectibleCount += collected;
      this.hud.score = this.player.score;

      if (this.level.allCollected()) {
        this.level.goal.activated = true;
      }
    }

    if (this.level.checkSpikes(this.player.x, this.player.y, this.player.width, this.player.height)) {
      this.player.die();
      return;
    }

    if (this.level.isOutOfBounds(this.player.x, this.player.y)) {
      this.player.die();
      return;
    }

    if (this.level.goal.activated && this.level.checkGoal(this.player.x, this.player.y, this.player.width, this.player.height)) {
      this.victory = true;
      this.victoryTimer = 0;
    }

    this.timeRecorder.update(this.input.getRewindPressed(), this.input.getRewindReleased());
    this.hud.energyRatio = this.timeRecorder.getEnergyRatio();
    this.hud.energyFull = this.timeRecorder.isFull();

    this.updateCamera();
  }

  private updateCamera(): void {
    const targetX = this.player.x + this.player.width / 2 - this.canvas.width / 2;
    const targetY = this.player.y + this.player.height / 2 - this.canvas.height / 2;

    this.camX += (targetX - this.camX) * 0.1;
    this.camY += (targetY - this.camY) * 0.1;

    this.camX = Math.max(0, Math.min(this.camX, this.level.worldWidth - this.canvas.width));
    this.camY = Math.max(0, Math.min(this.camY, this.level.worldHeight - this.canvas.height));
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackground(ctx, w, h);

    this.level.draw(ctx, this.camX, this.camY, this.now);

    this.drawPlayer(ctx);

    this.timeRecorder.drawParticles(ctx, this.camX, this.camY);
    this.timeRecorder.drawRewindOverlay(ctx, w, h, this.now);

    this.hud.draw(ctx, w, h);

    if (this.showFPS) {
      this.drawPerformanceInfo(ctx, w);
    }

    if (this.victory) {
      this.hud.drawVictory(ctx, w, h, this.victoryTimer);
    }

    if (this.player.dying) {
      this.drawDeathOverlay(ctx, w, h);
    }
  }

  private drawPerformanceInfo(ctx: CanvasRenderingContext2D, w: number): void {
    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';

    const memMB = (this.player.getHistoryMemoryBytes() / (1024 * 1024)).toFixed(2);
    ctx.fillText(`FPS: ${this.fps}`, w - 16, 16);
    ctx.fillText(`Rewind FPS: ${this.rewindFPS || '--'}`, w - 16, 32);
    ctx.fillText(`History Mem: ${memMB}MB / 50MB`, w - 16, 48);
    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(0.5, '#0a0a2e');
    gradient.addColorStop(1, '#000005');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const sx = star.x - this.camX * 0.3;
      const sy = star.y - this.camY * 0.3;

      const wrappedX = ((sx % w) + w) % w;
      const wrappedY = ((sy % h) + h) % h;

      const twinkle = 0.5 + Math.sin(this.now * star.twinkleSpeed + star.twinklePhase) * 0.5;
      const alpha = star.brightness * twinkle;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(wrappedX, wrappedY, star.size, 0, Math.PI * 2);
      ctx.fill();

      if (star.size > 1.2) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.beginPath();
        ctx.arc(wrappedX, wrappedY, star.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    if (!this.player.alive && !this.player.dying) return;

    const now = this.now;

    for (const ghost of this.player.ghostTrails) {
      const gx = ghost.x - this.camX;
      const gy = ghost.y - this.camY;
      ctx.save();
      ctx.globalAlpha = ghost.alpha;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(gx + this.player.width / 2, gy + this.player.height / 2, this.player.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const px = this.player.x - this.camX;
    const py = this.player.y - this.camY;

    if (this.player.dying) {
      const t = this.player.deathTimer / 60;
      const flicker = Math.sin(this.player.deathTimer * 0.5) > 0;
      if (!flicker) return;

      ctx.save();
      const scale = 1 - t;
      ctx.globalAlpha = 1 - t;
      ctx.translate(px + this.player.width / 2, py + this.player.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-this.player.width / 2, -this.player.height / 2);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.player.width / 2, this.player.height / 2, this.player.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();

    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 15 + Math.sin(now * 0.008) * 5;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px + this.player.width / 2, py + this.player.height / 2, this.player.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.arc(px + this.player.width / 2 - 3, py + this.player.height / 2 - 3, this.player.width / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (this.timeRecorder.isRewinding) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + this.player.width / 2, py + this.player.height / 2, this.player.width / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawDeathOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.player.deathTimer / 60;
    if (t < 0.3) {
      ctx.save();
      ctx.globalAlpha = (0.3 - t) * 2;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
