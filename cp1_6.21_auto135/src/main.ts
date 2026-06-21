import Phaser from 'phaser';
import { EditorScene } from './scenes/EditorScene';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: [LevelSelectScene, EditorScene, GameScene],
  parent: 'game-container',
  backgroundColor: '#0a0a23',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 768,
      height: 500
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

new Phaser.Game(config);
