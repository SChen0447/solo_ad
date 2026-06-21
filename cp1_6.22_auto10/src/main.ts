import Phaser from 'phaser';
import { EditorScene } from './scenes/EditorScene';
import { TestScene } from './scenes/TestScene';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from './types';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#2a2a3a',
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
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
    width: 800,
    height: 600
  },
  scene: [EditorScene, TestScene]
};

export const game = new Phaser.Game(config);

export const GAME_WIDTH = GRID_WIDTH * TILE_SIZE;
export const GAME_HEIGHT = GRID_HEIGHT * TILE_SIZE;
