import GameEngine from './core/engine';
import CanvasRenderer from './renderers/canvas-renderer';
import type { RenderData, InputState } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const renderer = new CanvasRenderer(canvas);

  const handleRender = (data: RenderData): void => {
    renderer.render(data);
  };

  const engine = new GameEngine(CANVAS_WIDTH, CANVAS_HEIGHT, handleRender);

  const handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    const input: Partial<InputState> = {};

    switch (key) {
      case 'w':
      case 'arrowup':
        input.up = true;
        break;
      case 's':
      case 'arrowdown':
        input.down = true;
        break;
      case 'a':
      case 'arrowleft':
        input.left = true;
        break;
      case 'd':
      case 'arrowright':
        input.right = true;
        break;
      case 'r':
        engine.regenerate();
        return;
    }

    if (Object.keys(input).length > 0) {
      engine.setInput(input);
      e.preventDefault();
    }
  };

  const handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    const input: Partial<InputState> = {};

    switch (key) {
      case 'w':
      case 'arrowup':
        input.up = false;
        break;
      case 's':
      case 'arrowdown':
        input.down = false;
        break;
      case 'a':
      case 'arrowleft':
        input.left = false;
        break;
      case 'd':
      case 'arrowright':
        input.right = false;
        break;
    }

    if (Object.keys(input).length > 0) {
      engine.setInput(input);
      e.preventDefault();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  const gameLoop = (): void => {
    engine.update();
    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);

  console.log('Roguelike Dungeon Simulator started!');
  console.log('Controls: WASD or Arrow Keys to move, R to regenerate dungeon');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
