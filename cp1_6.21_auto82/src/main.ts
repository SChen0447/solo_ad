import Phaser from 'phaser';
import { MenuScene } from './MenuScene';
import { GameScene } from './GameScene';
import { GameOverScene } from './GameOverScene';

class BootstrapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootstrapScene' });
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false,
      fps: 60
    }
  },
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  scene: [
    BootstrapScene,
    MenuScene,
    GameScene,
    GameOverScene
  ]
};

function createGame(): Phaser.Game {
  const game = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  return game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createGame);
} else {
  createGame();
}
