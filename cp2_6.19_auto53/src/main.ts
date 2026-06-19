import { GameEngine } from './game/GameEngine';
import { Renderer } from './ui/Renderer';
import { InputHandler } from './ui/InputHandler';

function initGame(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const canvas = document.createElement('canvas');
  app.appendChild(canvas);

  const mapWidth = window.innerWidth * 0.7;
  const mapHeight = window.innerHeight;

  const gameEngine = new GameEngine(mapWidth, mapHeight);
  const renderer = new Renderer(canvas, gameEngine);
  void new InputHandler(canvas, gameEngine, renderer);

  renderer.resize(window.innerWidth, window.innerHeight);
  gameEngine.setMapSize(mapWidth, mapHeight);

  const unitTypes: ('infantry' | 'archer' | 'cavalry')[] = ['infantry', 'infantry', 'infantry', 'infantry', 'archer', 'archer', 'cavalry', 'cavalry'];

  for (let i = 0; i < unitTypes.length; i++) {
    const type = unitTypes[i];
    const x = 100 + (i % 4) * 50;
    const y = 150 + Math.floor(i / 4) * 60;
    gameEngine.addUnit(type, 'player', { x, y });
  }

  for (let i = 0; i < 5; i++) {
    const x = mapWidth - 200 + (i % 3) * 80;
    const y = 200 + Math.floor(i / 3) * 100 + Math.random() * 50;
    const type = i % 3 === 0 ? 'infantry' : i % 3 === 1 ? 'archer' : 'cavalry';
    gameEngine.addUnit(type as 'infantry' | 'archer' | 'cavalry', 'enemy', { x, y });
  }

  gameEngine.generateEnemyPatrolPaths(mapWidth, mapHeight);

  let lastTime = performance.now();

  function gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    gameEngine.update(deltaTime);
    renderer.update(deltaTime);
    renderer.draw();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  window.addEventListener('resize', () => {
    renderer.resize(window.innerWidth, window.innerHeight);
    const newMapWidth = window.innerWidth * 0.7;
    const newMapHeight = window.innerHeight;
    gameEngine.setMapSize(newMapWidth, newMapHeight);
  });

  console.log('战术小队战斗模拟游戏已启动');
  console.log('操作说明:');
  console.log('  - 鼠标左键拖拽: 框选单位');
  console.log('  - 鼠标右键: 移动选中单位');
  console.log('  - 数字键 1: 切换为楔形阵型');
  console.log('  - 数字键 2: 切换为线列阵型');
  console.log('  - 数字键 0 或 `: 切换为矩形阵型');
}

window.addEventListener('DOMContentLoaded', initGame);
