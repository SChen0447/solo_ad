import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

export const GAME_CONFIG = {
  width: 1280,
  height: 720,
  aspectRatio: 16 / 9,
  cardWidth: 120,
  cardHeight: 160,
  fieldCardWidth: 100,
  fieldCardHeight: 130,
};

class BootstrapScene extends Phaser.Scene {
  constructor() {
    super('BootstrapScene');
  }

  create(): void {
    this.scene.start('BattleScene');
  }
}

function createGame(): Phaser.Game {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Game container not found');
  }

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0a0a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_CONFIG.width,
      height: GAME_CONFIG.height,
    },
    render: {
      pixelArt: false,
      antialias: true,
      antialiasGL: true,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
      },
    },
    scene: [BootstrapScene, BattleScene],
  };

  return new Phaser.Game(config);
}

let game: Phaser.Game | null = null;

window.addEventListener('load', () => {
  game = createGame();
});

window.addEventListener('resize', () => {
  if (game) {
    game.scale.refresh();
  }
});

export { game };
