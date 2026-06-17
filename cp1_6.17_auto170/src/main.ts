import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: {
        x: 0,
        y: 1
      },
      enableSleeping: false,
      debug: false,
      positionIterations: 10,
      velocityIterations: 10
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scene: [BootScene, MenuScene, GameScene]
};

const game = new Phaser.Game(config);

(window as any).game = game;

export function updateLoadingUI(progress: number): void {
  const loadingBar = document.getElementById('loading-bar');
  const loadingPercent = document.getElementById('loading-percent');
  if (loadingBar) {
    loadingBar.style.width = `${progress * 100}%`;
  }
  if (loadingPercent) {
    loadingPercent.textContent = `${Math.round(progress * 100)}%`;
  }
}

export function hideLoadingUI(): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 600);
  }
}

export default game;
