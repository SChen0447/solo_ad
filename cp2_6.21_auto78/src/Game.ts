import { Player, KeysState } from './Player';
import { Renderer } from './Renderer';
import { ObstacleGenerator } from './ObstacleGenerator';
import { CollectibleGenerator } from './CollectibleGenerator';
import { GameState } from './types';

const HIGH_SCORE_KEY = 'neonRunnerHighScore';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private player: Player;
  private obstacleGenerator: ObstacleGenerator;
  private collectibleGenerator: CollectibleGenerator;
  private state: GameState;
  private keys: KeysState = { up: false, down: false, left: false, right: false };
  private lastTime: number = 0;
  private totalTime: number = 0;
  private running: boolean = false;
  private animationId: number = 0;
  private scrollSpeed: number = 250;
  private readonly BASE_SCROLL_SPEED = 250;
  private readonly SCROLL_SPEED_GROWTH = 5;
  private onRestartListener: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.player = new Player(canvas.width, canvas.height);
    this.obstacleGenerator = new ObstacleGenerator(canvas.width, canvas.height);
    this.collectibleGenerator = new CollectibleGenerator(canvas.width, canvas.height);
    this.state = this.createInitialState();
    this.setupCallbacks();
    this.setupInputListeners();
  }

  private createInitialState(): GameState {
    return {
      score: 0,
      collectedCount: 0,
      isGameOver: false,
      screenFlash: 0,
      progressPulse: 0,
      player: this.player.initState(),
      obstacles: this.obstacleGenerator.getObstacles(),
      collectibles: this.collectibleGenerator.getCollectibles(),
      particles: this.player.getParticles(),
      streakLines: this.renderer.getStreakLines(),
      scoreAnim: {
        scale: 1.0,
        targetScale: 1.0,
        animTime: 0,
        animDuration: 0.2
      },
      phase: 0
    };
  }

  private setupCallbacks(): void {
    this.obstacleGenerator.setOnHitCallback(() => {
      this.player.triggerHit(this.state.player);
    });
    this.collectibleGenerator.setOnCollectCallback((count: number) => {
      this.state.score += count * 10;
      this.state.collectedCount += count;
      this.state.screenFlash = 1.0;
      this.state.scoreAnim.targetScale = 1.2;
      this.state.scoreAnim.animTime = 0;
      const high = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
      if (this.state.score > high) {
        localStorage.setItem(HIGH_SCORE_KEY, this.state.score.toString());
      }
    });
  }

  private setupInputListeners(): void {
    const keyMap: Record<string, keyof KeysState> = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      'w': 'up',
      'W': 'up',
      's': 'down',
      'S': 'down',
      'a': 'left',
      'A': 'left',
      'd': 'right',
      'D': 'right'
    };

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const key = keyMap[e.key];
      if (key) {
        e.preventDefault();
        this.keys[key] = true;
      }
      if ((e.key === 'Enter' || e.key === ' ') && this.state.isGameOver) {
        e.preventDefault();
        this.restart();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      const key = keyMap[e.key];
      if (key) {
        this.keys[key] = false;
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.state.isGameOver) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        if (this.isRestartButtonClick(x, y)) {
          this.restart();
        }
      }
    });
  }

  private isRestartButtonClick(x: number, y: number): boolean {
    const panelW = 400;
    const panelH = 380;
    const panelX = (this.canvas.width - panelW) / 2;
    const panelY = (this.canvas.height - panelH) / 2;
    const btnW = 180;
    const btnH = 50;
    const btnX = (this.canvas.width - btnW) / 2;
    const btnY = panelY + panelH - btnH - 30;
    return x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public setOnRestart(listener: () => void): void {
    this.onRestartListener = listener;
  }

  private restart(): void {
    this.player.clearParticles();
    this.obstacleGenerator.clear();
    this.collectibleGenerator.clear();
    this.collectibleGenerator.resetCollectedCount();
    this.state = this.createInitialState();
    this.setupCallbacks();
    this.totalTime = 0;
    this.scrollSpeed = this.BASE_SCROLL_SPEED;
    if (this.onRestartListener) {
      this.onRestartListener();
    }
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.resize(width, height);
    this.player.resize(width, height);
    this.obstacleGenerator.resize(width, height);
    this.collectibleGenerator.resize(width, height);
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;
    this.update(dt);
    this.renderer.render(this.state);
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.state.isGameOver) {
      this.state.progressPulse += dt;
      return;
    }

    this.totalTime += dt;
    this.state.phase = this.state.score >= 100 ? 1 : 0;

    this.scrollSpeed = this.BASE_SCROLL_SPEED + Math.min(this.totalTime * this.SCROLL_SPEED_GROWTH, 350);

    this.player.setKeys(this.keys);
    this.player.update(dt, this.state.player, this.totalTime, this.scrollSpeed);
    this.obstacleGenerator.update(dt, this.scrollSpeed, this.state.player);
    this.collectibleGenerator.update(dt, this.scrollSpeed, this.state.player);
    this.renderer.update(dt, this.scrollSpeed);

    if (this.state.screenFlash > 0) {
      this.state.screenFlash = Math.max(0, this.state.screenFlash - dt / 0.1);
    }

    const anim = this.state.scoreAnim;
    anim.animTime += dt;
    if (anim.animTime < anim.animDuration) {
      const t = anim.animTime / anim.animDuration;
      if (t < 0.5) {
        anim.scale = 1.0 + (anim.targetScale - 1.0) * (t * 2);
      } else {
        anim.scale = anim.targetScale - (anim.targetScale - 1.0) * ((t - 0.5) * 2);
      }
    } else {
      anim.scale = 1.0;
    }

    if (this.state.score >= 100) {
      this.state.progressPulse += dt;
      if (Math.floor(this.state.progressPulse * 4) !== Math.floor((this.state.progressPulse - dt) * 4)) {
        const barX = 20;
        const barY = this.canvas.height - 18;
        const barW = this.canvas.width - 40;
        this.renderer.emitGoldParticles(barX + barW, barY + 3);
      }
    }
  }
}
