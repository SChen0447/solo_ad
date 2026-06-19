import { CONFIG } from './config';
import { EntityManager } from './entityManager';
import type { GameState, InputState } from './entities';

interface UICallbacks {
  onOxygenChange: (percent: number) => void;
  onCoinsChange: (coins: number) => void;
  onExploreChange: (percent: number) => void;
  onGameOver: (time: number, coins: number) => void;
}

export class GameCore {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entityManager: EntityManager;
  private state: GameState;
  private input: InputState;
  private callbacks: UICallbacks;

  private rafId: number = 0;
  private lastTime: number = 0;
  private lastBubbleSpawn: number = 0;
  private lastCoinValue: number = 0;
  private lastExploreValue: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: UICallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.callbacks = callbacks;
    this.entityManager = new EntityManager();
    this.state = this.createInitialState();
    this.input = this.createInitialInput();

    this.resizeCanvas();
    this.bindEvents();
  }

  private createInitialState(): GameState {
    return {
      isRunning: true,
      isGameOver: false,
      coins: 0,
      explorePercent: 0,
      elapsedTime: 0,
      exploredCells: new Set<string>()
    };
  }

  private createInitialInput(): InputState {
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      interact: false,
      interactPressed: false,
      joystickActive: false,
      joystickX: 0,
      joystickY: 0
    };
  }

  start(): void {
    this.lastTime = performance.now();
    this.lastBubbleSpawn = this.lastTime;
    this.loop(this.lastTime);
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  restart(): void {
    this.stop();
    this.entityManager.init();
    this.state = this.createInitialState();
    this.input = this.createInitialInput();
    this.lastCoinValue = 0;
    this.lastExploreValue = 0;
    this.callbacks.onOxygenChange(100);
    this.callbacks.onCoinsChange(0);
    this.callbacks.onExploreChange(0);
    this.start();
  }

  private loop = (time: number): void => {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.update(dt, time);
    this.render(time);

    if (this.state.isRunning) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  private update(dt: number, time: number): void {
    if (!this.state.isRunning) return;

    this.state.elapsedTime += dt;

    const player = this.entityManager.getPlayer();
    if (player) {
      player.oxygen -= CONFIG.OXYGEN.CONSUMPTION_RATE * dt;
      if (player.oxygen <= 0) {
        player.oxygen = 0;
        this.gameOver();
      }
      this.callbacks.onOxygenChange(Math.round(player.oxygen));

      this.updateExploration(player.x, player.y);
    }

    if (this.input.interactPressed) {
      this.entityManager.tryOpenTreasure(this.state);
      if (this.state.coins !== this.lastCoinValue) {
        this.callbacks.onCoinsChange(this.state.coins);
        this.lastCoinValue = this.state.coins;
      }
      this.input.interactPressed = false;
    }

    if (time - this.lastBubbleSpawn > CONFIG.OXYGEN.BUBBLE_SPAWN_INTERVAL) {
      this.entityManager.spawnOxygenBubble();
      this.lastBubbleSpawn = time;
    }

    this.entityManager.update(dt, this.state, this.input);

    if (player) {
      this.entityManager.setCamera(player.x, player.y);
    }
  }

  private updateExploration(px: number, py: number): void {
    const cell = CONFIG.WORLD.CELL_SIZE;
    const gx = Math.floor(px / cell);
    const gy = Math.floor(py / cell);
    const key = `${gx},${gy}`;
    if (!this.state.exploredCells.has(key)) {
      this.state.exploredCells.add(key);
      const total = CONFIG.WORLD.GRID_SIZE * CONFIG.WORLD.GRID_SIZE;
      const percent = Math.round((this.state.exploredCells.size / total) * 100);
      if (percent !== this.lastExploreValue) {
        this.state.explorePercent = percent;
        this.callbacks.onExploreChange(percent);
        this.lastExploreValue = percent;
      }
    }
  }

  private gameOver(): void {
    if (this.state.isGameOver) return;
    this.state.isRunning = false;
    this.state.isGameOver = true;
    this.stop();
    this.callbacks.onGameOver(Math.round(this.state.elapsedTime), this.state.coins);
  }

  private render(time: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.entityManager.render(this.ctx, w, h, time);
  }

  private resizeCanvas = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.resizeCanvas);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  unbindEvents(): void {
    window.removeEventListener('resize', this.resizeCanvas);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'KeyE':
        if (!this.input.interact) {
          this.input.interactPressed = true;
        }
        this.input.interact = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.input.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.input.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'KeyE':
        this.input.interact = false;
        break;
    }
  };

  setJoystick(x: number, y: number, active: boolean): void {
    this.input.joystickX = x;
    this.input.joystickY = y;
    this.input.joystickActive = active;
  }

  triggerInteract(): void {
    this.input.interactPressed = true;
  }

  getState(): Readonly<GameState> {
    return this.state;
  }
}
