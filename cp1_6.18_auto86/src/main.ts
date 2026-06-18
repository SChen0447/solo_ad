import { App } from './App';
import { generateLevel } from './level';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas element #game-canvas not found');
  }

  const level = generateLevel();

  const app = new App(canvas, level);

  app.start();

  (window as unknown as { __gameApp?: App }).__gameApp = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
