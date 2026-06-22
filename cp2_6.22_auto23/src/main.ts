import { Game } from './game';
import { Renderer } from './renderer';
import { UIManager } from './ui';

const MAP_COLS = 20;
const MAP_ROWS = 20;
const TILE_SIZE = 40;
const MAP_WIDTH = MAP_COLS * TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;
const PANEL_WIDTH = Math.round(MAP_WIDTH * 0.3 / 0.7);
const TOTAL_WIDTH = MAP_WIDTH + PANEL_WIDTH;
const TOTAL_HEIGHT = MAP_HEIGHT;

let game: Game;
let renderer: Renderer;
let ui: UIManager;
let animationId: number;
let lastTime: number;

function init(): void {
  const container = document.getElementById('game-container');
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiLayer = document.getElementById('ui-layer') as HTMLElement;

  if (!container || !canvas || !uiLayer) {
    console.error('找不到必要的DOM元素');
    return;
  }

  container.style.width = `${TOTAL_WIDTH}px`;
  container.style.height = `${TOTAL_HEIGHT}px`;

  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;
  canvas.style.width = `${MAP_WIDTH}px`;
  canvas.style.height = `${MAP_HEIGHT}px`;

  uiLayer.style.width = `${TOTAL_WIDTH}px`;
  uiLayer.style.height = `${TOTAL_HEIGHT}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('无法获取Canvas 2D上下文');
    return;
  }

  game = new Game();
  renderer = new Renderer(ctx, MAP_WIDTH, MAP_HEIGHT);
  ui = new UIManager(game, container, uiLayer, MAP_WIDTH, MAP_HEIGHT, PANEL_WIDTH);

  ui.init();

  ui.setOnTowerBuilt(() => {
    ui.updateBuildingList();
  });

  ui.setOnTowerUpgraded(() => {
    ui.updateBuildingList();
  });

  ui.setOnBuildingSelect((tower) => {
    ui.selectTower(tower);
  });

  game.onGoldChange = () => {
    ui.updateGoldDisplay();
  };

  game.onBaseHealthChange = () => {
    ui.updateHealthDisplay();
  };

  game.onWaveChange = () => {
    ui.updateWaveDisplay();
  };

  game.start();
  lastTime = performance.now();
  gameLoop();
}

function gameLoop(): void {
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  game.update(currentTime);
  renderer.render(game.grid, game.entityManager, deltaTime);

  const selectedTower = ui.getSelectedTower();
  if (selectedTower) {
    const config = selectedTower.getConfig();
    renderer.drawTowerRange(selectedTower.x, selectedTower.y, config.range, 'rgba(217, 119, 6, 0.2)');
  }

  ui.update();

  animationId = requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
