import { ShipManager, FormationType } from './ShipManager';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shipManager: ShipManager;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private running: boolean = false;
  private gameOver: boolean = false;
  private gameOverMessage: string = '';
  private previousSunkCount: number = 0;
  private previousPlayerDeadCount: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;

    this.shipManager = new ShipManager();
    this.renderer = new Renderer(this.ctx, GAME_WIDTH, GAME_HEIGHT);
    this.inputHandler = new InputHandler(this.canvas);

    this.setupCanvasScaling();
    window.addEventListener('resize', () => this.setupCanvasScaling());

    this.initGame();
  }

  private setupCanvasScaling(): void {
    const dpr = window.devicePixelRatio || 1;
    const maxW = Math.min(window.innerWidth, 1280);
    const maxH = Math.min(window.innerHeight, 720);
    const scale = Math.min(maxW / GAME_WIDTH, maxH / GAME_HEIGHT);

    this.canvas.style.width = (GAME_WIDTH * scale) + 'px';
    this.canvas.style.height = (GAME_HEIGHT * scale) + 'px';
    this.canvas.width = GAME_WIDTH * dpr;
    this.canvas.height = GAME_HEIGHT * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.renderer.resize(GAME_WIDTH, GAME_HEIGHT);

    const rect = this.canvas.getBoundingClientRect();
    this.inputHandler.setScale(
      rect.width / GAME_WIDTH,
      rect.height / GAME_HEIGHT
    );
  }

  private initGame(): void {
    this.shipManager.createPlayerFleet();
    this.shipManager.createEnemyFleet();
    this.elapsedTime = 0;
    this.gameOver = false;
    this.gameOverMessage = '';
    this.previousSunkCount = 0;
    this.previousPlayerDeadCount = 0;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render(dt);

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    if (this.gameOver) return;

    const input = this.inputHandler.consumeInput();

    if (input.clicked) {
      this.shipManager.moveFleetTo(input.clickX, input.clickY);
    }

    if (input.formationKey === 1) {
      this.shipManager.setFormation(FormationType.Arrow);
    } else if (input.formationKey === 2) {
      this.shipManager.setFormation(FormationType.Line);
    } else if (input.formationKey === 3) {
      this.shipManager.setFormation(FormationType.Circle);
    }

    if (input.focusFire) {
      this.shipManager.activateFocusFire();
    }

    this.shipManager.update(dt);
    this.elapsedTime += dt;

    const currentSunkCount = this.shipManager.getSunkenEnemyCount();
    if (currentSunkCount > this.previousSunkCount) {
      this.previousSunkCount = currentSunkCount;
    }

    const currentPlayerDeadCount = this.shipManager.playerShips.filter(s => s.isDead).length;
    if (currentPlayerDeadCount > this.previousPlayerDeadCount) {
      this.previousPlayerDeadCount = currentPlayerDeadCount;
      this.renderer.triggerCrackEffect();
    }

    if (this.shipManager.isVictory()) {
      this.gameOver = true;
      this.gameOverMessage = '胜利！所有敌舰已被击沉！';
    } else if (this.shipManager.isDefeat()) {
      this.gameOver = true;
      this.gameOverMessage = '战败！我方舰队全灭...';
    }
  }

  private render(dt: number): void {
    this.ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.renderer.render(this.shipManager, this.elapsedTime, dt);

    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.gameOverMessage, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
      this.ctx.font = '18px "Microsoft YaHei", sans-serif';
      this.ctx.fillStyle = '#aaccee';
      this.ctx.fillText('点击重新开始', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25);
      this.ctx.textAlign = 'left';

      this.canvas.addEventListener('click', () => {
        this.initGame();
      }, { once: true });
    }
  }
}

const engine = new GameEngine();
engine.start();
