import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { StationScene } from './scenes/StationScene';
import { EventScene } from './scenes/EventScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#0a0a2a',
  scene: [BootScene, StationScene, EventScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

let game: Phaser.Game | null = null;

function startGame(): void {
  const startScreen = document.getElementById('start-screen');
  const gameContainer = document.getElementById('game-container');

  if (startScreen) {
    startScreen.classList.add('fade-out');
  }

  if (gameContainer) {
    gameContainer.classList.add('active');
  }

  if (!game) {
    game = new Phaser.Game(config);
  }

  setTimeout(() => {
    if (startScreen && startScreen.parentNode) {
      startScreen.parentNode.removeChild(startScreen);
    }
  }, 600);
}

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }
});

window.addEventListener('resize', () => {
  if (game) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

export { game, startGame };
export default game;
