import { GameEngine } from './core/engine';

const canvas = document.getElementById('game') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new GameEngine(canvas);
game.start();

console.log('Roguelike Dungeon Generator started');
console.log('Controls: WASD or Arrow keys to move, R to regenerate');
