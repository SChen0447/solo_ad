import { Renderer } from './modules/renderer';
import { UIManager } from './modules/uiManager';
import { battleManager } from './modules/battleManager';

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const uiLayer = document.getElementById('uiLayer') as HTMLDivElement;

  if (!canvas || !uiLayer) {
    console.error('找不到必要的DOM元素');
    return;
  }

  const renderer = new Renderer(canvas);
  new UIManager(uiLayer);

  battleManager.startNewBattle();

  let lastTime = performance.now();

  renderer.startRenderLoop(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    battleManager.update(Math.min(deltaTime, 100));
  });

  console.log('Boss动态生成与行为AI系统已启动');
  console.log('操作说明：');
  console.log('  1键 / ⚔️按钮 - 普通攻击');
  console.log('  2键 / 💨按钮 - 闪避');
  console.log('  3键 / 🔥按钮 - 火球术');
  console.log('  4键 / ❄️按钮 - 冰锥术');
  console.log('  5键 / ⚡按钮 - 闪电箭');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
