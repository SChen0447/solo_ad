import Phaser from 'phaser';
import { GravityManager } from './physics/GravityManager';
import { PlanetScene } from './scenes/PlanetScene';

function createGameConfig(
  width: number,
  height: number,
  gravityManager: GravityManager
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: width,
    height: height,
    parent: 'game-container',
    backgroundColor: '#0a0a1a',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: width,
      height: height
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true
    },
    input: {
      keyboard: true
    },
    scene: [new PlanetScene(gravityManager)]
  };
}

function bootGame(): void {
  const gravityManager = new GravityManager();

  const width = window.innerWidth;
  const height = window.innerHeight;

  const config = createGameConfig(width, height, gravityManager);
  const game = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
