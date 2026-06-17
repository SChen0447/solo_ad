import Phaser from 'phaser';
import { GameScene } from './scene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [GameScene],
  pixelArt: true,
  roundPixels: false,
  input: {
    keyboard: true,
    mouse: true,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  dom: {
    createContainer: true,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: window.innerWidth,
    height: window.innerHeight,
  },
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
