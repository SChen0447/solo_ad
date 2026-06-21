import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { Bootstrap } from './scenes/Bootstrap';

export const GameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 720,
  backgroundColor: '#0a0a12',
  parent: 'game-container',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false
  }
};

export const GlobalSettings = {
  TILE_SIZE: 32,
  MAP_WIDTH: 80,
  MAP_HEIGHT: 45,
  PLAYER_SPEED: 120,
  PLAYER_CROUCH_SPEED: 60,
  GUARD_SPEED: 80,
  GUARD_FOV_ANGLE: 120,
  GUARD_FOV_DISTANCE: 192,
  GUARD_ALERT_DECAY: 0.3,
  GUARD_ALERT_INCREASE: 1.5,
  LIGHT_EXPOSURE_THRESHOLD: 2,
  NOISE_DURATION: 6000,
  NOISE_RADIUS: 96,
  FOOTPRINT_DURATION: 2000
};

const game = new Phaser.Game(GameConfig);

game.scene.add('Bootstrap', Bootstrap);
game.scene.add('GameScene', GameScene);

game.scene.start('Bootstrap');
