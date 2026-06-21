import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './Defines';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: COLORS.BACKGROUND,
  scene: [GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
