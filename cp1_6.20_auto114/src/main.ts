import { generateMap, drawMap, CELL_SIZE, GRID_SIZE, FRAGMENTS_TO_WIN, GameMap } from './map';
import { createPlayer, updatePlayer, drawPlayer, hitPlayer, Player } from './player';
import { createGhosts, updateGhosts, drawGhosts, checkGhostCollision, Ghost } from './ghost';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;
const fragmentCountEl = document.getElementById('fragment-count') as HTMLDivElement;
const fragmentHintEl = document.getElementById('fragment-hint') as HTMLDivElement;

canvas.width = GRID_SIZE * CELL_SIZE;
canvas.height = GRID_SIZE * CELL_SIZE;

const keys = new Set<string>();

window.addEventListener('keydown', (e) => {
  keys.add(e.key);
  if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key);
});

interface GameState {
  map: GameMap;
  player: Player;
  ghosts: Ghost[];
  level: number;
  gameOver: boolean;
  won: boolean;
  transitioning: boolean;
  transitionTimer: number;
}

function initLevel(level: number): GameState {
  const map = generateMap(level);
  const player = createPlayer(0, 0);
  const ghosts = createGhosts(map.grid, player.gridX, player.gridY, 3 + level);
  return {
    map,
    player,
    ghosts,
    level,
    gameOver: false,
    won: false,
    transitioning: false,
    transitionTimer: 0,
  };
}

let state = initLevel(1);

function updateUI(): void {
  const progress = (state.player.fragments / FRAGMENTS_TO_WIN) * 100;
  progressBarFill.style.width = `${Math.min(progress, 100)}%`;
  fragmentCountEl.textContent = `${state.player.fragments}`;
  const remaining = FRAGMENTS_TO_WIN - state.player.fragments;
  fragmentHintEl.textContent = `碎片 ${state.player.fragments} / ${FRAGMENTS_TO_WIN}`;
}

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const dt = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  if (!state.gameOver && !state.transitioning) {
    updatePlayer(state.player, dt, keys, state.map.grid, state.map.fragments, () => {
      updateUI();
    });

    updateGhosts(state.ghosts, dt, state.player.gridX, state.player.gridY, state.map.grid);

    if (checkGhostCollision(state.ghosts, state.player.gridX, state.player.gridY)) {
      hitPlayer(state.player);
      updateUI();
    }

    if (state.player.fragments >= FRAGMENTS_TO_WIN) {
      state.transitioning = true;
      state.transitionTimer = 1500;
    }
  }

  if (state.transitioning) {
    state.transitionTimer -= dt;
    if (state.transitionTimer <= 0) {
      state = initLevel(state.level + 1);
      updateUI();
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMap(ctx, state.map, currentTime);
  drawGhosts(ctx, state.ghosts, currentTime);
  drawPlayer(ctx, state.player, currentTime);

  if (state.transitioning) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`第 ${state.level} 关通过！`, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

updateUI();
requestAnimationFrame(gameLoop);
