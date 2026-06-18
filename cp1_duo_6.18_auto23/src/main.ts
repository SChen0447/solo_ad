import { GameEngine } from './GameEngine';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('找不到Canvas元素');
}

const engine = new GameEngine(canvas);

function init(): void {
  console.log('元素裂隙 - 游戏启动');
  console.log('操作说明:');
  console.log('  WASD - 移动');
  console.log('  Q - 切换元素形态 (火→冰→雷)');
  console.log('  J - 释放技能');

  engine.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

declare global {
  interface Window {
    __gameEngine?: GameEngine;
  }
}

window.__gameEngine = engine;
