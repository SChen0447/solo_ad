import * as PIXI from 'pixi.js';
import { MarketManager } from './marketManager';
import { UIController } from './uiController';

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x4a3728,
  antialias: false,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

const appContainer = document.getElementById('app');
if (appContainer) {
  appContainer.appendChild(app.view as HTMLCanvasElement);
}

const marketManager = new MarketManager();
const uiController = new UIController(app, marketManager);

let gamePaused = false;

function handleVisibilityChange(): void {
  if (document.hidden) {
    gamePaused = true;
    marketManager.setPaused(true);
  } else {
    gamePaused = false;
    marketManager.setPaused(false);
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

app.ticker.add((delta) => {
  if (gamePaused) {
    return;
  }

  const currentTime = performance.now();
  marketManager.update(currentTime);
  uiController.update(delta);
});

window.addEventListener('resize', () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
});
