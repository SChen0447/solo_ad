import { AudioManager } from './audio';
import { InputManager } from './input';
import { GameManager, GameState } from './game';
import { Renderer } from './renders';

class Game {
  private canvas: HTMLCanvasElement;
  private audioManager: AudioManager;
  private inputManager: InputManager;
  private gameManager: GameManager;
  private renderer: Renderer;
  private fileInput: HTMLInputElement;
  
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private titleProgress: number = 0;
  private subtitleProgress: number = 0;
  private menuAnimationTime: number = 0;
  private isButtonHovered: boolean = false;
  private buttonClickProgress: number = 0;
  private loadingProgress: number = 0;
  private gameOverAnimationProgress: number = 0;
  private gameOverButtonHover: { retry: boolean; newSong: boolean } = { retry: false, newSong: false };
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));

    this.audioManager = new AudioManager();
    this.inputManager = new InputManager(this.canvas);
    this.gameManager = new GameManager(this.canvas);
    this.renderer = new Renderer(this.canvas);

    this.setupEventListeners();
    this.startMenuAnimation();
  }

  private resizeCanvas(): void {
    this.canvas.width = Math.floor(window.innerWidth * 0.9);
    this.canvas.height = Math.floor(window.innerHeight * 0.85);
    if (this.renderer) {
      this.renderer.resize();
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchClick.bind(this), { passive: false });
    this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mousePosition = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };

    if (this.gameManager.getState() === GameState.MENU) {
      const bounds = this.renderer.getMenuButtonBounds();
      this.isButtonHovered = this.isPointInRect(this.mousePosition, bounds);
    } else if (this.gameManager.getState() === GameState.GAME_OVER) {
      const bounds = this.renderer.getGameOverButtonBounds();
      this.gameOverButtonHover.retry = this.isPointInRect(this.mousePosition, bounds.retry);
      this.gameOverButtonHover.newSong = this.isPointInRect(this.mousePosition, bounds.newSong);
    }
  }

  private handleTouchClick(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePosition = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
      this.handleCanvasClick();
    }
  }

  private handleCanvasClick(): void {
    const state = this.gameManager.getState();

    if (state === GameState.MENU) {
      const bounds = this.renderer.getMenuButtonBounds();
      if (this.isPointInRect(this.mousePosition, bounds)) {
        this.buttonClickProgress = 1;
        setTimeout(() => {
          this.buttonClickProgress = 0;
          this.fileInput.click();
        }, 150);
      }
    } else if (state === GameState.GAME_OVER) {
      const bounds = this.renderer.getGameOverButtonBounds();
      if (this.isPointInRect(this.mousePosition, bounds.retry)) {
        this.restartGame();
      } else if (this.isPointInRect(this.mousePosition, bounds.newSong)) {
        this.gameManager.setState(GameState.MENU);
        this.gameOverAnimationProgress = 0;
        this.startMenuAnimation();
      }
    }
  }

  private isPointInRect(point: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }): boolean {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  }

  private async handleFileSelect(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    this.gameManager.setState(GameState.LOADING);
    this.loadingProgress = 0;

    try {
      await this.audioManager.loadAudio(file);
      
      const beatPoints = this.audioManager.getBeatPoints();
      const bpm = this.audioManager.getBPM();
      this.gameManager.setBeatPoints(beatPoints, bpm);

      this.simulateLoading();
    } catch (error) {
      console.error('Failed to load audio:', error);
      this.gameManager.setState(GameState.MENU);
      alert('音频文件加载失败，请选择其他文件');
    }

    target.value = '';
  }

  private simulateLoading(): void {
    const interval = setInterval(() => {
      this.loadingProgress += 0.05;
      if (this.loadingProgress >= 1) {
        clearInterval(interval);
        this.loadingProgress = 1;
        setTimeout(() => {
          this.startGame();
        }, 300);
      }
    }, 50);
  }

  private startMenuAnimation(): void {
    this.titleProgress = 0;
    this.subtitleProgress = 0;
    this.menuAnimationTime = 0;

    const titleInterval = setInterval(() => {
      this.titleProgress += 0.02;
      if (this.titleProgress >= 1) {
        clearInterval(titleInterval);
        this.titleProgress = 1;

        setTimeout(() => {
          const subtitleInterval = setInterval(() => {
            this.subtitleProgress += 0.03;
            if (this.subtitleProgress >= 1) {
              clearInterval(subtitleInterval);
              this.subtitleProgress = 1;
            }
          }, 50);
        }, 300);
      }
    }, 30);
  }

  private startGame(): void {
    this.gameManager.start();
    this.audioManager.play();
    this.lastTime = performance.now();
    
    if (!this.isRunning) {
      this.isRunning = true;
      this.gameLoop();
    }
  }

  private restartGame(): void {
    this.gameManager.reset();
    this.gameOverAnimationProgress = 0;
    this.startGame();
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    const state = this.gameManager.getState();

    this.renderer.clear();

    if (state === GameState.MENU) {
      this.menuAnimationTime += deltaTime;
      this.renderer.drawMenu(this.titleProgress, this.subtitleProgress, this.isButtonHovered, this.buttonClickProgress);
    } else if (state === GameState.LOADING) {
      this.renderer.drawLoading(this.loadingProgress);
    } else if (state === GameState.PLAYING) {
      const audioTime = this.audioManager.getCurrentTime();
      
      this.inputManager.update(deltaTime);
      
      const swordDirection = this.inputManager.getSwordDirection();
      const swordSegment = this.inputManager.getSwordSegment();
      const trailPoints = this.inputManager.getTrailPoints();

      this.gameManager.update(deltaTime, audioTime, swordDirection, swordSegment);
      this.gameManager.checkPulseForBeat(audioTime);

      if (this.audioManager.getIsPlaying() && this.gameManager.isAudioEnded(this.audioManager.getDuration())) {
        this.audioManager.stop();
        this.gameManager.gameOver();
      }

      this.renderer.drawBackground(this.gameManager.getPulseIntensity());
      
      for (const ball of this.gameManager.getBalls()) {
        this.renderer.drawBall(ball, now);
      }

      this.renderer.drawSword(trailPoints, swordDirection.direction);
      this.renderer.drawParticles(this.gameManager.getParticles());
      this.renderer.drawMissEffects(this.gameManager.getMissEffects(), now);
      this.renderer.drawScorePopups(this.gameManager.getScorePopups(), now);
      this.renderer.drawUI(
        this.gameManager.getScore(),
        this.gameManager.getCombo(),
        this.gameManager.getMissCount(),
        this.gameManager.getScoreAnimation(),
        this.gameManager.getComboAnimation()
      );
    } else if (state === GameState.GAME_OVER) {
      this.audioManager.stop();
      this.gameOverAnimationProgress = Math.min(1, this.gameOverAnimationProgress + deltaTime * 1.5);
      
      this.renderer.drawBackground(0);
      for (const ball of this.gameManager.getBalls()) {
        this.renderer.drawBall(ball, now);
      }
      this.renderer.drawParticles(this.gameManager.getParticles());
      this.renderer.drawGameOver(
        this.gameManager.getScore(),
        this.gameOverAnimationProgress,
        this.gameOverButtonHover
      );
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  start(): void {
    this.isRunning = true;
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audioManager.dispose();
    this.inputManager.dispose();
  }
}

const game = new Game();
game.start();

window.addEventListener('beforeunload', () => {
  game.stop();
});
