import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { UIController } from './scenes/UIController';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#050510',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GameScene, UIController],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
  },
};

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

let game: Phaser.Game | null = null;

function launchGame() {
  if (startScreen) {
    startScreen.classList.add('hidden');
    setTimeout(() => {
      if (startScreen && startScreen.parentNode) {
        startScreen.parentNode.removeChild(startScreen);
      }
    }, 600);
  }
  if (!game) {
    game = new Phaser.Game(config);
  }
}

if (startBtn) {
  startBtn.addEventListener('click', launchGame);
}

window.addEventListener('resize', () => {
  if (game) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});
