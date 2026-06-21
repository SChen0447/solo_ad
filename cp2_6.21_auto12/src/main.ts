import { SoundEngine } from './sound/SoundEngine';
import { GameEngine } from './game/GameEngine';
import { Renderer } from './render/Renderer';
import { UIManager } from './ui/UIManager';
import { eventBus } from './EventBus';
import type { GameState } from './types';

class Game {
  private soundEngine: SoundEngine;
  private gameEngine: GameEngine;
  private renderer: Renderer;
  private uiManager: UIManager;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const uiContainer = document.getElementById('uiContainer') as HTMLElement;

    if (!canvas || !uiContainer) {
      throw new Error('Canvas or UI container not found');
    }

    this.soundEngine = new SoundEngine();
    this.gameEngine = new GameEngine();
    this.renderer = new Renderer(canvas);
    this.uiManager = new UIManager(uiContainer);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('ui:startCalibration', async () => {
      try {
        if (!this.soundEngine.isInitialized()) {
          this.soundEngine.startCalibration();
        } else {
          await this.soundEngine.init();
          this.soundEngine.startCalibration();
        }
      } catch (error) {
        console.error('Failed to start calibration:', error);
        alert('无法访问麦克风，请确保已授权麦克风权限。');
        eventBus.emit('ui:showScreen', 'start');
      }
    });

    eventBus.on('sound:calibrationComplete', (data: { baseFrequency: number; averageVolume: number }) => {
      console.log('Calibration complete:', data);
    });
  }

  async start(): Promise<void> {
    try {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop(this.lastTime);
      console.log('Game started successfully');
    } catch (error) {
      console.error('Failed to start game:', error);
      throw error;
    }
  }

  private gameLoop(currentTime: number): void {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    const fixedDt = 1 / 60;
    let accumulator = dt;

    while (accumulator >= fixedDt) {
      this.gameEngine.update(fixedDt);
      accumulator -= fixedDt;
    }

    const state = this.gameEngine.getState();
    this.renderer.render(state, dt);
    this.uiManager.update();

    this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.soundEngine.stop();
  }

  getState(): GameState {
    return this.gameEngine.getState();
  }
}

const game = new Game();

game.start().catch((error) => {
  console.error('Failed to initialize game:', error);
});

window.addEventListener('beforeunload', () => {
  game.stop();
});

if ('ontouchstart' in window) {
  document.addEventListener('touchstart', (e) => {
    e.preventDefault();
  }, { passive: false });
}

export default game;
