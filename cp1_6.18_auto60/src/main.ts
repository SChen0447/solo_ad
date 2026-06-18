import { GameLoop } from './game/GameLoop';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Game canvas not found!');
    return;
  }
  const game = new GameLoop(canvas);
  game.start();
  window.addEventListener('beforeunload', () => {
    game.stop();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
