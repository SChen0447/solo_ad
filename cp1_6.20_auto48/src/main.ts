import * as THREE from 'three';
import { GameState, Difficulty, SongInfo } from './gameState';
import { AudioAnalyzer } from './audioAnalyzer';
import { PlayerController } from './playerController';
import { ObstacleGenerator } from './obstacleGenerator';
import { SceneRenderer } from './sceneRenderer';

class Game {
  private gameState: GameState;
  private audioAnalyzer: AudioAnalyzer;
  private playerController: PlayerController | null = null;
  private obstacleGenerator: ObstacleGenerator | null = null;
  private sceneRenderer: SceneRenderer | null = null;
  private container: HTMLElement;

  private clock: THREE.Clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private selectedSong: SongInfo | null = null;
  private selectedDifficulty: Difficulty = 'normal';
  private useDemoMode: boolean = false;

  constructor() {
    this.container = document.getElementById('app')!;
    this.gameState = GameState.getInstance();
    this.audioAnalyzer = AudioAnalyzer.getInstance();

    this.init();
  }

  private init(): void {
    this.setupUIEventListeners();
    this.addDemoSongs();
  }

  private setupUIEventListeners(): void {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    const startBtn = document.getElementById('startBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');
    const menuBtn = document.getElementById('menuBtn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');

    uploadBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', this.handleFileUpload.bind(this));

    startBtn?.addEventListener('click', this.startGame.bind(this));

    resumeBtn?.addEventListener('click', this.resumeGame.bind(this));

    restartBtn?.addEventListener('click', this.restartGame.bind(this));

    menuBtn?.addEventListener('click', this.returnToMenu.bind(this));

    difficultyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const difficulty = (e.target as HTMLElement).dataset.difficulty as Difficulty;
        this.setDifficulty(difficulty);
      });
    });

    this.gameState.on('gameOver', this.handleGameOver.bind(this));
    this.gameState.on('statusChange', this.handleStatusChange.bind(this));
  }

  private addDemoSongs(): void {
    const songList = document.getElementById('songList');
    if (!songList) return;

    const demoSongs: SongInfo[] = [
      { name: '演示节奏 - 128BPM', artist: 'Demo Track', bpm: 128 },
      { name: '电子节拍 - 140BPM', artist: 'Demo Track', bpm: 140 },
      { name: '慢速律动 - 100BPM', artist: 'Demo Track', bpm: 100 }
    ];

    demoSongs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.innerHTML = `
        <div class="song-card-title">${song.name}</div>
        <div class="song-card-artist">${song.artist}</div>
        <div class="song-card-artist" style="margin-top: 8px; color: #ffd700;">${song.bpm} BPM</div>
      `;
      card.addEventListener('click', () => {
        this.selectSong(song, true);
      });
      songList.appendChild(card);
    });
  }

  private async handleFileUpload(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const result = await this.audioAnalyzer.loadAudioFile(file);
      const song: SongInfo = {
        name: result.name,
        bpm: this.audioAnalyzer.getBpm(),
        file
      };

      this.selectSong(song, false);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('无法加载音频文件，请尝试其他文件');
    }

    input.value = '';
  }

  private selectSong(song: SongInfo, isDemo: boolean): void {
    this.selectedSong = song;
    this.useDemoMode = isDemo;

    const cards = document.querySelectorAll('.song-card');
    cards.forEach(card => card.classList.remove('selected'));

    const songList = document.getElementById('songList');
    if (songList && isDemo) {
      const demoCards = songList.querySelectorAll('.song-card');
      const index = song.name.includes('128') ? 0 : song.name.includes('140') ? 1 : 2;
      demoCards[index]?.classList.add('selected');
    }

    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    if (startBtn) {
      startBtn.disabled = false;
    }

    this.gameState.setCurrentSong(song);
  }

  private setDifficulty(difficulty: Difficulty): void {
    this.selectedDifficulty = difficulty;
    this.gameState.setDifficulty(difficulty);

    const btns = document.querySelectorAll('.difficulty-btn');
    btns.forEach(btn => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = 'none';
    });

    const activeBtn = document.querySelector(`[data-difficulty="${difficulty}"]`);
    if (activeBtn) {
      activeBtn.style.transform = 'scale(1.1)';
      activeBtn.style.boxShadow = '0 0 30px currentColor';
    }
  }

  private initGame(): void {
    if (this.playerController) {
      this.playerController.destroy();
    }
    if (this.obstacleGenerator) {
      this.obstacleGenerator.destroy();
    }
    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }

    const tempScene = new THREE.Scene();
    this.playerController = new PlayerController(tempScene);
    
    this.sceneRenderer = new SceneRenderer(this.container, this.playerController);
    
    const scene = this.sceneRenderer.getScene();
    const playerMesh = this.playerController.getMesh();
    tempScene.remove(playerMesh);
    scene.add(playerMesh);

    this.obstacleGenerator = new ObstacleGenerator(scene, this.playerController);

    this.playerController.on('pause', () => {
      if (this.gameState.getStatus() === 'playing') {
        this.pauseGame();
      }
    });

    this.setDifficulty(this.selectedDifficulty);
  }

  private startGame(): void {
    if (!this.selectedSong) return;

    this.initGame();
    this.gameState.reset();
    this.playerController?.reset();
    this.obstacleGenerator?.reset();
    this.sceneRenderer?.reset();

    this.gameState.setCurrentSong(this.selectedSong);
    this.gameState.setStatus('playing');

    if (this.useDemoMode) {
      this.audioAnalyzer.generateDemoAudio();
      this.audioAnalyzer.startDemoAnalysis();
    } else {
      this.audioAnalyzer.play();
    }

    this.hideMenu();
    this.startGameLoop();
  }

  private pauseGame(): void {
    if (this.gameState.getStatus() !== 'playing') return;
    
    this.gameState.setStatus('paused');
    this.showPauseMenu();
    
    if (this.useDemoMode) {
      this.audioAnalyzer.stopDemo();
    } else {
      this.audioAnalyzer.pause();
    }
    
    this.stopGameLoop();
  }

  private resumeGame(): void {
    if (this.gameState.getStatus() !== 'paused') return;
    
    this.gameState.setStatus('playing');
    this.hidePauseMenu();
    
    if (this.useDemoMode) {
      this.audioAnalyzer.startDemoAnalysis();
    } else {
      this.audioAnalyzer.play();
    }
    
    this.startGameLoop();
  }

  private restartGame(): void {
    this.hidePauseMenu();
    this.hideGameOverScreen();
    
    if (this.useDemoMode) {
      this.audioAnalyzer.stopDemo();
    } else {
      this.audioAnalyzer.stop();
    }
    
    this.stopGameLoop();
    this.startGame();
  }

  private returnToMenu(): void {
    this.hidePauseMenu();
    this.hideGameOverScreen();
    
    if (this.useDemoMode) {
      this.audioAnalyzer.stopDemo();
    } else {
      this.audioAnalyzer.stop();
    }
    
    this.stopGameLoop();
    this.gameState.setStatus('menu');
    this.showMenu();
  }

  private handleGameOver(data?: unknown): void {
    const finalScore = data as number;
    console.log(`Game Over! Final Score: ${finalScore}`);
    
    if (this.useDemoMode) {
      this.audioAnalyzer.stopDemo();
    } else {
      this.audioAnalyzer.stop();
    }
    
    this.stopGameLoop();
    
    setTimeout(() => {
      this.showGameOverScreen(finalScore);
    }, 500);
  }

  private handleStatusChange(data?: unknown): void {
    const status = data as string;
    console.log(`Game status changed to: ${status}`);
  }

  private startGameLoop(): void {
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  private stopGameLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const gameSpeed = this.gameState.getGameSpeed();

    this.gameState.updateGameSpeed(deltaTime);
    this.playerController?.update(deltaTime, gameSpeed);
    this.obstacleGenerator?.update(deltaTime, gameSpeed);
    this.sceneRenderer?.update(deltaTime, gameSpeed);
    this.sceneRenderer?.render();
  };

  private showMenu(): void {
    const mainMenu = document.getElementById('mainMenu');
    mainMenu?.classList.remove('hidden');
  }

  private hideMenu(): void {
    const mainMenu = document.getElementById('mainMenu');
    mainMenu?.classList.add('hidden');
  }

  private showPauseMenu(): void {
    const pauseMenu = document.getElementById('pauseMenu');
    pauseMenu?.classList.remove('hidden');
  }

  private hidePauseMenu(): void {
    const pauseMenu = document.getElementById('pauseMenu');
    pauseMenu?.classList.add('hidden');
  }

  private showGameOverScreen(score: number): void {
    const overlay = document.createElement('div');
    overlay.id = 'gameOverScreen';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(13, 0, 26, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
    `;
    overlay.innerHTML = `
      <h1 style="font-size: 64px; color: #ff4444; text-shadow: 0 0 30px rgba(255, 68, 68, 0.8); margin-bottom: 20px;">游戏结束</h1>
      <p style="font-size: 32px; background: linear-gradient(135deg, #ffffff, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 40px;">
        最终得分: ${score}
      </p>
      <div style="display: flex; gap: 20px;">
        <button id="gameOverRestart" style="padding: 15px 40px; font-size: 18px; background: linear-gradient(135deg, #00ffff, #ff00ff); border: none; border-radius: 25px; color: white; cursor: pointer; transition: all 0.3s ease;">
          重新开始
        </button>
        <button id="gameOverMenu" style="padding: 15px 40px; font-size: 18px; background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(255, 255, 255, 0.3); border-radius: 25px; color: white; cursor: pointer; transition: all 0.3s ease;">
          返回主菜单
        </button>
      </div>
    `;
    this.container.appendChild(overlay);

    document.getElementById('gameOverRestart')?.addEventListener('click', () => {
      this.removeGameOverScreen();
      this.restartGame();
    });

    document.getElementById('gameOverMenu')?.addEventListener('click', () => {
      this.removeGameOverScreen();
      this.returnToMenu();
    });
  }

  private hideGameOverScreen(): void {
    this.removeGameOverScreen();
  }

  private removeGameOverScreen(): void {
    const screen = document.getElementById('gameOverScreen');
    if (screen) {
      screen.remove();
    }
  }

  destroy(): void {
    this.stopGameLoop();
    
    if (this.useDemoMode) {
      this.audioAnalyzer.stopDemo();
    } else {
      this.audioAnalyzer.cleanup();
    }
    
    this.playerController?.destroy();
    this.obstacleGenerator?.destroy();
    this.sceneRenderer?.destroy();

    this.gameState.off('gameOver', this.handleGameOver.bind(this));
    this.gameState.off('statusChange', this.handleStatusChange.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  
  window.addEventListener('beforeunload', () => {
    game.destroy();
  });
});
