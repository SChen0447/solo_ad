import { Game } from './game';
import { Renderer } from './renderer';
import { soundManager } from './sound';
import type { Team } from './entities';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const renderer = new Renderer(canvas);
const game = new Game();
soundManager.init();

let lastTime = 0;

const keys: Set<string> = new Set();

function handleKeyDown(e: KeyboardEvent): void {
  soundManager.resume();
  
  if (e.repeat) return;
  
  keys.add(e.code);
  
  if (e.code === 'KeyW' || e.code === 'ArrowUp') {
    e.preventDefault();
    const team: Team = e.code === 'KeyW' ? 'blue' : 'red';
    game.movePlayer(team, 'up');
  }
  if (e.code === 'KeyS' || e.code === 'ArrowDown') {
    e.preventDefault();
    const team: Team = e.code === 'KeyS' ? 'blue' : 'red';
    game.movePlayer(team, 'down');
  }
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
    e.preventDefault();
    const team: Team = e.code === 'KeyA' ? 'blue' : 'red';
    game.movePlayer(team, 'left');
  }
  if (e.code === 'KeyD' || e.code === 'ArrowRight') {
    e.preventDefault();
    const team: Team = e.code === 'KeyD' ? 'blue' : 'red';
    game.movePlayer(team, 'right');
  }
  
  if (e.code === 'Space') {
    e.preventDefault();
    game.playerShoot('blue');
  }
  if (e.code === 'Enter') {
    e.preventDefault();
    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || e.shiftKey) {
      game.playerShoot('red');
    } else {
      game.playerUseSkill('blue');
    }
  }
  
  if (e.code === 'ControlRight') {
    e.preventDefault();
    game.playerUseSkill('red');
  }
  
  if (e.code === 'ShiftRight') {
    e.preventDefault();
    game.playerShoot('red');
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  keys.delete(e.code);
}

function handleResize(): void {
  renderer.resize();
}

function updateGameGridParams(): void {
  game.setGridParams(
    renderer.getCellSize(),
    renderer.getGridOffsetX(),
    renderer.getGridOffsetY()
  );
}

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;
  
  updateGameGridParams();
  
  game.update(deltaTime);
  renderer.updateShake(deltaTime);
  
  const shakeInfo = game.getShakeIntensity();
  if (shakeInfo.amount > 0 && shakeInfo.duration > 0) {
    renderer.triggerShake(shakeInfo.amount, shakeInfo.duration, 2);
  }
  
  renderer.clear();
  renderer.render(
    game.players,
    game.bullets,
    game.obstacles,
    game.pickups,
    game.particles,
    game.skillEffects
  );
  
  if (game.gameOver && game.winner) {
    renderer.drawGameOver(game.winner);
  }
  
  requestAnimationFrame(gameLoop);
}

function init(): void {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);
  
  updateGameGridParams();
  
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

init();
