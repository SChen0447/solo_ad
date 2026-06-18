import { GameEngine } from './gameEngine';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
  console.error('Canvas element not found');
} else {
  const game = new GameEngine(canvas);
  game.start();

  console.log('回声探索 (Echo Explorer) 已启动');
  console.log('操作说明:');
  console.log('  A/D 或 ←/→ : 左右移动');
  console.log('  Shift : 跳跃');
  console.log('  空格 : 发射声波脉冲');
  console.log('  鼠标拖拽镜面 : 调整反射角度');
  console.log('  滚轮 : 微调镜面角度');
}
