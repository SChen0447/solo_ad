import { GameEngine } from './GameEngine';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const game = new GameEngine(canvas);
  game.start();
});
