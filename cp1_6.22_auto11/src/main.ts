import Phaser from 'phaser';
import { GameScene } from './gameScene';
import { UIController, GameController } from './uiController';

class Game {
  private game: Phaser.Game;
  private gameScene!: GameScene;
  private uiController!: UIController;

  constructor() {
    const gameContainer = document.getElementById('game-canvas');
    if (!gameContainer) {
      throw new Error('Game container not found');
    }

    const containerRect = gameContainer.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: width,
      height: height,
      parent: 'game-canvas',
      scene: [GameScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      backgroundColor: '#1a1a2e',
      pixelArt: true,
      antialias: false,
      autoFocus: true,
      input: {
        keyboard: {
          target: window
        }
      }
    };

    this.game = new Phaser.Game(config);

    this.game.events.once('ready', () => {
      this.onGameReady();
    });

    window.addEventListener('resize', () => {
      this.onResize();
    });
  }

  private onGameReady(): void {
    this.gameScene = this.game.scene.getScene('GameScene') as GameScene;
    
    const gameController: GameController = {
      togglePlay: () => this.gameScene.togglePlay(),
      setSpeed: (speed: number) => this.gameScene.setSpeed(speed),
      setSong: (songId: string) => this.gameScene.setSong(songId),
      getAudioManager: () => this.gameScene.getAudioManager(),
      setStateChangeCallback: (callback) => this.gameScene.setStateChangeCallback(callback)
    };
    
    this.uiController = new UIController(gameController);
  }

  private onResize(): void {
    const gameContainer = document.getElementById('game-canvas');
    if (!gameContainer) return;
    
    const containerRect = gameContainer.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;
    
    this.game.scale.resize(width, height);
    
    if (this.gameScene) {
      this.game.events.emit('resize', width, height);
    }
  }

  public destroy(): void {
    if (this.uiController) {
      this.uiController.destroy();
    }
    this.game.destroy(true);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
