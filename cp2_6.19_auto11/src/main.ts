import Phaser from 'phaser';
import { GameScene } from './engine/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container'
  },
  backgroundColor: '#3E2723',
  scene: [GameScene]
};

new Phaser.Game(config);
