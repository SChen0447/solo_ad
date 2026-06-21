import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const container = document.getElementById('game-container')!;
const containerRect = container.getBoundingClientRect();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: Math.floor(containerRect.width),
  height: Math.floor(containerRect.height),
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
    smoothStep: true,
  },
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  const rect = container.getBoundingClientRect();
  game.scale.resize(Math.floor(rect.width), Math.floor(rect.height));
});
