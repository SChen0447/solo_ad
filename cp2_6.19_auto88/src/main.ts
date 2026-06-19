import { Maze } from './maze';
import { Ball, InputState } from './ball';
import { ObstacleManager } from './obstacle';
import { UIManager, GameState, GameScreen } from './ui';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze!: Maze;
  private ball!: Ball;
  private obstacles!: ObstacleManager;
  private ui!: UIManager;
  private uiLayer: HTMLElement;

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private state: GameState = {
    score: 0,
    lives: 3,
    level: 1,
    timeLeft: 90,
    elapsedTime: 0,
    screen: 'menu',
    finalScore: 0,
    victoryTime: 0
  };

  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDt: number = 1 / 60;
  private animationId: number = 0;

  private input: InputState = {
    tiltX: 0,
    tiltY: 0,
    keyLeft: false,
    keyRight: false,
    keyUp: false,
    keyDown: false
  };

  private audioCtx: AudioContext | null = null;
  private orientationReady: boolean = false;

  private transitionPhase: 'idle' | 'fadingOut' | 'fadingIn' = 'idle';
  private transitionTargetLevel: number = 0;
  private transitionSpeed: number = 2;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.uiLayer = document.getElementById('uiLayer') as HTMLElement;

    if (!this.canvas || !this.ctx || !this.uiLayer) {
      console.error('Game elements not found!');
      return;
    }

    this.init();
  }

  private init(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.ball = new Ball();
    this.obstacles = new ObstacleManager();
    this.ui = new UIManager(this.uiLayer, {
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onNextLevel: () => this.nextLevel()
    });
    this.ui.setCanvas(this.canvas);
    this.ui.setSize(this.width, this.height);

    this.setupInputHandlers();

    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.floor(window.innerWidth);
    this.height = Math.floor(window.innerHeight);

    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.maze) {
      this.maze.resize(this.width, this.height, this.calcPadding());
      this.updateBallRadius();
      if (this.obstacles) {
        this.repositionObstacles();
      }
    }

    if (this.ui) {
      this.ui.setSize(this.width, this.height);
    }
  }

  private calcPadding(): number {
    const minDim = Math.min(this.width, this.height);
    if (minDim < 500) return 40;
    if (minDim < 800) return 60;
    return 80;
  }

  private setupInputHandlers(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.input.keyLeft = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.input.keyRight = true;
          e.preventDefault();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.input.keyUp = true;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.input.keyDown = true;
          e.preventDefault();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.input.keyLeft = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.input.keyRight = false;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.input.keyUp = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.input.keyDown = false;
          break;
      }
    });

    window.addEventListener(
      'deviceorientation',
      (e) => this.handleDeviceOrientation(e),
      true
    );

    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.orientationReady && typeof DeviceOrientationEvent !== 'undefined' &&
          typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              this.orientationReady = true;
            }
          })
          .catch(() => {});
      }
      e.preventDefault();
    }, { passive: false });
  }

  private handleDeviceOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma !== null && e.beta !== null) {
      this.input.tiltX = Math.max(-1, Math.min(1, e.gamma / 30));
      this.input.tiltY = Math.max(-1, Math.min(1, (e.beta - 30) / 30));
    }
  }

  private ensureAudio(): void {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        this.audioCtx = null;
      }
    }
  }

  private playCoinSound(): void {
    this.ensureAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.1);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  private playDeathSound(): void {
    this.ensureAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.4);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  private playVictorySound(): void {
    this.ensureAudio();
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  private startGame(): void {
    this.ensureAudio();
    this.state = {
      score: 0,
      lives: 3,
      level: 1,
      timeLeft: 90,
      elapsedTime: 0,
      screen: 'transition',
      finalScore: 0,
      victoryTime: 0
    };
    this.transitionTargetLevel = 1;
    this.transitionPhase = 'fadingOut';
    this.ui.transitionAlpha = 0;
    this.ui.setScreen('transition');
  }

  private restartGame(): void {
    this.ensureAudio();
    this.state.score = 0;
    this.state.lives = 3;
    this.state.level = 1;
    this.state.timeLeft = 90;
    this.state.elapsedTime = 0;
    this.state.screen = 'transition';
    this.state.finalScore = 0;
    this.state.victoryTime = 0;
    this.transitionTargetLevel = 1;
    this.transitionPhase = 'fadingOut';
    this.ui.transitionAlpha = 0;
    this.ui.setScreen('transition');
  }

  private nextLevel(): void {
    this.transitionTargetLevel = this.state.level + 1;
    this.transitionPhase = 'fadingOut';
    this.ui.transitionAlpha = 0;
    this.state.screen = 'transition';
    this.ui.setScreen('transition');
  }

  private initLevel(level: number): void {
    const size = level === 1 ? 10 : Math.min(10 + Math.floor((level - 1) * 2), 20);
    this.maze = new Maze(size);
    this.maze.resize(this.width, this.height, this.calcPadding());

    this.updateBallRadius();
    const startPos = this.maze.gridToPixel(this.maze.startX, this.maze.startY);
    this.ball.setPosition(startPos.x, startPos.y);
    this.ball.setSpeedMultiplier(1 + (level - 1) * 0.08);

    this.obstacles.generate(this.maze, level);
  }

  private updateBallRadius(): void {
    const r = Math.max(8, this.maze.cellSize * 0.32);
    this.ball.setRadius(r);
  }

  private repositionObstacles(): void {
    for (const obs of this.obstacles.obstacles) {
      const size = this.maze.cellSize * 0.65;
      const offset = (this.maze.cellSize - size) / 2;
      const ratio = (obs.x - obs.minX) / Math.max(1, obs.maxX - obs.minX);
      const newMinX = this.maze.offsetX + (obs.gridX + 1) * this.maze.cellSize + offset;
      const corridorEnd = obs.gridX + (Math.floor((obs.maxX - obs.minX) / this.maze.cellSize) + 2);
      const newMaxX = this.maze.offsetX + Math.min(corridorEnd, this.maze.size - 2) * this.maze.cellSize + offset;
      obs.x = newMinX + ratio * Math.max(0, newMaxX - newMinX);
      obs.y = this.maze.offsetY + obs.gridY * this.maze.cellSize + offset;
      obs.minX = newMinX;
      obs.maxX = Math.max(newMinX, newMaxX);
      obs.size = size;
    }
  }

  private resetBallToStart(): void {
    const startPos = this.maze.gridToPixel(this.maze.startX, this.maze.startY);
    this.ball.setPosition(startPos.x, startPos.y);
    this.ball.setInput({ tiltX: 0, tiltY: 0 });
    this.input.keyLeft = false;
    this.input.keyRight = false;
    this.input.keyUp = false;
    this.input.keyDown = false;
  }

  private gameLoop(timestamp: number): void {
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));

    let rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (rawDt > 0.25) rawDt = 0.25;

    this.accumulator += rawDt;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < 5) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    this.render();
  }

  private update(dt: number): void {
    this.ui.update(dt);

    if (this.state.screen === 'transition') {
      this.updateTransition(dt);
    } else if (this.state.screen === 'playing') {
      this.updatePlaying(dt);
    }
  }

  private updateTransition(dt: number): void {
    if (this.transitionPhase === 'fadingOut') {
      this.ui.transitionAlpha = Math.min(1, this.ui.transitionAlpha + dt * this.transitionSpeed);
      if (this.ui.transitionAlpha >= 1) {
        this.state.level = this.transitionTargetLevel;
        this.state.timeLeft = Math.max(60, 100 - this.state.level * 5);
        this.state.elapsedTime = 0;
        this.initLevel(this.state.level);
        this.transitionPhase = 'fadingIn';
      }
    } else if (this.transitionPhase === 'fadingIn') {
      this.ui.transitionAlpha = Math.max(0, this.ui.transitionAlpha - dt * this.transitionSpeed);
      if (this.ui.transitionAlpha <= 0) {
        this.transitionPhase = 'idle';
        this.state.screen = 'playing';
        this.ui.setScreen('playing');
      }
    }
  }

  private updatePlaying(dt: number): void {
    this.state.elapsedTime += dt;
    this.state.timeLeft -= dt;

    if (this.state.timeLeft <= 0) {
      this.state.timeLeft = 0;
      this.handleDeath();
      return;
    }

    this.ball.setInput(this.input);
    this.ball.update(dt, this.maze);

    const oldX = this.ball.x;
    const oldY = this.ball.y;

    const newX = oldX + this.ball.vx * dt;
    const newY = oldY + this.ball.vy * dt;

    this.ball.x = newX;
    this.ball.y = newY;

    const collisionX = this.maze.checkWallCollision(this.ball.x, oldY, this.ball.radius);
    if (collisionX.collided) {
      this.ball.x = collisionX.x;
      if (this.ball.vx > 50 || this.ball.vx < -50) {
        this.ball.bounce(this.ball.vx > 0 ? -1 : 1, 0, 0.5);
        this.ball.triggerSquash();
      } else {
        this.ball.vx *= -0.3;
      }
    }

    const collisionY = this.maze.checkWallCollision(this.ball.x, this.ball.y, this.ball.radius);
    if (collisionY.collided) {
      this.ball.y = collisionY.y;
      if (this.ball.vy > 50 || this.ball.vy < -50) {
        this.ball.bounce(0, this.ball.vy > 0 ? -1 : 1, 0.5);
        this.ball.triggerSquash();
      } else {
        this.ball.vy *= -0.3;
      }
    }

    if (Math.abs(this.ball.vx) < 3) this.ball.vx = 0;
    if (Math.abs(this.ball.vy) < 3) this.ball.vy = 0;

    this.obstacles.update(dt, this.state.elapsedTime);

    if (this.obstacles.checkCollision(this.ball.x, this.ball.y, this.ball.radius)) {
      this.playDeathSound();
      this.state.lives--;
      if (this.state.lives <= 0) {
        this.handleDeath();
      } else {
        this.resetBallToStart();
      }
      return;
    }

    this.maze.updateCoins(dt);
    const coinScore = this.maze.checkCoinCollision(this.ball.x, this.ball.y, this.ball.radius);
    if (coinScore > 0) {
      this.playCoinSound();
      this.state.score += coinScore;
    }

    if (this.maze.checkEndReached(this.ball.x, this.ball.y, this.ball.radius)) {
      this.handleVictory();
    }
  }

  private handleDeath(): void {
    this.state.finalScore = this.state.score;
    this.state.screen = 'dead';
    this.ui.setScreen('dead');
  }

  private handleVictory(): void {
    this.playVictorySound();
    const timeBonus = Math.floor(this.state.timeLeft) * 5;
    this.state.score += timeBonus;
    this.state.victoryTime = this.state.elapsedTime;
    this.state.screen = 'victory';
    this.ui.setScreen('victory');

    const endPos = this.maze.gridToPixel(this.maze.endX, this.maze.endY);
    this.ui.spawnVictoryParticles(endPos.x, endPos.y);
    this.ui.triggerFlash();
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    const bg = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    bg.addColorStop(0, '#0a1a30');
    bg.addColorStop(0.5, '#051020');
    bg.addColorStop(1, '#02050f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderBackgroundGrid();

    let shakeX = 0;
    let shakeY = 0;
    if (this.ball.screenShake > 0) {
      const s = this.ball.screenShake * 6;
      shakeX = (Math.random() - 0.5) * s;
      shakeY = (Math.random() - 0.5) * s;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (this.maze && (this.state.screen !== 'menu')) {
      this.maze.render(ctx, this.state.elapsedTime);
      this.obstacles.render(ctx);
      this.ball.render(ctx);
    }

    ctx.restore();

    this.ui.render(ctx, this.state);
  }

  private renderBackgroundGrid(): void {
    const ctx = this.ctx;
    const spacing = 60;
    const alpha = 0.04;

    ctx.strokeStyle = `rgba(80, 140, 220, ${alpha})`;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x < this.width; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y < this.height; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    const dots = 50;
    for (let i = 0; i < dots; i++) {
      const x = (i * 173) % this.width;
      const y = (i * 277) % this.height;
      const a = 0.03 + 0.02 * Math.sin(this.state.elapsedTime + i);
      ctx.fillStyle = `rgba(120, 200, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
