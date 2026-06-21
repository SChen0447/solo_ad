import Phaser from 'phaser';
import { BulletScene } from './scenes/BulletScene';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'canvas-wrapper',
  backgroundColor: '#1a1a2e',
  scene: [BulletScene],
  pixelArt: false,
  antialias: true,
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  render: {
    antialiasGL: true,
    clearBeforeRender: true,
    transparent: false
  },
  input: {
    keyboard: {
      capture: []
    }
  }
};

const game = new Phaser.Game(config);

game.events.once('ready', () => {
  console.log('Bullet Hell Simulator - 弹幕模拟器已启动');
  console.log('操作说明:');
  console.log('  - WASD / 方向键: 移动');
  console.log('  - 空格键: 开始/停止录制');
  console.log('  - 左侧面板: 调整弹幕参数');
  console.log('  - 右侧面板: 查看游戏信息和回放');
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    game.scale.resize(CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    const targetWidth = window.innerWidth * 0.9;
    const scale = targetWidth / CANVAS_WIDTH;
    game.scale.resize(CANVAS_WIDTH, CANVAS_HEIGHT);
  }
});

export default game;
