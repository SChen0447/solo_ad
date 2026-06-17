import { GameEngine } from './gameEngine';
import { UIManager } from './uiManager';
import { InputState, RaceResult } from './types';

class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private ui: UIManager;
  private input: InputState;
  private lastTime: number = 0;
  private rafId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.engine = new GameEngine();
    this.ui = new UIManager();
    this.input = {
      up: false, down: false, left: false, right: false, shift: false
    };

    this.resizeCanvas();
    this.bindEvents();
    this.ui.onButtonClick = (action: string) => this.handleAction(action);
    this.ui.updateStatTargets();
  }

  private resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.engine.resize(w, h);
    this.ui.resize(w, h);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.input.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.input.shift = true;
          break;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.input.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.input.shift = false;
          break;
      }
    });

    const getMousePos = (e: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (this.canvas.width / rect.width) / (window.devicePixelRatio || 1),
        y: (e.clientY - rect.top) * (this.canvas.height / rect.height) / (window.devicePixelRatio || 1)
      };
    };

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const pos = getMousePos(e);
      this.ui.handleMouseMove(pos.x, pos.y);
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      const pos = getMousePos(e);
      this.ui.handleMouseDown(pos.x, pos.y);
    });

    this.canvas.addEventListener('mouseup', (e: MouseEvent) => {
      const pos = getMousePos(e);
      this.ui.handleMouseUp(pos.x, pos.y);
    });

    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = getMousePos(t);
      this.ui.handleMouseDown(pos.x, pos.y);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = getMousePos(t);
      this.ui.handleMouseMove(pos.x, pos.y);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const pos = getMousePos(t);
      this.ui.handleMouseUp(pos.x, pos.y);
    }, { passive: false });
  }

  private handleAction(action: string): void {
    if (action === 'startRace') {
      this.engine.startRace(
        this.ui.selectedTrack,
        this.ui.selectedCar,
        this.ui.selectedCarColor,
        this.ui.selectedSpoiler,
        this.ui.selectedTire
      );
      this.ui.switchState('racing');
      return;
    }

    this.ui.processAction(action);
  }

  private loop = (time: number): void => {
    if (!this.lastTime) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.ui.update(dt);

    if (this.ui.gameState === 'racing') {
      this.engine.setInput(this.input);
      this.engine.update();

      if (this.engine.raceFinished && this.ui.transitionTimer <= 0) {
        const result: RaceResult = {
          lapTime: this.engine.lapTime,
          maxSpeed: this.engine.maxSpeedReached,
          perfectDriftCount: this.engine.perfectDriftCount
        };
        this.ui.raceResult = result;
        this.ui.switchState('raceEnd');
      }
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.ui.gameState === 'racing') {
      this.engine.render(this.ctx);
    }

    this.ui.render(this.ctx, this.engine);

    this.rafId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.ui.buildButtons();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.start();
});
