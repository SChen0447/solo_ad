import { GameEngine } from './GameEngine';

function bootstrap(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('找不到游戏Canvas元素');
  }

  const game = new GameEngine(canvas);
  game.start();
}

bootstrap();
