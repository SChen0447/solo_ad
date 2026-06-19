import { GameEngine } from './GameEngine';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;

const game = new GameEngine(canvas);
game.start();

volumeSlider.addEventListener('input', (e) => {
  const value = parseFloat((e.target as HTMLInputElement).value) / 100;
  game.setVolume(value);
});

let started = false;
document.addEventListener('click', () => {
  if (!started) {
    started = true;
    if (game.getState() === 'idle') {
      game.startGame();
    }
  }
}, { once: true });

document.addEventListener('keydown', (e) => {
  if (!started && (e.code === 'Space' || e.code === 'Enter')) {
    started = true;
  }
}, { once: true });

interface ViteHotContext {
  accept(): void;
}

declare global {
  interface ImportMeta {
    hot?: ViteHotContext;
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
