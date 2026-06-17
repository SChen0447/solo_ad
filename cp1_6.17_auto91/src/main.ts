import { AudioEngine, type BandEnergy } from './audioEngine';
import { RhythmRunner } from './rhythmRunner';
import { UIOverlay } from './uiOverlay';

class GameApp {
  private canvas!: HTMLCanvasElement;
  private audioEngine!: AudioEngine;
  private game!: RhythmRunner;
  private ui!: UIOverlay;
  private lastFrameTime: number = 0;
  private isAudioReady: boolean = false;
  private animationLoopId: number = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas element not found!');
      return;
    }

    this.audioEngine = new AudioEngine();
    this.game = new RhythmRunner(this.canvas);
    this.ui = new UIOverlay();

    this.bindGameEvents();
    this.bindUIEvents();
    this.bindAudioEvents();

    this.ui.showStartOverlay(true);
    this.ui.showGameOverOverlay(false);
    this.ui.showPaused(false);
    this.ui.showRhythmPanel(true);

    this.startUITickLoop();
  }

  private bindGameEvents(): void {
    this.game.on('score', (_e, data) => {
      const score = data as number;
      this.ui.updateScore(score);
    });

    this.game.on('hit', (_e, data) => {
      const lives = data as number;
      this.ui.updateLives(lives, this.game.gameState.maxLives);
    });

    this.game.on('gameover', (_e, data) => {
      const score = data as number;
      this.audioEngine.stop();
      setTimeout(() => {
        this.ui.showGameOverOverlay(true, score);
      }, 600);
    });

    this.game.on('pause', () => {
      this.ui.showPaused(true);
      this.audioEngine.stop();
    });

    this.game.on('resume', () => {
      this.ui.showPaused(false);
      if (this.isAudioReady) {
        this.audioEngine.start();
      }
    });

    this.game.on('start', () => {
      this.ui.hideAllOverlays();
      this.ui.updateLives(3, 3);
      this.ui.updateScore(0, true);
    });

    this.game.on('jump', () => {
      this.ui.triggerBandFlash('low');
    });

    this.game.on('slide', () => {
      this.ui.triggerBandFlash('mid');
    });

    this.game.on('boost', () => {
      this.ui.triggerBandFlash('high');
    });
  }

  private bindUIEvents(): void {
    this.ui.on('startRequest', async () => {
      await this.handleStart();
    });

    this.ui.on('restartRequest', async () => {
      await this.handleRestart();
    });
  }

  private bindAudioEvents(): void {
    this.audioEngine.onTrigger((band: keyof BandEnergy) => {
      this.game.onBandTrigger(band);
      this.ui.triggerBandFlash(band);
    });
  }

  private async handleStart(): Promise<void> {
    this.ui.setStartButtonText('🎤 请求麦克风权限...');

    const audioOk = await this.audioEngine.init();
    this.isAudioReady = audioOk;

    if (!audioOk) {
      console.warn('麦克风初始化失败，将仅使用键盘控制');
      this.ui.setStartButtonText('⚠️ 无麦克风，使用键盘');
    } else {
      this.audioEngine.start();
    }

    this.ui.hideAllOverlays();
    this.game.reset();
    this.game.start();

    if (audioOk) {
      this.ui.setStartButtonText('🎮 继续游戏');
    }
  }

  private async handleRestart(): Promise<void> {
    this.game.reset();
    if (this.isAudioReady) {
      this.audioEngine.start();
    }
    this.game.start();
    this.ui.hideAllOverlays();
  }

  private startUITickLoop(): void {
    this.lastFrameTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      let energy: BandEnergy = { low: 0, mid: 0, high: 0 };
      if (this.isAudioReady && this.audioEngine.getRunning()) {
        energy = this.audioEngine.update();
      }

      this.ui.updateRhythmBars(
        energy,
        this.audioEngine.getThresholds()
      );

      this.ui.tickAnimation(dt);

      this.animationLoopId = requestAnimationFrame(tick);
    };
    tick();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationLoopId);
    this.audioEngine.destroy();
    this.game.dispose();
  }
}

let gameApp: GameApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  gameApp = new GameApp();
});

window.addEventListener('beforeunload', () => {
  if (gameApp) {
    gameApp.dispose();
    gameApp = null;
  }
});
